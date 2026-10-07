import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Vertical capsule: a segment from `start` (bottom sphere centre) to `end` (top sphere centre). */
export interface Capsule {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

export interface CapsuleContact {
  /** Total push applied to resolve penetration. */
  push: THREE.Vector3;
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
export class CollisionWorld {
  readonly bvh: MeshBVH;

  constructor(geometry: THREE.BufferGeometry) {
    this.bvh = new MeshBVH(geometry);
  }

  /** Builds the collider from all meshes in `root` except those with `userData.noCollision`. */
  static fromObject(root: THREE.Object3D): CollisionWorld {
    root.updateMatrixWorld(true);
    const parts: THREE.BufferGeometry[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noCollision) return;
      const src = mesh.geometry;
      const base = new THREE.BufferGeometry();
      base.setAttribute('position', src.attributes.position.clone());
      if (src.index) base.setIndex(src.index.clone());
      const flat = base.index ? base.toNonIndexed() : base;
      const inst = mesh as THREE.InstancedMesh;
      if (inst.isInstancedMesh) {
        for (let i = 0; i < inst.count; i++) {
          inst.getMatrixAt(i, tmpMat);
          parts.push(flat.clone().applyMatrix4(tmpMat.premultiply(mesh.matrixWorld)));
        }
      } else {
        parts.push(flat.applyMatrix4(mesh.matrixWorld));
      }
    });
    return new CollisionWorld(mergeGeometries(parts, false));
  }

  /**
   * Pushes the capsule out of any geometry it overlaps (modifies capsule in place).
   * Runs a few iterations so corners resolve cleanly.
   */
  resolveCapsule(capsule: Capsule, iterations = 3): CapsuleContact {
    const contact: CapsuleContact = { push: new THREE.Vector3(), groundNormalY: -1 };
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
            tmpSeg.start.addScaledVector(tmpDir, depth);
            tmpSeg.end.addScaledVector(tmpDir, depth);
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

  /** Distance to the first surface along a ray, or Infinity. */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, far: number): { distance: number; point: THREE.Vector3; normal: THREE.Vector3 } | null {
    tmpRay.origin.copy(origin);
    tmpRay.direction.copy(direction).normalize();
    const hit = this.bvh.raycastFirst(tmpRay, THREE.DoubleSide, 0, far);
    if (!hit || !hit.face) return null;
    return { distance: hit.distance, point: hit.point.clone(), normal: hit.face.normal.clone() };
  }
}
