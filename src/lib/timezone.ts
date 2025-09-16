import { formatInTimeZone } from 'date-fns-tz';

const BERLIN_TIMEZONE = 'Europe/Berlin';

/**
 * Get current time in Berlin timezone as Date object
 */
export function getBerlinTime(): Date {
  return new Date();
}

/**
 * Get current time in Berlin timezone as ISO string with timezone info
 */
export function getBerlinTimeISO(): string {
  const now = new Date();
  return formatInTimeZone(now, BERLIN_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

/**
 * Convert any date to Berlin timezone ISO string
 */
export function toBerlinTimeISO(date: Date): string {
  return formatInTimeZone(date, BERLIN_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

/**
 * Format date in Berlin timezone for display
 */
export function formatBerlinTime(date: Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatInTimeZone(date, BERLIN_TIMEZONE, format);
}