import type { WeaponSpec } from './WeaponData';

export type WeaponEvent = 'fired' | 'dryFire' | 'clipEjected' | 'reloadStart' | 'reloadDone' | 'boltCycled';

/**
 * Magazine, trigger, rate of fire, bolt cycling and reload timing for one weapon.
 * Pure logic: emits events, the caller spawns bullets and plays effects.
 */
export class Weapon {
  mag: number;
  reserve: number;
  private cooldown = 0;
  private reloadLeft = 0;
  private boltLeft = 0;
  private triggerWasDown = false;

  constructor(readonly spec: WeaponSpec, reserveRounds: number) {
    this.mag = spec.magazineSize;
    this.reserve = reserveRounds;
  }

  get reloading(): boolean {
    return this.reloadLeft > 0;
  }

  get cycling(): boolean {
    return this.boltLeft > 0;
  }

  /** Fraction of the magazine still loaded. */
  get fill(): number {
    return this.mag / this.spec.magazineSize;
  }

  /** Returns events for this step. `triggerDown` is the current button state. */
  update(dt: number, triggerDown: boolean): WeaponEvent[] {
    const events: WeaponEvent[] = [];
    // The timer carries its remainder so the rate of fire is exact, not rounded to the step.
    this.cooldown -= dt;
    if (this.boltLeft > 0) {
      this.boltLeft -= dt;
      if (this.boltLeft <= 0) events.push('boltCycled');
    }
    if (this.reloadLeft > 0) {
      this.reloadLeft -= dt;
      if (this.reloadLeft <= 0) {
        this.finishReload();
        events.push('reloadDone');
      }
      this.triggerWasDown = triggerDown;
      return events;
    }

    const pressed = triggerDown && !this.triggerWasDown;
    const wantsShot = this.spec.action === 'full_auto' ? triggerDown : pressed;
    this.triggerWasDown = triggerDown;

    if (!wantsShot && this.cooldown < 0) this.cooldown = 0;
    if (wantsShot && this.cooldown <= 0 && this.boltLeft <= 0) {
      if (this.mag > 0) {
        this.mag--;
        this.cooldown += 60 / this.spec.fireRate;
        events.push('fired');
        if (this.spec.action === 'bolt' && this.mag > 0) this.boltLeft = this.spec.boltCycleTime ?? 1;
        // The Garand throws its empty en-bloc clip with a ping after the last round.
        if (this.mag === 0 && this.spec.special.includes('en_bloc_ping')) events.push('clipEjected');
      } else if (pressed) {
        events.push('dryFire');
      }
    }
    return events;
  }

  /** Starts a reload if it makes sense. Returns true if started. */
  startReload(): boolean {
    if (this.reloading || this.reserve <= 0 || this.mag >= this.spec.magazineSize) return false;
    const empty = this.mag === 0;
    let time = empty ? this.spec.reloadTimeEmpty : this.spec.reloadTimePartial;
    if (!empty && this.spec.reloadPartialIsPerRound) {
      time = this.spec.reloadTimePartial * Math.min(this.reserve, this.spec.magazineSize - this.mag);
    }
    this.reloadLeft = time;
    this.boltLeft = 0;
    return true;
  }

  cancelReload(): void {
    this.reloadLeft = 0;
  }

  private finishReload(): void {
    const need = this.spec.magazineSize - this.mag;
    const take = Math.min(need, this.reserve);
    this.mag += take;
    this.reserve -= take;
  }
}

/** Words a soldier would use after feeling the weight of the magazine. */
export function ammoCheckKey(fill: number): 'ammoFull' | 'ammoNearlyFull' | 'ammoOverHalf' | 'ammoUnderHalf' | 'ammoNearlyEmpty' | 'ammoEmpty' {
  if (fill >= 1) return 'ammoFull';
  if (fill >= 0.75) return 'ammoNearlyFull';
  if (fill >= 0.5) return 'ammoOverHalf';
  if (fill > 0.2) return 'ammoUnderHalf';
  if (fill > 0) return 'ammoNearlyEmpty';
  return 'ammoEmpty';
}
