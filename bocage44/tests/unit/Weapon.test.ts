import { describe, expect, it } from 'vitest';
import { Weapon } from '../../src/weapons/Weapon';
import { weapon } from '../../src/weapons/WeaponData';

function fireAll(w: Weapon, seconds: number, held: boolean): string[] {
  const out: string[] = [];
  let down = false;
  for (let t = 0; t < seconds; t += 1 / 60) {
    down = held ? true : !down; // tap every other step for semi-auto
    out.push(...w.update(1 / 60, down));
  }
  return out;
}

describe('Weapon', () => {
  it('the Garand fires 8 rounds and ejects its clip with a ping', () => {
    const w = new Weapon(weapon('m1_garand'), 16);
    const ev = fireAll(w, 20, false);
    expect(ev.filter((e) => e === 'fired').length).toBe(8);
    expect(ev).toContain('clipEjected');
  });

  it('semi-automatic needs a trigger press per shot', () => {
    const w = new Weapon(weapon('m1_garand'), 0);
    const ev = fireAll(w, 2, true);
    expect(ev.filter((e) => e === 'fired').length).toBe(1);
  });

  it('the Thompson fires automatically at about 700 rounds per minute', () => {
    const w = new Weapon(weapon('m1a1_thompson'), 0);
    const ev = fireAll(w, 1, true);
    const n = ev.filter((e) => e === 'fired').length;
    expect(n).toBeGreaterThanOrEqual(11);
    expect(n).toBeLessThanOrEqual(13);
  });

  it('reloads take the time from the data file', () => {
    const w = new Weapon(weapon('m1_garand'), 16);
    fireAll(w, 20, false);
    expect(w.startReload()).toBe(true);
    let t = 0;
    while (w.reloading) {
      w.update(1 / 60, false);
      t += 1 / 60;
    }
    expect(t).toBeCloseTo(2.8, 1);
    expect(w.mag).toBe(8);
    expect(w.reserve).toBe(8);
  });

  it('the Kar98k must cycle its bolt between shots', () => {
    const w = new Weapon(weapon('kar98k'), 0);
    const ev = fireAll(w, 1.2, false);
    expect(ev.filter((e) => e === 'fired').length).toBe(1);
  });
});
