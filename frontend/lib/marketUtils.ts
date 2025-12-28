export type DemandLevel = 'high' | 'medium' | 'low';

export function safeParseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function roundPrice(value: number): number {
  const n = safeParseNumber(value, 0);
  return Math.round(n * 100) / 100;
}

export function detectCurrency(locale: string): string {
  const l = (locale || '').toLowerCase();
  if (l.includes('us') || l.startsWith('en-us')) return 'USD';
  if (l.includes('gb') || l.startsWith('en-gb')) return 'GBP';
  if (l.includes('de') || l.startsWith('de')) return 'EUR';
  if (l.includes('fr') || l.startsWith('fr')) return 'EUR';
  if (l.includes('jp') || l.startsWith('ja')) return 'JPY';
  if (l.includes('cn') || l.startsWith('zh-cn')) return 'CNY';
  return 'USD';
}

export function formatPriceLocalized(value: number, locale: string, currency?: string): string {
  const v = roundPrice(value);
  const cur = currency || detectCurrency(locale);
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }
}

export function formatNumberLocalized(value: number, locale: string): string {
  const v = safeParseNumber(value, 0);
  try {
    return new Intl.NumberFormat(locale || 'en-US').format(v);
  } catch {
    return new Intl.NumberFormat('en-US').format(v);
  }
}

export function applyDiscount(price: number, discountPercent: number): number {
  const p = safeParseNumber(price, 0);
  let d = safeParseNumber(discountPercent, 0);
  if (d < 0) d = 0;
  if (d > 100) d = 100;
  const discounted = p * (1 - d / 100);
  return roundPrice(discounted);
}

export function computeCoverage(supply: number, demand: number): number {
  const s = Math.max(0, safeParseNumber(supply, 0));
  const d = Math.max(0.0001, safeParseNumber(demand, 0.0001));
  return s / d;
}

export function categorizeDemandLevel(supply: number, demand: number, salesVelocity?: number): DemandLevel {
  const coverage = computeCoverage(supply, demand);
  const velocity = Math.max(0, Math.min(1, safeParseNumber(salesVelocity, 0.5)));
  if (coverage > 1.1) return 'low';
  if (coverage < 0.8 || velocity >= 0.7) return 'high';
  return 'medium';
}

export function formatPercent(value: number, locale: string, fractionDigits = 1): string {
  const v = safeParseNumber(value, 0);
  const formatter = new Intl.NumberFormat(locale || 'en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatter.format(v)}%`;
}
