import { CommandDefinition, CommandContext } from '../base.js';
import { ConfigManager } from '../../utils/local-settings.js';

const OPENROUTER_MODELS = [
  'google/gemini-2.5-pro',
  'openai/gpt-oss-120b',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-3.5-sonnet',
  'moonshotai/kimi-k2'
];

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

const OPENAI_MODELS = [
  'gpt-5',
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-5-chat-latest',
  'gpt-4.1',
  'o1',
  'o1-pro',
  'o3',
  'o3-mini',
  'o3-pro',
  'o4-mini'
];

export const modelCommand: CommandDefinition = {
  command: 'model',
  description: 'Select your AI model',
  handler: ({ setShowModelSelector }: CommandContext) => {
    if (setShowModelSelector) {
      const configManager = new ConfigManager();
      const provider = configManager.getApiProvider();
      
      // Ani doesn't support model selection
      if (provider === 'ANI') {
        return;
      }
      
      const models = provider === 'OPENAI' ? OPENAI_MODELS : 
                     provider === 'ANTHROPIC' ? ANTHROPIC_MODELS :
                     OPENROUTER_MODELS;
      
      setShowModelSelector({
        models,
        provider: provider
      });
    }
  }
};