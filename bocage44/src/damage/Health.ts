/** Body zones and their damage multipliers from the tech spec. */
export type Zone = 'head' | 'torso' | 'arm' | 'leg';

export const ZONE_MULTIPLIER: Record<Zone, number> = { head: 4, torso: 1, arm: 0.5, leg: 0.6 };

/** Chance an M40 / M1 helmet deflects an oblique pistol or SMG round. */
export const HELMET_DEFLECT_CHANCE = 0.2;

/**
 * Damage of one hit: base damage × zone × share of the weapon's muzzle energy left.
 * `random` is injected so tests are deterministic.
 */
export function hitDamage(baseDamage: number, zone: Zone, energyFraction: number, opts: { helmet: boolean; pistolOrSmg: boolean; oblique: boolean; random: () => number }): number {
  if (zone === 'head' && opts.helmet && opts.pistolOrSmg && opts.oblique && opts.random() < HELMET_DEFLECT_CHANCE) return 0;
  return baseDamage * ZONE_MULTIPLIER[zone] * Math.max(0, Math.min(1, energyFraction));
}

/** Health with bleeding wounds and bandages. Pure logic. */
export class Health {
  static readonly MAX = 100;
  static readonly BANDAGE_TIME = 4;

  value = Health.MAX;
  /** Points lost per second until bandaged. */
  bleedRate = 0;
  legWounds = 0;
  armWounds = 0;
  private bandageProgress = -1;

  get dead(): boolean {
    return this.value <= 0;
  }

  get bandaging(): boolean {
    return this.bandageProgress >= 0;
  }

  /** 0 = unhurt, 1 = near death. */
  get woundLevel(): number {
    return 1 - Math.max(0, this.value) / Health.MAX;
  }

  applyHit(damage: number, zone: Zone): void {
    if (damage <= 0 || this.dead) return;
    this.value -= damage;
    // Each wound bleeds 1 to 3 points per second depending on severity.
    this.bleedRate = Math.min(3, this.bleedRate + 1 + Math.min(2, damage / 50));
    if (zone === 'leg') this.legWounds++;
    if (zone === 'arm') this.armWounds++;
    this.bandageProgress = -1; // hit while bandaging interrupts it
  }

  startBandage(): boolean {
    if (this.bleedRate <= 0 || this.bandaging || this.dead) return false;
    this.bandageProgress = 0;
    return true;
  }

  cancelBandage(): void {
    this.bandageProgress = -1;
  }

  /** Returns true the step a bandage is completed. */
  update(dt: number): boolean {
    if (this.dead) return false;
    this.value -= this.bleedRate * dt;
    if (this.bandaging) {
      this.bandageProgress += dt;
      if (this.bandageProgress >= Health.BANDAGE_TIME) {
        this.bandageProgress = -1;
        this.bleedRate = 0;
        return true;
      }
    }
    return false;
  }
}
