import * as THREE from 'three';
import { fbm } from './Noise';
import { createGroundMaterial } from '../render/Materials';

export const MAP_SIZE = 400;

/** Rectangles levelled to a fixed height, blending into the natural ground over `blend` metres. */
interface FlatArea {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  blend: number;
}

export const FLAT_AREAS: FlatArea[] = [
  // Phase 1 movement course.
  { minX: -14, maxX: 14, minZ: -42, maxZ: 8, height: 0, blend: 12 },
];

function naturalHeight(x: number, z: number): number {
  const broad = fbm(x / 140 + 10, z / 140 + 10, 3, 3) - 0.5;
  const detail = fbm(x / 18, z / 18, 2, 7) - 0.5;
  return broad * 7 + detail * 0.35;
}

/** Gentle rolling ground of the Norman bocage, a few metres of relief over the map. */
export function terrainHeight(x: number, z: number): number {
  let h = naturalHeight(x, z);
  for (const a of FLAT_AREAS) {
    const dx = Math.max(a.minX - x, 0, x - a.maxX);
    const dz = Math.max(a.minZ - z, 0, z - a.maxZ);
    const d = Math.hypot(dx, dz);
    if (d < a.blend) {
      const t = d / a.blend;
      const w = 1 - t * t * (3 - 2 * t);
      h += (a.height - h) * w;
    }
  }
  return h;
}

export class Terrain {
  readonly mesh: THREE.Mesh;

  constructor(segments = 256) {
    const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geometry.computeVertexNormals();
    // Second UV set is required by aoMap in three.js.
    geometry.setAttribute('uv1', geometry.attributes.uv);

    this.mesh = new THREE.Mesh(geometry, createGroundMaterial(MAP_SIZE / 4));
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
  }
}
