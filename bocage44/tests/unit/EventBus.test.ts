import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus';

describe('EventBus', () => {
  it('delivers payloads to subscribers and supports unsubscribing', () => {
    const bus = new EventBus();
    const got: number[] = [];
    const off = bus.on('ObjectiveCompleted', (e) => got.push(e.index));
    bus.emit('ObjectiveCompleted', { index: 1 });
    off();
    bus.emit('ObjectiveCompleted', { index: 2 });
    expect(got).toEqual([1]);
  });
});
