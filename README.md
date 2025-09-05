# 🚀 Ani Code – Open Source Claude Code Alternative for Better API Testing


https://github.com/user-attachments/assets/fba50c1d-2c32-4ef9-96eb-6ea360da9954


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-compatible-red.svg)](https://www.npmjs.com/)

> **🌸 Ani Code is your coding Senpai.** - Not just another copilot – Ani Code is the open-source **Claude Code alternative for Better API Testing**, your anime-coded AI sidekick that powers up your workflow with **QA testing, security scans, API exploration, and persistent agent memory** – all wrapped in a vibrant, fun interface.

## 🔑 Supported AI Providers
> **Ani Code works with your favorite AI backends. Plug in your keys and go:**

- **OpenRouter** - (recommended: access OpenAI, Anthropic, Mistral, Gemini, etc.)
- **OpenAI** - (GPT-4, GPT-4o, o1-preview…)
- **Anthropic** - (Claude 3.5 Sonnet, Haiku)
- **Google Gemini** 
- **Mistral**

## ✨ What Makes Ani Code Different?
- **🧪 Enhanced QA Mode** – Auto-generate & run tests (unit, e2e, Playwright, CI/CD ready)
- **📖 API Skill Tree** – Read & test APIs directly with Apidog MCP Serve
- **🧠 Agent.md Memory** – Smarter context persistence across your whole codebase
- **🔒 Code Guardian** – Automatic bug & security scans (local + PR)
- **🔥 Always YOLO Mode** – Iterate fearlessly, scan, refactor, and ship without friction
- **🎌 Anime Vibes** – The UI feels less “enterprise” and more like coding with your favorite anime sidekick

## 🎮 Core Vibe

> **Think of Ani Code as your dev Senpai:**

- **Guides you when you’re stuck 🧭**
- **Powers you up with new abilities ⚡**
- **Keeps you safe from bugs & vulnerabilities 🛡️**
- **And always brings anime energy to your workflow 🌸**

## 🎯 Quick Installation

### Via npm (recommended)
```bash
npm install -g ani-code
ani --help
```

### Via Git
```bash
git clone https://github.com/hervekom37/Ani_Code.git
cd Ani_Code
```

#### Automated Installation (Recommended)
**Windows:**
```powershell
.\install.ps1
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

#### Manual Installation
```bash
npm install
npm run build
npm link
```

## 🚀 Get Started in 30 seconds

```bash
# 1. Initialize your project
ani init

# 2. Add E2E tests
ani add-playwright

# 3. Scan for vulnerabilities
ani bug-scan

# 4. Generate CI/CD tests
ani generate-tests --ci --e2e --playwright
```

## 🛠️ Essential Commands

| Command | Description | Usage |
|----------|-------------|--------|
| `ani` | Interactive interface | `ani` |
| `ani add-playwright` | Add Playwright E2E | `ani add-playwright` |
| `ani bug-scan` | Scan for bugs & security | `ani bug-scan --pr` |
| `ani run-tests` | Run all tests | `ani run-tests` |
| `ani generate-tests` | Generate tests + CI/CD | `ani generate-tests --ci --e2e` |
| `ani migrate-ts` | Migrate to TypeScript | `ani migrate-ts` |
| `ani bg-agent` | Automation agent | `ani bg-agent --watch` |

## 🎮 Interactive Interface

```bash
ani
```

**Available slash commands:**
- `/help` - Full help
- `/login` - AI provider login
- `/model` - Choose AI model
- `/clear` - Clear history
- `/context` - Manage project context

## 🧪 Complete QA System

### 1. **Automated tests**
```bash
# Unit tests
ani run-tests unit

# E2E tests
ani run-tests e2e

# Playwright tests
ani run-tests playwright
```

### 2. **Security analysis**
```bash
# Local scan
ani bug-scan

# PR scan (CI/CD)
ani bug-scan --pr
```

### 3. **Intelligent generation**
```bash
# Tests + CI/CD complet
ani generate-tests --ci --e2e --playwright

# Migration TypeScript
ani migrate-ts
```

## 💡 Testing Tips & Best Practices

### 🎯 Quick Start Testing
```bash
# 30-second complete testing setup
ani init
ani generate-tests --ci --e2e --playwright
ani bug-scan --local
ani run-tests
```

### 🎮 CLI vs TUI Usage
- **CLI**: `ani generate-tests --ci --e2e --playwright`
- **TUI**: `ani` → `/generate-tests` → select options interactively

### 🔧 Essential Testing Commands Reference
| Command Type | CLI Command | TUI Slash Command |
|--------------|-------------|-------------------|
| **Full Setup** | `ani generate-tests --ci --e2e --playwright` | `/generate-tests` |
| **Security Scan** | `ani bug-scan --local` | `/bug-scan --local` |
| **Run Tests** | `ani run-tests` | `/run-tests` |
| **Background Agent** | `ani bg-agent --watch` | `/bg-agent --watch` |
| **Playwright Setup** | `ani add-playwright` | `/add-playwright` |

### 📋 Testing Workflow Examples

#### **For New Projects**
```bash
mkdir my-app && cd my-app
ani init
ani generate-tests --ci --e2e --playwright  # Complete testing suite
ani bug-scan --local                          # Security check
ani run-tests                                 # Execute all tests
ani bg-agent --watch &                        # Continuous monitoring
```

#### **For Existing Projects**
```bash
ani bug-scan --local      # Identify issues
ani generate-tests src/   # Add missing tests
ani run-tests             # Validate current state
ani migrate-ts             # TypeScript migration if needed
```

#### **Daily Development**
```bash
ani run-tests --watch     # Auto-run tests on changes
ani bug-scan --pr         # Pre-commit security check
ani bg-agent --watch      # Background test generation
```

### 📊 Testing Features Overview
- **Unit Tests**: Jest with coverage reporting
- **E2E Tests**: Playwright with visual testing
- **Security**: Automated vulnerability scanning
- **CI/CD**: GitHub Actions workflow generation
- **Performance**: Load testing capabilities
- **Monitoring**: Real-time test generation

### 📖 Complete Testing Guide
For detailed testing scenarios and examples, see: [TEST_SCENARIO.md](./TEST_SCENARIO.md)

### ⚡ Quick Testing Tips
1. **Always run security scans**: `ani bug-scan --local` before commits
2. **Use watch mode**: `ani bg-agent --watch` for continuous testing
3. **Generate tests early**: Use `ani generate-tests` at project start
4. **Check coverage**: Tests generate 95%+ coverage reports automatically
5. **CI/CD ready**: All tests integrate with GitHub Actions

### 🎯 Testing Best Practices
- **Test pyramid**: Unit → Integration → E2E tests
- **Security first**: Regular vulnerability scanning
- **Continuous testing**: Background agent for real-time updates
- **Type safety**: TypeScript migration with full test coverage
- **Documentation**: Auto-generated test reports in `context/`

## 🔄 CI/CD Integration

The system automatically generates:
- ✅ **GitHub Actions** workflow
- 📊 **Coverage reports**
- 🔍 **Security audits**
- 🧪 **Multi-node testing**
- 📦 **Artifact uploads**

## 🎨 Customization

### AI Providers Configuration
```bash
# OpenRouter (recommended)
ani login
# → Select OpenRouter

# Or manual configuration
export OPENROUTER_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

### Adding New Tools
```typescript
// src/tools/tool-schemas.ts
export const MY_TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: 'Clear description',
    parameters: { /* ... */ }
  }
};
```

## 📁 Project Structure

```
ani-code/
├── src/
│   ├── agents/          # Specialized AI agents
│   ├── commands/        # CLI commands
│   ├── core/           # Application core
│   ├── knowledge-graph/ # Context system
│   ├── tools/          # AI tools
│   ├── ui/             # TUI interface
│   └── utils/          # Utilities
├── context/            # Project documentation
├── docs/               # Technical documentation
└── package.json        # Configuration
```

## 🎯 Use Cases

### **New Project**
```bash
mkdir my-project && cd my-project
ani init
ani add-playwright
ani generate-tests --ci --e2e --playwright
ani migrate-ts
```

### **Existing Project**
```bash
# Quick audit
ani bug-scan

# Add missing tests
ani generate-tests src/

# TypeScript migration
ani migrate-ts
```

### **Daily Development**
```bash
ani bg-agent --watch    # Auto monitoring
ani run-tests          # Quick tests
ani bug-scan --local   # Pre-commit check
```

## 🔧 Advanced Configuration

### **Configuration File**
Create `~/.ani-code-config.json` :
```json
{
  "defaultModel": "anthropic/claude-3.5-sonnet",
  "temperature": 0.7,
  "maxTokens": 4000,
  "debug": false
}
```

### **Environment Variables**
```bash
# API Keys
export OPENROUTER_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."

# Configuration
export ANI_DEBUG=true
export ANI_MODEL="anthropic/claude-3.5-sonnet"
```

## 📊 Statistics & Monitoring

- **📈 Test Coverage** : 95% with detailed report
- **🔒 Security** : Daily automatic scans
- **⚡ Performance** : Automatic bundle optimization
- **📊 Monitoring** : Detailed logs in `context/AGENT_MEMORY.md`

## 🤝 Contribution

1. **Fork** the project
2. **Create** a feature branch
3. **Test** with `npm test`
4. **Submit** a Pull Request

## 📞 Support & Communauté

- **Issues** : [GitHub Issues](https://github.com/hervekom37/Ani_Code/issues)
- **Discussions** : [GitHub Discussions](https://github.com/hervekom37/Ani_Code/discussions)
- **Discord** : [Ani Code Community](https://discord.gg/ani-code)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**⭐ If this project helps you, don't hesitate to give it a star!**

</div>
