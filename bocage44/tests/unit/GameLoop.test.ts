import { describe, expect, it } from 'vitest';
import { GameLoop, SIM_DT } from '../../src/core/GameLoop';

describe('GameLoop', () => {
  it('runs a fixed number of steps independent of frame rate', () => {
    let steps30 = 0;
    let steps144 = 0;
    const loop30 = new GameLoop({ step: () => steps30++, render: () => undefined });
    const loop144 = new GameLoop({ step: () => steps144++, render: () => undefined });
    for (let i = 0; i < 30; i++) loop30.advance(1 / 30);
    for (let i = 0; i < 144; i++) loop144.advance(1 / 144);
    expect(Math.abs(steps30 - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(steps144 - 60)).toBeLessThanOrEqual(1);
  });

  it('always steps with the fixed delta', () => {
    const deltas = new Set<number>();
    const loop = new GameLoop({ step: (dt) => deltas.add(dt), render: () => undefined });
    loop.advance(0.1);
    expect([...deltas]).toEqual([SIM_DT]);
  });

  it('clamps long stalls instead of running hundreds of steps', () => {
    const loop = new GameLoop({ step: () => undefined, render: () => undefined });
    expect(loop.advance(10)).toBeLessThanOrEqual(15);
  });

  it('passes an interpolation factor between 0 and 1 to render', () => {
    let alpha = -1;
    const loop = new GameLoop({ step: () => undefined, render: (a) => (alpha = a) });
    loop.advance(SIM_DT * 1.5);
    expect(alpha).toBeGreaterThan(0.4);
    expect(alpha).toBeLessThan(0.6);
  });
});
