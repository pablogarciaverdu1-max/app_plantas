import * as THREE from 'three';
import { stepProjectile, kineticEnergy, SPEED_OF_SOUND } from './Ballistics';
import type { WeaponSpec } from './WeaponData';
import type { CollisionWorld } from '../world/Collision';
import { segmentCapsule, type HitCapsule } from '../damage/Hitbox';
import { speedAfterPenetration, ricochets } from '../damage/Penetration';
import { Surface } from '../damage/SurfaceMaterial';
import type { Zone } from '../damage/Health';

/** Anything bullets can hit besides the level: soldiers and the player. */
export interface Target {
  readonly side: 'allied' | 'german';
  readonly alive: boolean;
  /** Rough bounding sphere used to skip distant targets cheaply. */
  readonly center: THREE.Vector3;
  hitCapsules(): HitCapsule[];
  onBulletHit(hit: BulletHit): void;
  /** Called when a bullet passes within `distance` metres of the head. */
  onBulletPass?(distance: number, shooter: 'allied' | 'german', supersonic: boolean, point: THREE.Vector3): void;
}

export interface BulletHit {
  zone: Zone;
  weapon: WeaponSpec;
  /** Share of muzzle energy left at impact, 0..1. */
  energyFraction: number;
  direction: THREE.Vector3;
  point: THREE.Vector3;
  shooter: 'allied' | 'german';
}

export interface ImpactEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  surface: Surface;
  ricochet: boolean;
}

interface Projectile {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  weapon: WeaponSpec;
  shooter: 'allied' | 'german';
  age: number;
  tracer: boolean;
  /** Zones already struck per target: a bullet can go through an arm into the chest, but not hit the same part twice. */
  struck: Map<Target, Set<Zone>>;
  passed: Set<Target>;
  ignore: Target | null;
  alive: boolean;
}

const MAX_AGE = 4;
const NEAR_MISS_RADIUS = 3;
const prev = new THREE.Vector3();
const next = new THREE.Vector3();
const dir = new THREE.Vector3();
const tmp = new THREE.Vector3();

/** All bullets in flight, stepped in the fixed simulation. */
export class ProjectilePool {
  private readonly pool: Projectile[] = [];
  readonly targets: Target[] = [];
  onImpact: (e: ImpactEvent) => void = () => undefined;

  constructor(private readonly world: CollisionWorld) {}

  get activeCount(): number {
    return this.pool.filter((p) => p.alive).length;
  }

  fire(origin: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponSpec, shooter: 'allied' | 'german', ignore: Target | null = null, tracer = false): void {
    let p = this.pool.find((x) => !x.alive);
    if (!p) {
      p = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, weapon, shooter, age: 0, tracer, struck: new Map(), passed: new Set(), ignore, alive: true };
      this.pool.push(p);
    }
    const d = direction.clone().normalize();
    p.pos.x = origin.x;
    p.pos.y = origin.y;
    p.pos.z = origin.z;
    p.vel.x = d.x * weapon.muzzleVelocity;
    p.vel.y = d.y * weapon.muzzleVelocity;
    p.vel.z = d.z * weapon.muzzleVelocity;
    p.weapon = weapon;
    p.shooter = shooter;
    p.age = 0;
    p.tracer = tracer;
    p.struck.clear();
    p.passed.clear();
    p.ignore = ignore;
    p.alive = true;
  }

  /** Positions of tracer rounds for drawing. */
  forEachTracer(cb: (pos: THREE.Vector3, vel: THREE.Vector3) => void): void {
    for (const p of this.pool) if (p.alive && p.tracer) cb(tmp.set(p.pos.x, p.pos.y, p.pos.z), dir.set(p.vel.x, p.vel.y, p.vel.z));
  }

  step(dt: number): void {
    for (const p of this.pool) if (p.alive) this.stepOne(p, dt);
  }

  private stepOne(p: Projectile, dt: number): void {
    p.age += dt;
    prev.set(p.pos.x, p.pos.y, p.pos.z);
    stepProjectile(p.pos, p.vel, p.weapon.ballisticCoefficient, dt);
    next.set(p.pos.x, p.pos.y, p.pos.z);
    this.trace(p, prev, next, 0);
    if (p.age > MAX_AGE || p.pos.y < -100) p.alive = false;
  }

  /** Traces the segment a→b, handling the nearest hit and continuing through penetrable layers. */
  private trace(p: Projectile, a: THREE.Vector3, b: THREE.Vector3, depth: number): void {
    if (depth > 6) {
      p.alive = false;
      return;
    }
    dir.copy(b).sub(a);
    const segLen = dir.length();
    if (segLen < 1e-6) return;
    dir.divideScalar(segLen);

    // Nearest body hit.
    let bestT = Infinity;
    let bestTarget: Target | null = null;
    let bestZone: Zone = 'torso';
    for (const t of this.targets) {
      const done = p.struck.get(t);
      if (!t.alive || t === p.ignore || (done && [...done].some((z) => z !== 'arm'))) continue;
      // Cheap reject: distance from target centre to the segment.
      tmp.copy(t.center).sub(a);
      const along = THREE.MathUtils.clamp(tmp.dot(dir), 0, segLen);
      const closest = a.clone().addScaledVector(dir, along);
      const missDist = closest.distanceTo(t.center);
      if (missDist > 2 + NEAR_MISS_RADIUS) continue;
      if (t.onBulletPass && !p.passed.has(t) && t.side !== p.shooter && missDist < NEAR_MISS_RADIUS) {
        p.passed.add(t);
        const speed = Math.hypot(p.vel.x, p.vel.y, p.vel.z);
        t.onBulletPass(missDist, p.shooter, speed > SPEED_OF_SOUND, closest);
      }
      for (const c of t.hitCapsules()) {
        if (done?.has(c.zone)) continue;
        const f = segmentCapsule(a, b, c);
        if (f >= 0 && f * segLen < bestT) {
          bestT = f * segLen;
          bestTarget = t;
          bestZone = c.zone;
        }
      }
    }

    const wallHit = this.world.raycast(a, dir, segLen);
    const speed = Math.hypot(p.vel.x, p.vel.y, p.vel.z);
    const energy = kineticEnergy(p.weapon.bulletMass, speed);

    if (bestTarget && (!wallHit || bestT < wallHit.distance)) {
      const point = a.clone().addScaledVector(dir, bestT);
      if (!p.struck.has(bestTarget)) p.struck.set(bestTarget, new Set());
      p.struck.get(bestTarget)!.add(bestZone);
      bestTarget.onBulletHit({
        zone: bestZone,
        weapon: p.weapon,
        energyFraction: (speed * speed) / (p.weapon.muzzleVelocity * p.weapon.muzzleVelocity),
        direction: dir.clone(),
        point,
        shooter: p.shooter,
      });
      // Bodies absorb most of a bullet; through-and-through shots keep a little speed.
      const keep = speedAfterPenetration(Surface.Flesh, bestZone === 'arm' ? 0.08 : 0.3, energy);
      if (keep <= 0.2) {
        p.alive = false;
        return;
      }
      this.scaleVelocity(p, keep);
      this.trace(p, point.clone().addScaledVector(dir, 0.01), b, depth + 1);
      return;
    }

    if (!wallHit) return;

    const grazing = 90 - THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(wallHit.normal.dot(dir)))));
    const isRicochet = ricochets(wallHit.surface, grazing);
    this.onImpact({ point: wallHit.point, normal: wallHit.normal, surface: wallHit.surface, ricochet: isRicochet });

    if (isRicochet) {
      const v = new THREE.Vector3(p.vel.x, p.vel.y, p.vel.z).reflect(wallHit.normal).multiplyScalar(0.6);
      p.vel.x = v.x;
      p.vel.y = v.y;
      p.vel.z = v.z;
      p.pos.x = wallHit.point.x + wallHit.normal.x * 0.01;
      p.pos.y = wallHit.point.y + wallHit.normal.y * 0.01;
      p.pos.z = wallHit.point.z + wallHit.normal.z * 0.01;
      return;
    }

    // Find the exit face to measure the thickness crossed.
    const inside = wallHit.point.clone().addScaledVector(dir, 0.002);
    const exit = this.world.raycast(inside, dir, 3);
    const thickness = exit ? exit.distance + 0.002 : Infinity;
    const keep = Number.isFinite(thickness) ? speedAfterPenetration(wallHit.surface, thickness, energy) : 0;
    if (keep <= 0.15) {
      p.alive = false;
      return;
    }
    this.scaleVelocity(p, keep);
    const out = inside.clone().addScaledVector(dir, thickness + 0.002);
    const remaining = segLen - wallHit.distance - thickness;
    if (exit) this.onImpact({ point: exit.point, normal: exit.normal, surface: wallHit.surface, ricochet: false });
    p.pos.x = out.x;
    p.pos.y = out.y;
    p.pos.z = out.z;
    if (remaining > 0) {
      const end = out.clone().addScaledVector(dir, remaining);
      p.pos.x = end.x;
      p.pos.y = end.y;
      p.pos.z = end.z;
      this.trace(p, out, end, depth + 1);
    }
  }

  private scaleVelocity(p: Projectile, k: number): void {
    p.vel.x *= k;
    p.vel.y *= k;
    p.vel.z *= k;
  }
}
