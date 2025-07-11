# Auth Service Testing Guide

This document provides comprehensive information about testing the auth-service, including setup, running tests, and understanding test coverage.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Coverage](#test-coverage)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

Before running tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** running locally
3. **psql** command-line tool available
4. **PowerShell** (for Windows test runner)

### PostgreSQL Setup

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# Start PostgreSQL service
# Windows: Start from Services
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create test database
psql -h localhost -U postgres -c "CREATE DATABASE auth_service_test;"
```

## 🚀 Test Setup

### Quick Start

```powershell
# Run the automated test setup (Windows)
.\run-tests.ps1
```

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export NODE_ENV=test
export JWT_SECRET=test-secret-key-for-testing-only
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_service_test

# 3. Run Prisma migrations
npx prisma migrate deploy

# 4. Run tests
npm test
```

## 🧪 Running Tests

### Available Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only integration tests
npm run test:integration

# Run only unit tests
npm run test:unit
```

### Test Output

Tests will output:
- ✅ **Passing tests** in green
- ❌ **Failing tests** in red
- 📊 **Coverage report** (when using `--coverage`)
- ⏱️ **Test execution time**

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── integration/               # Integration tests
│   ├── auth.test.ts          # Authentication endpoints
│   ├── user.test.ts          # User management endpoints
│   └── passwordReset.test.ts # Password reset endpoints
└── unit/                     # Unit tests
    └── services/
        └── authService.test.ts # Auth service unit tests
```

### Test Categories

#### 1. Integration Tests (`tests/integration/`)

**Purpose**: Test complete API endpoints with real database interactions

**Files**:
- `auth.test.ts` - Registration, login, logout, token validation
- `user.test.ts` - Profile management, password changes, 2FA
- `passwordReset.test.ts` - Password reset flow

**Coverage**:
- ✅ HTTP status codes
- ✅ Response body structure
- ✅ Database state changes
- ✅ Error handling
- ✅ Authentication middleware
- ✅ Validation middleware

#### 2. Unit Tests (`tests/unit/`)

**Purpose**: Test individual service methods in isolation

**Files**:
- `authService.test.ts` - AuthService class methods

**Coverage**:
- ✅ Business logic
- ✅ Error scenarios
- ✅ Mocked dependencies
- ✅ Return value validation

## 📊 Test Coverage

### Current Coverage Areas

#### Authentication Endpoints
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User login
- ✅ `POST /api/auth/refresh` - Token refresh
- ✅ `GET /api/auth/validate` - Token validation
- ✅ `POST /api/auth/logout` - User logout

#### User Management Endpoints
- ✅ `GET /api/users/profile` - Get user profile
- ✅ `PUT /api/users/profile` - Update user profile
- ✅ `PUT /api/users/password` - Change password
- ✅ `POST /api/users/2fa/enable` - Enable 2FA
- ✅ `POST /api/users/2fa/verify` - Verify 2FA
- ✅ `DELETE /api/users/2fa/disable` - Disable 2FA
- ✅ `GET /api/users/sessions` - Get user sessions
- ✅ `DELETE /api/users/sessions/:id` - Revoke session

#### Password Reset Endpoints
- ✅ `POST /api/password-reset/request` - Request reset
- ✅ `POST /api/password-reset/validate` - Validate token
- ✅ `POST /api/password-reset/reset` - Reset password

#### Health Check
- ✅ `GET /health` - Service health status

### Test Scenarios Covered

#### Positive Scenarios
- ✅ Successful user registration
- ✅ Successful login with valid credentials
- ✅ Token refresh with valid refresh token
- ✅ Profile updates with valid data
- ✅ Password changes with correct current password
- ✅ 2FA enable/disable flow
- ✅ Password reset complete flow

#### Negative Scenarios
- ✅ Registration with invalid email format
- ✅ Registration with weak password
- ✅ Registration with duplicate email
- ✅ Login with non-existent email
- ✅ Login with incorrect password
- ✅ Token refresh with invalid token
- ✅ Token refresh with expired token
- ✅ Profile update with invalid phone format
- ✅ Profile update with duplicate username
- ✅ Password change with incorrect current password
- ✅ Password change with weak new password
- ✅ 2FA verification with invalid token
- ✅ Password reset with invalid token
- ✅ Password reset with expired token

#### Security Scenarios
- ✅ Rate limiting on password reset requests
- ✅ Session revocation after password reset
- ✅ Email enumeration protection
- ✅ Token validation middleware
- ✅ Authorization header validation

## 🔧 Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check if PostgreSQL is running
# Windows: Check Services app
# macOS: brew services list
# Linux: sudo systemctl status postgresql

# Start PostgreSQL if needed
# Windows: Start from Services
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

#### 2. Database Migration Failed
```
Error: P1001: Can't reach database server
```

**Solution**:
```bash
# Check database connection
psql -h localhost -U postgres -d postgres -c "SELECT 1;"

# Create test database if missing
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE auth_service_test;"

# Run migrations
npx prisma migrate deploy
```

#### 3. Test Database Cleanup Issues
```
Error: relation "auth.users" does not exist
```

**Solution**:
```bash
# Reset test database
psql -h localhost -U postgres -d auth_service_test -c "DROP SCHEMA IF EXISTS auth CASCADE;"
npx prisma migrate deploy
```

#### 4. Jest Configuration Issues
```
Error: Cannot find module '@prisma/client'
```

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Generate Prisma client
npx prisma generate
```

### Debug Mode

To run tests with more verbose output:

```bash
# Run with debug logging
DEBUG=* npm test

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should register"
```

### Performance Issues

If tests are running slowly:

1. **Use in-memory database for unit tests**
2. **Run tests in parallel** (Jest default)
3. **Use `--maxWorkers=1`** for debugging
4. **Check database connection pooling**

## 📈 Coverage Reports

After running tests with coverage:

```bash
npm run test:coverage
```

View the coverage report:
- **HTML Report**: `coverage/index.html`
- **Console Report**: Shows in terminal output
- **LCOV Report**: `coverage/lcov.info`

### Coverage Targets

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Auth Service Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
```

## 📝 Adding New Tests

### Integration Test Template

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';

const prisma = new PrismaClient();

describe('New Feature Endpoints', () => {
  beforeEach(async () => {
    // Clean up before each test
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/new-feature', () => {
    it('should handle new feature successfully', async () => {
      const testData = {
        // Test data here
      };

      const response = await request(app)
        .post('/api/new-feature')
        .send(testData)
        .expect(200);

      expect(response.body.message).toBe('Success message');
    });
  });
});
```

### Unit Test Template

```typescript
import { NewService } from '../../src/services/newService';

describe('NewService', () => {
  let newService: NewService;

  beforeEach(() => {
    newService = new NewService();
  });

  describe('newMethod', () => {
    it('should handle success case', async () => {
      const result = await newService.newMethod();
      expect(result.success).toBe(true);
    });
  });
});
```

## 🤝 Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Cover both success and failure cases**
3. **Test edge cases and boundary conditions**
4. **Maintain test isolation** (clean up after each test)
5. **Use descriptive test names**
6. **Keep tests simple and focused**

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Express Testing Best Practices](https://expressjs.com/en/advanced/best-practices-performance.html#testing) 