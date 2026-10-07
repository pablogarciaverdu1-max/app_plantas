import * as THREE from 'three';
import type { CollisionWorld, Capsule } from '../world/Collision';
import { STANCES, STANCE_BLEND_TIME, nextStance, type StanceName } from './Stance';
import { Stamina } from './Stamina';

/** One simulation step's worth of player intent, already decoded from keys. */
export interface PlayerIntent {
  /** -1..1, forward positive. */
  forward: number;
  /** -1..1, right positive. */
  right: number;
  sprint: boolean;
  walk: boolean;
  jumpPressed: boolean;
  crouchPressed: boolean;
  pronePressed: boolean;
  /** -1 left, 0 none, 1 right. */
  lean: number;
  /** Heading in radians (camera yaw). */
  yaw: number;
}

export const SPEED = { walk: 1.6, trot: 3.5, sprint: 5.5 };
const GRAVITY = 9.81;
const GROUND_ACCEL = 9;
const GROUND_DECEL = 12;
const AIR_ACCEL = 1;
const JUMP_SPEED = 2.6; // ~35 cm with full kit
const WALKABLE_NORMAL_Y = 0.8; // slopes up to about 37 degrees
const MAX_CLIMB = 1.2;
const LEAN_OFFSET = 0.35;
const LEAN_TIME = 0.25;
const RADIUS = 0.3;

interface Mantle {
  from: THREE.Vector3;
  apex: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
}

const up = new THREE.Vector3(0, 1, 0);

export class PlayerController {
  /** Feet position. */
  readonly position = new THREE.Vector3();
  readonly previousPosition = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly stamina = new Stamina();
  stance: StanceName = 'stand';
  /** Current capsule height, blending toward the stance height. */
  height = STANCES.stand.height;
  /** Smoothed lean, -1..1. */
  lean = 0;
  /** Lean offset actually allowed by nearby walls, metres. */
  leanOffset = 0;
  onGround = false;
  sprinting = false;
  /** Vertical speed at the moment of the last landing (for camera dip). */
  lastLandingSpeed = 0;
  private landedThisStep = false;
  private mantle: Mantle | null = null;
  private readonly capsule: Capsule = { start: new THREE.Vector3(), end: new THREE.Vector3(), radius: RADIUS };

  constructor(private readonly world: CollisionWorld) {}

  get eyeHeight(): number {
    // Eye sits a fixed distance below the top of the head, scaled for low postures.
    return Math.max(0.25, this.height - (this.height > 1 ? 0.13 : 0.1));
  }

  get isMantling(): boolean {
    return this.mantle !== null;
  }

  get justLanded(): boolean {
    return this.landedThisStep;
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  teleport(p: THREE.Vector3): void {
    this.position.copy(p);
    this.previousPosition.copy(p);
    this.velocity.set(0, 0, 0);
    this.mantle = null;
  }

  step(dt: number, intent: PlayerIntent): void {
    this.previousPosition.copy(this.position);
    this.landedThisStep = false;

    this.updateStance(dt, intent);

    if (this.mantle) {
      this.updateMantle(dt);
      this.updateLean(dt, intent);
      this.stamina.update(dt, false, true);
      return;
    }

    if (intent.jumpPressed && this.onGround && this.stance !== 'prone') {
      if (!this.tryStartMantle(intent.yaw)) {
        if (this.stance === 'stand') this.velocity.y = JUMP_SPEED;
        else this.stance = 'stand'; // jumping from a crouch first stands up
      }
      if (this.mantle) return;
    }

    // Desired horizontal velocity.
    const len = Math.hypot(intent.forward, intent.right);
    const fwd = len > 0 ? intent.forward / len : 0;
    const rgt = len > 0 ? intent.right / len : 0;
    const wantsSprint = intent.sprint && intent.forward > 0.5 && this.stance === 'stand' && this.onGround;
    this.sprinting = wantsSprint && this.stamina.canSprint;
    let speed = this.sprinting ? SPEED.sprint : intent.walk ? SPEED.walk : SPEED.trot;
    speed = Math.min(speed, STANCES[this.stance].maxSpeed);
    // Moving backwards or sideways is slower than moving forwards.
    if (fwd < 0) speed *= 0.65;
    else if (Math.abs(rgt) > 0.7) speed *= 0.85;
    // Tired legs.
    speed *= 1 - this.stamina.breathlessness * 0.15;

    const sin = Math.sin(intent.yaw);
    const cos = Math.cos(intent.yaw);
    // Camera looks down -Z at yaw 0.
    const wishX = (-sin * fwd + cos * rgt) * speed * Math.min(1, len);
    const wishZ = (-cos * fwd - sin * rgt) * speed * Math.min(1, len);

    const dvx = wishX - this.velocity.x;
    const dvz = wishZ - this.velocity.z;
    const dv = Math.hypot(dvx, dvz);
    if (dv > 0) {
      const speeding = wishX * this.velocity.x + wishZ * this.velocity.z > 0 && Math.hypot(wishX, wishZ) > this.horizontalSpeed;
      const accel = this.onGround ? (speeding ? GROUND_ACCEL : GROUND_DECEL) : AIR_ACCEL;
      const k = Math.min(1, (accel * dt) / dv);
      this.velocity.x += dvx * k;
      this.velocity.z += dvz * k;
    }

    this.velocity.y -= GRAVITY * dt;
    const wasOnGround = this.onGround;
    const fallSpeed = -this.velocity.y;

    this.position.addScaledVector(this.velocity, dt);
    this.collide();

    // Stay glued to the ground when walking down slopes instead of hopping.
    if (wasOnGround && !this.onGround && this.velocity.y <= 0) this.snapDown(0.35);

    if (this.onGround && !wasOnGround) {
      this.landedThisStep = true;
      this.lastLandingSpeed = fallSpeed;
    }

    this.stamina.update(dt, this.sprinting, this.horizontalSpeed > 0.3);
    this.updateLean(dt, intent);
  }

  private makeCapsule(feet: THREE.Vector3, height: number): Capsule {
    const r = Math.min(RADIUS, height / 2);
    this.capsule.radius = r;
    this.capsule.start.set(feet.x, feet.y + r, feet.z);
    this.capsule.end.set(feet.x, feet.y + Math.max(r, height - r), feet.z);
    return this.capsule;
  }

  private collide(): void {
    const cap = this.makeCapsule(this.position, this.height);
    const contact = this.world.resolveCapsule(cap, WALKABLE_NORMAL_Y);
    this.position.set(cap.start.x, cap.start.y - cap.radius, cap.start.z);
    this.onGround = contact.groundNormalY >= WALKABLE_NORMAL_Y;

    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;
    // Hit the ceiling.
    if (contact.push.y < -1e-4 && this.velocity.y > 0) this.velocity.y = 0;
    // Remove velocity into walls so the player slides along them.
    const px = contact.wallPush.x;
    const pz = contact.wallPush.z;
    const pl = Math.hypot(px, pz);
    if (pl > 1e-5) {
      const nx = px / pl;
      const nz = pz / pl;
      const into = this.velocity.x * nx + this.velocity.z * nz;
      if (into < 0) {
        this.velocity.x -= into * nx;
        this.velocity.z -= into * nz;
      }
    }
  }

  private snapDown(maxDrop: number): void {
    const saved = this.position.clone();
    this.position.y -= maxDrop;
    const cap = this.makeCapsule(this.position, this.height);
    const contact = this.world.resolveCapsule(cap, WALKABLE_NORMAL_Y);
    if (contact.groundNormalY >= WALKABLE_NORMAL_Y && contact.push.y > 0) {
      this.position.set(cap.start.x, cap.start.y - cap.radius, cap.start.z);
      this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.position.copy(saved);
    }
  }

  private updateStance(dt: number, intent: PlayerIntent): void {
    if (intent.crouchPressed) this.requestStance(nextStance(this.stance, 'crouch'));
    if (intent.pronePressed) this.requestStance(nextStance(this.stance, 'prone'));
    // Sprinting from a crouch stands the soldier up, if there is room.
    if (intent.sprint && intent.forward > 0.5 && this.stance === 'crouch') this.requestStance('stand');

    const target = STANCES[this.stance].height;
    const rate = (STANCES.stand.height - STANCES.prone.height) / STANCE_BLEND_TIME[this.stance];
    if (this.height < target) {
      // Only grow if the taller capsule fits.
      const next = Math.min(target, this.height + rate * dt);
      if (this.world.capsuleFits(this.makeCapsule(this.position.clone().setY(this.position.y + 0.02), next))) this.height = next;
    } else if (this.height > target) {
      this.height = Math.max(target, this.height - rate * dt);
    }
  }

  private requestStance(target: StanceName): void {
    if (target === this.stance) return;
    if (STANCES[target].height > this.height) {
      const probe = this.position.clone();
      probe.y += 0.02;
      if (!this.world.capsuleFits(this.makeCapsule(probe, STANCES[target].height))) return; // no headroom
    }
    this.stance = target;
  }

  private updateLean(dt: number, intent: PlayerIntent): void {
    const target = this.sprinting || this.mantle ? 0 : intent.lean;
    const step = dt / LEAN_TIME;
    this.lean += Math.max(-step, Math.min(step, target - this.lean));
    // Do not let the head pass through walls.
    const want = this.lean * LEAN_OFFSET;
    if (Math.abs(want) < 1e-3) {
      this.leanOffset = 0;
      return;
    }
    const side = new THREE.Vector3(Math.cos(intent.yaw), 0, -Math.sin(intent.yaw)).multiplyScalar(Math.sign(want));
    const head = this.position.clone().addScaledVector(up, this.eyeHeight);
    const hit = this.world.raycast(head, side, Math.abs(want) + 0.15);
    const allowed = hit ? Math.max(0, hit.distance - 0.15) : Math.abs(want);
    this.leanOffset = Math.sign(want) * Math.min(Math.abs(want), allowed);
  }

  /** Looks for a ledge in front of the player up to 1.2 m high and starts climbing or vaulting it. */
  private tryStartMantle(yaw: number): boolean {
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const knee = this.position.clone().addScaledVector(up, 0.35);
    const wall = this.world.raycast(knee, fwd, 0.9);
    if (!wall) return false;

    // Probe down onto the top of the obstacle just beyond its face.
    const topProbe = this.position.clone().addScaledVector(fwd, wall.distance + 0.2).addScaledVector(up, MAX_CLIMB + 0.4);
    const top = this.world.raycast(topProbe, new THREE.Vector3(0, -1, 0), MAX_CLIMB + 0.4);
    if (!top || top.normal.y < WALKABLE_NORMAL_Y) return false;
    const ledge = top.point.y - this.position.y;
    if (ledge < 0.3 || ledge > MAX_CLIMB + 0.05) return false;

    // Nothing in the way at chest height above the ledge.
    const over = this.position.clone().setY(top.point.y + 0.35);
    if (this.world.raycast(over, fwd, wall.distance + 0.5)) return false;

    // Vault if the obstacle is thin and there is ground on the far side; otherwise climb on top.
    const farProbe = this.position.clone().addScaledVector(fwd, wall.distance + 0.95).setY(top.point.y + 0.3);
    const far = this.world.raycast(farProbe, new THREE.Vector3(0, -1, 0), MAX_CLIMB + 2);
    let to: THREE.Vector3;
    if (far && far.point.y < top.point.y - 0.3 && far.normal.y >= WALKABLE_NORMAL_Y && this.fits(far.point, STANCES.stand.height)) {
      to = far.point.clone();
    } else {
      to = top.point.clone().addScaledVector(fwd, 0.15);
      if (!this.fits(to, STANCES.crouch.height)) return false;
    }
    if (!this.fits(to, STANCES.stand.height)) this.stance = 'crouch';

    const apex = this.position.clone().addScaledVector(fwd, wall.distance * 0.6);
    apex.y = top.point.y + 0.1;
    this.mantle = { from: this.position.clone(), apex, to, t: 0, duration: 0.45 + ledge * 0.45 };
    this.velocity.set(0, 0, 0);
    return true;
  }

  private fits(feet: THREE.Vector3, height: number): boolean {
    return this.world.capsuleFits(this.makeCapsule(feet.clone().setY(feet.y + 0.03), height));
  }

  private updateMantle(dt: number): void {
    const m = this.mantle!;
    m.t = Math.min(1, m.t + dt / m.duration);
    // Rise to the apex during the first 55 %, then move over and down.
    const split = 0.55;
    if (m.t < split) {
      const k = m.t / split;
      const e = 1 - (1 - k) * (1 - k);
      this.position.lerpVectors(m.from, m.apex, e);
    } else {
      const k = (m.t - split) / (1 - split);
      this.position.lerpVectors(m.apex, m.to, k * k * (3 - 2 * k));
    }
    if (m.t >= 1) {
      this.position.copy(m.to);
      this.mantle = null;
      this.onGround = true;
      this.collide();
    }
  }
}
