import * as THREE from 'three';
import { Soldier, type Noise, type WorldContext } from './Soldier';
import { Squad } from './Squad';
import { terrainHeight } from '../world/Terrain';
import type { CollisionWorld } from '../world/Collision';

const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, terrainHeight(x, z) + 0.05, z);

/**
 * Places the enemy squads, steps them, and sends a new squad up from the north
 * whenever the field is clear, so the test ground stays alive.
 */
export class EnemyDirector {
  readonly soldiers: Soldier[] = [];
  readonly squads: Squad[] = [];
  readonly noises: Noise[] = [];
  private noiseId = 0;
  private waveTimer = -1;
  wave = 0;
  onSpawn: (s: Soldier) => void = () => undefined;
  onWave: () => void = () => undefined;

  constructor(private readonly world: CollisionWorld) {}

  populate(): void {
    // Patrol walking the field behind the wall.
    this.addSquad(
      [v(-6, -82), v(-3, -84), v(0, -80)],
      ['kar98k', 'kar98k', 'mp40'],
      [v(-12, -80), v(12, -80), v(12, -100), v(-12, -100)],
    );
    // Men resting at the cottage.
    this.addSquad([v(-15, -108), v(-13, -111), v(-10, -104)], ['kar98k', 'mp40', 'kar98k'], [v(-15, -109), v(-10, -104)]);
  }

  /** A sound anyone nearby may hear once it has travelled to them. */
  emitNoise(position: THREE.Vector3, radius: number, alarm: boolean, time: number): void {
    this.noises.push({ id: this.noiseId++, position: position.clone(), radius, alarm, time });
  }

  update(dt: number, ctx: WorldContext): void {
    // Sounds older than two seconds have reached everyone in range.
    while (this.noises.length && ctx.time - this.noises[0].time > 2) this.noises.shift();
    for (const sq of this.squads) sq.update(dt);
    for (const s of this.soldiers) s.update(dt, ctx);

    // When everyone is down, another squad comes looking after a pause.
    const alive = this.soldiers.some((s) => s.alive);
    if (!alive && this.waveTimer < 0) this.waveTimer = 12;
    if (this.waveTimer >= 0) {
      this.waveTimer -= dt;
      if (this.waveTimer < 0) this.spawnWave(ctx);
    }
  }

  private spawnWave(ctx: WorldContext): void {
    this.wave++;
    const n = 3 + Math.min(2, this.wave);
    const x0 = (Math.random() - 0.5) * 40;
    const starts = Array.from({ length: n }, (_, i) => v(x0 + (i - n / 2) * 3, -185 - Math.random() * 6));
    const weapons = starts.map((_, i) => (i === 0 ? 'mp40' : 'kar98k') as 'mp40' | 'kar98k');
    // They advance toward where the player was last heard.
    const p = ctx.player.position;
    const squad = this.addSquad(starts, weapons, [v(p.x * 0.5, -120), v(p.x, p.z - 10)]);
    squad.report(p);
    this.onWave();
  }

  private addSquad(positions: THREE.Vector3[], weapons: ('kar98k' | 'mp40')[], patrol: THREE.Vector3[]): Squad {
    const squad = new Squad();
    this.squads.push(squad);
    positions.forEach((pos, i) => {
      // Each man walks the same route, starting at a different point.
      const route = patrol.map((_, k) => patrol[(k + i) % patrol.length]);
      const s = new Soldier(this.world, pos, Math.PI, squad, route, weapons[i]);
      this.soldiers.push(s);
      this.onSpawn(s);
    });
    return squad;
  }
}
