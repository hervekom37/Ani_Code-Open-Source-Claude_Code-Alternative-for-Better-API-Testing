import React from 'react';
import { Box, Text } from 'ink';
import { getCommandNames, getAvailableCommands } from '../../../commands/index.js';

interface SlashCommandSuggestionsProps {
  input: string;
  selectedIndex: number;
  onSelect: (command: string) => void;
}

export default function SlashCommandSuggestions({ 
  input, 
  selectedIndex 
}: SlashCommandSuggestionsProps) {
  const searchTerm = input.slice(1).toLowerCase();
  const allCommands = getAvailableCommands();
  const filteredCommands = allCommands.filter(cmd => 
    cmd.command.toLowerCase().includes(searchTerm)
  );

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginLeft={2}>
      {filteredCommands.map((cmd, index) => (
        <Box key={cmd.command}>
          <Text 
            color={index === selectedIndex ? "black" : "white"}
            backgroundColor={index === selectedIndex ? "cyan" : undefined}
          >
            /{cmd.command} - {cmd.description}
          </Text>
        </Box>
      ))}
    </Box>
  );
}