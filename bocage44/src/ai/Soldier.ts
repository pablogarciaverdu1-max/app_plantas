import * as THREE from 'three';
import { PlayerController, type PlayerIntent } from '../player/PlayerController';
import type { CollisionWorld } from '../world/Collision';
import { SoldierBrain, type Order, type Point } from './StateMachine';
import { detectionRate, HEARING_RADIUS } from './Perception';
import type { Squad, SquadMember } from './Squad';
import type { CoverPoint, CoverPoints } from './CoverPoints';
import { SoldierModel } from './SoldierModel';
import { Weapon } from '../weapons/Weapon';
import { weapon as weaponSpec } from '../weapons/WeaponData';
import { Health, hitDamage } from '../damage/Health';
import { bodyCapsules, type HitCapsule } from '../damage/Hitbox';
import type { BulletHit, ProjectilePool, Target } from '../weapons/ProjectilePool';
import { GRAVITY, SPEED_OF_SOUND } from '../weapons/Ballistics';

/** What the soldier knows about the world this step. */
export interface WorldContext {
  world: CollisionWorld;
  cover: CoverPoints;
  pool: ProjectilePool;
  /** The player as seen from outside. */
  player: { position: THREE.Vector3; eye: THREE.Vector3; speed: number; stance: 'stand' | 'crouch' | 'prone'; firedRecently: boolean; alive: boolean };
  light: number;
  fogVisibility: number;
  /** Sounds in the world; each is heard once it has had time to travel. */
  noises: Noise[];
  time: number;
  onShot(origin: THREE.Vector3, weaponId: string): void;
  onShout(soldier: Soldier): void;
}

export interface Noise {
  id: number;
  position: THREE.Vector3;
  radius: number;
  /** A gunshot or alarm rather than a curious sound. */
  alarm: boolean;
  time: number;
}

const DEG = Math.PI / 180;
const TURN_RATE = 3.2;
let nextId = 0;

function gauss(): number {
  return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
}

export class Soldier implements Target, SquadMember {
  readonly id = `soldier-${nextId++}`;
  readonly side = 'german' as const;
  readonly body: PlayerController;
  readonly brain = new SoldierBrain();
  readonly model: SoldierModel;
  readonly weapon: Weapon;
  readonly health = new Health();
  readonly center = new THREE.Vector3();
  yaw: number;
  order: Order = { state: 'Patrol', role: null, focus: null, fire: false, shout: false };

  private waypoint = 0;
  private cover: CoverPoint | null = null;
  private peekTimer = 0;
  private peeking = false;
  private aimSettle = 0;
  private triggerDown = false;
  private burstLeft = 0;
  private burstPause = 0;
  private stuckTime = 0;
  private detourTime = 0;
  private detourSide = 1;
  private flankPoint: THREE.Vector3 | null = null;
  private perceptionAccum = 0;
  private sightGain = 0;
  private visible = false;
  private suppressionGain = 0;
  private heardNoises = new Set<number>();
  private heardNoise: Point | null = null;
  private heardAlarm = false;
  private walkPhase = 0;
  private fall = 0;
  private fallSide = 1;
  private recoil = 0;
  private wantStance: 'stand' | 'crouch' | 'prone' = 'stand';
  private searchLookTimer = 0;
  private flinch = 0;

  constructor(
    world: CollisionWorld,
    position: THREE.Vector3,
    yaw: number,
    readonly squad: Squad,
    private readonly patrol: THREE.Vector3[],
    readonly weaponId: 'kar98k' | 'mp40',
  ) {
    this.body = new PlayerController(world);
    this.body.teleport(position);
    this.yaw = yaw;
    this.weapon = new Weapon(weaponSpec(weaponId), weaponId === 'mp40' ? 96 : 40);
    this.model = new SoldierModel(weaponId === 'mp40');
    this.perceptionAccum = Math.random() * 0.066; // spread checks across frames
    squad.add(this);
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  get inCombat(): boolean {
    return this.order.state === 'Combat' || this.order.state === 'Suppressed';
  }

  get position(): Point {
    return this.body.position;
  }

  get eye(): THREE.Vector3 {
    return this.body.position.clone().setY(this.body.position.y + this.body.eyeHeight);
  }

  hitCapsules(): HitCapsule[] {
    return bodyCapsules(this.body.position, this.yaw, this.body.height);
  }

  onBulletHit(hit: BulletHit): void {
    if (!this.alive) return;
    const pistolOrSmg = hit.weapon.class === 'pistol' || hit.weapon.class === 'smg';
    const facing = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const oblique = Math.abs(facing.dot(hit.direction)) < 0.7;
    const dmg = hitDamage(hit.weapon.damage, hit.zone, hit.energyFraction, { helmet: true, pistolOrSmg, oblique, random: Math.random });
    this.health.applyHit(dmg, hit.zone);
    this.flinch = 0.35;
    if (this.health.dead) {
      // Fall away from the shot.
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.fallSide = right.dot(hit.direction) > 0 ? -1 : 1;
    } else {
      // A wounded man knows where it came from and gets his head down.
      this.suppressionGain += 0.6;
      this.brain.awareness = Math.max(this.brain.awareness, 1.2);
      const from = hit.point.clone().addScaledVector(hit.direction, -30);
      this.heardNoise = from;
      this.heardAlarm = true;
    }
  }

  onBulletPass(distance: number, _shooter: 'allied' | 'german', supersonic: boolean): void {
    if (!this.alive) return;
    // Closer and supersonic (the crack) is far more frightening.
    this.suppressionGain += (1 - distance / 3) * (supersonic ? 0.45 : 0.25);
    this.heardAlarm = true;
  }

  update(dt: number, ctx: WorldContext): void {
    this.center.copy(this.body.position).setY(this.body.position.y + this.body.height * 0.55);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.flinch = Math.max(0, this.flinch - dt);

    if (!this.alive) {
      this.fall = Math.min(1, this.fall + dt / 0.8);
      ctx.cover.release(this.id);
      this.brain.update(this.senses(dt, ctx));
      this.body.step(dt, this.intent(0, 0, false, false));
      return;
    }

    this.health.update(dt);
    this.perceive(dt, ctx);
    const prevState = this.order.state;
    this.order = this.brain.update(this.senses(dt, ctx));
    this.sightGain = 0;
    this.suppressionGain = 0;
    this.heardNoise = null;
    this.heardAlarm = false;

    if (this.visible && this.brain.awareness >= 1) this.squad.report(ctx.player.position);
    if (this.order.shout) ctx.onShout(this);
    if (prevState !== this.order.state && this.order.state !== 'Combat') this.releaseCover(ctx);

    switch (this.order.state) {
      case 'Patrol':
        this.doPatrol(dt);
        break;
      case 'Suspicious':
        this.wantStance = 'crouch';
        this.move(dt, null, 'walk');
        break;
      case 'Search':
        this.doSearch(dt);
        break;
      case 'Combat':
        this.doCombat(dt, ctx);
        break;
      case 'Suppressed':
        this.wantStance = this.cover ? 'crouch' : 'prone';
        this.triggerDown = false;
        this.move(dt, null, 'walk');
        break;
      default:
        this.move(dt, null, 'walk');
    }

    this.turnToward(dt);
    this.handleWeapon(dt, ctx);
  }

  /** Copies simulation state onto the visible model. */
  sync(): void {
    const p = this.body.position;
    this.model.root.position.set(p.x, p.y, p.z);
    this.model.root.rotation.y = this.yaw;
    this.walkPhase += this.body.horizontalSpeed * 0.022;
    this.model.setPose({
      walkPhase: this.walkPhase,
      stride: Math.min(1, this.body.horizontalSpeed / 3),
      height: this.body.height,
      aiming: this.alive && (this.order.state === 'Combat' || this.order.state === 'Search') && (this.peeking || !this.cover),
      aimPitch: 0,
      fall: this.fall,
      fallSide: this.fallSide,
      recoil: this.recoil,
    });
  }

  // --- senses -----------------------------------------------------------

  private perceive(dt: number, ctx: WorldContext): void {
    // Sight is checked about 15 times a second, staggered between soldiers.
    this.perceptionAccum += dt;
    if (this.perceptionAccum >= 1 / 15) {
      const step = this.perceptionAccum;
      this.perceptionAccum = 0;
      const eye = this.eye;
      const toPlayer = ctx.player.eye.clone().sub(eye);
      const distance = toPlayer.length();
      const facing = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const flat = toPlayer.clone().setY(0).normalize();
      const angleDeg = Math.acos(THREE.MathUtils.clamp(facing.dot(flat), -1, 1)) / DEG;
      const los = ctx.player.alive && distance < 320 && ctx.world.lineOfSight(eye, ctx.player.eye);
      const rate = detectionRate({
        distance, angleDeg, lineOfSight: los, light: ctx.light, fogVisibility: ctx.fogVisibility,
        stance: ctx.player.stance, targetSpeed: ctx.player.speed, targetFiring: ctx.player.firedRecently,
      });
      this.visible = rate > 0;
      this.sightGain += rate * step;
    }

    for (const n of ctx.noises) {
      if (this.heardNoises.has(n.id)) continue;
      const d = n.position.distanceTo(this.body.position);
      if (d > n.radius) {
        this.heardNoises.add(n.id);
        continue;
      }
      if (ctx.time - n.time < d / SPEED_OF_SOUND) continue; // still travelling
      this.heardNoises.add(n.id);
      // A rough bearing only: the farther, the vaguer.
      const err = d * 0.08;
      this.heardNoise = n.position.clone().add(new THREE.Vector3(gauss() * err, 0, gauss() * err));
      if (n.alarm) this.heardAlarm = true;
    }
  }

  private senses(dt: number, ctx: WorldContext) {
    return {
      dt,
      sightGain: this.sightGain,
      targetVisible: this.visible,
      targetPos: ctx.player.position,
      heardNoise: this.heardNoise,
      heardAlarm: this.heardAlarm,
      squadKnownPos: this.squad.shared(),
      suppressionGain: this.suppressionGain,
      role: this.squad.roleOf(this.id),
      alive: this.alive,
    };
  }

  // --- behaviours -------------------------------------------------------

  private doPatrol(dt: number): void {
    this.wantStance = 'stand';
    if (this.patrol.length === 0) {
      this.move(dt, null, 'walk');
      return;
    }
    const target = this.patrol[this.waypoint % this.patrol.length];
    if (this.flatDistance(target) < 1) this.waypoint++;
    this.move(dt, target, 'walk');
  }

  private doSearch(dt: number): void {
    this.wantStance = 'crouch';
    const focus = this.order.focus;
    if (focus && this.flatDistance(focus) > 2.5) {
      this.move(dt, new THREE.Vector3(focus.x, focus.y, focus.z), 'walk');
    } else {
      // Look around where the enemy was last seen.
      this.searchLookTimer -= dt;
      if (this.searchLookTimer <= 0) {
        this.searchLookTimer = 2.5;
        this.yaw += (Math.random() - 0.5) * 2.4;
      }
      this.move(dt, null, 'walk');
    }
  }

  private doCombat(dt: number, ctx: WorldContext): void {
    const focus = this.order.focus;
    const role = this.order.role ?? 'Engage';
    if (!focus) {
      this.move(dt, null, 'walk');
      return;
    }
    const threat = new THREE.Vector3(focus.x, focus.y + 1.4, focus.z);
    const self = this.body.position;

    // Keep the current cover while it still hides us; otherwise pick a new spot.
    if (this.cover && !ctx.cover.hides(this.cover.position, threat)) this.releaseCover(ctx);

    if (!this.cover) {
      let score: (p: THREE.Vector3) => number;
      let maxDist = 25;
      if (role === 'Retreat') {
        score = (p) => -p.distanceTo(threat) * 1.5;
        maxDist = 40;
      } else if (role === 'Flank') {
        this.flankPoint ??= this.makeFlankPoint(threat);
        const fp = this.flankPoint;
        score = (p) => p.distanceTo(fp) * 1.2;
        maxDist = 45;
      } else {
        score = (p) => Math.abs(p.distanceTo(threat) - 35) * 0.4;
      }
      this.cover = ctx.cover.find(self, threat, maxDist, this.id, score);
      if (this.cover) this.cover.takenBy = this.id;
    }

    if (this.cover) {
      const d = this.flatDistance(this.cover.position);
      if (d > 0.6) {
        this.peeking = false;
        this.wantStance = d > 6 ? 'stand' : 'crouch';
        this.move(dt, this.cover.position, d > 6 ? 'sprint' : 'trot');
        return;
      }
      if (role === 'Flank' && this.flankPoint) {
        // Arrived at the flanking position: from now on fight from here.
        this.flankPoint = null;
      }
      // At cover: alternate between ducking and rising to fire.
      this.peekTimer -= dt;
      if (this.peekTimer <= 0) {
        this.peeking = !this.peeking;
        this.peekTimer = this.peeking ? 2 + Math.random() * 2 : 1.2 + Math.random() * 2;
      }
      const lowCover = this.cover.height < 1.3;
      this.wantStance = this.peeking ? (lowCover ? 'stand' : 'stand') : 'crouch';
      if (this.weapon.reloading) this.wantStance = 'crouch';
      this.move(dt, null, 'walk');
    } else {
      // No cover nearby: get low and fight from here.
      this.peeking = true;
      const far = this.flatDistance(focus) > 40;
      this.wantStance = far ? 'prone' : 'crouch';
      this.move(dt, null, 'walk');
    }
  }

  private makeFlankPoint(threat: THREE.Vector3): THREE.Vector3 {
    // 90 degrees round from the squad's line to the enemy, about 25 m out from him.
    const centroid = new THREE.Vector3();
    let n = 0;
    for (const m of this.squad.members) {
      if (!m.alive) continue;
      centroid.add(new THREE.Vector3(m.position.x, m.position.y, m.position.z));
      n++;
    }
    centroid.divideScalar(Math.max(1, n));
    const toSquad = centroid.sub(threat).setY(0).normalize();
    const side = new THREE.Vector3(-toSquad.z, 0, toSquad.x);
    if (side.dot(this.body.position.clone().sub(threat)) < 0) side.negate();
    return threat.clone().addScaledVector(side, 25).addScaledVector(toSquad, 10).setY(threat.y - 1.4);
  }

  private releaseCover(ctx: WorldContext): void {
    ctx.cover.release(this.id);
    this.cover = null;
    this.peeking = false;
  }

  // --- movement ---------------------------------------------------------

  private move(dt: number, target: THREE.Vector3 | null, pace: 'walk' | 'trot' | 'sprint'): void {
    let forward = 0;
    let right = 0;
    let jump = false;
    if (target) {
      const to = target.clone().sub(this.body.position).setY(0);
      const dist = to.length();
      if (dist > 0.3) {
        to.normalize();
        if (this.detourTime > 0) {
          this.detourTime -= dt;
          to.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.detourSide * 1.2);
        }
        // Express the move direction relative to the facing so soldiers can strafe while aiming.
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const rgt = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        forward = to.dot(fwd);
        right = to.dot(rgt);
        // Stuck against something: try to climb it, then step round it.
        if (this.body.horizontalSpeed < 0.25 && !this.body.isMantling) {
          this.stuckTime += dt;
          if (this.stuckTime > 0.4) jump = true;
          if (this.stuckTime > 0.9) {
            this.detourTime = 1.2;
            this.detourSide = Math.random() < 0.5 ? -1 : 1;
            this.stuckTime = 0;
          }
        } else {
          this.stuckTime = 0;
        }
      }
    }
    // Sprinting only works facing the way you run.
    const sprint = pace === 'sprint' && forward > 0.7 && this.wantStance === 'stand';
    const intent = this.intent(forward, right, sprint, pace === 'walk', jump);
    // Stance changes are toggles in the controller: press only when different.
    if (this.wantStance !== this.body.stance) {
      if (this.wantStance === 'stand') intent[this.body.stance === 'crouch' ? 'crouchPressed' : 'pronePressed'] = true;
      else if (this.wantStance === 'crouch') intent.crouchPressed = true;
      else intent.pronePressed = true;
    }
    if (this.flinch > 0) {
      intent.forward *= 0.3;
      intent.right *= 0.3;
    }
    this.body.step(dt, intent);
  }

  private intent(forward: number, right: number, sprint: boolean, walk: boolean, jump = false): PlayerIntent {
    return { forward, right, sprint, walk, jumpPressed: jump, crouchPressed: false, pronePressed: false, lean: 0, yaw: this.yaw };
  }

  private turnToward(dt: number): void {
    let targetYaw: number | null = null;
    const focus = this.order.focus;
    if (focus && this.order.state !== 'Patrol') {
      targetYaw = Math.atan2(-(focus.x - this.body.position.x), -(focus.z - this.body.position.z));
    } else if (this.body.horizontalSpeed > 0.3) {
      targetYaw = Math.atan2(-this.body.velocity.x, -this.body.velocity.z);
    }
    if (targetYaw === null) return;
    let diff = targetYaw - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const step = TURN_RATE * dt;
    this.yaw += THREE.MathUtils.clamp(diff, -step, step);
    // Aim settles once the rifle points at the target and the man is still.
    if (Math.abs(diff) < 6 * DEG && this.body.horizontalSpeed < 1) this.aimSettle += dt;
    else this.aimSettle = 0;
  }

  // --- shooting ---------------------------------------------------------

  private handleWeapon(dt: number, ctx: WorldContext): void {
    const smg = this.weaponId === 'mp40';
    const focus = this.order.focus;
    const canShoot =
      this.order.fire && focus !== null && (this.peeking || !this.cover) && !this.body.isMantling &&
      this.aimSettle > (smg ? 0.35 : 0.7) && this.body.height > 0.3 && ctx.player.alive;

    if (this.weapon.mag === 0 && !this.weapon.reloading) this.weapon.startReload();

    let trigger = false;
    if (canShoot) {
      const dist = this.flatDistance(focus!);
      if (smg) {
        // Short bursts, longer pauses at range.
        if (this.burstLeft > 0) {
          trigger = true;
          this.burstLeft -= dt;
        } else {
          this.burstPause -= dt;
          if (this.burstPause <= 0 && dist < 120) {
            this.burstLeft = 0.2 + Math.random() * 0.35;
            this.burstPause = 0.5 + Math.random() * 0.9 + dist / 80;
          }
        }
      } else {
        // Bolt action: squeeze once the bolt is closed, release between shots.
        trigger = !this.triggerDown && !this.weapon.cycling && Math.random() < dt * 1.6;
      }
    }
    if (!canShoot) this.burstLeft = 0;
    this.triggerDown = trigger;

    for (const ev of this.weapon.update(dt, trigger)) {
      if (ev === 'fired') this.fire(ctx);
    }
  }

  private fire(ctx: WorldContext): void {
    const focus = this.order.focus!;
    const visible = this.visible && this.brain.awareness >= 1;
    const muzzle = this.eye.add(new THREE.Vector3(-Math.sin(this.yaw), -0.08, -Math.cos(this.yaw)).multiplyScalar(0.7));
    // Aim at the chest of a seen target, or the last known spot otherwise.
    const aimHeight = visible ? Math.max(0.25, ctx.player.eye.y - ctx.player.position.y - 0.35) : 1.0;
    const target = new THREE.Vector3(focus.x, focus.y + aimHeight, focus.z);
    const toT = target.clone().sub(muzzle);
    const d = toT.length();
    // Holdover for drop, as a trained rifleman would.
    const t = d / this.weapon.spec.muzzleVelocity;
    toT.y += 0.5 * GRAVITY * t * t * 1.1;
    const dirN = toT.normalize();
    // Angular error: distance, target movement, own fear, darkness, weapon type.
    const sigma =
      0.006 + d * 0.00009 + ctx.player.speed * 0.005 + this.brain.suppression * 0.03 +
      (1 - ctx.light) * 0.012 + (this.weaponId === 'mp40' ? 0.014 : 0) + (visible ? 0 : 0.03);
    const yawErr = gauss() * sigma;
    const pitchErr = gauss() * sigma;
    const right = new THREE.Vector3().crossVectors(dirN, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dirN);
    dirN.addScaledVector(right, yawErr).addScaledVector(up, pitchErr).normalize();
    ctx.pool.fire(muzzle, dirN, this.weapon.spec, 'german', this);
    ctx.onShot(muzzle, this.weaponId);
    this.recoil = 1;
  }

  private flatDistance(p: Point): number {
    return Math.hypot(p.x - this.body.position.x, p.z - this.body.position.z);
  }
}

export { HEARING_RADIUS };
