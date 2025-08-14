import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface TokenMetricsProps {
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
  pausedTime: number;
  completionTokens: number;
  currentActivity?: string; // Current tool or activity being executed
}

export default function TokenMetrics({ 
  isActive,
  isPaused,
  startTime,
  endTime,
  pausedTime,
  completionTokens,
  currentActivity
}: TokenMetricsProps) {
  const [displayTime, setDisplayTime] = useState('0.0s');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [animatedTokens, setAnimatedTokens] = useState(0);
  
  // Generate contextual loading messages based on current activity
  const generateLoadingMessage = (): string => {
    // If we have a specific tool activity, use contextual messages
    if (currentActivity) {
      return getContextualMessage(currentActivity);
    }
    
    // Otherwise use general thinking messages
    const generalActions = [
      'Thinking', 'Analyzing', 'Processing', 'Computing', 'Reasoning', 'Understanding',
      'Exploring', 'Investigating', 'Examining', 'Studying', 'Reviewing', 'Planning'
    ];
    
    const action = generalActions[Math.floor(Math.random() * generalActions.length)];
    return `Ani Code is ${action}`;
  };

  // Get contextual message based on tool being executed
  const getContextualMessage = (activity: string): string => {
    const toolMessages: Record<string, string[]> = {
      'read_file': [
        'Reading Files', 'Scanning Code', 'Analyzing Content', 'Examining Files', 'Parsing Documents'
      ],
      'create_file': [
        'Creating Files', 'Writing Code', 'Generating Content', 'Building Files', 'Crafting Solutions'
      ],
      'edit_file': [
        'Editing Code', 'Modifying Files', 'Updating Content', 'Refactoring Code', 'Improving Files'
      ],
      'delete_file': [
        'Cleaning Up', 'Removing Files', 'Deleting Content', 'Organizing Files', 'Tidying Code'
      ],
      'list_files': [
        'Exploring Directory', 'Scanning Files', 'Browsing Code', 'Mapping Structure', 'Discovering Files'
      ],
      'search_files': [
        'Searching Code', 'Finding Patterns', 'Hunting Bugs', 'Locating Files', 'Scanning Codebase'
      ],
      'execute_command': [
        'Running Commands', 'Executing Scripts', 'Processing Tasks', 'Running Code', 'Executing Operations'
      ]
    };

    const messages = toolMessages[activity] || [
      'Processing Request', 'Working Magic', 'Computing Solutions', 'Analyzing Data', 'Executing Tasks'
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    return `Ani Code is ${message}`;
  };

  // Generate new messages dynamically
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  
  // Regenerate messages when becoming active or activity changes
  useEffect(() => {
    if (isActive && !isPaused) {
      const newMessages = Array.from({ length: 5 }, () => generateLoadingMessage());
      setLoadingMessages(newMessages);
      setLoadingMessageIndex(0);
      // Reset animated tokens when starting a new request
      if (startTime && completionTokens === 0) {
        setAnimatedTokens(0);
      }
    }
  }, [isActive, isPaused, currentActivity, startTime, completionTokens]);

  // Animate token count for smooth streaming effect
  useEffect(() => {
    // Always increment up, never go down during active requests
    if (isActive && completionTokens > animatedTokens) {
      const diff = completionTokens - animatedTokens;
      const increment = Math.max(1, Math.ceil(diff / 10));
      
      const interval = setInterval(() => {
        setAnimatedTokens(prev => {
          if (prev >= completionTokens) {
            clearInterval(interval);
            return completionTokens;
          }
          return Math.min(completionTokens, prev + increment);
        });
      }, 50); // Update every 50ms for smooth animation
      
      return () => clearInterval(interval);
    } else if (!isActive) {
      // When request completes, snap to final value
      setAnimatedTokens(completionTokens);
    }
  }, [completionTokens, animatedTokens, isActive]);

  // Update the display time every 100ms when active and not paused
  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    const updateDisplay = () => {
      if (!startTime) {
        setDisplayTime('0.0s');
        return;
      }

      // Calculate elapsed time minus paused time
      const currentElapsed = Date.now() - startTime.getTime() - pausedTime;
      setDisplayTime(`${(currentElapsed / 1000).toFixed(1)}s`);
    };

    // Update immediately, then set interval
    updateDisplay();
    
    const interval = setInterval(updateDisplay, 100);
    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime, pausedTime]);



  // Cycle through loading messages every 2 seconds when active and not paused
  useEffect(() => {
    if (!isActive || isPaused || loadingMessages.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % loadingMessages.length;
        
        // When we complete a cycle, generate new messages for variety
        if (nextIndex === 0 && prevIndex === loadingMessages.length - 1) {
          setTimeout(() => {
            const newMessages = Array.from({ length: 5 }, () => generateLoadingMessage());
            setLoadingMessages(newMessages);
          }, 100);
        }
        
        return nextIndex;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, loadingMessages.length]);

  // Update display when request completes
  useEffect(() => {
    if (!isActive && endTime && startTime) {
      const finalElapsed = endTime.getTime() - startTime.getTime() - pausedTime;
      setDisplayTime(`${(finalElapsed / 1000).toFixed(1)}s`);
    }
  }, [isActive, endTime, startTime, pausedTime]);

  const getElapsedTime = (): string => {
    return displayTime;
  };

  const getStatusText = (): string => {
    if (isPaused) return '⏸ Waiting for approval...';
    if (isActive) return `⚡ ${loadingMessages[loadingMessageIndex]}...`;
    return '';
  };

  // Don't show component if inactive and no tokens counted
  if (!isActive && completionTokens === 0) {
    return null;
  }

  return (
    <Box paddingX={1}>
      <Box gap={2}>
        <Text color="cyan">{getElapsedTime()}</Text>
        <Text color="green">{animatedTokens} tokens</Text>
        {(isActive || isPaused) && (
            <Text color={isPaused ? 'yellow' : 'blue'}>
              {getStatusText()}
            </Text>
        )}
      </Box>
    </Box>
  );
}