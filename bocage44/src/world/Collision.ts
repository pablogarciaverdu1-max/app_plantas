import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Surface } from '../damage/SurfaceMaterial';

/** Vertical capsule: a segment from `start` (bottom sphere centre) to `end` (top sphere centre). */
export interface Capsule {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

export interface CapsuleContact {
  /** Total push applied to resolve penetration. */
  push: THREE.Vector3;
  /** Part of the push that came from walls and steep surfaces (not walkable ground). */
  wallPush: THREE.Vector3;
  /** Steepest-to-flattest: the most upward-facing contact normal (y component), or -1 when nothing was touched. */
  groundNormalY: number;
}

const tmpBox = new THREE.Box3();
const tmpTriPoint = new THREE.Vector3();
const tmpCapPoint = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpSeg = new THREE.Line3();
const tmpMat = new THREE.Matrix4();
const tmpRay = new THREE.Ray();

/**
 * Static level collision: every mesh flagged as solid is merged into one BVH.
 * Capsule resolution follows the three-mesh-bvh character controller approach.
 */
export interface RayHit {
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  surface: Surface;
}

export class CollisionWorld {
  readonly bvh: MeshBVH;

  /** `surfaces[t]` is the surface of original triangle t (non-indexed order). */
  constructor(geometry: THREE.BufferGeometry, private readonly surfaces: Uint8Array = new Uint8Array(0)) {
    this.bvh = new MeshBVH(geometry);
  }

  /**
   * Builds the collider from all meshes in `root` except those with `userData.noCollision`.
   * `userData.surface` (a Surface) tags what bullets meet; default is earth.
   */
  static fromObject(root: THREE.Object3D): CollisionWorld {
    root.updateMatrixWorld(true);
    const parts: THREE.BufferGeometry[] = [];
    const surfaceRuns: [number, number][] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noCollision) return;
      const src = mesh.geometry;
      const base = new THREE.BufferGeometry();
      base.setAttribute('position', src.attributes.position.clone());
      if (src.index) base.setIndex(src.index.clone());
      const flat = base.index ? base.toNonIndexed() : base;
      const surface = (mesh.userData.surface as Surface | undefined) ?? Surface.Earth;
      const tris = flat.attributes.position.count / 3;
      const inst = mesh as THREE.InstancedMesh;
      if (inst.isInstancedMesh) {
        for (let i = 0; i < inst.count; i++) {
          inst.getMatrixAt(i, tmpMat);
          parts.push(flat.clone().applyMatrix4(tmpMat.premultiply(mesh.matrixWorld)));
          surfaceRuns.push([tris, surface]);
        }
      } else {
        parts.push(flat.applyMatrix4(mesh.matrixWorld));
        surfaceRuns.push([tris, surface]);
      }
    });
    const total = surfaceRuns.reduce((n, [t]) => n + t, 0);
    const surfaces = new Uint8Array(total);
    let o = 0;
    for (const [t, s] of surfaceRuns) {
      surfaces.fill(s, o, o + t);
      o += t;
    }
    return new CollisionWorld(mergeGeometries(parts, false), surfaces);
  }

  /** Surface of a triangle as reported by a BVH raycast (`faceIndex`). */
  surfaceOf(faceIndex: number): Surface {
    const index = this.bvh.geometry.index;
    const vertex = index ? index.getX(faceIndex * 3) : faceIndex * 3;
    return (this.surfaces[Math.floor(vertex / 3)] ?? Surface.Earth) as Surface;
  }

  /**
   * Pushes the capsule out of any geometry it overlaps (modifies capsule in place).
   * Runs a few iterations so corners resolve cleanly.
   */
  resolveCapsule(capsule: Capsule, walkableNormalY = 0.8, iterations = 3): CapsuleContact {
    const contact: CapsuleContact = { push: new THREE.Vector3(), wallPush: new THREE.Vector3(), groundNormalY: -1 };
    const startCopy = capsule.start.clone();
    for (let it = 0; it < iterations; it++) {
      let moved = false;
      tmpSeg.start.copy(capsule.start);
      tmpSeg.end.copy(capsule.end);
      tmpBox.makeEmpty().expandByPoint(tmpSeg.start).expandByPoint(tmpSeg.end);
      tmpBox.min.addScalar(-capsule.radius);
      tmpBox.max.addScalar(capsule.radius);
      this.bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(tmpBox),
        intersectsTriangle: (tri) => {
          const distance = tri.closestPointToSegment(tmpSeg, tmpTriPoint, tmpCapPoint);
          if (distance < capsule.radius && distance > 1e-6) {
            const depth = capsule.radius - distance;
            tmpDir.copy(tmpCapPoint).sub(tmpTriPoint).normalize();
            if (tmpDir.y >= walkableNormalY) {
              // Walkable ground only lifts the capsule: no sideways drift on slopes,
              // no speed loss where the ground changes angle.
              const lift = Math.min(depth / tmpDir.y, capsule.radius);
              tmpSeg.start.y += lift;
              tmpSeg.end.y += lift;
            } else {
              tmpSeg.start.addScaledVector(tmpDir, depth);
              tmpSeg.end.addScaledVector(tmpDir, depth);
              contact.wallPush.addScaledVector(tmpDir, depth);
            }
            if (tmpDir.y > contact.groundNormalY) contact.groundNormalY = tmpDir.y;
            moved = true;
          }
          return false;
        },
      });
      capsule.start.copy(tmpSeg.start);
      capsule.end.copy(tmpSeg.end);
      if (!moved) break;
    }
    contact.push.copy(capsule.start).sub(startCopy);
    return contact;
  }

  /** True if a capsule at this position overlaps nothing. */
  capsuleFits(capsule: Capsule): boolean {
    tmpSeg.start.copy(capsule.start);
    tmpSeg.end.copy(capsule.end);
    tmpBox.makeEmpty().expandByPoint(tmpSeg.start).expandByPoint(tmpSeg.end);
    tmpBox.min.addScalar(-capsule.radius);
    tmpBox.max.addScalar(capsule.radius);
    let hit = false;
    this.bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(tmpBox),
      intersectsTriangle: (tri) => {
        hit = tri.closestPointToSegment(tmpSeg, tmpTriPoint, tmpCapPoint) < capsule.radius - 1e-3;
        return hit;
      },
    });
    return !hit;
  }

  /** First surface along a ray within `far` metres, or null. Faces are hit from both sides. */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, far: number): RayHit | null {
    tmpRay.origin.copy(origin);
    tmpRay.direction.copy(direction).normalize();
    const hit = this.bvh.raycastFirst(tmpRay, THREE.DoubleSide, 0, far);
    if (!hit || !hit.face) return null;
    return { distance: hit.distance, point: hit.point.clone(), normal: hit.face.normal.clone(), surface: this.surfaceOf(hit.faceIndex ?? 0) };
  }

  /** True if nothing solid lies between two points. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    tmpDir.copy(to).sub(from);
    const d = tmpDir.length();
    return d < 1e-3 || this.raycast(from, tmpDir, d - 0.05) === null;
  }
}
