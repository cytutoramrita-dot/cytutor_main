import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TutorialSection {
  title: string;
  type: 'text' | 'code' | 'video' | 'image' | 'interactive';
  content: string;
  codeLanguage?: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  route: string;
  estimatedTime: number; // JSON uses camelCase
  prerequisites: string[];
  learningObjectives: string[]; // JSON uses camelCase
  content: {
    sections: TutorialSection[];
  };
  quiz?: {
    questions: QuizQuestion[];
  };
  resources: string[];
  author: string;
  createdAt: string; // JSON uses camelCase
}

interface TutorialData {
  tutorials: Tutorial[];
}

async function loadTutorials() {
  try {
    console.log('📚 Loading tutorials from JSON...');
    
    // Read tutorials.json from project root
    const tutorialsPath = join(__dirname, '../../../tutorials.json');
    const tutorialsData: TutorialData = JSON.parse(readFileSync(tutorialsPath, 'utf8'));
    
    console.log(`📊 Found ${tutorialsData.tutorials.length} tutorials`);
    
    // Validate data before loading
    const errors = validateTutorialData(tutorialsData);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(error => console.error(`   ${error}`));
      throw new Error('Tutorial data validation failed');
    }
    
    console.log('✅ Validation passed');
    
    // Clear existing tutorials (optional - for fresh reload)
    await query('DELETE FROM tutorials');
    console.log('🗑️  Cleared existing tutorials');
    
    // Load tutorials into database
    let loaded = 0;
    let skipped = 0;
    
    for (const tutorial of tutorialsData.tutorials) {
      try {
        await query(
          `INSERT INTO tutorials (
            id, title, description, level, category, route, 
            estimated_time, prerequisites, learning_objectives, 
            content, resources, author, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            tutorial.id,
            tutorial.title,
            tutorial.description,
            tutorial.level,
            tutorial.category,
            tutorial.route,
            tutorial.estimatedTime,
            tutorial.prerequisites,
            tutorial.learningObjectives,
            JSON.stringify(tutorial.content),
            tutorial.resources,
            tutorial.author,
            tutorial.createdAt,
            new Date().toISOString()
          ]
        );
        
        console.log(`✅ Loaded: ${tutorial.title} (${tutorial.category})`);
        loaded++;
      } catch (error) {
        console.error(`❌ Failed to load tutorial: ${tutorial.title}`, error);
        skipped++;
      }
    }
    
    // Update completion rates and statistics
    await updateTutorialStatistics();
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Loaded: ${loaded} tutorials`);
    console.log(`   ❌ Skipped: ${skipped} tutorials`);
    
    return { loaded, skipped, total: tutorialsData.tutorials.length };
    
  } catch (error) {
    console.error('❌ Failed to load tutorials:', error);
    throw error;
  }
}

async function updateTutorialStatistics() {
  try {
    console.log('📈 Updating tutorial statistics...');
    
    // Calculate completion rates for each tutorial
    const completionStats = await query(`
      SELECT 
        tutorial_id,
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions,
        ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as completion_rate
      FROM user_tutorial_progress 
      GROUP BY tutorial_id
    `);
    
    // Update completion rates in tutorials table
    for (const stat of completionStats.rows) {
      await query(
        'UPDATE tutorials SET completion_rate = $1 WHERE id = $2',
        [stat.completion_rate, stat.tutorial_id]
      );
    }
    
    console.log(`✅ Updated statistics for ${completionStats.rows.length} tutorials`);
    
  } catch (error) {
    console.error('❌ Failed to update tutorial statistics:', error);
  }
}

// Validation function
function validateTutorialData(tutorialData: TutorialData): string[] {
  const errors: string[] = [];
  
  if (!tutorialData.tutorials || !Array.isArray(tutorialData.tutorials)) {
    errors.push('Missing or invalid tutorials array');
    return errors;
  }
  
  const tutorialIds = new Set<string>();
  
  tutorialData.tutorials.forEach((tutorial, index) => {
    const prefix = `Tutorial ${index + 1} (${tutorial.title || 'unnamed'})`;
    
    // Required fields
    if (!tutorial.id) {
      errors.push(`${prefix}: Missing id`);
    } else if (tutorialIds.has(tutorial.id)) {
      errors.push(`${prefix}: Duplicate id '${tutorial.id}'`);
    } else {
      tutorialIds.add(tutorial.id);
    }
    
    if (!tutorial.title) errors.push(`${prefix}: Missing title`);
    if (!tutorial.description) errors.push(`${prefix}: Missing description`);
    if (!['beginner', 'intermediate', 'advanced'].includes(tutorial.level)) {
      errors.push(`${prefix}: Invalid level (must be beginner, intermediate, or advanced)`);
    }
    if (!tutorial.category) errors.push(`${prefix}: Missing category`);
    if (!tutorial.route) errors.push(`${prefix}: Missing route`);
    if (!tutorial.estimatedTime || tutorial.estimatedTime <= 0) {
      errors.push(`${prefix}: Invalid estimatedTime (must be positive number)`);
    }
    if (!tutorial.author) errors.push(`${prefix}: Missing author`);
    if (!tutorial.createdAt) errors.push(`${prefix}: Missing createdAt`);
    
    // Validate arrays
    if (!Array.isArray(tutorial.prerequisites)) {
      errors.push(`${prefix}: prerequisites must be an array`);
    }
    if (!Array.isArray(tutorial.learningObjectives)) {
      errors.push(`${prefix}: learningObjectives must be an array`);
    }
    if (!Array.isArray(tutorial.resources)) {
      errors.push(`${prefix}: resources must be an array`);
    }
    
    // Validate content structure
    if (!tutorial.content || !tutorial.content.sections || !Array.isArray(tutorial.content.sections)) {
      errors.push(`${prefix}: Invalid content structure (must have sections array)`);
    } else {
      tutorial.content.sections.forEach((section, sectionIndex) => {
        const sectionPrefix = `${prefix} Section ${sectionIndex + 1}`;
        if (!section.title) errors.push(`${sectionPrefix}: Missing title`);
        if (!section.type) errors.push(`${sectionPrefix}: Missing type`);
        if (!section.content) errors.push(`${sectionPrefix}: Missing content`);
        if (!['text', 'code', 'video', 'image', 'interactive'].includes(section.type)) {
          errors.push(`${sectionPrefix}: Invalid type`);
        }
      });
    }
    
    // Validate quiz if present
    if (tutorial.quiz) {
      if (!Array.isArray(tutorial.quiz.questions)) {
        errors.push(`${prefix}: Quiz questions must be an array`);
      } else {
        tutorial.quiz.questions.forEach((question, qIndex) => {
          const qPrefix = `${prefix} Question ${qIndex + 1}`;
          if (!question.question) errors.push(`${qPrefix}: Missing question text`);
          if (!Array.isArray(question.options)) errors.push(`${qPrefix}: Options must be an array`);
          if (typeof question.correct !== 'number') errors.push(`${qPrefix}: Correct answer must be a number`);
          if (question.options && (question.correct < 0 || question.correct >= question.options.length)) {
            errors.push(`${qPrefix}: Correct answer index out of range`);
          }
        });
      }
    }
    
    // Validate prerequisites exist (cross-reference)
    if (tutorial.prerequisites && tutorial.prerequisites.length > 0) {
      tutorial.prerequisites.forEach(prereqId => {
        if (!tutorialData.tutorials.some(t => t.id === prereqId)) {
          errors.push(`${prefix}: Prerequisite '${prereqId}' not found`);
        }
      });
    }
  });
  
  return errors;
}

// Get tutorial statistics
async function getTutorialStatistics() {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_tutorials,
        COUNT(CASE WHEN level = 'beginner' THEN 1 END) as beginner_count,
        COUNT(CASE WHEN level = 'intermediate' THEN 1 END) as intermediate_count,
        COUNT(CASE WHEN level = 'advanced' THEN 1 END) as advanced_count,
        AVG(completion_rate) as avg_completion_rate,
        AVG(estimated_time) as avg_estimated_time
      FROM tutorials
    `);
    
    const categoryStats = await query(`
      SELECT category, COUNT(*) as count 
      FROM tutorials 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    return {
      overview: stats.rows[0],
      byCategory: categoryStats.rows
    };
  } catch (error) {
    console.error('Failed to get tutorial statistics:', error);
    return null;
  }
}

// CLI usage
async function main() {
  try {
    const result = await loadTutorials();
    
    console.log('\n🎉 Tutorials loaded successfully!');
    
    // Show statistics
    const stats = await getTutorialStatistics();
    if (stats) {
      console.log('\n📊 Tutorial Statistics:');
      console.log(`   Total: ${stats.overview.total_tutorials}`);
      console.log(`   Beginner: ${stats.overview.beginner_count}`);
      console.log(`   Intermediate: ${stats.overview.intermediate_count}`);
      console.log(`   Advanced: ${stats.overview.advanced_count}`);
      console.log(`   Avg Completion Rate: ${parseFloat(stats.overview.avg_completion_rate || 0).toFixed(1)}%`);
      console.log(`   Avg Duration: ${parseFloat(stats.overview.avg_estimated_time || 0).toFixed(0)} minutes`);
      
      console.log('\n📂 By Category:');
      stats.byCategory.forEach(cat => {
        console.log(`   ${cat.category}: ${cat.count}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { loadTutorials, validateTutorialData, getTutorialStatistics, updateTutorialStatistics };

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}