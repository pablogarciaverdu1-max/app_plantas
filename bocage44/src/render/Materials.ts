import * as THREE from 'three';
import { createMeadowTextures, createStoneTextures, createWeatheredWoodTextures, type PbrTextures } from './ProceduralTextures';

function applyRepeat(set: PbrTextures, repeatX: number, repeatY = repeatX): void {
  for (const tex of [set.map, set.normalMap, set.roughnessMap, set.aoMap]) tex.repeat.set(repeatX, repeatY);
}

/** Outside a browser (unit tests) there is no canvas to paint textures on. */
const headless = typeof document === 'undefined';

export function createGroundMaterial(repeat: number): THREE.MeshStandardMaterial {
  if (headless) return new THREE.MeshStandardMaterial();
  const tex = createMeadowTextures();
  applyRepeat(tex, repeat);
  return new THREE.MeshStandardMaterial({
    map: tex.map,
    normalMap: tex.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: tex.roughnessMap,
    aoMap: tex.aoMap,
    aoMapIntensity: 0.8,
    metalness: 0,
  });
}

let woodTextures: PbrTextures | undefined;

export function createWoodMaterial(): THREE.MeshStandardMaterial {
  if (headless) return new THREE.MeshStandardMaterial();
  woodTextures ??= createWeatheredWoodTextures();
  return new THREE.MeshStandardMaterial({
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    roughnessMap: woodTextures.roughnessMap,
    aoMap: woodTextures.aoMap,
    metalness: 0,
  });
}

let stoneTextures: PbrTextures | undefined;

/** Box UVs are scaled to metres; the stone tile covers 2 m. */
export function createStoneMaterial(): THREE.MeshStandardMaterial {
  if (headless) return new THREE.MeshStandardMaterial();
  stoneTextures ??= createStoneTextures();
  return new THREE.MeshStandardMaterial({
    map: stoneTextures.map,
    normalMap: stoneTextures.normalMap,
    roughnessMap: stoneTextures.roughnessMap,
    aoMap: stoneTextures.aoMap,
    metalness: 0,
  });
}
