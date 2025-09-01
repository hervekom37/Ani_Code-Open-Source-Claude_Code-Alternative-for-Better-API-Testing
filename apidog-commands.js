#!/usr/bin/env node

/**
 * Apidog Commands Helper
 * 
 * This file allows easy access to all Apidog commands
 * regardless of the usage context (CLI, Chat, etc.)
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const CLI_PATH = path.join(__dirname, 'dist', 'core', 'cli.js');

class ApidogCommands {
  
  // Main CLI commands
  static get commands() {
    return {
      // CLI commands with sub-commands
      setup: (token, projectId, url) => `node "${CLI_PATH}" apidog setup -t "${token}" -p "${projectId}" ${url ? `-u "${url}"` : ''}`,
      list: () => `node "${CLI_PATH}" apidog list`,
      docs: (endpoint) => `node "${CLI_PATH}" apidog docs -e "${endpoint}"`,
      search: (query) => `node "${CLI_PATH}" apidog search -q "${query}"`,
      generate: (endpoint, language = 'typescript') => `node "${CLI_PATH}" apidog generate -e "${endpoint}" -l "${language}"`,
      
      // Direct CLI commands
      project: (projectId) => `node "${CLI_PATH}" --command apidog-project --input "${projectId}"`,
      loadDocs: (endpoint) => `node "${CLI_PATH}" --command apidog-load-docs --input "${endpoint}"`,
      listEndpoints: () => `node "${CLI_PATH}" --command apidog-list-endpoints`,
    };
  }

  // Utility method to execute a command
  static execute(command) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        cwd: __dirname,
        stdio: 'pipe'
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        stderr: error.stderr?.toString() || ''
      };
    }
  }

  // Simplified commands
  static setupApidog(token, projectId, url = null) {
    return this.execute(this.commands.setup(token, projectId, url));
  }

  static listEndpoints() {
    return this.execute(this.commands.list());
  }

  static getDocumentation(endpoint) {
    return this.execute(this.commands.docs(endpoint));
  }

  static searchEndpoints(query) {
    return this.execute(this.commands.search(query));
  }

  static generateClient(endpoint, language = 'typescript') {
    return this.execute(this.commands.generate(endpoint, language));
  }

  static connectProject(projectId) {
    return this.execute(this.commands.project(projectId));
  }

  static quickList() {
    return this.execute(this.commands.listEndpoints());
  }

  static quickDocs(endpoint) {
    return this.execute(this.commands.loadDocs(endpoint));
  }

  // Display help
  static help() {
    return `
🚀 **Available Apidog Commands:**

**CLI commands with sub-commands (via ani apidog):**
- ani apidog setup -t <token> -p <projectId> [-u <url>]
- ani apidog list
- ani apidog docs -e <endpoint>
- ani apidog search -q <query>
- ani apidog generate -e <endpoint> [-l <language>]

**Direct CLI commands:**
- node apidog-commands.js setup <token> <projectId> [url]
- node apidog-commands.js list
- node apidog-commands.js docs <endpoint>
- node apidog-commands.js search <query>
- node apidog-commands.js generate <endpoint> [language]
- node apidog-commands.js project <projectId>
- node apidog-commands.js quick-list
- node apidog-commands.js quick-docs <endpoint>

**Slash commands (chat interface):**
- /apidog-list
- /apidog-docs <endpoint>
- /apidog-search <query>
- /apidog-generate <endpoint> [language]

**Supported languages:** typescript, javascript, python
    `;
  }
}

// If executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'setup':
      if (args.length < 3) {
        console.log('Usage: node apidog-commands.js setup <token> <projectId> [url]');
        process.exit(1);
      }
      console.log(ApidogCommands.setupApidog(args[1], args[2], args[3]));
      break;
      
    case 'list':
      console.log(ApidogCommands.listEndpoints());
      break;
      
    case 'docs':
      if (args.length < 2) {
        console.log('Usage: node apidog-commands.js docs <endpoint>');
        process.exit(1);
      }
      console.log(ApidogCommands.getDocumentation(args[1]));
      break;
      
    case 'search':
      if (args.length < 2) {
        console.log('Usage: node apidog-commands.js search <query>');
        process.exit(1);
      }
      console.log(ApidogCommands.searchEndpoints(args[1]));
      break;
      
    case 'generate':
      if (args.length < 2) {
        console.log('Usage: node apidog-commands.js generate <endpoint> [language]');
        process.exit(1);
      }
      console.log(ApidogCommands.generateClient(args[1], args[2]));
      break;
      
    case 'project':
      if (args.length < 2) {
        console.log('Usage: node apidog-commands.js project <projectId>');
        process.exit(1);
      }
      console.log(ApidogCommands.connectProject(args[1]));
      break;
      
    case 'quick-list':
      console.log(ApidogCommands.quickList());
      break;
      
    case 'quick-docs':
      if (args.length < 2) {
        console.log('Usage: node apidog-commands.js quick-docs <endpoint>');
        process.exit(1);
      }
      console.log(ApidogCommands.quickDocs(args[1]));
      break;
      
    case 'help':
    default:
      console.log(ApidogCommands.help());
      break;
  }
}

module.exports = ApidogCommands;