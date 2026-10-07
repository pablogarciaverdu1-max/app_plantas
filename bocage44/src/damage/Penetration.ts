import { STOPPING_THICKNESS, RICOCHET_SURFACES, Surface } from './SurfaceMaterial';

/** Reference energy for STOPPING_THICKNESS: a .30-06 / 7.92 mm ball round at the muzzle. */
export const RIFLE_REFERENCE_ENERGY = 3500;

/**
 * Speed fraction kept after crossing `thickness` metres of `surface`, or 0 if stopped.
 * Penetration depth scales with the bullet's energy relative to a rifle round.
 */
export function speedAfterPenetration(surface: Surface, thickness: number, energy: number): number {
  const capacity = STOPPING_THICKNESS[surface] * Math.min(1.5, energy / RIFLE_REFERENCE_ENERGY);
  if (thickness >= capacity) return 0;
  // Energy lost in proportion to the share of capacity used; speed is the square root.
  return Math.sqrt(1 - thickness / capacity);
}

/** True if a bullet meeting `surface` at `grazingAngleDeg` (0 = parallel) should ricochet. */
export function ricochets(surface: Surface, grazingAngleDeg: number): boolean {
  return RICOCHET_SURFACES.has(surface) && grazingAngleDeg < 15;
}
