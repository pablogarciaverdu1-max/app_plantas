import * as THREE from 'three';

/** Height of the sight line above the bore, metres (used for zeroing too). */
export const SIGHT_HEIGHT = 0.05;

/**
 * First-person weapon drawn in its own scene on top of the world. The sights sit on
 * the camera's view axis when aiming, so the iron sights are the only way to aim.
 * Simple shapes until the art phase brings real models.
 */
export type ViewWeapon = 'garand' | 'pistol';

interface Pose {
  hipPos: THREE.Vector3;
  hipRot: THREE.Euler;
  adsPos: THREE.Vector3;
  /** Muzzle position in the weapon's local space. */
  muzzle: THREE.Vector3;
}

const POSES: Record<ViewWeapon, Pose> = {
  garand: { hipPos: new THREE.Vector3(0.15, -0.19, -0.1), hipRot: new THREE.Euler(0.04, 0.025, 0.02), adsPos: new THREE.Vector3(0, 0, 0), muzzle: new THREE.Vector3(0, -SIGHT_HEIGHT, -0.95) },
  pistol: { hipPos: new THREE.Vector3(0.14, -0.13, -0.05), hipRot: new THREE.Euler(0.03, 0.08, 0.02), adsPos: new THREE.Vector3(0, 0, 0), muzzle: new THREE.Vector3(0, -0.025, -0.38) },
};

function mat(color: number, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export class ViewModel {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly holder = new THREE.Group(); // sway / recoil / ADS transforms
  private readonly guns: Record<ViewWeapon, THREE.Group>;
  private readonly flash: THREE.Mesh;
  private readonly flashLight = new THREE.PointLight(0xffb347, 0, 6, 2);
  private readonly hemi = new THREE.HemisphereLight();
  private readonly key = new THREE.DirectionalLight();
  current: ViewWeapon = 'garand';
  private flashTime = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.01, 10);
    this.scene.add(this.camera, this.hemi, this.key);
    this.camera.add(this.holder);
    this.guns = { garand: this.buildGarand(), pistol: this.buildPistol() };
    this.holder.add(this.guns.garand, this.guns.pistol);
    this.guns.pistol.visible = false;

    const flashTex = makeFlashTexture();
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.flash.visible = false;
    this.holder.add(this.flash, this.flashLight);
  }

  /** Matches the light on the weapon to the world's sky and sun. */
  setLighting(sky: THREE.Color, ground: THREE.Color, ambient: number, sunColor: THREE.Color, sunIntensity: number, sunDir: THREE.Vector3): void {
    this.hemi.color.copy(sky);
    this.hemi.groundColor.copy(ground);
    this.hemi.intensity = ambient;
    this.key.color.copy(sunColor);
    this.key.intensity = sunIntensity * 0.8;
    this.key.position.copy(sunDir);
  }

  select(w: ViewWeapon): void {
    this.current = w;
    this.guns.garand.visible = w === 'garand';
    this.guns.pistol.visible = w === 'pistol';
  }

  /**
   * Places the weapon. `ads` 0..1 blends hip to sights; `sway` and `kick` are aim
   * offsets in radians (yaw, pitch) that also deflect the bullet; `lower` 0..1 drops
   * the weapon out of view (switching, reloading, bandaging).
   */
  update(dt: number, ads: number, swayYaw: number, swayPitch: number, kickBack: number, lower: number, reloadTilt: number, bob: THREE.Vector2): void {
    const pose = POSES[this.current];
    const e = ads * ads * (3 - 2 * ads);
    this.holder.position.lerpVectors(pose.hipPos, pose.adsPos, e);
    this.holder.position.z += kickBack;
    this.holder.position.y -= lower * 0.35;
    this.holder.position.x += bob.x * (1 - e * 0.85);
    this.holder.position.y += bob.y * (1 - e * 0.85);
    this.holder.rotation.set(
      pose.hipRot.x * (1 - e) + swayPitch - lower * 0.6 + reloadTilt * 0.35,
      pose.hipRot.y * (1 - e) + swayYaw,
      pose.hipRot.z * (1 - e) + reloadTilt * 0.6,
    );

    this.flashTime -= dt;
    const showFlash = this.flashTime > 0;
    this.flash.visible = showFlash;
    this.flashLight.intensity = showFlash ? 2.5 : 0;
  }

  /** Muzzle position and bore direction in world space, given the world camera. */
  muzzleWorld(worldCamera: THREE.Camera): { origin: THREE.Vector3; forward: THREE.Vector3 } {
    this.holder.updateMatrix();
    const local = POSES[this.current].muzzle.clone().applyMatrix4(this.holder.matrix);
    const origin = local.applyMatrix4(worldCamera.matrixWorld);
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.holder.rotation).transformDirection(worldCamera.matrixWorld);
    return { origin, forward };
  }

  muzzleFlash(): void {
    const m = POSES[this.current].muzzle;
    this.flash.position.set(m.x, m.y, m.z - 0.06);
    this.flash.rotation.z = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.6;
    this.flash.scale.set(s, s * (0.8 + Math.random() * 0.4), 1);
    this.flashLight.position.copy(this.flash.position);
    this.flashTime = 1 / 30;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private buildGarand(): THREE.Group {
    const g = new THREE.Group();
    const wood = mat(0x6b4a2f, 0.6);
    const steel = mat(0x3c3f42, 0.4, 0.55);
    const bore = -SIGHT_HEIGHT;
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      g.add(mesh);
      return mesh;
    };
    // Stock, wrist and forend in walnut; receiver and barrel blued steel.
    add(new THREE.BoxGeometry(0.042, 0.055, 0.42), wood, 0, bore - 0.012, -0.5); // forend + handguard
    add(new THREE.BoxGeometry(0.044, 0.06, 0.2), wood, 0, bore - 0.03, -0.02, 0.1); // wrist
    add(new THREE.BoxGeometry(0.046, 0.11, 0.3), wood, 0, bore - 0.06, 0.2, 0.12); // butt
    add(new THREE.BoxGeometry(0.034, 0.04, 0.2), steel, 0, bore + 0.002, -0.2); // receiver
    add(new THREE.CylinderGeometry(0.009, 0.0095, 0.35, 12), steel, 0, bore + 0.006, -0.82, Math.PI / 2); // barrel
    add(new THREE.BoxGeometry(0.012, 0.03, 0.04), steel, 0, bore - 0.04, -0.13); // trigger guard
    add(new THREE.BoxGeometry(0.006, 0.012, 0.06), steel, 0.02, bore + 0.02, -0.22); // op rod handle

    // Rear aperture: a ring on the view axis close to the eye.
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.009, 24), steel);
    ring.position.set(0, 0, -0.13);
    g.add(ring);
    add(new THREE.BoxGeometry(0.012, SIGHT_HEIGHT - 0.012, 0.012), steel, 0, -SIGHT_HEIGHT / 2 - 0.008, -0.13); // aperture base
    // Front post between protective ears; top of the post sits exactly on the axis.
    add(new THREE.BoxGeometry(0.0022, 0.012, 0.004), steel, 0, -0.006, -0.84);
    add(new THREE.BoxGeometry(0.0022, 0.014, 0.004), steel, -0.0065, -0.008, -0.84);
    add(new THREE.BoxGeometry(0.0022, 0.014, 0.004), steel, 0.0065, -0.008, -0.84);
    add(new THREE.BoxGeometry(0.016, 0.04, 0.018), steel, 0, -0.03, -0.84); // sight base / gas cylinder
    for (const c of g.children) (c as THREE.Mesh).castShadow = false;
    return g;
  }

  private buildPistol(): THREE.Group {
    const g = new THREE.Group();
    const steel = mat(0x3c3f42, 0.4, 0.55);
    const grip = mat(0x4b3424, 0.7);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.028, 0.2), steel);
    slide.position.set(0, -0.022, -0.3);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.11, 0.05), grip);
    frame.position.set(0, -0.085, -0.2);
    frame.rotation.x = 0.25;
    // Rear notch (two posts) and front blade on the axis.
    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.008, 0.006), steel);
    rearL.position.set(-0.0055, -0.004, -0.21);
    const rearR = rearL.clone();
    rearR.position.x = 0.0055;
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.008, 0.008), steel);
    front.position.set(0, -0.004, -0.39);
    g.add(slide, frame, rearL, rearR, front);
    return g;
  }
}

function makeFlashTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,179,71,0.9)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  x.fillStyle = grad;
  // Irregular star so every flash differs when rotated and scaled.
  x.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = i % 2 ? 10 : 30;
    x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
