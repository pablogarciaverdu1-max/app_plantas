/**
 * Point-mass exterior ballistics with the G1 standard drag function.
 * Pure logic: plain numbers and {x,y,z} objects, no Three.js.
 */
export const GRAVITY = 9.81;
export const SPEED_OF_SOUND = 343;
const AIR_DENSITY = 1.2; // kg/m³, cool damp morning near sea level
const BC_TO_SI = 703.07; // lb/in² → kg/m²

// G1 drag coefficient against Mach number.
const G1: [number, number][] = [
  [0, 0.2629], [0.5, 0.2032], [0.7, 0.2165], [0.8, 0.2546], [0.9, 0.3415], [1.0, 0.4805],
  [1.1, 0.5933], [1.2, 0.6318], [1.3, 0.644], [1.4, 0.6444], [1.5, 0.6372], [1.6, 0.6252],
  [1.8, 0.5934], [2.0, 0.5598], [2.2, 0.53], [2.5, 0.4988], [3.0, 0.46],
];

export function g1DragCoefficient(mach: number): number {
  for (let i = 1; i < G1.length; i++) {
    if (mach <= G1[i][0]) {
      const [m0, c0] = G1[i - 1];
      const [m1, c1] = G1[i];
      return c0 + ((c1 - c0) * (mach - m0)) / (m1 - m0);
    }
  }
  return G1[G1.length - 1][1];
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Drag deceleration magnitude (m/s²) for a projectile of ballistic coefficient `bc` at speed `v`. */
export function dragDeceleration(v: number, bc: number): number {
  return ((AIR_DENSITY * Math.PI) / 8) * g1DragCoefficient(v / SPEED_OF_SOUND) * (v * v) / (bc * BC_TO_SI);
}

/** Advances position and velocity in place by dt using semi-implicit Euler. */
export function stepProjectile(pos: Vec3, vel: Vec3, bc: number, dt: number): void {
  const v = Math.hypot(vel.x, vel.y, vel.z);
  if (v > 0) {
    const k = (dragDeceleration(v, bc) * dt) / v;
    vel.x -= vel.x * k;
    vel.y -= vel.y * k;
    vel.z -= vel.z * k;
  }
  vel.y -= GRAVITY * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
}

export interface TrajectoryPoint {
  time: number;
  height: number;
  speed: number;
}

/**
 * Flies a shot fired at `angle` radians above horizontal from height 0 and returns
 * time, height and speed when it reaches `range` metres downrange.
 */
export function flyTo(range: number, muzzleVelocity: number, bc: number, angle: number, dt = 1 / 600): TrajectoryPoint {
  const pos = { x: 0, y: 0, z: 0 };
  const vel = { x: muzzleVelocity * Math.cos(angle), y: muzzleVelocity * Math.sin(angle), z: 0 };
  let t = 0;
  while (pos.x < range && t < 10) {
    const prevX = pos.x;
    const prevY = pos.y;
    stepProjectile(pos, vel, bc, dt);
    t += dt;
    if (pos.x >= range) {
      const f = (range - prevX) / (pos.x - prevX);
      return { time: t - dt + f * dt, height: prevY + (pos.y - prevY) * f, speed: Math.hypot(vel.x, vel.y) };
    }
  }
  return { time: t, height: pos.y, speed: Math.hypot(vel.x, vel.y) };
}

/** Bore elevation (radians) so a shot crosses the sight line at `zeroRange`, sights `sightHeight` above the bore. */
export function zeroAngle(zeroRange: number, sightHeight: number, muzzleVelocity: number, bc: number): number {
  let lo = -0.01;
  let hi = 0.02;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (flyTo(zeroRange, muzzleVelocity, bc, mid).height < sightHeight) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Kinetic energy in joules; bullet mass in grams. */
export function kineticEnergy(massGrams: number, speed: number): number {
  return 0.5 * (massGrams / 1000) * speed * speed;
}
