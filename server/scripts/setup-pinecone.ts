import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';

async function createIndex() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexName = process.env.PINECONE_INDEX || 'aura-index';

  // List existing indexes
  const existing = await pc.listIndexes();
  const names = existing.indexes?.map(i => i.name) || [];
  console.log('Existing indexes:', names);

  if (names.includes(indexName)) {
    console.log(`Index "${indexName}" already exists.`);
    const info = await pc.describeIndex(indexName);
    console.log('Dimension:', info.dimension);
    return;
  }

  console.log(`Creating index "${indexName}" with 3072 dimensions (gemini-embedding-001)...`);
  await pc.createIndex({
    name: indexName,
    dimension: 3072,        // gemini-embedding-001 output dimension
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',  // Free tier default
      }
    }
  });

  console.log(`✅ Index "${indexName}" created! Waiting for it to become ready...`);

  // Poll until ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const info = await pc.describeIndex(indexName);
    console.log(`Status: ${info.status?.state}`);
    if (info.status?.ready) {
      console.log('✅ Index is ready!');
      return;
    }
  }
}

createIndex().catch(console.error);
