import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Agent } from '../../../core/agent.js';
import { useAgent } from '../../hooks/useAgent.js';
import { useTokenMetrics } from '../../hooks/useTokenMetrics.js';
import MessageHistory from './MessageHistory.js';
import MessageInput from './MessageInput.js';
import TokenMetrics from '../display/TokenMetrics.js';
import PendingToolApproval from '../input-overlays/PendingToolApproval.js';
import Login from '../input-overlays/Login.js';
import ModelSelector from '../input-overlays/ModelSelector.js';
import MaxIterationsContinue from '../input-overlays/MaxIterationsContinue.js';
import { handleSlashCommand } from '../../../commands/index.js';
import { ConfigManager } from '../../../utils/local-settings.js';

interface ChatProps {
  agent: Agent;
}

interface ModelSelectorConfig {
  models: string[];
  provider: string;
  defaultModel?: string;
}

export default function Chat({ agent }: ChatProps) {
  // Token metrics hooks...
  const {
    completionTokens,
    startTime,
    endTime,
    pausedTime,
    isPaused,
    isActive,
    startRequest,
    addApiTokens,
    pauseMetrics,
    resumeMetrics,
    completeRequest,
    resetMetrics,
  } = useTokenMetrics();

  const agentHook = useAgent(
    agent,
    startRequest,
    addApiTokens,
    pauseMetrics,
    resumeMetrics,
    completeRequest
  );

  const {
    messages,
    userMessageHistory,
    isProcessing,
    currentToolExecution,
    pendingApproval,
    pendingMaxIterations,
    sessionAutoApprove,
    showReasoning,
    sendMessage,
    approveToolExecution,
    respondToMaxIterations,
    addMessage,
    setApiKey,
    clearHistory,
    toggleAutoApprove,
    toggleReasoning,
    interruptRequest,
  } = agentHook;

  const { exit } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // IMPORTANT: showModelSelector is now either config object or null
  const [showModelSelector, setShowModelSelector] = useState<ModelSelectorConfig | null>(null);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    if (key.shift && key.tab) {
      toggleAutoApprove();
    }
    if (key.escape) {
      if (pendingApproval) {
        handleApproval(false);
      } else if (isProcessing && !currentToolExecution) {
        interruptRequest();
      } else if (showInput && inputValue.trim()) {
        setInputValue('');
      }
    }
  });

  useEffect(() => {
    setShowInput(!isProcessing && !pendingApproval && !showLogin && !showModelSelector);
  }, [isProcessing, pendingApproval, showLogin, showModelSelector]);

  const handleSendMessage = async (message: string) => {
    if (message.trim() && !isProcessing) {
      setInputValue('');
      if (message.startsWith('/')) {
        const configManager = new ConfigManager();
        handleSlashCommand(message, {
          addMessage,
          clearHistory,
          setShowLogin,
          setShowModelSelector, // Important: now must be called with config object or null
          toggleReasoning,
          showReasoning,
          getConfig: () => configManager,
          updateConfig: (updates) => {
            if (updates.contextWindow !== undefined) {
              configManager.setContextWindow(updates.contextWindow);
            }
          },
        });
        return;
      }
      await sendMessage(message);
    }
  };

  const handleApproval = (approved: boolean, autoApproveSession?: boolean) => {
    approveToolExecution(approved, autoApproveSession);
  };

  const handleLogin = (loginData: any) => {
    setShowLogin(false);
    agent.saveApiCredentials(loginData);
    addMessage({
      role: 'system',
      content: `Successfully configured ${loginData.provider} API. You can now start chatting with the assistant.`,
    });
  };

  const handleLoginCancel = () => {
    setShowLogin(false);
    addMessage({
      role: 'system',
      content: 'Login canceled.',
    });
  };

  // Pour ouvrir le sélecteur, tu dois appeler setShowModelSelector avec la config nécessaire
  // Exemple d’ouverture (tu peux adapter selon ton contexte) :
  // setShowModelSelector({ models: ['openrouter/auto', 'openai/gpt-4'], provider: 'openrouter', defaultModel: 'openrouter/auto' });

  const handleModelSelect = (model: string) => {
    setShowModelSelector(null); // Fermer le sélecteur après choix
    clearHistory();
    agent.setModel(model);
    addMessage({
      role: 'system',
      content: `Switched to model: ${model}. Chat history has been cleared.`,
    });
  };

  const handleModelCancel = () => {
    setShowModelSelector(null);
    addMessage({
      role: 'system',
      content: 'Model selection canceled.',
    });
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <MessageHistory messages={messages} showReasoning={showReasoning} />
      </Box>

      <TokenMetrics
        isActive={isActive}
        isPaused={isPaused}
        startTime={startTime}
        endTime={endTime}
        pausedTime={pausedTime}
        completionTokens={completionTokens}
        currentActivity={currentToolExecution?.name}
      />

      <Box borderStyle="round" borderColor="white" paddingX={1}>
        {pendingApproval ? (
          <PendingToolApproval
            toolName={pendingApproval.toolName}
            toolArgs={pendingApproval.toolArgs}
            onApprove={() => handleApproval(true, false)}
            onReject={() => handleApproval(false, false)}
            onApproveWithAutoSession={() => handleApproval(true, true)}
          />
        ) : pendingMaxIterations ? (
          <MaxIterationsContinue
            maxIterations={pendingMaxIterations.maxIterations}
            onContinue={() => respondToMaxIterations(true)}
            onStop={() => respondToMaxIterations(false)}
          />
        ) : showLogin ? (
          <Login
            onSubmit={handleLogin}
            onCancel={handleLoginCancel}
          />
        ) : showModelSelector ? (
          <ModelSelector
            onSubmit={handleModelSelect}
            onCancel={handleModelCancel}
            currentModel={agent.getCurrentModel?.() || undefined}
            config={showModelSelector}  // Tu peux passer cette config à ton composant
          />
        ) : showInput ? (
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            placeholder="... (Esc to clear, Ctrl+C to exit)"
            userMessageHistory={userMessageHistory}
          />
        ) : (
          <Box>
            <Text color="gray" dimColor>Processing...</Text>
          </Box>
        )}
      </Box>

      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color="cyan" bold>
            🚀 YOLO MODE
          </Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>
            {agent.getCurrentModel?.() || ''}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
