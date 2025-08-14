import { useState, useCallback, useRef } from 'react';

interface TokenMetricsState {
  completionTokens: number;
  startTime: Date | null;
  endTime: Date | null;
  pausedTime: number; // Total time spent paused (in milliseconds)
  isPaused: boolean;
  isActive: boolean; // True when agent is processing (includes paused time)
}

interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export function useTokenMetrics() {
  const [metrics, setMetrics] = useState<TokenMetricsState>({
    completionTokens: 0,
    startTime: null,
    endTime: null,
    pausedTime: 0,
    isPaused: false,
    isActive: false,
  });

  const completionTokensRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<Date | null>(null);

  // Start tracking metrics for a new agent request
  const startRequest = useCallback(() => {
    completionTokensRef.current = 0;
    pauseStartTimeRef.current = null;
    setMetrics({
      completionTokens: 0,
      startTime: new Date(),
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      isActive: true,
    });
  }, []);

  // Add API usage tokens to the current request (cumulative)
  const addApiTokens = useCallback((usage: ApiUsage) => {
    completionTokensRef.current += usage.completion_tokens;
    setMetrics(prev => ({
      ...prev,
      completionTokens: completionTokensRef.current,
    }));
  }, []);

  // Pause metrics (e.g., waiting for user approval)
  const pauseMetrics = useCallback(() => {
    if (pauseStartTimeRef.current) return; // Already paused
    
    pauseStartTimeRef.current = new Date();
    setMetrics(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  // Resume metrics after pause
  const resumeMetrics = useCallback(() => {
    if (!pauseStartTimeRef.current) return; // Not paused
    
    const pauseDuration = Date.now() - pauseStartTimeRef.current.getTime();
    pauseStartTimeRef.current = null;
    
    setMetrics(prev => ({
      ...prev,
      pausedTime: prev.pausedTime + pauseDuration,
      isPaused: false,
    }));
  }, []);

  // Complete the current request
  const completeRequest = useCallback(() => {
    // If we're paused when completing, account for that pause time
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current.getTime();
      pauseStartTimeRef.current = null;
      
      setMetrics(prev => ({
        ...prev,
        endTime: new Date(),
        pausedTime: prev.pausedTime + pauseDuration,
        isPaused: false,
        isActive: false,
      }));
    } else {
      setMetrics(prev => ({
        ...prev,
        endTime: new Date(),
        isPaused: false,
        isActive: false,
      }));
    }
  }, []);

  // Reset all metrics
  const resetMetrics = useCallback(() => {
    completionTokensRef.current = 0;
    pauseStartTimeRef.current = null;
    setMetrics({
      completionTokens: 0,
      startTime: null,
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      isActive: false,
    });
  }, []); 

  return {
    ...metrics,
    startRequest,
    addApiTokens,
    pauseMetrics,
    resumeMetrics,
    completeRequest,
    resetMetrics,
  };
}