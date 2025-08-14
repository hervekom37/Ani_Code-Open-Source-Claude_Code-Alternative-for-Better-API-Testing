import { CommandDefinition, CommandContext } from '../base.js';

export const loginCommand: CommandDefinition = {
  command: 'login',
  description: 'Configure your AI provider (OpenRouter, Anthropic, OpenAI)',
  handler: ({ setShowLogin }: CommandContext) => {
    if (setShowLogin) {
      setShowLogin(true);
    }
  },
};
