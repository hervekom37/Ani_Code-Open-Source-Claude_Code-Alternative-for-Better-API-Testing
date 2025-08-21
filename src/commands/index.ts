import { CommandDefinition, CommandContext } from './base.js';
import { helpCommand } from './definitions/help.js';
import { loginCommand } from './definitions/login.js';
import { modelCommand } from './definitions/model.js';
import { clearCommand } from './definitions/clear.js';
import { reasoningCommand } from './definitions/reasoning.js';
import { initCommand } from './definitions/init.js';
import { contextCommand } from './definitions/context.js';

// Import CLI commands
import { generateTests } from '../commands/generate-tests.js';
import { optimizeBundle } from '../commands/optimize-bundle.js';
import { checkSecurity } from '../commands/check-security.js';

// Adapter CLI -> slash-command
const generateTestsCmd: CommandDefinition = {
  command: 'generate-tests', // ⬅ standardized kebab-case
  description: generateTests.description,
  handler: async (ctx: CommandContext, args?: string[]) => {
    const result = await generateTests.execute(args?.join(' ') || '');
    ctx.addMessage({ role: 'assistant', content: result });
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
];

export function getAvailableCommands(): CommandDefinition[] {
  return [...availableCommands];
}

export function getCommandNames(): string[] {
  return getAvailableCommands().map(c => c.command);
}

// Function for TUI /slash commands
export function handleSlashCommand(command: string, context: CommandContext) {
  const fullCommand = command.startsWith('/') ? command.slice(1) : command;
  const spaceIndex = fullCommand.indexOf(' ');
  const cmdName = spaceIndex > -1 ? fullCommand.substring(0, spaceIndex).toLowerCase() : fullCommand.toLowerCase();
  const args = spaceIndex > -1 ? fullCommand.substring(spaceIndex + 1).trim().split(/\s+/) : [];

  const commandDef = getAvailableCommands().find(c => c.command.toLowerCase() === cmdName);

  context.addMessage({ role: 'user', content: command });

  if (commandDef) {
    commandDef.handler(context, args);
  } else {
    context.addMessage({ role: 'assistant', content: `❌ Command "${cmdName}" not found.` });
  }
}

export { CommandDefinition, CommandContext } from './base.js';
