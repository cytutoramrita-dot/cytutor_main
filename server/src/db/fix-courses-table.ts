import { pathToFileURL } from 'url';
import { query } from './index.js';

async function fixCoursesTable() {
  try {
    console.log('🔧 Adding missing completion_rate column to courses table...');
    
    // Add the missing column
    await query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.00
    `);
    
    console.log('✅ Successfully added completion_rate column');
    
    // Update course statistics
    console.log('📈 Updating course statistics...');
    await query(`
      UPDATE courses 
      SET completion_rate = COALESCE(stats.completion_rate, 0.00)
      FROM (
        SELECT 
          c.id,
          ROUND(
            (COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(ucp.user_id), 0))::numeric, 2
          ) as completion_rate
        FROM courses c
        LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id
        GROUP BY c.id
      ) stats
      WHERE courses.id = stats.id
    `);
    
    console.log('✅ Course statistics updated successfully');
    
  } catch (error) {
    console.error('❌ Failed to fix courses table:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fixCoursesTable()
    .then(() => {
      console.log('🎉 Courses table fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

export { fixCoursesTable };