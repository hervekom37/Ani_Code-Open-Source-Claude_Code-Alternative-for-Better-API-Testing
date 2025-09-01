import { CommandDefinition, CommandContext } from '../base.js';
import { getAvailableCommands } from '../index.js';
import { ANI_ASCII_ART, ANI_COMPACT } from '../../utils/constants.js';

export const helpCommand: CommandDefinition = {
  command: 'help',
  description: 'Show help and available commands',
  handler: ({ addMessage }: CommandContext) => {
    const commands = getAvailableCommands();
    const commandList = commands.map(cmd => `/${cmd.name} - ${cmd.description}`).join('\n');
    
    addMessage({
      role: 'system',
      content: `${ANI_ASCII_ART}

Available Commands:
${commandList}

Navigation:
- Use arrow keys to navigate chat history
- Type '/' to see available slash commands
- Use arrow keys to navigate slash command suggestions
- Press Enter to execute the selected command

Keyboard Shortcuts:
- Esc - Clear input box / Interrupt processing
- Ctrl+C - Exit the application

${ANI_COMPACT} YOLO Mode is always ON - All tool executions are auto-approved!

This is Ani Code - a highly customizable, lightweight, and open-source coding CLI powered by AI. 

Supported AI Providers:
- OpenRouter (default) - Access to 100+ models
- Anthropic - Direct Claude access via console.anthropic.com
- OpenAI - Direct GPT access

Use /login to configure your preferred provider. Ask for help with coding tasks, debugging issues, or explaining code.`
    });
  }
};