import { GraphDatabase } from './database.js';
import { 
  BaseNode, 
  NodeType, 
  RelationType,
  ConceptNode,
  Relationship
} from './schema.js';
import { 
  extractTags, 
  extractWikiLinks, 
  generateId,
  parseCodeReference 
} from './utils.js';
import { EmbeddingService } from './embeddings.js';
import { GraphTraversal } from './traversal.js';

export interface WikiLink {
  source: string;
  target: string;
  context?: string;
  line?: number;
}

export interface Tag {
  name: string;
  count: number;
  nodes: string[];
}

export interface BacklinkResult {
  node: BaseNode;
  references: Array<{
    from: BaseNode;
    context: string;
    line?: number;
  }>;
}

export interface GraphView {
  nodes: Array<{
    id: string;
    label: string;
    type: NodeType;
    size: number;
    color: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: RelationType;
    weight: number;
  }>;
}

export class ObsidianFeatures {
  private db: GraphDatabase;
  private embeddings: EmbeddingService;
  private traversal: GraphTraversal;
  private tagCache: Map<string, Tag> = new Map();
  private linkCache: Map<string, WikiLink[]> = new Map();

  constructor(apiKey?: string) {
    this.db = new GraphDatabase();
    this.embeddings = new EmbeddingService(apiKey);
    this.traversal = new GraphTraversal(apiKey);
  }

  async processWikiLinks(nodeId: string, content: string): Promise<WikiLink[]> {
    const links = extractWikiLinks(content);
    const wikiLinks: WikiLink[] = [];

    for (const link of links) {
      let targetNodeId: string | null = null;

      // Try to find the target node
      if (link.file) {
        // Search for file node
        const fileNodes = await this.db.searchNodes(link.file, [NodeType.FILE], 1);
        if (fileNodes.length > 0) {
          targetNodeId = fileNodes[0].id;
        }
      } else if (link.section) {
        // Search for function, class, or concept
        const nodes = await this.db.searchNodes(
          link.section, 
          [NodeType.FUNCTION, NodeType.CLASS, NodeType.CONCEPT],
          1
        );
        if (nodes.length > 0) {
          targetNodeId = nodes[0].id;
        }
      }

      // Create concept node if target doesn't exist
      if (!targetNodeId) {
        const conceptNode: ConceptNode = {
          id: generateId('concept'),
          type: NodeType.CONCEPT,
          name: link.link,
          description: `Concept referenced in wiki link: ${link.link}`,
          domain: 'user-defined',
          importance: 0.5,
          related_files: [nodeId],
          created_at: Date.now(),
          updated_at: Date.now()
        };
        
        targetNodeId = await this.db.createNode(conceptNode);
        await this.embeddings.embedNode(conceptNode);
      }

      // Create wiki link relationship
      await this.db.createRelationship({
        from_id: nodeId,
        to_id: targetNodeId,
        type: RelationType.REFERENCES,
        properties: {
          link_type: 'wiki',
          original_text: `[[${link.link}]]`
        },
        created_at: Date.now()
      });

      wikiLinks.push({
        source: nodeId,
        target: targetNodeId,
        context: link.link
      });
    }

    // Cache the links
    this.linkCache.set(nodeId, wikiLinks);
    
    return wikiLinks;
  }

  async processTags(nodeId: string, content: string): Promise<string[]> {
    const tags = extractTags(content);
    
    for (const tagName of tags) {
      // Create or update tag node
      let tagNode = await this.findOrCreateTag(tagName);
      
      // Create relationship
      await this.db.createRelationship({
        from_id: nodeId,
        to_id: tagNode.id,
        type: RelationType.TAGGED_WITH,
        created_at: Date.now()
      });

      // Update cache
      if (this.tagCache.has(tagName)) {
        const tag = this.tagCache.get(tagName)!;
        tag.count++;
        tag.nodes.push(nodeId);
      } else {
        this.tagCache.set(tagName, {
          name: tagName,
          count: 1,
          nodes: [nodeId]
        });
      }
    }

    return tags;
  }

  private async findOrCreateTag(tagName: string): Promise<BaseNode> {
    // Search for existing tag
    const existingTags = await this.db.searchNodes(tagName, [NodeType.TAG], 1);
    
    if (existingTags.length > 0) {
      return existingTags[0];
    }

    // Create new tag node
    const tagNode: BaseNode = {
      id: generateId('tag'),
      type: NodeType.TAG,
      name: tagName,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: {
        usage_count: 1
      }
    };

    await this.db.createNode(tagNode);
    return tagNode;
  }

  async getBacklinks(nodeId: string): Promise<BacklinkResult> {
    const node = await this.db.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Find all nodes that reference this node
    const session = this.db['driver'].session();
    try {
      const query = `
        MATCH (source)-[r:REFERENCES|RELATES_TO|CALLS|IMPORTS]->(target {id: $nodeId})
        RETURN source, r, target
      `;

      const result = await session.run(query, { nodeId });
      
      const references = result.records.map(record => {
        const sourceNode = record.get('source').properties;
        const relationship = record.get('r');
        
        // Extract context based on node type
        let context = '';
        if (sourceNode.type === NodeType.FILE) {
          context = sourceNode.content?.substring(0, 200) || sourceNode.path;
        } else if (sourceNode.type === NodeType.FUNCTION) {
          context = sourceNode.signature || sourceNode.name;
        } else {
          context = sourceNode.name || sourceNode.id;
        }

        return {
          from: sourceNode,
          context,
          line: relationship.properties?.line
        };
      });

      return { node, references };
    } finally {
      await session.close();
    }
  }

  async getForwardLinks(nodeId: string): Promise<BaseNode[]> {
    return await this.db.findRelatedNodes(
      nodeId,
      [RelationType.REFERENCES, RelationType.RELATES_TO],
      1,
      50
    );
  }

  async getAllTags(): Promise<Tag[]> {
    // Get from cache if available
    if (this.tagCache.size > 0) {
      return Array.from(this.tagCache.values());
    }

    // Otherwise, query database
    const tagNodes = await this.db.findNodesByType(NodeType.TAG, 1000);
    const tags: Tag[] = [];

    for (const tagNode of tagNodes) {
      // Count nodes with this tag
      const taggedNodes = await this.db.findRelatedNodes(
        tagNode.id,
        [RelationType.TAGGED_WITH],
        1,
        1000
      );

      const tag: Tag = {
        name: tagNode.name,
        count: taggedNodes.length,
        nodes: taggedNodes.map(n => n.id)
      };

      tags.push(tag);
      this.tagCache.set(tagNode.name, tag);
    }

    return tags;
  }

  async getNodesByTag(tagName: string): Promise<BaseNode[]> {
    // Find tag node
    const tagNodes = await this.db.searchNodes(tagName, [NodeType.TAG], 1);
    if (tagNodes.length === 0) {
      return [];
    }

    // Find all nodes with this tag
    return await this.db.findRelatedNodes(
      tagNodes[0].id,
      [RelationType.TAGGED_WITH],
      1,
      100
    );
  }

  async createDailyNote(date: Date = new Date()): Promise<BaseNode> {
    const dateStr = date.toISOString().split('T')[0];
    const noteName = `Daily Note - ${dateStr}`;

    // Check if daily note already exists
    const existingNotes = await this.db.searchNodes(noteName, [NodeType.CONCEPT], 1);
    if (existingNotes.length > 0) {
      return existingNotes[0];
    }

    // Create new daily note
    const dailyNote: ConceptNode = {
      id: generateId('daily'),
      type: NodeType.CONCEPT,
      name: noteName,
      description: `Daily note for ${dateStr}`,
      domain: 'daily-notes',
      importance: 0.8,
      related_files: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: {
        date: dateStr,
        type: 'daily-note'
      }
    };

    await this.db.createNode(dailyNote);
    
    // Link to previous daily note if exists
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayNoteName = `Daily Note - ${yesterdayStr}`;
    
    const yesterdayNotes = await this.db.searchNodes(yesterdayNoteName, [NodeType.CONCEPT], 1);
    if (yesterdayNotes.length > 0) {
      await this.db.createRelationship({
        from_id: yesterdayNotes[0].id,
        to_id: dailyNote.id,
        type: RelationType.NEXT,
        created_at: Date.now()
      });
      
      await this.db.createRelationship({
        from_id: dailyNote.id,
        to_id: yesterdayNotes[0].id,
        type: RelationType.PREVIOUS,
        created_at: Date.now()
      });
    }

    return dailyNote;
  }

  async createGraphView(
    centerNodeId?: string,
    depth: number = 2,
    maxNodes: number = 100
  ): Promise<GraphView> {
    let traversalResult;
    
    if (centerNodeId) {
      traversalResult = await this.traversal.getSubgraph(centerNodeId, depth, maxNodes);
    } else {
      // Get a sample of nodes for overall view
      const files = await this.db.findNodesByType(NodeType.FILE, 20);
      const functions = await this.db.findNodesByType(NodeType.FUNCTION, 20);
      const classes = await this.db.findNodesByType(NodeType.CLASS, 20);
      
      const startNodes = [...files, ...functions, ...classes].map(n => n.id);
      traversalResult = await this.traversal.traverse({
        startNodes,
        maxDepth: 1,
        maxNodes
      });
    }

    // Convert to graph view format
    const nodes = Array.from(traversalResult.nodes.values()).map(node => ({
      id: node.id,
      label: node.name,
      type: node.type,
      size: this.calculateNodeSize(node),
      color: this.getNodeColor(node.type)
    }));

    const edges = traversalResult.edges.map(edge => ({
      source: edge.from,
      target: edge.to,
      type: edge.type,
      weight: 1
    }));

    return { nodes, edges };
  }

  private calculateNodeSize(node: BaseNode): number {
    // Size based on node importance/connections
    switch (node.type) {
      case NodeType.FILE:
        return 10;
      case NodeType.CLASS:
        return 8;
      case NodeType.FUNCTION:
        return 6;
      case NodeType.CONCEPT:
        return 7;
      default:
        return 5;
    }
  }

  private getNodeColor(type: NodeType): string {
    const colorMap: Record<NodeType, string> = {
      [NodeType.FILE]: '#4a90e2',
      [NodeType.FUNCTION]: '#7ed321',
      [NodeType.CLASS]: '#f5a623',
      [NodeType.METHOD]: '#bd10e0',
      [NodeType.VARIABLE]: '#9013fe',
      [NodeType.IMPORT]: '#50e3c2',
      [NodeType.EXPORT]: '#b8e986',
      [NodeType.PATTERN]: '#ff6b6b',
      [NodeType.CONVERSATION]: '#4ecdc4',
      [NodeType.MESSAGE]: '#45b7d1',
      [NodeType.INSIGHT]: '#f7b731',
      [NodeType.TODO]: '#fd79a8',
      [NodeType.ERROR]: '#ee5a6f',
      [NodeType.COMMIT]: '#a29bfe',
      [NodeType.DEPENDENCY]: '#6c5ce7',
      [NodeType.CONCEPT]: '#00b894',
      [NodeType.TAG]: '#fdcb6e'
    };
    
    return colorMap[type] || '#95a5a6';
  }

  async searchWithContext(
    query: string,
    options: {
      includeBacklinks?: boolean;
      includeTags?: boolean;
      includeRelated?: boolean;
      limit?: number;
    } = {}
  ): Promise<Array<{
    node: BaseNode;
    backlinks?: BaseNode[];
    tags?: string[];
    related?: BaseNode[];
    score: number;
  }>> {
    const { 
      includeBacklinks = true, 
      includeTags = true, 
      includeRelated = true,
      limit = 10 
    } = options;

    // Perform semantic search
    const searchResults = await this.embeddings.semanticSearch(query, {
      limit: limit * 2,
      threshold: 0.6,
      includeContext: false
    });

    const enrichedResults = [];

    for (const result of searchResults.slice(0, limit)) {
      const enriched: any = {
        node: result.node,
        score: result.similarity
      };

      if (includeBacklinks) {
        const backlinks = await this.getBacklinks(result.node.id);
        enriched.backlinks = backlinks.references.map(r => r.from);
      }

      if (includeTags && result.node.type === NodeType.FILE) {
        const content = (result.node as any).content || '';
        enriched.tags = extractTags(content);
      }

      if (includeRelated) {
        enriched.related = await this.db.findRelatedNodes(
          result.node.id,
          [] as RelationType[],
          1,
          5
        );
      }

      enrichedResults.push(enriched);
    }

    return enrichedResults;
  }

  async createTemplate(
    name: string,
    description: string,
    template: string,
    nodeTypes: NodeType[]
  ): Promise<BaseNode> {
    const templateNode: BaseNode = {
      id: generateId('template'),
      type: NodeType.PATTERN,
      name,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: {
        pattern_type: 'template',
        description,
        template,
        applicable_to: nodeTypes,
        usage_count: 0
      }
    };

    await this.db.createNode(templateNode);
    await this.embeddings.embedNode(templateNode);
    
    return templateNode;
  }

  async applyTemplate(templateId: string, targetNodeId: string): Promise<void> {
    const template = await this.db.getNode(templateId);
    const targetNode = await this.db.getNode(targetNodeId);
    
    if (!template || !targetNode) {
      throw new Error('Template or target node not found');
    }

    // Apply template logic based on node type
    // This would be customized based on your specific template needs
    
    // Update usage count
    await this.db.updateNode(templateId, {
      metadata: {
        ...template.metadata,
        usage_count: (template.metadata?.usage_count || 0) + 1
      }
    });

    // Create relationship
    await this.db.createRelationship({
      from_id: targetNodeId,
      to_id: templateId,
      type: RelationType.INSTANTIATES,
      created_at: Date.now()
    });
  }

  async exportToMarkdown(nodeId: string): Promise<string> {
    const node = await this.db.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    let markdown = `# ${node.name}\n\n`;
    markdown += `Type: ${node.type}\n`;
    markdown += `Created: ${new Date(node.created_at).toISOString()}\n`;
    markdown += `Updated: ${new Date(node.updated_at).toISOString()}\n\n`;

    // Add metadata
    if (node.metadata) {
      markdown += `## Metadata\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(node.metadata, null, 2);
      markdown += '\n```\n\n';
    }

    // Add content based on node type
    switch (node.type) {
      case NodeType.FILE:
        const fileNode = node as any;
        markdown += `## File Information\n\n`;
        markdown += `- Path: ${fileNode.path}\n`;
        markdown += `- Language: ${fileNode.language}\n`;
        markdown += `- Size: ${fileNode.size} bytes\n`;
        markdown += `- Lines: ${fileNode.lines}\n\n`;
        if (fileNode.content) {
          markdown += `## Content\n\n`;
          markdown += '```' + fileNode.language + '\n';
          markdown += fileNode.content;
          markdown += '\n```\n';
        }
        break;
        
      case NodeType.FUNCTION:
        const funcNode = node as any;
        markdown += `## Function Signature\n\n`;
        markdown += '```\n' + funcNode.signature + '\n```\n\n';
        markdown += `## Implementation\n\n`;
        markdown += '```\n' + funcNode.body + '\n```\n';
        break;
        
      case NodeType.CLASS:
        const classNode = node as any;
        markdown += `## Class Information\n\n`;
        markdown += `- Abstract: ${classNode.abstract}\n`;
        if (classNode.extends) {
          markdown += `- Extends: ${classNode.extends}\n`;
        }
        if (classNode.implements?.length > 0) {
          markdown += `- Implements: ${classNode.implements.join(', ')}\n`;
        }
        markdown += `\n### Methods\n\n`;
        classNode.methods.forEach((method: string) => {
          markdown += `- ${method}\n`;
        });
        markdown += `\n### Properties\n\n`;
        classNode.properties.forEach((prop: string) => {
          markdown += `- ${prop}\n`;
        });
        break;
    }

    // Add backlinks
    const backlinks = await this.getBacklinks(nodeId);
    if (backlinks.references.length > 0) {
      markdown += `\n## Backlinks\n\n`;
      backlinks.references.forEach(ref => {
        markdown += `- [[${ref.from.name}]]: ${ref.context}\n`;
      });
    }

    // Add forward links
    const forwardLinks = await this.getForwardLinks(nodeId);
    if (forwardLinks.length > 0) {
      markdown += `\n## Links\n\n`;
      forwardLinks.forEach(link => {
        markdown += `- [[${link.name}]]\n`;
      });
    }

    return markdown;
  }
}