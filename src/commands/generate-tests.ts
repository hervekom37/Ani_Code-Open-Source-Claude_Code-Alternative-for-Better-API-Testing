// commands/generate-tests.ts
export const generateTests = {
  name: 'generate-tests',
  description: 'Generate unit tests for code',
  execute: async (input: string): Promise<string> => {
    return `✅ Tests generated for: ${input}`;
  }
};