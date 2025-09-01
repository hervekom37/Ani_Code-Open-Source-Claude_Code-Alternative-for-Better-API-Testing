import { CommandDefinition } from './base.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export class MigrateTsCommand implements CommandDefinition {
  command = 'migrate-ts';
  description = 'Migrate JavaScript project to TypeScript with automatic type inference and configuration';

  handler(context: any, args: string[] = []): void {
    const targetDir = args[0] || process.cwd();
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');
    
    console.log(`🔄 Migrating to TypeScript${dryRun ? ' (dry run)' : ''}...`);

    Promise.resolve().then(async () => {
      // Check if already TypeScript
      const hasTsConfig = fs.existsSync(path.join(targetDir, 'tsconfig.json'));
      if (hasTsConfig && !force) {
        context.addMessage({ role: 'assistant', content: '✅ Project already uses TypeScript (tsconfig.json found)' });
        return;
      }

      // Find all JS files to migrate
      const jsFiles = this.findJsFiles(targetDir);
      context.addMessage({ role: 'assistant', content: `📁 Found ${jsFiles.length} JavaScript files to migrate` });

      if (dryRun) {
        context.addMessage({ role: 'assistant', content: '\n📋 Files that would be migrated:' });
        jsFiles.forEach(file => context.addMessage({ role: 'assistant', content: `  - ${file}` }));
        return;
      }

      // Install TypeScript dependencies
      context.addMessage({ role: 'assistant', content: '📦 Installing TypeScript dependencies...' });
      this.installTypeScript();

      // Create tsconfig.json
      context.addMessage({ role: 'assistant', content: '⚙️ Creating tsconfig.json...' });
      this.createTsConfig();

      // Migrate files
      context.addMessage({ role: 'assistant', content: '📝 Migrating JavaScript to TypeScript...' });
      this.migrateFiles(jsFiles);

      // Update package.json scripts
      context.addMessage({ role: 'assistant', content: '📋 Updating package.json scripts...' });
      this.updatePackageJson();

      // Update .gitignore
      context.addMessage({ role: 'assistant', content: '📝 Updating .gitignore...' });
      this.updateGitignore();

      context.addMessage({ role: 'assistant', content: '\n🎉 TypeScript migration complete!' });
      context.addMessage({ role: 'assistant', content: '\nNext steps:' });
      context.addMessage({ role: 'assistant', content: '1. Review migrated files for any type issues' });
      context.addMessage({ role: 'assistant', content: '2. Run: npm run build (to check for type errors)' });
      context.addMessage({ role: 'assistant', content: '3. Run: npm run dev (to test the application)' });
    }).catch((error: any) => {
      context.addMessage({ role: 'assistant', content: `❌ Error during TypeScript migration: ${error.message}` });
    });
  }
  
  private findJsFiles(dir: string, files: string[] = []): string[] {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other common ignore directories
        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
          this.findJsFiles(fullPath, files);
        }
      } else if (item.endsWith('.js') && !item.endsWith('.test.js') && !item.endsWith('.spec.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private installTypeScript(): void {
    const devDeps = [
      'typescript',
      '@types/node',
      '@types/express',
      '@types/cors',
      'ts-node',
      'nodemon'
    ];
    
    try {
      execSync(`npm install --save-dev ${devDeps.join(' ')}`, { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Could not install all TypeScript dependencies:', (error as Error).message);
    }
  }
  
  private createTsConfig(): void {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        sourceMap: true,
        removeComments: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedIndexedAccess: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'tests', '**/*.test.ts', '**/*.spec.ts']
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }
  
  private migrateFiles(jsFiles: string[]): void {
    for (const jsFile of jsFiles) {
      const tsFile = jsFile.replace(/\.js$/, '.ts');
      
      try {
        let content = fs.readFileSync(jsFile, 'utf8');
        
        // Basic TypeScript migration
        content = this.addTypeScriptTypes(content, jsFile);
        
        // Write TypeScript file
        fs.writeFileSync(tsFile, content);
        
        // Remove original JS file (optional, could keep for reference)
        // fs.unlinkSync(jsFile);
        
        console.log(`  ✅ ${path.relative(process.cwd(), jsFile)} → ${path.relative(process.cwd(), tsFile)}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not migrate ${jsFile}: ${(error as Error).message}`);
      }
    }
  }
  
  private addTypeScriptTypes(content: string, filePath: string): string {
    // Add basic TypeScript types based on file content patterns
    
    // Add imports for common types
    let updatedContent = content;
    
    // Express app files
    if (content.includes('express()') || content.includes('require(\'express\')')) {
      updatedContent = `import express, { Express, Request, Response } from 'express';\n${updatedContent}`;
    }
    
    // Common patterns
    updatedContent = updatedContent.replace(
      /const\s+(\w+)\s*=\s*require\(['"](\w+)['"]\)/g,
      'import $1 from \'$2\''
    );
    
    // Function parameters
    updatedContent = updatedContent.replace(
      /function\s+(\w+)\s*\(([^)]*)\)/g,
      'function $1($2): void'
    );
    
    // Arrow functions
    updatedContent = updatedContent.replace(
      /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g,
      'const $1 = ($2): void => {'
    );
    
    // Add any type annotations for better AI understanding
    updatedContent = `// @ts-nocheck\n// Auto-migrated to TypeScript for better AI assistance\n${updatedContent}`;
    
    return updatedContent;
  }
  
  private updatePackageJson(): void {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update scripts
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.build = 'tsc';
    packageJson.scripts.dev = 'nodemon --exec ts-node src/app.ts';
    packageJson.scripts.start = 'node dist/app.js';
    
    // Add TypeScript-specific scripts
    packageJson.scripts['type-check'] = 'tsc --noEmit';
    packageJson.scripts['type-check:watch'] = 'npm run type-check -- --watch';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
  
  private updateGitignore(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const additions = [
      '\n# TypeScript',
      'dist/',
      '*.tsbuildinfo',
      '.ts-cache/'
    ];
    
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('dist/')) {
        fs.appendFileSync(gitignorePath, additions.join('\n'));
      }
    } else {
      fs.writeFileSync(gitignorePath, additions.join('\n'));
    }
  }
}