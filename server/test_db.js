const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('Testing DB Document retrieval...');
  const docs = await prisma.document.findMany();
  console.log('Documents in DB:', docs.length);
  
  const resume = docs.find(d => d.fileName.includes('resume'));
  if (resume) {
    console.log('Resume found! Length of text:', resume.content.length);
  } else {
    console.log('No resume found in DB yet (needs to be uploaded again to trigger the new worker flow).');
  }
  
  await prisma.$disconnect();
}
test().catch(console.error);
