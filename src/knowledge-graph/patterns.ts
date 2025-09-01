import { GraphDatabase } from './database.js';
import { 
  BaseNode, 
  NodeType, 
  RelationType,
  PatternNode,
  InsightNode,
  FunctionNode,
  ClassNode
} from './schema.js';
import { EmbeddingService } from './embeddings.js';
import { GraphTraversal } from './traversal.js';
import { generateId } from './utils.js';

export interface CodePattern {
  id: string;
  name: string;
  type: 'structural' | 'behavioral' | 'creational' | 'anti-pattern' | 'performance' | 'security';
  description: string;
  template: string;
  examples: Array<{
    nodeId: string;
    code: string;
    explanation: string;
  }>;
  frequency: number;
  confidence: number;
  recommendations?: string[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  applicableTo: NodeType[];
  structure: {
    nodes: Array<{
      type: NodeType;
      properties: Record<string, any>;
      required: boolean;
    }>;
    relationships: Array<{
      type: RelationType;
      from: number;
      to: number;
      required: boolean;
    }>;
  };
  code?: string;
  metadata?: Record<string, any>;
}

export interface PatternMatch {
  pattern: CodePattern;
  matches: Array<{
    nodes: BaseNode[];
    confidence: number;
    location: string;
  }>;
}

export interface InsightSuggestion {
  type: 'bug' | 'optimization' | 'refactor' | 'security' | 'documentation';
  title: string;
  description: string;
  affectedNodes: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix?: string;
  relatedPatterns?: string[];
}

export class PatternDetector {
  private db: GraphDatabase;
  private embeddings: EmbeddingService;
  private traversal: GraphTraversal;
  private patterns: Map<string, CodePattern> = new Map();
  private templates: Map<string, TemplateDefinition> = new Map();

  constructor(apiKey?: string) {
    this.db = new GraphDatabase();
    this.embeddings = new EmbeddingService(apiKey);
    this.traversal = new GraphTraversal(apiKey);
    this.initializeBuiltInPatterns();
  }

  private initializeBuiltInPatterns(): void {
    // Singleton Pattern
    this.patterns.set('singleton', {
      id: 'singleton',
      name: 'Singleton Pattern',
      type: 'creational',
      description: 'Ensures a class has only one instance and provides global access to it',
      template: `class Singleton {
  private static instance: Singleton;
  private constructor() {}
  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}`,
      examples: [],
      frequency: 0,
      confidence: 0.9,
      recommendations: ['Consider using dependency injection instead', 'Be careful with thread safety']
    });

    // Factory Pattern
    this.patterns.set('factory', {
      id: 'factory',
      name: 'Factory Pattern',
      type: 'creational',
      description: 'Creates objects without specifying their exact class',
      template: `interface Product {
  operation(): string;
}

class Factory {
  public createProduct(type: string): Product {
    // Product creation logic
  }
}`,
      examples: [],
      frequency: 0,
      confidence: 0.9
    });

    // Observer Pattern
    this.patterns.set('observer', {
      id: 'observer',
      name: 'Observer Pattern',
      type: 'behavioral',
      description: 'Defines a one-to-many dependency between objects',
      template: `interface Observer {
  update(data: any): void;
}

class Subject {
  private observers: Observer[] = [];
  
  attach(observer: Observer): void {
    this.observers.push(observer);
  }
  
  notify(data: any): void {
    this.observers.forEach(o => o.update(data));
  }
}`,
      examples: [],
      frequency: 0,
      confidence: 0.9
    });

    // Anti-patterns
    this.patterns.set('god-object', {
      id: 'god-object',
      name: 'God Object Anti-pattern',
      type: 'anti-pattern',
      description: 'A class that knows too much or does too much',
      template: '',
      examples: [],
      frequency: 0,
      confidence: 0.8,
      recommendations: ['Break down into smaller, focused classes', 'Apply Single Responsibility Principle']
    });

    this.patterns.set('callback-hell', {
      id: 'callback-hell',
      name: 'Callback Hell',
      type: 'anti-pattern',
      description: 'Deeply nested callbacks making code hard to read and maintain',
      template: '',
      examples: [],
      frequency: 0,
      confidence: 0.85,
      recommendations: ['Use async/await', 'Consider using Promises', 'Extract functions']
    });
  }

  async detectPatterns(projectPath?: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    // Get all functions and classes
    const functions = await this.db.findNodesByType(NodeType.FUNCTION, 1000);
    const classes = await this.db.findNodesByType(NodeType.CLASS, 1000);
    
    // Detect structural patterns
    matches.push(...await this.detectStructuralPatterns(classes));
    
    // Detect behavioral patterns
    matches.push(...await this.detectBehavioralPatterns(functions));
    
    // Detect anti-patterns
    matches.push(...await this.detectAntiPatterns(classes, functions));
    
    // Save detected patterns to database
    await this.saveDetectedPatterns(matches);
    
    return matches;
  }

  private async detectStructuralPatterns(classes: BaseNode[]): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    for (const classNode of classes) {
      const cls = classNode as ClassNode;
      
      // Check for Singleton pattern
      if (await this.isSingleton(cls)) {
        const pattern = this.patterns.get('singleton')!;
        const existingMatch = matches.find(m => m.pattern.id === 'singleton');
        
        if (existingMatch) {
          existingMatch.matches.push({
            nodes: [classNode],
            confidence: 0.9,
            location: cls.file_path
          });
        } else {
          matches.push({
            pattern,
            matches: [{
              nodes: [classNode],
              confidence: 0.9,
              location: cls.file_path
            }]
          });
        }
      }
      
      // Check for Factory pattern
      if (await this.isFactory(cls)) {
        const pattern = this.patterns.get('factory')!;
        const existingMatch = matches.find(m => m.pattern.id === 'factory');
        
        if (existingMatch) {
          existingMatch.matches.push({
            nodes: [classNode],
            confidence: 0.85,
            location: cls.file_path
          });
        } else {
          matches.push({
            pattern,
            matches: [{
              nodes: [classNode],
              confidence: 0.85,
              location: cls.file_path
            }]
          });
        }
      }
    }
    
    return matches;
  }

  private async detectBehavioralPatterns(functions: BaseNode[]): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    // Group functions by file for analysis
    const functionsByFile = new Map<string, FunctionNode[]>();
    
    for (const func of functions) {
      const fn = func as FunctionNode;
      if (!functionsByFile.has(fn.file_path)) {
        functionsByFile.set(fn.file_path, []);
      }
      functionsByFile.get(fn.file_path)!.push(fn);
    }
    
    // Detect Observer pattern
    for (const [file, funcs] of functionsByFile) {
      if (this.hasObserverPattern(funcs)) {
        const pattern = this.patterns.get('observer')!;
        matches.push({
          pattern,
          matches: [{
            nodes: funcs,
            confidence: 0.8,
            location: file
          }]
        });
      }
    }
    
    return matches;
  }

  private async detectAntiPatterns(classes: BaseNode[], functions: BaseNode[]): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    // Detect God Objects
    for (const classNode of classes) {
      const cls = classNode as ClassNode;
      
      // God object detection: too many methods or properties
      if (cls.methods.length > 20 || cls.properties.length > 15) {
        const pattern = this.patterns.get('god-object')!;
        matches.push({
          pattern,
          matches: [{
            nodes: [classNode],
            confidence: Math.min(0.5 + (cls.methods.length / 40), 1),
            location: cls.file_path
          }]
        });
      }
    }
    
    // Detect Callback Hell
    for (const funcNode of functions) {
      const fn = funcNode as FunctionNode;
      
      if (this.hasCallbackHell(fn)) {
        const pattern = this.patterns.get('callback-hell')!;
        matches.push({
          pattern,
          matches: [{
            nodes: [funcNode],
            confidence: 0.75,
            location: fn.file_path
          }]
        });
      }
    }
    
    return matches;
  }

  private async isSingleton(cls: ClassNode): Promise<boolean> {
    // Check for singleton characteristics
    const hasPrivateConstructor = cls.methods.some(m => 
      m.toLowerCase().includes('constructor') && 
      cls.metadata?.hasPrivateConstructor
    );
    
    const hasGetInstance = cls.methods.some(m => 
      m.toLowerCase().includes('getinstance') || 
      m.toLowerCase().includes('instance')
    );
    
    const hasStaticInstance = cls.properties.some(p => 
      p.toLowerCase().includes('instance') &&
      cls.metadata?.hasStaticMembers
    );
    
    return hasPrivateConstructor && hasGetInstance && hasStaticInstance;
  }

  private async isFactory(cls: ClassNode): Promise<boolean> {
    // Check for factory characteristics
    const hasCreateMethod = cls.methods.some(m => 
      m.toLowerCase().includes('create') || 
      m.toLowerCase().includes('make') ||
      m.toLowerCase().includes('build')
    );
    
    const returnsObjects = cls.metadata?.returnsObjects;
    
    return hasCreateMethod && returnsObjects;
  }

  private hasObserverPattern(functions: FunctionNode[]): boolean {
    const hasAttach = functions.some(f => 
      f.name.toLowerCase().includes('attach') || 
      f.name.toLowerCase().includes('subscribe') ||
      f.name.toLowerCase().includes('addobserver')
    );
    
    const hasNotify = functions.some(f => 
      f.name.toLowerCase().includes('notify') || 
      f.name.toLowerCase().includes('emit') ||
      f.name.toLowerCase().includes('trigger')
    );
    
    return hasAttach && hasNotify;
  }

  private hasCallbackHell(fn: FunctionNode): boolean {
    // Simple heuristic: check for deeply nested callbacks
    const body = fn.body;
    let depth = 0;
    let maxDepth = 0;
    
    for (const char of body) {
      if (char === '{') depth++;
      if (char === '}') depth--;
      maxDepth = Math.max(maxDepth, depth);
    }
    
    // Also check for callback keywords
    const callbackCount = (body.match(/callback|then|catch/gi) || []).length;
    
    return maxDepth > 5 && callbackCount > 3;
  }

  private async saveDetectedPatterns(matches: PatternMatch[]): Promise<void> {
    for (const match of matches) {
      // Create pattern node
      const patternNode: PatternNode = {
        id: generateId('pattern'),
        type: NodeType.PATTERN,
        name: match.pattern.name,
        pattern_type: match.pattern.type,
        description: match.pattern.description,
        template: match.pattern.template,
        usage_count: match.matches.length,
        confidence: match.pattern.confidence,
        examples: match.matches.map(m => m.location),
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      await this.db.createNode(patternNode);
      
      // Create relationships to matched nodes
      for (const m of match.matches) {
        for (const node of m.nodes) {
          await this.db.createRelationship({
            from_id: node.id,
            to_id: patternNode.id,
            type: RelationType.INSTANTIATES,
            properties: {
              confidence: m.confidence
            },
            created_at: Date.now()
          });
        }
      }
    }
  }

  async generateInsights(patterns: PatternMatch[]): Promise<InsightSuggestion[]> {
    const insights: InsightSuggestion[] = [];
    
    for (const match of patterns) {
      if (match.pattern.type === 'anti-pattern') {
        // Generate refactoring suggestions
        for (const m of match.matches) {
          insights.push({
            type: 'refactor',
            title: `Refactor ${match.pattern.name}`,
            description: match.pattern.description,
            affectedNodes: m.nodes.map(n => n.id),
            priority: m.confidence > 0.8 ? 'high' : 'medium',
            suggestedFix: match.pattern.recommendations?.join('\n'),
            relatedPatterns: [match.pattern.id]
          });
        }
      } else if (match.pattern.type === 'performance') {
        // Generate performance insights
        for (const m of match.matches) {
          insights.push({
            type: 'optimization',
            title: `Optimize ${match.pattern.name}`,
            description: `Performance issue detected: ${match.pattern.description}`,
            affectedNodes: m.nodes.map(n => n.id),
            priority: 'medium',
            relatedPatterns: [match.pattern.id]
          });
        }
      } else if (match.pattern.type === 'security') {
        // Generate security insights
        for (const m of match.matches) {
          insights.push({
            type: 'security',
            title: `Security Issue: ${match.pattern.name}`,
            description: match.pattern.description,
            affectedNodes: m.nodes.map(n => n.id),
            priority: 'critical',
            relatedPatterns: [match.pattern.id]
          });
        }
      }
    }
    
    // Save insights to database
    await this.saveInsights(insights);
    
    return insights;
  }

  private async saveInsights(insights: InsightSuggestion[]): Promise<void> {
    for (const insight of insights) {
      const insightNode: InsightNode = {
        id: generateId('insight'),
        type: NodeType.INSIGHT,
        name: insight.title,
        insight_type: insight.type,
        description: insight.description,
        confidence: 0.8,
        discovered_at: Date.now(),
        source: 'pattern-detector',
        actionable: true,
        priority: insight.priority,
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {
          suggestedFix: insight.suggestedFix,
          relatedPatterns: insight.relatedPatterns
        }
      };
      
      await this.db.createNode(insightNode);
      
      // Create relationships to affected nodes
      for (const nodeId of insight.affectedNodes) {
        await this.db.createRelationship({
          from_id: insightNode.id,
          to_id: nodeId,
          type: RelationType.FOUND_IN,
          created_at: Date.now()
        });
      }
    }
  }

  async createTemplate(template: TemplateDefinition): Promise<void> {
    this.templates.set(template.id, template);
    
    // Save to database
    const templateNode: BaseNode = {
      id: template.id,
      type: NodeType.PATTERN,
      name: template.name,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: {
        pattern_type: 'template',
        description: template.description,
        structure: template.structure,
        code: template.code,
        applicableTo: template.applicableTo
      }
    };
    
    await this.db.createNode(templateNode);
  }

  async applyTemplate(
    templateId: string,
    targetNodeId: string,
    parameters?: Record<string, any>
  ): Promise<BaseNode[]> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const createdNodes: BaseNode[] = [];
    const nodeMapping = new Map<number, string>();
    
    // Create nodes based on template
    for (let i = 0; i < template.structure.nodes.length; i++) {
      const nodeTemplate = template.structure.nodes[i];
      
      const node: BaseNode = {
        id: generateId(nodeTemplate.type.toLowerCase()),
        type: nodeTemplate.type,
        name: parameters?.[`node_${i}_name`] || `Generated_${nodeTemplate.type}`,
        created_at: Date.now(),
        updated_at: Date.now(),
        ...nodeTemplate.properties,
        metadata: {
          ...nodeTemplate.properties.metadata,
          fromTemplate: templateId,
          parentNode: targetNodeId
        }
      };
      
      await this.db.createNode(node);
      createdNodes.push(node);
      nodeMapping.set(i, node.id);
    }
    
    // Create relationships based on template
    for (const relTemplate of template.structure.relationships) {
      const fromId = nodeMapping.get(relTemplate.from);
      const toId = nodeMapping.get(relTemplate.to);
      
      if (fromId && toId) {
        await this.db.createRelationship({
          from_id: fromId,
          to_id: toId,
          type: relTemplate.type,
          created_at: Date.now()
        });
      }
    }
    
    // Link to parent node
    if (createdNodes.length > 0) {
      await this.db.createRelationship({
        from_id: targetNodeId,
        to_id: createdNodes[0].id,
        type: RelationType.CONTAINS,
        created_at: Date.now()
      });
    }
    
    return createdNodes;
  }

  async findSimilarPatterns(nodeId: string, threshold: number = 0.7): Promise<CodePattern[]> {
    const node = await this.db.getNode(nodeId);
    if (!node) return [];
    
    // Get embedding for the node
    if (!node.embedding) {
      await this.embeddings.embedNode(node);
    }
    
    // Find similar pattern nodes
    const similarNodes = await this.db.findSimilarByEmbedding(
      node.embedding!,
      NodeType.PATTERN,
      threshold,
      10
    );
    
    // Convert to CodePattern objects
    const patterns: CodePattern[] = [];
    for (const result of similarNodes) {
      const patternNode = result.node;
      patterns.push({
        id: patternNode.id,
        name: patternNode.name,
        type: patternNode.metadata?.pattern_type || 'structural',
        description: patternNode.metadata?.description || '',
        template: patternNode.metadata?.template || '',
        examples: patternNode.metadata?.examples || [],
        frequency: patternNode.metadata?.usage_count || 0,
        confidence: result.similarity,
        recommendations: patternNode.metadata?.recommendations
      });
    }
    
    return patterns;
  }

  async getPatternStatistics(): Promise<Record<string, any>> {
    const patterns = await this.db.findNodesByType(NodeType.PATTERN, 1000);
    const insights = await this.db.findNodesByType(NodeType.INSIGHT, 1000);
    
    const stats = {
      total_patterns: patterns.length,
      total_insights: insights.length,
      patterns_by_type: {} as Record<string, number>,
      insights_by_type: {} as Record<string, number>,
      top_patterns: [] as Array<{ name: string; count: number }>,
      recent_insights: [] as Array<{ title: string; type: string; priority: string }>
    };
    
    // Count patterns by type
    for (const pattern of patterns) {
      const type = pattern.metadata?.pattern_type || 'unknown';
      stats.patterns_by_type[type] = (stats.patterns_by_type[type] || 0) + 1;
    }
    
    // Count insights by type
    for (const insight of insights as InsightNode[]) {
      stats.insights_by_type[insight.insight_type] = 
        (stats.insights_by_type[insight.insight_type] || 0) + 1;
    }
    
    // Get top patterns
    const patternCounts = new Map<string, number>();
    for (const pattern of patterns) {
      const count = pattern.metadata?.usage_count || 0;
      patternCounts.set(pattern.name, count);
    }
    
    stats.top_patterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Get recent insights
    stats.recent_insights = (insights as InsightNode[])
      .sort((a, b) => b.discovered_at - a.discovered_at)
      .slice(0, 5)
      .map(i => ({
        title: i.name,
        type: i.insight_type,
        priority: i.priority
      }));
    
    return stats;
  }
}