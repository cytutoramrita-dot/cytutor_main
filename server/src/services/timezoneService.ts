/**
 * Timezone Service - Handles all timezone-related date calculations
 * Designed for Indian Standard Time (Asia/Kolkata) but works for all timezones
 */

/**
 * Get current date in user's timezone as YYYY-MM-DD
 * @param timezone - IANA timezone string (e.g., 'Asia/Kolkata')
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone: string = 'Asia/Kolkata'): string {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get date parts in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(now); // Returns YYYY-MM-DD
}

/**
 * Get yesterday's date in user's timezone as YYYY-MM-DD
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getYesterdayInTimezone(timezone: string = 'Asia/Kolkata'): string {
  // Get today in user's timezone first
  const todayStr = getTodayInTimezone(timezone);
  
  // Parse as UTC date to avoid timezone issues
  const todayDate = new Date(todayStr + 'T00:00:00Z');
  
  // Subtract one day
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  
  // Format as YYYY-MM-DD
  return yesterdayDate.toISOString().split('T')[0];
}

/**
 * Check if date1 is before date2 (both in YYYY-MM-DD format)
 */
export function isDateBefore(date1: string, date2: string): boolean {
  return date1 < date2;
}

/**
 * Check if date1 is after date2 (both in YYYY-MM-DD format)
 */
export function isDateAfter(date1: string, date2: string): boolean {
  return date1 > date2;
}

/**
 * Get number of days between two dates
 */
export function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00Z');
  const d2 = new Date(date2 + 'T00:00:00Z');
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get hours since a timestamp
 */
export function getHoursSince(timestamp: Date): number {
  const now = new Date();
  return (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
}

/**
 * Example usage for Indian timezone:
 * 
 * Server in UTC: 2024-01-01 18:30:00 UTC
 * User in IST:   2024-01-02 00:00:00 IST (UTC+5:30)
 * 
 * getTodayInTimezone('Asia/Kolkata') => '2024-01-02'
 * getYesterdayInTimezone('Asia/Kolkata') => '2024-01-01'
 */
