export { GraphDatabase } from './database.js';
export { CodeIndexer } from './indexer.js';
export { EmbeddingService } from './embeddings.js';
export { MemoryManager } from './memory.js';
export { GraphTraversal } from './traversal.js';
export { ObsidianFeatures } from './obsidian-features.js';
export { GraphVisualization } from './visualization.js';
export { PatternDetector } from './patterns.js';
export * from './schema.js';
export * from './config.js';
export * from './utils.js';

import { GraphDatabase } from './database.js';
import { CodeIndexer } from './indexer.js';
import { EmbeddingService } from './embeddings.js';
import { MemoryManager } from './memory.js';
import { GraphTraversal } from './traversal.js';
import { ObsidianFeatures } from './obsidian-features.js';
import { GraphVisualization } from './visualization.js';
import { PatternDetector } from './patterns.js';
import { getConfig } from './config.js';

export class KnowledgeGraph {
  private db: GraphDatabase;
  private indexer: CodeIndexer;
  private embeddings: EmbeddingService;
  private memory: MemoryManager;
  private traversal: GraphTraversal;
  private obsidian: ObsidianFeatures;
  private visualization: GraphVisualization | null = null;
  private patterns: PatternDetector;
  private config = getConfig();
  private projectPath: string;

  constructor(projectPath: string, apiKey?: string) {
    this.projectPath = projectPath;
    this.db = new GraphDatabase();
    this.indexer = new CodeIndexer(projectPath);
    this.embeddings = new EmbeddingService(apiKey);
    this.memory = new MemoryManager(apiKey);
    this.traversal = new GraphTraversal(apiKey);
    this.obsidian = new ObsidianFeatures(apiKey);
    this.patterns = new PatternDetector(apiKey);
  }

  async initialize(): Promise<void> {
    console.log('Initializing Knowledge Graph...');
    await this.db.initialize();
    console.log('Knowledge Graph initialized successfully');
  }

  async indexProject(): Promise<any> {
    console.log(`Indexing project: ${this.projectPath}`);
    const result = await this.indexer.indexProject();
    
    // Generate embeddings for indexed nodes
    console.log('Generating embeddings...');
    await this.embeddings.updateProjectEmbeddings(this.projectPath);
    
    // Detect patterns
    console.log('Detecting patterns...');
    const patterns = await this.patterns.detectPatterns(this.projectPath);
    
    // Generate insights
    console.log('Generating insights...');
    const insights = await this.patterns.generateInsights(patterns);
    
    return {
      indexing: result,
      patterns: patterns.length,
      insights: insights.length
    };
  }

  async search(query: string, options?: any): Promise<any[]> {
    return await this.memory.search({
      query,
      types: options?.types,
      limit: options?.limit || 10,
      includeRelated: options?.includeRelated || false,
      threshold: options?.threshold || 0.7
    });
  }

  async semanticSearch(query: string, options?: any): Promise<any[]> {
    return await this.embeddings.semanticSearch(query, {
      types: options?.types,
      limit: options?.limit || 10,
      threshold: options?.threshold || 0.7,
      includeContext: options?.includeContext || false
    });
  }

  async startConversation(sessionId: string): Promise<void> {
    await this.memory.startConversation(sessionId);
  }

  async addMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    await this.memory.addMessage(role, content);
  }

  async getContext(): Promise<string> {
    return await this.memory.getContextAsText();
  }

  async findSimilarCode(codeSnippet: string): Promise<any[]> {
    const embedding = await this.embeddings.generateEmbedding(codeSnippet);
    return await this.db.findSimilarByEmbedding(
      embedding.embedding,
      undefined,
      0.7,
      10
    );
  }

  async getBacklinks(nodeId: string): Promise<any> {
    return await this.obsidian.getBacklinks(nodeId);
  }

  async getGraphView(centerNodeId?: string): Promise<any> {
    return await this.obsidian.createGraphView(centerNodeId, 2, 100);
  }

  async detectPatterns(): Promise<any[]> {
    return await this.patterns.detectPatterns(this.projectPath);
  }

  async getStatistics(): Promise<any> {
    const dbStats = await this.db.getGraphStatistics();
    const memoryStats = await this.memory.getStatistics();
    const patternStats = await this.patterns.getPatternStatistics();
    
    return {
      database: dbStats,
      memory: memoryStats,
      patterns: patternStats
    };
  }

  async startVisualization(port?: number): Promise<void> {
    if (!this.visualization) {
      this.visualization = new GraphVisualization({ port });
    }
    await this.visualization.start();
  }

  async stopVisualization(): Promise<void> {
    if (this.visualization) {
      await this.visualization.stop();
      this.visualization = null;
    }
  }

  async exportToMarkdown(nodeId: string): Promise<string> {
    return await this.obsidian.exportToMarkdown(nodeId);
  }

  async clearGraph(): Promise<void> {
    await this.db.clearGraph();
  }

  async close(): Promise<void> {
    await this.stopVisualization();
    await this.db.close();
    this.memory.cleanup();
    this.embeddings.cleanup();
  }
}