import { query } from './index.js';

async function seed() {
  try {
    console.log('Challenges are now loaded via load-challenges.ts script');
    console.log('Run: npm run load-challenges');
    
    console.log('Tutorials are now loaded via load-tutorials.ts script');
    console.log('Run: npm run load-tutorials');

    console.log('Seeding ports...');
    const MIN_PORT = parseInt(process.env.CHALLENGE_PORT_MIN || '10000');
    const MAX_PORT = parseInt(process.env.CHALLENGE_PORT_MAX || '20000');

    // Generate a large VALUES clause for bulk insert
    let values = [];
    for (let p = MIN_PORT; p <= MAX_PORT; p++) {
      values.push(`(${p})`);
    }

    // Insert in chunks to avoid query size limits if range is huge
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      await query(`
            INSERT INTO ports (port) VALUES ${chunk.join(',')}
            ON CONFLICT DO NOTHING
        `);
    }

    console.log('✓ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
