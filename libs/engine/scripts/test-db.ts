import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  try {
    const count = await prisma.url.count();
    console.log(`Successfully connected. Url count: ${count}`);
    
    // Create one
    const created = await prisma.url.create({
        data: {
            originalUrl: "https://google.com",
            shortCode: "test_" + Math.random().toString(36).substring(7),
        }
    });
    console.log("Created: ", created);

  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
