/**
 * Soldier decision logic: Patrol → Suspicious → Search → Combat, with
 * Suppressed and Dead. Combat has sub-roles chosen by the squad.
 * Pure logic: it reads senses and outputs an order; the Soldier carries it out.
 */
export type State = 'Patrol' | 'Suspicious' | 'Search' | 'Combat' | 'Suppressed' | 'Dead';
export type CombatRole = 'TakeCover' | 'Engage' | 'Suppress' | 'Flank' | 'Retreat';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Senses {
  dt: number;
  /** Awareness gained this step from sight (already scaled by dt). */
  sightGain: number;
  /** Target currently in view. */
  targetVisible: boolean;
  targetPos: Point;
  /** Position of a noise worth investigating, if heard this step. */
  heardNoise: Point | null;
  /** A gunshot or shout that means a fight is on. */
  heardAlarm: boolean;
  /** Squad's shared knowledge, if any member has seen the target recently. */
  squadKnownPos: Point | null;
  /** Suppression added this step by near misses, 0..1 scale. */
  suppressionGain: number;
  /** Role assigned by the squad while in combat. */
  role: CombatRole;
  alive: boolean;
}

export interface Order {
  state: State;
  role: CombatRole | null;
  /** Where to look / aim. */
  focus: Point | null;
  /** Whether to shoot at the focus point this step. */
  fire: boolean;
  /** True on the step the soldier first spots the target (should shout). */
  shout: boolean;
}

export const AWARE_SUSPICIOUS = 0.35;
export const AWARE_SPOTTED = 1;
export const SUPPRESSION_THRESHOLD = 1;

export class SoldierBrain {
  state: State = 'Patrol';
  awareness = 0;
  suppression = 0;
  lastKnown: Point | null = null;
  private timeInState = 0;
  private timeSinceSeen = Infinity;

  update(s: Senses): Order {
    this.timeInState += s.dt;
    const order: Order = { state: this.state, role: null, focus: null, fire: false, shout: false };
    if (!s.alive) {
      this.set('Dead');
      order.state = 'Dead';
      return order;
    }

    // Awareness rises with sight and decays slowly when nothing is seen.
    if (s.sightGain > 0) this.awareness = Math.min(1.5, this.awareness + s.sightGain);
    else this.awareness = Math.max(0, this.awareness - s.dt * (this.state === 'Combat' ? 0.02 : 0.08));

    if (s.targetVisible && this.awareness >= AWARE_SPOTTED) {
      this.lastKnown = { ...s.targetPos };
      this.timeSinceSeen = 0;
    } else {
      this.timeSinceSeen += s.dt;
    }
    if (s.squadKnownPos && (this.timeSinceSeen > 1 || !this.lastKnown)) this.lastKnown = { ...s.squadKnownPos };

    this.suppression = Math.max(0, this.suppression + s.suppressionGain - s.dt * 0.35);

    const spotted = s.targetVisible && this.awareness >= AWARE_SPOTTED;
    const prev = this.state;

    switch (this.state) {
      case 'Patrol':
      case 'Suspicious':
      case 'Search':
        if (spotted || s.heardAlarm || (s.squadKnownPos && this.state !== 'Patrol')) {
          this.set('Combat');
          // Head for where the shot came from until something better is known.
          if (s.heardNoise && !spotted) this.lastKnown = { ...s.heardNoise };
          if (s.squadKnownPos && !this.lastKnown) this.lastKnown = { ...s.squadKnownPos };
        } else if (s.squadKnownPos) {
          this.set('Combat');
        } else if (this.awareness >= AWARE_SUSPICIOUS || s.heardNoise) {
          if (this.state === 'Patrol') this.set('Suspicious');
          if (s.heardNoise) this.lastKnown = { ...s.heardNoise };
          else if (s.targetVisible) this.lastKnown = { ...s.targetPos };
          if (this.state === 'Suspicious' && this.timeInState > 3) this.set('Search');
        } else if (this.state !== 'Patrol' && this.timeInState > 25) {
          this.set('Patrol');
        }
        break;
      case 'Combat':
        if (this.suppression >= SUPPRESSION_THRESHOLD) this.set('Suppressed');
        else if (this.timeSinceSeen > 45 && this.timeInState > 45 && !s.squadKnownPos) this.set('Search');
        break;
      case 'Suppressed':
        if (this.suppression < SUPPRESSION_THRESHOLD * 0.4 && this.timeInState > 1.5) this.set('Combat');
        break;
      case 'Dead':
        break;
    }

    order.state = this.state;
    order.shout = this.state === 'Combat' && prev !== 'Combat' && prev !== 'Suppressed' && spotted;
    if (this.state === 'Combat') {
      order.role = s.role;
      order.focus = this.lastKnown;
      // Fire at a visible target; suppressors also fire at the last known position.
      order.fire = spotted || (s.role === 'Suppress' && this.lastKnown !== null && this.timeSinceSeen < 12);
    } else if (this.state === 'Suspicious' || this.state === 'Search') {
      order.focus = this.lastKnown;
    } else if (this.state === 'Suppressed') {
      order.focus = this.lastKnown;
    }
    return order;
  }

  get secondsSinceSeen(): number {
    return this.timeSinceSeen;
  }

  private set(state: State): void {
    if (state !== this.state) {
      this.state = state;
      this.timeInState = 0;
    }
  }
}
