import * as fs from "fs-extra";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const AddPlaywrightCommand = {
  name: 'add-playwright',
  description: 'Add Playwright testing framework to the project',
  execute: async (input: string): Promise<string> => {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        return '❌ No package.json found. Please run this in a Node.js project.';
      }

      // Install Playwright
      console.log('📦 Installing Playwright...');
      await execAsync('npm install -D @playwright/test');
      
      // Install browsers
      console.log('🌐 Installing Playwright browsers...');
      await execAsync('npx playwright install');

      // Create playwright.config.ts if it doesn't exist
      const configPath = path.join(process.cwd(), 'playwright.config.ts');
      if (!await fs.pathExists(configPath)) {
        const configContent = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});`;
        
        await fs.writeFile(configPath, configContent);
      }

      // Create tests directory
      const testsDir = path.join(process.cwd(), 'tests');
      await fs.ensureDir(testsDir);

      // Create example test
      const exampleTestPath = path.join(testsDir, 'example.spec.ts');
      if (!await fs.pathExists(exampleTestPath)) {
        const exampleTest = `import { test, expect } from '@playwright/test';

test('homepage has title and links', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
  
  // create a locator
  const getStarted = page.getByRole('link', { name: 'Get started' });
  
  // Expect an attribute "to be strictly equal" to the value.
  await expect(getStarted).toHaveAttribute('href', '/docs/intro');
  
  // Click the get started link.
  await getStarted.click();
  
  // Expects the URL to contain intro.
  await expect(page).toHaveURL(/.*intro/);
});`;
        
        await fs.writeFile(exampleTestPath, exampleTest);
      }

      return '✅ Playwright successfully added! Run "npx playwright test" to execute tests.';
    } catch (error) {
      return `❌ Error adding Playwright: ${error}`;
    }
  }
};