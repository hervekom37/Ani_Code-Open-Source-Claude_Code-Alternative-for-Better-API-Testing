// commands/optimize-bundle.ts
import { backendDeveloper } from '../agents/backend-developer';
import { reactOptimizer } from '../agents/react-optimizer';

export const optimizeBundle = {
  name: 'optimize-bundle',
  description: 'Optimizes the project bundle for better performance',
  execute: async (input: string) => {
    // Call React optimizer
    const reactReport = await reactOptimizer.execute(input);

    // Call Backend optimizer
    const backendReport = await backendDeveloper.execute(`Server-side optimization for ${input}`);

    return `
    ⚡ Bundle Optimization Report for ${input}:

    --- React ---
    ${reactReport}

    --- Backend ---
    ${backendReport}
    `;
  }
};
