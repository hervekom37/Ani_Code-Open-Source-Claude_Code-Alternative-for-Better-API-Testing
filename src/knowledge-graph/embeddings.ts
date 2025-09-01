import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';
import { GraphDatabase } from './database.js';
import { BaseNode, NodeType, RelationType } from './schema.js';
import { chunkText, truncateText } from './utils.js';
import { getConfig } from './config.js';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokens: number;
}

export class EmbeddingService {
  private openai: OpenAI;
  private db: GraphDatabase;
  private config = getConfig();
  private encoder: any;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.db = new GraphDatabase();
    this.encoder = encoding_for_model('gpt-3.5-turbo');
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Truncate if too long (max ~8k tokens for embedding models)
      const maxTokens = 8000;
      const tokens = this.encoder.encode(text);
      
      let processedText = text;
      if (tokens.length > maxTokens) {
        const truncatedTokens = tokens.slice(0, maxTokens);
        processedText = this.encoder.decode(truncatedTokens);
      }

      const response = await this.openai.embeddings.create({
        model: this.config.embeddings.model,
        input: processedText
      });

      return {
        text: processedText,
        embedding: response.data[0].embedding,
        tokens: tokens.length
      };
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      // Process in batches to avoid rate limits
      const batchSize = 20;
      const results: EmbeddingResult[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Truncate each text if needed
        const processedBatch = batch.map(text => {
          const tokens = this.encoder.encode(text);
          if (tokens.length > 8000) {
            return this.encoder.decode(tokens.slice(0, 8000));
          }
          return text;
        });

        const response = await this.openai.embeddings.create({
          model: this.config.embeddings.model,
          input: processedBatch
        });

        response.data.forEach((item, index) => {
          results.push({
            text: processedBatch[index],
            embedding: item.embedding,
            tokens: this.encoder.encode(processedBatch[index]).length
          });
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async embedNode(node: BaseNode): Promise<void> {
    let textToEmbed = '';

    // Create text representation based on node type
    switch (node.type) {
      case NodeType.FILE:
        textToEmbed = `File: ${node.name}\nPath: ${(node as any).path}\n${truncateText((node as any).content || '', 4000)}`;
        break;
      case NodeType.FUNCTION:
        textToEmbed = `Function: ${node.name}\n${(node as any).signature}\n${truncateText((node as any).body || '', 2000)}`;
        break;
      case NodeType.CLASS:
        textToEmbed = `Class: ${node.name}\nMethods: ${((node as any).methods || []).join(', ')}\nProperties: ${((node as any).properties || []).join(', ')}`;
        break;
      case NodeType.PATTERN:
        textToEmbed = `Pattern: ${node.name}\n${(node as any).description}\n${(node as any).template || ''}`;
        break;
      case NodeType.CONVERSATION:
        textToEmbed = `Conversation: ${(node as any).summary}`;
        break;
      case NodeType.MESSAGE:
        textToEmbed = truncateText((node as any).content || '', 4000);
        break;
      case NodeType.INSIGHT:
        textToEmbed = `Insight: ${(node as any).insight_type}\n${(node as any).description}`;
        break;
      case NodeType.CONCEPT:
        textToEmbed = `Concept: ${node.name}\n${(node as any).description}`;
        break;
      default:
        textToEmbed = node.name || '';
    }

    if (textToEmbed) {
      const result = await this.generateEmbedding(textToEmbed);
      node.embedding = result.embedding;
      await this.db.updateNode(node.id, { embedding: result.embedding });
    }
  }

  async embedNodes(nodes: BaseNode[]): Promise<void> {
    console.log(`Generating embeddings for ${nodes.length} nodes...`);
    
    for (const node of nodes) {
      try {
        await this.embedNode(node);
      } catch (error) {
        console.error(`Failed to embed node ${node.id}:`, error);
      }
    }
  }

  async findSimilar(
    query: string,
    nodeType?: NodeType,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<Array<{ node: BaseNode; similarity: number }>> {
    const queryEmbedding = await this.generateEmbedding(query);
    return await this.db.findSimilarByEmbedding(
      queryEmbedding.embedding,
      nodeType,
      threshold,
      limit
    );
  }

  async semanticSearch(
    query: string,
    options: {
      types?: NodeType[];
      limit?: number;
      threshold?: number;
      includeContext?: boolean;
    } = {}
  ): Promise<Array<{ node: BaseNode; similarity: number; context?: BaseNode[] }>> {
    const { types, limit = 10, threshold = 0.7, includeContext = false } = options;
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search for each type separately if specified
    const results: Array<{ node: BaseNode; similarity: number }> = [];
    
    if (types && types.length > 0) {
      for (const type of types) {
        const typeResults = await this.db.findSimilarByEmbedding(
          queryEmbedding.embedding,
          type,
          threshold,
          Math.ceil(limit / types.length)
        );
        results.push(...typeResults);
      }
    } else {
      const allResults = await this.db.findSimilarByEmbedding(
        queryEmbedding.embedding,
        undefined,
        threshold,
        limit
      );
      results.push(...allResults);
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, limit);

    // Add context if requested
    if (includeContext) {
      const resultsWithContext = [];
      for (const result of topResults) {
        const context = await this.db.findRelatedNodes(
          result.node.id,
          [] as RelationType[],
          1,
          5
        );
        resultsWithContext.push({
          ...result,
          context
        });
      }
      return resultsWithContext;
    }

    return topResults;
  }

  async createCodeChunks(
    content: string,
    filePath: string,
    chunkSize: number = 1500,
    overlap: number = 200
  ): Promise<Array<{ text: string; start: number; end: number }>> {
    const lines = content.split('\n');
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    
    let currentChunk = '';
    let currentTokens = 0;
    let startLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = this.encoder.encode(line).length;
      
      if (currentTokens + lineTokens > chunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          text: currentChunk,
          start: startLine,
          end: i - 1
        });
        
        // Start new chunk with overlap
        const overlapLines = Math.max(0, i - Math.floor(overlap / 20)); // Rough estimate
        currentChunk = lines.slice(overlapLines, i + 1).join('\n');
        currentTokens = this.encoder.encode(currentChunk).length;
        startLine = overlapLines;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
        currentTokens += lineTokens;
      }
    }
    
    // Add remaining chunk
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        start: startLine,
        end: lines.length - 1
      });
    }
    
    return chunks;
  }

  async updateProjectEmbeddings(projectPath: string): Promise<void> {
    console.log('Updating embeddings for all nodes...');
    
    // Get all nodes without embeddings
    const fileNodes = await this.db.findNodesByType(NodeType.FILE, 1000);
    const functionNodes = await this.db.findNodesByType(NodeType.FUNCTION, 1000);
    const classNodes = await this.db.findNodesByType(NodeType.CLASS, 1000);
    
    const allNodes = [...fileNodes, ...functionNodes, ...classNodes];
    const nodesWithoutEmbeddings = allNodes.filter(node => !node.embedding);
    
    console.log(`Found ${nodesWithoutEmbeddings.length} nodes without embeddings`);
    
    await this.embedNodes(nodesWithoutEmbeddings);
    
    console.log('Embedding update complete');
  }

  cleanup(): void {
    this.encoder.free();
  }
}