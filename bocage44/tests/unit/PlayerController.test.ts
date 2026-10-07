import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerController, SPEED, type PlayerIntent } from '../../src/player/PlayerController';
import { SIM_DT } from '../../src/core/GameLoop';
import { boxWorld } from './helpers/world';

const idle: PlayerIntent = {
  forward: 0, right: 0, sprint: false, walk: false, jumpPressed: false,
  crouchPressed: false, pronePressed: false, lean: 0, yaw: 0,
};

function run(p: PlayerController, seconds: number, intent: Partial<PlayerIntent> = {}): void {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) p.step(SIM_DT, { ...idle, ...intent });
}

function press(p: PlayerController, key: 'jumpPressed' | 'crouchPressed' | 'pronePressed', intent: Partial<PlayerIntent> = {}): void {
  p.step(SIM_DT, { ...idle, ...intent, [key]: true });
}

function spawn(world = boxWorld([])): PlayerController {
  const p = new PlayerController(world);
  p.teleport(new THREE.Vector3(0, 0.05, 0));
  run(p, 0.3);
  return p;
}

describe('PlayerController', () => {
  it('stands on the ground', () => {
    const p = spawn();
    expect(p.onGround).toBe(true);
    expect(p.position.y).toBeCloseTo(0, 1);
  });

  it('reaches trot, walk and sprint speeds from the GDD with some inertia', () => {
    const p = spawn();
    run(p, 0.1, { forward: 1 });
    expect(p.horizontalSpeed).toBeLessThan(SPEED.trot * 0.5); // not instant
    run(p, 1.5, { forward: 1 });
    expect(p.horizontalSpeed).toBeCloseTo(SPEED.trot, 1);
    run(p, 2, { forward: 1, sprint: true });
    expect(p.horizontalSpeed).toBeGreaterThan(SPEED.sprint * 0.9);
    const w = spawn();
    run(w, 2, { forward: 1, walk: true });
    expect(w.horizontalSpeed).toBeCloseTo(SPEED.walk, 1);
  });

  it('runs out of sprint after about 12 s', () => {
    const p = spawn();
    run(p, 11, { forward: 1, sprint: true });
    expect(p.sprinting).toBe(true);
    run(p, 1.5, { forward: 1, sprint: true });
    expect(p.sprinting).toBe(false);
  });

  it('cannot walk through a wall', () => {
    const p = spawn(boxWorld([[4, 2.5, 0.4, 0, 0, -3]]));
    run(p, 3, { forward: 1 });
    expect(p.position.z).toBeGreaterThan(-2.8 + 0.3 - 0.05);
  });

  it('vaults a 1.2 m wall', () => {
    const p = spawn(boxWorld([[4, 1.2, 0.4, 0, 0, -1.2]]));
    run(p, 0.5, { forward: 1 });
    press(p, 'jumpPressed', { forward: 1 });
    run(p, 2, { forward: 1 });
    expect(p.position.z).toBeLessThan(-1.6);
  });

  it('cannot climb a 1.5 m wall', () => {
    const p = spawn(boxWorld([[4, 1.5, 0.4, 0, 0, -1.2]]));
    run(p, 0.5, { forward: 1 });
    press(p, 'jumpPressed', { forward: 1 });
    run(p, 2, { forward: 1 });
    expect(p.position.z).toBeGreaterThan(-1.0);
  });

  it('climbs onto a thick 1 m block', () => {
    const p = spawn(boxWorld([[4, 1.0, 3, 0, 0, -2.5]]));
    run(p, 0.5, { forward: 1 });
    press(p, 'jumpPressed', { forward: 1 });
    run(p, 1.5);
    expect(p.position.y).toBeCloseTo(1.0, 1);
  });

  it('crouches and goes prone, lowering the eye', () => {
    const p = spawn();
    const standEye = p.eyeHeight;
    press(p, 'crouchPressed');
    run(p, 1);
    expect(p.stance).toBe('crouch');
    expect(p.eyeHeight).toBeLessThan(standEye * 0.7);
    press(p, 'pronePressed');
    run(p, 1.5);
    expect(p.stance).toBe('prone');
    expect(p.eyeHeight).toBeLessThan(0.4);
  });

  it('cannot stand up under a 1.3 m ceiling, and can once out', () => {
    // Ceiling slab from 1.3 m to 1.6 m, starting 2 m ahead, 6 m long.
    const p = spawn(boxWorld([[6, 0.3, 6, 0, 1.3, -5]]));
    press(p, 'crouchPressed');
    run(p, 0.5);
    run(p, 2.2, { forward: 1 }); // crouched pace carries it under the slab
    expect(p.position.z).toBeLessThan(-3);
    press(p, 'crouchPressed'); // try to stand
    run(p, 1);
    expect(p.height).toBeLessThan(1.3);
    expect(p.stance).toBe('crouch');
    run(p, 3, { forward: 1 });
    expect(p.position.z).toBeLessThan(-8.5);
    press(p, 'crouchPressed');
    run(p, 1);
    expect(p.stance).toBe('stand');
  });

  it('leans sideways about 35 cm, less when a wall is close', () => {
    const p = spawn();
    run(p, 0.5, { lean: 1 });
    expect(p.leanOffset).toBeCloseTo(0.35, 2);
    const q = spawn(boxWorld([[0.4, 3, 4, 0.6, 0, 0]]));
    run(q, 0.5, { lean: 1 });
    expect(q.leanOffset).toBeLessThan(0.3);
  });
});
