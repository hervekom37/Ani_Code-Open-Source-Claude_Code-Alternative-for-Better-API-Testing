// src/utils/local-settings.ts

import fs from 'fs';
import path from 'path';
import os from 'os';

// Global configuration file in user's home directory
const CONFIG_FILE = path.join(os.homedir(), '.ani-code-config.json');

export class ConfigManager {
  private config: Record<string, any> = {};

  constructor() {
    this.loadConfig();
  }

  // Load configuration from file
  private loadConfig(): void {
    if (fs.existsSync(CONFIG_FILE)) {
      this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  }

  // Save configuration to file
  private saveConfig(): void {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  // Get API key
  public getApiKey(): string | null {
    return this.config.apiKey || null;
  }

  // Set API key
  public setApiKey(key: string): void {
    this.config.apiKey = key;
    this.saveConfig();
  }

  // Clear API key
  public clearApiKey(): void {
    delete this.config.apiKey;
    this.saveConfig();
  }

  // Get API provider
  public getApiProvider(): string {
    return this.config.apiProvider || 'OPENROUTER';
  }

  // Set API provider
  public setApiProvider(provider: string): void {
    this.config.apiProvider = provider;
    this.saveConfig();
  }


  // Get default model
  public getDefaultModel(): string | null {
    return this.config.defaultModel || null;
  }

  // Set default model
  public setDefaultModel(model: string): void {
    this.config.defaultModel = model;
    this.saveConfig();
  }

  // Get context window size
  public getContextWindow(): number | null {
    return this.config.contextWindow || null;
  }

  // Set context window size
  public setContextWindow(size: number): void {
    this.config.contextWindow = size;
    this.saveConfig();
  }
}

// --- Exported utility functions ---

export function getApiKey(): string | null {
  const manager = new ConfigManager();
  return manager.getApiKey();
}

export function setApiKey(key: string): void {
  const manager = new ConfigManager();
  manager.setApiKey(key);
}

export function clearApiKey(): void {
  const manager = new ConfigManager();
  manager.clearApiKey();
}

export function getDefaultModel(): string | null {
  const manager = new ConfigManager();
  return manager.getDefaultModel();
}

export function setDefaultModel(model: string): void {
  const manager = new ConfigManager();
  manager.setDefaultModel(model);
}
