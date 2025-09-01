import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';
import { getDriver, closeDriver } from './config.js';
import { NodeType, RelationType, BaseNode, Relationship } from './schema.js';

export class GraphDatabase {
  private driver: Driver;

  constructor() {
    this.driver = getDriver();
  }

  async initialize(): Promise<void> {
    const session = this.driver.session();
    try {
      // Create constraints and indexes
      const constraints = [
        `CREATE CONSTRAINT IF NOT EXISTS FOR (f:${NodeType.FILE}) REQUIRE f.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (fn:${NodeType.FUNCTION}) REQUIRE fn.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (c:${NodeType.CLASS}) REQUIRE c.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (p:${NodeType.PATTERN}) REQUIRE p.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (conv:${NodeType.CONVERSATION}) REQUIRE conv.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (m:${NodeType.MESSAGE}) REQUIRE m.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (i:${NodeType.INSIGHT}) REQUIRE i.id IS UNIQUE`,
        `CREATE CONSTRAINT IF NOT EXISTS FOR (con:${NodeType.CONCEPT}) REQUIRE con.id IS UNIQUE`,
      ];

      const indexes = [
        `CREATE INDEX IF NOT EXISTS FOR (f:${NodeType.FILE}) ON (f.path)`,
        `CREATE INDEX IF NOT EXISTS FOR (f:${NodeType.FILE}) ON (f.hash)`,
        `CREATE INDEX IF NOT EXISTS FOR (fn:${NodeType.FUNCTION}) ON (fn.name)`,
        `CREATE INDEX IF NOT EXISTS FOR (c:${NodeType.CLASS}) ON (c.name)`,
        `CREATE INDEX IF NOT EXISTS FOR (p:${NodeType.PATTERN}) ON (p.pattern_type)`,
        `CREATE INDEX IF NOT EXISTS FOR (i:${NodeType.INSIGHT}) ON (i.insight_type)`,
        `CREATE INDEX IF NOT EXISTS FOR (n:Node) ON (n.created_at)`,
        `CREATE INDEX IF NOT EXISTS FOR (n:Node) ON (n.updated_at)`,
      ];

      // Execute constraints
      for (const constraint of constraints) {
        await session.run(constraint);
      }

      // Execute indexes
      for (const index of indexes) {
        await session.run(index);
      }

      console.log('Graph database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize graph database:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async createNode(node: BaseNode): Promise<string> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `CREATE (n:${node.type} $properties) RETURN n.id as id`,
        { properties: node }
      );
      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  async createNodes(nodes: BaseNode[]): Promise<string[]> {
    const session = this.driver.session();
    try {
      const tx = session.beginTransaction();
      const ids: string[] = [];

      for (const node of nodes) {
        const result = await tx.run(
          `CREATE (n:${node.type} $properties) RETURN n.id as id`,
          { properties: node }
        );
        ids.push(result.records[0].get('id'));
      }

      await tx.commit();
      return ids;
    } catch (error) {
      console.error('Failed to create nodes:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, updates: Partial<BaseNode>): Promise<void> {
    const session = this.driver.session();
    try {
      updates.updated_at = Date.now();
      await session.run(
        `MATCH (n {id: $id})
         SET n += $updates`,
        { id, updates }
      );
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (n {id: $id})
         DETACH DELETE n`,
        { id }
      );
    } finally {
      await session.close();
    }
  }

  async getNode(id: string): Promise<BaseNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n {id: $id})
         RETURN n`,
        { id }
      );
      if (result.records.length === 0) return null;
      return result.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  }

  async createRelationship(relationship: Relationship): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (a {id: $from_id}), (b {id: $to_id})
         CREATE (a)-[r:${relationship.type} $properties]->(b)`,
        {
          from_id: relationship.from_id,
          to_id: relationship.to_id,
          properties: {
            ...relationship.properties,
            created_at: relationship.created_at
          }
        }
      );
    } finally {
      await session.close();
    }
  }

  async createRelationships(relationships: Relationship[]): Promise<void> {
    const session = this.driver.session();
    try {
      const tx = session.beginTransaction();

      for (const rel of relationships) {
        await tx.run(
          `MATCH (a {id: $from_id}), (b {id: $to_id})
           CREATE (a)-[r:${rel.type} $properties]->(b)`,
          {
            from_id: rel.from_id,
            to_id: rel.to_id,
            properties: {
              ...rel.properties,
              created_at: rel.created_at
            }
          }
        );
      }

      await tx.commit();
    } catch (error) {
      console.error('Failed to create relationships:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async findNodesByType(type: NodeType, limit: number = 100): Promise<BaseNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n:${type})
         RETURN n
         ORDER BY n.created_at DESC
         LIMIT $limit`,
        { limit }
      );
      return result.records.map(record => record.get('n').properties);
    } finally {
      await session.close();
    }
  }

  async findRelatedNodes(
    nodeId: string,
    relationTypes: RelationType[],
    depth: number = 1,
    limit: number = 50
  ): Promise<BaseNode[]> {
    const session = this.driver.session();
    try {
      const relationPattern = relationTypes.map(rt => rt).join('|');
      const result = await session.run(
        `MATCH (start {id: $nodeId})-[:${relationPattern}*1..${depth}]-(related)
         WHERE start.id <> related.id
         RETURN DISTINCT related
         LIMIT $limit`,
        { nodeId, limit }
      );
      return result.records.map(record => record.get('related').properties);
    } finally {
      await session.close();
    }
  }

  async searchNodes(query: string, types?: NodeType[], limit: number = 20): Promise<BaseNode[]> {
    const session = this.driver.session();
    try {
      const typeFilter = types ? `AND n:${types.join('|')}` : '';
      const result = await session.run(
        `MATCH (n)
         WHERE (n.name CONTAINS $query 
                OR n.content CONTAINS $query 
                OR n.description CONTAINS $query)
                ${typeFilter}
         RETURN n
         ORDER BY n.updated_at DESC
         LIMIT $limit`,
        { query, limit }
      );
      return result.records.map(record => record.get('n').properties);
    } finally {
      await session.close();
    }
  }

  async findSimilarByEmbedding(
    embedding: number[],
    type?: NodeType,
    threshold: number = 0.8,
    limit: number = 10
  ): Promise<Array<{ node: BaseNode; similarity: number }>> {
    const session = this.driver.session();
    try {
      const typeFilter = type ? `:${type}` : '';
      const result = await session.run(
        `MATCH (n${typeFilter})
         WHERE n.embedding IS NOT NULL
         WITH n, 
              reduce(s = 0.0, i IN range(0, size($embedding)-1) | 
                s + (n.embedding[i] * $embedding[i])) / 
              (sqrt(reduce(s = 0.0, x IN n.embedding | s + x * x)) * 
               sqrt(reduce(s = 0.0, x IN $embedding | s + x * x))) AS similarity
         WHERE similarity > $threshold
         RETURN n, similarity
         ORDER BY similarity DESC
         LIMIT $limit`,
        { embedding, threshold, limit }
      );
      
      return result.records.map(record => ({
        node: record.get('n').properties,
        similarity: record.get('similarity')
      }));
    } finally {
      await session.close();
    }
  }

  async getGraphStatistics(): Promise<Record<string, any>> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n)
        WITH labels(n) AS labels, count(n) AS count
        RETURN labels[0] AS type, count
        ORDER BY count DESC
      `);

      const stats: Record<string, number> = {};
      result.records.forEach(record => {
        stats[record.get('type')] = record.get('count').toNumber();
      });

      const relResult = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) AS type, count(r) AS count
        ORDER BY count DESC
      `);

      const relStats: Record<string, number> = {};
      relResult.records.forEach(record => {
        relStats[record.get('type')] = record.get('count').toNumber();
      });

      return {
        nodes: stats,
        relationships: relStats,
        total_nodes: Object.values(stats).reduce((a, b) => a + b, 0),
        total_relationships: Object.values(relStats).reduce((a, b) => a + b, 0)
      };
    } finally {
      await session.close();
    }
  }

  async clearGraph(): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('Graph cleared successfully');
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await closeDriver();
  }
}