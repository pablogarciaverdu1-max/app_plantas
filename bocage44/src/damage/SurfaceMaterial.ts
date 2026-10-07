/** Surface kinds the level is built from. Stored per triangle in the collision world. */
export enum Surface {
  Earth = 0,
  Stone = 1,
  Wood = 2,
  Hedge = 3,
  Metal = 4,
  Flesh = 5,
  Sandbag = 6,
}

/**
 * Thickness in metres that stops a full-power rifle bullet (~3500 J). Thinner layers are
 * crossed with a loss of energy proportional to thickness; weaker rounds stop sooner.
 */
export const STOPPING_THICKNESS: Record<Surface, number> = {
  [Surface.Earth]: 0.35,
  [Surface.Stone]: 0.12,
  [Surface.Wood]: 0.3,
  [Surface.Hedge]: 2.5,
  [Surface.Metal]: 0.008,
  [Surface.Flesh]: 0.6,
  [Surface.Sandbag]: 0.3,
};

/** Surfaces a shallow-angle bullet can glance off. */
export const RICOCHET_SURFACES = new Set<Surface>([Surface.Stone, Surface.Metal]);
