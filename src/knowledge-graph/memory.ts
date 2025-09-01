import { encoding_for_model } from 'tiktoken';
import { GraphDatabase } from './database.js';
import { EmbeddingService } from './embeddings.js';
import { 
  BaseNode, 
  NodeType, 
  RelationType,
  Relationship,
  ConversationNode,
  MessageNode 
} from './schema.js';
import { getConfig } from './config.js';
import { generateId, estimateTokens } from './utils.js';

export interface MemoryContext {
  active: MemoryLayer;      // Current conversation
  working: MemoryLayer;     // Related context
  graph: MemoryLayer;       // Full knowledge base
}

export interface MemoryLayer {
  nodes: BaseNode[];
  tokens: number;
  maxTokens: number;
  importance: Map<string, number>;
}

export interface MemorySearchOptions {
  query: string;
  types?: NodeType[];
  limit?: number;
  depth?: number;
  includeRelated?: boolean;
  threshold?: number;
}

export class MemoryManager {
  private db: GraphDatabase;
  private embeddings: EmbeddingService;
  private config = getConfig();
  private encoder: any;
  
  private activeMemory: MemoryLayer;
  private workingMemory: MemoryLayer;
  private graphMemory: MemoryLayer;
  
  private currentConversation: ConversationNode | null = null;
  private messageHistory: MessageNode[] = [];

  constructor(apiKey?: string) {
    this.db = new GraphDatabase();
    this.embeddings = new EmbeddingService(apiKey);
    this.encoder = encoding_for_model('gpt-3.5-turbo');
    
    // Initialize memory layers
    this.activeMemory = {
      nodes: [],
      tokens: 0,
      maxTokens: this.config.memory.activeMemoryTokens,
      importance: new Map()
    };
    
    this.workingMemory = {
      nodes: [],
      tokens: 0,
      maxTokens: this.config.memory.workingMemoryTokens,
      importance: new Map()
    };
    
    this.graphMemory = {
      nodes: [],
      tokens: 0,
      maxTokens: Infinity, // Unlimited
      importance: new Map()
    };
  }

  async startConversation(sessionId: string, summary?: string): Promise<void> {
    this.currentConversation = {
      id: generateId('conv'),
      type: NodeType.CONVERSATION,
      name: `Conversation ${new Date().toISOString()}`,
      session_id: sessionId,
      summary: summary || 'New conversation',
      timestamp: Date.now(),
      token_count: 0,
      model: 'claude-3.5-sonnet',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await this.db.createNode(this.currentConversation);
    
    // Clear active memory for new conversation
    this.activeMemory.nodes = [];
    this.activeMemory.tokens = 0;
    this.messageHistory = [];
  }

  async addMessage(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    if (!this.currentConversation) {
      await this.startConversation(generateId('session'));
    }

    const message: MessageNode = {
      id: generateId('msg'),
      type: NodeType.MESSAGE,
      name: `${role} message`,
      role,
      content,
      timestamp: Date.now(),
      token_count: this.encoder.encode(content).length,
      conversation_id: this.currentConversation!.id,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Save to database
    await this.db.createNode(message);
    await this.db.createRelationship({
      from_id: this.currentConversation!.id,
      to_id: message.id,
      type: RelationType.HAS_MESSAGE,
      created_at: Date.now()
    });

    // Add to active memory
    this.messageHistory.push(message);
    this.addToActiveMemory(message);

    // Generate embedding for semantic search
    await this.embeddings.embedNode(message);

    // Extract and process any code references or patterns
    if (role === 'user') {
      await this.processUserQuery(content);
    }
  }

  private async processUserQuery(query: string): Promise<void> {
    // Search for relevant context
    const searchResults = await this.search({
      query,
      types: [NodeType.FILE, NodeType.FUNCTION, NodeType.CLASS, NodeType.PATTERN],
      limit: 10,
      includeRelated: true,
      threshold: 0.7
    });

    // Add top results to working memory
    for (const result of searchResults.slice(0, 5)) {
      await this.addToWorkingMemory(result);
    }
  }

  async search(options: MemorySearchOptions): Promise<BaseNode[]> {
    const { 
      query, 
      types, 
      limit = 10, 
      depth = 2, 
      includeRelated = false,
      threshold = 0.7 
    } = options;

    // Semantic search
    const semanticResults = await this.embeddings.semanticSearch(query, {
      types,
      limit: limit * 2, // Get more for filtering
      threshold,
      includeContext: includeRelated
    });

    // Keyword search
    const keywordResults = await this.db.searchNodes(query, types, limit);

    // Combine and deduplicate results
    const resultMap = new Map<string, BaseNode>();
    
    // Add semantic results with higher priority
    semanticResults.forEach(result => {
      resultMap.set(result.node.id, result.node);
    });
    
    // Add keyword results
    keywordResults.forEach(node => {
      if (!resultMap.has(node.id)) {
        resultMap.set(node.id, node);
      }
    });

    const combinedResults = Array.from(resultMap.values()).slice(0, limit);

    // Get related nodes if requested
    if (includeRelated && depth > 0) {
      const relatedNodes: BaseNode[] = [];
      
      for (const node of combinedResults) {
        const related = await this.db.findRelatedNodes(
          node.id,
          [] as RelationType[],
          depth,
          5
        );
        relatedNodes.push(...related);
      }
      
      // Add unique related nodes
      relatedNodes.forEach(node => {
        if (!resultMap.has(node.id)) {
          combinedResults.push(node);
        }
      });
    }

    return combinedResults;
  }

  private addToActiveMemory(node: BaseNode): void {
    const tokens = this.calculateNodeTokens(node);
    
    // Check if adding would exceed limit
    if (this.activeMemory.tokens + tokens > this.activeMemory.maxTokens) {
      this.pruneActiveMemory(tokens);
    }
    
    this.activeMemory.nodes.push(node);
    this.activeMemory.tokens += tokens;
    this.activeMemory.importance.set(node.id, 1.0);
  }

  private async addToWorkingMemory(node: BaseNode): Promise<void> {
    const tokens = this.calculateNodeTokens(node);
    
    // Check if already in working memory
    if (this.workingMemory.nodes.find(n => n.id === node.id)) {
      // Update importance
      const currentImportance = this.workingMemory.importance.get(node.id) || 0;
      this.workingMemory.importance.set(node.id, currentImportance + 0.1);
      return;
    }
    
    // Check if adding would exceed limit
    if (this.workingMemory.tokens + tokens > this.workingMemory.maxTokens) {
      await this.pruneWorkingMemory(tokens);
    }
    
    this.workingMemory.nodes.push(node);
    this.workingMemory.tokens += tokens;
    this.workingMemory.importance.set(node.id, 0.5);
  }

  private pruneActiveMemory(tokensNeeded: number): void {
    // Remove oldest messages until we have space
    while (
      this.activeMemory.tokens + tokensNeeded > this.activeMemory.maxTokens &&
      this.activeMemory.nodes.length > 0
    ) {
      const removed = this.activeMemory.nodes.shift();
      if (removed) {
        const tokens = this.calculateNodeTokens(removed);
        this.activeMemory.tokens -= tokens;
        this.activeMemory.importance.delete(removed.id);
      }
    }
  }

  private async pruneWorkingMemory(tokensNeeded: number): Promise<void> {
    // Sort by importance (ascending) and remove least important
    const sorted = [...this.workingMemory.nodes].sort((a, b) => {
      const importanceA = this.workingMemory.importance.get(a.id) || 0;
      const importanceB = this.workingMemory.importance.get(b.id) || 0;
      return importanceA - importanceB;
    });
    
    while (
      this.workingMemory.tokens + tokensNeeded > this.workingMemory.maxTokens &&
      sorted.length > 0
    ) {
      const removed = sorted.shift();
      if (removed) {
        const index = this.workingMemory.nodes.findIndex(n => n.id === removed.id);
        if (index !== -1) {
          this.workingMemory.nodes.splice(index, 1);
          const tokens = this.calculateNodeTokens(removed);
          this.workingMemory.tokens -= tokens;
          this.workingMemory.importance.delete(removed.id);
        }
      }
    }
  }

  private calculateNodeTokens(node: BaseNode): number {
    let text = '';
    
    switch (node.type) {
      case NodeType.FILE:
        text = (node as any).content || '';
        break;
      case NodeType.FUNCTION:
        text = (node as any).signature + (node as any).body;
        break;
      case NodeType.CLASS:
        text = JSON.stringify(node);
        break;
      case NodeType.MESSAGE:
        text = (node as any).content;
        break;
      default:
        text = JSON.stringify(node);
    }
    
    return this.encoder.encode(text).length;
  }

  async getContext(): Promise<MemoryContext> {
    return {
      active: this.activeMemory,
      working: this.workingMemory,
      graph: this.graphMemory
    };
  }

  async getContextAsText(): Promise<string> {
    const parts: string[] = [];
    
    // Active memory (most recent messages)
    if (this.activeMemory.nodes.length > 0) {
      parts.push('=== Recent Conversation ===');
      this.activeMemory.nodes.forEach(node => {
        if (node.type === NodeType.MESSAGE) {
          const msg = node as MessageNode;
          parts.push(`${msg.role}: ${msg.content}`);
        }
      });
    }
    
    // Working memory (relevant context)
    if (this.workingMemory.nodes.length > 0) {
      parts.push('\n=== Relevant Context ===');
      this.workingMemory.nodes.forEach(node => {
        parts.push(this.nodeToString(node));
      });
    }
    
    return parts.join('\n');
  }

  private nodeToString(node: BaseNode): string {
    switch (node.type) {
      case NodeType.FILE:
        return `File: ${(node as any).path}`;
      case NodeType.FUNCTION:
        return `Function: ${node.name} in ${(node as any).file_path}`;
      case NodeType.CLASS:
        return `Class: ${node.name} in ${(node as any).file_path}`;
      case NodeType.PATTERN:
        return `Pattern: ${node.name} - ${(node as any).description}`;
      case NodeType.INSIGHT:
        return `Insight: ${(node as any).description}`;
      default:
        return `${node.type}: ${node.name}`;
    }
  }

  async loadPreviousConversation(conversationId: string): Promise<void> {
    const conversation = await this.db.getNode(conversationId) as ConversationNode;
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    this.currentConversation = conversation;
    
    // Load messages
    const messages = await this.db.findRelatedNodes(
      conversationId,
      [RelationType.HAS_MESSAGE],
      1,
      100
    );
    
    this.messageHistory = messages.filter(n => n.type === NodeType.MESSAGE) as MessageNode[];
    
    // Rebuild active memory from recent messages
    this.activeMemory.nodes = [];
    this.activeMemory.tokens = 0;
    
    const recentMessages = this.messageHistory.slice(-10); // Last 10 messages
    recentMessages.forEach(msg => this.addToActiveMemory(msg));
  }

  async updateNodeImportance(nodeId: string, layer: 'active' | 'working', delta: number): Promise<void> {
    const memory = layer === 'active' ? this.activeMemory : this.workingMemory;
    const current = memory.importance.get(nodeId) || 0;
    memory.importance.set(nodeId, Math.max(0, Math.min(1, current + delta)));
  }

  async saveConversationSummary(summary: string): Promise<void> {
    if (this.currentConversation) {
      this.currentConversation.summary = summary;
      await this.db.updateNode(this.currentConversation.id, { summary: summary || '' } as any);
    }
  }

  async getStatistics(): Promise<Record<string, any>> {
    return {
      active_memory: {
        nodes: this.activeMemory.nodes.length,
        tokens: this.activeMemory.tokens,
        max_tokens: this.activeMemory.maxTokens
      },
      working_memory: {
        nodes: this.workingMemory.nodes.length,
        tokens: this.workingMemory.tokens,
        max_tokens: this.workingMemory.maxTokens
      },
      current_conversation: this.currentConversation?.id,
      message_history: this.messageHistory.length
    };
  }

  cleanup(): void {
    this.encoder.free();
  }
}