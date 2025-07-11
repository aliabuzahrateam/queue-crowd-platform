# Test Runner Script for Auth Service
# This script sets up the test environment and runs the tests

Write-Host "🚀 Starting Auth Service Tests..." -ForegroundColor Green

# Set environment variables for testing
$env:NODE_ENV = "test"
$env:JWT_SECRET = "test-secret-key-for-testing-only"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auth_service_test"

Write-Host "📋 Environment Variables Set:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  DATABASE_URL: $env:DATABASE_URL"

# Check if PostgreSQL is running
Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $pgTest = & psql -h localhost -U postgres -d postgres -c "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL is not running. Please start PostgreSQL first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ PostgreSQL is not running. Please start PostgreSQL first." -ForegroundColor Red
    exit 1
}

# Create test database if it doesn't exist
Write-Host "🗄️ Setting up test database..." -ForegroundColor Yellow
try {
    & psql -h localhost -U postgres -d postgres -c "CREATE DATABASE auth_service_test;" 2>$null
    Write-Host "✅ Test database created/verified" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Test database already exists or error occurred (this is usually OK)" -ForegroundColor Yellow
}

# Run Prisma migrations for test database
Write-Host "🔄 Running Prisma migrations..." -ForegroundColor Yellow
try {
    & npx prisma migrate deploy --schema=./prisma/schema.prisma
    Write-Host "✅ Prisma migrations completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Prisma migration failed" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    & npm install
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
Write-Host ""

# Run all tests
Write-Host "📊 Running all tests..." -ForegroundColor Cyan
& npm test

# Check test exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Test Summary:" -ForegroundColor Yellow
Write-Host "  - Integration tests: auth.test.ts, user.test.ts, passwordReset.test.ts"
Write-Host "  - Unit tests: authService.test.ts"
Write-Host "  - Coverage report: coverage/index.html"
Write-Host ""
Write-Host "💡 Additional test commands:" -ForegroundColor Cyan
Write-Host "  npm run test:watch     - Run tests in watch mode"
Write-Host "  npm run test:coverage  - Run tests with coverage report"
Write-Host "  npm run test:integration - Run only integration tests"
Write-Host "  npm run test:unit      - Run only unit tests" 