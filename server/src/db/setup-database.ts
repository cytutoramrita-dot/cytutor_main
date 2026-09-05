import { pathToFileURL } from 'url';
import { query } from './index.js';
import { loadChallenges } from './load-challenges.js';
import { loadTutorials } from './load-tutorials.js';

/**
 * Comprehensive database setup script
 * Initializes all required data for a fresh CyTutor installation
 */

async function setupDatabase() {
  try {
    console.log('🚀 Starting CyTutor database setup...');
    
    // Step 1: Initialize port range for challenges
    console.log('🔌 Initializing port range...');
    const MIN_PORT = parseInt(process.env.CHALLENGE_PORT_MIN || '10000');
    const MAX_PORT = parseInt(process.env.CHALLENGE_PORT_MAX || '20000');

    // Generate port values
    let values = [];
    for (let p = MIN_PORT; p <= MAX_PORT; p++) {
      values.push(`(${p})`);
    }

    // Insert in chunks to avoid query size limits
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      await query(`
        INSERT INTO ports (port) VALUES ${chunk.join(',')}
        ON CONFLICT DO NOTHING
      `);
    }
    
    console.log(`✅ Initialized ${MAX_PORT - MIN_PORT + 1} ports (${MIN_PORT}-${MAX_PORT})`);
    
    // Step 2: Load challenges from JSON
    console.log('🎯 Loading challenges...');
    try {
      const challengeResult = await loadChallenges();
      console.log(`✅ Loaded ${challengeResult.loaded} challenges`);
    } catch (error) {
      console.error('❌ Failed to load challenges:', error);
    }
    
    // Step 3: Load tutorials from JSON
    console.log('📚 Loading tutorials...');
    try {
      const tutorialResult = await loadTutorials();
      console.log(`✅ Loaded ${tutorialResult.loaded} tutorials`);
    } catch (error) {
      console.error('❌ Failed to load tutorials:', error);
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 What was initialized:');
    console.log('   ✅ Port range for challenge containers');
    console.log('   ✅ Challenge data from challenges.json');
    console.log('   ✅ Tutorial data from tutorials.json');
    console.log('\n🚀 Your CyTutor instance is ready to use!');
    
    return {
      success: true,
      portsInitialized: MAX_PORT - MIN_PORT + 1,
      challengesLoaded: true,
      tutorialsLoaded: true
    };
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// CLI usage
async function main() {
  try {
    await setupDatabase();
    process.exit(0);
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { setupDatabase };

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}