import { CommandDefinition, CommandContext } from '../base.js';

export const reasoningCommand: CommandDefinition = {
  command: 'reasoning',
  description: 'Toggle display of reasoning content in messages',
  handler: ({ addMessage, toggleReasoning, showReasoning }: CommandContext) => {
    if (toggleReasoning) {
      toggleReasoning();
      const newState = !showReasoning;
      addMessage({
        role: 'system',
        content: `Reasoning display is now ${newState ? 'enabled' : 'disabled'}.`,
      });
    } else {
      addMessage({
        role: 'system',
        content: 'Reasoning toggle functionality is not available.',
      });
    }
  }
};