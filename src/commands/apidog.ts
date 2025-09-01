import { Command } from 'commander';
import chalk from 'chalk';
import { ApidogMcpTool } from '../tools/apidog-mcp.js';

// Export individual command classes for slash commands
export class apidogList {
  static description = 'List all API endpoints from Apidog MCP Server';
  
  static async execute(args: string): Promise<string> {
    try {
      const tool = new ApidogMcpTool();
      const endpoints = await tool.getApiEndpoints();
      
      if (endpoints.length === 0) {
        return 'No API endpoints found in Apidog project.';
      }
      
      let result = '📋 **Available API Endpoints:**\n\n';
      endpoints.forEach((endpoint, index) => {
        result += `${index + 1}. **${endpoint.method.toUpperCase()}** ${endpoint.path}\n`;
        result += `   ${endpoint.description}\n\n`;
      });
      
      return result;
    } catch (error) {
      return `❌ Failed to fetch endpoints: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export class apidogDocs {
  static description = 'Get API documentation for an endpoint';
  
  static async execute(args: string): Promise<string> {
    const endpoint = args.trim();
    if (!endpoint) {
      return '❌ Please provide an endpoint path. Usage: /apidog-docs <endpoint>';
    }
    
    try {
      const tool = new ApidogMcpTool();
      const docs = await tool.getApiDocumentation(endpoint);
      
      return `📚 **Documentation for ${endpoint}:**\n\n${docs}`;
    } catch (error) {
      return `❌ Failed to fetch documentation: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export class apidogSearch {
  static description = 'Search API endpoints by keyword or tag';
  
  static async execute(args: string): Promise<string> {
    const query = args.trim();
    if (!query) {
      return '❌ Please provide a search query. Usage: /apidog-search <query>';
    }
    
    try {
      const tool = new ApidogMcpTool();
      const results = await tool.searchEndpoints(query);
      
      if (results.length === 0) {
        return `🔍 No endpoints found matching "${query}"`;
      }

      let result = `🔍 **Search results for "${query}":**\n\n`;
      results.forEach((endpoint, index) => {
        result += `${index + 1}. **${endpoint.method.toUpperCase()}** ${endpoint.path}\n`;
        result += `   ${endpoint.description}\n\n`;
      });
      
      return result;
    } catch (error) {
      return `❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export class apidogGenerate {
  static description = 'Generate API client code for endpoints';
  
  static async execute(args: string): Promise<string> {
    const [endpoint, language = 'typescript'] = args.trim().split(' ');
    
    if (!endpoint) {
      return '❌ Please provide an endpoint path. Usage: /apidog-generate <endpoint> [language]';
    }
    
    const validLanguages: Array<'typescript' | 'javascript' | 'python'> = ['typescript', 'javascript', 'python'];
    const targetLanguage = validLanguages.includes(language as any) ? language as 'typescript' | 'javascript' | 'python' : 'typescript';
    
    try {
      const tool = new ApidogMcpTool();
      const clientCode = await tool.generateApiClient(endpoint, targetLanguage);
      
      return `🚀 **Generated ${targetLanguage} client for ${endpoint}:**\n\n\`\`\`${targetLanguage}\n${clientCode}\n\`\`\``;
    } catch (error) {
      return `❌ Failed to generate client: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export function createApidogCommand() {
  const apidog = new Command('apidog');

  apidog
    .description('Interact with API documentation through Apidog MCP Server')
    .addCommand(
      new Command('setup')
        .description('Configure Apidog MCP Server')
        .requiredOption('-t, --token <token>', 'Apidog API access token')
        .requiredOption('-p, --project <project>', 'Apidog project ID')
        .option('-u, --url <url>', 'Apidog API base URL (optional)')
        .action(async (options) => {
          try {
            const tool = new ApidogMcpTool();
            await tool.setup({
              accessToken: options.token,
              projectId: options.project,
              apiBaseUrl: options.url
            });
            console.log(chalk.green('Apidog MCP Server configured successfully!'));
          } catch (error) {
            console.error(chalk.red('Configuration failed:'), error);
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('list')
        .description('List all API endpoints')
        .action(async () => {
          try {
            const tool = new ApidogMcpTool();
            const endpoints = await tool.getApiEndpoints();
            
            console.log(chalk.blue('\n📋 Available API Endpoints:'));
            endpoints.forEach((endpoint, index) => {
              console.log(`${index + 1}. ${chalk.green(endpoint.method)} ${chalk.yellow(endpoint.path)}`);
              console.log(`   ${chalk.gray(endpoint.description)}`);
              console.log('');
            });
          } catch (error) {
            console.error(chalk.red('Failed to fetch endpoints:'), error);
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('docs')
        .description('Get API documentation for an endpoint')
        .requiredOption('-e, --endpoint <endpoint>', 'API endpoint path')
        .action(async (options) => {
          try {
            const tool = new ApidogMcpTool();
            const docs = await tool.getApiDocumentation(options.endpoint);
            
            console.log(chalk.blue(`\n📚 Documentation for ${options.endpoint}:`));
            console.log(docs);
          } catch (error) {
            console.error(chalk.red('Failed to fetch documentation:'), error);
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('search')
        .description('Search API endpoints')
        .requiredOption('-q, --query <query>', 'Search query')
        .action(async (options) => {
          try {
            const tool = new ApidogMcpTool();
            const results = await tool.searchEndpoints(options.query);
            
            if (results.length === 0) {
              console.log(chalk.yellow('No endpoints found matching your query.'));
              return;
            }

            console.log(chalk.blue(`\n🔍 Search results for "${options.query}":`));
            results.forEach((endpoint, index) => {
              console.log(`${index + 1}. ${chalk.green(endpoint.method)} ${chalk.yellow(endpoint.path)}`);
              console.log(`   ${chalk.gray(endpoint.description)}`);
              console.log('');
            });
          } catch (error) {
            console.error(chalk.red('Search failed:'), error);
            process.exit(1);
          }
        })
    )
    .addCommand(
      new Command('generate')
        .description('Generate API client code')
        .requiredOption('-e, --endpoint <endpoint>', 'API endpoint path')
        .option('-l, --language <language>', 'Target language (typescript/javascript/python)', 'typescript')
        .action(async (options) => {
          try {
            const tool = new ApidogMcpTool();
            const validLanguages: Array<'typescript' | 'javascript' | 'python'> = ['typescript', 'javascript', 'python'];
            const language = validLanguages.includes(options.language as any) ? options.language as 'typescript' | 'javascript' | 'python' : 'typescript';
            const clientCode = await tool.generateApiClient(options.endpoint, language);
            
            console.log(chalk.blue(`\n🚀 Generated ${language} client for ${options.endpoint}:`));
            console.log(chalk.green(clientCode));
          } catch (error) {
            console.error(chalk.red('Failed to generate client:'), error);
            process.exit(1);
          }
        })
    );

  return apidog;
}