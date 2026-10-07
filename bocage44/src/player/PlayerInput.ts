import type { Input } from '../core/Input';
import type { PlayerIntent } from './PlayerController';

/** Key bindings from the GDD. X toggles walking pace (not in the GDD table; agreed addition). */
export const KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: 'KeyC',
  prone: 'KeyZ',
  leanLeft: 'KeyQ',
  leanRight: 'KeyE',
  jump: 'Space',
  walkToggle: 'KeyX',
} as const;

/** Turns raw key state into one step of player intent. */
export class PlayerInput {
  walk = false;

  constructor(private readonly input: Input) {}

  read(yaw: number): PlayerIntent {
    const i = this.input;
    if (i.consumePressed(KEYS.walkToggle)) this.walk = !this.walk;
    const lean = (i.isDown(KEYS.leanRight) ? 1 : 0) - (i.isDown(KEYS.leanLeft) ? 1 : 0);
    return {
      forward: (i.isDown(KEYS.forward) ? 1 : 0) - (i.isDown(KEYS.back) ? 1 : 0),
      right: (i.isDown(KEYS.right) ? 1 : 0) - (i.isDown(KEYS.left) ? 1 : 0),
      // While aiming, Shift holds the breath instead of sprinting.
      sprint: KEYS.sprint.some((k) => i.isDown(k)) && !i.mouseRight,
      walk: this.walk,
      jumpPressed: i.consumePressed(KEYS.jump),
      crouchPressed: i.consumePressed(KEYS.crouch),
      pronePressed: i.consumePressed(KEYS.prone),
      lean,
      yaw,
    };
  }
}
