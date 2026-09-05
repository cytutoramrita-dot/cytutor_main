import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { param, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

const router = Router();

// Get all courses with user progress
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const result = await query(`
      SELECT 
        c.*,
        COALESCE(ucp.status, 'not_started') as user_status,
        COALESCE(ucp.progress_percentage, 0) as user_progress,
        COALESCE(ucp.completed_modules, 0) as user_completed_modules,
        ucp.started_at as user_started_at,
        ucp.completed_at as user_completed_at,
        ucp.last_accessed_at as user_last_accessed_at,
        COUNT(cm.id) as actual_total_modules
      FROM courses c
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $1
      LEFT JOIN course_modules cm ON c.id = cm.course_id
      GROUP BY c.id, ucp.status, ucp.progress_percentage, ucp.completed_modules, 
               ucp.started_at, ucp.completed_at, ucp.last_accessed_at
      ORDER BY c.category, c.level, c.title
    `, [userId]);
    
    // Get modules for each course
    const coursesWithModules = await Promise.all(
      result.rows.map(async (row) => {
        const modulesResult = await query(`
          SELECT 
            cm.*,
            COALESCE(utp.status, 'not_started') as user_status,
            COALESCE(utp.progress_percentage, 0) as user_progress,
            utp.completed_at as user_completed_at
          FROM course_modules cm
          LEFT JOIN user_tutorial_progress utp ON cm.tutorial_id = utp.tutorial_id AND utp.user_id = $1
          WHERE cm.course_id = $2
          ORDER BY cm.order_index
        `, [userId, row.id]);
        
        const modules = modulesResult.rows.map(moduleRow => ({
          id: moduleRow.id,
          title: moduleRow.title,
          description: moduleRow.description,
          estimated_time: moduleRow.estimated_time,
          prerequisites: moduleRow.prerequisites,
          route: moduleRow.route,
          user_status: moduleRow.user_status,
          user_progress: moduleRow.user_progress,
          user_completed_at: moduleRow.user_completed_at
        }));
        
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          level: row.level,
          total_modules: row.actual_total_modules || row.total_modules,
          total_time: row.total_time,
          icon: row.icon,
          color: row.color,
          tags: row.tags,
          learning_objectives: row.learning_objectives,
          modules: modules,
          user_progress: {
            completed_modules: row.user_completed_modules,
            total_progress: row.user_progress,
            status: row.user_status,
            started_at: row.user_started_at,
            completed_at: row.user_completed_at,
            last_accessed_at: row.user_last_accessed_at
          }
        };
      })
    );
    
    res.json(coursesWithModules);
  } catch (error) {
    logger.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get specific course with modules and user progress
router.get('/:id', authenticate, [
  param('id').notEmpty().withMessage('Course ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Get course details
    const courseResult = await query(`
      SELECT 
        c.*,
        COALESCE(ucp.status, 'not_started') as user_status,
        COALESCE(ucp.progress_percentage, 0) as user_progress,
        COALESCE(ucp.completed_modules, 0) as user_completed_modules,
        ucp.started_at as user_started_at,
        ucp.completed_at as user_completed_at,
        ucp.last_accessed_at as user_last_accessed_at
      FROM courses c
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $1
      WHERE c.id = $2
    `, [userId, id]);
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const course = courseResult.rows[0];
    
    // Get course modules with tutorial progress
    const modulesResult = await query(`
      SELECT 
        cm.*,
        t.level as tutorial_level,
        t.category as tutorial_category,
        COALESCE(utp.status, 'not_started') as user_status,
        COALESCE(utp.progress_percentage, 0) as user_progress,
        utp.completed_at as user_completed_at
      FROM course_modules cm
      LEFT JOIN tutorials t ON cm.tutorial_id = t.id
      LEFT JOIN user_tutorial_progress utp ON cm.tutorial_id = utp.tutorial_id AND utp.user_id = $1
      WHERE cm.course_id = $2
      ORDER BY cm.order_index
    `, [userId, id]);
    
    const modules = modulesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      estimated_time: row.estimated_time,
      prerequisites: row.prerequisites,
      route: row.route,
      user_status: row.user_status,
      user_progress: row.user_progress,
      user_completed_at: row.user_completed_at
    }));
    
    const courseWithModules = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      total_modules: modules.length,
      total_time: course.total_time,
      icon: course.icon,
      color: course.color,
      tags: course.tags,
      learning_objectives: course.learning_objectives,
      modules: modules,
      user_progress: {
        completed_modules: course.user_completed_modules,
        total_progress: course.user_progress,
        status: course.user_status,
        started_at: course.user_started_at,
        completed_at: course.user_completed_at,
        last_accessed_at: course.user_last_accessed_at
      }
    };
    
    res.json(courseWithModules);
  } catch (error) {
    logger.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Update user course progress
router.post('/:id/progress', authenticate, [
  param('id').notEmpty().withMessage('Course ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Calculate course progress based on tutorial progress
    const progressResult = await query(`
      SELECT 
        COUNT(cm.id) as total_modules,
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completed_modules,
        ROUND(
          AVG(CASE WHEN utp.progress_percentage IS NOT NULL THEN utp.progress_percentage ELSE 0 END)
        ) as avg_progress
      FROM course_modules cm
      LEFT JOIN user_tutorial_progress utp ON cm.tutorial_id = utp.tutorial_id AND utp.user_id = $1
      WHERE cm.course_id = $2
    `, [userId, id]);
    
    const stats = progressResult.rows[0];
    const progressPercentage = Math.round(stats.avg_progress || 0);
    const completedModules = parseInt(stats.completed_modules) || 0;
    const totalModules = parseInt(stats.total_modules) || 0;
    
    let status = 'not_started';
    if (completedModules === totalModules && totalModules > 0) {
      status = 'completed';
    } else if (completedModules > 0 || progressPercentage > 0) {
      status = 'in_progress';
    }
    
    // Upsert user course progress
    await query(`
      INSERT INTO user_course_progress (
        user_id, course_id, status, progress_percentage, completed_modules, 
        total_modules, started_at, completed_at, last_accessed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        CASE WHEN $3 != 'not_started' AND $7 IS NULL THEN NOW() ELSE $7 END,
        CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END,
        NOW()
      )
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        status = $3,
        progress_percentage = $4,
        completed_modules = $5,
        total_modules = $6,
        started_at = CASE 
          WHEN user_course_progress.started_at IS NULL AND $3 != 'not_started' 
          THEN NOW() 
          ELSE user_course_progress.started_at 
        END,
        completed_at = CASE 
          WHEN $3 = 'completed' THEN NOW() 
          ELSE user_course_progress.completed_at 
        END,
        last_accessed_at = NOW()
    `, [userId, id, status, progressPercentage, completedModules, totalModules, null]);
    
    res.json({
      status,
      progress_percentage: progressPercentage,
      completed_modules: completedModules,
      total_modules: totalModules
    });
  } catch (error) {
    logger.error('Update course progress error:', error);
    res.status(500).json({ error: 'Failed to update course progress' });
  }
});

// Get course categories
router.get('/meta/categories', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT category 
      FROM courses 
      ORDER BY category
    `);
    
    const categories = result.rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    logger.error('Get course categories error:', error);
    res.status(500).json({ error: 'Failed to fetch course categories' });
  }
});

export default router;