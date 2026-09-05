import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';
import { logger } from '../utils/logger.js';

const router = Router();

const getUserProfileQuery = `
  SELECT u.*,
    json_build_object(
      'challengesSolved', s.challenges_solved,
      'totalPoints', s.total_points,
      'globalRank', (
        SELECT COUNT(*) + 1
        FROM user_stats
        WHERE total_points > s.total_points
      ),
      'dayStreak', s.day_streak,
      'maxStreak', s.max_streak,
      'previousStreak', s.previous_streak,
      'lastActiveDate', s.last_active_date,
      'streakFreezes', s.streak_freezes,
      'level', s.level,
      'xp', s.xp,
      'activityHistory', s.activity_history
    ) as stats
  FROM users u
  LEFT JOIN user_stats s ON u.id = s.user_id
  WHERE u.id = $1
`;

const normalizeUserResponse = (user: any) => {
  delete user.password_hash;

  user.fullName = user.full_name;
  delete user.full_name;

  user.experienceLevel = user.experience_level;
  delete user.experience_level;

  user.isEmailVerified = user.is_email_verified;
  delete user.is_email_verified;

  user.isProfileComplete = user.is_profile_complete;
  delete user.is_profile_complete;

  return user;
};

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(getUserProfileQuery, [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(normalizeUserResponse(result.rows[0]));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { fullName, username, avatar, location, timezone, experienceLevel, interests, bio, goals } = req.body;
    const existingUserResult = await query(
      'SELECT email, full_name, username, is_profile_complete FROM users WHERE id = $1',
      [req.userId]
    );

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = existingUserResult.rows[0];

    const result = await query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        username = COALESCE($2, username),
        avatar = COALESCE($3, avatar),
        location = COALESCE($4, location),
        timezone = COALESCE($5, timezone),
        experience_level = COALESCE($6, experience_level),
        interests = COALESCE($7, interests),
        bio = COALESCE($8, bio),
        goals = COALESCE($9, goals),
        is_profile_complete = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, email, full_name, username, is_profile_complete`,
      [fullName, username, avatar, location, timezone, experienceLevel, interests, bio, goals, req.userId]
    );

    const updatedUser = result.rows[0];

    if (!existingUser.is_profile_complete && updatedUser.is_profile_complete) {
      sendWelcomeEmail(updatedUser.email, updatedUser.username, updatedUser.full_name).catch(err =>
        logger.error('Failed to send welcome email', err)
      );
    }

    const refreshedUserResult = await query(getUserProfileQuery, [req.userId]);
    res.json(normalizeUserResponse(refreshedUserResult.rows[0]));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/streak/check', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get user's timezone
    const userResult = await query(
      `SELECT timezone FROM users WHERE id = $1`,
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const timezone = userResult.rows[0].timezone || 'Asia/Kolkata';

    // Use the new streak service (handles transactions, race conditions, timezone properly)
    const { checkAndUpdateStreak } = await import('../services/streakService.js');
    const result = await checkAndUpdateStreak(req.userId!, timezone);

    // Get updated stats
    const statsResult = await query(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [req.userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      status: result.status,
      reward: result.xpGain > 0 || result.pointsGain > 0 
        ? { xp: result.xpGain, points: result.pointsGain, message: result.message }
        : undefined,
      stats: {
        dayStreak: stats.day_streak,
        maxStreak: stats.max_streak,
        streakFreezes: stats.streak_freezes,
        previousStreak: stats.previous_streak,
        xp: stats.xp,
        totalPoints: stats.total_points,
        lastActiveDate: stats.last_active_date
      }
    });
  } catch (error) {
    console.error('Streak check error:', error);
    res.status(500).json({ error: 'Failed to check streak' });
  }
});

router.post('/streak/restore', authenticate, async (req: AuthRequest, res) => {
  try {
    // Use the new streak service (handles validation, time limits, transactions)
    const { restoreStreak } = await import('../services/streakService.js');
    const result = await restoreStreak(req.userId!);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      success: true, 
      newStreak: result.newStreak, 
      pointsSpent: result.pointsSpent 
    });
  } catch (error) {
    console.error('Restore streak error:', error);
    res.status(500).json({ error: 'Failed to restore streak' });
  }
});

export default router;
