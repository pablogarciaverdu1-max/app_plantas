import * as THREE from 'three';
import { Weapon, ammoCheckKey, type WeaponEvent } from '../weapons/Weapon';
import { weapon as weaponSpec } from '../weapons/WeaponData';
import { zeroAngle } from '../weapons/Ballistics';
import { Health, hitDamage } from '../damage/Health';
import { bodyCapsules, type HitCapsule } from '../damage/Hitbox';
import type { BulletHit, ProjectilePool, Target } from '../weapons/ProjectilePool';
import type { PlayerController } from './PlayerController';
import { SIGHT_HEIGHT, type ViewModel, type ViewWeapon } from './ViewModel';
import type { CameraRig } from './CameraRig';
import type { Input } from '../core/Input';

const DEG = Math.PI / 180;

interface Slot {
  view: ViewWeapon;
  weapon: Weapon;
  /** Bore elevation that zeroes the sights at 100 m (25 m for the pistol). */
  zero: number;
  adsTime: number;
  adsFov: number;
  hipSpread: number;
}

export interface CombatFeedback {
  onShot(origin: THREE.Vector3, weaponId: string): void;
  onWeaponEvent(e: WeaponEvent | 'reloadStart', weaponId: string): void;
  onHurt(damage: number): void;
  onNearMiss(distance: number, supersonic: boolean, point: THREE.Vector3): void;
  onMessage(key: string): void;
}

/**
 * Everything the player does with weapons and everything done to him:
 * aiming, sway, recoil, reloads, ammo checks, wounds, bandages, suppression.
 */
export class PlayerCombat implements Target {
  readonly side = 'allied' as const;
  readonly health = new Health();
  readonly center = new THREE.Vector3();
  readonly slots: Slot[];
  active = 0;
  bandages = 2;
  /** 0 hip … 1 fully on the sights. */
  ads = 0;
  /** 0..1, from near misses. */
  suppression = 0;
  firedRecently = 0;

  private swayTime = 0;
  private breathHold = 0; // seconds of held breath used
  private breathRecover = 0;
  private kickPitch = 0;
  private kickYaw = 0;
  private kickBack = 0;
  private switchT = 0;
  private reloadHeld = 0;
  private reloadUsed = false;
  private hurtJolt = 0;
  private swayYaw = 0;
  private swayPitch = 0;

  constructor(
    private readonly player: PlayerController,
    private readonly rig: CameraRig,
    private readonly view: ViewModel,
    private readonly pool: ProjectilePool,
    private readonly feedback: CombatFeedback,
  ) {
    const garand = weaponSpec('m1_garand');
    const colt = weaponSpec('m1911a1');
    this.slots = [
      { view: 'garand', weapon: new Weapon(garand, 48), zero: zeroAngle(100, SIGHT_HEIGHT, garand.muzzleVelocity, garand.ballisticCoefficient), adsTime: 0.32, adsFov: 55, hipSpread: 1.6 * DEG },
      { view: 'pistol', weapon: new Weapon(colt, 21), zero: zeroAngle(25, 0.02, colt.muzzleVelocity, colt.ballisticCoefficient), adsTime: 0.2, adsFov: 62, hipSpread: 2.2 * DEG },
    ];
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  get slot(): Slot {
    return this.slots[this.active];
  }

  get busy(): boolean {
    return this.slot.weapon.reloading || this.switchT > 0 || this.health.bandaging;
  }

  get fov(): number {
    const e = this.ads * this.ads * (3 - 2 * this.ads);
    return 70 + (this.slot.adsFov - 70) * e;
  }

  get holdingBreath(): boolean {
    return this.breathHold > 0 && this.breathHold < 3 && this.breathRecover <= 0;
  }

  hitCapsules(): HitCapsule[] {
    return bodyCapsules(this.player.position, this.rig.yaw, this.player.height);
  }

  onBulletHit(hit: BulletHit): void {
    if (!this.alive) return;
    const pistolOrSmg = hit.weapon.class === 'pistol' || hit.weapon.class === 'smg';
    const dmg = hitDamage(hit.weapon.damage, hit.zone, hit.energyFraction, { helmet: true, pistolOrSmg, oblique: Math.random() < 0.5, random: Math.random });
    this.health.applyHit(dmg, hit.zone);
    this.hurtJolt = 1;
    this.suppression = Math.min(1, this.suppression + 0.5);
    this.feedback.onHurt(dmg);
  }

  onBulletPass(distance: number, _shooter: 'allied' | 'german', supersonic: boolean, point: THREE.Vector3): void {
    if (!this.alive) return;
    this.suppression = Math.min(1, this.suppression + (1 - distance / 3) * (supersonic ? 0.35 : 0.2));
    this.feedback.onNearMiss(distance, supersonic, point);
  }

  /** Fixed-step update. Returns true if the player wants walking pace (aiming). */
  step(dt: number, input: Input): void {
    this.center.copy(this.player.position).setY(this.player.position.y + this.player.height * 0.55);
    this.firedRecently = Math.max(0, this.firedRecently - dt);
    this.suppression = Math.max(0, this.suppression - dt * 0.3);
    this.hurtJolt = Math.max(0, this.hurtJolt - dt * 3);
    if (!this.alive) {
      this.ads = Math.max(0, this.ads - dt * 4);
      return;
    }

    if (this.health.update(dt)) this.feedback.onMessage('bandageDone');
    this.player.speedFactor = Math.max(0.55, 1 - this.health.legWounds * 0.2) * (this.ads > 0.5 ? 0.5 : 1);

    // Weapon switching.
    this.switchT = Math.max(0, this.switchT - dt);
    const want = input.consumePressed('Digit1') ? 0 : input.consumePressed('Digit2') ? 1 : input.consumeWheel() !== 0 ? 1 - this.active : this.active;
    if (want !== this.active && !this.health.bandaging) {
      this.slot.weapon.cancelReload();
      this.active = want;
      this.switchT = 0.6;
      this.view.select(this.slot.view);
    }

    // Bandage (V): weapon lowered for 4 s.
    if (input.consumePressed('KeyV')) {
      if (this.bandages > 0 && this.health.startBandage()) {
        this.bandages--;
        this.slot.weapon.cancelReload();
        this.feedback.onMessage('bandaging');
      } else if (this.health.bleedRate <= 0) {
        this.feedback.onMessage('notBleeding');
      } else {
        this.feedback.onMessage('noBandages');
      }
    }

    // R: tap reloads, hold checks the magazine.
    if (input.isDown('KeyR')) {
      this.reloadHeld += dt;
      if (this.reloadHeld > 0.4 && !this.reloadUsed) {
        this.reloadUsed = true;
        this.feedback.onMessage(ammoCheckKey(this.slot.weapon.fill));
      }
    } else {
      if (this.reloadHeld > 0 && !this.reloadUsed && !this.busy) {
        if (this.slot.weapon.startReload()) this.feedback.onWeaponEvent('reloadStart', this.slot.weapon.spec.id);
      }
      this.reloadHeld = 0;
      this.reloadUsed = false;
    }
    input.consumePressed('KeyR');

    // Aiming down the sights (right mouse), slower when moving fast.
    const wantsAds = input.mouseRight && !this.busy && !this.player.sprinting && !this.player.isMantling;
    const rate = dt / this.slot.adsTime;
    this.ads = THREE.MathUtils.clamp(this.ads + (wantsAds ? rate : -rate * 1.4), 0, 1);

    // Hold breath (Shift while aiming): steadier for 3 s, then shakier until recovered.
    const holding = this.ads > 0.8 && input.isDown('ShiftLeft');
    if (holding && this.breathRecover <= 0) {
      this.breathHold += dt;
      if (this.breathHold >= 3) this.breathRecover = 4;
    } else {
      if (this.breathHold > 0 && this.breathRecover <= 0) this.breathRecover = Math.min(4, this.breathHold);
      this.breathHold = 0;
      this.breathRecover = Math.max(0, this.breathRecover - dt);
    }

    this.updateSway(dt);

    // Recoil settles back most of the way, never completely.
    this.kickPitch *= Math.exp(-dt * 9);
    this.kickYaw *= Math.exp(-dt * 9);
    this.kickBack *= Math.exp(-dt * 14);

    const trigger = input.mouseLeft && !this.busy && !this.player.sprinting && !this.player.isMantling;
    for (const ev of this.slot.weapon.update(dt, trigger)) {
      if (ev === 'fired') this.fire();
      this.feedback.onWeaponEvent(ev, this.slot.weapon.spec.id);
    }
  }

  private updateSway(dt: number): void {
    this.swayTime += dt;
    const stance = this.player.stance;
    let amp = stance === 'prone' ? 0.0007 : stance === 'crouch' ? 0.0016 : 0.0026;
    amp *= 1 + this.player.stamina.breathlessness * 3;
    amp *= 1 + this.health.armWounds * 0.6;
    amp *= 1 + this.suppression * 2.5;
    amp *= 1 + Math.min(1, this.player.horizontalSpeed / 2) * 2;
    amp *= 1 + (1 - this.ads) * 2.5;
    if (this.holdingBreath) amp *= 0.25;
    else if (this.breathRecover > 0) amp *= 1.6;
    const t = this.swayTime;
    // Slow figure-of-eight drift plus a faint tremor.
    this.swayYaw = amp * (Math.sin(t * 0.83) + 0.4 * Math.sin(t * 2.1 + 1.3)) + amp * 0.15 * Math.sin(t * 11);
    this.swayPitch = amp * (0.7 * Math.sin(t * 1.37 + 0.5) + 0.3 * Math.sin(t * 2.9)) + amp * 0.15 * Math.sin(t * 13.3);
  }

  private fire(): void {
    const s = this.slot;
    const spec = s.weapon.spec;
    this.rig.camera.updateMatrixWorld();
    const { origin, forward } = this.view.muzzleWorld(this.rig.camera);
    // Bore points slightly up from the sight line (the zero).
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const dir = forward.clone().applyAxisAngle(right, s.zero);
    // Hip fire is a guess, not an aimed shot.
    const spread = s.hipSpread * (1 - this.ads);
    if (spread > 0) {
      const up = new THREE.Vector3().crossVectors(right, dir);
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    }
    this.pool.fire(origin, dir, spec, 'allied', this);
    this.view.muzzleFlash();
    this.firedRecently = 1;

    // Recoil: a lasting part on the camera and a quick kick of the weapon.
    const stanceK = this.player.stance === 'prone' ? 0.5 : this.player.stance === 'crouch' ? 0.8 : 1;
    const v = spec.recoil.vertical * stanceK;
    const h = spec.recoil.horizontal * stanceK;
    this.rig.pitch += v * 0.35 * DEG;
    this.rig.yaw += (Math.random() - 0.5) * h * 0.6 * DEG;
    this.kickPitch += v * 0.9 * DEG;
    this.kickYaw += (Math.random() - 0.5) * h * 1.2 * DEG;
    this.kickBack += 0.03 + v * 0.008;
    this.feedback.onShot(origin, spec.id);
  }

  /** Per rendered frame: places the viewmodel. */
  render(dt: number, bob: THREE.Vector2): void {
    const w = this.slot.weapon;
    const lower = this.switchT > 0 ? Math.sin((this.switchT / 0.6) * Math.PI) : this.health.bandaging ? 1 : !this.alive ? 1 : 0;
    const reloadTilt = w.reloading ? 1 : 0;
    this.reloadVisual += ((reloadTilt ? 1 : 0) - this.reloadVisual) * Math.min(1, dt * 8);
    const jolt = this.hurtJolt * 0.03;
    this.view.update(dt, this.ads, this.swayYaw + this.kickYaw + jolt, this.swayPitch + this.kickPitch, this.kickBack, lower, this.reloadVisual, bob);
  }

  private reloadVisual = 0;
}
