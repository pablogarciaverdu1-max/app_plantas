import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { createRenderer } from '../render/Renderer';
import { installHeightFog } from '../render/HeightFog';
import { Sky } from '../world/Sky';
import { buildTestScene } from '../world/LevelBuilder';
import { CollisionWorld } from '../world/Collision';
import { PlayerController } from '../player/PlayerController';
import { PlayerInput } from '../player/PlayerInput';
import { CameraRig } from '../player/CameraRig';
import { lightingAt, fogDensityForVisibility, type LightingState } from '../mission/TimeOfDay';

const DEG = Math.PI / 180;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly input: Input;
  private readonly loop: GameLoop;
  private readonly sky = new Sky();
  private readonly sun = new THREE.DirectionalLight();
  private readonly hemi = new THREE.HemisphereLight();
  private readonly fog = new THREE.FogExp2(0x000000, 0.05);
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly envScene = new THREE.Scene();
  private envTarget: THREE.WebGLRenderTarget | null = null;
  readonly player: PlayerController;
  readonly rig: CameraRig;
  private readonly playerInput: PlayerInput;
  private progress = 0;
  private lastFrame = performance.now();
  private fpsFrames = 0;
  private fpsTime = 0;
  fps = 0;
  lighting: LightingState = lightingAt(0);

  constructor(container: HTMLElement) {
    installHeightFog();
    this.renderer = createRenderer(container);
    this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.05, 1200);
    this.input = new Input(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.scene.fog = this.fog;
    this.scene.add(this.sky.mesh, this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -40;
    sc.right = sc.top = 40;
    sc.near = 1;
    sc.far = 300;

    // Shares the sky material, so it always matches the visible sky.
    this.envScene.add(this.sky.mesh.clone());

    const level = buildTestScene(this.scene);
    const collision = CollisionWorld.fromObject(level);
    this.player = new PlayerController(collision);
    this.player.teleport(new THREE.Vector3(0, 0.5, 4));
    this.rig = new CameraRig(this.camera);
    this.playerInput = new PlayerInput(this.input);
    this.setTimeOfDay(0);

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
    this.updateEnvironment();
  }

  /** Advances the simulation by a fixed time and draws one frame, regardless of pause. */
  stepFrames(seconds: number): void {
    this.loop.advance(seconds);
  }

  get timeOfDay(): number {
    return this.progress;
  }

  /** Image-based lighting generated from the procedural sky. */
  // The sky is soft and overcast, so a small 64 px environment is enough and
  // cheap to regenerate when the hour changes.
  private updateEnvironment(): void {
    this.envTarget?.dispose();
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 1000, { size: 64 });
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.6;
  }

  private step(dt: number): void {
    this.player.step(dt, this.playerInput.read(this.rig.yaw));
  }

  private render(alpha: number, frameTime: number): void {
    // Mouse look is applied every rendered frame, not every simulation step,
    // so turning stays smooth on 120/144 Hz screens.
    const [dx, dy] = this.input.consumeMouse();
    this.rig.look(dx, dy, this.player);
    this.rig.update(frameTime, alpha, this.player);
    this.sky.update(this.loop.time, this.camera.position);
    this.sun.target.position.copy(this.camera.position);
    // The shadow frustum follows the viewer.
    this.sun.position.copy(this.camera.position).addScaledVector(this.sunDir, 150);
    this.renderer.render(this.scene, this.camera);

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
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }
}
