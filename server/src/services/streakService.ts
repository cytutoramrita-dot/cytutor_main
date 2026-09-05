import { pool } from '../db/index.js';
import { getTodayInTimezone, getYesterdayInTimezone, isDateBefore, getHoursSince } from './timezoneService.js';

interface StreakCheckResult {
  status: 'same_day' | 'extended' | 'frozen' | 'broken' | 'new';
  newStreak: number;
  newMaxStreak: number;
  newFreezes: number;
  newPreviousStreak: number | null;
  xpGain: number;
  pointsGain: number;
  message: string;
}

/**
 * Check and update user's daily streak
 * Uses database transactions to prevent race conditions
 * Properly handles timezones (especially IST)
 */
export async function checkAndUpdateStreak(userId: string, timezone: string = 'Asia/Kolkata'): Promise<StreakCheckResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Lock the user_stats row to prevent race conditions
    const statsResult = await client.query(
      `SELECT * FROM user_stats WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (statsResult.rows.length === 0) {
      throw new Error('User stats not found');
    }

    const stats = statsResult.rows[0];
    
    // Calculate dates in user's timezone
    const today = getTodayInTimezone(timezone);
    const yesterday = getYesterdayInTimezone(timezone);
    const lastActive = stats.last_active_date;

    // Check if already claimed today (prevents double claims)
    if (stats.streak_claimed_today && stats.last_active_date === today) {
      await client.query('COMMIT');
      return {
        status: 'same_day',
        newStreak: stats.day_streak,
        newMaxStreak: stats.max_streak,
        newFreezes: stats.streak_freezes,
        newPreviousStreak: stats.previous_streak,
        xpGain: 0,
        pointsGain: 0,
        message: 'Already claimed today'
      };
    }

    let newStreak = stats.day_streak;
    let newMaxStreak = stats.max_streak;
    let newFreezes = stats.streak_freezes;
    let newPreviousStreak = stats.previous_streak;
    let xpGain = 0;
    let pointsGain = 0;
    let status: 'extended' | 'frozen' | 'broken' | 'new' = 'new';
    let message = '';

    // Case 1: Consecutive day (yesterday was last active)
    if (lastActive === yesterday) {
      newStreak += 1;
      status = 'extended';
      xpGain = 50;
      message = 'Daily Login Bonus';

      // Milestone rewards (non-overlapping)
      if (newStreak % 30 === 0) {
        pointsGain = 500;
        xpGain += 200;
        message = '30-Day Legend! Huge Bonus!';
      } else if (newStreak % 7 === 0) {
        pointsGain = 100;
        xpGain += 100;
        message = '7-Day Streak! Weekly Bonus!';
      } else if (newStreak === 3) {
        pointsGain = 50;
        message = '3-Day Hot Streak!';
      }

      if (newStreak > newMaxStreak) {
        newMaxStreak = newStreak;
      }
    }
    // Case 2: Missed one or more days
    else if (lastActive && isDateBefore(lastActive, yesterday)) {
      if (newFreezes > 0) {
        // Use a freeze - streak preserved
        newFreezes -= 1;
        status = 'frozen';
        message = 'Streak Freeze Used!';
        // Don't increment streak, but keep it alive
      } else {
        // Streak broken
        newPreviousStreak = newStreak;
        newStreak = 1;
        xpGain = 10;
        status = 'broken';
        message = 'Streak Broken - Starting Fresh';
        
        // Record when streak was broken (for restore time limits)
        await client.query(
          `UPDATE user_stats SET streak_broken_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [userId]
        );
      }
    }
    // Case 3: First login or no previous activity
    else {
      newStreak = 1;
      xpGain = 10;
      newMaxStreak = Math.max(newMaxStreak, 1);
      status = 'new';
      message = 'Welcome! Start Your Streak!';
    }

    // Update activity history (using PostgreSQL array operations to avoid duplicates)
    await client.query(
      `UPDATE user_stats SET
        activity_history = CASE 
          WHEN $1 = ANY(activity_history) THEN activity_history
          ELSE array_append(activity_history, $1)
        END
      WHERE user_id = $2`,
      [today, userId]
    );

    // Update all streak-related fields
    await client.query(
      `UPDATE user_stats SET
        day_streak = $1,
        max_streak = $2,
        streak_freezes = $3,
        previous_streak = $4,
        last_active_date = $5,
        streak_claimed_today = $6,
        xp = xp + $7,
        total_points = total_points + $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $9`,
      [newStreak, newMaxStreak, newFreezes, newPreviousStreak, today, true, xpGain, pointsGain, userId]
    );

    await client.query('COMMIT');

    return {
      status,
      newStreak,
      newMaxStreak,
      newFreezes,
      newPreviousStreak,
      xpGain,
      pointsGain,
      message
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Restore a broken streak (with time limit and validation)
 */
export async function restoreStreak(userId: string): Promise<{
  success: boolean;
  newStreak: number;
  pointsSpent: number;
  error?: string;
}> {
  const REPAIR_COST = 100;
  const RESTORE_WINDOW_HOURS = 24; // Can only restore within 24 hours

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the row
    const statsResult = await client.query(
      `SELECT * FROM user_stats WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (statsResult.rows.length === 0) {
      throw new Error('User stats not found');
    }

    const stats = statsResult.rows[0];

    // Validation 1: Check if user has enough points
    if (stats.total_points < REPAIR_COST) {
      await client.query('ROLLBACK');
      return {
        success: false,
        newStreak: stats.day_streak,
        pointsSpent: 0,
        error: 'Insufficient points'
      };
    }

    // Validation 2: Check if there's a streak to restore
    if (!stats.previous_streak || stats.previous_streak === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        newStreak: stats.day_streak,
        pointsSpent: 0,
        error: 'No streak to restore'
      };
    }

    // Validation 3: Check if restore window is still open
    if (stats.streak_broken_at) {
      const hoursSinceBreak = getHoursSince(new Date(stats.streak_broken_at));
      if (hoursSinceBreak > RESTORE_WINDOW_HOURS) {
        await client.query('ROLLBACK');
        return {
          success: false,
          newStreak: stats.day_streak,
          pointsSpent: 0,
          error: 'Restore window expired (24 hours)'
        };
      }
    }

    // Restore the streak
    const newStreak = stats.previous_streak + 1;
    const newMaxStreak = Math.max(stats.max_streak, newStreak);

    await client.query(
      `UPDATE user_stats SET
        day_streak = $1,
        max_streak = $2,
        previous_streak = NULL,
        streak_broken_at = NULL,
        total_points = total_points - $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4`,
      [newStreak, newMaxStreak, REPAIR_COST, userId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      newStreak,
      pointsSpent: REPAIR_COST
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
