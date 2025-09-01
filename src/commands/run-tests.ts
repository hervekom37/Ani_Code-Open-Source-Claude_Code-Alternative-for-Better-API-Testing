import { CommandDefinition } from './base.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestFailure {
  test: string;
  error: string;
}

interface TestResults {
  timestamp: string;
  testType: string;
  command: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    coverage: number;
  };
  failures: TestFailure[];
  logs: string[];
}

export class RunTestsCommand implements CommandDefinition {
  name = 'run-tests';
  description = 'Run unit tests via terminal tool and capture logs for agent context';
  
  command = 'run-tests';


  handler(context: any, args: string[] = []): void {
    const testType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'unit';
    const watchMode = args.includes('--watch');
    const coverage = args.includes('--coverage');
    
    console.log(`🧪 Running ${testType} tests${watchMode ? ' (watch mode)' : ''}${coverage ? ' with coverage' : ''}...`);
    
    this.runTests(testType, watchMode, coverage)
      .then(testResults => {
        this.saveResultsToContext(testResults);
        
        let output = `✅ Test execution complete!\n`;
        output += `📊 Results saved to: context/AGENT_MEMORY.md\n`;
        
        if (testResults.summary.failed > 0) {
          output += `\n❌ ${testResults.summary.failed} test(s) failed\n`;
          testResults.failures.forEach(failure => {
            output += `  - ${failure.test}: ${failure.error}\n`;
          });
        } else {
          output += '\n🎉 All tests passed!';
        }
        
        context.addMessage({ role: 'assistant', content: output });
      })
      .catch((error: any) => {
        context.addMessage({ role: 'assistant', content: `❌ Error running tests: ${error.message}` });
      });
  }
  
  private async runTests(testType: string, watchMode: boolean, coverage: boolean): Promise<TestResults> {
    const results: TestResults = {
      timestamp: new Date().toISOString(),
      testType,
      command: '',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        coverage: 0
      },
      failures: [],
      logs: []
    };
    
    try {
      let command = '';
      
      switch (testType) {
        case 'e2e':
          command = 'npm run test:e2e';
          break;
        case 'playwright':
          command = 'npx playwright test';
          break;
        default:
          command = 'npm test';
          if (watchMode) command += ' --watch';
          if (coverage) command += ' --coverage';
      }
      
      results.command = command;
      
      // Run tests and capture output
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      results.logs = output.split('\n').filter(line => line.trim());
      
      // Parse test results based on test runner
      if (testType === 'e2e' || testType === 'playwright') {
        // For Playwright, check for test results file
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        if (fs.existsSync(resultsPath)) {
          const testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          results.summary = this.parsePlaywrightResults(testResults);
        }
      } else {
        // For Jest, parse from output
        results.summary = this.parseJestResults(output);
      }
      
    } catch (error: any) {
      // Capture error output
      const errorOutput = error.stdout || error.stderr || error.message;
      results.logs = errorOutput.split('\n').filter((line: string) => line.trim());
      results.summary.failed = 1;
      results.failures.push({
        test: 'Test Suite',
        error: error.message || 'Unknown error'
      });
    }
    
    return results;
  }
  
  private parseJestResults(output: string): any {
    const lines = output.split('\n');
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      coverage: 0
    };
    
    // Parse Jest summary line
    const summaryLine = lines.find(line => line.includes('Tests:'));
    if (summaryLine) {
      const matches = summaryLine.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+pending/);
      if (matches) {
        summary.passed = parseInt(matches[1]) || 0;
        summary.failed = parseInt(matches[2]) || 0;
        summary.pending = parseInt(matches[3]) || 0;
        summary.total = summary.passed + summary.failed + summary.pending;
      }
    }
    
    // Parse coverage
    const coverageLine = lines.find(line => line.includes('All files'));
    if (coverageLine) {
      const coverageMatch = coverageLine.match(/(\d+\.?\d*)%/);
      if (coverageMatch) {
        summary.coverage = parseFloat(coverageMatch[1]);
      }
    }
    
    return summary;
  }
  
  private parsePlaywrightResults(results: any): any {
    return {
      total: results.total || 0,
      passed: results.passed || 0,
      failed: results.failed || 0,
      pending: results.pending || 0,
      coverage: 0 // Playwright doesn't provide coverage by default
    };
  }
  
  private saveResultsToContext(results: TestResults): void {
    const contextDir = path.join(process.cwd(), 'context');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
    
    const memoryPath = path.join(contextDir, 'AGENT_MEMORY.md');
    
    let existingContent = '';
    if (fs.existsSync(memoryPath)) {
      existingContent = fs.readFileSync(memoryPath, 'utf8');
    }
    
    const testSection = `## Test Results (${results.timestamp})

**Test Type:** ${results.command}  
**Total Tests:** ${results.summary.total}  
**Passed:** ${results.summary.passed}  
**Failed:** ${results.summary.failed}  
**Pending:** ${results.summary.pending}  
**Coverage:** ${results.summary.coverage}%

### Key Insights
${results.summary.failed > 0 ? '- **Action Required:** Fix failing tests' : '- **Status:** All tests passing'}  
${results.summary.coverage < 80 ? '- **Improvement:** Consider increasing test coverage' : '- **Coverage:** Good coverage level'}

### Failed Tests
${results.failures.length > 0 ? results.failures.map(f => `- ${f.test}: ${f.error}`).join('\n') : 'None'}

### Recent Logs
\`\`\`
${results.logs.slice(-10).join('\n')}
\`\`\`

---

`;
    
    // Insert new test section at the beginning
    const updatedContent = testSection + existingContent;
    fs.writeFileSync(memoryPath, updatedContent);
  }
}