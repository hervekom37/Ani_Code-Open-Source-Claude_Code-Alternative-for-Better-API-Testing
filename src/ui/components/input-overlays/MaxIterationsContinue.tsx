import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface MaxIterationsContinueProps {
  maxIterations: number;
  onContinue: () => void;
  onStop: () => void;
}

export default function MaxIterationsContinue({ 
  maxIterations, 
  onContinue, 
  onStop 
}: MaxIterationsContinueProps) {
  const [selectedOption, setSelectedOption] = useState(0);

  // Reset selection when component mounts
  useEffect(() => {
    setSelectedOption(0);
  }, [maxIterations]);

  // Handle input
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedOption(prev => Math.min(1, prev + 1));
    } else if (key.return) {
      if (selectedOption === 0) {
        onContinue();
      } else {
        onStop();
      }
    } else if (key.escape) {
      onStop();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="yellow" bold>Max Iterations Reached</Text>
      </Box>
      
      {/* Message */}
      <Box marginBottom={1}>
        <Text color="gray">
          The model has been iterating for a while now ({maxIterations} iterations). 
          It may be stuck in a loop or working on a complex task.
        </Text>
      </Box>
      
      {/* Options */}
      <Box flexDirection="column">
        <Text color="yellow">Continue processing?</Text>
        
        <Box flexDirection="column">
          <Box>
            <Text color={selectedOption === 0 ? "black" : "green"}
                  backgroundColor={selectedOption === 0 ? "rgb(124, 214, 114)" : undefined}>
              {selectedOption === 0 ? <Text bold>{">"}</Text> : "  "} Yes, continue
            </Text>
          </Box>
          
          <Box>
            <Text color={selectedOption === 1 ? "black" : "red"}
                  backgroundColor={selectedOption === 1 ? "rgb(214, 114, 114)" : undefined}>
              {selectedOption === 1 ? <Text bold>{">"}</Text> : "  "} No, stop here (esc)
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}