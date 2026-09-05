import cron from 'node-cron';
import { sendDailyStreakReminders, sendMissedStreakNotifications } from './notificationService.js';

console.log('[Scheduler] Initializing cron jobs...');

// Daily streak reminder at 8:00 PM UTC
const streakReminderJob = cron.schedule(
    process.env.STREAK_REMINDER_TIME || '0 20 * * *',
    async () => {
        console.log('[Scheduler] Running daily streak reminders...');
        try {
            await sendDailyStreakReminders();
        } catch (error) {
            console.error('[Scheduler] Error in streak reminder job:', error);
        }
    },
    {
        scheduled: true,
        timezone: process.env.NOTIFICATION_TIMEZONE || 'UTC'
    }
);

// Missed streak check at 12:01 AM UTC
const missedStreakJob = cron.schedule(
    process.env.STREAK_CHECK_TIME || '1 0 * * *',
    async () => {
        console.log('[Scheduler] Checking for missed streaks...');
        try {
            await sendMissedStreakNotifications();
        } catch (error) {
            console.error('[Scheduler] Error in missed streak job:', error);
        }
    },
    {
        scheduled: true,
        timezone: process.env.NOTIFICATION_TIMEZONE || 'UTC'
    }
);

console.log('[Scheduler] Cron jobs initialized:');
console.log(`  - Streak Reminder: ${process.env.STREAK_REMINDER_TIME || '0 20 * * *'} (${process.env.NOTIFICATION_TIMEZONE || 'UTC'})`);
console.log(`  - Missed Streak Check: ${process.env.STREAK_CHECK_TIME || '1 0 * * *'} (${process.env.NOTIFICATION_TIMEZONE || 'UTC'})`);

// Optionally disable notifications via environment variable
if (process.env.ENABLE_DAILY_NOTIFICATIONS === 'false') {
    console.log('[Scheduler] Daily notifications disabled via environment variable');
    streakReminderJob.stop();
    missedStreakJob.stop();
}

// Export jobs for testing/management
export { streakReminderJob, missedStreakJob };
