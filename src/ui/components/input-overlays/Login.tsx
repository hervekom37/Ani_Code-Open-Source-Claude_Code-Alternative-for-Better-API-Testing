import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ANI_COMPACT } from '../../../utils/constants.js';

export interface LoginData {
  provider: 'OPENROUTER' | 'ANTHROPIC' | 'OPENAI';
  apiKey: string;
}

interface LoginProps {
  onSubmit: (data: LoginData) => void;
  onCancel: () => void;
}

export default function Login({ onSubmit, onCancel }: LoginProps) {
  const [provider, setProvider] = useState<LoginData['provider']>('OPENROUTER');
  const [apiKey, setApiKey] = useState('');
  const [currentField, setCurrentField] = useState<'provider' | 'apiKey'>('provider');

  useInput((input, key) => {
    if (key.return) {
      if (currentField === 'provider') {
        setCurrentField('apiKey');
      } else if (currentField === 'apiKey' && apiKey.trim()) {
        onSubmit({ provider, apiKey: apiKey.trim() });
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.tab) {
      if (currentField === 'provider') {
        setCurrentField('apiKey');
      }
      return;
    }

    if (currentField === 'provider') {
      if (key.upArrow || key.downArrow) {
        const providers: LoginData['provider'][] = ['OPENROUTER', 'ANTHROPIC', 'OPENAI'];
        const currentIndex = providers.indexOf(provider);
        const newIndex = key.upArrow 
          ? (currentIndex - 1 + providers.length) % providers.length
          : (currentIndex + 1) % providers.length;
        setProvider(providers[newIndex]);
      }
    } else if (currentField === 'apiKey') {
      if (key.backspace || key.delete) {
        setApiKey(prev => prev.slice(0, -1));
      } else if (input && !key.meta && !key.ctrl) {
        setApiKey(prev => prev + input);
      }
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>{ANI_COMPACT} Ani Code - Select AI Provider</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Choose your AI provider and enter credentials. Use arrow keys to navigate.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={currentField === 'provider' ? 'cyan' : 'white'}>
          Provider: {currentField === 'provider' ? '► ' : '  '}
        </Text>
        <Text color={provider === 'OPENROUTER' ? 'green' : 'gray'}>
          {provider === 'OPENROUTER' ? '◉' : '○'} OpenRouter
        </Text>
        <Text> </Text>
        <Text color={provider === 'ANTHROPIC' ? 'green' : 'gray'}>
          {provider === 'ANTHROPIC' ? '◉' : '○'} Anthropic
        </Text>
        <Text> </Text>
        <Text color={provider === 'OPENAI' ? 'green' : 'gray'}>
          {provider === 'OPENAI' ? '◉' : '○'} OpenAI
        </Text>
      </Box>

      <Box>
        <Text color={currentField === 'apiKey' ? 'cyan' : 'white'}>
          API Key: {currentField === 'apiKey' ? '► ' : '  '}
        </Text>
        <Text>
          {'*'.repeat(Math.min(apiKey.length, 20))}
          {apiKey.length > 20 && '...'}
        </Text>
        {currentField === 'apiKey' && <Text backgroundColor="cyan" color="cyan">▌</Text>}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to continue, Tab to navigate, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}