import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { NodeType } from '../knowledge-graph/schema.js';
import path from 'path';
import fs from 'fs/promises';

let knowledgeGraph: KnowledgeGraph | null = null;

async function initializeGraph(projectPath?: string): Promise<KnowledgeGraph> {
  if (!knowledgeGraph) {
    const resolvedPath = projectPath || process.cwd();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn(chalk.yellow('⚠️  No OpenAI API key found. Semantic search will be disabled.'));
    }
    
    knowledgeGraph = new KnowledgeGraph(resolvedPath, apiKey);
    await knowledgeGraph.initialize();
  }
  return knowledgeGraph;
}

export function createGraphCommands(): Command {
  const graph = new Command('graph')
    .description('Knowledge graph operations for code understanding');

  graph
    .command('index')
    .description('Index the current project into the knowledge graph')
    .option('-p, --path <path>', 'Project path to index', process.cwd())
    .option('--clear', 'Clear existing graph before indexing')
    .action(async (options) => {
      const spinner = ora('Initializing knowledge graph...').start();
      
      try {
        const kg = await initializeGraph(options.path);
        
        if (options.clear) {
          spinner.text = 'Clearing existing graph...';
          await kg.clearGraph();
        }
        
        spinner.text = 'Indexing project files...';
        const result = await kg.indexProject();
        
        spinner.succeed('Project indexed successfully!');
        
        console.log(chalk.green('\n📊 Indexing Results:'));
        console.log(chalk.cyan(`  Files indexed: ${result.indexing.filesIndexed}`));
        console.log(chalk.cyan(`  Functions found: ${result.indexing.functionsFound}`));
        console.log(chalk.cyan(`  Classes found: ${result.indexing.classesFound}`));
        console.log(chalk.cyan(`  Relationships created: ${result.indexing.relationshipsCreated}`));
        console.log(chalk.cyan(`  Patterns detected: ${result.patterns}`));
        console.log(chalk.cyan(`  Insights generated: ${result.insights}`));
        
        if (result.indexing.errors.length > 0) {
          console.log(chalk.yellow('\n⚠️  Errors encountered:'));
          result.indexing.errors.slice(0, 5).forEach((err: string) => {
            console.log(chalk.yellow(`  - ${err}`));
          });
        }
      } catch (error) {
        spinner.fail('Failed to index project');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('search <query>')
    .description('Search the knowledge graph')
    .option('-t, --types <types>', 'Node types to search (comma-separated)')
    .option('-l, --limit <number>', 'Maximum results', '10')
    .option('--semantic', 'Use semantic search')
    .option('--context', 'Include related context')
    .action(async (query, options) => {
      const spinner = ora('Searching knowledge graph...').start();
      
      try {
        const kg = await initializeGraph();
        
        const searchOptions = {
          limit: parseInt(options.limit),
          includeRelated: options.context,
          types: options.types ? options.types.split(',').map((t: string) => t.trim() as NodeType) : undefined
        };
        
        const results = options.semantic 
          ? await kg.semanticSearch(query, searchOptions)
          : await kg.search(query, searchOptions);
        
        spinner.succeed(`Found ${results.length} results`);
        
        if (results.length === 0) {
          console.log(chalk.yellow('No results found'));
          return;
        }
        
        console.log(chalk.green('\n🔍 Search Results:'));
        results.forEach((result: any, index: number) => {
          const node = result.node || result;
          console.log(chalk.cyan(`\n${index + 1}. ${node.name || node.id}`));
          console.log(chalk.gray(`   Type: ${node.type}`));
          
          if (node.type === NodeType.FILE) {
            console.log(chalk.gray(`   Path: ${node.path}`));
          } else if (node.type === NodeType.FUNCTION) {
            console.log(chalk.gray(`   File: ${node.file_path}`));
            console.log(chalk.gray(`   Lines: ${node.line_start}-${node.line_end}`));
          } else if (node.type === NodeType.CLASS) {
            console.log(chalk.gray(`   File: ${node.file_path}`));
            console.log(chalk.gray(`   Methods: ${node.methods?.length || 0}`));
          }
          
          if (result.similarity) {
            console.log(chalk.gray(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`));
          }
        });
      } catch (error) {
        spinner.fail('Search failed');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('patterns')
    .description('Detect and display code patterns')
    .option('--detect', 'Run pattern detection')
    .option('--stats', 'Show pattern statistics')
    .action(async (options) => {
      const spinner = ora('Analyzing patterns...').start();
      
      try {
        const kg = await initializeGraph();
        
        if (options.detect) {
          spinner.text = 'Detecting patterns...';
          const patterns = await kg.detectPatterns();
          
          spinner.succeed(`Detected ${patterns.length} pattern types`);
          
          console.log(chalk.green('\n🎯 Detected Patterns:'));
          patterns.forEach((match: any) => {
            console.log(chalk.cyan(`\n${match.pattern.name}`));
            console.log(chalk.gray(`  Type: ${match.pattern.type}`));
            console.log(chalk.gray(`  Instances: ${match.matches.length}`));
            console.log(chalk.gray(`  Description: ${match.pattern.description}`));
            
            if (match.pattern.recommendations) {
              console.log(chalk.yellow('  Recommendations:'));
              match.pattern.recommendations.forEach((rec: string) => {
                console.log(chalk.yellow(`    - ${rec}`));
              });
            }
          });
        }
        
        if (options.stats || !options.detect) {
          spinner.text = 'Getting pattern statistics...';
          const stats = await kg.getStatistics();
          
          spinner.succeed('Pattern analysis complete');
          
          console.log(chalk.green('\n📈 Pattern Statistics:'));
          console.log(chalk.cyan(`  Total patterns: ${stats.patterns.total_patterns}`));
          console.log(chalk.cyan(`  Total insights: ${stats.patterns.total_insights}`));
          
          if (stats.patterns.top_patterns.length > 0) {
            console.log(chalk.cyan('\n  Top Patterns:'));
            stats.patterns.top_patterns.forEach((p: any) => {
              console.log(chalk.gray(`    - ${p.name}: ${p.count} instances`));
            });
          }
          
          if (stats.patterns.recent_insights.length > 0) {
            console.log(chalk.cyan('\n  Recent Insights:'));
            stats.patterns.recent_insights.forEach((i: any) => {
              const priorityColor = i.priority === 'critical' ? chalk.red :
                                   i.priority === 'high' ? chalk.yellow :
                                   chalk.gray;
              console.log(priorityColor(`    - [${i.priority.toUpperCase()}] ${i.title} (${i.type})`));
            });
          }
        }
      } catch (error) {
        spinner.fail('Pattern analysis failed');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('visualize')
    .description('Start the graph visualization server')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Don\'t open browser automatically')
    .action(async (options) => {
      const spinner = ora('Starting visualization server...').start();
      
      try {
        const kg = await initializeGraph();
        
        const port = parseInt(options.port);
        await kg.startVisualization(port);
        
        spinner.succeed(`Visualization server started at http://localhost:${port}`);
        console.log(chalk.cyan('\nPress Ctrl+C to stop the server'));
        
        // Keep the process running
        process.on('SIGINT', async () => {
          console.log(chalk.yellow('\n\nStopping visualization server...'));
          await kg.stopVisualization();
          process.exit(0);
        });
        
        // Keep the process alive
        await new Promise(() => {});
      } catch (error) {
        spinner.fail('Failed to start visualization');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('stats')
    .description('Display knowledge graph statistics')
    .action(async () => {
      const spinner = ora('Gathering statistics...').start();
      
      try {
        const kg = await initializeGraph();
        const stats = await kg.getStatistics();
        
        spinner.succeed('Statistics gathered');
        
        console.log(chalk.green('\n📊 Knowledge Graph Statistics:'));
        
        console.log(chalk.cyan('\n  Database:'));
        console.log(chalk.gray(`    Total nodes: ${stats.database.total_nodes}`));
        console.log(chalk.gray(`    Total relationships: ${stats.database.total_relationships}`));
        
        if (stats.database.nodes) {
          console.log(chalk.cyan('\n  Node Types:'));
          Object.entries(stats.database.nodes).forEach(([type, count]) => {
            console.log(chalk.gray(`    ${type}: ${count}`));
          });
        }
        
        if (stats.database.relationships) {
          console.log(chalk.cyan('\n  Relationship Types:'));
          Object.entries(stats.database.relationships)
            .slice(0, 5)
            .forEach(([type, count]) => {
              console.log(chalk.gray(`    ${type}: ${count}`));
            });
        }
        
        console.log(chalk.cyan('\n  Memory:'));
        console.log(chalk.gray(`    Active: ${stats.memory.active_memory.nodes} nodes (${stats.memory.active_memory.tokens} tokens)`));
        console.log(chalk.gray(`    Working: ${stats.memory.working_memory.nodes} nodes (${stats.memory.working_memory.tokens} tokens)`));
      } catch (error) {
        spinner.fail('Failed to gather statistics');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('export <nodeId>')
    .description('Export a node to Markdown')
    .option('-o, --output <file>', 'Output file path')
    .action(async (nodeId, options) => {
      const spinner = ora('Exporting node...').start();
      
      try {
        const kg = await initializeGraph();
        const markdown = await kg.exportToMarkdown(nodeId);
        
        if (options.output) {
          await fs.writeFile(options.output, markdown);
          spinner.succeed(`Exported to ${options.output}`);
        } else {
          spinner.succeed('Node exported');
          console.log('\n' + markdown);
        }
      } catch (error) {
        spinner.fail('Export failed');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('clear')
    .description('Clear the entire knowledge graph')
    .action(async () => {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to clear the entire knowledge graph?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }
      
      const spinner = ora('Clearing knowledge graph...').start();
      
      try {
        const kg = await initializeGraph();
        await kg.clearGraph();
        spinner.succeed('Knowledge graph cleared');
      } catch (error) {
        spinner.fail('Failed to clear graph');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  graph
    .command('chat')
    .description('Start an interactive chat with the knowledge graph')
    .action(async () => {
      console.log(chalk.green('🤖 Knowledge Graph Chat'));
      console.log(chalk.gray('Type "exit" to quit, "help" for commands\n'));
      
      const kg = await initializeGraph();
      const sessionId = `session_${Date.now()}`;
      await kg.startConversation(sessionId);
      
      while (true) {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.cyan('You:')
          }
        ]);
        
        if (input.toLowerCase() === 'exit') {
          console.log(chalk.yellow('Goodbye!'));
          break;
        }
        
        if (input.toLowerCase() === 'help') {
          console.log(chalk.gray('\nCommands:'));
          console.log(chalk.gray('  search <query> - Search the graph'));
          console.log(chalk.gray('  context - Show current context'));
          console.log(chalk.gray('  stats - Show statistics'));
          console.log(chalk.gray('  exit - Quit chat\n'));
          continue;
        }
        
        if (input.startsWith('search ')) {
          const query = input.substring(7);
          const results = await kg.semanticSearch(query, { limit: 5 });
          
          console.log(chalk.green('\nSearch Results:'));
          results.forEach((r: any, i: number) => {
            const node = r.node || r;
            console.log(chalk.gray(`  ${i + 1}. ${node.name} (${node.type})`));
          });
          console.log();
          continue;
        }
        
        if (input === 'context') {
          const context = await kg.getContext();
          console.log(chalk.green('\nCurrent Context:'));
          console.log(chalk.gray(context));
          console.log();
          continue;
        }
        
        if (input === 'stats') {
          const stats = await kg.getStatistics();
          console.log(chalk.green('\nStatistics:'));
          console.log(chalk.gray(`  Nodes: ${stats.database.total_nodes}`));
          console.log(chalk.gray(`  Relationships: ${stats.database.total_relationships}`));
          console.log(chalk.gray(`  Active Memory: ${stats.memory.active_memory.nodes} nodes`));
          console.log();
          continue;
        }
        
        // Add message to conversation
        await kg.addMessage('user', input);
        
        // Search for relevant context
        const results = await kg.semanticSearch(input, { 
          limit: 3,
          includeContext: true 
        });
        
        if (results.length > 0) {
          console.log(chalk.green('\nRelevant Information:'));
          results.forEach((r: any) => {
            const node = r.node || r;
            console.log(chalk.gray(`  - ${node.name} (${node.type})`));
          });
        }
        
        // Generate response based on context
        const context = await kg.getContext();
        console.log(chalk.green('\nAssistant:'));
        console.log(chalk.gray('Based on the knowledge graph, here\'s what I found...'));
        console.log();
      }
      
      await kg.close();
    });

  return graph;
}