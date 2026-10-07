/**
 * Fixed-step simulation loop. Simulation runs at a constant rate regardless of
 * frame rate; rendering receives an interpolation factor between steps.
 * Pure logic: no DOM or Three.js dependency, so it is unit-testable.
 */
export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
/** Cap per frame so a long stall (tab switch) does not cause a spiral of death. */
const MAX_FRAME_TIME = 0.25;

export interface LoopCallbacks {
  step(dt: number): void;
  render(alpha: number, frameTime: number): void;
}

export class GameLoop {
  private accumulator = 0;
  private simTime = 0;

  constructor(private readonly callbacks: LoopCallbacks) {}

  get time(): number {
    return this.simTime;
  }

  /** Advances the loop by a real elapsed time in seconds. Returns the number of steps run. */
  advance(frameTime: number): number {
    const clamped = Math.min(Math.max(frameTime, 0), MAX_FRAME_TIME);
    this.accumulator += clamped;
    let steps = 0;
    while (this.accumulator >= SIM_DT) {
      this.callbacks.step(SIM_DT);
      this.simTime += SIM_DT;
      this.accumulator -= SIM_DT;
      steps++;
    }
    this.callbacks.render(this.accumulator / SIM_DT, clamped);
    return steps;
  }
}
