import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SoldierBrain, type Senses } from '../../src/ai/StateMachine';
import { detectionRate } from '../../src/ai/Perception';
import { SIM_DT } from '../../src/core/GameLoop';

function senses(over: Partial<Senses>): Senses {
  return {
    dt: SIM_DT, sightGain: 0, targetVisible: false, targetPos: { x: 0, y: 0, z: 0 }, heardNoise: null,
    heardAlarm: false, squadKnownPos: null, suppressionGain: 0, role: 'Engage', alive: true, ...over,
  };
}

describe('Soldier AI', () => {
  it('goes from Patrol to Combat in under 2 s with the player visible and close', () => {
    const brain = new SoldierBrain();
    const rate = detectionRate({
      distance: 15, angleDeg: 10, lineOfSight: true, light: 0.6, fogVisibility: 120,
      stance: 'stand', targetSpeed: 1.5, targetFiring: false,
    });
    let t = 0;
    while (brain.state !== 'Combat' && t < 5) {
      brain.update(senses({ sightGain: rate * SIM_DT, targetVisible: true, targetPos: { x: 0, y: 0, z: -15 } }));
      t += SIM_DT;
    }
    expect(brain.state).toBe('Combat');
    expect(t).toBeLessThan(2);
  });

  it('does not see a prone player at night 50 m away', () => {
    const rate = detectionRate({
      distance: 50, angleDeg: 5, lineOfSight: true, light: 0, fogVisibility: 60,
      stance: 'prone', targetSpeed: 0, targetFiring: false,
    });
    expect(rate).toBe(0);
  });

  it('goes to Suppressed when the suppression meter fills', () => {
    const brain = new SoldierBrain();
    brain.update(senses({ heardAlarm: true, squadKnownPos: { x: 0, y: 0, z: -30 } }));
    expect(brain.state).toBe('Combat');
    brain.update(senses({ suppressionGain: 1.2 }));
    expect(brain.state).toBe('Suppressed');
  });

  it('a gunshot puts a patrol into combat, facing where it came from, and keeps it there', () => {
    const brain = new SoldierBrain();
    const o = brain.update(senses({ heardAlarm: true, heardNoise: { x: 5, y: 0, z: 5 } }));
    expect(brain.state).toBe('Combat');
    expect(o.focus).toEqual({ x: 5, y: 0, z: 5 });
    for (let i = 0; i < 600; i++) brain.update(senses({}));
    expect(brain.state).toBe('Combat');
  });
});

void THREE;
