import { describe, expect, it } from 'vitest';
import { valueNoise } from '../../src/world/Noise';

describe('Noise', () => {
  it('is deterministic and in range', () => {
    for (let i = 0; i < 100; i++) {
      const v = valueNoise(i * 0.37, i * 0.91, 4);
      expect(v).toBe(valueNoise(i * 0.37, i * 0.91, 4));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('tiles seamlessly when given a period', () => {
    expect(valueNoise(0.3, 0.6, 1, 8)).toBeCloseTo(valueNoise(8.3, 0.6, 1, 8));
    expect(valueNoise(0.3, 0.6, 1, 8)).toBeCloseTo(valueNoise(0.3, 8.6, 1, 8));
  });
});
