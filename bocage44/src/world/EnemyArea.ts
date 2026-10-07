import * as THREE from 'three';
import { createStoneMaterial, createWoodMaterial } from '../render/Materials';
import { Surface } from '../damage/SurfaceMaterial';
import { terrainHeight } from './Terrain';

/**
 * Ground north of the movement course where the enemy holds out: a field wall with
 * a gateway, a roofless stone cottage, stacks of ammunition crates, a farm cart and a
 * low wall further back. Real sizes; everything gives cover and stops or slows bullets.
 */
export function buildEnemyArea(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'enemy-area';
  const stone = createStoneMaterial();
  const wood = createWoodMaterial();

  /** Box standing on the terrain, sunk a little so slopes do not show gaps. */
  const block = (w: number, h: number, d: number, x: number, z: number, mat: THREE.Material, rotY = 0, sink = 0.3): THREE.Mesh => {
    const geo = new THREE.BoxGeometry(w, h + sink, d);
    scaleUVs(geo, w, h + sink, d);
    geo.setAttribute('uv1', geo.attributes.uv);
    const m = new THREE.Mesh(geo, mat);
    const y = Math.min(terrainHeight(x - w / 2, z), terrainHeight(x + w / 2, z), terrainHeight(x, z - d / 2), terrainHeight(x, z + d / 2));
    m.position.set(x, y - sink + (h + sink) / 2, z);
    m.rotation.y = rotY;
    m.castShadow = m.receiveShadow = true;
    m.userData.surface = mat === stone ? Surface.Stone : Surface.Wood;
    m.userData.cover = true;
    g.add(m);
    return m;
  };

  // Field wall at z = -70 with a 4 m gateway in the middle, built in 4 m runs.
  for (let x = -30; x < 30; x += 4) {
    if (x > -4 && x < 2) continue;
    block(4, 1.2, 0.5, x + 2, -70, stone);
  }

  // Roofless cottage (7 × 5 m, 2.6 m walls) with a doorway facing south and a window.
  const cx = -15;
  const cz = -110;
  block(7, 2.6, 0.5, cx, cz - 2.5, stone); // north wall
  block(2.5, 2.6, 0.5, cx - 2.25, cz + 2.5, stone); // south wall, left of door
  block(3.3, 2.6, 0.5, cx + 1.85, cz + 2.5, stone); // south wall, right of door
  block(0.5, 2.6, 5, cx - 3.5, cz, stone); // west
  block(0.5, 1.0, 5, cx + 3.5, cz, stone); // east, low (window sill)
  block(0.5, 0.6, 5, cx + 3.5, cz, stone).position.y += 2.0; // lintel over the window

  // Ammunition crates in stacks, wood that rifle bullets go through.
  for (const [x, z, n] of [[12, -95, 3], [20, -120, 2], [8, -125, 2]] as const) {
    for (let i = 0; i < n; i++) block(1.2, 0.5, 0.6, x + (i % 2) * 1.25, z, wood).position.y += Math.floor(i / 2) * 0.5;
    block(1.2, 0.5, 0.6, x + 0.6, z, wood).position.y += 0.5;
  }

  // Farm cart: bed on two wheels.
  const cart = block(1.6, 0.9, 3, 0, -132, wood, 0.4);
  cart.name = 'cart';

  // Low wall at the back of the position.
  for (let x = -20; x < 20; x += 4) block(4, 1.0, 0.45, x + 2, -145, stone);

  return g;
}

function scaleUVs(g: THREE.BoxGeometry, w: number, h: number, d: number): void {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] * 0.5, uv.getY(i) * dims[f][1] * 0.5);
    }
  }
}
