import type { CombatRole, Point } from './StateMachine';

/** Members a squad coordinates. */
export interface SquadMember {
  readonly id: string;
  readonly alive: boolean;
  readonly inCombat: boolean;
  readonly position: Point;
}

/**
 * Shares the last known enemy position and splits roles: one man suppresses
 * while one flanks; the rest engage from cover. Morale falls with casualties.
 */
export class Squad {
  readonly members: SquadMember[] = [];
  knownPos: Point | null = null;
  private knownAge = Infinity;
  private roles = new Map<string, CombatRole>();
  private reassignIn = 0;
  private startSize = 0;

  add(m: SquadMember): void {
    this.members.push(m);
    this.startSize = this.members.length;
  }

  get aliveCount(): number {
    return this.members.filter((m) => m.alive).length;
  }

  /** 0..1: falls as the squad takes casualties. */
  get morale(): number {
    return this.startSize ? this.aliveCount / this.startSize : 0;
  }

  report(pos: Point): void {
    this.knownPos = { ...pos };
    this.knownAge = 0;
  }

  /** Known position shared with members, forgotten after a minute without news. */
  shared(): Point | null {
    return this.knownAge < 60 ? this.knownPos : null;
  }

  update(dt: number): void {
    this.knownAge += dt;
    this.reassignIn -= dt;
    if (this.reassignIn <= 0) {
      this.assignRoles();
      this.reassignIn = 8;
    }
  }

  roleOf(id: string): CombatRole {
    return this.roles.get(id) ?? 'Engage';
  }

  private assignRoles(): void {
    const fighters = this.members.filter((m) => m.alive && m.inCombat);
    this.roles.clear();
    if (this.morale < 0.34 && fighters.length > 0) {
      for (const m of fighters) this.roles.set(m.id, 'Retreat');
      return;
    }
    if (!this.knownPos || fighters.length === 0) return;
    const target = this.knownPos;
    const byDist = [...fighters].sort((a, b) => dist(a.position, target) - dist(b.position, target));
    // Closest engages, one suppresses, the farthest flanks when there are three or more.
    byDist.forEach((m, i) => this.roles.set(m.id, i === 0 ? 'Engage' : i === 1 ? 'Suppress' : 'Engage'));
    if (byDist.length >= 3) this.roles.set(byDist[byDist.length - 1].id, 'Flank');
    else if (byDist.length === 2) this.roles.set(byDist[1].id, 'Suppress');
  }
}

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z);
