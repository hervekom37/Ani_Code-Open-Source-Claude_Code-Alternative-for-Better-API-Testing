import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, createDirectory, displayTree } from '../utils/file-ops.js';
import { setReadFilesTracker } from './validators.js';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  content?: any;
  data?: any;
  message?: string;
  error?: string;
}

interface TaskUpdate {
  id: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  updated_at?: string;
}

// Global task state
let currentTaskList: {
  user_query: string;
  tasks: Task[];
  created_at: string;
} | null = null;

// Track which files have been read in the current session
const readFiles = new Set<string>();

// Export readFiles for validator access
export function getReadFilesTracker(): Set<string> {
  return readFiles;
}

// Initialize validator with readFiles tracker
setReadFilesTracker(readFiles);

/**
 * Format key parameters for tool call display
 */
export function formatToolParams(toolName: string, toolArgs: Record<string, any>, options: { includePrefix?: boolean; separator?: string } = {}): string {
  const { includePrefix = true, separator = '=' } = options;
  
  const paramMappings: Record<string, string[]> = {
    read_file: ['file_path'],
    create_file: ['file_path'],
    edit_file: ['file_path'],
    delete_file: ['file_path'],
    list_files: ['directory'],
    search_files: ['pattern'],
    execute_command: ['command'],
    create_tasks: [],
    update_tasks: [],
    initialize_context: ['project_path'],
    analyze_context: ['project_path'],
    check_context_health: ['project_path'],
    update_agent_memory: ['learning', 'category'],
  };

  const keyParams = paramMappings[toolName] || [];

  if (keyParams.length === 0) {
    return '';
  }

  const paramParts = keyParams
    .filter(param => param in toolArgs)
    .map(param => {
      let value = toolArgs[param];
      // Truncate long values
      if (typeof value === 'string' && value.length > 50) {
        value = value.substring(0, 47) + '...';
      } else if (Array.isArray(value) && value.length > 3) {
        value = `[${value.length} items]`;
      }
      return `${param}${separator}${JSON.stringify(value)}`;
    });

  if (paramParts.length === 0) {
    return includePrefix ? `Arguments: ${JSON.stringify(toolArgs)}` : JSON.stringify(toolArgs);
  }

  const formattedParams = paramParts.join(', ');
  return includePrefix ? `Parameters: ${formattedParams}` : formattedParams;
}

/**
 * Create a standardized tool response format
 */
export function createToolResponse(success: boolean, data?: any, message: string = '', error: string = ''): ToolResult {
  const response: ToolResult = { success };

  if (success) {
    if (data !== undefined) {
      response.content = data;
    }
    if (message) {
      response.message = message;
    }
  } else {
    response.error = error;
    if (message) {
      response.message = message;
    }
  }

  return response;
}

/**
 * Read the contents of a file, optionally specifying line range
 */
export async function readFile(filePath: string, startLine?: number, endLine?: number): Promise<ToolResult> {
  try {
    const resolvedPath = path.resolve(filePath);

    // Check if file exists
    try {
      await fs.promises.access(resolvedPath);
    } catch {
      return createToolResponse(false, undefined, '', 'Error: File not found');
    }

    const stats = await fs.promises.stat(resolvedPath);
    if (!stats.isFile()) {
      return createToolResponse(false, undefined, '', 'Error: Path is not a file');
    }

    // Check file size (50MB limit)
    if (stats.size > 50 * 1024 * 1024) {
      return createToolResponse(false, undefined, '', 'Error: File too large (max 50MB)');
    }

    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    const lines = content.split('\n');

    // Handle line range if specified
    if (startLine !== undefined) {
      const startIdx = Math.max(0, startLine - 1); // Convert to 0-indexed
      let endIdx = lines.length;

      if (endLine !== undefined) {
        endIdx = Math.min(lines.length, endLine);
      }

      if (startIdx >= lines.length) {
        return createToolResponse(false, undefined, '', 'Error: Start line exceeds file length');
      }

      const selectedLines = lines.slice(startIdx, endIdx);
      const selectedContent = selectedLines.join('\n');
      // Add file to read tracking for partial reads too
      readFiles.add(resolvedPath);
      const message = `Read lines ${startLine}-${endIdx} from ${filePath}`;

      return createToolResponse(true, selectedContent, message);
    } else {
      // Add file to read tracking
      readFiles.add(resolvedPath);
      const message = `Read ${lines.length} lines from ${filePath}`;
      return createToolResponse(true, content, message);
    }

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return createToolResponse(false, undefined, '', 'Error: File not found');
    }
    return createToolResponse(false, undefined, '', 'Error: Failed to read file');
  }
}

/**
 * Create a new file or directory with specified content
 */
export async function createFile(filePath: string, content: string, fileType: string = 'file', overwrite: boolean = false): Promise<ToolResult> {
  try {
    // Validate required parameters
    if (!filePath) {
      return createToolResponse(false, undefined, '', 'Error: file_path is required');
    }
    
    // For files, content is required. For directories, default to empty string
    if (fileType === 'file' && content === undefined) {
      return createToolResponse(false, undefined, '', 'Error: content is required for file creation');
    }
    
    // Default content to empty string if not provided (useful for directories)
    if (content === undefined) {
      content = '';
    }
    
    const targetPath = path.resolve(filePath);

    // Check if file exists and handle overwrite
    const exists = await fs.promises.access(targetPath).then(() => true).catch(() => false);
    if (exists && !overwrite) {
      return createToolResponse(false, undefined, '', 'Error: File already exists, use overwrite=true');
    }

    if (fileType === 'directory') {
      const result = await createDirectory(targetPath);
      if (result) {
        return createToolResponse(true, { path: targetPath, type: 'directory' }, `Directory created: ${filePath}`);
      } else {
        return createToolResponse(false, undefined, '', 'Error: Failed to create directory');
      }
    } else if (fileType === 'file') {
      const result = await writeFile(targetPath, content, overwrite, true);
      if (result === true) {
        return createToolResponse(true, undefined, `File created: ${filePath}`);
      } else {
        const errorMsg = typeof result === 'string' ? result : 'Failed to create file';
        return createToolResponse(false, undefined, '', `Error: ${errorMsg}`);
      }
    } else {
      return createToolResponse(false, undefined, '', "Error: Invalid file_type, must be 'file' or 'directory'");
    }

  } catch (error: any) {
    const errorMsg = error.message || 'Failed to create file or directory';
    return createToolResponse(false, undefined, '', `Error: ${errorMsg}`);
  }
}

/**
 * Edit a file by replacing exact text strings
 * Note: Arguments are pre-validated by the validation system before this function is called
 */
export async function editFile(filePath: string, oldText: string, newText: string, replaceAll: boolean = false): Promise<ToolResult> {
  try {
    const resolvedPath = path.resolve(filePath);

    // Read current content (validation already confirmed file exists and was read)
    const originalContent = await fs.promises.readFile(resolvedPath, 'utf-8');

    // Special case: if the file is empty and oldText is empty, just set the new content
    let updatedContent: string;
    if (originalContent === '' && oldText === '') {
      updatedContent = newText;
    } else if (replaceAll) {
      updatedContent = originalContent.split(oldText).join(newText);
    } else {
      updatedContent = originalContent.replace(oldText, newText);
    }
    
    // Check if any replacement was made
    if (updatedContent === originalContent && originalContent !== '') {
      return createToolResponse(false, undefined, '', 'Error: No matching text found to replace');
    }

    // Write the updated content
    const result = await writeFile(filePath, updatedContent, true, true);
    if (result) {
      const replacementCount = replaceAll ? 
        (originalContent.split(oldText).length - 1) : 1;
      return createToolResponse(true, undefined, `Replaced ${replacementCount} occurrence(s) in ${filePath}`);
    } else {
      return createToolResponse(false, undefined, '', 'Error: Failed to write changes to file');
    }

  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to edit file - ${error}`);
  }
}

/**
 * Delete a file or directory with safety checks
 */
export async function deleteFile(filePath: string, recursive: boolean = false): Promise<ToolResult> {
  try {
    const targetPath = path.resolve(filePath);
    const currentWorkingDir = path.resolve(process.cwd());

    // Safety check 1: Never delete the root directory itself
    if (targetPath === currentWorkingDir) {
      return createToolResponse(false, undefined, '', 'Error: Cannot delete the root project directory');
    }

    // Safety check 2: Never delete anything outside the current working directory
    if (!targetPath.startsWith(currentWorkingDir)) {
      return createToolResponse(false, undefined, '', 'Error: Cannot delete files outside the project directory');
    }

    const exists = await fs.promises.access(targetPath).then(() => true).catch(() => false);
    if (!exists) {
      return createToolResponse(false, undefined, '', 'Error: Path not found');
    }

    const stats = await fs.promises.stat(targetPath);
    if (stats.isDirectory() && !recursive) {
      // Check if directory is empty
      const items = await fs.promises.readdir(targetPath);
      if (items.length > 0) {
        return createToolResponse(false, undefined, '', 'Error: Directory not empty, use recursive=true');
      }
    }

    // Perform deletion
    if (stats.isDirectory()) {
      await fs.promises.rmdir(targetPath, { recursive });
    } else {
      await fs.promises.unlink(targetPath);
    }

    const fileType = stats.isDirectory() ? 'directory' : 'file';
    return createToolResponse(true, undefined, `Deleted ${fileType}: ${filePath}`);

  } catch (error) {
    return createToolResponse(false, undefined, '', 'Error: Failed to delete');
  }
}

/**
 * List files and directories in a path with tree-style display
 */
export async function listFiles(directory: string = '.', pattern: string = '*', recursive: boolean = false, showHidden: boolean = false): Promise<ToolResult> {
  try {
    const dirPath = path.resolve(directory);

    const exists = await fs.promises.access(dirPath).then(() => true).catch(() => false);
    if (!exists) {
      return createToolResponse(false, undefined, '', 'Error: Directory not found');
    }

    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      return createToolResponse(false, undefined, '', 'Error: Path is not a directory');
    }

    // Get tree display output
    const treeOutput = await displayTree(directory, pattern, recursive, showHidden);

    return createToolResponse(true, treeOutput, `Listed ${directory}`);

  } catch (error) {
    return createToolResponse(false, undefined, '', 'Error: Failed to list files');
  }
}

/**
 * Search for text patterns in files with advanced filtering and matching options
 */
export async function searchFiles(
  pattern: string,
  filePattern: string = '*',
  directory: string = '.',
  caseSensitive: boolean = false,
  patternType: 'substring' | 'regex' | 'exact' | 'fuzzy' = 'substring',
  fileTypes?: string[],
  excludeDirs?: string[],
  excludeFiles?: string[],
  maxResults: number = 100,
  contextLines: number = 0,
  groupByFile: boolean = false
): Promise<ToolResult> {
  try {
    const searchDir = path.resolve(directory);

    // Check if directory exists
    const exists = await fs.promises.access(searchDir).then(() => true).catch(() => false);
    if (!exists) {
      return createToolResponse(false, undefined, '', 'Error: Directory not found');
    }

    const stats = await fs.promises.stat(searchDir);
    if (!stats.isDirectory()) {
      return createToolResponse(false, undefined, '', 'Error: Path is not a directory');
    }

    // Default exclusions
    const defaultExcludeDirs = ['.git', 'node_modules', '.next', 'dist', 'build', '.cache'];
    const defaultExcludeFiles = ['*.log', '*.tmp', '*.cache', '*.lock'];
    
    const finalExcludeDirs = [...defaultExcludeDirs, ...(excludeDirs || [])];
    const finalExcludeFiles = [...defaultExcludeFiles, ...(excludeFiles || [])];

    // Prepare search regex
    let searchRegex: RegExp;
    try {
      switch (patternType) {
        case 'exact':
          searchRegex = new RegExp(escapeRegex(pattern), caseSensitive ? 'g' : 'gi');
          break;
        case 'regex':
          searchRegex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
          break;
        case 'fuzzy':
          // Simple fuzzy search, insert .* between characters
          const fuzzyPattern = pattern.split('').map(escapeRegex).join('.*');
          searchRegex = new RegExp(fuzzyPattern, caseSensitive ? 'g' : 'gi');
          break;
        case 'substring':
        default:
          searchRegex = new RegExp(escapeRegex(pattern), caseSensitive ? 'g' : 'gi');
          break;
      }
    } catch (error) {
      return createToolResponse(false, undefined, '', 'Error: Invalid regex pattern');
    }

    // Collect all files to search
    const filesToSearch = await collectFiles(searchDir, filePattern, fileTypes, finalExcludeDirs, finalExcludeFiles);

    if (filesToSearch.length === 0) {
      return createToolResponse(true, [], 'No files found matching criteria');
    }

    // Search through files
    const results: SearchResult[] = [];
    let totalMatches = 0;

    for (const filePath of filesToSearch) {
      if (totalMatches >= maxResults) {
        break;
      }

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const fileMatches: SearchMatch[] = [];

        for (let i = 0; i < lines.length && totalMatches < maxResults; i++) {
          const line = lines[i];
          const matches = Array.from(line.matchAll(searchRegex));

          if (matches.length > 0) {
            const contextStart = Math.max(0, i - contextLines);
            const contextEnd = Math.min(lines.length - 1, i + contextLines);
            
            const contextLinesArray: string[] = [];
            for (let j = contextStart; j <= contextEnd; j++) {
              contextLinesArray.push(lines[j]);
            }

            fileMatches.push({
              lineNumber: i + 1,
              lineContent: line,
              contextLines: contextLines > 0 ? contextLinesArray : undefined,
              matchPositions: matches.map(match => ({
                start: match.index || 0,
                end: (match.index || 0) + match[0].length,
                text: match[0]
              }))
            });

            totalMatches++;
          }
        }

        if (fileMatches.length > 0) {
          results.push({
            filePath: path.relative(process.cwd(), filePath),
            matches: fileMatches,
            totalMatches: fileMatches.length
          });
        }

      } catch (error) {
        // Skip files that can't be read (binary files, permission issues, etc.)
        continue;
      }
    }

    // Format results
    let formattedResults: any;
    if (groupByFile) {
      formattedResults = results;
    } else {
      // Flatten results
      formattedResults = results.flatMap(fileResult => 
        fileResult.matches.map(match => ({
          filePath: fileResult.filePath,
          lineNumber: match.lineNumber,
          lineContent: match.lineContent,
          contextLines: match.contextLines,
          matchPositions: match.matchPositions
        }))
      );
    }

    const message = `Found ${totalMatches} match(es) in ${results.length} file(s)`;
    return createToolResponse(true, formattedResults, message);

  } catch (error) {
    return createToolResponse(false, undefined, '', 'Error: Failed to search files');
  }
}

// Helper interfaces for search results
interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  contextLines?: string[];
  matchPositions: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

interface SearchResult {
  filePath: string;
  matches: SearchMatch[];
  totalMatches: number;
}

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to collect files based on patterns and filters
async function collectFiles(
  directory: string,
  filePattern: string,
  fileTypes?: string[],
  excludeDirs?: string[],
  excludeFiles?: string[]
): Promise<string[]> {
  const files: string[] = [];

  async function walkDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Check if directory should be excluded
          if (excludeDirs && excludeDirs.some(pattern => matchesPattern(entry.name, pattern))) {
            continue;
          }
          // Skip hidden directories unless explicitly included
          if (entry.name.startsWith('.') && !entry.name.match(/^\.(config|env)$/)) {
            continue;
          }
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check file type filters
          if (fileTypes && fileTypes.length > 0) {
            const ext = path.extname(entry.name).slice(1);
            if (!fileTypes.includes(ext)) {
              continue;
            }
          }

          // Check file pattern
          if (!matchesPattern(entry.name, filePattern)) {
            continue;
          }

          // Check exclusions
          if (excludeFiles && excludeFiles.some(pattern => matchesPattern(entry.name, pattern))) {
            continue;
          }

          // Skip obviously binary files
          if (isBinaryFile(entry.name)) {
            continue;
          }

          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await walkDirectory(directory);
  return files;
}

// Helper function to match glob-like patterns
function matchesPattern(filename: string, pattern: string): boolean {
  if (pattern === '*') return true;
  
  // Simple glob matching, convert * to .* and ? to .
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(`^${regexPattern}$`, 'i').test(filename);
}

// Helper function to detect binary files
function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ];
  
  const ext = path.extname(filename).toLowerCase();
  return binaryExtensions.includes(ext);
}


/**
 * Execute a shell command or run code
 */
export async function executeCommand(command: string, commandType: string, workingDirectory?: string, timeout: number = 30000): Promise<ToolResult> {
  try {
    // Validate command type
    if (!['bash', 'python', 'setup', 'run'].includes(commandType)) {
      return createToolResponse(false, undefined, '', 'Error: Invalid command_type');
    }

    let originalCwd: string | undefined;
    if (workingDirectory) {
      const wdPath = path.resolve(workingDirectory);
      const exists = await fs.promises.access(wdPath).then(() => true).catch(() => false);
      if (!exists) {
        return createToolResponse(false, undefined, '', 'Error: Working directory not found');
      }
      originalCwd = process.cwd();
      process.chdir(workingDirectory);
    }

    try {
      let execCommand: string;
      if (commandType === 'python') {
        execCommand = `python -c "${command.replace(/"/g, '\\"')}"`;
      } else {
        execCommand = command;
      }

      const { stdout, stderr } = await execAsync(execCommand, { timeout });
      const success = true; // If no error was thrown, consider it successful

      return createToolResponse(
        success,
        `stdout: ${stdout}\nstderr: ${stderr}`,
        `Command executed successfully`
      );

    } finally {
      // Restore original working directory
      if (originalCwd) {
        process.chdir(originalCwd);
      }
    }

  } catch (error: any) {
    const isTimeout = error.killed && error.signal === 'SIGTERM';
    if (isTimeout) {
      return createToolResponse(false, undefined, '', 'Error: Command timed out');
    }
    return createToolResponse(false, undefined, '', 'Error: Failed to execute command');
  }
}

/**
 * Create a task list of subtasks to complete the user's request
 */
export async function createTasks(userQuery: string, tasks: Task[]): Promise<ToolResult> {
  try {
    // Validate task structure
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task.id || !task.description) {
        return createToolResponse(false, undefined, '', `Error: Task ${i} missing required fields (id, description)`);
      }

      // Set default status if not provided
      if (!task.status) {
        task.status = 'pending';
      }

      // Validate status
      if (!['pending', 'in_progress', 'completed'].includes(task.status)) {
        return createToolResponse(false, undefined, '', `Error: Invalid status '${task.status}' for task ${task.id}`);
      }
    }

    // Store the task list globally
    currentTaskList = {
      user_query: userQuery,
      tasks: tasks,
      created_at: new Date().toISOString()
    };


    // Return a deep copy to prevent mutation of historical displays
    const snapshot = {
      user_query: currentTaskList.user_query,
      tasks: currentTaskList.tasks.map(task => ({ ...task })),
      created_at: currentTaskList.created_at
    };

    return createToolResponse(
      true,
      snapshot,
      `Created task list with ${tasks.length} tasks for: ${userQuery}`
    );

  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to create tasks - ${error}`);
  }
}

/**
 * Update the status of one or more tasks in the task list
 */
export async function updateTasks(taskUpdates: TaskUpdate[]): Promise<ToolResult> {
  try {
    if (!currentTaskList) {
      return createToolResponse(false, undefined, '', 'Error: No task list exists. Create tasks first.');
    }

    // Track updates made
    const updatesMade: Array<{
      id: string;
      description: string;
      old_status: string;
      new_status: string;
    }> = [];

    for (const update of taskUpdates) {
      if (!update.id || !update.status) {
        return createToolResponse(false, undefined, '', 'Error: Task update missing required fields (id, status)');
      }

      // Validate status
      if (!['pending', 'in_progress', 'completed'].includes(update.status)) {
        return createToolResponse(false, undefined, '', `Error: Invalid status '${update.status}'`);
      }

      // Find and update the task
      let taskFound = false;
      for (const task of currentTaskList.tasks) {
        if (task.id === update.id) {
          const oldStatus = task.status;
          task.status = update.status;

          // Add notes if provided
          if (update.notes) {
            task.notes = update.notes;
          }

          // Add update timestamp
          task.updated_at = new Date().toISOString();

          updatesMade.push({
            id: update.id,
            description: task.description,
            old_status: oldStatus,
            new_status: update.status
          });
          taskFound = true;
          break;
        }
      }

      if (!taskFound) {
        return createToolResponse(false, undefined, '', `Error: Task '${update.id}' not found`);
      }
    }

    // Return a deep copy to prevent mutation of historical displays
    const snapshot = {
      user_query: currentTaskList.user_query,
      tasks: currentTaskList.tasks.map(task => ({ ...task })),
      created_at: currentTaskList.created_at
    };

    return createToolResponse(
      true,
      snapshot,
      `Updated ${updatesMade.length} task(s)`
    );

  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to update tasks - ${error}`);
  }
}

/**
 * Initialize context engineering for a project
 */
export async function initializeContext(projectPath: string = process.cwd()): Promise<ToolResult> {
  try {
    const contextPath = path.join(projectPath, 'context');
    
    // Check if context folder already exists
    const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
    if (contextExists) {
      return createToolResponse(false, undefined, '', 'Context folder already exists. Use analyze_context to update.');
    }
    
    // Create context directory
    await createDirectory(contextPath);
    
    // Create essential context files with templates
    const files = [
      {
        path: 'PROJECT.md',
        content: `# Project Overview

## Mission Statement
[Brief description of what this project does and why it exists]

## Current Status
- Version: 0.1.0
- Stage: Development
- Last Updated: ${new Date().toISOString().split('T')[0]}

## Key Features
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

## Technology Stack
- Language: [e.g., TypeScript, Python]
- Framework: [e.g., React, Django]
- Database: [e.g., PostgreSQL, MongoDB]

## Quick Links
- [Architecture](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Conventions](./CONVENTIONS.md)

## Team
- Tech Lead: [Name/Handle]
- Contributors: [List main contributors]
`
      },
      {
        path: 'ARCHITECTURE.md',
        content: `# Architecture

## System Overview
[High-level description of the system architecture]

## Design Principles
1. [Principle 1]
2. [Principle 2]
3. [Principle 3]

## Component Structure
\`\`\`
project/
├── src/
│   ├── components/
│   ├── services/
│   └── utils/
└── tests/
\`\`\`

## Data Flow
[Describe how data flows through the system]

## Key Components
### Component 1
- Purpose: 
- Location: 
- Dependencies: 

### Component 2
- Purpose: 
- Location: 
- Dependencies: 

## External Integrations
[List and describe external services/APIs]
`
      },
      {
        path: 'DEVELOPMENT.md',
        content: `# Development Guide

## Prerequisites
- [List required tools and versions]

## Setup Instructions
\`\`\`bash
# Clone the repository
git clone [repository-url]
cd [project-name]

# Install dependencies
[installation commands]

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run development server
[dev server command]
\`\`\`

## Development Workflow
1. Create feature branch
2. Make changes
3. Run tests
4. Submit PR

## Testing
\`\`\`bash
# Run all tests
[test command]

# Run specific test
[specific test command]
\`\`\`

## Common Tasks
### Adding a New Feature
1. [Step 1]
2. [Step 2]

### Debugging
- [Debugging tip 1]
- [Debugging tip 2]

## Deployment
[Deployment instructions]
`
      },
      {
        path: 'CONVENTIONS.md',
        content: `# Code Conventions

## General Principles
1. Readability > Cleverness
2. Consistency > Personal Preference
3. Explicit > Implicit

## Naming Conventions
- Files: [convention]
- Functions: [convention]
- Variables: [convention]
- Classes/Components: [convention]

## Code Style
[Describe code style guidelines]

## File Structure
[Describe how files should be organized]

## Git Workflow
### Branch Naming
- feature/[description]
- bugfix/[description]
- hotfix/[description]

### Commit Messages
- feat: [description]
- fix: [description]
- docs: [description]
- refactor: [description]

## Testing Standards
[Describe testing requirements and patterns]
`
      },
      {
        path: 'AGENT_MEMORY.md',
        content: `# Agent Memory

This file contains learnings and patterns discovered by AI agents while working on this project.

## Discovered Patterns
*No patterns recorded yet*

## Common Issues
*No issues recorded yet*

## Performance Notes
*No performance notes yet*

## Integration Details
*No integration details yet*

---
*Last updated: ${new Date().toISOString().split('T')[0]}*
`
      }
    ];
    
    // Create all context files
    for (const file of files) {
      const filePath = path.join(contextPath, file.path);
      await writeFile(filePath, file.content);
    }
    
    // Create .context-metadata.json
    const metadata = {
      version: "1.0.0",
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      files: files.map(f => f.path)
    };
    await writeFile(
      path.join(contextPath, '.context-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    return createToolResponse(
      true,
      { created: files.map(f => f.path), path: contextPath },
      `Context folder initialized successfully at ${contextPath}`
    );
    
  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to initialize context - ${error}`);
  }
}

/**
 * Analyze project and update context documentation
 */
export async function analyzeContext(projectPath: string = process.cwd()): Promise<ToolResult> {
  try {
    const contextPath = path.join(projectPath, 'context');
    
    // Check if context folder exists
    const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
    if (!contextExists) {
      return createToolResponse(false, undefined, '', 'No context folder found. Run initialize_context first.');
    }
    
    // Analyze project structure
    const analysis = {
      languages: new Set<string>(),
      frameworks: new Set<string>(),
      totalFiles: 0,
      structure: {} as Record<string, number>,
      dependencies: {} as Record<string, string[]>
    };
    
    // Read package.json if exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.promises.access(packageJsonPath).then(() => true).catch(() => false)) {
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
      analysis.dependencies.npm = Object.keys(packageJson.dependencies || {});
      analysis.frameworks.add('Node.js');
    }
    
    // Scan project files
    const files = await collectFiles(projectPath, '*', undefined, ['node_modules', '.git', 'dist', 'build', 'context']);
    analysis.totalFiles = files.length;
    
    for (const file of files) {
      const ext = path.extname(file);
      const relPath = path.relative(projectPath, file);
      const topDir = relPath.split(path.sep)[0];
      
      // Track file extensions
      if (ext) {
        analysis.structure[ext] = (analysis.structure[ext] || 0) + 1;
        
        // Identify languages
        if (['.ts', '.tsx'].includes(ext)) analysis.languages.add('TypeScript');
        if (['.js', '.jsx'].includes(ext)) analysis.languages.add('JavaScript');
        if (['.py'].includes(ext)) analysis.languages.add('Python');
        if (['.java'].includes(ext)) analysis.languages.add('Java');
        if (['.go'].includes(ext)) analysis.languages.add('Go');
        if (['.rs'].includes(ext)) analysis.languages.add('Rust');
      }
      
      // Detect frameworks from file patterns
      if (relPath.includes('pages/') || relPath.includes('app/')) analysis.frameworks.add('Next.js');
      if (relPath.includes('components/') && ext === '.tsx') analysis.frameworks.add('React');
      if (relPath.includes('django') || relPath.includes('manage.py')) analysis.frameworks.add('Django');
    }
    
    // Generate insights
    const insights = {
      primaryLanguage: Array.from(analysis.languages)[0] || 'Unknown',
      frameworks: Array.from(analysis.frameworks),
      projectType: analysis.frameworks.has('React') ? 'Frontend' : 
                   analysis.frameworks.has('Django') ? 'Backend' :
                   analysis.frameworks.has('Next.js') ? 'Full-stack' : 'General',
      totalFiles: analysis.totalFiles,
      mainFileTypes: Object.entries(analysis.structure)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ext, count]) => `${ext} (${count} files)`)
    };
    
    // Update AGENT_MEMORY.md with analysis
    const agentMemoryPath = path.join(contextPath, 'AGENT_MEMORY.md');
    const currentMemory = await fs.promises.readFile(agentMemoryPath, 'utf-8');
    const updatedMemory = currentMemory.replace(
      '*Last updated:*',
      `## Project Analysis (${new Date().toISOString().split('T')[0]})
- Primary Language: ${insights.primaryLanguage}
- Frameworks: ${insights.frameworks.join(', ')}
- Project Type: ${insights.projectType}
- Total Files: ${insights.totalFiles}
- Main File Types: ${insights.mainFileTypes.join(', ')}

---
*Last updated: ${new Date().toISOString().split('T')[0]}*`
    );
    await writeFile(agentMemoryPath, updatedMemory);
    
    // Update metadata
    const metadataPath = path.join(contextPath, '.context-metadata.json');
    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
    metadata.lastUpdated = new Date().toISOString();
    metadata.analysis = insights;
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return createToolResponse(
      true,
      insights,
      `Context analysis completed. Updated AGENT_MEMORY.md with project insights.`
    );
    
  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to analyze context - ${error}`);
  }
}

/**
 * Check context health and freshness
 */
export async function checkContextHealth(projectPath: string = process.cwd()): Promise<ToolResult> {
  try {
    const contextPath = path.join(projectPath, 'context');
    
    // Check if context folder exists
    const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
    if (!contextExists) {
      return createToolResponse(false, undefined, '', 'No context folder found. Run initialize_context first.');
    }
    
    const health = {
      status: 'healthy' as 'healthy' | 'warning' | 'critical',
      issues: [] as string[],
      recommendations: [] as string[],
      fileStatus: {} as Record<string, any>
    };
    
    // Check essential files
    const essentialFiles = ['PROJECT.md', 'ARCHITECTURE.md', 'DEVELOPMENT.md', 'CONVENTIONS.md', 'AGENT_MEMORY.md'];
    
    for (const file of essentialFiles) {
      const filePath = path.join(contextPath, file);
      const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      
      if (!exists) {
        health.status = 'critical';
        health.issues.push(`Missing essential file: ${file}`);
        health.recommendations.push(`Create ${file} to document ${file.replace('.md', '').toLowerCase()} information`);
        continue;
      }
      
      // Check file age and size
      const stats = await fs.promises.stat(filePath);
      const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      const sizeInKB = stats.size / 1024;
      
      health.fileStatus[file] = {
        exists: true,
        lastModified: stats.mtime.toISOString(),
        ageInDays: Math.round(ageInDays),
        sizeInKB: Math.round(sizeInKB * 10) / 10
      };
      
      // Check if file is too old
      if (ageInDays > 30) {
        if (health.status === 'healthy') health.status = 'warning';
        health.issues.push(`${file} hasn't been updated in ${Math.round(ageInDays)} days`);
        health.recommendations.push(`Review and update ${file} to reflect current project state`);
      }
      
      // Check if file is too small (likely template)
      if (sizeInKB < 1) {
        if (health.status === 'healthy') health.status = 'warning';
        health.issues.push(`${file} appears to be mostly empty (${sizeInKB}KB)`);
        health.recommendations.push(`Add meaningful content to ${file}`);
      }
    }
    
    // Check metadata
    const metadataPath = path.join(contextPath, '.context-metadata.json');
    if (await fs.promises.access(metadataPath).then(() => true).catch(() => false)) {
      const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
      const metadataAge = (Date.now() - new Date(metadata.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      
      if (metadataAge > 7) {
        health.recommendations.push('Run analyze_context to refresh project analysis');
      }
    }
    
    // Generate summary
    const summary = {
      health: health.status,
      totalIssues: health.issues.length,
      files: health.fileStatus,
      issues: health.issues,
      recommendations: health.recommendations
    };
    
    return createToolResponse(
      true,
      summary,
      `Context health check complete. Status: ${health.status.toUpperCase()}`
    );
    
  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to check context health - ${error}`);
  }
}

/**
 * Update agent memory with new learnings (append-only)
 */
export async function updateAgentMemory(
  learning: string,
  category: 'pattern' | 'issue' | 'performance' | 'integration' | 'general' = 'general',
  projectPath: string = process.cwd()
): Promise<ToolResult> {
  try {
    const contextPath = path.join(projectPath, 'context');
    const agentMemoryPath = path.join(contextPath, 'AGENT_MEMORY.md');
    
    // Check if context exists
    const contextExists = await fs.promises.access(contextPath).then(() => true).catch(() => false);
    if (!contextExists) {
      return createToolResponse(false, undefined, '', 'No context folder found. Run initialize_context first.');
    }
    
    // Check if AGENT_MEMORY.md exists
    const memoryExists = await fs.promises.access(agentMemoryPath).then(() => true).catch(() => false);
    if (!memoryExists) {
      return createToolResponse(false, undefined, '', 'AGENT_MEMORY.md not found in context folder.');
    }
    
    // Read current content
    const currentContent = await fs.promises.readFile(agentMemoryPath, 'utf-8');
    
    // Prepare the new entry
    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];
    
    let categorySection = '';
    switch (category) {
      case 'pattern':
        categorySection = '## Discovered Patterns';
        break;
      case 'issue':
        categorySection = '## Common Issues';
        break;
      case 'performance':
        categorySection = '## Performance Notes';
        break;
      case 'integration':
        categorySection = '## Integration Details';
        break;
      default:
        categorySection = '## General Learnings';
    }
    
    // Create the new entry
    const newEntry = `\n### ${date} - ${timestamp}\n${learning}\n`;
    
    // Find the section or create it
    let updatedContent = currentContent;
    const sectionIndex = updatedContent.indexOf(categorySection);
    
    if (sectionIndex !== -1) {
      // Find the next section (## ) after this one
      const nextSectionMatch = updatedContent.slice(sectionIndex + categorySection.length).match(/\n##\s/);
      const insertPosition = nextSectionMatch && nextSectionMatch.index !== undefined
        ? sectionIndex + categorySection.length + nextSectionMatch.index
        : updatedContent.indexOf('\n---\n*Last updated:', sectionIndex);
      
      if (insertPosition !== -1) {
        // Insert the new entry
        updatedContent = 
          updatedContent.slice(0, insertPosition) + 
          newEntry + 
          updatedContent.slice(insertPosition);
      } else {
        // Append before the end
        const lastUpdateIndex = updatedContent.lastIndexOf('\n---\n*Last updated:');
        updatedContent = 
          updatedContent.slice(0, lastUpdateIndex) + 
          newEntry + 
          updatedContent.slice(lastUpdateIndex);
      }
    } else {
      // Add the new section
      const lastUpdateIndex = updatedContent.lastIndexOf('\n---\n*Last updated:');
      updatedContent = 
        updatedContent.slice(0, lastUpdateIndex) + 
        `\n${categorySection}\n${newEntry}` + 
        updatedContent.slice(lastUpdateIndex);
    }
    
    // Update the last updated timestamp
    updatedContent = updatedContent.replace(
      /\*Last updated:.*\*/,
      `*Last updated: ${date}*`
    );
    
    // Write back (append-only principle - we never remove old content)
    await writeFile(agentMemoryPath, updatedContent);
    
    return createToolResponse(
      true,
      { category, timestamp },
      `Learning recorded in AGENT_MEMORY.md under ${categorySection}`
    );
    
  } catch (error) {
    return createToolResponse(false, undefined, '', `Error: Failed to update agent memory - ${error}`);
  }
}

// Tool Registry: maps tool names to functions
export const TOOL_REGISTRY = {
  read_file: readFile,
  create_file: createFile,
  edit_file: editFile,
  delete_file: deleteFile,
  list_files: listFiles,
  search_files: searchFiles,
  execute_command: executeCommand,
  create_tasks: createTasks,
  update_tasks: updateTasks,
  initialize_context: initializeContext,
  analyze_context: analyzeContext,
  check_context_health: checkContextHealth,
  update_agent_memory: updateAgentMemory,
};

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(toolName: string, toolArgs: Record<string, any>): Promise<ToolResult> {
  if (!(toolName in TOOL_REGISTRY)) {
    return createToolResponse(false, undefined, '', 'Error: Unknown tool');
  }

  try {
    const toolFunction = (TOOL_REGISTRY as any)[toolName];
    
    // Call the function with the appropriate arguments based on the tool
    switch (toolName) {
      case 'read_file':
        return await toolFunction(toolArgs.file_path, toolArgs.start_line, toolArgs.end_line);
      case 'create_file':
        // Ensure content has a default value if not provided
        const content = toolArgs.content !== undefined ? toolArgs.content : '';
        return await toolFunction(toolArgs.file_path, content, toolArgs.file_type, toolArgs.overwrite);
      case 'edit_file':
        return await toolFunction(toolArgs.file_path, toolArgs.old_text, toolArgs.new_text, toolArgs.replace_all);
      case 'delete_file':
        return await toolFunction(toolArgs.file_path, toolArgs.recursive);
      case 'list_files':
        return await toolFunction(toolArgs.directory, toolArgs.pattern, toolArgs.recursive, toolArgs.show_hidden);
      case 'search_files':
        return await toolFunction(
          toolArgs.pattern,
          toolArgs.file_pattern,
          toolArgs.directory,
          toolArgs.case_sensitive,
          toolArgs.pattern_type,
          toolArgs.file_types,
          toolArgs.exclude_dirs,
          toolArgs.exclude_files,
          toolArgs.max_results,
          toolArgs.context_lines,
          toolArgs.group_by_file
        );
      case 'execute_command':
        return await toolFunction(toolArgs.command, toolArgs.command_type, toolArgs.working_directory, toolArgs.timeout);
      case 'create_tasks':
        return await toolFunction(toolArgs.user_query, toolArgs.tasks);
      case 'update_tasks':
        return await toolFunction(toolArgs.task_updates);
      case 'initialize_context':
        return await toolFunction(toolArgs.project_path);
      case 'analyze_context':
        return await toolFunction(toolArgs.project_path);
      case 'check_context_health':
        return await toolFunction(toolArgs.project_path);
      case 'update_agent_memory':
        return await toolFunction(toolArgs.learning, toolArgs.category, toolArgs.project_path);
      default:
        return createToolResponse(false, undefined, '', 'Error: Tool not implemented');
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return createToolResponse(false, undefined, '', 'Error: Invalid tool arguments');
    }
    return createToolResponse(false, undefined, '', 'Error: Unexpected tool error');
  }
}