import { CommandDefinition } from './base.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Finding {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  package?: string;
  suggestion?: string;
  fixAvailable?: boolean;
}

interface Report {
  timestamp: string;
  scanType: string;
  findings: Finding[];
}

export class BugScanCommand implements CommandDefinition {
  command = 'bug-scan';
  description = 'Scan codebase for bugs and security issues';

  async handler(context: any, args: string[] = []): Promise<void> {
    const isLocal = args.includes('--local');
    const isCI = args.includes('--ci');
    
    console.log(`🔍 Starting bug scan${isLocal ? ' (local)' : isCI ? ' (CI)' : ''}...`);
    
    try {
      const report: Report = {
        timestamp: new Date().toISOString(),
        scanType: isLocal ? 'local' : isCI ? 'ci' : 'pr',
        findings: []
      };
      
      // 1. Check for missing tests
      console.log('📊 Checking for missing tests...');
      const testFindings = this.checkMissingTests();
      report.findings.push(...testFindings);
      
      // 2. Security audit
      console.log('🔒 Running security audit...');
      const securityFindings = await this.runSecurityAudit();
      report.findings.push(...securityFindings);
      
      // 3. ESLint violations
      console.log('📏 Checking ESLint violations...');
      const lintFindings = await this.checkESLint();
      report.findings.push(...lintFindings);
      
      // 4. Common security patterns
      console.log('🛡️ Checking common security patterns...');
      const securityPatterns = await this.checkSecurityPatterns();
      report.findings.push(...securityPatterns);
      
      // 5. Dependency vulnerabilities
      console.log('📦 Checking dependency vulnerabilities...');
      const vulnFindings = await this.checkDependencies();
      report.findings.push(...vulnFindings);
      
      // Generate report
      const reportPath = path.join(process.cwd(), 'context', 'BUG_REPORT.md');
      this.generateReport(report, reportPath);
      
      console.log(`\n✅ Bug scan complete! Report saved to: ${reportPath}`);
      
      let output = `🔍 Bug Scan Results:\n`;
      if (report.findings.length > 0) {
        output += `📊 Found ${report.findings.length} issues:\n`;
        report.findings.forEach(finding => {
          output += `  ${finding.severity}: ${finding.message}\n`;
        });
      } else {
        output += '\n🎉 No issues found!';
      }
      
      context.addMessage({ role: 'assistant', content: output });
      
    } catch (error: any) {
      context.addMessage({ role: 'assistant', content: `❌ Error during bug scan: ${error.message}` });
    }
  }
  
  private checkMissingTests(): Finding[] {
    const findings: Finding[] = [];
    const srcDir = path.join(process.cwd(), 'src');
    
    if (!fs.existsSync(srcDir)) {
      return findings;
    }
    
    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          const testFile = file.replace(/\.(js|ts)$/, '.test.$1');
          const testPath = filePath
            .replace('/src/', '/tests/')
            .replace(/\.(js|ts)$/, '.test.$1');
          
          if (!fs.existsSync(testPath)) {
            findings.push({
              type: 'missing-test',
              severity: 'warning',
              message: `Missing test for ${file}`,
              file: filePath,
              suggestion: `Create ${testPath}`
            });
          }
        }
      }
    };
    
    walkDir(srcDir);
    return findings;
  }
  
  private async runSecurityAudit(): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);
      
      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
          findings.push({
            type: 'security-vulnerability',
            severity: vuln.severity || 'medium',
            message: `Security vulnerability in ${pkg}: ${vuln.title}`,
            package: pkg,
            fixAvailable: vuln.fixAvailable
          });
        });
      }
    } catch (error: any) {
      findings.push({
        type: 'security-audit-error',
        severity: 'error',
        message: `Failed to run security audit: ${error.message}`
      });
    }
    
    return findings;
  }
  
  private async checkESLint(): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    try {
      // Check if ESLint is configured
      const eslintConfig = [
        '.eslintrc.js',
        '.eslintrc.json',
        '.eslintrc.yml',
        'eslint.config.js'
      ];
      
      const hasConfig = eslintConfig.some(config => 
        fs.existsSync(path.join(process.cwd(), config))
      );
      
      if (!hasConfig) {
        findings.push({
          type: 'missing-eslint',
          severity: 'warning',
          message: 'No ESLint configuration found',
          suggestion: 'Add ESLint configuration for code quality'
        });
        return findings;
      }
      
      // Run ESLint
      const lintOutput = execSync('npx eslint src/ --format json', { encoding: 'utf8' });
      const lintResults = JSON.parse(lintOutput);
      
      lintResults.forEach((result: any) => {
        if (result.messages && result.messages.length > 0) {
          result.messages.forEach((msg: any) => {
            findings.push({
              type: 'eslint-violation',
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message,
              file: result.filePath,
              line: msg.line,
              column: msg.column
            });
          });
        }
      });
    } catch (error: any) {
      // ESLint might not be installed or configured
      findings.push({
        type: 'eslint-not-configured',
        severity: 'warning',
        message: 'ESLint not properly configured',
        suggestion: 'Install and configure ESLint: npm install --save-dev eslint'
      });
    }
    
    return findings;
  }
  
 private async checkSecurityPatterns(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const srcDir = path.join(process.cwd(), 'src');
    
    if (!fs.existsSync(srcDir)) {
      return findings;
    }
    
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'Use of eval() detected - potential security risk',
        severity: 'high'
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'Direct innerHTML assignment - potential XSS vulnerability',
        severity: 'medium'
      },
      {
        pattern: /process\.env\[.*\]/g,
        message: 'Direct environment variable access - consider validation',
        severity: 'low'
      },
      {
        pattern: /require\(['"]fs['"]\)/g,
        message: 'File system access detected - ensure proper validation',
        severity: 'low'
      }
    ];
    
    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          securityPatterns.forEach(({ pattern, message, severity }) => {
            if (pattern.test(content)) {
              findings.push({
                type: 'security-pattern',
                severity: severity as 'error' | 'warning' | 'info',
                message,
                file: filePath
              });
            }
          });
        }
      }
    };
    
    walkDir(srcDir);
    return findings;
  }
  
  private async checkDependencies(): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    try {
      // Check for outdated dependencies
      const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdated = JSON.parse(outdatedOutput);
      
      Object.entries(outdated).forEach(([pkg, info]: [string, any]) => {
        findings.push({
          type: 'outdated-dependency',
          severity: 'info',
          package: pkg,
          message: `Package ${pkg} is outdated (${info.current} → ${info.latest})`,
          suggestion: `Update ${pkg} from ${info.current} to ${info.latest}`
        });
      });
    } catch (error) {
      // npm outdated returns non-zero exit code when packages are outdated
      // This is expected behavior, so we ignore the error
    }
    
    return findings;
  }
  
  private generateReport(report: any, reportPath: string): void {
    const contextDir = path.dirname(reportPath);
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
    
    const reportContent = `# Bug Scan Report

**Generated:** ${report.timestamp}  
**Scan Type:** ${report.scanType}

## Summary
- **Total Issues:** ${report.findings.length}
- **Critical:** ${report.findings.filter((f: Finding) => f.severity === 'error').length}
- **Warnings:** ${report.findings.filter((f: Finding) => f.severity === 'warning').length}
- **Info:** ${report.findings.filter((f: Finding) => f.severity === 'info').length}

## Findings

${report.findings.map((finding: Finding) => `
### ${finding.type}
- **Severity:** ${finding.severity}
- **Message:** ${finding.message}
${finding.file ? `- **File:** ${finding.file}` : ''}
${finding.line ? `- **Line:** ${finding.line}` : ''}
${finding.suggestion ? `- **Suggestion:** ${finding.suggestion}` : ''}
`).join('\n')}

## Recommendations

1. **Security Issues:** Address high-severity findings immediately
2. **Missing Tests:** Add tests for uncovered code paths
3. **Dependencies:** Update outdated packages regularly
4. **Code Quality:** Fix ESLint violations and improve patterns

---
*Generated by Ani Code Bug Scanner*
`;
    
    fs.writeFileSync(reportPath, reportContent);
  }
}