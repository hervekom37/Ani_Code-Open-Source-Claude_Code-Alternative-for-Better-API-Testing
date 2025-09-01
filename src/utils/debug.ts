// src/utils/debug.ts

export function debugLog(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true' || process.env.ANI_DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${message}`, ...args);
  }
}

export function debugEnabled(): boolean {
  return process.env.DEBUG === 'true' || process.env.ANI_DEBUG === 'true';
}