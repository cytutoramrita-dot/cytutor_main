export const GAME_MECHANICS = {
    STREAK: {
        DAILY_XP: 50,
        REPAIR_COST: 100,
        BONUS: {
            DAY_3: { POINTS: 50, MESSAGE: '3-Day Hot Streak!' },
            DAY_7: { POINTS: 100, XP: 100, MESSAGE: '7-Day Streak! Weekly Bonus!' },
            DAY_30: { POINTS: 500, XP: 200, MESSAGE: '30-Day Legend! Huge Bonus!' },
        },
        BASE_XP: 10, // For new or broken streak
    },
    CHALLENGE: {
        TIMEOUT_MS: 45 * 60 * 1000, // 45 minutes
    }
};
