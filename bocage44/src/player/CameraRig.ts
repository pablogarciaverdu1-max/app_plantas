import * as THREE from 'three';
import type { PlayerController } from './PlayerController';

const DEG = Math.PI / 180;

/**
 * First-person camera: eye height, look angles, lean, head bob, breathing and
 * landing dip. Runs per rendered frame and interpolates the simulated position.
 */
export class CameraRig {
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0022;
  private bobPhase = 0;
  private bobAmount = 0;
  private dip = 0;
  private dipVel = 0;
  private time = 0;
  private smoothEye = 1.62;
  private readonly feet = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  look(dx: number, dy: number, player: PlayerController): void {
    // Prone limits how fast the body can swing round.
    const k = player.stance === 'prone' ? 0.6 : 1;
    this.yaw -= dx * this.sensitivity * k;
    this.pitch = Math.min(85 * DEG, Math.max(-85 * DEG, this.pitch - dy * this.sensitivity * k));
  }

  update(frameTime: number, alpha: number, player: PlayerController): void {
    this.time += frameTime;
    this.feet.lerpVectors(player.previousPosition, player.position, alpha);

    // One bob per footstep. Cadence rises with speed: ~2.1 steps/s walking,
    // ~2.6 trotting, ~3.2 sprinting.
    const speed = player.onGround && !player.isMantling ? player.horizontalSpeed : 0;
    const cadence = 1.6 + speed * 0.3;
    this.bobPhase += cadence * frameTime * Math.min(1, speed / 0.8);
    const targetAmount = Math.min(1, speed / 5.5);
    this.bobAmount += (targetAmount - this.bobAmount) * Math.min(1, frameTime * 4);

    if (player.justLanded && player.lastLandingSpeed > 1.5) {
      this.dipVel -= Math.min(4, player.lastLandingSpeed * 0.6);
    }
    // Damped spring for the landing dip.
    this.dipVel += (-this.dip * 120 - this.dipVel * 14) * frameTime;
    this.dip += this.dipVel * frameTime;

    // Eye height eases toward the posture height (smooth crouch / prone).
    this.smoothEye += (player.eyeHeight - this.smoothEye) * Math.min(1, frameTime * 12);

    const breath = 0.004 + player.stamina.breathlessness * 0.012;
    const breathRate = 1.4 + player.stamina.breathlessness * 1.6;
    // Smooth rise and fall per step (no sharp cusp at foot strike); sideways sway
    // has half the frequency because the body shifts over each foot in turn.
    const bobY = (0.5 - 0.5 * Math.cos(this.bobPhase * 2 * Math.PI)) * 0.035 * this.bobAmount;
    const bobX = Math.sin(this.bobPhase * Math.PI) * 0.018 * this.bobAmount;

    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.camera.position
      .copy(this.feet)
      .addScaledVector(right, player.leanOffset + bobX)
      .setY(this.feet.y + this.smoothEye + bobY - 0.0175 * this.bobAmount + Math.sin(this.time * breathRate) * breath + this.dip);

    const roll = -player.lean * 20 * DEG * (player.leanOffset !== 0 ? Math.abs(player.leanOffset) / 0.35 : 0);
    const bobRoll = Math.sin(this.bobPhase * Math.PI) * 0.4 * DEG * this.bobAmount;
    const breathPitch = Math.sin(this.time * breathRate * 0.5) * breath * 0.25;
    this.camera.rotation.set(this.pitch + breathPitch, this.yaw, roll + bobRoll, 'YXZ');
  }
}
