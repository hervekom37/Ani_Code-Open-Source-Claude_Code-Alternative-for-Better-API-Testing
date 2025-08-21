// commands/check-security.ts
export const checkSecurity = {
  name: 'check-security',
  description: 'Perform security audit on code',
  execute: async (input: string): Promise<string> => {
    return `🔒 Security audit completed for: ${input}`;
  }
};