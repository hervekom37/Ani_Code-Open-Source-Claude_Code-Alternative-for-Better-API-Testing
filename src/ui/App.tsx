import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Agent } from '../core/agent.js';
import Chat from './components/core/Chat.js';

interface AppProps {
  agent: Agent;
}

export default function App({ agent }: AppProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <Box flexDirection="column" height="100%">
      {isReady ? (
        <Chat agent={agent} />
      ) : (
        <Box justifyContent="center" alignItems="center" height="100%">
          <Text>Initializing agent...</Text>
        </Box>
      )}
    </Box>
  );
}