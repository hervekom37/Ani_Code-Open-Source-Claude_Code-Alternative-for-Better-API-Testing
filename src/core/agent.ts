// src/core/agent.ts

import { executeTool } from '../tools/tools.js';
import { ALL_TOOL_SCHEMAS, DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS } from '../tools/tool-schemas.js';
import { ConfigManager } from '../utils/local-settings.js';
import fs from 'fs';
import path from 'path';
import { API_PROVIDERS, DEFAULT_MODEL, ApiProvider, DEFAULT_CONTEXT_WINDOW } from '../utils/constants.js';
import fetch from 'node-fetch';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | any[];
  tool_calls?: any[];
  tool_call_id?: string;
}

export class Agent {
  private messages: Message[] = [];
  private apiKey: string | null = null;
  private apiProvider: ApiProvider = 'OPENROUTER';
  private model: string;
  private temperature: number;
  private sessionAutoApprove: boolean = false;
  private systemMessage: string;
  private configManager: ConfigManager;
  private onToolStart?: (name: string, args: Record<string, any>) => void;
  private onToolEnd?: (name: string, result: any) => void;
  private onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
  private onThinkingText?: (content: string, reasoning?: string) => void;
  private onFinalMessage?: (content: string, reasoning?: string) => void;
  private onMaxIterations?: (maxIterations: number) => Promise<boolean>;
  private onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  private requestCount: number = 0;
  private currentAbortController: AbortController | null = null;
  private isInterrupted: boolean = false;
  private stableContextPrefix: Message[] = []; // For KV-cache optimization
  private contextLoaded: boolean = false;

  constructor(
    model: string,
    temperature: number,
    systemMessage: string | null,
    debug?: boolean
  ) {
    this.model = model;
    this.temperature = temperature;
    this.configManager = new ConfigManager();
    debugEnabled = debug || false;
    
    // Load API provider settings
    this.apiProvider = this.configManager.getApiProvider() as ApiProvider;
    
    this.systemMessage = systemMessage || this.buildDefaultSystemMessage();
    
    // Create stable prefix for KV-cache optimization
    this.stableContextPrefix.push({ role: 'system', content: this.systemMessage });
    this.messages = [...this.stableContextPrefix];
  }

  static async create(
    model: string = DEFAULT_MODEL,
    temperature: number = 0.7,
    systemMessage: string | null = null,
    debug?: boolean,
    preloadContext: boolean = true
  ): Promise<Agent> {
    const configManager = new ConfigManager();
    const defaultModel = configManager.getDefaultModel() || model;
    const agent = new Agent(defaultModel, temperature, systemMessage, debug);
    
    // Preload context if available
    if (preloadContext) {
      await agent.preloadProjectContext();
    }
    
    return agent;
  }

  private buildDefaultSystemMessage(): string {
    const providerName = this.apiProvider === 'ANTHROPIC' ? 'Anthropic' : 
                        this.apiProvider === 'OPENAI' ? 'OpenAI' : 'OpenRouter';
    
    // Add note about model for OpenAI
    if (this.apiProvider === 'OPENAI') {
      const modelNote = this.model.includes('/') ? 
        ` (using ${this.model} mapped to OpenAI equivalent)` : '';
      return `You are a coding assistant powered by ${this.model}${modelNote} via ${providerName}. Follow these rules:
1. Always use tools for implementation tasks
2. Never provide text-only solutions for coding tasks
3. Check files before editing (use read_file before edit_file)
4. Build incrementally
5. IMPORTANT: When using create_file, ALWAYS provide the 'content' parameter with the actual file content. Example: {"file_path": "index.html", "content": "<!DOCTYPE html>\\n<html>\\n<head>...</head>\\n</html>"}
6. For empty files, use content: "" explicitly
7. Use edit_file to modify existing files, create_file only for new files

Note: Use /model to select OpenAI-specific models like gpt-4, gpt-3.5-turbo, etc.`;
    }
    
    return `You are a coding assistant powered by ${this.model} via ${providerName}. 

CRITICAL: PLANNING AND EXECUTION APPROACH
When given a task, you MUST follow this structured approach:

1. PLANNING PHASE (MANDATORY):
   - First, create a comprehensive plan using clear numbered steps
   - Break down complex tasks into smaller, manageable subtasks
   - Identify prerequisites (installations, dependencies, setup)
   - List all files that need to be created or modified
   - Consider the complete implementation, not just partial solutions

2. VALIDATION PHASE:
   - Check if required tools/frameworks are installed
   - Verify project structure and dependencies
   - Read existing files before modifying them

3. EXECUTION PHASE:
   - Follow your plan step by step
   - Complete each step fully before moving to the next
   - Create all necessary files with complete content
   - Run installation commands when needed
   - Test your implementation

4. COMPLETION CHECK:
   - Ensure all planned steps are completed
   - Verify the solution is functional
   - Document any setup or usage instructions

FRAMEWORK-SPECIFIC AWARENESS:
- For Astro: Run 'npm create astro@latest' or check if Astro is installed
- For React: Check for create-react-app or vite setup
- For Vue/Angular/etc: Use appropriate CLI tools
- Always check package.json for existing dependencies

IMPLEMENTATION RULES:
1. Always use tools for implementation tasks
2. Never provide text-only solutions for coding tasks
3. Check files before editing (use read_file before edit_file)
4. Build incrementally but completely
5. When using create_file, ALWAYS provide complete file content
6. For empty files, use content: "" explicitly
7. Use edit_file to modify existing files, create_file only for new files

CONTEXT ENGINEERING (AUTOMATIC & MANDATORY):
Ani Code automatically maintains a /context folder for EVERY project:
- Context is created automatically on first interaction
- All project knowledge is persistently stored
- Context is loaded into memory for every session
- You MUST update context as you work

MANDATORY CONTEXT UPDATES:
You MUST use 'update_agent_memory' to record:
- EVERY file location and code pattern discovered
- ALL dependencies and integration details
- ANY gotchas, workarounds, or issues encountered
- ALL performance considerations
- EVERY important learning about the project

AUTOMATIC BEHAVIORS:
- After implementing features: Run 'analyze_context' to update documentation
- After solving issues: update_agent_memory with category='issue'
- After discovering patterns: update_agent_memory with category='pattern'
- After any significant work: Update relevant context files

CONTEXT-DRIVEN DEVELOPMENT:
- ALWAYS consult context files before making decisions
- FOLLOW conventions from CONVENTIONS.md without exception
- CHECK AGENT_MEMORY.md for known issues first
- REFERENCE PROJECT.md for project goals and constraints
- UPDATE context files when project evolves

IMPORTANT: Never leave tasks half-completed. If you start creating a blog, create ALL necessary pages and components, not just one or two.`;
  }

  public setToolCallbacks(callbacks: {
    onToolStart?: (name: string, args: Record<string, any>) => void;
    onToolEnd?: (name: string, result: any) => void;
    onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
    onThinkingText?: (content: string, reasoning?: string) => void;
    onFinalMessage?: (content: string, reasoning?: string) => void;
    onMaxIterations?: (maxIterations: number) => Promise<boolean>;
    onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  }) {
    this.onToolStart = callbacks.onToolStart;
    this.onToolEnd = callbacks.onToolEnd;
    this.onToolApproval = callbacks.onToolApproval;
    this.onThinkingText = callbacks.onThinkingText;
    this.onFinalMessage = callbacks.onFinalMessage;
    this.onMaxIterations = callbacks.onMaxIterations;
    this.onApiUsage = callbacks.onApiUsage;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    debugLog('API key set');
  }

  public saveApiKey(apiKey: string): void {
    this.configManager.setApiKey(apiKey);
    this.setApiKey(apiKey);
  }

  public saveApiCredentials(credentials: { provider: ApiProvider; apiKey: string }): void {
    this.configManager.setApiProvider(credentials.provider);
    this.configManager.setApiKey(credentials.apiKey);
    
    this.apiProvider = credentials.provider;
    this.apiKey = credentials.apiKey;
  }

  public clearApiKey(): void {
    this.configManager.clearApiKey();
    this.apiKey = null;
  }

  public async chat(userInput: string): Promise<void> {
    this.isInterrupted = false;

    if (!this.apiKey) {
      // Check environment variables based on provider
      let envKey;
      switch (this.apiProvider) {
        case 'ANTHROPIC':
          envKey = process.env.ANTHROPIC_API_KEY;
          break;
        case 'OPENAI':
          envKey = process.env.OPENAI_API_KEY;
          break;
        case 'OPENROUTER':
        default:
          envKey = process.env.OPENROUTER_API_KEY;
          break;
      }
      
      const configKey = this.configManager.getApiKey();
      this.apiKey = envKey || configKey || null;
      
      if (!this.apiKey) {
        throw new Error(`No API key set for ${this.apiProvider}. Use /login first or set the appropriate environment variable.`);
      }
    }

    // Context engineering: Check for context folder on first user interaction
    if (this.messages.length === 1) { // Only system message exists
      await this.checkAndSuggestContextFolder();
    }

    this.messages.push({ role: 'user', content: userInput });

    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations && !this.isInterrupted) {
      try {
        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        debugLog('Using API Key:', this.apiKey);
        debugLog('Sending messages to API:', JSON.stringify(this.messages, null, 2));

        const apiUrl = this.getApiUrl();
        const headers = this.getApiHeaders();
        const body = this.getApiBody();

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: signal as any
        });

        debugLog('API Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as any;
        
        // Handle different response formats
        let message;
        if (this.apiProvider === 'ANTHROPIC') {
          // Anthropic API has a different response format
          message = {
            role: 'assistant',
            content: data.content?.[0]?.text || '',
            tool_calls: data.content?.filter((c: any) => c.type === 'tool_use').map((toolUse: any) => ({
              id: toolUse.id,
              function: {
                name: toolUse.name,
                arguments: JSON.stringify(toolUse.input)
              }
            }))
          };
        } else {
          // OpenRouter/OpenAI format
          message = data.choices[0].message;
        }

        if (this.onApiUsage && data.usage) {
          this.onApiUsage(data.usage);
        }


        if (message.tool_calls) {
          if (message.content && this.onThinkingText) {
            this.onThinkingText(message.content);
          }

          // Add the assistant message with tool_calls (OpenAI format)
          this.messages.push({
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls
          });

          // Execute tools and add results as tool messages (OpenAI format)
          for (const toolCall of message.tool_calls) {
            if (!toolCall.id) {
              throw new Error('toolCall missing id');
            }
            
            const result = await this.executeToolCall(toolCall);
            
            // Add tool message with result
            this.messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id
            });
          }
        } else {
          // Final response
          if (this.onFinalMessage) {
            this.onFinalMessage(message.content);
          }
          this.messages.push({
            role: 'assistant',
            content: message.content
          });
          return;
        }
      } catch (error) {
        if (this.isInterrupted) return;
        throw error;
      } finally {
        this.currentAbortController = null;
      }
      iteration++;
    }
  }

  private async executeToolCall(toolCall: any): Promise<any> {
    const toolName = toolCall.function.name.replace('repo_browser.', '');
    let toolArgs: Record<string, any> = {};

    debugLog(`Executing tool: ${toolName}`);
    debugLog(`Tool call object:`, JSON.stringify(toolCall, null, 2));

    try {
      toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      debugLog(`Parsed tool args:`, JSON.stringify(toolArgs, null, 2));
    } catch (e: any) {
      debugLog(`JSON parse error:`, e.message);
      return { error: `Invalid JSON arguments: ${e.message}`, success: false };
    }

    if (this.onToolStart) {
      this.onToolStart(toolName, toolArgs);
    }

    if ((DANGEROUS_TOOLS.includes(toolName) ||
        (APPROVAL_REQUIRED_TOOLS.includes(toolName) && !this.sessionAutoApprove))) {
      if (this.onToolApproval) {
        const { approved, autoApproveSession } = await this.onToolApproval(toolName, toolArgs);
        if (autoApproveSession) this.sessionAutoApprove = true;
        if (!approved) return { error: 'Tool execution rejected', userRejected: true };
      }
    }

    try {
      debugLog(`Calling executeTool for: ${toolName}`);
      const result = await executeTool(toolName, toolArgs);
      debugLog(`Tool result:`, JSON.stringify(result, null, 2));
      if (this.onToolEnd) this.onToolEnd(toolName, result);
      return result;
    } catch (error) {
      debugLog(`Tool execution error:`, error);
      return { error: `Tool error: ${error}`, success: false };
    }
  }

  public setModel(model: string): void {
    this.model = model;
    this.configManager.setDefaultModel(model);
    this.systemMessage = this.buildDefaultSystemMessage();
    
    // Update stable prefix while preserving context
    const contextMessages = this.stableContextPrefix.slice(1); // Remove old system message
    this.stableContextPrefix = [{ role: 'system', content: this.systemMessage }, ...contextMessages];
    
    // Rebuild messages preserving conversation history
    const conversationHistory = this.messages.slice(this.stableContextPrefix.length);
    this.messages = [...this.stableContextPrefix, ...conversationHistory];
  }

  public getCurrentModel(): string {
    return this.model;
  }

  public setSessionAutoApprove(enabled: boolean): void {
    this.sessionAutoApprove = enabled;
  }

  public interrupt(): void {
    this.isInterrupted = true;
    if (this.currentAbortController) this.currentAbortController.abort();
  }

  private getApiUrl(): string {
    switch (this.apiProvider) {
      case 'ANTHROPIC':
        return `${API_PROVIDERS.ANTHROPIC}/messages`;
      case 'OPENAI':
        return `${API_PROVIDERS.OPENAI}/chat/completions`;
      case 'OPENROUTER':
      default:
        return `${API_PROVIDERS.OPENROUTER}/chat/completions`;
    }
  }

  private getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.apiProvider) {
      case 'ANTHROPIC':
        headers['x-api-key'] = this.apiKey || '';
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'OPENAI':
      case 'OPENROUTER':
      default:
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        if (this.apiProvider === 'OPENROUTER') {
          headers['HTTP-Referer'] = 'https://ani-code-cli.com';
          headers['X-Title'] = 'Ani Code';
        }
        break;
    }

    return headers;
  }

  private getApiBody(): any {
    const contextWindow = this.configManager.getContextWindow() || DEFAULT_CONTEXT_WINDOW;
    
    switch (this.apiProvider) {
      case 'ANTHROPIC':
        // Anthropic API uses a different format
        return {
          model: this.model.includes('/') ? 'claude-3-5-sonnet-20241022' : this.model,
          max_tokens: contextWindow,
          messages: this.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content: m.role === 'tool' ? [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content
              }
            ] : m.content
          })),
          system: this.messages.find(m => m.role === 'system')?.content || this.systemMessage,
          tools: ALL_TOOL_SCHEMAS.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters
          })),
          temperature: this.temperature,
        };
      case 'OPENAI':
        // Convert model name if it's in OpenRouter format
        let openaiModel = this.model;
        if (this.model.includes('/')) {
          // Map common OpenRouter models to OpenAI equivalents
          const modelMap: Record<string, string> = {
            'anthropic/claude-3.5-sonnet': 'gpt-5-chat-latest',
            'anthropic/claude-3-opus': 'gpt-5',
            'anthropic/claude-3-sonnet': 'gpt-5-chat-latest',
            'anthropic/claude-3-haiku': 'gpt-5-mini',
            'openai/gpt-4-turbo': 'gpt-4.1',
            'openai/gpt-4': 'gpt-4.1',
            'openai/gpt-3.5-turbo': 'gpt-5-nano',
            'openai/o1-preview': 'o1',
            'openai/o1-mini': 'o3-mini',
          };
          openaiModel = modelMap[this.model] || 'gpt-5-chat-latest';
        }
        return {
          model: openaiModel,
          messages: this.messages,
          tools: ALL_TOOL_SCHEMAS,
          tool_choice: 'auto',
          temperature: this.temperature,
        };
      case 'OPENROUTER':
      default:
        return {
          model: this.model,
          messages: this.messages,
          tools: ALL_TOOL_SCHEMAS,
          tool_choice: 'auto',
          max_tokens: contextWindow,
          temperature: this.temperature,
        };
    }
  }

  public clearHistory(): void {
    // Preserve stable context prefix for KV-cache optimization
    this.messages = [...this.stableContextPrefix];
  }

  public async preloadProjectContext(): Promise<void> {
    try {
      // First check for PROJECT_OUTLINE.md in the root
      const projectOutlinePath = path.join(process.cwd(), 'PROJECT_OUTLINE.md');
      const outlineExists = await fs.promises.access(projectOutlinePath).then(() => true).catch(() => false);
      
      if (outlineExists && !this.contextLoaded) {
        await this.loadProjectOutline(projectOutlinePath);
        this.contextLoaded = true;
        debugLog('PROJECT_OUTLINE.md loaded during initialization');
      }
      
      // Then check for context folder
      const contextPath = path.join(process.cwd(), 'context');
      const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
      
      if (contextExists && !this.contextLoaded) {
        await this.loadProjectContext(contextPath);
        debugLog('Context preloaded during initialization');
      }
    } catch (error) {
      debugLog('Context preload failed:', error);
    }
  }

  private async loadProjectOutline(outlinePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(outlinePath, 'utf-8');
      if (content.trim()) {
        // Add to stable prefix for KV-cache optimization
        this.stableContextPrefix.push({
          role: 'system',
          content: `PROJECT OUTLINE loaded from PROJECT_OUTLINE.md:\n\n${content}`
        });
        
        // Rebuild messages with new stable prefix
        const conversationHistory = this.messages.slice(this.stableContextPrefix.length - 1);
        this.messages = [...this.stableContextPrefix, ...conversationHistory];
        
        debugLog('Loaded PROJECT_OUTLINE.md');
      }
    } catch (error) {
      debugLog('Failed to load PROJECT_OUTLINE.md:', error);
    }
  }

  private async checkAndSuggestContextFolder(): Promise<void> {
    try {
      const contextPath = path.join(process.cwd(), 'context');
      const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
      
      if (!contextExists && !this.contextLoaded) {
        // Automatically initialize context folder - this is MANDATORY
        debugLog('No context folder found. Automatically initializing...');
        
        // Import the initialize context function
        const { initializeContext } = await import('../tools/tools.js');
        const result = await initializeContext(process.cwd());
        
        if (result.success) {
          debugLog('Context folder initialized successfully');
          // Add success message to context
          this.stableContextPrefix.push({
            role: 'system',
            content: `CONTEXT INITIALIZED: Ani Code has automatically created a /context folder to track project knowledge. This context will be continuously updated as I learn about your codebase.`
          });
          
          // Now load the newly created context
          await this.loadProjectContext(contextPath);
        } else {
          debugLog('Failed to initialize context folder:', result.error);
        }
      } else if (contextExists && !this.contextLoaded) {
        // Context exists, load it!
        await this.loadProjectContext(contextPath);
        
        // Check if PROJECT_OUTLINE.md also exists and load it
        const projectOutlinePath = path.join(process.cwd(), 'PROJECT_OUTLINE.md');
        const outlineExists = await fs.promises.access(projectOutlinePath).then(() => true).catch(() => false);
        if (outlineExists) {
          await this.loadProjectOutline(projectOutlinePath);
        }
      }
    } catch (error) {
      debugLog('Context initialization error:', error);
    }
  }

  private async loadProjectContext(contextPath: string): Promise<void> {
    try {
      const contextFiles = [
        'PROJECT.md',
        'ARCHITECTURE.md',
        'DEVELOPMENT.md',
        'CONVENTIONS.md',
        'AGENT_MEMORY.md'
      ];

      let contextContent = '# PROJECT CONTEXT\n\n';
      let loadedFiles = [];

      for (const file of contextFiles) {
        const filePath = path.join(contextPath, file);
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          if (content.trim()) {
            contextContent += `## ${file}\n\n${content}\n\n---\n\n`;
            loadedFiles.push(file);
          }
        } catch (err) {
          // File doesn't exist or can't be read, skip it
          debugLog(`Couldn't read ${file}:`, err);
        }
      }

      if (loadedFiles.length > 0) {
        // Add to stable prefix for KV-cache optimization
        this.stableContextPrefix.push({
          role: 'system',
          content: `LOADED PROJECT CONTEXT from: ${loadedFiles.join(', ')}\n\n${contextContent}`
        });
        
        // Rebuild messages with new stable prefix (append-only)
        const conversationHistory = this.messages.slice(this.stableContextPrefix.length - 1);
        this.messages = [...this.stableContextPrefix, ...conversationHistory];
        
        this.contextLoaded = true;
        debugLog('Loaded context files:', loadedFiles);
      }
    } catch (error) {
      debugLog('Failed to load project context:', error);
    }
  }
}

// Debug utilities
let debugEnabled = false;
const DEBUG_LOG_FILE = path.join(process.cwd(), 'debug-agent.log');

function debugLog(message: string, data?: any) {
  if (!debugEnabled) return;
  fs.appendFileSync(DEBUG_LOG_FILE, `[${new Date().toISOString()}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n`);
}
