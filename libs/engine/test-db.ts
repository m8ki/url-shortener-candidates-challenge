
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const url = await prisma.url.create({
      data: {
        originalUrl: 'https://google.com',
        shortCode: 'test-' + Date.now(),
      },
    });
    console.log('Created:', url);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
