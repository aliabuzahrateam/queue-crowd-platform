import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

export async function initializeDatabase() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Check if tables exist
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}

export { prisma }; 