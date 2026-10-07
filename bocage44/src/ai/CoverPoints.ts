import * as THREE from 'three';
import type { CollisionWorld } from '../world/Collision';

/** A spot next to an obstacle where a soldier can crouch. */
export interface CoverPoint {
  position: THREE.Vector3;
  /** Height of the obstacle it hides behind. */
  height: number;
  takenBy: string | null;
}

/**
 * Generates cover points around every object flagged `userData.cover` (walls, crates,
 * carts…), 0.7 m out from each face and every 1.2 m along it. Validation against a
 * threat happens at query time with raycasts.
 */
export class CoverPoints {
  readonly points: CoverPoint[] = [];

  constructor(root: THREE.Object3D, private readonly world: CollisionWorld) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    root.traverse((o) => {
      if (!o.userData.cover) return;
      box.setFromObject(o);
      const h = box.max.y - box.min.y;
      if (h < 0.8) return;
      const sx = box.max.x - box.min.x;
      const sz = box.max.z - box.min.z;
      const add = (x: number, z: number): void => {
        const p = new THREE.Vector3(x, box.min.y + 0.05, z);
        // Drop to the ground so points on uneven terrain are usable.
        const ground = this.world.raycast(p.clone().setY(p.y + 1.5), new THREE.Vector3(0, -1, 0), 4);
        if (ground) p.y = ground.point.y;
        this.points.push({ position: p, height: h, takenBy: null });
      };
      for (let t = 0.6; t < sx - 0.3; t += 1.2) {
        add(box.min.x + t, box.min.z - 0.7);
        add(box.min.x + t, box.max.z + 0.7);
      }
      for (let t = 0.6; t < sz - 0.3; t += 1.2) {
        add(box.min.x - 0.7, box.min.z + t);
        add(box.max.x + 0.7, box.min.z + t);
      }
    });
  }

  /** True if the point hides a crouched man from `threatEye`. */
  hides(p: THREE.Vector3, threatEye: THREE.Vector3): boolean {
    return !this.world.lineOfSight(p.clone().setY(p.y + 0.95), threatEye);
  }

  /** True if standing up at the point gives a view of `threatEye`. */
  canPeek(p: THREE.Vector3, threatEye: THREE.Vector3): boolean {
    return this.world.lineOfSight(p.clone().setY(p.y + 1.5), threatEye);
  }

  /**
   * Best free cover near `from` that hides from the threat. `score` lets callers
   * prefer points closer to the enemy (engage), farther (retreat) or to one side (flank).
   */
  find(from: THREE.Vector3, threatEye: THREE.Vector3, maxDistance: number, owner: string, score: (p: THREE.Vector3) => number = () => 0): CoverPoint | null {
    let best: CoverPoint | null = null;
    let bestScore = Infinity;
    for (const c of this.points) {
      if (c.takenBy && c.takenBy !== owner) continue;
      const d = c.position.distanceTo(from);
      if (d > maxDistance) continue;
      const s = d + score(c.position);
      if (s >= bestScore) continue;
      if (!this.hides(c.position, threatEye)) continue;
      best = c;
      bestScore = s;
    }
    return best;
  }

  release(owner: string): void {
    for (const c of this.points) if (c.takenBy === owner) c.takenBy = null;
  }
}
