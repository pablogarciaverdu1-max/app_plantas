import { describe, expect, it } from 'vitest';
import { Health, hitDamage } from '../../src/damage/Health';
import { weapon } from '../../src/weapons/WeaponData';

const rifle = weapon('m1_garand').damage;
const noRandom = { helmet: false, pistolOrSmg: false, oblique: false, random: () => 0.5 };

describe('Damage', () => {
  it('a rifle hit to the bare head kills', () => {
    const h = new Health();
    h.applyHit(hitDamage(rifle, 'head', 1, noRandom), 'head');
    expect(h.dead).toBe(true);
  });

  it('a rifle hit to the leg does not kill', () => {
    const h = new Health();
    h.applyHit(hitDamage(rifle, 'leg', 1, noRandom), 'leg');
    expect(h.dead).toBe(false);
  });

  it('a torso hit takes 60 to 100 points depending on remaining energy', () => {
    expect(hitDamage(rifle, 'torso', 1, noRandom)).toBeLessThanOrEqual(100);
    expect(hitDamage(rifle, 'torso', 0.7, noRandom)).toBeGreaterThanOrEqual(60);
  });

  it('two rifle torso hits kill', () => {
    const h = new Health();
    h.applyHit(hitDamage(rifle, 'torso', 0.75, noRandom), 'torso');
    h.applyHit(hitDamage(rifle, 'torso', 0.75, noRandom), 'torso');
    expect(h.dead).toBe(true);
  });

  it('a helmet sometimes deflects an oblique SMG round', () => {
    expect(hitDamage(34, 'head', 1, { helmet: true, pistolOrSmg: true, oblique: true, random: () => 0.1 })).toBe(0);
    expect(hitDamage(34, 'head', 1, { helmet: true, pistolOrSmg: true, oblique: true, random: () => 0.5 })).toBeGreaterThan(0);
  });

  it('wounds bleed until bandaged, which takes 4 s', () => {
    const h = new Health();
    h.applyHit(30, 'arm');
    const before = h.value;
    h.update(1);
    expect(h.value).toBeLessThan(before);
    expect(h.startBandage()).toBe(true);
    let done = false;
    for (let t = 0; t < 4.05; t += 0.05) done = h.update(0.05) || done;
    expect(done).toBe(true);
    const after = h.value;
    h.update(5);
    expect(h.value).toBe(after);
  });
});
