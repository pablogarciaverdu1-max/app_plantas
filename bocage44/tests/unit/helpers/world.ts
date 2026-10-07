import * as THREE from 'three';
import { CollisionWorld } from '../../../src/world/Collision';

/** Builds a collision world from simple boxes: [w, h, d, x, yBottom, z]. Ground is included. */
export function boxWorld(boxes: [number, number, number, number, number, number][]): CollisionWorld {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200));
  ground.position.set(0, -0.5, 0);
  root.add(ground);
  for (const [w, h, d, x, y, z] of boxes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y + h / 2, z);
    root.add(m);
  }
  return CollisionWorld.fromObject(root);
}
