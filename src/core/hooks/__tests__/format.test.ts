import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatRelativeTime,
  formatDateShort,
  formatDateTime,
  truncate,
  formatAudioTime,
} from '../../utils/format';

describe('format utils', () => {
  describe('formatNumber', () => {
    it('handles null/undefined as 0', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });

    it('formats small numbers as-is', () => {
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('formats thousands with k', () => {
      expect(formatNumber(1000)).toBe('1k');
      expect(formatNumber(1500)).toBe('1.5k');
      expect(formatNumber(999999)).toBe('1M');
    });

    it('formats millions with M', () => {
      expect(formatNumber(1000000)).toBe('1M');
      expect(formatNumber(2500000)).toBe('2.5M');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns empty string for invalid input', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime('invalid-date')).toBe('');
    });

    it('formats time ranges correctly', () => {
      const now = new Date();
      const past = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();

      expect(formatRelativeTime(past(0.5))).toBe('just now');
      expect(formatRelativeTime(past(5))).toBe('5m ago');
      expect(formatRelativeTime(past(65))).toBe('1h ago');
      expect(formatRelativeTime(past(60 * 25))).toBe('1d ago');
      expect(formatRelativeTime(past(60 * 24 * 8))).toBe('1w ago');
    });
  });

  describe('formatAudioTime', () => {
    it('formats seconds into mm:ss', () => {
      expect(formatAudioTime(0)).toBe('00:00');
      expect(formatAudioTime(65)).toBe('01:05');
      expect(formatAudioTime(3600)).toBe('60:00');
    });

    it('handles null/undefined safely', () => {
      expect(formatAudioTime(null)).toBe('00:00');
      expect(formatAudioTime(undefined)).toBe('00:00');
    });
  });

  describe('truncate', () => {
    it('returns text as-is if shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('truncates and adds ellipsis', () => {
      expect(truncate('Hello World', 5)).toBe('Hello…');
    });

    it('handles empty input', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('date formatting', () => {
    const testDate = new Date('2024-05-15T14:30:00Z');

    it('formats date short', () => {
      expect(formatDateShort(testDate)).toMatch(/15 May 2024/);
    });

    it('formats date time', () => {
      expect(formatDateTime(testDate)).toMatch(/15 May 2024/);
      expect(formatDateTime(testDate)).toMatch(/14:30|15:30|13:30/); // depending on timezone
    });
  });
});