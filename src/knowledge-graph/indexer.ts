import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import * as parser from '@babel/parser';
// Use namespace import for traverse types and default import for callable function
import traverseModule, { NodePath } from '@babel/traverse';
const traverse = (traverseModule as any).default ?? traverseModule as any;
import * as t from '@babel/types';
import { GraphDatabase } from './database.js';
import { 
  NodeType, 
  RelationType, 
  FileNode, 
  FunctionNode, 
  ClassNode,
  BaseNode,
  Relationship 
} from './schema.js';
import { getConfig } from './config.js';
import { generateId } from './utils.js';

export interface IndexingResult {
  filesIndexed: number;
  functionsFound: number;
  classesFound: number;
  relationshipsCreated: number;
  errors: string[];
  duration: number;
}

export class CodeIndexer {
  private db: GraphDatabase;
  private config = getConfig();
  private projectPath: string;

  constructor(projectPath: string) {
    this.db = new GraphDatabase();
    this.projectPath = projectPath;
  }

  async indexProject(): Promise<IndexingResult> {
    const startTime = Date.now();
    const result: IndexingResult = {
      filesIndexed: 0,
      functionsFound: 0,
      classesFound: 0,
      relationshipsCreated: 0,
      errors: [],
      duration: 0
    };

    try {
      await this.db.initialize();
      
      // Get all files to index
      const files = await this.getAllFiles(this.projectPath);
      console.log(`Found ${files.length} files to index`);

      // Process files in batches
      const batchSize = this.config.indexing.batchSize;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await this.processBatch(batch, result);
        console.log(`Processed ${Math.min(i + batchSize, files.length)}/${files.length} files`);
      }

      result.duration = Date.now() - startTime;
      console.log(`Indexing completed in ${result.duration}ms`);
      
      return result;
    } catch (error) {
      console.error('Indexing failed:', error);
      result.errors.push((error as Error).message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  private async getAllFiles(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectPath, fullPath);

      // Check if path should be ignored
      if (this.config.indexing.ignorePaths.some(ignore => relativePath.includes(ignore))) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.getAllFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.config.indexing.extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private async processBatch(files: string[], result: IndexingResult): Promise<void> {
    const nodes: BaseNode[] = [];
    const relationships: Relationship[] = [];

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(this.projectPath, filePath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');

        // Create file node
        const fileNode: FileNode = {
          id: generateId('file'),
          type: NodeType.FILE,
          name: path.basename(filePath),
          path: relativePath,
          content: content.substring(0, 10000), // Store first 10k chars
          hash,
          language: this.getLanguage(filePath),
          size: stats.size,
          lines: content.split('\n').length,
          last_modified: stats.mtime.getTime(),
          created_at: Date.now(),
          updated_at: Date.now()
        };

        nodes.push(fileNode);
        result.filesIndexed++;

        // Parse file based on language
        if (this.isJavaScriptLike(filePath)) {
          const parsed = await this.parseJavaScript(content, filePath, fileNode.id);
          nodes.push(...parsed.functions, ...parsed.classes);
          relationships.push(...parsed.imports, ...parsed.exports);
          result.functionsFound += parsed.functions.length;
          result.classesFound += parsed.classes.length;
        }
        // Add more language parsers here (Python, Java, etc.)

      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        result.errors.push(`${filePath}: ${(error as Error).message}`);
      }
    }

    // Save to database
    if (nodes.length > 0) {
      await this.db.createNodes(nodes);
    }
    if (relationships.length > 0) {
      await this.db.createRelationships(relationships);
      result.relationshipsCreated += relationships.length;
    }
  }

  private async parseJavaScript(
    content: string, 
    filePath: string, 
    fileId: string
  ): Promise<{
    functions: FunctionNode[];
    classes: ClassNode[];
    imports: Relationship[];
    exports: Relationship[];
  }> {
    const functions: FunctionNode[] = [];
    const classes: ClassNode[] = [];
    const imports: Relationship[] = [];
    const exports: Relationship[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        errorRecovery: true
      });

      const self = this;
      traverse(ast as any, {
        FunctionDeclaration(path: any) {
          const node = path.node;
          if (node.id) {
            const funcNode: FunctionNode = {
              id: generateId('func'),
              type: NodeType.FUNCTION,
              name: node.id.name,
              signature: content.substring(node.start!, node.body.start!),
              body: content.substring(node.body.start!, node.body.end!),
              parameters: node.params.map((p: any) => {
                if (t.isIdentifier(p)) return p.name;
                return 'param';
              }),
              async: node.async,
              generator: node.generator,
              complexity: self.calculateComplexity(node),
              line_start: node.loc?.start.line || 0,
              line_end: node.loc?.end.line || 0,
              file_path: filePath,
              created_at: Date.now(),
              updated_at: Date.now()
            };
            functions.push(funcNode);

            // Create CONTAINS relationship
            imports.push({
              from_id: fileId,
              to_id: funcNode.id,
              type: RelationType.CONTAINS,
              created_at: Date.now()
            });
          }
        },

        ClassDeclaration(path: any) {
          const node = path.node;
          if (node.id) {
            const methods: string[] = [];
            const properties: string[] = [];

            // Extract methods and properties
            node.body.body.forEach((member: any) => {
              if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
                methods.push(member.key.name);
              } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
                properties.push(member.key.name);
              }
            });

            const classNode: ClassNode = {
              id: generateId('class'),
              type: NodeType.CLASS,
              name: node.id.name,
              extends: node.superClass && t.isIdentifier(node.superClass) 
                ? node.superClass.name 
                : undefined,
              implements: [], // TODO: Extract implements for TS
              abstract: (node as any).abstract || false,
              methods,
              properties,
              line_start: node.loc?.start.line || 0,
              line_end: node.loc?.end.line || 0,
              file_path: filePath,
              created_at: Date.now(),
              updated_at: Date.now()
            };
            classes.push(classNode);

            // Create CONTAINS relationship
            imports.push({
              from_id: fileId,
              to_id: classNode.id,
              type: RelationType.CONTAINS,
              created_at: Date.now()
            });
          }
        },

        ImportDeclaration(path: any) {
          const node = path.node;
          if (t.isStringLiteral(node.source)) {
            const importedPath = node.source.value;
            imports.push({
              from_id: fileId,
              to_id: generateId('file'), // Placeholder for now until full path resolution
              type: RelationType.IMPORTS,
              created_at: Date.now()
            });
          }
        },

        ExportNamedDeclaration(path: any) {
          const node = path.node;
          if (node.declaration) {
            exports.push({
              from_id: fileId,
              to_id: generateId('export'),
              type: RelationType.EXPORTS,
              created_at: Date.now()
            });
          }
        }
      });

    } catch (error) {
      console.error(`Error parsing JavaScript file ${filePath}:`, error);
    }

    return { functions, classes, imports, exports };
  }

  private calculateComplexity(node: any): number {
    let complexity = 1;
    const body = node.body?.body || [];
    body.forEach((stmt: any) => {
      if (t.isIfStatement(stmt) || t.isForStatement(stmt) || t.isWhileStatement(stmt)) {
        complexity++;
      }
    });
    return complexity;
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'TypeScript';
      case '.js':
      case '.jsx':
        return 'JavaScript';
      case '.py':
        return 'Python';
      case '.java':
        return 'Java';
      default:
        return 'Unknown';
    }
  }

  private isJavaScriptLike(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
  }

  async updateFile(filePath: string): Promise<void> {
    const result: IndexingResult = {
      filesIndexed: 0,
      functionsFound: 0,
      classesFound: 0,
      relationshipsCreated: 0,
      errors: [],
      duration: 0
    };

    const relativePath = path.relative(this.projectPath, filePath);
    const nodes = await this.db.searchNodes(relativePath, [NodeType.FILE], 1);
    if (nodes.length > 0) {
      await this.db.deleteNode(nodes[0].id);
    }

    await this.processBatch([filePath], result);
  }

  async getStatistics(): Promise<Record<string, any>> {
    return await this.db.getGraphStatistics();
  }
}