import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@queuecrowd.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@queuecrowd.com',
      password_hash: adminPassword,
      role: 'admin',
      is_active: true,
      is_2fa_enabled: false,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create test user
  const testPassword = await bcrypt.hash('test123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@queuecrowd.com' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@queuecrowd.com',
      phone: '+1234567890',
      password_hash: testPassword,
      role: 'user',
      is_active: true,
      is_2fa_enabled: false,
    },
  });

  console.log('✅ Test user created:', testUser.email);

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@queuecrowd.com' },
    update: {},
    create: {
      username: 'staff',
      email: 'staff@queuecrowd.com',
      phone: '+1987654321',
      password_hash: staffPassword,
      role: 'staff',
      is_active: true,
      is_2fa_enabled: false,
    },
  });

  console.log('✅ Staff user created:', staffUser.email);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 