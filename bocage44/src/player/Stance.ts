/** Body postures and their dimensions in metres. Pure data and logic. */
export type StanceName = 'stand' | 'crouch' | 'prone';

export interface StanceSpec {
  /** Capsule height from feet to top of head. */
  height: number;
  /** Eye height above the feet. */
  eye: number;
  /** Speed multipliers relative to the standing gaits. */
  maxSpeed: number;
}

export const STANCES: Record<StanceName, StanceSpec> = {
  stand: { height: 1.75, eye: 1.62, maxSpeed: Infinity },
  crouch: { height: 1.1, eye: 0.98, maxSpeed: 1.8 },
  prone: { height: 0.4, eye: 0.3, maxSpeed: 0.6 },
};

/** Seconds to blend fully between two postures. */
export const STANCE_BLEND_TIME: Record<StanceName, number> = { stand: 0.35, crouch: 0.35, prone: 0.9 };

/** Pressing the key of the current stance returns to standing (toggle behaviour). */
export function nextStance(current: StanceName, pressed: 'crouch' | 'prone'): StanceName {
  return current === pressed ? 'stand' : pressed;
}
