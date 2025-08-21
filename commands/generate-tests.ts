// commands/generate-tests.ts
import { TestGeneratorAgent } from '../agents/test-generator.js';

export const generateTests = {
  name: 'generate-tests',
  description: 'Generates unit, integration, and end-to-end tests for the code',
  execute: async (input: string) => {
    const agent = new TestGeneratorAgent();
    const result = await agent.run(input);
    return `✅ Tests generated:\n${result}`;
  }
};
