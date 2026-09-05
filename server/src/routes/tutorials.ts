import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

const router = Router();

// Get all tutorials with optional filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { level, category, limit, offset } = req.query;
    const userId = req.user?.id;
    
    let queryStr = `
      SELECT 
        t.*,
        COALESCE(utp.status, 'not_started') as user_status,
        COALESCE(utp.progress_percentage, 0) as user_progress,
        utp.completed_at as user_completed_at,
        AVG(tr.rating) as avg_rating,
        COUNT(tr.rating) as rating_count
      FROM tutorials t
      LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id AND utp.user_id = $1
      LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
    `;
    
    const params = [userId];
    const conditions = [];
    
    if (level) {
      conditions.push(`t.level = $${params.length + 1}`);
      params.push(level as string);
    }
    
    if (category) {
      conditions.push(`t.category = $${params.length + 1}`);
      params.push(category as string);
    }
    
    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    queryStr += ` GROUP BY t.id, utp.status, utp.progress_percentage, utp.completed_at`;
    queryStr += ` ORDER BY t.level, t.category, t.title`;
    
    if (limit) {
      queryStr += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit as string));
      
      if (offset) {
        queryStr += ` OFFSET $${params.length + 1}`;
        params.push(parseInt(offset as string));
      }
    }
    
    const result = await query(queryStr, params);
    
    // Format the response
    const tutorials = result.rows.map(row => ({
      ...row,
      avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      rating_count: parseInt(row.rating_count) || 0,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      // quiz_data removed - tutorials are now quiz-free
    }));

    res.json(tutorials);
  } catch (error) {
    logger.error('Get tutorials error:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Get specific tutorial by ID
router.get('/:id', authenticate, param('id').matches(/^[a-zA-Z0-9-_]+$/).isLength({ min: 1, max: 50 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const userId = req.user?.id;
    
    const result = await query(`
      SELECT 
        t.*,
        COALESCE(utp.status, 'not_started') as user_status,
        COALESCE(utp.progress_percentage, 0) as user_progress,
        COALESCE(utp.current_section, 0) as current_section,

        COALESCE(utp.time_spent, 0) as time_spent,
        utp.started_at,
        utp.completed_at as user_completed_at,
        utp.last_accessed_at,
        utp.notes as user_notes,
        AVG(tr.rating) as avg_rating,
        COUNT(tr.rating) as rating_count
      FROM tutorials t
      LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id AND utp.user_id = $1
      LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
      WHERE t.id = $2
      GROUP BY t.id, utp.status, utp.progress_percentage, utp.current_section, 
               utp.time_spent, utp.started_at, 
               utp.completed_at, utp.last_accessed_at, utp.notes
    `, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    const tutorial = result.rows[0];
    
    // Parse JSON fields
    tutorial.content = typeof tutorial.content === 'string' ? JSON.parse(tutorial.content) : tutorial.content;
    // quiz_data removed - tutorials are now quiz-free
    tutorial.avg_rating = tutorial.avg_rating ? parseFloat(tutorial.avg_rating).toFixed(1) : null;
    tutorial.rating_count = parseInt(tutorial.rating_count) || 0;
    
    // Update last accessed time
    await query(`
      INSERT INTO user_tutorial_progress (user_id, tutorial_id, last_accessed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, tutorial_id)
      DO UPDATE SET last_accessed_at = CURRENT_TIMESTAMP
    `, [userId, id]);
    
    res.json(tutorial);
  } catch (error) {
    logger.error('Get tutorial error:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial' });
  }
});

// Start or update tutorial progress
router.post('/:id/progress', 
  authenticate,
  param('id').matches(/^[a-zA-Z0-9-_]+$/).isLength({ min: 1, max: 50 }),
  body('section').optional().isInt({ min: 0 }),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('timeSpent').optional().isInt({ min: 0 }),
  body('notes').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { section, progress, timeSpent, notes } = req.body;
      const userId = req.user?.id;
      
      // Check if tutorial exists
      const tutorialCheck = await query('SELECT id FROM tutorials WHERE id = $1', [id]);
      if (tutorialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Tutorial not found' });
      }
      
      // Update or create progress
      const updateFields = [];
      const updateValues = [userId, id];
      let valueIndex = 3;
      
      if (section !== undefined) {
        updateFields.push(`current_section = $${valueIndex++}`);
        updateValues.push(section);
      }
      
      if (progress !== undefined) {
        updateFields.push(`progress_percentage = $${valueIndex++}`);
        updateValues.push(progress);
        
        // Auto-update status based on progress
        if (progress === 100) {
          updateFields.push(`status = 'completed'`);
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        } else if (progress > 0) {
          updateFields.push(`status = 'in_progress'`);
        }
      }
      
      if (timeSpent !== undefined) {
        updateFields.push(`time_spent = user_tutorial_progress.time_spent + $${valueIndex++}`);
        updateValues.push(timeSpent);
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex++}`);
        updateValues.push(notes);
      }
      
      updateFields.push(`last_accessed_at = CURRENT_TIMESTAMP`);
      
      const upsertQuery = `
        INSERT INTO user_tutorial_progress (user_id, tutorial_id, started_at, last_accessed_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, tutorial_id)
        DO UPDATE SET ${updateFields.join(', ')}
        RETURNING *
      `;
      
      const result = await query(upsertQuery, updateValues);
      
      logger.info('Tutorial progress updated', { userId, tutorialId: id, progress });
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Update tutorial progress error:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }
);

// Quiz functionality removed - tutorials are now quiz-free

// Rate tutorial
router.post('/:id/rating',
  authenticate,
  param('id').matches(/^[a-zA-Z0-9-_]+$/).isLength({ min: 1, max: 50 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('feedback').optional().isString(),
  body('isHelpful').optional().isBoolean(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { rating, feedback, isHelpful } = req.body;
      const userId = req.user?.id;
      
      // Check if tutorial exists
      const tutorialCheck = await query('SELECT id FROM tutorials WHERE id = $1', [id]);
      if (tutorialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Tutorial not found' });
      }
      
      // Upsert rating
      await query(`
        INSERT INTO tutorial_ratings (user_id, tutorial_id, rating, feedback, is_helpful)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, tutorial_id)
        DO UPDATE SET 
          rating = $3,
          feedback = $4,
          is_helpful = $5,
          created_at = CURRENT_TIMESTAMP
      `, [userId, id, rating, feedback, isHelpful]);
      
      logger.info('Tutorial rated', { userId, tutorialId: id, rating });
      res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
      logger.error('Rate tutorial error:', error);
      res.status(500).json({ error: 'Failed to submit rating' });
    }
  }
);

// Get tutorial statistics (admin endpoint)
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await query(`
      SELECT 
        COUNT(DISTINCT utp.user_id) as total_users,
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completions,
        COUNT(CASE WHEN utp.status = 'in_progress' THEN 1 END) as in_progress,
        AVG(utp.progress_percentage) as avg_progress,
        AVG(utp.time_spent) as avg_time_spent,

        AVG(tr.rating) as avg_rating,
        COUNT(tr.rating) as rating_count
      FROM tutorials t
      LEFT JOIN user_tutorial_progress utp ON t.id = utp.tutorial_id
      LEFT JOIN tutorial_ratings tr ON t.id = tr.tutorial_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (stats.rows.length === 0) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    const result = stats.rows[0];
    result.avg_progress = result.avg_progress ? parseFloat(result.avg_progress).toFixed(1) : 0;
    result.avg_time_spent = result.avg_time_spent ? parseFloat(result.avg_time_spent).toFixed(1) : 0;
    // avg_quiz_score removed - tutorials are now quiz-free
    result.avg_rating = result.avg_rating ? parseFloat(result.avg_rating).toFixed(1) : null;
    
    res.json(result);
  } catch (error) {
    logger.error('Get tutorial stats error:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial statistics' });
  }
});

export default router;
