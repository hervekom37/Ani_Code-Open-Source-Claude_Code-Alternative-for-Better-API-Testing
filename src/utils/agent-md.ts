// src/utils/agent-md.ts

import fs from 'fs';
import path from 'path';

export interface AgentMdConfig {
  projectDescription?: string;
  buildCommands?: Record<string, string>;
  codeStyle?: string[];
  testingGuidelines?: string[];
  securityConsiderations?: string[];
  architecture?: string;
  customSections?: Record<string, string>;
  references?: string[]; // Files referenced with @mentions
}

export class AgentMdManager {
  private static instance: AgentMdManager | null = null;
  private agentMdPath: string;
  private config: AgentMdConfig | null = null;
  private lastModified: number = 0;

  private constructor() {
    this.agentMdPath = path.join(process.cwd(), 'AGENT.md');
  }

  static getInstance(): AgentMdManager {
    if (!AgentMdManager.instance) {
      AgentMdManager.instance = new AgentMdManager();
    }
    return AgentMdManager.instance;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.promises.access(this.agentMdPath);
      return true;
    } catch {
      return false;
    }
  }

  async hasChanged(): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(this.agentMdPath);
      return stats.mtimeMs > this.lastModified;
    } catch {
      return false;
    }
  }

  async load(): Promise<AgentMdConfig | null> {
    try {
      const stats = await fs.promises.stat(this.agentMdPath);
      this.lastModified = stats.mtimeMs;
      
      const content = await fs.promises.readFile(this.agentMdPath, 'utf-8');
      this.config = this.parseAgentMd(content);
      
      debugLog('Loaded AGENT.md configuration');
      return this.config;
    } catch (error) {
      debugLog('Failed to load AGENT.md:', error);
      return null;
    }
  }

  private parseAgentMd(content: string): AgentMdConfig {
    const config: AgentMdConfig = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let sectionContent: string[] = [];

    const processSection = () => {
      if (currentSection && sectionContent.length > 0) {
        const content = sectionContent.join('\n').trim();
        
        switch (currentSection.toLowerCase()) {
          case 'project':
          case 'project overview':
          case 'description':
            config.projectDescription = content;
            break;
            
          case 'build & commands':
          case 'commands':
          case 'build':
            config.buildCommands = this.parseCommands(content);
            break;
            
          case 'code style':
          case 'conventions':
          case 'style':
            config.codeStyle = this.parseListSection(content);
            break;
            
          case 'testing':
          case 'test':
          case 'tests':
            config.testingGuidelines = this.parseListSection(content);
            break;
            
          case 'security':
          case 'security considerations':
            config.securityConsiderations = this.parseListSection(content);
            break;
            
          case 'architecture':
          case 'system architecture':
            config.architecture = content;
            break;
            
          default:
            if (!config.customSections) {
              config.customSections = {};
            }
            config.customSections[currentSection] = content;
        }
      }
      sectionContent = [];
    };

    for (const line of lines) {
      // Check for @mentions to other files
      const mentions = line.match(/@(\S+\.md)/g);
      if (mentions) {
        if (!config.references) {
          config.references = [];
        }
        config.references.push(...mentions.map(m => m.substring(1)));
      }

      // Check for headers
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headerMatch) {
        processSection();
        currentSection = headerMatch[1].trim();
      } else {
        sectionContent.push(line);
      }
    }
    
    processSection(); // Process the last section
    
    return config;
  }

  private parseCommands(content: string): Record<string, string> {
    const commands: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match patterns like "- Build: npm run build" or "Build: npm run build"
      const match = line.match(/^-?\s*(.+?):\s*(.+)$/);
      if (match) {
        commands[match[1].trim().toLowerCase()] = match[2].trim();
      }
    }
    
    return commands;
  }

  private parseListSection(content: string): string[] {
    return content
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  getConfig(): AgentMdConfig | null {
    return this.config;
  }

  async loadReferencedFiles(): Promise<Map<string, string>> {
    const references = new Map<string, string>();
    
    if (!this.config?.references) {
      return references;
    }

    for (const ref of this.config.references) {
      try {
        const refPath = path.join(process.cwd(), ref);
        const content = await fs.promises.readFile(refPath, 'utf-8');
        references.set(ref, content);
        debugLog(`Loaded referenced file: ${ref}`);
      } catch (error) {
        debugLog(`Failed to load referenced file ${ref}:`, error);
      }
    }

    return references;
  }

  async generateContextFromAgentMd(): Promise<string> {
    if (!this.config) {
      await this.load();
    }

    if (!this.config) {
      return '';
    }

    let context = '# AGENT.md Configuration\n\n';
    
    if (this.config.projectDescription) {
      context += `## Project Overview\n${this.config.projectDescription}\n\n`;
    }

    if (this.config.architecture) {
      context += `## Architecture\n${this.config.architecture}\n\n`;
    }

    if (this.config.buildCommands && Object.keys(this.config.buildCommands).length > 0) {
      context += '## Build & Commands\n';
      for (const [name, command] of Object.entries(this.config.buildCommands)) {
        context += `- ${name}: \`${command}\`\n`;
      }
      context += '\n';
    }

    if (this.config.codeStyle && this.config.codeStyle.length > 0) {
      context += '## Code Style\n';
      this.config.codeStyle.forEach(rule => {
        context += `- ${rule}\n`;
      });
      context += '\n';
    }

    if (this.config.testingGuidelines && this.config.testingGuidelines.length > 0) {
      context += '## Testing Guidelines\n';
      this.config.testingGuidelines.forEach(guideline => {
        context += `- ${guideline}\n`;
      });
      context += '\n';
    }

    if (this.config.securityConsiderations && this.config.securityConsiderations.length > 0) {
      context += '## Security Considerations\n';
      this.config.securityConsiderations.forEach(consideration => {
        context += `- ${consideration}\n`;
      });
      context += '\n';
    }

    if (this.config.customSections) {
      for (const [section, content] of Object.entries(this.config.customSections)) {
        context += `## ${section}\n${content}\n\n`;
      }
    }

    // Load and append referenced files
    const references = await this.loadReferencedFiles();
    if (references.size > 0) {
      context += '## Referenced Files\n\n';
      for (const [filename, content] of references) {
        context += `### ${filename}\n${content}\n\n`;
      }
    }

    return context;
  }

  // Check for legacy config files and suggest migration
  async checkLegacyFiles(): Promise<{ found: string[]; commands: string[] }> {
    const legacyFiles = [
      { name: '.clinerules', cmd: 'mv .clinerules AGENT.md && ln -s AGENT.md .clinerules' },
      { name: 'CLAUDE.md', cmd: 'mv CLAUDE.md AGENT.md && ln -s AGENT.md CLAUDE.md' },
      { name: '.cursorrules', cmd: 'mv .cursorrules AGENT.md && ln -s AGENT.md .cursorrules' },
      { name: 'GEMINI.md', cmd: 'mv GEMINI.md AGENT.md && ln -s AGENT.md GEMINI.md' },
      { name: 'AGENTS.md', cmd: 'mv AGENTS.md AGENT.md && ln -s AGENT.md AGENTS.md' },
      { name: '.replit.md', cmd: 'mv .replit.md AGENT.md && ln -s AGENT.md .replit.md' },
      { name: '.windsurfrules', cmd: 'mv .windsurfrules AGENT.md && ln -s AGENT.md .windsurfrules' }
    ];

    const found: string[] = [];
    const commands: string[] = [];

    for (const legacy of legacyFiles) {
      try {
        await fs.promises.access(path.join(process.cwd(), legacy.name));
        found.push(legacy.name);
        commands.push(legacy.cmd);
      } catch {
        // File doesn't exist, skip
      }
    }

    return { found, commands };
  }

  // Create a default AGENT.md file
  async createDefault(projectName: string = 'MyProject'): Promise<void> {
    const defaultContent = `# ${projectName} Project

${projectName} is a [brief description of your project].

## Build & Commands

- Typecheck and lint: \`npm run check\`
- Fix linting/formatting: \`npm run check:fix\`
- Run tests: \`npm test\`
- Start development: \`npm run dev\`
- Build for production: \`npm run build\`

## Code Style

- TypeScript with strict mode enabled
- Functional programming patterns preferred
- Use descriptive variable and function names
- Follow existing patterns in the codebase
- NEVER use \`@ts-expect-error\` or \`@ts-ignore\`

## Testing

- Write tests for all new features
- Use descriptive test names
- Mock external dependencies appropriately
- Ensure tests are deterministic

## Architecture

[Describe your project's architecture, key components, and data flow]

## Security

- Never commit secrets or API keys
- Validate all user inputs
- Use environment variables for sensitive data
- Follow principle of least privilege

## Git Workflow

- Run tests before committing
- Use descriptive commit messages
- Create feature branches for new work
- Keep pull requests focused and small

---

*This file follows the AGENT.md standard for AI coding assistants.*
*Learn more at https://agent.md*
`;

    await fs.promises.writeFile(this.agentMdPath, defaultContent, 'utf-8');
    debugLog('Created default AGENT.md file');
  }
}

// Export utility functions for easy access
export async function loadAgentMd(): Promise<AgentMdConfig | null> {
  const manager = AgentMdManager.getInstance();
  return manager.load();
}

export async function hasAgentMd(): Promise<boolean> {
  const manager = AgentMdManager.getInstance();
  return manager.exists();
}

export async function getAgentMdContext(): Promise<string> {
  const manager = AgentMdManager.getInstance();
  return manager.generateContextFromAgentMd();
}

// Add debug helper
function debugLog(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    console.error(`[AgentMd] ${message}`, ...args);
  }
}