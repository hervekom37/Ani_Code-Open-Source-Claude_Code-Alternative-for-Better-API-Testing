// // commands/index.ts
// import { generateTests } from './generate-tests.js';
// import { optimizeBundle } from './optimize-bundle.js';
// import { checkSecurity } from './check-security.js';

// export interface CommandDefinition {
//   name: string;
//   description: string;
//   execute: (input: string) => Promise<string>;
// }

// // Export NAMED - very important!
// export const commands: CommandDefinition[] = [
//   generateTests,
//   optimizeBundle,
//   checkSecurity
// ];

// export function getAvailableCommands(): CommandDefinition[] {
//   return commands;
// }

// // Default export also to facilitate import
// export default {
//   commands,
//   CommandDefinition,
//   getAvailableCommands
// };