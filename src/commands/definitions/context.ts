import { CommandDefinition, CommandContext } from '../base.js';
import { DEFAULT_CONTEXT_WINDOW } from '../../utils/constants.js';

export const contextCommand: CommandDefinition = {
  command: 'context',
  description: 'Manage context window size',
  handler: ({ addMessage, getConfig, updateConfig }: CommandContext, args?: string[]) => {
    const configManager = getConfig();
    const currentSize = configManager.getContextWindow() || DEFAULT_CONTEXT_WINDOW;
    
    if (!args || args.length === 0) {
      addMessage({
        role: 'system',
        content: `Current context window: ${currentSize.toLocaleString()} tokens
Default: ${DEFAULT_CONTEXT_WINDOW.toLocaleString()} tokens

Usage:
/context <size> - Set context window size (e.g., /context 100000)
/context default - Reset to default (${DEFAULT_CONTEXT_WINDOW.toLocaleString()} tokens)

Note: Larger context windows may increase API costs and response times.
Maximum supported varies by model and provider.`
      });
      return;
    }
    
    const arg = args[0].toLowerCase();
    
    if (arg === 'default') {
      updateConfig({ contextWindow: DEFAULT_CONTEXT_WINDOW });
      addMessage({
        role: 'system',
        content: `Context window reset to default: ${DEFAULT_CONTEXT_WINDOW.toLocaleString()} tokens`
      });
      return;
    }
    
    const newSize = parseInt(arg);
    if (isNaN(newSize) || newSize < 1000) {
      addMessage({
        role: 'system',
        content: 'Invalid context window size. Please provide a number >= 1000'
      });
      return;
    }
    
    updateConfig({ contextWindow: newSize });
    addMessage({
      role: 'system',
      content: `Context window updated to: ${newSize.toLocaleString()} tokens`
    });
  }
};