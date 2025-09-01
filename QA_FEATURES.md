# Ani Code QA System - Complete Feature Guide

Ani Code now includes a comprehensive QA system inspired by Cursor's MCP tools, providing 6 key commands for automated testing, security scanning, and code quality assurance.

## 🚀 Quick Start

All new commands are available as CLI commands and TUI slash commands:

```bash
# Install Ani Code globally (if not already)
npm install -g ani-code

# Use in any project
ani add-playwright
ani bug-scan
ani generate-tests --ci --e2e
```

## 📋 Available Commands

### 1. `add-playwright` - Playwright E2E Setup
**Purpose**: Instantly add Playwright for end-to-end testing

```bash
ani add-playwright
```

**What it does**:
- Installs Playwright dependencies
- Creates `playwright.config.js` with optimal settings
- Generates sample E2E tests in `tests/e2e/`
- Updates `package.json` with test scripts
- Adds `.gitignore` entries for test artifacts

**Generated files**:
- `playwright.config.js`
- `tests/e2e/todos.spec.js` (sample tests)
- `package.json` (updated scripts)

### 2. `bug-scan` - Automated Bug Detection
**Purpose**: Scan for bugs, security issues, and missing tests

```bash
ani bug-scan                # Local scan
ani bug-scan --local        # Same as above
ani bug-scan --pr           # Scan PR diffs (CI mode)
```

**What it detects**:
- Missing unit tests for new functions
- Security vulnerabilities (`npm audit`)
- ESLint violations
- Common security patterns (eval, innerHTML, etc.)
- Outdated dependencies

**Output**: `context/BUG_REPORT.md` with detailed findings

### 3. `run-tests` - Unified Test Runner
**Purpose**: Run tests and capture results for AI context

```bash
ani run-tests               # Run all tests
ani run-tests unit          # Run unit tests only
ani run-tests e2e           # Run E2E tests only
ani run-tests playwright    # Run Playwright tests
```

**Features**:
- Runs Jest, Playwright, or custom test suites
- Captures detailed logs
- Saves results to `context/AGENT_MEMORY.md`
- Provides test summaries for AI agents

### 4. `generate-tests` - Smart Test Generation
**Purpose**: Generate comprehensive test suites with CI/CD support

```bash
ani generate-tests                          # Basic unit tests
ani generate-tests --ci                     # + GitHub Actions workflow
ani generate-tests --e2e                    # + E2E tests
ani generate-tests --playwright             # + Playwright tests
ani generate-tests --ci --e2e --playwright  # All features
ani generate-tests src/utils/api.js         # Specific file tests
```

**Generated content**:
- Unit tests with Jest configuration
- E2E tests (Playwright or basic)
- GitHub Actions workflow (`.github/workflows/test.yml`)
- Coverage reporting setup

### 5. `migrate-ts` - TypeScript Migration
**Purpose**: Convert JavaScript projects to TypeScript

```bash
ani migrate-ts
```

**What it does**:
- Installs TypeScript dependencies
- Creates `tsconfig.json` with optimal settings
- Converts `.js` files to `.ts` (basic conversion)
- Updates `package.json` scripts
- Adds TypeScript-specific `.gitignore` entries

### 6. `bg-agent` - Background Test Agent
**Purpose**: Automatically generate tests when code changes

```bash
ani bg-agent                # Run single scan
ani bg-agent --watch        # Watch mode (continuous)
```

**Features**:
- Watches for new Express routes
- Detects new React components
- Monitors model/schema changes
- Auto-generates appropriate tests
- Integrates with nodemon for development

## 🔄 Integration Examples

### Complete QA Workflow
```bash
# Setup new project with full QA
ani init
ani add-playwright
ani generate-tests --ci --e2e --playwright
ani migrate-ts
ani bug-scan

# Start background agent for continuous testing
ani bg-agent --watch
```

### CI/CD Pipeline
The system automatically generates `.github/workflows/test.yml` with:
- Multi-node version testing
- Security audits
- Linting
- Unit and E2E tests
- Coverage reporting
- Artifact uploads

### Development Workflow
```bash
# Daily development
ani run-tests              # Quick test run
ani bug-scan --local       # Pre-commit checks
ani generate-tests src/    # Update tests for new features
```

## 🎯 AI Agent Integration

All commands integrate with Ani Code's AI agents:

- **Backend Developer**: Uses test results for better code suggestions
- **Security Auditor**: Leverages bug-scan findings
- **Test Generator**: Builds upon existing test patterns
- **Bundle Optimizer**: Considers test coverage for optimization

## 📊 Output Structure

All QA commands save results to the `context/` directory:

- `context/BUG_REPORT.md` - Bug scan findings
- `context/AGENT_MEMORY.md` - Test results and logs
- `context/qa-metrics.json` - Quality metrics
- `context/test-coverage/` - Coverage reports

## 🔧 Configuration

Each command respects existing configurations:
- Uses existing `package.json` scripts when possible
- Preserves custom Jest configurations
- Integrates with existing ESLint setups
- Maintains TypeScript configurations

## 🎭 Usage Patterns

### For New Projects
```bash
ani init
ani add-playwright
ani generate-tests --ci --e2e --playwright
ani migrate-ts
```

### For Existing Projects
```bash
ani bug-scan           # Identify issues
ani run-tests          # Check current test state
ani generate-tests     # Fill test gaps
ani bg-agent --watch   # Continuous improvement
```

### For CI/CD Integration
```bash
# In GitHub Actions
ani bug-scan --pr
ani run-tests
ani generate-tests --ci
```

## 🌟 Advanced Features

- **Smart Detection**: Automatically identifies project type (Express, React, etc.)
- **Context-Aware**: Generates tests based on actual code patterns
- **Progressive Enhancement**: Adds features incrementally without breaking existing setup
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Zero Configuration**: Works out of the box with sensible defaults

## 📈 Benefits

- **Faster Development**: Automated test generation reduces manual work
- **Better Quality**: Comprehensive testing catches issues early
- **AI-Enhanced**: AI agents have better context with test results
- **CI/CD Ready**: Instant GitHub Actions integration
- **Type Safety**: Optional TypeScript migration improves code quality
- **Continuous Monitoring**: Background agent ensures ongoing quality

This QA system transforms Ani Code into a complete development platform with built-in quality assurance, following best practices from modern development workflows.