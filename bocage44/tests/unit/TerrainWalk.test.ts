import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../../src/world/Collision';
import { terrainHeight } from '../../src/world/Terrain';
import { PlayerController } from '../../src/player/PlayerController';
import { SIM_DT } from '../../src/core/GameLoop';

// Regression: slope changes in the field used to read as walls and stall the player.
describe('walking across the rolling field', () => {
  it('keeps a steady trot and never leaves the ground', () => {
    const g = new THREE.PlaneGeometry(400, 400, 256, 256);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    const root = new THREE.Group();
    root.add(new THREE.Mesh(g));
    const p = new PlayerController(CollisionWorld.fromObject(root));

    for (const [x, z, yaw] of [[30, 40, 0.7], [-60, 80, 2.5], [100, -100, -1], [-120, -30, 1.9]]) {
      p.teleport(new THREE.Vector3(x, terrainHeight(x, z) + 0.05, z));
      let minSpeed = Infinity;
      let airborne = 0;
      for (let i = 0; i < 600; i++) {
        p.step(SIM_DT, { forward: 1, right: 0, sprint: false, walk: false, jumpPressed: false, crouchPressed: false, pronePressed: false, lean: 0, yaw });
        if (i > 120) {
          minSpeed = Math.min(minSpeed, p.horizontalSpeed);
          if (!p.onGround) airborne++;
        }
      }
      expect(minSpeed).toBeGreaterThan(3.2);
      expect(airborne).toBe(0);
    }
  });
});
