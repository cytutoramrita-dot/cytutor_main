import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import TutorialService from '../services/tutorialService.js';

const router = Router();

// Get user's learning analytics dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Get tutorial analytics
    const tutorialAnalytics = await TutorialService.getUserAnalytics(userId);
    
    // Get challenge analytics (existing)
    const challengeAnalytics = await query(`
      SELECT 
        COUNT(*) as total_challenges,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as active,
        SUM(CASE WHEN status = 'completed' THEN c.points ELSE 0 END) as total_points
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      WHERE uc.user_id = $1
    `, [userId]);
    
    // Get recent activity
    const recentActivity = await query(`
      SELECT 
        'tutorial' as type,
        t.title as name,
        t.category,
        utp.last_accessed_at as activity_date,
        utp.status,
        utp.progress_percentage as progress
      FROM user_tutorial_progress utp
      JOIN tutorials t ON utp.tutorial_id = t.id
      WHERE utp.user_id = $1 AND utp.last_accessed_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'challenge' as type,
        c.title as name,
        c.category,
        uc.completed_at as activity_date,
        uc.status,
        CASE WHEN uc.status = 'completed' THEN 100 ELSE 0 END as progress
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      WHERE uc.user_id = $1 AND uc.completed_at IS NOT NULL

      UNION ALL

      SELECT
        'challenge' as type,
        COALESCE(gc.title, cc.title) as name,
        COALESCE(gc.category, cc.category) as category,
        asub.submitted_at as activity_date,
        'completed' as status,
        100 as progress
      FROM assignment_submissions asub
      JOIN assignments a ON a.id = asub.assignment_id
      LEFT JOIN challenges gc ON gc.id = a.global_challenge_id
      LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
      WHERE asub.user_id = $1 AND asub.is_correct = TRUE

      ORDER BY activity_date DESC
      LIMIT 10
    `, [userId]);
    
    // Get streak information
    const streakInfo = await query(`
      SELECT day_streak, max_streak, last_active_date
      FROM user_stats
      WHERE user_id = $1
    `, [userId]);
    
    res.json({
      tutorials: tutorialAnalytics,
      challenges: challengeAnalytics.rows[0],
      recentActivity: recentActivity.rows,
      streak: streakInfo.rows[0] || { day_streak: 0, max_streak: 0, last_active_date: null }
    });
  } catch (error) {
    logger.error('Get analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get learning path recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const recommendations = await TutorialService.getRecommendedTutorials(userId, limit);
    
    res.json(recommendations);
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Get learning progress over time
router.get('/progress-timeline', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;
    
    const timeline = await query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      daily_progress AS (
        SELECT 
          DATE(utp.last_accessed_at) as date,
          COUNT(DISTINCT CASE WHEN utp.status = 'completed' THEN utp.tutorial_id END) as tutorials_completed,
          COUNT(DISTINCT CASE WHEN uc.status = 'completed' THEN uc.challenge_id END) as challenges_completed,
          SUM(CASE WHEN DATE(utp.last_accessed_at) = DATE(utp.last_accessed_at) THEN utp.time_spent ELSE 0 END) as time_spent
        FROM user_tutorial_progress utp
        FULL OUTER JOIN user_challenges uc ON uc.user_id = utp.user_id AND DATE(uc.completed_at) = DATE(utp.last_accessed_at)
        WHERE utp.user_id = $1 OR uc.user_id = $1
        GROUP BY DATE(utp.last_accessed_at)
      )
      SELECT 
        ds.date,
        COALESCE(dp.tutorials_completed, 0) as tutorials_completed,
        COALESCE(dp.challenges_completed, 0) as challenges_completed,
        COALESCE(dp.time_spent, 0) as time_spent
      FROM date_series ds
      LEFT JOIN daily_progress dp ON ds.date = dp.date
      ORDER BY ds.date
    `, [userId]);
    
    res.json(timeline.rows);
  } catch (error) {
    logger.error('Get progress timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch progress timeline' });
  }
});

// Get skill assessment based on completed tutorials and challenges
router.get('/skills', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const skills = await query(`
      WITH tutorial_skills AS (
        SELECT 
          t.category,
          COUNT(*) as completed_tutorials,
          AVG(utp.progress_percentage) as avg_progress,
          SUM(t.estimated_time) as time_invested
        FROM user_tutorial_progress utp
        JOIN tutorials t ON utp.tutorial_id = t.id
        WHERE utp.user_id = $1 AND utp.status = 'completed'
        GROUP BY t.category
      ),
      challenge_skills AS (
        SELECT 
          c.category,
          COUNT(*) as completed_challenges,
          SUM(c.points) as points_earned,
          AVG(c.points) as avg_difficulty
        FROM user_challenges uc
        JOIN challenges c ON uc.challenge_id = c.id
        WHERE uc.user_id = $1 AND uc.status = 'completed'
        GROUP BY c.category
      )
      SELECT 
        COALESCE(ts.category, cs.category) as category,
        COALESCE(ts.completed_tutorials, 0) as completed_tutorials,
        COALESCE(ts.avg_progress, 0) as avg_progress,
        COALESCE(ts.time_invested, 0) as time_invested,
        COALESCE(cs.completed_challenges, 0) as completed_challenges,
        COALESCE(cs.points_earned, 0) as points_earned,
        COALESCE(cs.avg_difficulty, 0) as avg_difficulty,
        -- Calculate skill level (0-100)
        LEAST(100, 
          (COALESCE(ts.completed_tutorials, 0) * 10) + 
          (COALESCE(cs.completed_challenges, 0) * 15) + 
          (COALESCE(ts.avg_progress, 0) * 0.3)
        ) as skill_level
      FROM tutorial_skills ts
      FULL OUTER JOIN challenge_skills cs ON ts.category = cs.category
      ORDER BY skill_level DESC
    `, [userId]);
    
    res.json(skills.rows);
  } catch (error) {
    logger.error('Get skills assessment error:', error);
    res.status(500).json({ error: 'Failed to fetch skills assessment' });
  }
});

// Get leaderboard (tutorials + challenges combined)
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const timeframe = req.query.timeframe as string || 'all'; // all, week, month
    
    let dateFilter = '';
    if (timeframe === 'week') {
      dateFilter = "AND utp.last_accessed_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
      dateFilter = "AND utp.last_accessed_at >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    const leaderboard = await query(`
      SELECT 
        u.username,
        u.full_name,
        u.avatar,
        COUNT(DISTINCT CASE WHEN utp.status = 'completed' THEN utp.tutorial_id END) as tutorials_completed,
        COUNT(DISTINCT CASE WHEN uc.status = 'completed' THEN uc.challenge_id END) as challenges_completed,
        COALESCE(SUM(CASE WHEN uc.status = 'completed' THEN c.points ELSE 0 END), 0) as total_points,
        COALESCE(us.total_points, 0) as user_total_points
      FROM users u
      LEFT JOIN user_tutorial_progress utp ON u.id = utp.user_id ${dateFilter.replace('utp.completed_at', 'utp.last_accessed_at')}
      LEFT JOIN user_challenges uc ON u.id = uc.user_id AND uc.status = 'completed'
      LEFT JOIN challenges c ON uc.challenge_id = c.id
      LEFT JOIN user_stats us ON u.id = us.user_id
      GROUP BY u.id, u.username, u.full_name, u.avatar, us.total_points
      HAVING COUNT(DISTINCT CASE WHEN utp.status = 'completed' THEN utp.tutorial_id END) > 0 
          OR COUNT(DISTINCT CASE WHEN uc.status = 'completed' THEN uc.challenge_id END) > 0
          OR us.total_points > 0
      ORDER BY COALESCE(us.total_points, 0) DESC, tutorials_completed DESC, challenges_completed DESC
      LIMIT $1
    `, [limit]);
    
    res.json(leaderboard.rows);
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;