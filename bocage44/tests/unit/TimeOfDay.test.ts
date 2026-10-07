import { describe, expect, it } from 'vitest';
import { fogDensityForVisibility, hourAt, lightingAt } from '../../src/mission/TimeOfDay';

describe('TimeOfDay', () => {
  it('runs from 04:30 to 06:15', () => {
    expect(hourAt(0)).toBeCloseTo(4.5);
    expect(hourAt(1)).toBeCloseTo(6.25);
  });

  it('starts with ~60 m of visibility and ends with ~200 m', () => {
    expect(lightingAt(0).visibility).toBeCloseTo(60);
    expect(lightingAt(1).visibility).toBeCloseTo(200);
  });

  it('gets brighter as the mission advances', () => {
    expect(lightingAt(1).lightIntensity).toBeGreaterThan(lightingAt(0.5).lightIntensity);
    expect(lightingAt(0.5).lightIntensity).toBeGreaterThan(lightingAt(0).lightIntensity);
  });

  it('fog density gives 95 % extinction at the visibility distance', () => {
    const d = fogDensityForVisibility(60);
    expect(1 - Math.exp(-d * 60)).toBeCloseTo(0.95);
  });
});
