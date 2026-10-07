/**
 * What a soldier can see and hear. Pure logic over plain numbers.
 * Sight builds up "awareness" over time instead of being instant.
 */
export const VISION_HALF_ANGLE_DEG = 55; // 110 degree cone
const PERIPHERAL_RANGE = 6;

export interface SightInput {
  distance: number;
  /** Angle between the soldier's facing and the direction to the target, degrees. */
  angleDeg: number;
  /** True if nothing solid blocks the line between eyes. */
  lineOfSight: boolean;
  /** 0 = night, 1 = full morning light. */
  light: number;
  /** Fog visibility distance in metres. */
  fogVisibility: number;
  stance: 'stand' | 'crouch' | 'prone';
  /** Target speed in m/s. */
  targetSpeed: number;
  /** Target fired in the last second (muzzle flash gives a position away). */
  targetFiring: boolean;
}

/** Furthest distance at which the target can be noticed under these conditions. */
export function sightRange(i: Omit<SightInput, 'distance' | 'angleDeg' | 'lineOfSight'>): number {
  let range = Math.min(i.fogVisibility * 1.1, 60 + i.light * 240);
  range *= i.stance === 'prone' ? 0.4 : i.stance === 'crouch' ? 0.7 : 1;
  range *= 0.75 + Math.min(1, i.targetSpeed / 4) * 0.35;
  if (i.targetFiring) range = Math.max(range, Math.min(i.fogVisibility * 1.5, 250));
  return range;
}

/** Awareness gained per second; 0 if the target cannot be seen. */
export function detectionRate(i: SightInput): number {
  if (!i.lineOfSight) return 0;
  const inCone = i.angleDeg <= VISION_HALF_ANGLE_DEG;
  if (!inCone && i.distance > PERIPHERAL_RANGE) return 0;
  const range = sightRange(i);
  if (i.distance > range) return 0;
  const closeness = 1 - i.distance / range; // 0 at the edge, 1 at the face
  const centre = inCone ? 1 - (i.angleDeg / VISION_HALF_ANGLE_DEG) * 0.6 : 0.3;
  // Very close and in view: noticed in well under a second.
  return (0.25 + 3.5 * closeness * closeness) * centre * (i.targetFiring ? 3 : 1);
}

/** Radius in metres within which a sound is noticed. */
export const HEARING_RADIUS = {
  rifleShot: 450,
  pistolShot: 200,
  sprint: 18,
  trot: 9,
  walk: 3.5,
  crouch: 2,
  prone: 0,
  bodyFall: 12,
  shout: 70,
};
