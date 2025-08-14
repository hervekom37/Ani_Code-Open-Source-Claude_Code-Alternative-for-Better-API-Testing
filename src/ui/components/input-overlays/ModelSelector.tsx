import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ModelSelectorProps {
  onSubmit: (model: string) => void;
  onCancel: () => void;
  currentModel?: string;
  config: {
    models: string[];
    provider: string;
    defaultModel?: string;
  }
}

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Advanced AI' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', desc: 'Open source' },
  { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1', desc: 'Latest flagship' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', desc: 'Most powerful' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', desc: 'Balanced' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Enhanced' },
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2', desc: 'Multilingual' },
  { id: '__custom__', name: 'Custom Model', desc: 'Enter custom' }
];

const ANTHROPIC_MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', desc: 'Latest' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', desc: 'Fast' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', desc: 'Powerful' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', desc: 'Balanced' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', desc: 'Efficient' },
  { id: '__custom__', name: 'Custom Model', desc: 'Enter custom' }
];

const OPENAI_MODELS = [
  { id: 'gpt-5', name: 'GPT-5', desc: 'Most capable' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', desc: 'Fast' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', desc: 'Balanced' },
  { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat', desc: 'Chat' },
  { id: 'gpt-4.1', name: 'GPT-4.1', desc: 'Enhanced' },
  { id: 'o1', name: 'O1', desc: 'Reasoning' },
  { id: 'o1-pro', name: 'O1 Pro', desc: 'Advanced' },
  { id: 'o3', name: 'O3', desc: 'Latest' },
  { id: 'o3-mini', name: 'O3 Mini', desc: 'Efficient' },
  { id: 'o3-pro', name: 'O3 Pro', desc: 'Premium' },
  { id: 'o4-mini', name: 'O4 Mini', desc: 'Next-gen' },
  { id: '__custom__', name: 'Custom Model', desc: 'Enter custom' }
];



export default function ModelSelector({ onSubmit, onCancel, currentModel, config }: ModelSelectorProps) {
  // Select the appropriate model list based on provider
  const AVAILABLE_MODELS = config.provider === 'OPENAI' ? OPENAI_MODELS : 
                          config.provider === 'ANTHROPIC' ? ANTHROPIC_MODELS : 
                          OPENROUTER_MODELS;
  
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const currentIndex = AVAILABLE_MODELS.findIndex(model => model.id === currentModel);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  useInput((input, key) => {
    if (customModelMode) {
      // Handle custom model input mode
      if (key.return) {
        if (customModelInput.trim()) {
          onSubmit(customModelInput.trim());
        }
        return;
      }

      if (key.escape) {
        setCustomModelMode(false);
        setCustomModelInput('');
        return;
      }

      if (key.ctrl && input === 'c') {
        onCancel();
        return;
      }

      if (key.backspace || key.delete) {
        setCustomModelInput(prev => prev.slice(0, -1));
        return;
      }

      // Add character to input
      if (input && !key.ctrl && !key.meta) {
        setCustomModelInput(prev => prev + input);
        return;
      }
    } else {
      // Handle model selection mode
      if (key.return) {
        const selectedModel = AVAILABLE_MODELS[selectedIndex];
        if (selectedModel.id === '__custom__') {
          setCustomModelMode(true);
          return;
        }
        onSubmit(selectedModel.id);
        return;
      }

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(AVAILABLE_MODELS.length - 1, prev + 1));
        return;
      }

      if (key.ctrl && input === 'c') {
        onCancel();
        return;
      }
    }
  });

  if (customModelMode) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Enter Custom Model</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            {config.provider === 'OpenAI' ? (
              <>Enter the OpenAI model name (e.g., gpt-4, gpt-3.5-turbo, o1-preview)</>
            ) : (
              <>Enter the model name in OpenRouter format (e.g., anthropic/claude-3.5-sonnet, openai/gpt-4o-mini)</>
            )}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Press <Text color="cyan">Enter</Text> to confirm, <Text color="cyan">Escape</Text> to go back
          </Text>
        </Box>

        <Box>
          <Text color="green">Model: </Text>
          <Text>{customModelInput}</Text>
          <Text color="cyan">█</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Select Model</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Choose a model for your conversation. The chat will be cleared when you switch models.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          {config.provider === 'OPENAI' ? (
            <>Using OpenAI models</>
          ) : config.provider === 'ANTHROPIC' ? (
            <>Using Anthropic Claude models</>
          ) : (
            <>Using OpenRouter - 100+ models available</>
          )}
        </Text>
      </Box>

      <Box flexDirection="column">
        {AVAILABLE_MODELS.map((model, index) => (
          <Box key={model.id} flexDirection="row">
            <Box width={30}>
              <Text 
                color={index === selectedIndex ? 'black' : 'white'}
                backgroundColor={index === selectedIndex ? 'cyan' : undefined}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? ">" : " "} {model.name}
                {model.id === currentModel ? ' *' : '  '}
              </Text>
            </Box>
            {index === selectedIndex && (
              <Text color="gray" dimColor> {model.desc}</Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}