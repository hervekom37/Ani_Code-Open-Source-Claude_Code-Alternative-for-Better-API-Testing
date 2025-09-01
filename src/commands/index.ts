import { CommandDefinition, CommandContext } from './base.js';
import { helpCommand } from './definitions/help.js';
import { loginCommand } from './definitions/login.js';
import { modelCommand } from './definitions/model.js';
import { clearCommand } from './definitions/clear.js';
import { reasoningCommand } from './definitions/reasoning.js';
import { initCommand } from './definitions/init.js';
import { contextCommand } from './definitions/context.js';

// Import CLI commands
// generate-tests is now defined in this file
import { optimizeBundle } from '../commands/optimize-bundle.js';
import { checkSecurity } from '../commands/check-security.js';
import { apidogList } from '../commands/apidog.js';
import { apidogDocs } from '../commands/apidog.js';
import { apidogSearch } from '../commands/apidog.js';
import { apidogGenerate } from '../commands/apidog.js';
import { createGraphCommands } from '../commands/graph.js';

// Import QA commands
import { AddPlaywrightCommand } from './add-playwright.js';
import { BugScanCommand } from './bug-scan.js';
import { RunTestsCommand } from './run-tests.js';
import { MigrateTsCommand } from './migrate-ts.js';
import { BgAgentCommand } from './bg-agent.js';

// Adapter CLI -> slash-command
const generateTestsCmd: CommandDefinition = {
  command: 'generate-tests', // ⬅ standardized kebab-case
  description: 'Generate comprehensive test suite including unit, integration, and E2E tests',
  handler: async (ctx: CommandContext, args?: string[]) => {
    ctx.addMessage({ role: 'assistant', content: 'Generating comprehensive test suite...' });
    // Implementation would go here
  },
};

const optimizeBundleCmd: CommandDefinition = {
  command: 'optimize-bundle',
  description: optimizeBundle.description,
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await optimizeBundle.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const checkSecurityCmd: CommandDefinition = {
  command: 'check-security',
  description: checkSecurity.description,
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await checkSecurity.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogListCmd: CommandDefinition = {
  command: 'apidog-list',
  description: 'List all API endpoints from Apidog MCP Server',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await apidogList.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogDocsCmd: CommandDefinition = {
  command: 'apidog-docs',
  description: 'Get detailed documentation for a specific API endpoint',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await apidogDocs.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogSearchCmd: CommandDefinition = {
  command: 'apidog-search',
  description: 'Search API endpoints by keyword or tag',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await apidogSearch.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogGenerateCmd: CommandDefinition = {
  command: 'apidog-generate',
  description: 'Generate API client code for endpoints',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await apidogGenerate.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogConnectCmd: CommandDefinition = {
  command: 'apidog-connect',
  description: 'Connect to an Apidog project',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const projectId = args?.[0] || '';
    const result = await apidogList.execute(`setup ${projectId}`);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogLoadCmd: CommandDefinition = {
  command: 'apidog-load',
  description: 'Load API documentation from URL',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const url = args?.[0] || '';
    const result = await apidogList.execute(`load ${url}`);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogFindCmd: CommandDefinition = {
  command: 'apidog-find',
  description: 'Find API endpoint by path',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const path = args?.[0] || '';
    const result = await apidogSearch.execute(path);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogGenerateClientCmd: CommandDefinition = {
  command: 'apidog-generate-client',
  description: 'Generate API client in specified language',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const apiName = args?.[0] || '';
    const language = args?.[1] || 'typescript';
    const result = await apidogGenerate.execute(`${apiName} ${language}`);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogTestCmd: CommandDefinition = {
  command: 'apidog-test',
  description: 'Test API endpoint',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const endpoint = args?.[0] || '';
    const result = await apidogDocs.execute(`test ${endpoint}`);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const apidogProjectCmd: CommandDefinition = {
  command: 'apidog-project',
  description: 'Connect to and manage Apidog project',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const projectId = args?.[0] || '';
    if (!projectId) {
      ctx.addMessage({ role: 'assistant', content: 'Usage: apidog-project <project-id>' });
      return;
    }
    const result = await apidogList.execute(`setup ${projectId}`);
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

// Knowledge Graph commands
const graphIndexCmd: CommandDefinition = {
  command: 'graph-index',
  description: 'Index project into knowledge graph',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const graphCmd = createGraphCommands();
    ctx.addMessage({ role: 'assistant', content: 'Indexing project into knowledge graph...' });
  },
};

const graphSearchCmd: CommandDefinition = {
  command: 'graph-search',
  description: 'Search the knowledge graph',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const query = args?.join(' ') || '';
    ctx.addMessage({ role: 'assistant', content: `Searching graph for: ${query}` });
  },
};

const graphPatternsCmd: CommandDefinition = {
  command: 'graph-patterns',
  description: 'Detect code patterns in the project',
  handler: async (ctx: CommandContext, args?: string[]) => {
    ctx.addMessage({ role: 'assistant', content: 'Detecting code patterns...' });
  },
};

const graphVisualizeCmd: CommandDefinition = {
  command: 'graph-visualize',
  description: 'Start graph visualization server',
  handler: async (ctx: CommandContext, args?: string[]) => {
    ctx.addMessage({ role: 'assistant', content: 'Starting visualization server on port 3000...' });
  },
};

const graphStatsCmd: CommandDefinition = {
  command: 'graph-stats',
  description: 'Show knowledge graph statistics',
  handler: async (ctx: CommandContext, args?: string[]) => {
    ctx.addMessage({ role: 'assistant', content: 'Gathering graph statistics...' });
  },
};

// QA Command definitions
const addPlaywrightCmd: CommandDefinition = {
  command: 'add-playwright',
  description: AddPlaywrightCommand.description || 'Add Playwright testing framework to the project',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await AddPlaywrightCommand.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

const bugScanCmd: CommandDefinition = {
  command: 'bug-scan',
  description: 'Scan for bugs, security issues, and missing tests',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const cmd = new BugScanCommand();
    cmd.handler(ctx, args || []);
  },
};

const runTestsCmd: CommandDefinition = {
  command: 'run-tests',
  description: 'Run unit tests, E2E tests, and capture results',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const cmd = new RunTestsCommand();
    cmd.handler(ctx, args || []);
  },
};

const migrateTsCmd: CommandDefinition = {
  command: 'migrate-ts',
  description: 'Convert JavaScript project to TypeScript',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const cmd = new MigrateTsCommand();
    cmd.handler(ctx, args || []);
  },
};

const bgAgentCmd: CommandDefinition = {
  command: 'bg-agent',
  description: BgAgentCommand.description || 'Start the background agent for continuous monitoring',
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await BgAgentCommand.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
  },
};

// Final list of available commands
const availableCommands: CommandDefinition[] = [
  helpCommand,
  loginCommand,
  modelCommand,
  clearCommand,
  reasoningCommand,
  initCommand,
  contextCommand,

  // New CLI/TUI commands
  generateTestsCmd,
  optimizeBundleCmd,
  checkSecurityCmd,
  apidogListCmd,
  apidogDocsCmd,
  apidogSearchCmd,
  apidogGenerateCmd,
  apidogConnectCmd,
  apidogLoadCmd,
  apidogFindCmd,
  apidogGenerateClientCmd,
  apidogTestCmd,
  apidogProjectCmd,
  
  // Knowledge Graph commands
  graphIndexCmd,
  graphSearchCmd,
  graphPatternsCmd,
  graphVisualizeCmd,
  graphStatsCmd,

  // QA commands
  addPlaywrightCmd,
  bugScanCmd,
  runTestsCmd,
  migrateTsCmd,
  bgAgentCmd,
];

interface CliCommand {
  name: string;
  description: string;
  handler: (context: any, args: string[]) => void;
}

export function getAvailableCommands(): CliCommand[] {
  return availableCommands.map(cmd => ({
    name: cmd.command,
    description: cmd.description,
    handler: (context: any, args: string[]) => {
      cmd.handler(context, args);
    }
  }));
}

export function getCommandNames(): string[] {
  return getAvailableCommands().map(c => c.name);
}

// Function for TUI /slash commands
export function handleSlashCommand(command: string, context: CommandContext) {
  const fullCommand = command.startsWith('/') ? command.slice(1) : command;
  const spaceIndex = fullCommand.indexOf(' ');
  const cmdName = spaceIndex > -1 ? fullCommand.substring(0, spaceIndex).toLowerCase() : fullCommand.toLowerCase();
  const args = spaceIndex > -1 ? fullCommand.substring(spaceIndex + 1).trim().split(/\s+/) : [];

  const commandDef = getAvailableCommands().find(c => c.name.toLowerCase() === cmdName);

  context.addMessage({ role: 'user', content: command });

  if (commandDef) {
    commandDef.handler(context, args);
  } else {
    context.addMessage({ role: 'assistant', content: `❌ Command "${cmdName}" not found.` });
  }
}

export { CommandDefinition, CommandContext } from './base.js';
