/**
 * Format a number with commas and abbreviations for large numbers
 * Examples:
 * - 200000 -> "200,000"
 * - 1000000 -> "1.0M"
 * - 1000000000 -> "1.0B"
 * - 1500000000 -> "1.5B"
 */
export function formatNumber(value: number): string {
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
export function formatCash(value: number): string {
  return `$${formatNumber(value)}`;
}

