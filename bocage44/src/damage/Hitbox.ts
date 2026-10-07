import type { Vec3 } from '../weapons/Ballistics';
import type { Zone } from './Health';

/** A capsule (segment + radius) tagged with a body zone. World coordinates. */
export interface HitCapsule {
  zone: Zone;
  a: Vec3;
  b: Vec3;
  radius: number;
}

/**
 * First intersection of segment p→q with a capsule, as a fraction 0..1 of the segment,
 * or -1 if it misses. Uses closest approach between the two segments.
 */
export function segmentCapsule(p: Vec3, q: Vec3, c: HitCapsule): number {
  // Sample-free approach: closest points between segments, then march back to the surface.
  const d1 = sub(q, p);
  const d2 = sub(c.b, c.a);
  const r = sub(p, c.a);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s: number;
  let t: number;
  const cc = dot(d1, r);
  const b = dot(d1, d2);
  const denom = a * e - b * b;
  if (e < 1e-9) {
    t = 0;
    s = clamp01(-cc / a);
  } else {
    s = denom > 1e-9 ? clamp01((b * f - cc * e) / denom) : 0;
    t = (b * s + f) / e;
    if (t < 0) {
      t = 0;
      s = clamp01(-cc / a);
    } else if (t > 1) {
      t = 1;
      s = clamp01((b - cc) / a);
    }
  }
  const p1 = add(p, scale(d1, s));
  const p2 = add(c.a, scale(d2, t));
  const dist = len(sub(p1, p2));
  if (dist > c.radius) return -1;
  // Step back along the ray to the entry point (sphere approximation around p2).
  const segLen = Math.sqrt(a);
  const back = Math.sqrt(Math.max(0, c.radius * c.radius - dist * dist));
  return Math.max(0, s - back / segLen);
}

const sub = (u: Vec3, v: Vec3): Vec3 => ({ x: u.x - v.x, y: u.y - v.y, z: u.z - v.z });
const add = (u: Vec3, v: Vec3): Vec3 => ({ x: u.x + v.x, y: u.y + v.y, z: u.z + v.z });
const scale = (u: Vec3, k: number): Vec3 => ({ x: u.x * k, y: u.y * k, z: u.z * k });
const dot = (u: Vec3, v: Vec3): number => u.x * v.x + u.y * v.y + u.z * v.z;
const len = (u: Vec3): number => Math.sqrt(dot(u, u));
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Hit capsules for a standing, crouching or prone soldier.
 * `feet` is the ground point, `yaw` the facing, `height` the current body height.
 */
export function bodyCapsules(feet: Vec3, yaw: number, height: number): HitCapsule[] {
  const prone = height < 0.7;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const at = (fwd: number, side: number, up: number): Vec3 => ({ x: feet.x + fx * fwd + rx * side, y: feet.y + up, z: feet.z + fz * fwd + rz * side });
  if (prone) {
    // Lying along the facing direction, head forward.
    return [
      { zone: 'head', a: at(0.75, 0, 0.18), b: at(0.82, 0, 0.18), radius: 0.11 },
      { zone: 'torso', a: at(0.05, 0, 0.15), b: at(0.55, 0, 0.15), radius: 0.17 },
      { zone: 'leg', a: at(-0.95, -0.12, 0.1), b: at(-0.05, -0.1, 0.1), radius: 0.08 },
      { zone: 'leg', a: at(-0.95, 0.12, 0.1), b: at(-0.05, 0.1, 0.1), radius: 0.08 },
      { zone: 'arm', a: at(0.5, -0.25, 0.12), b: at(0.95, -0.12, 0.15), radius: 0.06 },
      { zone: 'arm', a: at(0.5, 0.25, 0.12), b: at(0.95, 0.12, 0.15), radius: 0.06 },
    ];
  }
  const k = height / 1.75; // crouch scales the body down
  const hip = 0.95 * k;
  const shoulder = 1.45 * k;
  return [
    { zone: 'head', a: at(0, 0, height - 0.17), b: at(0, 0, height - 0.12), radius: 0.11 },
    { zone: 'torso', a: at(0, 0, hip + 0.05), b: at(0, 0, shoulder - 0.08), radius: 0.17 },
    { zone: 'leg', a: at(0, -0.1, 0.1), b: at(0, -0.1, hip), radius: 0.075 },
    { zone: 'leg', a: at(0, 0.1, 0.1), b: at(0, 0.1, hip), radius: 0.075 },
    // Arms held forward on the rifle.
    { zone: 'arm', a: at(0, -0.22, shoulder - 0.05), b: at(0.35, -0.08, shoulder - 0.25), radius: 0.055 },
    { zone: 'arm', a: at(0, 0.22, shoulder - 0.05), b: at(0.45, 0.02, shoulder - 0.2), radius: 0.055 },
  ];
}
