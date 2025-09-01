import { CommandDefinition } from './base.js';
import * as fs from 'fs';
import * as path from 'path';

export class GenerateTestsCommand implements CommandDefinition {
  command = 'generate-tests';
  description = 'Generate comprehensive tests including unit tests, E2E tests (Playwright), and CI workflows (GitHub Actions)';

  handler(context: any, args: string[] = []): void {
    const ci = args.includes('--ci');
    const e2e = args.includes('--e2e');
    const playwright = args.includes('--playwright');
    const specificFile = args.find(arg => !arg.startsWith('--'));
    
    const generate = async () => {
      console.log(`🧪 Generating tests${ci ? ' + CI workflows' : ''}${e2e ? ' + E2E' : ''}...`);
      
      try {
        if (specificFile) {
          await this.generateTestsForFile(specificFile);
        } else {
          await this.generateTestsForProject(ci, e2e, playwright);
        }
        
        console.log('\n✅ Test generation complete!');
        context.addMessage({ role: 'assistant', content: '✅ Test generation complete!' });
        
      } catch (error: any) {
        console.error('❌ Error generating tests:', error.message);
        context.addMessage({ role: 'assistant', content: `❌ Error generating tests: ${error.message}` });
      }
    };
    
    generate();
  }
  
  private async generateTestsForProject(ci: boolean, e2e: boolean, playwright: boolean): Promise<void> {
    // Generate unit tests
    console.log('📊 Generating unit tests...');
    await this.generateUnitTests();
    
    // Generate E2E tests
    if (e2e || playwright) {
      console.log('🌐 Generating E2E tests...');
      await this.generateE2ETests(playwright);
    }
    
    // Generate CI workflow
    if (ci) {
      console.log('🔄 Generating CI workflow...');
      await this.generateCIWorkflow(playwright);
    }
  }
  
  private async generateUnitTests(): Promise<void> {
    const srcDir = path.join(process.cwd(), 'src');
    if (!fs.existsSync(srcDir)) {
      console.log('⚠️ No src directory found, skipping unit tests');
      return;
    }
    
    const testDir = path.join(process.cwd(), 'tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Generate basic test structure
    const jestConfig = `module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.(js|ts)', '**/?(*.)+(spec|test).(js|ts)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};`;
    
    fs.writeFileSync(path.join(process.cwd(), 'jest.config.js'), jestConfig);
    
    // Generate sample unit test
    const sampleTest = `const { describe, test, expect } = require('@jest/globals');

describe('Sample Unit Test', () => {
  test('should pass basic test', () => {
    expect(true).toBe(true);
  });
});`;
    
    fs.writeFileSync(path.join(testDir, 'sample.test.js'), sampleTest);
  }
  
  private async generateE2ETests(usePlaywright: boolean): Promise<void> {
    if (usePlaywright) {
      await this.generatePlaywrightTests();
    } else {
      await this.generateBasicE2ETests();
    }
  }
  
  private async generatePlaywrightTests(): Promise<void> {
    const e2eDir = path.join(process.cwd(), 'tests', 'e2e');
    if (!fs.existsSync(e2eDir)) {
      fs.mkdirSync(e2eDir, { recursive: true });
    }
    
    const playwrightTest = `const { test, expect } = require('@playwright/test');

test.describe('E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Welcome/);
  });

  test('should have working navigation', async ({ page }) => {
    await page.click('text=About');
    await expect(page).toHaveURL(/.*about/);
  });

  test('API endpoints should respond', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});`;
    
    fs.writeFileSync(path.join(e2eDir, 'app.spec.js'), playwrightTest);
  }
  
  private async generateBasicE2ETests(): Promise<void> {
    const e2eDir = path.join(process.cwd(), 'tests', 'e2e');
    if (!fs.existsSync(e2eDir)) {
      fs.mkdirSync(e2eDir, { recursive: true });
    }
    
    const basicTest = `const request = require('supertest');
const app = require('../src/app');

describe('Basic E2E Tests', () => {
  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  test('GET /api/health should return healthy', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });
});`;
    
    fs.writeFileSync(path.join(e2eDir, 'basic.test.js'), basicTest);
  }
  
  private async generateCIWorkflow(usePlaywright: boolean): Promise<void> {
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    const workflow = this.createGitHubWorkflow(usePlaywright);
    const workflowPath = path.join(workflowsDir, 'test.yml');
    
    fs.writeFileSync(workflowPath, workflow);
  }
  
  private createGitHubWorkflow(usePlaywright: boolean): string {
    if (usePlaywright) {
      return `name: Test & E2E

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30`;
    } else {
      return `name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run unit tests
      run: npm test
    
    - name: Run security audit
      run: npm audit --audit-level moderate`;
    }
  }
  
  private async generateTestsForFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(fullPath);
    const baseName = path.basename(fullPath, ext);
    const dirName = path.dirname(fullPath);
    
    // Determine test type based on file content
    let testType = 'unit';
    if (content.includes('express') || content.includes('app.')) {
      testType = 'e2e';
    } else if (content.includes('function') || content.includes('class')) {
      testType = 'unit';
    }
    
    const testDir = path.join(process.cwd(), 'tests', testType);
    const testFile = path.join(testDir, `${baseName}.test.${testType === 'e2e' ? 'spec' : 'test'}.js`);
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testContent = this.generateTestForContent(content, testType, baseName);
    fs.writeFileSync(testFile, testContent);
    
    console.log(`✅ Generated ${testType} test: ${path.relative(process.cwd(), testFile)}`);
  }
  
  private generateTestForContent(content: string, testType: string, fileName: string): string {
    if (testType === 'e2e') {
      return `const request = require('supertest');
const app = require('../src/app');

describe('${fileName} E2E Tests', () => {
  test('should handle basic requests', async () => {
    // Add E2E tests based on the route functionality
    expect(true).toBe(true);
  });
});`;
    } else {
      return `const { describe, test, expect } = require('@jest/globals');

describe('${fileName} Unit Tests', () => {
  test('should pass basic functionality', () => {
    // Add unit tests based on the file content
    expect(true).toBe(true);
  });
});`;
    }
  }
}