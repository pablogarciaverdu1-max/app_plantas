import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { createRenderer } from '../render/Renderer';
import { installHeightFog } from '../render/HeightFog';
import { Particles } from '../render/Particles';
import { Sky } from '../world/Sky';
import { buildTestScene } from '../world/LevelBuilder';
import { CollisionWorld } from '../world/Collision';
import { PlayerController } from '../player/PlayerController';
import { PlayerInput } from '../player/PlayerInput';
import { CameraRig } from '../player/CameraRig';
import { ViewModel } from '../player/ViewModel';
import { PlayerCombat } from '../player/PlayerCombat';
import { ProjectilePool } from '../weapons/ProjectilePool';
import { EnemyDirector } from '../ai/EnemyDirector';
import { CoverPoints } from '../ai/CoverPoints';
import { HEARING_RADIUS } from '../ai/Perception';
import type { WorldContext } from '../ai/Soldier';
import { AudioDirector } from '../audio/AudioDirector';
import { Hud } from '../ui/Hud';
import type { TextKey } from '../ui/Localization';
import { Surface } from '../damage/SurfaceMaterial';
import { lightingAt, fogDensityForVisibility, type LightingState } from '../mission/TimeOfDay';

const DEG = Math.PI / 180;
/** Start in the grey before dawn so the enemy can be seen at a distance. */
const START_PROGRESS = 0.55;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly input: Input;
  readonly player: PlayerController;
  readonly rig: CameraRig;
  readonly combat: PlayerCombat;
  readonly enemies: EnemyDirector;
  readonly pool: ProjectilePool;
  readonly audio = new AudioDirector();
  readonly hud: Hud;
  /** Test hook: the player cannot be hurt. */
  invulnerable = false;
  private readonly playerInput: PlayerInput;
  private readonly view: ViewModel;
  private readonly particles = new Particles();
  private readonly collision: CollisionWorld;
  private readonly cover: CoverPoints;
  private readonly loop: GameLoop;
  private readonly sky = new Sky();
  private readonly sun = new THREE.DirectionalLight();
  private readonly hemi = new THREE.HemisphereLight();
  private readonly fog = new THREE.FogExp2(0x000000, 0.05);
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly envScene = new THREE.Scene();
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly wind = new THREE.Vector3(0.6, 0, 0.25);
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private progress = START_PROGRESS;
  private lastFrame = performance.now();
  private fpsFrames = 0;
  private fpsTime = 0;
  private footstepTimer = 0;
  private simTime = 0;
  private readonly ctx: WorldContext;
  fps = 0;
  lighting: LightingState = lightingAt(START_PROGRESS);

  constructor(container: HTMLElement) {
    installHeightFog();
    this.renderer = createRenderer(container);
    this.renderer.autoClear = false;
    this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.05, 1200);
    this.input = new Input(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.scene.fog = this.fog;
    this.scene.add(this.sky.mesh, this.hemi, this.sun, this.sun.target, this.particles.points);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -45;
    sc.right = sc.top = 45;
    sc.near = 1;
    sc.far = 300;
    // Shares the sky material, so it always matches the visible sky.
    this.envScene.add(this.sky.mesh.clone());

    const level = buildTestScene(this.scene);
    this.collision = CollisionWorld.fromObject(level);
    this.cover = new CoverPoints(level, this.collision);
    this.pool = new ProjectilePool(this.collision);

    this.player = new PlayerController(this.collision);
    this.player.teleport(new THREE.Vector3(0, 0.5, 4));
    this.rig = new CameraRig(this.camera);
    this.playerInput = new PlayerInput(this.input);
    this.view = new ViewModel(this.camera.aspect);
    this.hud = new Hud(() => location.reload());

    this.combat = new PlayerCombat(this.player, this.rig, this.view, this.pool, {
      onShot: (origin, id) => {
        this.audio.gunshot(origin, id, true);
        this.enemies.emitNoise(origin, id === 'm1911a1' ? HEARING_RADIUS.pistolShot : HEARING_RADIUS.rifleShot, true, this.simTime);
      },
      onWeaponEvent: (e) => {
        if (e === 'clipEjected') this.audio.clipPing();
        if (e === 'dryFire') this.audio.mechanical('dry');
        if (e === 'reloadStart') this.audio.mechanical('reload');
      },
      onHurt: (dmg) => {
        if (this.invulnerable) {
          this.combat.health.value = 100;
          this.combat.health.bleedRate = 0;
        }
        this.audio.hurt();
        this.hud.hurt(dmg);
      },
      onNearMiss: (_d, supersonic, point) => (supersonic ? this.audio.crack(point) : this.audio.whizz(point)),
      onMessage: (key) => this.hud.message(key as TextKey),
    });
    this.pool.targets.push(this.combat);

    this.enemies = new EnemyDirector(this.collision);
    this.enemies.onSpawn = (s) => {
      this.scene.add(s.model.root);
      this.pool.targets.push(s);
    };
    this.enemies.onWave = () => this.hud.message('waveIncoming', 3);
    this.enemies.populate();

    this.pool.onImpact = (e) => {
      this.particles.impact(e.point, e.normal, e.surface);
      this.audio.impact(e.point, e.surface === Surface.Stone || e.surface === Surface.Metal);
    };

    this.ctx = {
      world: this.collision,
      cover: this.cover,
      pool: this.pool,
      player: { position: this.player.position, eye: new THREE.Vector3(), speed: 0, stance: 'stand', firedRecently: false, alive: true },
      light: 0,
      fogVisibility: 100,
      noises: this.enemies.noises,
      time: 0,
      onShot: (origin, id) => this.audio.gunshot(origin, id),
      onShout: (soldier) => {
        this.audio.shout(soldier.eye);
        this.enemies.emitNoise(soldier.eye, HEARING_RADIUS.shout, true, this.simTime);
        // Neighbouring squads hear where the enemy is.
        for (const sq of this.enemies.squads) {
          if (sq === soldier.squad) continue;
          if (sq.members.some((m) => m.alive && Math.hypot(m.position.x - soldier.position.x, m.position.z - soldier.position.z) < HEARING_RADIUS.shout)) {
            sq.report(this.player.position);
          }
        }
      },
    };

    this.setTimeOfDay(START_PROGRESS);

    this.loop = new GameLoop({
      step: (dt) => this.step(dt),
      render: (alpha, frameTime) => this.render(alpha, frameTime),
    });

    window.addEventListener('resize', () => this.onResize(container));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT') this.setTimeOfDay(this.progress + 0.1);
      if (e.code === 'KeyY') this.setTimeOfDay(this.progress - 0.1);
    });
  }

  /** When true the loop stops scheduling frames (used by tests to take still captures). */
  paused = false;

  start(): void {
    const frame = (now: number): void => {
      const dt = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      if (!this.paused) this.loop.advance(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Advances the simulation by a fixed time and draws one frame, regardless of pause. */
  stepFrames(seconds: number): void {
    this.loop.advance(seconds);
  }

  get timeOfDay(): number {
    return this.progress;
  }

  /** Mission progress 0..1 drives the hour, light, sky and fog. */
  setTimeOfDay(progress: number): void {
    this.progress = Math.min(1, Math.max(0, progress));
    const s = lightingAt(this.progress);
    this.lighting = s;

    const el = s.lightElevation * DEG;
    const az = s.lightAzimuth * DEG;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.sunDir.copy(dir);
    this.sun.color.setRGB(...s.lightColor);
    this.sun.intensity = s.lightIntensity;
    this.hemi.color.setRGB(...s.skyTop).multiplyScalar(6);
    this.hemi.groundColor.setRGB(0.29, 0.23, 0.16).multiplyScalar(s.ambientIntensity);
    this.hemi.intensity = s.ambientIntensity;
    this.fog.color.setRGB(...s.fogColor);
    this.fog.density = fogDensityForVisibility(s.visibility);
    this.renderer.toneMappingExposure = s.exposure;
    this.sky.apply(s, dir);
    this.view.setLighting(this.hemi.color, this.hemi.groundColor, s.ambientIntensity, this.sun.color, s.lightIntensity, dir);
    this.ctx.light = THREE.MathUtils.clamp((s.lightIntensity - 0.25) / 1.35, 0, 1);
    this.ctx.fogVisibility = s.visibility;
    this.updateEnvironment();
  }

  // The sky is soft and overcast, so a small 64 px environment is enough and
  // cheap to regenerate when the hour changes.
  private updateEnvironment(): void {
    this.envTarget?.dispose();
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 1000, { size: 64 });
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.6;
    this.view.scene.environment = this.envTarget.texture;
    this.view.scene.environmentIntensity = 0.8;
  }

  private step(dt: number): void {
    this.simTime += dt;
    const alive = this.combat.alive;
    const intent = this.playerInput.read(this.rig.yaw);
    if (this.combat.ads > 0.5) intent.walk = true;
    if (!alive) {
      intent.forward = intent.right = 0;
      intent.jumpPressed = false;
      if (this.player.stance !== 'prone') intent.pronePressed = true;
    }
    this.player.step(dt, intent);
    this.combat.step(dt, this.input);
    this.emitFootsteps(dt);

    const p = this.ctx.player;
    p.eye.copy(this.player.position).setY(this.player.position.y + this.player.eyeHeight);
    p.speed = this.player.horizontalSpeed;
    p.stance = this.player.stance;
    p.firedRecently = this.combat.firedRecently > 0;
    p.alive = alive;
    this.ctx.time = this.simTime;
    this.enemies.update(dt, this.ctx);
    this.pool.step(dt);
  }

  /** Footsteps carry further the faster you move. */
  private emitFootsteps(dt: number): void {
    const speed = this.player.horizontalSpeed;
    if (!this.player.onGround || speed < 0.3) return;
    this.footstepTimer -= dt;
    if (this.footstepTimer > 0) return;
    this.footstepTimer = 0.5;
    const r = this.player.stance === 'prone' ? HEARING_RADIUS.prone
      : this.player.stance === 'crouch' ? HEARING_RADIUS.crouch
      : this.player.sprinting ? HEARING_RADIUS.sprint
      : speed > 2.5 ? HEARING_RADIUS.trot : HEARING_RADIUS.walk;
    if (r > 0) this.enemies.emitNoise(this.player.position, r, false, this.simTime);
  }

  private render(alpha: number, frameTime: number): void {
    // Mouse look is applied every rendered frame, not every simulation step,
    // so turning stays smooth on 120/144 Hz screens.
    const [dx, dy] = this.input.consumeMouse();
    this.rig.sensitivity = 0.0022 * (1 - this.combat.ads * 0.45);
    if (this.combat.alive) this.rig.look(dx, dy, this.player);
    this.rig.update(frameTime, alpha, this.player);
    this.camera.fov = this.combat.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    // Weapon bob follows the head bob, scaled down.
    const t = performance.now() / 1000;
    const moving = Math.min(1, this.player.horizontalSpeed / 3.5);
    const bob = new THREE.Vector2(Math.sin(t * 5.2) * 0.006 * moving, Math.abs(Math.cos(t * 5.2)) * 0.005 * moving);
    this.view.camera.fov = this.camera.fov;
    this.view.camera.updateProjectionMatrix();
    this.combat.render(frameTime, bob);

    for (const s of this.enemies.soldiers) s.sync();
    this.particles.update(frameTime, this.wind);
    this.audio.setListener(this.camera);
    const h = this.combat.health;
    this.hud.update(frameTime, h.woundLevel, this.combat.suppression, h.bleedRate > 0, !this.combat.alive);

    this.sky.update(this.loop.time, this.camera.position);
    this.sun.target.position.copy(this.camera.position);
    // The shadow frustum follows the viewer.
    this.sun.position.copy(this.camera.position).addScaledVector(this.sunDir, 150);

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (this.combat.alive) {
      this.renderer.clearDepth();
      this.renderer.render(this.view.scene, this.view.camera);
    }

    this.fpsFrames++;
    this.fpsTime += frameTime;
    if (this.fpsTime >= 1) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.view.setAspect(this.camera.aspect);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }
}
