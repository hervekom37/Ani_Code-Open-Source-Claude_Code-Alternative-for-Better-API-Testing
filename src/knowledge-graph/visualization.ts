import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { GraphDatabase } from './database.js';
import { ObsidianFeatures } from './obsidian-features.js';
import { GraphTraversal } from './traversal.js';
import { NodeType, RelationType } from './schema.js';

export interface VisualizationConfig {
  port?: number;
  host?: string;
  autoOpen?: boolean;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    metadata?: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    weight?: number;
    color?: string;
    metadata?: any;
  }>;
}

export interface LayoutOptions {
  type: 'force' | 'hierarchical' | 'circular' | 'grid';
  parameters?: Record<string, any>;
}

export class GraphVisualization {
  private app: express.Application;
  private server: any;
  private io: Server;
  private db: GraphDatabase;
  private obsidian: ObsidianFeatures;
  private traversal: GraphTraversal;
  private config: VisualizationConfig;

  constructor(config: VisualizationConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      autoOpen: config.autoOpen ?? true
    };

    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.db = new GraphDatabase();
    this.obsidian = new ObsidianFeatures();
    this.traversal = new GraphTraversal();

    this.setupRoutes();
    this.setupSocketHandlers();
  }

  private setupRoutes(): void {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    // API routes
    this.app.get('/api/graph', async (req: Request, res: Response) => {
      try {
        const { nodeId, depth = 2, maxNodes = 100 } = req.query;
        const graphData = await this.getGraphData(
          nodeId as string,
          parseInt(depth as string),
          parseInt(maxNodes as string)
        );
        res.json(graphData);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/api/node/:id', async (req: Request, res: Response) => {
      try {
        const node = await this.db.getNode(req.params.id);
        if (!node) {
          return res.status(404).json({ error: 'Node not found' });
        }
        res.json(node);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/api/search', async (req: Request, res: Response) => {
      try {
        const { query, types, limit = 20 } = req.query;
        const nodeTypes = types ? (types as string).split(',') as NodeType[] : undefined;
        const results = await this.db.searchNodes(
          query as string,
          nodeTypes,
          parseInt(limit as string)
        );
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/api/statistics', async (req: Request, res: Response) => {
      try {
        const stats = await this.db.getGraphStatistics();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/api/communities', async (req: Request, res: Response) => {
      try {
        const { nodeType, minSize = 3 } = req.query;
        const communities = await this.traversal.findCommunities(
          nodeType as NodeType,
          parseInt(minSize as string)
        );
        res.json(communities);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/api/patterns', async (req: Request, res: Response) => {
      try {
        const { minSupport = 2, nodeTypes } = req.query;
        const types = nodeTypes ? (nodeTypes as string).split(',') as NodeType[] : undefined;
        const patterns = await this.traversal.findPatterns(
          parseInt(minSupport as string),
          types
        );
        res.json(patterns);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Serve HTML client
    this.app.get('/', (req: Request, res: Response) => {
      res.send(this.getHTMLClient());
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('get-graph', async (data) => {
        try {
          const { nodeId, depth, maxNodes } = data;
          const graphData = await this.getGraphData(nodeId, depth, maxNodes);
          socket.emit('graph-data', graphData);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('expand-node', async (nodeId) => {
        try {
          const subgraph = await this.traversal.getSubgraph(nodeId, 1, 20);
          const graphData = this.traversalToGraphData(subgraph);
          socket.emit('node-expanded', { nodeId, data: graphData });
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('find-path', async (data) => {
        try {
          const { startId, endId, relationTypes, maxDepth } = data;
          const path = await this.traversal.findShortestPath(
            startId,
            endId,
            relationTypes,
            maxDepth
          );
          socket.emit('path-found', path);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('update-layout', async (layoutOptions: LayoutOptions) => {
        try {
          // Layout calculations would be done here
          socket.emit('layout-updated', layoutOptions);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('filter-graph', async (filters) => {
        try {
          // Apply filters and send filtered graph
          const filteredData = await this.applyFilters(filters);
          socket.emit('graph-filtered', filteredData);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async getGraphData(
    centerNodeId?: string,
    depth: number = 2,
    maxNodes: number = 100
  ): Promise<GraphData> {
    let traversalResult;

    if (centerNodeId) {
      traversalResult = await this.traversal.getSubgraph(centerNodeId, depth, maxNodes);
    } else {
      // Get sample nodes for initial view
      const files = await this.db.findNodesByType(NodeType.FILE, 10);
      const classes = await this.db.findNodesByType(NodeType.CLASS, 10);
      const functions = await this.db.findNodesByType(NodeType.FUNCTION, 10);
      
      const startNodes = [...files, ...classes, ...functions].map(n => n.id);
      
      traversalResult = await this.traversal.traverse({
        startNodes,
        maxDepth: depth,
        maxNodes
      });
    }

    return this.traversalToGraphData(traversalResult);
  }

  private traversalToGraphData(traversalResult: any): GraphData {
    const nodes = Array.from(traversalResult.nodes.values()).map((node: any, index: number) => ({
      id: node.id,
      label: node.name || node.id,
      type: node.type,
      size: this.calculateNodeSize(node),
      color: this.getNodeColor(node.type),
      metadata: {
        created_at: node.created_at,
        updated_at: node.updated_at,
        ...node.metadata
      }
    }));

    const edges = traversalResult.edges.map((edge: any, index: number) => ({
      id: `edge_${index}`,
      source: edge.from,
      target: edge.to,
      type: edge.type,
      weight: edge.properties?.weight || 1,
      color: this.getEdgeColor(edge.type),
      metadata: edge.properties
    }));

    return { nodes, edges };
  }

  private calculateNodeSize(node: any): number {
    const baseSizes: Record<string, number> = {
      [NodeType.FILE]: 15,
      [NodeType.CLASS]: 12,
      [NodeType.FUNCTION]: 10,
      [NodeType.PATTERN]: 14,
      [NodeType.CONCEPT]: 11,
      [NodeType.INSIGHT]: 13
    };
    
    return baseSizes[node.type] || 8;
  }

  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      [NodeType.FILE]: '#3498db',
      [NodeType.FUNCTION]: '#2ecc71',
      [NodeType.CLASS]: '#f39c12',
      [NodeType.PATTERN]: '#e74c3c',
      [NodeType.CONCEPT]: '#9b59b6',
      [NodeType.INSIGHT]: '#f1c40f',
      [NodeType.CONVERSATION]: '#1abc9c',
      [NodeType.TAG]: '#34495e'
    };
    
    return colors[type] || '#95a5a6';
  }

  private getEdgeColor(type: string): string {
    const colors: Record<string, string> = {
      [RelationType.CONTAINS]: '#3498db',
      [RelationType.CALLS]: '#2ecc71',
      [RelationType.IMPORTS]: '#e74c3c',
      [RelationType.EXTENDS]: '#f39c12',
      [RelationType.IMPLEMENTS]: '#9b59b6',
      [RelationType.REFERENCES]: '#1abc9c',
      [RelationType.SIMILAR_TO]: '#34495e'
    };
    
    return colors[type] || '#bdc3c7';
  }

  private async applyFilters(filters: any): Promise<GraphData> {
    // Implementation of filter logic
    const { nodeTypes, relationTypes, dateRange, searchQuery } = filters;
    
    // This would be implemented based on your specific filtering needs
    return this.getGraphData();
  }

  async start(): Promise<void> {
    await this.db.initialize();
    
    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`Graph visualization server running at http://${this.config.host}:${this.config.port}`);
      
      if (this.config.autoOpen) {
        // Open browser
        const url = `http://${this.config.host}:${this.config.port}`;
        import('open').then(open => open.default(url));
      }
    });
  }

  async stop(): Promise<void> {
    this.io.close();
    this.server.close();
    await this.db.close();
  }

  private getHTMLClient(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
        }
        
        #container {
            display: flex;
            height: 100vh;
        }
        
        #sidebar {
            width: 300px;
            background: #2a2a2a;
            padding: 20px;
            overflow-y: auto;
            border-right: 1px solid #3a3a3a;
        }
        
        #graph {
            flex: 1;
            position: relative;
        }
        
        #controls {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(42, 42, 42, 0.95);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
        }
        
        input, select, button {
            width: 100%;
            padding: 8px;
            background: #3a3a3a;
            border: 1px solid #4a4a4a;
            border-radius: 4px;
            color: #e0e0e0;
            font-size: 14px;
        }
        
        button {
            cursor: pointer;
            background: #3498db;
            border: none;
            transition: background 0.3s;
        }
        
        button:hover {
            background: #2980b9;
        }
        
        #search-results {
            margin-top: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .search-result {
            padding: 10px;
            margin-bottom: 5px;
            background: #3a3a3a;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .search-result:hover {
            background: #4a4a4a;
        }
        
        .node-info {
            padding: 15px;
            background: #3a3a3a;
            border-radius: 4px;
            margin-top: 20px;
        }
        
        .node-info h3 {
            margin-top: 0;
            color: #3498db;
        }
        
        .tooltip {
            position: absolute;
            padding: 10px;
            background: rgba(42, 42, 42, 0.95);
            border-radius: 4px;
            pointer-events: none;
            font-size: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: none;
        }
        
        .legend {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(42, 42, 42, 0.95);
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="sidebar">
            <h2 style="margin-top: 0;">Knowledge Graph</h2>
            
            <div class="control-group">
                <label>Search</label>
                <input type="text" id="search-input" placeholder="Search nodes...">
            </div>
            
            <div class="control-group">
                <label>Node Types</label>
                <select id="node-types" multiple size="5">
                    <option value="File" selected>Files</option>
                    <option value="Function" selected>Functions</option>
                    <option value="Class" selected>Classes</option>
                    <option value="Pattern">Patterns</option>
                    <option value="Concept">Concepts</option>
                </select>
            </div>
            
            <div class="control-group">
                <button id="refresh-btn">Refresh Graph</button>
            </div>
            
            <div id="search-results"></div>
            
            <div id="selected-node-info"></div>
        </div>
        
        <div id="graph">
            <svg id="graph-svg"></svg>
            
            <div id="controls">
                <div class="control-group">
                    <label>Layout</label>
                    <select id="layout-select">
                        <option value="force">Force Directed</option>
                        <option value="hierarchical">Hierarchical</option>
                        <option value="circular">Circular</option>
                        <option value="grid">Grid</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>Depth</label>
                    <input type="range" id="depth-slider" min="1" max="5" value="2">
                    <span id="depth-value">2</span>
                </div>
                
                <div class="control-group">
                    <label>Max Nodes</label>
                    <input type="range" id="max-nodes-slider" min="10" max="500" value="100" step="10">
                    <span id="max-nodes-value">100</span>
                </div>
            </div>
            
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: #3498db;"></div>
                    <span>File</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #2ecc71;"></div>
                    <span>Function</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #f39c12;"></div>
                    <span>Class</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #e74c3c;"></div>
                    <span>Pattern</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #9b59b6;"></div>
                    <span>Concept</span>
                </div>
            </div>
            
            <div class="tooltip" id="tooltip"></div>
        </div>
    </div>
    
    <script>
        // Initialize Socket.IO connection
        const socket = io();
        
        // Graph visualization setup
        const svg = d3.select('#graph-svg');
        const width = window.innerWidth - 300;
        const height = window.innerHeight;
        
        svg.attr('width', width).attr('height', height);
        
        const g = svg.append('g');
        const linksGroup = g.append('g').attr('class', 'links');
        const nodesGroup = g.append('g').attr('class', 'nodes');
        
        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Force simulation
        let simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(50))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 5));
        
        let currentData = { nodes: [], edges: [] };
        
        // Load initial graph
        socket.emit('get-graph', {
            depth: 2,
            maxNodes: 100
        });
        
        // Handle graph data
        socket.on('graph-data', (data) => {
            currentData = data;
            updateGraph(data);
        });
        
        // Update graph function
        function updateGraph(data) {
            // Clear existing
            linksGroup.selectAll('*').remove();
            nodesGroup.selectAll('*').remove();
            
            // Add links
            const links = linksGroup.selectAll('line')
                .data(data.edges)
                .enter().append('line')
                .attr('stroke', d => d.color || '#666')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => Math.sqrt(d.weight || 1));
            
            // Add nodes
            const nodes = nodesGroup.selectAll('circle')
                .data(data.nodes)
                .enter().append('circle')
                .attr('r', d => d.size || 5)
                .attr('fill', d => d.color || '#999')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .call(drag(simulation));
            
            // Add labels
            const labels = nodesGroup.selectAll('text')
                .data(data.nodes)
                .enter().append('text')
                .text(d => d.label)
                .attr('font-size', 10)
                .attr('dx', 12)
                .attr('dy', 4)
                .style('pointer-events', 'none');
            
            // Node interactions
            nodes.on('click', (event, d) => {
                showNodeInfo(d);
                socket.emit('expand-node', d.id);
            });
            
            nodes.on('mouseover', (event, d) => {
                showTooltip(event, d);
            });
            
            nodes.on('mouseout', () => {
                hideTooltip();
            });
            
            // Update simulation
            simulation.nodes(data.nodes);
            simulation.force('link').links(data.edges);
            simulation.alpha(1).restart();
            
            simulation.on('tick', () => {
                links
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                nodes
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                
                labels
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            });
        }
        
        // Drag behavior
        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            
            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
        
        // Show node info
        function showNodeInfo(node) {
            const infoDiv = document.getElementById('selected-node-info');
            infoDiv.innerHTML = \`
                <div class="node-info">
                    <h3>\${node.label}</h3>
                    <p><strong>Type:</strong> \${node.type}</p>
                    <p><strong>ID:</strong> \${node.id}</p>
                    \${node.metadata ? '<p><strong>Metadata:</strong></p><pre>' + JSON.stringify(node.metadata, null, 2) + '</pre>' : ''}
                </div>
            \`;
        }
        
        // Tooltip functions
        function showTooltip(event, d) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'block';
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
            tooltip.innerHTML = \`
                <strong>\${d.label}</strong><br>
                Type: \${d.type}<br>
                ID: \${d.id}
            \`;
        }
        
        function hideTooltip() {
            document.getElementById('tooltip').style.display = 'none';
        }
        
        // Search functionality
        document.getElementById('search-input').addEventListener('input', async (e) => {
            const query = e.target.value;
            if (query.length < 2) return;
            
            const response = await fetch(\`/api/search?query=\${encodeURIComponent(query)}&limit=10\`);
            const results = await response.json();
            
            const resultsDiv = document.getElementById('search-results');
            resultsDiv.innerHTML = results.map(node => \`
                <div class="search-result" onclick="focusNode('\${node.id}')">
                    <strong>\${node.name}</strong><br>
                    <small>\${node.type}</small>
                </div>
            \`).join('');
        });
        
        // Focus on node
        window.focusNode = (nodeId) => {
            socket.emit('get-graph', {
                nodeId,
                depth: 2,
                maxNodes: 100
            });
        };
        
        // Control handlers
        document.getElementById('refresh-btn').addEventListener('click', () => {
            socket.emit('get-graph', {
                depth: parseInt(document.getElementById('depth-slider').value),
                maxNodes: parseInt(document.getElementById('max-nodes-slider').value)
            });
        });
        
        document.getElementById('layout-select').addEventListener('change', (e) => {
            socket.emit('update-layout', {
                type: e.target.value
            });
        });
        
        document.getElementById('depth-slider').addEventListener('input', (e) => {
            document.getElementById('depth-value').textContent = e.target.value;
        });
        
        document.getElementById('max-nodes-slider').addEventListener('input', (e) => {
            document.getElementById('max-nodes-value').textContent = e.target.value;
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth - 300;
            const newHeight = window.innerHeight;
            svg.attr('width', newWidth).attr('height', newHeight);
            simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
            simulation.alpha(0.3).restart();
        });
    </script>
</body>
</html>`;
  }
}