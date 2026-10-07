import * as THREE from 'three';
import { createMeadowTextures, createWeatheredWoodTextures, type PbrTextures } from './ProceduralTextures';

function applyRepeat(set: PbrTextures, repeatX: number, repeatY = repeatX): void {
  for (const tex of [set.map, set.normalMap, set.roughnessMap, set.aoMap]) tex.repeat.set(repeatX, repeatY);
}

export function createGroundMaterial(repeat: number): THREE.MeshStandardMaterial {
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
  woodTextures ??= createWeatheredWoodTextures();
  return new THREE.MeshStandardMaterial({
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    roughnessMap: woodTextures.roughnessMap,
    aoMap: woodTextures.aoMap,
    metalness: 0,
  });
}
