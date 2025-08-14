import { ConfigManager } from '../utils/local-settings.js';

export interface CommandContext {
  addMessage: (message: any) => void;
  clearHistory: () => void;
  setShowLogin: (show: boolean) => void;
  setShowModelSelector?: (config: { 
    models: string[];
    provider: string;
    defaultModel?: string;
  }) => void;
  toggleReasoning?: () => void;
  showReasoning?: boolean;
  getConfig: () => ConfigManager;
  updateConfig: (updates: { contextWindow?: number }) => void;
}

export interface CommandDefinition {
  command: string;
  description: string;
  handler: (context: CommandContext, args?: string[]) => void;
}

export abstract class BaseCommand implements CommandDefinition {
  abstract command: string;
  abstract description: string;
  abstract handler(context: CommandContext): void;
}