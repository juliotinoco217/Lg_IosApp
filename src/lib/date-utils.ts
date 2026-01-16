/**
 * Date Utilities for iOS App
 * 
 * Provides timezone-safe date handling to match backend logic and prevent
 * UTC timezone shift bugs that cause off-by-one date errors in aggregation.
 * 
 * This mirrors the backend's date-utils.ts logic for consistency.
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date
 * Uses noon (12:00) instead of midnight to avoid timezone shift issues
 * when the server is in a different timezone than the store
 * 
 * This prevents the common bug where "2026-01-15" becomes January 14 
 * at 6PM CST when parsed as UTC midnight.
 */
export function parseISODateAsLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Use noon (12:00) to provide a buffer against timezone shifts
  // This prevents off-by-one errors when server is in UTC but store is in CST
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format an ISO date string for display (e.g., "Jan 5")
 * Properly handles the date without UTC shift
 * 
 * This replaces the broken `new Date(dateStr)` pattern used throughout
 * the iOS app components.
 */
export function formatDateForDisplay(isoDateStr: string): string {
  const date = parseISODateAsLocal(isoDateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an ISO date string for full display (e.g., "January 5, 2026")
 */
export function formatDateForFullDisplay(isoDateStr: string): string {
  const date = parseISODateAsLocal(isoDateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Format an ISO date string for short display (e.g., "1/5")
 */
export function formatDateForShortDisplay(isoDateStr: string): string {
  const date = parseISODateAsLocal(isoDateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric' 
  });
}

/**
 * Format currency values consistently across the app
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format large currency values with K/M suffixes
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Check if a date string is in the expected ISO format (YYYY-MM-DD)
 */
export function isISODateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}