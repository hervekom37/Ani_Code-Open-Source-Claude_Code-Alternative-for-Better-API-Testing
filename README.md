<h2 align="center"> <br> <h1>Ani Code</h1> <br> <br> Ani Code: The ONLY coding assistant with automatic persistent context. Your AI remembers everything about YOUR codebase. <br> <br> 🧠 Automatic Context • 🚀 Lightweight • 🛠️ Customizable • 📖 Open Source <br> </h2> <p align="center"> <img src="https://img.shields.io/badge/License-MIT-green.svg"> <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-blue.svg"> <img src="https://img.shields.io/badge/Node.js-%3E%3D16-green.svg"> </p> <p align="center"> <a href="#overview">Overview</a> • <a href="#installation">Installation</a> • <a href="#usage">Usage</a> • <a href="#development">Development</a> </p> <br>

# Overview

## 🧠 Automatic Context Engineering - The Game Changer

**Ani Code is the ONLY coding assistant that automatically maintains persistent project context.** Every project you work on gets its own `/context` folder that tracks:

- **Project Overview & Architecture** - Understands your codebase structure
- **Code Conventions & Patterns** - Learns and follows your coding style
- **Agent Memory** - Remembers discoveries, gotchas, and solutions
- **Development Guidelines** - Maintains project-specific knowledge

This context is:
- ✅ **Created automatically** - No manual setup required
- ✅ **Persistently stored** - Knowledge survives between sessions
- ✅ **Continuously updated** - Learns as it works on your project
- ✅ **Immediately loaded** - Every session starts with full project awareness

**Result: An AI that truly understands YOUR codebase, not just generic coding patterns.**

## Why Ani Code?

Coding CLIs are everywhere. Ani Code is different. It is a blueprint, a building block, for developers looking to leverage, customize, and extend a CLI to be entirely their own. Leading open-source CLIs are all fantastic, inspiring for the open-source community, and hugely rich in features. However, that's just it: they are *gigantic*. Feature-rich: yes, but local development with such a large and interwoven codebase is unfriendly and overwhelming. **This is a project for developers looking to dive in.**

Ani Code is your chance to make a CLI truly your own. Equipped with all of the features, tools, commands, and UI/UX that's familiar to your current favorite CLI, we make it simple to add new features you've always wanted. By massively cutting down on bloat and code mass without compromising on quality, you can jump into modifying this CLI however you see fit. By leveraging powerful AI models, you can iterate even faster (`/model` to see available models). Simply activate the CLI by typing `ani` in your terminal. Use Ani Code in any directory just like you would with any other coding CLI. Use it in this directory to have it build and customize itself!

## Key Features

### 🧠 Automatic Context Engineering (Unique to Ani Code!)
- **Automatic `/context` folder** creation and maintenance
- **Persistent project memory** across all sessions
- **Continuous learning** about your codebase
- **Smart context loading** for instant project awareness

### 🛠️ Full-Featured Coding Assistant
- **Multi-provider support**: OpenRouter (100+ models), Anthropic (Claude), OpenAI
- **Complete file operations**: Create, edit, delete, search
- **Command execution** - Always auto-approved in YOLO mode
- **Project initialization** for various frameworks
- **Intelligent code understanding** and generation

### 🎨 Customization-First Design
- Clean, modular codebase designed for hacking
- Easy to add new slash commands (e.g. /mcp, /deadcode, /complexity)
- Simple tool additions (web search, merge conflicts, knowledge graphs)
- Customizable UI/UX and behaviors
- Your imagination is the limit!

### 🚀 Developer Experience
- **🚀 YOLO mode always ON** - No approval prompts, pure speed
- **Project outline generation** with `/init`
- **Model switching** on the fly
- **Clean, intuitive terminal UI**
- **Direct Anthropic API support** via console.anthropic.com


## Installation

### Global Installation (Recommended)

Install Ani Code globally to use the `ani` command from anywhere on your system:

#### macOS/Linux - Quick Install
```bash
# Clone and setup automatically
git clone https://github.com/your-repo/ani-cli.git
cd ani-cli
chmod +x install.sh
./install.sh
```

This script will:
- Check Node.js version (requires >=16)
- Install dependencies
- Build the project
- Install globally with `npm install -g .`
- Set up the global `ani` command for "Ani Code is Coding"
- Configure global settings in `~/.ani-cli-config.json`

#### macOS/Linux - Manual Global Install
```bash
git clone https://github.com/your-repo/ani-cli.git
cd ani-cli
npm install
npm run build
npm install -g .    # Installs globally - enables `ani` command anywhere
```

#### Windows - PowerShell Install
```powershell
git clone https://github.com/your-repo/ani-cli.git
cd ani-cli
.\install.ps1
```

### Verify Global Installation
```bash
# Test from any directory
cd ~
ani --version

# Start Ani from any project directory
cd /path/to/your/project
ani
```

### Development Mode
For contributors and developers:
```bash
# Clone the repository
git clone https://github.com/your-repo/ani-cli.git
cd ani-cli

# Install dependencies
npm install

# Run in development mode (auto-rebuild on changes)
npm run dev  

# For global development installation
npm run build && npm install -g . --force
```

## 🧠 How Automatic Context Works

When you run `ani` in any project directory, it automatically:

1. **Creates a `/context` folder** (if it doesn't exist) containing:
   - `PROJECT.md` - Project overview and mission
   - `ARCHITECTURE.md` - System design and component structure
   - `DEVELOPMENT.md` - Setup instructions and workflows
   - `CONVENTIONS.md` - Coding standards and patterns
   - `AGENT_MEMORY.md` - AI discoveries and learnings

2. **Loads all context** into memory at startup

3. **Continuously updates** the context as it works:
   - Records file locations and code patterns
   - Remembers solutions to problems
   - Tracks dependencies and integrations
   - Updates architecture understanding

4. **Persists knowledge** between sessions - every conversation builds on previous learnings

### Example Context Flow

```bash
# First time in a project
cd my-awesome-project
ani
# → Automatically creates /context folder
# → Analyzes your codebase
# → Ready with full project understanding

# Next session
ani
# → Loads existing context instantly
# → Remembers everything from before
# → Continues where it left off
```

Your AI assistant now has perfect memory of YOUR specific project!

## Usage

### macOS Quick Start
```bash
# Start chat session (after installation)
ani
```

### Command Line Options

```bash
ani [options]

Options:
  -t, --temperature <temp>      Temperature for generation (default: 1)
  -s, --system <message>        Custom system message
  -d, --debug                   Enable debug logging to debug-agent.log in current directory
  -h, --help                    Display help
  -V, --version                 Display version number
```

### Authentication

Configure your AI provider using the `/login` command:

1. **OpenRouter** (default):
   - Get API key from [openrouter.ai](https://openrouter.ai/)
   - Access to 100+ models

2. **Anthropic** (Claude):
   - Get API key from [console.anthropic.com](https://console.anthropic.com/)
   - Direct access to Claude models

3. **OpenAI**:
   - Get API key from [platform.openai.com](https://platform.openai.com/)
   - Access to GPT models

You can also set API keys via environment variables:
```bash
export OPENROUTER_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

#### First-Time Setup
On first use, start Ani from any directory:

```bash
ani
```

And type the `/login` command to enter your API key.

#### Supported AI Providers
Get your API key from your preferred AI provider:
- **OpenRouter** (recommended): [openrouter.ai](https://openrouter.ai) - Access to multiple models
- **OpenAI**: [platform.openai.com](https://platform.openai.com)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)

#### Global Configuration
When installed globally, Ani stores your configuration in:
- **Config file**: `~/.ani-cli-config.json` (API key, default model)
- **Local override**: You can also set environment variables per project:

```bash
# Set API key for current session
export OPENROUTER_API_KEY=your_api_key_here

# Start Ani (will use environment variable if set)
ani
```

#### AI Provider Support

Ani Code supports multiple AI providers. Use `/login` to configure:

**OpenRouter (Default)**
- Access to 100+ models including:
  - `anthropic/claude-3.5-sonnet`
  - `google/gemini-2.5-pro`
  - `openai/gpt-4-turbo`
  - `moonshotai/kimi-k2`
  - And many more...

**Ani AI**
- Connect to custom AI apps built on Ani.ai
- Requires API key and App ID
- Perfect for specialized chatbots and workflows

**OpenAI**
- Direct access to GPT models
- `gpt-4-turbo`, `gpt-3.5-turbo`

### macOS-Specific Notes
- Ani Code is Coding works natively on macOS with no additional setup required
- Uses standard Unix permissions and paths
- Compatible with both Intel and Apple Silicon Macs
- Supports all standard macOS terminal applications (Terminal, iTerm2, etc.)

### Available Commands
- `/help` - Show help and available commands
- `/login` - Login with your AI API credentials
- `/model` - Select your preferred AI model
- `/clear` - Clear chat history and context
- `/reasoning` - Toggle display of reasoning content in messages
- `/context` - Initialize or manage project context documentation

### Context Engineering

Ani Code follows **Context Engineering** best practices to help AI assistants better understand your projects. This powerful feature automatically:

1. **Detects Project Context**: On first interaction, Ani Code checks for a `/context` folder in your project
2. **Suggests Documentation**: If no context exists, it prompts you to create structured documentation
3. **Maintains Project Memory**: Updates context files as it learns about your codebase

#### Why Context Engineering Matters

- **10x Cost Reduction**: Proper context caching reduces API costs dramatically
- **Faster Responses**: Well-structured context improves response time by 50-70%
- **Better Accuracy**: Clear context reduces errors and hallucinations by up to 80%
- **Project Understanding**: AI maintains deep knowledge of your codebase architecture

#### How to Use Context Engineering

```bash
# Initialize context for any project
ani
> Initialize context for this project

# Check context health
ani
> Check context health

# Analyze and update context
ani
> Analyze the project and update context
```

#### Context Folder Structure

When initialized, Ani Code creates:

```
your-project/
├── context/                     # All AI-relevant documentation
│   ├── PROJECT.md              # Project overview and goals
│   ├── ARCHITECTURE.md         # System design and structure
│   ├── DEVELOPMENT.md          # Setup and development guide
│   ├── CONVENTIONS.md          # Code style and patterns
│   ├── AGENT_MEMORY.md         # AI's learnings about your project
│   └── .context-metadata.json  # Context versioning
└── src/
```

For more details, see [CONTEXT_ENGINEERING_BEST_PRACTICES.md](./CONTEXT_ENGINEERING_BEST_PRACTICES.md).

### Troubleshooting Global Installation

#### Command Not Found
If `ani` command is not found after global installation:

```bash
# Check if globally installed
npm list -g ani-code-is-coding

# Reinstall globally
cd /path/to/ani-cli
npm run build
npm install -g . --force

# Check npm global bin path
npm config get prefix
```

#### Permission Issues (Linux/macOS)
```bash
# Fix npm permissions (if needed)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use a Node version manager like nvm
```

#### Multiple Installations
```bash
# Remove all global ani packages
npm uninstall -g ani-code-is-coding ani-code ani

# Clean reinstall
npm install -g . --force
```


## Development

### Testing Locally
```bash
# Run this in the background during development to automatically apply any changes to the source code
npm run dev  
```

### Available Scripts
```bash
npm run build      # Build TypeScript to dist/
npm run dev        # Build in watch mode
```

### Project Structure

```
ani-code/
├── src/
│   ├── commands/           
│   │   ├── definitions/        # Individual command implementations
│   │   │   ├── clear.ts        # Clear chat history command
│   │   │   ├── help.ts         # Help command
│   │   │   ├── login.ts        # Authentication command
│   │   │   ├── model.ts        # Model selection command
│   │   │   └── reasoning.ts    # Reasoning toggle command
│   │   ├── base.ts             # Base command interface
│   │   └── index.ts            # Command exports
│   ├── core/               
│   │   ├── agent.ts            # AI agent implementation
│   │   └── cli.ts              # CLI entry point and setup
│   ├── tools/              
│   │   ├── tool-schemas.ts     # Tool schema definitions
│   │   ├── tools.ts            # Tool implementations
│   │   └── validators.ts       # Input validation utilities
│   ├── ui/                 
│   │   ├── App.tsx             # Main application component
│   │   ├── components/     
│   │   │   ├── core/           # Core chat TUI components
│   │   │   ├── display/        # Auxiliary components for TUI display
│   │   │   └── input-overlays/ # Input overlays and modals that occupy the MessageInput box
│   │   └── hooks/          
│   └── utils/              
│       ├── constants.ts        # Application constants
│       ├── file-ops.ts         # File system operations
│       ├── local-settings.ts   # Local configuration management
│       └── markdown.ts         # Markdown processing utilities
├── docs/                   
├── package.json    
├── tsconfig.json        
└── LICENSE          
```

**TL;DR:** Start with `src/core/cli.ts` (main entry point), `src/core/agent.ts`, and `src/ui/hooks/useAgent.ts` (bridge between TUI and the agent). Tools are in `src/tools/`, slash commands are in `src/commands/definitions/`, and customize the TUI in `src/ui/components/`.

### Customization

#### Adding New Tools

Tools are AI-callable functions that extend the CLI's capabilities. To add a new tool:

1. **Define the tool schema** in `src/tools/tool-schemas.ts`:
```typescript
export const YOUR_TOOL_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'your_tool_name',
    description: 'What your tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter description' }
      },
      required: ['param1']
    }
  }
};
```

2. **Implement the tool function** in `src/tools/tools.ts`:
```typescript
export async function yourToolName(param1: string): Promise<ToolResult> {
  // Your implementation here
  return createToolResponse(true, result, 'Success message');
}
```

3. **Register the tool** in the `TOOL_REGISTRY` object and `executeTool` switch statement in `src/tools/tools.ts`.

4. **Add the schema** to `ALL_TOOL_SCHEMAS` array in `src/tools/tool-schemas.ts`.

#### Adding New Slash Commands

Slash commands provide direct user interactions. To add a new command:

1. **Create command definition** in `src/commands/definitions/your-command.ts`:
```typescript
import { CommandDefinition, CommandContext } from '../base.js';

export const yourCommand: CommandDefinition = {
  command: 'yourcommand',
  description: 'What your command does',
  handler: ({ addMessage }: CommandContext) => {
    // Your command logic here
    addMessage({
      role: 'system',
      content: 'Command response'
    });
  }
};
```

2. **Register the command** in `src/commands/index.ts` by importing it and adding to the `availableCommands` array.

#### Changing Start Command
To change the start command from `ani`, modify the `"bin"` section in `package.json` to your preferred global command name.

Re-run `npm run build` and `npm link` to apply changes.


## Contributing and Support

Improvements through PRs are welcome!

For issues and feature requests, please open an issue on GitHub.

#### Built with powerful AI APIs - share what you create!
