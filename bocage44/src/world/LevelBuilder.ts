import * as THREE from 'three';
import { Terrain, terrainHeight } from './Terrain';
import { buildTestRange } from './TestRange';
import { buildEnemyArea } from './EnemyArea';
import { Surface } from '../damage/SurfaceMaterial';
import { createWoodMaterial } from '../render/Materials';

/**
 * Test scene: open ground, the phase 1 movement course, and a line of fence posts
 * at known distances (every 10 m out to 150 m) so fog visibility can be judged by eye.
 * Returns the group of solid level geometry.
 */
export function buildTestScene(scene: THREE.Scene): THREE.Group {
  const level = new THREE.Group();
  level.name = 'level';
  scene.add(level);
  level.add(new Terrain().mesh);
  level.add(buildTestRange());
  level.add(buildEnemyArea());

  const postGeometry = new THREE.CylinderGeometry(0.06, 0.075, 1.3, 10, 1);
  postGeometry.translate(0, 0.65, 0);
  postGeometry.setAttribute('uv1', postGeometry.attributes.uv);
  const railGeometry = new THREE.BoxGeometry(0.05, 0.09, 10);
  railGeometry.setAttribute('uv1', railGeometry.attributes.uv);
  const wood = createWoodMaterial();

  const posts = new THREE.InstancedMesh(postGeometry, wood, 16);
  const rails = new THREE.InstancedMesh(railGeometry, wood, 30);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const x = 16;
  let rail = 0;
  for (let i = 0; i < 16; i++) {
    const z = -i * 10;
    const y = terrainHeight(x, z) - 0.1;
    // Slight random lean: nothing in the countryside stands perfectly straight.
    q.setFromEuler(new THREE.Euler(Math.sin(i * 12.9) * 0.04, i * 0.7, Math.cos(i * 7.3) * 0.04));
    posts.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, s));
    if (i > 0) {
      const zMid = z + 5;
      const yMid = terrainHeight(x, zMid);
      for (const h of [0.55, 1.05]) {
        rails.setMatrixAt(rail++, m.compose(new THREE.Vector3(x, yMid + h, zMid), new THREE.Quaternion(), s));
      }
    }
  }
  rails.count = rail;
  for (const mesh of [posts, rails]) {
    mesh.userData.surface = Surface.Wood;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    level.add(mesh);
  }
  return level;
}
