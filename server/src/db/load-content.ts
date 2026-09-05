import { pathToFileURL } from 'url';
import { loadTutorials } from './load-tutorials.js';
import { loadCourses } from './load-courses.js';

/**
 * Unified content loader
 * Loads both tutorials and courses in the correct order
 */
async function loadAllContent() {
  console.log('🚀 Starting content loading process...\n');
  
  try {
    // Step 1: Load tutorials first (they must exist before courses can reference them)
    console.log('📚 Step 1: Loading tutorials...');
    const tutorialResult = await loadTutorials();
    console.log(`✅ Tutorials loaded: ${tutorialResult.loaded}/${tutorialResult.total}\n`);
    
    // Step 2: Load courses (references tutorials via course_modules)
    console.log('📖 Step 2: Loading courses...');
    await loadCourses();
    console.log('✅ Courses loaded successfully\n');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 Content Loading Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`✅ ${tutorialResult.loaded} tutorials loaded`);
    console.log('✅ Courses and modules created');
    console.log('✅ Database ready for use');
    console.log('═══════════════════════════════════════\n');
    
    return {
      success: true,
      tutorials: tutorialResult,
      message: 'All content loaded successfully'
    };
    
  } catch (error) {
    console.error('❌ Content loading failed:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadAllContent()
    .then(() => {
      console.log('✅ Process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Process failed:', error);
      process.exit(1);
    });
}

export { loadAllContent };
