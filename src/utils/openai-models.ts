// OpenAI model definitions
export const OPENAI_MODELS = [
  // GPT-5 Series
  { id: 'gpt-5', name: 'GPT-5', description: 'Most capable GPT-5 model' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Smallest and fastest GPT-5 model' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Balanced performance GPT-5 model' },
  { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat Latest', description: 'Latest GPT-5 chat-optimized model' },
  
  // GPT-4 Series
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Enhanced GPT-4 model' },
  
  // O-Series (Reasoning Models)
  { id: 'o1', name: 'O1', description: 'Base reasoning model' },
  { id: 'o1-pro', name: 'O1 Pro', description: 'Advanced reasoning model' },
  { id: 'o3', name: 'O3', description: 'Latest reasoning model' },
  { id: 'o3-mini', name: 'O3 Mini', description: 'Efficient reasoning model' },
  { id: 'o3-pro', name: 'O3 Pro', description: 'Most advanced reasoning model' },
  { id: 'o4-mini', name: 'O4 Mini', description: 'Next-gen efficient reasoning model' },
];

// Model mapping from OpenRouter format to OpenAI format
export const OPENROUTER_TO_OPENAI_MAP: Record<string, string> = {
  'anthropic/claude-3.5-sonnet': 'gpt-5-chat-latest',
  'anthropic/claude-3-opus': 'gpt-5',
  'anthropic/claude-3-sonnet': 'gpt-5-chat-latest',
  'anthropic/claude-3-haiku': 'gpt-5-mini',
  'openai/gpt-4-turbo': 'gpt-4.1',
  'openai/gpt-4': 'gpt-4.1',
  'openai/gpt-3.5-turbo': 'gpt-5-nano',
  'openai/o1-preview': 'o1',
  'openai/o1-mini': 'o3-mini',
};