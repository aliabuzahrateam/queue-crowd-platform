import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 