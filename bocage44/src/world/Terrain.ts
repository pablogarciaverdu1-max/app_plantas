import * as THREE from 'three';
import { fbm } from './Noise';
import { createGroundMaterial } from '../render/Materials';

export const MAP_SIZE = 400;

/** Gentle rolling ground of the Norman bocage, a few metres of relief over the map. */
export function terrainHeight(x: number, z: number): number {
  const broad = fbm(x / 140 + 10, z / 140 + 10, 3, 3) - 0.5;
  const detail = fbm(x / 18, z / 18, 2, 7) - 0.5;
  return broad * 7 + detail * 0.35;
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
