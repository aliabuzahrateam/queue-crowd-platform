import { PrismaClient } from '@prisma/client';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/auth_service_test';

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  const prisma = new PrismaClient();
  
  try {
    // Clean up test database
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Test setup error:', error);
  } finally {
    await prisma.$disconnect();
  }
});

// Global test teardown
afterAll(async () => {
  const prisma = new PrismaClient();
  
  try {
    // Clean up test database
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Test teardown error:', error);
  } finally {
    await prisma.$disconnect();
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}; 