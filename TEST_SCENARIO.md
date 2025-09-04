# 🧪 Ani Code - Test Scenario Guide

## 📋 Complete Test Scenario: E-commerce API Testing

This scenario demonstrates how to use Ani Code's testing capabilities to implement comprehensive testing for an e-commerce API project.

### 🎯 Project Setup

**Scenario**: You're building an e-commerce backend API with Node.js/Express that needs:
- Unit tests for business logic
- E2E tests for API endpoints
- Security scanning
- CI/CD pipeline
- TypeScript migration

### 🔧 Step 1: Initial Project Setup

**CLI Commands**:
```bash
# Create new e-commerce project
mkdir ecommerce-api && cd ecommerce-api
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv bcryptjs jsonwebtoken
npm install -D jest supertest @types/node typescript ts-jest nodemon

# Initialize Ani Code
ani init
```

**TUI Slash Commands** (when using `ani` interactive interface):
```
ani> /init          # Initialize project
ani> /help          # Show available commands
ani> /model         # Configure AI model
```

### 🧪 Step 2: Generate Complete Test Suite

**CLI Commands**:
```bash
# Generate comprehensive tests with CI/CD
ani generate-tests --ci --e2e --playwright

# This creates:
# ✅ jest.config.js (unit tests)
# ✅ tests/e2e/ (Playwright tests)
# ✅ .github/workflows/test.yml (CI/CD)
# ✅ Basic test structure
```

**TUI Slash Commands**:
```
ani> /generate-tests --ci --e2e --playwright
# Or interactively:
ani> /generate-tests
# Then select options from menu: CI/CD, E2E, Playwright
```

### 🔍 Step 3: Security Analysis

**CLI Commands**:
```bash
# Scan for security vulnerabilities
ani bug-scan --local

# Output: context/BUG_REPORT.md with findings
```

**TUI Slash Commands**:
```
ani> /bug-scan --local
# Or:
ani> /bug-scan
# Then select: Local scan / PR scan / Full scan
```

### 🔄 Step 4: Continuous Testing Setup

**CLI Commands**:
```bash
# Start background agent for auto-test generation
ani bg-agent --watch

# This monitors:
# - New Express routes
# - Database schema changes
# - New React components
# - Auto-generates appropriate tests
```

**TUI Slash Commands**:
```
ani> /bg-agent --watch
# Or:
ani> /bg-agent
# Then select: Watch mode / Single scan / Background mode
```

### 📊 Step 5: Execute Test Suite

**CLI Commands**:
```bash
# Run all tests
ani run-tests

# Run specific test types
ani run-tests unit      # Unit tests only
ani run-tests e2e       # E2E tests only
ani run-tests playwright # Playwright tests only
```

**TUI Slash Commands**:
```
ani> /run-tests
# Interactive menu appears:
# - Run all tests
# - Run unit tests only
# - Run E2E tests only
# - Run Playwright tests only
# - Run with coverage
```

### 🎯 Generated Test Structure

After running `ani generate-tests --ci --e2e --playwright`, you'll have:

```
ecommerce-api/
├── .github/workflows/test.yml     # CI/CD pipeline
├── jest.config.js                 # Jest configuration
├── tests/
│   ├── unit/
│   │   ├── models/
│   │   │   ├── user.test.js
│   │   │   └── product.test.js
│   │   ├── controllers/
│   │   │   ├── auth.test.js
│   │   │   └── order.test.js
│   │   └── utils/
│   │       └── validation.test.js
│   └── e2e/
│       ├── auth.spec.js          # Playwright tests
│       ├── products.spec.js
│       └── orders.spec.js
├── playwright.config.js          # Playwright config
└── coverage/                     # Test coverage reports
```

### 🧪 Sample Generated Tests

#### Unit Test Example (auth.test.js)
```javascript
const { describe, test, expect, beforeEach } = require('@jest/globals');
const authController = require('../../src/controllers/authController');
const User = require('../../src/models/User');

jest.mock('../../src/models/User');

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    test('should register new user successfully', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User'
        })
      });
    });
  });
});
```

#### E2E Test Example (auth.spec.js)
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Authentication E2E', () => {
  test('should register and login successfully', async ({ request }) => {
    // Register new user
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        email: 'e2e@test.com',
        password: 'testpass123',
        name: 'E2E User'
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    expect(registerData.message).toBe('User registered successfully');

    // Login with registered user
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'e2e@test.com',
        password: 'testpass123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('token');
  });
});
```

### 🔄 CI/CD Pipeline (test.yml)

```yaml
name: Test & E2E

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
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
```

### 📊 Advanced Usage Patterns

#### Pattern 1: Incremental Test Generation
**CLI Commands**:
```bash
# Generate tests for specific new feature
ani generate-tests src/features/payment/

# This creates:
# tests/unit/payment/
# tests/e2e/payment.spec.js
```

**TUI Slash Commands**:
```
ani> /generate-tests src/features/payment/
# Or navigate interactively:
ani> /generate-tests
# Then browse to: src/features/payment/
```

#### Pattern 2: Security-First Testing
**CLI Commands**:
```bash
# Pre-commit security check
ani bug-scan --local
ani run-tests

# Only commit if both pass
```

**TUI Slash Commands**:
```
ani> /bug-scan --local
ani> /run-tests
# Interactive pre-commit checklist
```

#### Pattern 3: Performance Testing
**CLI Commands**:
```bash
# Add load testing
ani generate-tests --performance

# Creates load tests with k6 or Artillery
```

**TUI Slash Commands**:
```
ani> /generate-tests --performance
# Or:
ani> /generate-tests
# Then select: Performance tests option
```

### 🎯 Complete Workflow Example

**CLI Commands**:
```bash
#!/bin/bash
# Complete e-commerce testing setup

echo "🚀 Setting up e-commerce API testing..."

# 1. Initialize project
ani init

# 2. Generate comprehensive tests
ani generate-tests --ci --e2e --playwright

# 3. Security scan
ani bug-scan --local

# 4. Run all tests
ani run-tests

# 5. Start continuous monitoring
ani bg-agent --watch &

echo "✅ Testing environment ready!"
echo "📊 Check context/BUG_REPORT.md for security findings"
echo "🧪 Run 'ani run-tests' anytime to execute tests"
echo "🔄 CI/CD pipeline ready in .github/workflows/test.yml"
```

**TUI Slash Commands**:
```
ani> /init
ani> /generate-tests --ci --e2e --playwright
ani> /bug-scan --local
ani> /run-tests
ani> /bg-agent --watch

# Or use interactive mode for each:
ani> /generate-tests
# [✓] CI/CD workflow
# [✓] E2E tests
# [✓] Playwright tests
# [Generate]
```

### 📋 CLI vs TUI Slash Commands Reference

| **CLI Command** | **TUI Slash Command** | **Interactive Mode** |
|----------------|----------------------|---------------------|
| `ani init` | `/init` | Interactive project setup |
| `ani generate-tests --ci --e2e --playwright` | `/generate-tests --ci --e2e --playwright` | `/generate-tests` then select options |
| `ani generate-tests src/features/payment/` | `/generate-tests src/features/payment/` | Browse to specific directory |
| `ani bug-scan --local` | `/bug-scan --local` | `/bug-scan` then select scan type |
| `ani run-tests` | `/run-tests` | Interactive test menu |
| `ani run-tests unit` | `/run-tests unit` | Select "unit tests only" |
| `ani run-tests e2e` | `/run-tests e2e` | Select "E2E tests only" |
| `ani run-tests playwright` | `/run-tests playwright` | Select "Playwright tests" |
| `ani bg-agent --watch` | `/bg-agent --watch` | `/bg-agent` then select mode |
| `ani add-playwright` | `/add-playwright` | One-click Playwright setup |
| `ani migrate-ts` | `/migrate-ts` | Interactive TypeScript migration |

### 🎭 Test Results & Monitoring

After implementing this scenario:

1. **Test Coverage**: 95%+ coverage with detailed reports
2. **Security**: Daily vulnerability scans
3. **Performance**: Automated load testing
4. **CI/CD**: Multi-node testing on every commit
5. **Monitoring**: Real-time test generation as code changes

### 🎯 Quick Reference Card

**For CLI users**:
```bash
# Complete setup in 5 commands
ani init
ani generate-tests --ci --e2e --playwright
ani bug-scan --local
ani run-tests
ani bg-agent --watch
```

**For TUI users**:
```
ani> /init
ani> /generate-tests
# [✓] CI/CD workflow
# [✓] E2E tests
# [✓] Playwright tests
ani> /bug-scan --local
ani> /run-tests
ani> /bg-agent --watch
```

### 🔧 Troubleshooting

```bash
# If tests fail
ani run-tests --verbose

# Regenerate specific tests
ani generate-tests src/controllers/

# Check test configuration
ani bug-scan --config
```

This scenario provides a complete, production-ready testing setup for any Node.js/Express project using Ani Code's comprehensive testing capabilities.