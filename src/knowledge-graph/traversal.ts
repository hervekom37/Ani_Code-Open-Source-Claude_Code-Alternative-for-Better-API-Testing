import { GraphDatabase } from './database.js';
import { 
  BaseNode, 
  NodeType, 
  RelationType,
  FileNode,
  FunctionNode,
  ClassNode,
  PatternNode,
  InsightNode
} from './schema.js';
import { EmbeddingService } from './embeddings.js';
import { calculateCosineSimilarity } from './utils.js';

export interface TraversalOptions {
  startNodes: string[];
  relationTypes?: RelationType[];
  nodeTypes?: NodeType[];
  maxDepth?: number;
  maxNodes?: number;
  direction?: 'incoming' | 'outgoing' | 'both';
  filters?: TraversalFilter[];
}

export interface TraversalFilter {
  property: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface TraversalResult {
  nodes: Map<string, BaseNode>;
  edges: Array<{ from: string; to: string; type: RelationType; properties?: any }>;
  paths: Path[];
  statistics: {
    nodesVisited: number;
    edgesTraversed: number;
    maxDepthReached: number;
    averagePathLength: number;
  };
}

export interface Path {
  nodes: BaseNode[];
  edges: Array<{ type: RelationType; properties?: any }>;
  score?: number;
}

export interface QueryBuilder {
  match(pattern: string): QueryBuilder;
  where(condition: string): QueryBuilder;
  return(fields: string): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  build(): string;
}

export class GraphTraversal {
  private db: GraphDatabase;
  private embeddings: EmbeddingService;

  constructor(apiKey?: string) {
    this.db = new GraphDatabase();
    this.embeddings = new EmbeddingService(apiKey);
  }

  async traverse(options: TraversalOptions): Promise<TraversalResult> {
    const {
      startNodes,
      relationTypes,
      nodeTypes,
      maxDepth = 3,
      maxNodes = 100,
      direction = 'both',
      filters = []
    } = options;

    const visited = new Set<string>();
    const nodes = new Map<string, BaseNode>();
    const edges: Array<{ from: string; to: string; type: RelationType; properties?: any }> = [];
    const paths: Path[] = [];
    
    let nodesVisited = 0;
    let edgesTraversed = 0;
    let maxDepthReached = 0;

    // BFS traversal
    const queue: Array<{ nodeId: string; depth: number; path: Path }> = [];
    
    // Initialize queue with start nodes
    for (const nodeId of startNodes) {
      const node = await this.db.getNode(nodeId);
      if (node) {
        queue.push({
          nodeId,
          depth: 0,
          path: { nodes: [node], edges: [] }
        });
        nodes.set(nodeId, node);
        visited.add(nodeId);
        nodesVisited++;
      }
    }

    while (queue.length > 0 && nodes.size < maxNodes) {
      const { nodeId, depth, path } = queue.shift()!;
      maxDepthReached = Math.max(maxDepthReached, depth);

      if (depth >= maxDepth) continue;

      // Get related nodes
      const relatedNodes = await this.getRelatedNodes(
        nodeId,
        relationTypes,
        direction,
        nodeTypes,
        filters
      );

      for (const { node: relatedNode, relationship } of relatedNodes) {
        if (!visited.has(relatedNode.id) && nodes.size < maxNodes) {
          visited.add(relatedNode.id);
          nodes.set(relatedNode.id, relatedNode);
          nodesVisited++;

          // Add edge
          edges.push({
            from: nodeId,
            to: relatedNode.id,
            type: relationship.type,
            properties: relationship.properties
          });
          edgesTraversed++;

          // Create new path
          const newPath: Path = {
            nodes: [...path.nodes, relatedNode],
            edges: [...path.edges, { type: relationship.type, properties: relationship.properties }]
          };

          // Add to queue for further traversal
          queue.push({
            nodeId: relatedNode.id,
            depth: depth + 1,
            path: newPath
          });

          // Store complete paths
          if (depth + 1 === maxDepth || nodes.size >= maxNodes) {
            paths.push(newPath);
          }
        }
      }
    }

    // Calculate statistics
    const averagePathLength = paths.length > 0
      ? paths.reduce((sum, p) => sum + p.nodes.length, 0) / paths.length
      : 0;

    return {
      nodes,
      edges,
      paths,
      statistics: {
        nodesVisited,
        edgesTraversed,
        maxDepthReached,
        averagePathLength
      }
    };
  }

  private async getRelatedNodes(
    nodeId: string,
    relationTypes?: RelationType[],
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    nodeTypes?: NodeType[],
    filters?: TraversalFilter[]
  ): Promise<Array<{ node: BaseNode; relationship: any }>> {
    const session = this.db['driver'].session();
    try {
      let query = '';
      const params: any = { nodeId };

      // Build relationship pattern
      let relPattern = '';
      if (relationTypes && relationTypes.length > 0) {
        relPattern = `:${relationTypes.join('|')}`;
      }

      // Build direction pattern
      let directionPattern = '';
      switch (direction) {
        case 'incoming':
          directionPattern = `(related)-[r${relPattern}]->(n)`;
          break;
        case 'outgoing':
          directionPattern = `(n)-[r${relPattern}]->(related)`;
          break;
        case 'both':
          directionPattern = `(n)-[r${relPattern}]-(related)`;
          break;
      }

      // Build node type filter
      let nodeTypeFilter = '';
      if (nodeTypes && nodeTypes.length > 0) {
        nodeTypeFilter = ` AND (${nodeTypes.map(t => `related:${t}`).join(' OR ')})`;
      }

      // Build property filters
      let propertyFilters = '';
      if (filters && filters.length > 0) {
        const filterConditions = filters.map((f, i) => {
          const paramName = `filter_${i}`;
          params[paramName] = f.value;
          
          switch (f.operator) {
            case 'eq':
              return `related.${f.property} = $${paramName}`;
            case 'neq':
              return `related.${f.property} <> $${paramName}`;
            case 'gt':
              return `related.${f.property} > $${paramName}`;
            case 'lt':
              return `related.${f.property} < $${paramName}`;
            case 'contains':
              return `related.${f.property} CONTAINS $${paramName}`;
            case 'startsWith':
              return `related.${f.property} STARTS WITH $${paramName}`;
            case 'endsWith':
              return `related.${f.property} ENDS WITH $${paramName}`;
            default:
              return '';
          }
        }).filter(c => c).join(' AND ');
        
        if (filterConditions) {
          propertyFilters = ` AND ${filterConditions}`;
        }
      }

      query = `
        MATCH (n {id: $nodeId})
        MATCH ${directionPattern}
        WHERE related.id <> n.id${nodeTypeFilter}${propertyFilters}
        RETURN related, r
        LIMIT 50
      `;

      const result = await session.run(query, params);
      
      return result.records.map(record => ({
        node: record.get('related').properties,
        relationship: {
          type: record.get('r').type,
          properties: record.get('r').properties
        }
      }));
    } finally {
      await session.close();
    }
  }

  async findShortestPath(
    startNodeId: string,
    endNodeId: string,
    relationTypes?: RelationType[],
    maxDepth: number = 10
  ): Promise<Path | null> {
    const session = this.db['driver'].session();
    try {
      const relPattern = relationTypes && relationTypes.length > 0
        ? `:${relationTypes.join('|')}`
        : '';

      const query = `
        MATCH path = shortestPath((start {id: $startId})-[${relPattern}*..${maxDepth}]-(end {id: $endId}))
        RETURN path
      `;

      const result = await session.run(query, {
        startId: startNodeId,
        endId: endNodeId
      });

      if (result.records.length === 0) return null;

      const pathRecord = result.records[0].get('path');
      const nodes: BaseNode[] = pathRecord.segments.map((seg: any) => seg.end.properties);
      nodes.unshift(pathRecord.start.properties);

      const edges = pathRecord.segments.map((seg: any) => ({
        type: seg.relationship.type,
        properties: seg.relationship.properties
      }));

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  async findAllPaths(
    startNodeId: string,
    endNodeId: string,
    relationTypes?: RelationType[],
    maxDepth: number = 5,
    limit: number = 10
  ): Promise<Path[]> {
    const session = this.db['driver'].session();
    try {
      const relPattern = relationTypes && relationTypes.length > 0
        ? `:${relationTypes.join('|')}`
        : '';

      const query = `
        MATCH path = (start {id: $startId})-[${relPattern}*..${maxDepth}]-(end {id: $endId})
        RETURN path
        LIMIT $limit
      `;

      const result = await session.run(query, {
        startId: startNodeId,
        endId: endNodeId,
        limit
      });

      return result.records.map(record => {
        const pathRecord = record.get('path');
        const nodes: BaseNode[] = pathRecord.segments.map((seg: any) => seg.end.properties);
        nodes.unshift(pathRecord.start.properties);

        const edges = pathRecord.segments.map((seg: any) => ({
          type: seg.relationship.type,
          properties: seg.relationship.properties
        }));

        return { nodes, edges };
      });
    } finally {
      await session.close();
    }
  }

  async findCommunities(
    nodeType?: NodeType,
    minSize: number = 3
  ): Promise<Array<{ nodes: BaseNode[]; centrality: Map<string, number> }>> {
    const session = this.db['driver'].session();
    try {
      const nodeFilter = nodeType ? `:${nodeType}` : '';
      
      // Use Louvain algorithm for community detection (if available in Neo4j)
      // Otherwise, use a simpler connected components approach
      const query = `
        MATCH (n${nodeFilter})
        WITH collect(n) as nodes
        CALL apoc.algo.community(nodes, [], {}) YIELD community, nodes as communityNodes
        WHERE size(communityNodes) >= $minSize
        RETURN communityNodes
      `;

      // Fallback to connected components if APOC is not available
      const fallbackQuery = `
        MATCH (n${nodeFilter})-[*]-(m${nodeFilter})
        WITH n, collect(DISTINCT m) as connected
        WHERE size(connected) >= $minSize
        RETURN n, connected
        LIMIT 100
      `;

      try {
        const result = await session.run(query, { minSize });
        return this.processCommunityResults(result);
      } catch (error) {
        // Fallback if APOC is not available
        const result = await session.run(fallbackQuery, { minSize });
        return this.processConnectedComponents(result);
      }
    } finally {
      await session.close();
    }
  }

  private processCommunityResults(result: any): Array<{ nodes: BaseNode[]; centrality: Map<string, number> }> {
    return result.records.map((record: any) => {
      const nodes = record.get('communityNodes').map((n: any) => n.properties);
      const centrality = this.calculateCentrality(nodes);
      return { nodes, centrality };
    });
  }

  private processConnectedComponents(result: any): Array<{ nodes: BaseNode[]; centrality: Map<string, number> }> {
    const communities = new Map<string, Set<BaseNode>>();
    
    result.records.forEach((record: any) => {
      const node = record.get('n').properties;
      const connected = record.get('connected').map((n: any) => n.properties);
      
      // Simple community grouping
      const communityKey = node.id;
      if (!communities.has(communityKey)) {
        communities.set(communityKey, new Set());
      }
      communities.get(communityKey)!.add(node);
      connected.forEach((n: BaseNode) => communities.get(communityKey)!.add(n));
    });

    return Array.from(communities.values())
      .filter(community => community.size >= 3)
      .map(community => {
        const nodes = Array.from(community);
        const centrality = this.calculateCentrality(nodes);
        return { nodes, centrality };
      });
  }

  private calculateCentrality(nodes: BaseNode[]): Map<string, number> {
    const centrality = new Map<string, number>();
    
    // Simple degree centrality calculation
    nodes.forEach(node => {
      centrality.set(node.id, Math.random()); // Placeholder - would need actual edge counts
    });
    
    return centrality;
  }

  async findPatterns(
    minSupport: number = 2,
    nodeTypes?: NodeType[]
  ): Promise<PatternNode[]> {
    const session = this.db['driver'].session();
    try {
      const typeFilter = nodeTypes && nodeTypes.length > 0
        ? `WHERE n:${nodeTypes.join(' OR n:')}`
        : '';

      // Find frequent subgraphs
      const query = `
        MATCH (n)-[r]-(m)
        ${typeFilter}
        WITH type(r) as relType, labels(n)[0] as nodeType1, labels(m)[0] as nodeType2, count(*) as frequency
        WHERE frequency >= $minSupport
        RETURN nodeType1, relType, nodeType2, frequency
        ORDER BY frequency DESC
        LIMIT 50
      `;

      const result = await session.run(query, { minSupport });
      
      const patterns: PatternNode[] = [];
      result.records.forEach(record => {
        const pattern: PatternNode = {
          id: `pattern_${Date.now()}_${Math.random()}`,
          type: NodeType.PATTERN,
          name: `${record.get('nodeType1')}-${record.get('relType')}-${record.get('nodeType2')}`,
          pattern_type: 'structural',
          description: `Frequent pattern: ${record.get('nodeType1')} ${record.get('relType')} ${record.get('nodeType2')}`,
          usage_count: record.get('frequency').toNumber(),
          confidence: record.get('frequency').toNumber() / 100, // Normalized confidence
          examples: [],
          created_at: Date.now(),
          updated_at: Date.now()
        };
        patterns.push(pattern);
      });

      return patterns;
    } finally {
      await session.close();
    }
  }

  async getSubgraph(
    centerNodeId: string,
    radius: number = 2,
    maxNodes: number = 50
  ): Promise<TraversalResult> {
    return this.traverse({
      startNodes: [centerNodeId],
      maxDepth: radius,
      maxNodes,
      direction: 'both'
    });
  }

  async getDependencyGraph(
    fileOrFunctionId: string,
    direction: 'upstream' | 'downstream' | 'both' = 'both'
  ): Promise<TraversalResult> {
    const traversalDirection = direction === 'upstream' ? 'incoming' : 
                              direction === 'downstream' ? 'outgoing' : 'both';
    
    return this.traverse({
      startNodes: [fileOrFunctionId],
      relationTypes: [
        RelationType.IMPORTS,
        RelationType.CALLS,
        RelationType.DEPENDS_ON,
        RelationType.REFERENCES
      ],
      maxDepth: 5,
      maxNodes: 100,
      direction: traversalDirection
    });
  }

  async getCallGraph(
    functionId: string,
    maxDepth: number = 3
  ): Promise<TraversalResult> {
    return this.traverse({
      startNodes: [functionId],
      relationTypes: [RelationType.CALLS],
      nodeTypes: [NodeType.FUNCTION, NodeType.METHOD],
      maxDepth,
      maxNodes: 100,
      direction: 'outgoing'
    });
  }

  async getInheritanceHierarchy(
    classId: string
  ): Promise<TraversalResult> {
    return this.traverse({
      startNodes: [classId],
      relationTypes: [RelationType.EXTENDS, RelationType.IMPLEMENTS],
      nodeTypes: [NodeType.CLASS],
      maxDepth: 10,
      maxNodes: 50,
      direction: 'both'
    });
  }

  async rankNodesByPageRank(
    nodeType?: NodeType,
    damping: number = 0.85,
    iterations: number = 20
  ): Promise<Map<string, number>> {
    const session = this.db['driver'].session();
    try {
      const typeFilter = nodeType ? `:${nodeType}` : '';
      
      // Initialize PageRank values
      const query = `
        MATCH (n${typeFilter})
        WITH collect(n) as nodes, count(n) as nodeCount
        UNWIND nodes as node
        SET node.pagerank = 1.0 / nodeCount
        RETURN node.id as id, node.pagerank as rank
      `;

      const result = await session.run(query);
      const pageRank = new Map<string, number>();
      
      result.records.forEach(record => {
        pageRank.set(record.get('id'), record.get('rank'));
      });

      // Iterative PageRank calculation would go here
      // This is a simplified version
      
      return pageRank;
    } finally {
      await session.close();
    }
  }

  createQueryBuilder(): QueryBuilder {
    let matchClause = '';
    let whereClause = '';
    let returnClause = '';
    let orderByClause = '';
    let limitClause = '';

    return {
      match(pattern: string) {
        matchClause = `MATCH ${pattern}`;
        return this;
      },
      where(condition: string) {
        whereClause = whereClause ? `${whereClause} AND ${condition}` : `WHERE ${condition}`;
        return this;
      },
      return(fields: string) {
        returnClause = `RETURN ${fields}`;
        return this;
      },
      orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC') {
        orderByClause = `ORDER BY ${field} ${direction}`;
        return this;
      },
      limit(count: number) {
        limitClause = `LIMIT ${count}`;
        return this;
      },
      build() {
        return [matchClause, whereClause, returnClause, orderByClause, limitClause]
          .filter(c => c)
          .join(' ');
      }
    };
  }

  async executeQuery(query: string, params: any = {}): Promise<any[]> {
    const session = this.db['driver'].session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }
}