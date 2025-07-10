import { execSync } from 'child_process';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');

    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Push schema to database
    console.log('🗄️  Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    // Run seed script
    console.log('🌱 Running seed script...');
    execSync('npm run db:seed', { stdio: 'inherit' });

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration(); 