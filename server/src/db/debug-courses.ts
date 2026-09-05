import { pathToFileURL } from 'url';
import { query } from './index.js';

async function debugCourses() {
  try {
    console.log('🔍 Debugging course data...');
    
    // Check courses table
    const courses = await query('SELECT id, title, total_modules FROM courses');
    console.log('📚 Courses in database:', courses.rows);
    
    // Check course_modules table
    const modules = await query('SELECT course_id, id, title FROM course_modules ORDER BY course_id, order_index');
    console.log('📖 Course modules in database:', modules.rows);
    
    // Check if modules are linked to courses
    const linkedModules = await query(`
      SELECT c.title as course_title, cm.title as module_title, cm.order_index
      FROM courses c
      LEFT JOIN course_modules cm ON c.id = cm.course_id
      ORDER BY c.id, cm.order_index
    `);
    console.log('🔗 Linked modules:', linkedModules.rows);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  debugCourses()
    .then(() => {
      console.log('✅ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

export { debugCourses };