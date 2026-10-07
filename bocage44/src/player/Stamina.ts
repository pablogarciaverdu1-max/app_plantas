/**
 * Sprint stamina: about 12 s of sprint from full, slower recovery, and a lockout
 * after running dry until a quarter has recovered. Pure logic.
 */
export class Stamina {
  static readonly SPRINT_SECONDS = 12;
  static readonly RECOVER_SECONDS = 20;
  static readonly RESUME_THRESHOLD = 0.25;

  /** 0..1 */
  value = 1;
  private exhausted = false;

  get canSprint(): boolean {
    return !this.exhausted && this.value > 0;
  }

  /** How out of breath the soldier is, 0..1, for sway and breathing effects. */
  get breathlessness(): number {
    return 1 - this.value;
  }

  update(dt: number, sprinting: boolean, moving: boolean): void {
    if (sprinting && this.canSprint) {
      this.value = Math.max(0, this.value - dt / Stamina.SPRINT_SECONDS);
      if (this.value === 0) this.exhausted = true;
    } else {
      // Recovers faster when standing still than while moving.
      const rate = moving ? 0.6 : 1;
      this.value = Math.min(1, this.value + (dt / Stamina.RECOVER_SECONDS) * rate);
      if (this.exhausted && this.value >= Stamina.RESUME_THRESHOLD) this.exhausted = false;
    }
  }
}
