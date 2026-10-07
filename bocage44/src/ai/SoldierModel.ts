import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Stand-in German infantryman at true scale (1.75 m): field-grey M43 tunic and
 * trousers, M40 helmet without insignia, black leather Y-straps and belt, ankle
 * boots with gaiters, rifle. Simple shapes until the art phase replaces it.
 */
export interface SoldierPose {
  /** Footstep phase, grows with distance walked. */
  walkPhase: number;
  /** 0..1 how much the legs swing (speed). */
  stride: number;
  /** Current body height (1.75 standing, 1.1 crouched, 0.4 prone). */
  height: number;
  /** Rifle raised to the shoulder. */
  aiming: boolean;
  /** Pitch of the aim in radians. */
  aimPitch: number;
  /** 0..1 death fall progress; sign of fallSide picks the direction. */
  fall: number;
  fallSide: number;
  recoil: number;
}

const FELDGRAU = 0x4d5d53;
const HELMET = 0x4a5148;
const LEATHER = 0x1e1c1a;
const SKIN = 0x9c7a64;
const WOOD = 0x5a4632;
const STEEL = 0x2b2d2f;

let shared: Record<string, THREE.MeshStandardMaterial> | null = null;
function materials(): Record<string, THREE.MeshStandardMaterial> {
  shared ??= {
    cloth: new THREE.MeshStandardMaterial({ color: FELDGRAU, roughness: 0.95 }),
    helmet: new THREE.MeshStandardMaterial({ color: HELMET, roughness: 0.7, metalness: 0.2 }),
    leather: new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.6 }),
    skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.45, metalness: 0.8 }),
  };
  return shared;
}

function capsule(radius: number, length: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
  m.castShadow = true;
  return m;
}

export class SoldierModel {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group(); // pivots at the hips
  private readonly torso = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly rifle = new THREE.Group();
  readonly muzzle = new THREE.Object3D();

  constructor(smg = false) {
    const m = materials();
    this.root.add(this.body);
    this.body.position.y = 0.95;

    // Legs: thigh+shin as one capsule, boot at the bottom.
    for (const [leg, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      leg.position.set(0.1 * side, 0, 0);
      const limb = capsule(0.075, 0.72, m.cloth);
      limb.position.y = -0.45;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.27), m.leather);
      boot.position.set(0, -0.89, -0.04);
      boot.castShadow = true;
      leg.add(limb, boot);
      this.body.add(leg);
    }

    // Torso: tunic, belt, Y-straps, cartridge pouches.
    this.body.add(this.torso);
    const tunic = capsule(0.17, 0.32, m.cloth);
    tunic.scale.set(1, 1, 0.72);
    tunic.position.y = 0.28;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 16), m.leather);
    belt.scale.z = 0.75;
    belt.position.y = 0.07;
    const strapGeo = new THREE.BoxGeometry(0.035, 0.5, 0.01);
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(strapGeo, m.leather);
      strap.position.set(0.07 * s, 0.32, -0.125);
      strap.rotation.z = 0.12 * s;
      const back = strap.clone();
      back.position.z = 0.125;
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), m.leather);
      pouch.position.set(0.08 * s, 0.1, -0.14);
      this.torso.add(strap, back, pouch);
    }
    const neck = capsule(0.05, 0.05, m.skin);
    neck.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), m.skin);
    head.scale.set(0.95, 1.1, 1.05);
    head.position.y = 0.72;
    head.castShadow = true;
    this.torso.add(tunic, belt, neck, head, this.makeHelmet(m.helmet));
    mergeByMaterial(this.torso);

    // Arms pivot at the shoulders.
    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(0.22 * side, 0.5, 0);
      const upper = capsule(0.05, 0.5, m.cloth);
      upper.position.y = -0.27;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), m.skin);
      hand.position.y = -0.58;
      arm.add(upper, hand);
      this.torso.add(arm);
    }

    this.makeRifle(smg, m);
    this.torso.add(this.rifle);
  }

  private makeHelmet(mat: THREE.Material): THREE.Mesh {
    // M40 profile: rounded dome flaring into a short skirt over the ears and neck.
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.sin(a) * 0.13, Math.cos(a) * 0.12));
    }
    pts.push(new THREE.Vector2(0.14, -0.035), new THREE.Vector2(0.155, -0.06));
    const helmet = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat);
    helmet.scale.set(1, 1, 1.12);
    helmet.position.y = 0.78;
    helmet.castShadow = true;
    return helmet;
  }

  private makeRifle(smg: boolean, m: Record<string, THREE.MeshStandardMaterial>): void {
    if (smg) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.55), m.steel);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.035), m.steel);
      mag.position.set(0, -0.12, -0.08);
      this.rifle.add(body, mag);
      this.muzzle.position.set(0, 0.01, -0.3);
    } else {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 1.0), m.wood);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.35, 8), m.steel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.025, -0.62);
      this.rifle.add(stock, barrel);
      this.muzzle.position.set(0, 0.025, -0.8);
    }
    for (const c of this.rifle.children) c.castShadow = true;
    this.rifle.add(this.muzzle);
  }

  setPose(p: SoldierPose): void {
    const crouch = THREE.MathUtils.clamp((1.75 - p.height) / 0.65, 0, 1); // 0 stand, 1 crouch
    const prone = THREE.MathUtils.clamp((1.1 - p.height) / 0.7, 0, 1);

    // Hips drop as the soldier crouches; prone lays the whole body forward.
    this.body.position.y = 0.95 - crouch * 0.45 - prone * 0.32;
    this.body.rotation.x = -prone * (Math.PI / 2 - 0.1);

    const swing = Math.sin(p.walkPhase * Math.PI) * 0.55 * p.stride;
    this.legL.rotation.x = swing + crouch * 1.2 * (1 - prone);
    this.legR.rotation.x = -swing + crouch * 0.3 * (1 - prone);
    this.torso.rotation.x = -crouch * 0.35 * (1 - prone) + (p.aiming ? 0 : 0.05);

    // Arms: rifle at the shoulder when aiming, held across the chest otherwise.
    const aimUp = p.aiming ? p.aimPitch : 0;
    this.armR.rotation.set(p.aiming ? -1.25 - aimUp : -0.5 - swing * 0.3, 0, -0.15);
    this.armL.rotation.set(p.aiming ? -1.45 - aimUp : -0.9 + swing * 0.3, 0, 0.35);
    if (p.aiming) {
      this.rifle.position.set(0.12, 0.47, -0.25 + p.recoil * 0.05);
      this.rifle.rotation.set(aimUp + p.recoil * 0.15, 0, 0);
    } else {
      this.rifle.position.set(0.05, 0.3, -0.22);
      this.rifle.rotation.set(-0.9, 0.5, 0.6);
    }

    // Death: topple sideways/backwards over the feet.
    if (p.fall > 0) {
      const e = 1 - Math.pow(1 - p.fall, 3);
      this.root.rotation.z = e * (Math.PI / 2 - 0.05) * p.fallSide;
      this.root.position.y = -e * 0.05;
    } else {
      this.root.rotation.z = 0;
    }
  }
}

/** Bakes the static meshes of a group into one mesh per material to save draw calls. */
function mergeByMaterial(group: THREE.Group): void {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const meshes = group.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh);
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(mesh.matrix);
    const mat = mesh.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(g);
    group.remove(mesh);
  }
  for (const [mat, geos] of byMat) {
    const merged = new THREE.Mesh(mergeGeometries(geos), mat);
    merged.castShadow = true;
    group.add(merged);
  }
}
