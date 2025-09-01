import fetch from 'node-fetch';
import { ConfigManager } from './local-settings.js';

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: number;
}

interface AnthropicModelsResponse {
  data: AnthropicModel[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
}

// Cache models for 1 hour
let cachedModels: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Fallback models in case API call fails
const FALLBACK_ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

export async function fetchAnthropicModels(): Promise<string[]> {
  // Check cache first
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedModels;
  }

  const configManager = new ConfigManager();
  // Check for Anthropic API key - first env var, then config
  const apiKey = process.env.ANTHROPIC_API_KEY || 
    (configManager.getApiProvider() === 'ANTHROPIC' ? configManager.getApiKey() : null);
  
  // If no API key, return fallback models
  if (!apiKey) {
    console.warn('No Anthropic API key found, using fallback models');
    return FALLBACK_ANTHROPIC_MODELS;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch Anthropic models: ${response.status}`);
      return FALLBACK_ANTHROPIC_MODELS;
    }

    const data = await response.json() as AnthropicModelsResponse;
    
    // Extract model IDs and sort by creation date (newest first)
    const models = data.data
      .sort((a, b) => b.created_at - a.created_at)
      .map(model => model.id);
    
    // Update cache
    cachedModels = models;
    cacheTimestamp = Date.now();
    
    return models;
  } catch (error) {
    console.warn('Error fetching Anthropic models:', error);
    return FALLBACK_ANTHROPIC_MODELS;
  }
}

export function checkApiKeys(): {
  hasAnyKey: boolean;
  providers: {
    openrouter: boolean;
    anthropic: boolean;
    openai: boolean;
  };
} {
  const configManager = new ConfigManager();
  const configApiKey = configManager.getApiKey();
  const currentProvider = configManager.getApiProvider();
  
  const providers = {
    openrouter: !!process.env.OPENROUTER_API_KEY || (currentProvider === 'OPENROUTER' && !!configApiKey),
    anthropic: !!process.env.ANTHROPIC_API_KEY || (currentProvider === 'ANTHROPIC' && !!configApiKey),
    openai: !!process.env.OPENAI_API_KEY || (currentProvider === 'OPENAI' && !!configApiKey)
  };
  
  const hasAnyKey = providers.openrouter || providers.anthropic || providers.openai;
  
  return { hasAnyKey, providers };
}