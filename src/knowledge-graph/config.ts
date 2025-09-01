import neo4j from 'neo4j-driver';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import os from 'os';

dotenvConfig();

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
}

export interface KnowledgeGraphConfig {
  neo4j: Neo4jConfig;
  embeddings: {
    model: string;
    dimensions: number;
  };
  memory: {
    activeMemoryTokens: number;
    workingMemoryTokens: number;
    maxGraphNodes: number;
  };
  indexing: {
    batchSize: number;
    extensions: string[];
    ignorePaths: string[];
  };
}

export const getConfig = (): KnowledgeGraphConfig => {
  const configPath = path.join(os.homedir(), '.ani-code-graph.json');
  
  // Default configuration
  const defaultConfig: KnowledgeGraphConfig = {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'anicode123',
      database: process.env.NEO4J_DATABASE || 'neo4j'
    },
    embeddings: {
      model: 'text-embedding-3-small',
      dimensions: 1536
    },
    memory: {
      activeMemoryTokens: 4000,
      workingMemoryTokens: 16000,
      maxGraphNodes: 1000
    },
    indexing: {
      batchSize: 50,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.cs', '.rb', '.php', '.swift', '.kt', '.scala', '.md', '.json', '.yaml', '.yml'],
      ignorePaths: ['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage', '__pycache__', '.pytest_cache', 'target']
    }
  };

  // TODO: Load user config from file if exists
  return defaultConfig;
};

let driver: neo4j.Driver | null = null;

export const getDriver = (): neo4j.Driver => {
  if (!driver) {
    const config = getConfig();
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
      { 
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 60000
      }
    );
  }
  return driver;
};

export const closeDriver = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};