/**
 * Format a number with commas and abbreviations for large numbers
 * Examples:
 * - 200000 -> "200,000"
 * - 1000000 -> "1.0M"
 * - 1000000000 -> "1.0B"
 * - 1500000000 -> "1.5B"
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000000) {
    // Billions
    const billions = absValue / 1000000000;
    return `${sign}${billions.toFixed(1)}B`;
  } else if (absValue >= 1000000) {
    // Millions
    const millions = absValue / 1000000;
    return `${sign}${millions.toFixed(1)}M`;
  } else if (absValue >= 1000) {
    // Thousands - use commas
    return `${sign}${absValue.toLocaleString('en-US')}`;
  } else {
    // Less than 1000 - just return as is
    return `${sign}${absValue}`;
  }
}

/**
 * Format a currency value with abbreviations
 * Examples:
 * - $200000 -> "$200,000"
 * - $1000000 -> "$1.0M"
 * - $1000000000 -> "$1.0B"
 */
export function formatCash(value: number | undefined | null): string {
  return `$${formatNumber(value)}`;
}

/**
 * Extract a readable error message from an unknown error object
 * Handles Axios errors, Error objects, and strings
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;
  
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Handle network errors
    if (err.code === 'ECONNREFUSED' || (typeof err.message === 'string' && err.message.includes('Network Error'))) {
      return 'Cannot connect to server. Please ensure the application is running.';
    }

    // Handle Axios-like error structure safely
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (typeof data.error === 'string') return data.error;
        if (typeof data.message === 'string') return data.message;
      }
    }
    
    // Handle request made but no response received
    if (err.request) {
      return 'No response from server. Please check your connection and ensure the backend is running.';
    }
    
    // Handle standard Error object
    if (typeof err.message === 'string') return err.message;
  }
  
  return defaultMessage;
}

