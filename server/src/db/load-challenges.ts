import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  description: string;
  flag: string;
  hints?: string[];
  tags?: string[];
  docker?: {
    image: string;
    port: number;
    memory: string;
    timeout: number;
  };
  prerequisites?: string[];
  unlocks?: string[];
  author?: string;
  createdAt?: string;
}

interface ChallengeData {
  challenges: Challenge[];
}

async function loadChallenges() {
  try {
    console.log('📚 Loading challenges from JSON...');
    
    // Read challenges.json from project root
    const challengesPath = join(__dirname, '../../../challenges.json');
    const challengesData: ChallengeData = JSON.parse(readFileSync(challengesPath, 'utf8'));
    
    console.log(`📊 Found ${challengesData.challenges.length} challenges`);
    
    // Clear existing challenges (optional - for fresh reload)
    await query('DELETE FROM challenges');
    console.log('🗑️  Cleared existing challenges');
    
    // Load challenges into database
    let loaded = 0;
    let skipped = 0;
    
    for (const challenge of challengesData.challenges) {
      try {
        await query(
          `INSERT INTO challenges (id, title, category, difficulty, points, description, flag, challenge_type, hints, file_attachments, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            challenge.id,
            challenge.title,
            challenge.category,
            challenge.difficulty,
            challenge.points,
            challenge.description,
            challenge.flag,
            challenge.type || 'web',
            challenge.hints || null,
            challenge.fileAttachments || null,
            challenge.createdAt || new Date().toISOString()
          ]
        );
        
        console.log(`✅ Loaded: ${challenge.title} (${challenge.category})`);
        loaded++;
      } catch (error) {
        console.error(`❌ Failed to load challenge: ${challenge.title}`, error);
        skipped++;
      }
    }
    
    // Update challenge registry for Docker orchestration
    await updateChallengeRegistry(challengesData.challenges);
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Loaded: ${loaded} challenges`);
    console.log(`   ❌ Skipped: ${skipped} challenges`);
    
    return { loaded, skipped, total: challengesData.challenges.length };
    
  } catch (error) {
    console.error('❌ Failed to load challenges:', error);
    throw error;
  }
}

async function updateChallengeRegistry(challenges: Challenge[]) {
  try {
    console.log('🐳 Updating Docker challenge registry...');
    
    // Create registry entries for challenges with Docker config
    const registryEntries = challenges
      .filter(challenge => challenge.docker)
      .map(challenge => ({
        id: challenge.id,
        name: challenge.title,
        image: challenge.docker!.image,
        internalPort: challenge.docker!.port,
        description: challenge.description,
        category: challenge.category,
        difficulty: challenge.difficulty
      }));
    
    // Write to registry file
    const registryPath = join(__dirname, '../orchestrator/challenge-registry.json');
    const fs = await import('fs');
    fs.writeFileSync(registryPath, JSON.stringify(registryEntries, null, 2));
    
    console.log(`✅ Updated registry with ${registryEntries.length} Docker challenges`);
    
  } catch (error) {
    console.error('❌ Failed to update challenge registry:', error);
  }
}

// Validation function
function validateChallengeData(challengeData: ChallengeData): string[] {
  const errors: string[] = [];
  
  if (!challengeData.challenges || !Array.isArray(challengeData.challenges)) {
    errors.push('Missing or invalid challenges array');
    return errors;
  }
  
  challengeData.challenges.forEach((challenge, index) => {
    const prefix = `Challenge ${index + 1} (${challenge.title || 'unnamed'})`;
    
    if (!challenge.id) errors.push(`${prefix}: Missing id`);
    if (!challenge.title) errors.push(`${prefix}: Missing title`);
    if (!challenge.category) errors.push(`${prefix}: Missing category`);
    if (!['Easy', 'Medium', 'Hard'].includes(challenge.difficulty)) {
      errors.push(`${prefix}: Invalid difficulty (must be Easy, Medium, or Hard)`);
    }
    if (!challenge.points || challenge.points <= 0) {
      errors.push(`${prefix}: Invalid points (must be positive number)`);
    }
    if (!challenge.description) errors.push(`${prefix}: Missing description`);
    if (!challenge.flag) errors.push(`${prefix}: Missing flag`);
    
    // Validate Docker config if present
    if (challenge.docker) {
      if (!challenge.docker.image) errors.push(`${prefix}: Missing Docker image`);
      if (!challenge.docker.port) errors.push(`${prefix}: Missing Docker port`);
    }
  });
  
  return errors;
}

// CLI usage
async function main() {
  try {
    // Validate first
    const challengesPath = join(__dirname, '../../../challenges.json');
    const challengesData: ChallengeData = JSON.parse(readFileSync(challengesPath, 'utf8'));
    
    const errors = validateChallengeData(challengesData);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }
    
    console.log('✅ Validation passed');
    
    // Load challenges
    const result = await loadChallenges();
    
    console.log('\n🎉 Challenges loaded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { loadChallenges, validateChallengeData };

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}