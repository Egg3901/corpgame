import { describe, it, expect } from 'vitest';
import { formatCash, formatNumber, getErrorMessage } from '@/lib/utils';

describe('utils', () => {
  it('formatNumber formats thousands with commas', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(12000)).toBe('12,000');
  });

  it('formatNumber abbreviates millions and billions', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(1_250_000)).toBe('1.3M');
    expect(formatNumber(1_000_000_000)).toBe('1.0B');
    expect(formatNumber(-1_500_000_000)).toBe('-1.5B');
  });

  it('formatCash returns $0 for nullish values', () => {
    expect(formatCash(undefined)).toBe('$0');
    expect(formatCash(null)).toBe('$0');
  });

  it('formatCash formats positive and negative values', () => {
    expect(formatCash(0)).toBe('$0');
    expect(formatCash(1500)).toBe('$1,500');
    expect(formatCash(-1500)).toBe('$-1,500');
  });

  it('getErrorMessage prefers response payload messages', () => {
    expect(getErrorMessage({ response: { data: { error: 'boom' } } }, 'fallback')).toBe('boom');
    expect(getErrorMessage({ response: { data: { message: 'nope' } } }, 'fallback')).toBe('nope');
  });

  it('getErrorMessage handles network and no-response errors', () => {
    expect(getErrorMessage({ code: 'ECONNREFUSED' }, 'fallback')).toBe(
      'Cannot connect to server. Please ensure the application is running.'
    );
    expect(getErrorMessage({ message: 'Network Error' }, 'fallback')).toBe(
      'Cannot connect to server. Please ensure the application is running.'
    );
    expect(getErrorMessage({ request: {} }, 'fallback')).toBe(
      'No response from server. Please check your connection and ensure the backend is running.'
    );
  });

  it('getErrorMessage extracts message from Error-like objects', () => {
    expect(getErrorMessage(new Error('nope'), 'fallback')).toBe('nope');
    expect(getErrorMessage({ message: 'nope2' }, 'fallback')).toBe('nope2');
  });

  it('getErrorMessage falls back when unknown', () => {
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
