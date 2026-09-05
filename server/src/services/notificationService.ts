import { query } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a notification was already sent to a user today
 */
const wasNotificationSentToday = async (userId: string, notificationType: string): Promise<boolean> => {
    const result = await query(
        `SELECT 1 FROM user_notifications 
         WHERE user_id = $1 
         AND notification_type = $2 
         AND DATE(sent_at) = CURRENT_DATE
         LIMIT 1`,
        [userId, notificationType]
    );
    return result.rows.length > 0;
};

/**
 * Mark a notification as sent
 */
const markNotificationSent = async (
    userId: string,
    notificationType: string,
    emailSubject: string
): Promise<void> => {
    await query(
        `INSERT INTO user_notifications (user_id, notification_type, email_subject)
         VALUES ($1, $2, $3)`,
        [userId, notificationType, emailSubject]
    );
};

/**
 * Send daily streak reminder emails to active users
 * Sends to users with active streaks who haven't been active today
 */
export const sendDailyStreakReminders = async (): Promise<void> => {
    try {
        console.log('[Notifications] Starting daily streak reminders...');

        // Query users who need streak reminders
        const result = await query(`
            SELECT 
                u.id, u.email, u.full_name, u.username,
                us.day_streak, us.max_streak, us.streak_freezes
            FROM users u
            JOIN user_stats us ON u.id = us.user_id
            WHERE us.day_streak > 0
              AND u.is_email_verified = TRUE
              AND (us.last_active_date IS NULL OR us.last_active_date < CURRENT_DATE)
        `);

        console.log(`[Notifications] Found ${result.rows.length} users with active streaks`);

        let sentCount = 0;
        let skippedCount = 0;

        for (const user of result.rows) {
            try {
                // Check if notification was already sent today
                const alreadySent = await wasNotificationSentToday(user.id, 'streak_reminder');
                if (alreadySent) {
                    skippedCount++;
                    continue;
                }

                // Send streak reminder email
                const { sendStreakReminderEmail } = await import('./email.js');
                await sendStreakReminderEmail(
                    user.email,
                    user.full_name || user.username || user.email.split('@')[0],
                    user.day_streak,
                    user.max_streak,
                    user.streak_freezes
                );

                // Mark as sent
                await markNotificationSent(user.id, 'streak_reminder', 'Keep Your Streak Alive!');
                sentCount++;

            } catch (error) {
                console.error(`[Notifications] Failed to send reminder to ${user.email}:`, error);
            }
        }

        console.log(`[Notifications] Streak reminders complete: ${sentCount} sent, ${skippedCount} skipped`);
    } catch (error) {
        console.error('[Notifications] Error in sendDailyStreakReminders:', error);
    }
};

/**
 * Send missed streak notifications to users who lost their streak
 * Sends to users whose last activity was yesterday and streak is now broken
 */
export const sendMissedStreakNotifications = async (): Promise<void> => {
    try {
        console.log('[Notifications] Checking for missed streaks...');

        // Query users who missed yesterday and lost their streak
        const result = await query(`
            SELECT 
                u.id, u.email, u.full_name, u.username,
                us.previous_streak, us.max_streak, us.total_points
            FROM users u
            JOIN user_stats us ON u.id = us.user_id
            WHERE us.last_active_date = CURRENT_DATE - INTERVAL '1 day'
              AND u.is_email_verified = TRUE
              AND us.previous_streak > 0
              AND us.day_streak = 0
        `);

        console.log(`[Notifications] Found ${result.rows.length} users with broken streaks`);

        let sentCount = 0;
        let skippedCount = 0;

        for (const user of result.rows) {
            try {
                // Check if notification was already sent today
                const alreadySent = await wasNotificationSentToday(user.id, 'streak_lost');
                if (alreadySent) {
                    skippedCount++;
                    continue;
                }

                // Check if user has enough points to restore
                const canRestore = user.total_points >= 100;

                // Send streak lost email
                const { sendStreakLostEmail } = await import('./email.js');
                await sendStreakLostEmail(
                    user.email,
                    user.full_name || user.username || user.email.split('@')[0],
                    user.previous_streak,
                    user.max_streak,
                    canRestore
                );

                // Mark as sent
                await markNotificationSent(user.id, 'streak_lost', 'Streak Broken');
                sentCount++;

            } catch (error) {
                console.error(`[Notifications] Failed to send missed streak notification to ${user.email}:`, error);
            }
        }

        console.log(`[Notifications] Missed streak notifications complete: ${sentCount} sent, ${skippedCount} skipped`);
    } catch (error) {
        console.error('[Notifications] Error in sendMissedStreakNotifications:', error);
    }
};
