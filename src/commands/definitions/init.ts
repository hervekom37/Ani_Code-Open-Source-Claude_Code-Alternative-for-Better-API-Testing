import { CommandDefinition, CommandContext } from '../base.js';
import fs from 'fs';
import path from 'path';

const PROJECT_OUTLINE_TEMPLATE = `# PROJECT_OUTLINE.md

This file provides guidance to Ani Code when working with code in this repository.

## Project Overview

[Brief description of your project, its purpose, and main functionality]

## Architecture Overview

### Directory Structure
\`\`\`
src/
├── components/     # UI components
├── services/       # Business logic and services
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── [other directories...]
\`\`\`

### Key Technologies
- [List main technologies, frameworks, and libraries used]
- [e.g., React, Node.js, TypeScript, etc.]

## Development Guidelines

### Code Style
- [Describe coding conventions and style preferences]
- [e.g., Use functional components, prefer async/await over promises]

### Testing Strategy
- [Describe testing approach and tools]
- [e.g., Jest for unit tests, Cypress for E2E]

### Build and Deploy
- Development: \`npm run dev\`
- Build: \`npm run build\`
- Test: \`npm test\`
- [Add other relevant commands]

## Important Context

### Business Logic
- [Describe core business rules and logic]
- [Explain any complex algorithms or workflows]

### External Dependencies
- [List important external services, APIs, or databases]
- [Include any authentication or configuration requirements]

### Known Issues and Limitations
- [Document any known bugs or limitations]
- [Include workarounds if available]

## AI Assistant Instructions

When working on this codebase:
1. [Specific instruction for AI, e.g., "Always check existing patterns before creating new components"]
2. [Another instruction, e.g., "Prefer modifying existing code over creating new files"]
3. [More instructions as needed]

## Recent Changes
- [Date]: [Brief description of recent major changes]
- [Date]: [Another change]

---
Generated on: ${new Date().toISOString().split('T')[0]}
`;

async function generateProjectOutline(workingDir: string): Promise<string> {
  const outline: string[] = [];
  
  // Read package.json if it exists
  const packageJsonPath = path.join(workingDir, 'package.json');
  let packageInfo = null;
  
  try {
    if (fs.existsSync(packageJsonPath)) {
      packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }
  } catch (error) {
    // Ignore errors reading package.json
  }

  outline.push('# PROJECT_OUTLINE.md\n');
  outline.push('This file provides guidance to Ani Code when working with code in this repository.\n');
  
  // Project Overview
  outline.push('## Project Overview\n');
  if (packageInfo?.name) {
    outline.push(`**Project Name**: ${packageInfo.name}\n`);
  }
  if (packageInfo?.description) {
    outline.push(`**Description**: ${packageInfo.description}\n`);
  }
  if (packageInfo?.version) {
    outline.push(`**Version**: ${packageInfo.version}\n`);
  }
  outline.push('\n[Add more project details here]\n');
  
  // Architecture Overview
  outline.push('## Architecture Overview\n');
  outline.push('### Directory Structure');
  outline.push('```');
  
  // Generate directory tree (top-level only for brevity)
  try {
    const entries = fs.readdirSync(workingDir, { withFileTypes: true });
    const dirs = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
      .map(entry => entry.name)
      .sort();
    
    dirs.forEach(dir => {
      outline.push(`${dir}/`);
    });
  } catch (error) {
    outline.push('[Unable to read directory structure]');
  }
  
  outline.push('```\n');
  
  // Key Technologies
  outline.push('### Key Technologies');
  let detectedFramework = null;
  
  if (packageInfo?.dependencies || packageInfo?.devDependencies) {
    const deps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
    const frameworks = [];
    
    // Detect common frameworks and set the primary one
    if (deps.astro) {
      frameworks.push('Astro');
      detectedFramework = 'astro';
    }
    if (deps.react) frameworks.push('React');
    if (deps.vue) frameworks.push('Vue');
    if (deps.angular) frameworks.push('Angular');
    if (deps.svelte) frameworks.push('Svelte');
    if (deps.next) {
      frameworks.push('Next.js');
      detectedFramework = detectedFramework || 'nextjs';
    }
    if (deps.nuxt) {
      frameworks.push('Nuxt');
      detectedFramework = detectedFramework || 'nuxt';
    }
    if (deps.express) frameworks.push('Express');
    if (deps.fastify) frameworks.push('Fastify');
    if (deps.typescript) frameworks.push('TypeScript');
    if (deps.jest) frameworks.push('Jest');
    if (deps.vitest) frameworks.push('Vitest');
    if (deps.tailwindcss) frameworks.push('Tailwind CSS');
    
    if (frameworks.length > 0) {
      frameworks.forEach(fw => outline.push(`- ${fw}`));
    } else {
      outline.push('- [List your technologies here]');
    }
  } else {
    outline.push('- [List your technologies here]');
  }
  outline.push('');
  
  // Add setup instructions based on detected framework
  outline.push('### Project Setup');
  if (!packageInfo) {
    outline.push('This appears to be a new project. Here are common setup commands:');
    outline.push('');
    outline.push('**For Astro:**');
    outline.push('```bash');
    outline.push('npm create astro@latest');
    outline.push('# or');
    outline.push('npm init astro');
    outline.push('```');
    outline.push('');
    outline.push('**For React:**');
    outline.push('```bash');
    outline.push('npm create vite@latest my-app -- --template react');
    outline.push('# or');
    outline.push('npx create-react-app my-app');
    outline.push('```');
    outline.push('');
    outline.push('**For Vue:**');
    outline.push('```bash');
    outline.push('npm create vue@latest');
    outline.push('```');
    outline.push('');
    outline.push('**For Next.js:**');
    outline.push('```bash');
    outline.push('npx create-next-app@latest');
    outline.push('```');
  } else if (detectedFramework) {
    outline.push(`Detected ${detectedFramework} project.`);
    outline.push('');
    outline.push('**Install dependencies:**');
    outline.push('```bash');
    outline.push('npm install');
    outline.push('```');
  }
  outline.push('');
  
  // Development Guidelines
  outline.push('## Development Guidelines\n');
  outline.push('### Code Style');
  outline.push('- [Describe your coding conventions]');
  outline.push('- [E.g., Use functional components, prefer async/await]');
  outline.push('');
  
  outline.push('### Testing Strategy');
  outline.push('- [Describe your testing approach]');
  outline.push('- [E.g., Unit tests with Jest, E2E with Cypress]');
  outline.push('');
  
  outline.push('### Build and Deploy');
  
  // Extract scripts from package.json
  if (packageInfo?.scripts) {
    const commonScripts = ['dev', 'start', 'build', 'test', 'lint'];
    commonScripts.forEach(script => {
      if (packageInfo.scripts[script]) {
        outline.push(`- ${script.charAt(0).toUpperCase() + script.slice(1)}: \`npm run ${script}\``);
      }
    });
  } else {
    outline.push('- Development: `npm run dev`');
    outline.push('- Build: `npm run build`');
    outline.push('- Test: `npm test`');
  }
  outline.push('');
  
  // Important Context
  outline.push('## Important Context\n');
  outline.push('### Business Logic');
  outline.push('- [Describe core business rules]');
  outline.push('- [Explain complex algorithms or workflows]');
  outline.push('');
  
  outline.push('### External Dependencies');
  outline.push('- [List external services, APIs, databases]');
  outline.push('- [Include authentication requirements]');
  outline.push('');
  
  outline.push('### Known Issues and Limitations');
  outline.push('- [Document known bugs or limitations]');
  outline.push('- [Include workarounds if available]');
  outline.push('');
  
  // AI Assistant Instructions
  outline.push('## AI Assistant Instructions\n');
  outline.push('When working on this codebase:');
  outline.push('');
  outline.push('### Planning Requirements');
  outline.push('1. **Always create a detailed plan first** before implementing any feature');
  outline.push('2. **Break down tasks** into specific, manageable steps');
  outline.push('3. **Identify all dependencies** and ensure they are installed');
  outline.push('4. **List all files** that need to be created or modified');
  outline.push('');
  outline.push('### Implementation Guidelines');
  outline.push('1. **Complete all planned steps** - never leave tasks half-finished');
  outline.push('2. **Follow existing patterns** found in the codebase');
  outline.push('3. **Create complete files** with all necessary content, not just placeholders');
  outline.push('4. **Test your implementation** to ensure it works');
  outline.push('5. **Document usage** with clear instructions');
  outline.push('');
  outline.push('### Framework-Specific Notes');
  if (!packageInfo) {
    outline.push('- **For new projects**: Always run the appropriate create command first');
    outline.push('- **Check installation**: Verify framework is installed before creating files');
  } else if (detectedFramework === 'astro') {
    outline.push('- **Astro projects**: Use .astro components, follow Astro routing conventions');
    outline.push('- **Static assets**: Place in public/ directory');
    outline.push('- **Components**: Create in src/components/');
    outline.push('- **Pages**: Create in src/pages/ for automatic routing');
  } else if (detectedFramework === 'nextjs') {
    outline.push('- **Next.js projects**: Use app/ or pages/ directory based on version');
    outline.push('- **API routes**: Create in app/api/ or pages/api/');
    outline.push('- **Components**: Organize in components/ or app/components/');
  }
  outline.push('');
  outline.push('### Quality Checklist');
  outline.push('- [ ] All planned features implemented completely');
  outline.push('- [ ] No placeholder content or TODOs in production code');
  outline.push('- [ ] All files have proper imports and exports');
  outline.push('- [ ] Code follows project conventions');
  outline.push('- [ ] Implementation is tested and working');
  outline.push('');
  
  // Recent Changes
  outline.push('## Recent Changes');
  outline.push(`- ${new Date().toISOString().split('T')[0]}: Initial project outline generated`);
  outline.push('- [Add more changes as the project evolves]');
  outline.push('\n---');
  outline.push(`Generated by Ani Code on: ${new Date().toISOString().split('T')[0]}`);
  
  return outline.join('\n');
}

export const initCommand: CommandDefinition = {
  command: 'init',
  description: 'Generate PROJECT_OUTLINE.md to guide Ani Code',
  handler: async ({ addMessage }: CommandContext) => {
    const workingDir = process.cwd();
    const outlinePath = path.join(workingDir, 'PROJECT_OUTLINE.md');
    
    // Check if file already exists
    if (fs.existsSync(outlinePath)) {
      addMessage({
        role: 'system',
        content: `⚠️  PROJECT_OUTLINE.md already exists. To regenerate, please delete or rename the existing file first.`,
      });
      return;
    }
    
    try {
      // Generate project outline
      addMessage({
        role: 'system',
        content: '🔍 Analyzing project structure...',
      });
      
      const outline = await generateProjectOutline(workingDir);
      
      // Write the file
      fs.writeFileSync(outlinePath, outline, 'utf-8');
      
      addMessage({
        role: 'system',
        content: `✅ PROJECT_OUTLINE.md has been generated successfully!

This file will help Ani Code understand your project better. Please review and customize it with:
- Specific details about your project's purpose and architecture
- Your team's coding conventions and guidelines  
- Important business logic and constraints
- Any special instructions for AI assistance

The more detailed and accurate this file is, the better Ani Code can assist you!`,
      });
    } catch (error) {
      addMessage({
        role: 'system',
        content: `❌ Failed to generate PROJECT_OUTLINE.md: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
};