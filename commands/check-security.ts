// commands/check-security.ts
import { SecurityAuditorAgent } from '../agents/security-auditor.js';

export const checkSecurity = {
  name: 'check-security',
  description: 'Analyzes code and dependencies for security vulnerabilities',
  execute: async (input: string) => {
    const agent = new SecurityAuditorAgent();
    const result = await agent.run(input);
    return `🔒 Security report:\n${result}`;
  }
};
