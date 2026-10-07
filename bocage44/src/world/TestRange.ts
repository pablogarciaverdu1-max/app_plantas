import * as THREE from 'three';
import { createStoneMaterial, createWoodMaterial } from '../render/Materials';

/**
 * Phase 1 movement course on flat ground near the origin: walls of 0.5 to 1.5 m,
 * ramps of 10, 25 and 40 degrees, a 1.3 m tunnel (crouch) and a 0.7 m crawl space (prone).
 * All sizes are real-world metres. Everything here is solid.
 */
/** The terrain is flattened to this height under the course (see Terrain.FLAT_AREAS). */
const BASE = 0;

export function buildTestRange(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'test-range';
  const stone = createStoneMaterial();
  const wood = createWoodMaterial();

  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, rotY = 0): THREE.Mesh => {
    const g = new THREE.BoxGeometry(w, h, d);
    // Box UVs are 0..1 per face; scale them so textures keep a constant size in metres.
    scaleBoxUVs(g, w, h, d);
    g.setAttribute('uv1', g.attributes.uv);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Row of walls at increasing heights.
  [0.5, 0.9, 1.2, 1.5].forEach((h, i) => box(2.4, h, 0.45, -9 + i * 3.2, BASE, -6, stone));

  // A thick 1.0 m wall to climb onto rather than vault over.
  box(2.4, 1.0, 2.0, 5, BASE, -6, stone);

  // Ramps.
  [10, 25, 40].forEach((deg, i) => {
    const len = 6;
    const rad = (deg * Math.PI) / 180;
    const g = new THREE.BoxGeometry(2.5, 0.2, len);
    scaleBoxUVs(g, 2.5, 0.2, len);
    g.setAttribute('uv1', g.attributes.uv);
    const m = new THREE.Mesh(g, wood);
    m.rotation.x = rad;
    const rise = Math.sin(rad) * len;
    m.position.set(-9 + i * 4, BASE + rise / 2, -16);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  });

  // Tunnel with a 1.3 m ceiling: too low to stand, fine crouched.
  const tz = -28;
  box(0.4, 1.3, 6, 2.6, BASE, tz, stone);
  box(0.4, 1.3, 6, 4.4, BASE, tz, stone);
  box(2.2, 0.3, 6, 3.5, BASE + 1.3, tz, stone);

  // Crawl space with a 0.7 m ceiling: prone only.
  box(0.4, 0.7, 6, 7.6, BASE, tz, stone);
  box(0.4, 0.7, 6, 9.4, BASE, tz, stone);
  box(2.2, 0.25, 6, 8.5, BASE + 0.7, tz, wood);

  // Low wooden fence, the kind of obstacle that is stepped over in one motion.
  box(4, 0.08, 0.06, -6, BASE + 0.75, -36, wood);
  box(4, 0.08, 0.06, -6, BASE + 0.35, -36, wood);
  for (const x of [-7.9, -6, -4.1]) box(0.1, 0.9, BASE, x, BASE, -36, wood);

  return group;
}

function scaleBoxUVs(g: THREE.BoxGeometry, w: number, h: number, d: number): void {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z; 4 vertices each.
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] * 0.5, uv.getY(i) * dims[f][1] * 0.5);
    }
  }
}
