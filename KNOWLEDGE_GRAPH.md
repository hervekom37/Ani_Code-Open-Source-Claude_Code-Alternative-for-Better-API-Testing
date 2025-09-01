# Knowledge Graph System Documentation

## Overview

The Knowledge Graph system is a comprehensive code intelligence platform that transforms your codebase into a searchable, analyzable graph database. It provides deep insights into code structure, patterns, and relationships, similar to tools like Obsidian but specifically designed for code understanding.

## Features

### 🔍 Code Intelligence
- **AST-based indexing**: Parses and indexes all code files, functions, classes, and their relationships
- **Semantic search**: Uses OpenAI embeddings to find similar code patterns and concepts
- **Pattern detection**: Automatically identifies design patterns, anti-patterns, and code smells
- **Insight generation**: Provides actionable suggestions for refactoring and optimization

### 🧠 Memory Management
- **Active Memory**: Tracks current conversation context
- **Working Memory**: Maintains relevant code context
- **Graph Memory**: Persistent knowledge base of your entire codebase

### 🔗 Obsidian-like Features
- **Wiki-links**: Create connections between code concepts using `[[links]]`
- **Tags**: Organize and categorize code with `#tags`
- **Backlinks**: See all references to a particular function, class, or file
- **Daily notes**: Track daily development progress
- **Graph visualization**: Interactive visualization of code relationships

### 📊 Analysis & Insights
- **Pattern detection**: Identifies Singleton, Factory, Observer, and other patterns
- **Anti-pattern detection**: Finds God Objects, Callback Hell, and other issues
- **Code metrics**: Complexity analysis, dependency tracking, and more
- **Community detection**: Identifies tightly coupled code modules

## Prerequisites

1. **Neo4j Database**
   - Install Neo4j Desktop or use Neo4j Aura (cloud)
   - Default connection: `bolt://localhost:7687`
   - Default credentials: `neo4j` / `password`

2. **OpenAI API Key** (optional, for semantic search)
   ```bash
   export OPENAI_API_KEY="your-api-key"
   ```

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="your-password"
export OPENAI_API_KEY="your-openai-key"  # Optional
```

## Usage

### CLI Commands

#### Index Your Project
```bash
# Index the current directory
ani graph index

# Index a specific directory
ani graph index --path /path/to/project

# Clear existing graph before indexing
ani graph index --clear
```

#### Search the Graph
```bash
# Basic search
ani graph search "authentication"

# Semantic search
ani graph search "user login flow" --semantic

# Search specific node types
ani graph search "validate" --types Function,Method

# Include related context
ani graph search "database connection" --context
```

#### Pattern Detection
```bash
# Detect patterns in your code
ani graph patterns --detect

# Show pattern statistics
ani graph patterns --stats
```

#### Visualization
```bash
# Start the visualization server
ani graph visualize

# Use custom port
ani graph visualize --port 8080
```

#### Statistics
```bash
# Show graph statistics
ani graph stats
```

#### Interactive Chat
```bash
# Start interactive chat with the knowledge graph
ani graph chat
```

#### Export
```bash
# Export a node to Markdown
ani graph export node_id

# Save to file
ani graph export node_id --output output.md
```

### Slash Commands (in TUI)

```
/graph-index           - Index project into knowledge graph
/graph-search <query>  - Search the knowledge graph
/graph-patterns        - Detect code patterns
/graph-visualize       - Start visualization server
/graph-stats           - Show statistics
```

## Architecture

### Components

1. **GraphDatabase** (`database.ts`)
   - Neo4j connection management
   - CRUD operations for nodes and relationships
   - Query execution

2. **CodeIndexer** (`indexer.ts`)
   - AST parsing for JavaScript/TypeScript
   - File traversal and indexing
   - Relationship extraction

3. **EmbeddingService** (`embeddings.ts`)
   - OpenAI embedding generation
   - Semantic similarity search
   - Code chunk processing

4. **MemoryManager** (`memory.ts`)
   - Three-tier memory system
   - Context management
   - Conversation tracking

5. **GraphTraversal** (`traversal.ts`)
   - Path finding algorithms
   - Community detection
   - Subgraph extraction

6. **ObsidianFeatures** (`obsidian-features.ts`)
   - Wiki-link processing
   - Tag management
   - Backlink tracking
   - Markdown export

7. **PatternDetector** (`patterns.ts`)
   - Design pattern recognition
   - Anti-pattern detection
   - Insight generation
   - Template system

8. **GraphVisualization** (`visualization.ts`)
   - Web-based visualization
   - Real-time updates via WebSocket
   - Interactive graph exploration

### Graph Schema

#### Node Types
- `File`: Source code files
- `Function`: Function definitions
- `Class`: Class definitions
- `Method`: Class methods
- `Variable`: Variable declarations
- `Import/Export`: Module dependencies
- `Pattern`: Detected code patterns
- `Conversation`: Chat sessions
- `Message`: Individual messages
- `Insight`: Generated insights
- `Concept`: Abstract concepts
- `Tag`: Organizational tags

#### Relationship Types
- `CONTAINS`: Hierarchical containment
- `IMPORTS/EXPORTS`: Module dependencies
- `CALLS`: Function invocations
- `EXTENDS/IMPLEMENTS`: Inheritance
- `REFERENCES`: General references
- `SIMILAR_TO`: Semantic similarity
- `TAGGED_WITH`: Tag associations
- `HAS_MESSAGE`: Conversation messages
- `INSTANTIATES`: Pattern instances

## Configuration

Create a `.ani-code-graph.json` file in your home directory:

```json
{
  "neo4j": {
    "uri": "bolt://localhost:7687",
    "username": "neo4j",
    "password": "password",
    "database": "neo4j"
  },
  "embeddings": {
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "memory": {
    "activeMemoryTokens": 4000,
    "workingMemoryTokens": 16000,
    "maxGraphNodes": 1000
  },
  "indexing": {
    "batchSize": 50,
    "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".java"],
    "ignorePaths": ["node_modules", ".git", "dist", "build"]
  }
}
```

## Examples

### Finding Similar Functions
```javascript
// Find functions similar to a given code snippet
const similar = await kg.findSimilarCode(`
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
`);
```

### Detecting Anti-patterns
```javascript
// Detect and fix anti-patterns
const patterns = await kg.detectPatterns();
patterns.forEach(pattern => {
  if (pattern.type === 'anti-pattern') {
    console.log(`Found ${pattern.name} in ${pattern.location}`);
    console.log(`Recommendation: ${pattern.recommendations.join(', ')}`);
  }
});
```

### Building Dependency Graphs
```javascript
// Get dependency graph for a file
const deps = await traversal.getDependencyGraph(fileId, 'both');
console.log(`File has ${deps.nodes.size} dependencies`);
```

### Creating Templates
```javascript
// Create a reusable code template
await patterns.createTemplate({
  id: 'rest-controller',
  name: 'REST Controller',
  description: 'Template for REST API controllers',
  applicableTo: [NodeType.CLASS],
  structure: {
    nodes: [
      { type: NodeType.CLASS, properties: { abstract: false }, required: true },
      { type: NodeType.METHOD, properties: { name: 'index' }, required: true },
      { type: NodeType.METHOD, properties: { name: 'show' }, required: true },
      { type: NodeType.METHOD, properties: { name: 'create' }, required: true },
      { type: NodeType.METHOD, properties: { name: 'update' }, required: true },
      { type: NodeType.METHOD, properties: { name: 'delete' }, required: true }
    ],
    relationships: [
      { type: RelationType.CONTAINS, from: 0, to: 1, required: true },
      { type: RelationType.CONTAINS, from: 0, to: 2, required: true }
    ]
  }
});
```

## Visualization Interface

The visualization server provides an interactive web interface for exploring your code graph:

- **Force-directed layout**: Visualize code relationships
- **Interactive exploration**: Click nodes to expand and explore
- **Search and filter**: Find specific code elements
- **Real-time updates**: See changes as you navigate
- **Multiple layouts**: Force, hierarchical, circular, grid

Access at `http://localhost:3000` after running `ani graph visualize`.

## Performance Considerations

- **Batch Processing**: Files are indexed in configurable batches
- **Incremental Updates**: Only changed files are re-indexed
- **Embedding Cache**: Embeddings are cached to reduce API calls
- **Memory Management**: Automatic pruning of least-used nodes
- **Query Optimization**: Indexes on frequently queried properties

## Troubleshooting

### Neo4j Connection Issues
```bash
# Check Neo4j is running
neo4j status

# Test connection
cypher-shell -u neo4j -p password "MATCH (n) RETURN count(n)"
```

### Memory Issues
- Reduce `batchSize` in configuration
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

### Embedding Errors
- Verify OpenAI API key is set
- Check API rate limits
- Use `--no-embeddings` flag to skip embedding generation

## Future Enhancements

- [ ] Support for more languages (Python, Java, Go)
- [ ] Git integration for tracking code evolution
- [ ] AI-powered code review suggestions
- [ ] Collaborative features for team knowledge sharing
- [ ] IDE plugins for VS Code and IntelliJ
- [ ] Advanced pattern templates
- [ ] Code generation from patterns
- [ ] Performance profiling integration

## Contributing

Contributions are welcome! Please see the main project README for contribution guidelines.

## License

MIT License - See LICENSE file for details