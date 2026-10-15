import { describe, it, expect } from 'vitest';
import {
  formatSecondsToMMSS,
  formatSecondsToReadable,
  formatPercentage,
  formatScore,
} from '@/lib/utils/formatters';

describe('formatters', () => {
  it('formats seconds to MM:SS string correctly', () => {
    expect(formatSecondsToMMSS(0)).toBe('00:00');
    expect(formatSecondsToMMSS(65)).toBe('01:05');
    expect(formatSecondsToMMSS(1200)).toBe('20:00');
    expect(formatSecondsToMMSS(3600)).toBe('60:00');
  });

  it('formats seconds to human readable strings', () => {
    expect(formatSecondsToReadable(45)).toBe('45s');
    expect(formatSecondsToReadable(125)).toBe('2m 5s');
  });

  it('formats percentages and scores with correct precision', () => {
    expect(formatPercentage(85.666)).toBe('85.7%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatScore(14.5)).toBe('14.50');
    expect(formatScore(-0.75)).toBe('-0.75');
  });
});
