/**
 * Date utility functions for handling timezone conversions
 * App timezone: UTC+7 (Vietnam/Bangkok)
 */

const APP_TIMEZONE_OFFSET = 7; // UTC+7

/**
 * Convert ISO date string to Date object in UTC+7 timezone
 * @param isoString - ISO date string from database
 * @returns Date object adjusted to UTC+7
 */
export const parseISOToUTC7 = (isoString: string): Date => {
  const date = new Date(isoString);
  return date;
};

/**
 * Convert Date object to date string in YYYY-MM-DD format in UTC+7 timezone
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateToUTC7String = (date: Date): string => {
  // Get UTC time
  const utcTime = date.getTime();
  
  // Convert to UTC+7
  const utc7Time = new Date(utcTime + (APP_TIMEZONE_OFFSET * 60 * 60 * 1000));
  
  const year = utc7Time.getUTCFullYear();
  const month = String(utc7Time.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc7Time.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get current date in UTC+7 timezone
 * @returns Date object for current time in UTC+7
 */
export const getCurrentDateUTC7 = (): Date => {
  const now = new Date();
  const utcTime = now.getTime();
  const utc7Time = new Date(utcTime + (APP_TIMEZONE_OFFSET * 60 * 60 * 1000));
  return utc7Time;
};

/**
 * Parse date string (YYYY-MM-DD) from database and return Date object for that day in UTC+7
 * This ensures the date picker shows the correct date
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing that date in UTC+7
 */
export const parseDateStringToUTC7 = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date in UTC+7 timezone
  // Subtract timezone offset to get the correct UTC time that represents this date in UTC+7
  const utcTime = Date.UTC(year, month - 1, day) - (APP_TIMEZONE_OFFSET * 60 * 60 * 1000);
  
  return new Date(utcTime);
};

/**
 * Format date for display (localized)
 * @param date - Date object
 * @param locale - Locale string (e.g., 'en-US', 'vi-VN')
 * @returns Formatted date string
 */
export const formatDateForDisplay = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date for display in short format
 * @param date - Date object
 * @param locale - Locale string (e.g., 'en-US', 'vi-VN')
 * @returns Formatted date string in short format (e.g., "Mar 7, 2026")
 */
export const formatDateShort = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
