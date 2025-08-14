import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import DiffPreview from '../display/DiffPreview.js';
import { formatToolParams } from '../../../tools/tools.js';
import { DANGEROUS_TOOLS } from '../../../tools/tool-schemas.js';

interface PendingToolApprovalProps {
  toolName: string;
  toolArgs: Record<string, any>;
  onApprove: () => void;
  onReject: () => void;
  onApproveWithAutoSession?: () => void;
}

export default function PendingToolApproval({ 
  toolName, 
  toolArgs, 
  onApprove, 
  onReject,
  onApproveWithAutoSession 
}: PendingToolApprovalProps) {
  const [selectedApprovalOption, setSelectedApprovalOption] = useState(0);

  // Reset selection when component mounts
  useEffect(() => {
    setSelectedApprovalOption(0);
  }, [toolName, toolArgs]);

  // Handle approval input
  useInput((input, key) => {
    const isDangerous = DANGEROUS_TOOLS.includes(toolName);
    const maxOptions = isDangerous ? 1 : 2; // Dangerous tools only have Yes/No, others have Yes/Auto/No
    
    if (key.upArrow) {
      setSelectedApprovalOption(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedApprovalOption(prev => Math.min(maxOptions, prev + 1));
    } else if (key.return) {
      if (selectedApprovalOption === 0) {
        onApprove();
      } else if (selectedApprovalOption === 1 && !isDangerous) {
        // Middle option: "Yes, and don't ask again this session"
        onApproveWithAutoSession?.();
      } else {
        // Last option: "No"
        onReject();
      }
    }
  });

  const getFilename = () => {
    const filePath = toolArgs?.file_path || toolArgs?.source_path;
    if (!filePath) return null;
    return filePath.split('/').pop() || filePath;
  };

  const filename = getFilename();

  return (
    <Box flexDirection="column">
      {/* Tool name header */}
      <Box>
        <Text color="yellow">
          🟡 <Text bold>{toolName}</Text>
        </Text>
      </Box>
      
      {/* Show key parameters */}
      {(() => {
        const keyParams = formatToolParams(toolName, toolArgs, { includePrefix: false, separator: ': ' });
        return keyParams ? (
          <Box>
            <Text color="gray" dimColor>
              {keyParams}
            </Text>
          </Box>
        ) : null;
      })()} 
      
      {/* Show diff for file operations in yellow bordered box */}
      {(toolName === 'create_file' || toolName === 'edit_file') && (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <DiffPreview 
            toolName={toolName}
            toolArgs={toolArgs}
          />
        </Box>
      )}
      
      {/* Approval options */}
      <Box flexDirection="column">
        <Text color="yellow">
          {filename 
            ? <>Approve this edit to <Text bold>{filename}</Text>?</>
            : 'Approve this tool call?'
          }
        </Text>
        
        <Box flexDirection="column">
          <Box>
            <Text color={selectedApprovalOption === 0 ? "black" : "green"}
                  backgroundColor={selectedApprovalOption === 0 ? "rgb(124, 214, 114)" : undefined}>
              {selectedApprovalOption === 0 ? <Text bold>{">"}</Text> : "  "} Yes
            </Text>
          </Box>
          
          {/* Show auto-approval option only for non-dangerous tools */}
          {!DANGEROUS_TOOLS.includes(toolName) && (
            <Box>
              <Text color={selectedApprovalOption === 1 ? "black" : "blue"}
                    backgroundColor={selectedApprovalOption === 1 ? "rgb(114, 159, 214)" : undefined}>
                {selectedApprovalOption === 1 ? <Text bold>{">"}</Text> : "  "} Yes, and don't ask again this session
              </Text>
            </Box>
          )}
          
          <Box>
            <Text color={selectedApprovalOption === (DANGEROUS_TOOLS.includes(toolName) ? 1 : 2) ? "black" : "red"}
                  backgroundColor={selectedApprovalOption === (DANGEROUS_TOOLS.includes(toolName) ? 1 : 2) ? "rgb(214, 114, 114)" : undefined}>
              {selectedApprovalOption === (DANGEROUS_TOOLS.includes(toolName) ? 1 : 2) ? <Text bold>{">"}</Text> : "  "} No, tell Ani what to do differently (esc)
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}