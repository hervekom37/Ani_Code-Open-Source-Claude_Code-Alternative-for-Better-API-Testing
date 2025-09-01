#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { render } from 'ink';
import React from 'react';
import { Agent } from './agent.js';
import App from '../ui/App.js';
import { ANI_ASCII_ART } from '../utils/constants.js';


// Import commands
import { optimizeBundle } from '../commands/optimize-bundle.js';
import { checkSecurity } from '../commands/check-security.js';
import { createApidogCommand } from '../commands/apidog.js';
import { getAvailableCommands } from '../commands/index.js';

// REMOVE this duplicate declaration:
// const program = new Command(); // ⛔️ DELETE THIS LINE

const program = new Command(); // ✅ Keep only this declaration

interface CommandDefinition {
  name: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

const commands: CommandDefinition[] = getAvailableCommands().map(cmd => ({
  name: cmd.name,
  description: cmd.description,
  execute: async (input: string) => {
    return new Promise((resolve) => {
      let result = '';
      const mockContext = {
        addMessage: (message: any) => {
          result += message.content + '\n';
        },
        clearHistory: () => {},
        setShowLogin: () => {},
        getConfig: () => ({}),
        updateConfig: () => {}
      };
      
      cmd.handler(mockContext, input.split(' '));
      
      setTimeout(() => {
        resolve(result.trim() || `✅ Command ${cmd.name} executed successfully`);
      }, 100);
    });
  }
}));

async function startChat(
  temperature: number,
  system: string | null,
  debug?: boolean
): Promise<void> {
  console.log(chalk.hex('#FFB6C1')(ANI_ASCII_ART));

  console.log(chalk.hex('#FF69B4')(`
 █████╗ ███╗   ██╗██╗     ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗████╗  ██║██║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████║██╔██╗ ██║██║    ██║     ██║   ██║██║  ██║█████╗  
██╔══██║██║╚██╗██║██║    ██║     ██║   ██║██║  ██║██╔══╝  
██║  ██║██║ ╚████║██║    ╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
`));

  let defaultModel = 'moonshotai/kimi-k2-instruct';
  try {
    const agent = await Agent.create(defaultModel, temperature, system, debug);
    render(React.createElement(App, { agent }));
  } catch (error) {
    console.log(chalk.red(`Error initializing agent: ${error}`));
    process.exit(1);
  }
}

program
  .name('ani')
  .description('Ani Code - AI-powered coding assistant with API documentation support')
  .version('1.0.0')
  .option('-t, --temperature <temperature>', 'Temperature for generation', parseFloat, 1.0)
  .option('-s, --system <message>', 'Custom system message')
  .option('-d, --debug', 'Enable debug logging to debug-agent.log in current directory')
  .option('--command <command>', 'Run a specific command with --input')
  .option('--input <input>', 'Input for the command')
  .addCommand(createApidogCommand())
  .action(async (options) => {
    const { command, input } = options;

    if (command) {
      const cmd = commands.find((c: CommandDefinition) => c.name === command);

      if (!cmd) {
        console.log(chalk.red(`❌ Command "${command}" not found.`));
        console.log(chalk.green('Available commands:'));
        commands.forEach((c: CommandDefinition) => 
          console.log(`- ${c.name}: ${c.description}`)
        );
        console.log(chalk.green('API Documentation Commands:'));
        console.log(`- apidog: Interact with API documentation through Apidog MCP Server`);
        console.log(`  Use: ani apidog --help for detailed usage`);
        process.exit(1);
      }

      try {
        const result = await cmd.execute(input || '');
        console.log(chalk.cyanBright(result));
        process.exit(0);
      } catch (err) {
        console.log(chalk.red(`Error executing command: ${err}`));
        process.exit(1);
      }
    } else {
      await startChat(
        options.temperature,
        options.system || null,
        options.debug
      );
    }
  });

program.parse();