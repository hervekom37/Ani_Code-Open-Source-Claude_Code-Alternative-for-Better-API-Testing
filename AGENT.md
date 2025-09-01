# Ani Code Project

Ani Code is an AI-powered coding assistant CLI that provides automatic persistent context through AGENT.md support. It's designed as a lightweight, customizable foundation for developers to build their own AI coding tools.

## Build & Commands

- Typecheck: `npm run build`
- Start development: `npm run dev`
- Run tests: `npm test`
- Start CLI: `npm start` or `ani` (after global install)
- Install globally: `npm install -g .`
- Check formatting: `npm run test`

### Development Commands

- Development server: `http://localhost:3000` (when UI is active)
- Debug mode: `ani --debug` or set `ANI_DEBUG=true`
- Watch mode: `npm run dev` (auto-rebuild on changes)

## Code Style

- TypeScript with strict mode enabled
- Functional programming patterns preferred  
- Use descriptive variable and function names
- Follow existing patterns in the codebase
- NEVER use `@ts-expect-error` or `@ts-ignore`
- File naming: kebab-case for files, PascalCase for components
- Import order: external deps, then internal by path depth
- Prefer named exports over default exports
- Use type imports: `import type { Type } from './types'`

## Testing

- Test framework: Ava
- Linting: XO with React extensions
- Formatting: Prettier
- Run all checks: `npm test`
- Component tests go in same directory as components
- Use descriptive test names without "should"

## Architecture

### Core Components

- **Agent Core** (`src/core/agent.ts`): Main AI agent logic, handles API calls, tool execution
- **CLI Entry** (`src/core/cli.ts`): Command-line interface setup and initialization
- **Tools System** (`src/tools/`): Extensible tool framework for file operations, context management
- **UI Components** (`src/ui/`): React/Ink-based terminal UI components
- **Commands** (`src/commands/`): Slash command implementations

### Key Design Patterns

- **Tool Registry**: All AI capabilities are implemented as tools with schemas
- **Context Management**: Supports both AGENT.md (universal) and /context folders
- **Message Streaming**: Real-time streaming responses with token tracking
- **Stable Context Prefix**: KV-cache optimization for repeated context

### Data Flow

1. User input → CLI → Agent
2. Agent loads context (AGENT.md or /context)
3. Agent processes with LLM API
4. Tool execution if needed
5. Response streaming to UI
6. Context updates as needed

## Context Engineering

This project pioneered AGENT.md support as the universal standard for AI assistants:

- **AGENT.md**: Single configuration file that works with all AI tools
- **Auto-detection**: Loads AGENT.md, PROJECT_OUTLINE.md, or /context folder
- **Smart Migration**: Can convert legacy configs (.cursorrules, CLAUDE.md, etc.)
- **Persistent Memory**: Updates AGENT_MEMORY.md with learnings
- **Universal Compatibility**: Works with Cursor, Claude, Windsurf, and more

## Security

- API keys stored in ~/.ani-cli-config.json
- Never commit secrets or API keys
- Validate all user inputs before tool execution
- Use environment variables for sensitive data
- Tool approval system for dangerous operations
- Sandboxed command execution

## Git Workflow

- Run tests before committing: `npm test`
- Use descriptive commit messages
- Create feature branches for new work
- Keep pull requests focused and small
- Main branch: `main`
- Version tags follow semver

## Tool Development

To add new tools:
1. Define schema in `src/tools/tool-schemas.ts`
2. Implement function in `src/tools/tools.ts`
3. Add to TOOL_REGISTRY and executeTool
4. Add to appropriate tool category (SAFE_TOOLS, etc.)

## API Provider Support

- **OpenRouter** (default): 100+ models via unified API
- **Anthropic**: Direct Claude API access
- **OpenAI**: GPT models support
- **Extensible**: Easy to add new providers

## Performance Considerations

- Context caching with stable prefixes
- Streaming responses for better UX
- Lazy loading of context files
- Efficient file operations with batching
- Token usage tracking and optimization

## Debugging

- Enable debug logs: `ani --debug` or `export ANI_DEBUG=true`
- Debug file: `debug-agent.log` in current directory
- Verbose API logging available
- Tool execution tracing

## Common Issues

- **Context not loading**: Check file permissions and paths
- **API errors**: Verify API keys in ~/.ani-cli-config.json
- **Tool failures**: Check debug logs for detailed errors
- **Symlink issues**: Use full paths, not relative

## Future Enhancements

- Web UI dashboard
- Plugin system for custom tools
- Multi-agent collaboration
- Vector embeddings for semantic search
- Local model support

---

*This file follows the AGENT.md standard for AI coding assistants.*
*Learn more at https://agent.md*

@CONTEXT_ENGINEERING_BEST_PRACTICES.md
@README.md