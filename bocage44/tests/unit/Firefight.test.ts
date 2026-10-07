import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../../src/world/Collision';
import { Terrain } from '../../src/world/Terrain';
import { buildEnemyArea } from '../../src/world/EnemyArea';
import { CoverPoints } from '../../src/ai/CoverPoints';
import { EnemyDirector } from '../../src/ai/EnemyDirector';
import { ProjectilePool, type Target } from '../../src/weapons/ProjectilePool';
import { bodyCapsules } from '../../src/damage/Hitbox';
import { weapon } from '../../src/weapons/WeaponData';
import { SIM_DT } from '../../src/core/GameLoop';
import type { WorldContext } from '../../src/ai/Soldier';

/** Headless skirmish: the real level, real squads, a standing target where the player would be. */
function setup() {
  const level = new THREE.Group();
  level.add(new Terrain(128).mesh, buildEnemyArea());
  const world = CollisionWorld.fromObject(level);
  const cover = new CoverPoints(level, world);
  const pool = new ProjectilePool(world);
  const director = new EnemyDirector(world);
  director.onSpawn = (s) => pool.targets.push(s);
  director.populate();

  const pos = new THREE.Vector3(0, 0, -45);
  pos.y = world.raycast(pos.clone().setY(50), new THREE.Vector3(0, -1, 0), 100)!.point.y;
  let hits = 0;
  const player: Target = {
    side: 'allied', alive: true, center: pos.clone().setY(pos.y + 1),
    hitCapsules: () => bodyCapsules(pos, 0, 1.75),
    onBulletHit: () => hits++,
  };
  pool.targets.push(player);
  let time = 0;
  const ctx: WorldContext = {
    world, cover, pool,
    player: { position: pos, eye: pos.clone().setY(pos.y + 1.62), speed: 0, stance: 'stand', firedRecently: false, alive: true },
    light: 0.6, fogVisibility: 150, noises: director.noises, time: 0,
    onShot: () => undefined, onShout: () => undefined,
  };
  const run = (seconds: number) => {
    for (let i = 0; i < seconds / SIM_DT; i++) {
      time += SIM_DT;
      ctx.time = time;
      director.update(SIM_DT, ctx);
      pool.step(SIM_DT);
    }
  };
  return { world, cover, pool, director, ctx, run, hits: () => hits, pos };
}

describe('firefight', () => {
  it('the level has cover points', () => {
    const { cover } = setup();
    expect(cover.points.length).toBeGreaterThan(50);
  });

  it('a gunshot alerts the squads, who take cover and fire back', () => {
    const { director, ctx, run, hits } = setup();
    // The player fires a shot from 45 m south of the field wall.
    director.emitNoise(ctx.player.position, 450, true, 0);
    ctx.player.firedRecently = true;
    run(1);
    ctx.player.firedRecently = false;
    run(25);
    const states = director.soldiers.map((s) => s.order.state);
    expect(states.filter((s) => s === 'Combat' || s === 'Suppressed').length).toBeGreaterThanOrEqual(4);
    const fired = director.soldiers.reduce((n, s) => n + (s.weapon.spec.magazineSize - s.weapon.mag) + (s.weapon.reloading ? 1 : 0), 0);
    expect(fired).toBeGreaterThan(3);
    expect(hits()).toBeGreaterThan(0);
  });

  it('a Garand bullet to the chest drops a soldier, and a stone wall stops one', () => {
    const { director, pool, run } = setup();
    const s = director.soldiers[0];
    run(0.05);
    // From the south the 1.2 m field wall is in the way: a chest-high shot is stopped.
    const chest = (): THREE.Vector3 => s.body.position.clone().setY(s.body.position.y + 1.0);
    const south = chest().add(new THREE.Vector3(0, 0, 30));
    pool.fire(south, chest().sub(south), weapon('m1_garand'), 'allied');
    run(0.2);
    expect(s.health.value).toBe(100);
    // From the open side, one or two rifle hits kill.
    for (let i = 0; i < 2 && s.alive; i++) {
      // Aim at the body centre: he may have crouched after the first shot.
      const c = s.center.clone();
      const north = c.clone().add(new THREE.Vector3(0, 0, -8));
      pool.fire(north, c.clone().sub(north), weapon('m1_garand'), 'allied');
      run(0.2);
    }
    expect(s.alive).toBe(false);
  });

  it('when every soldier is dead a new squad arrives', () => {
    const { director, run } = setup();
    for (const s of director.soldiers) s.health.applyHit(500, 'torso');
    const before = director.soldiers.length;
    run(14);
    expect(director.soldiers.length).toBeGreaterThan(before);
  });
});
