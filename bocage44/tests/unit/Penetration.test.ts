import { describe, expect, it } from 'vitest';
import { speedAfterPenetration, ricochets } from '../../src/damage/Penetration';
import { Surface } from '../../src/damage/SurfaceMaterial';
import { kineticEnergy } from '../../src/weapons/Ballistics';
import { weapon } from '../../src/weapons/WeaponData';

const garand = weapon('m1_garand');
const rifleEnergy = kineticEnergy(garand.bulletMass, garand.muzzleVelocity);

describe('Penetration', () => {
  it('a 3 cm plank does not stop a rifle bullet', () => {
    expect(speedAfterPenetration(Surface.Wood, 0.03, rifleEnergy)).toBeGreaterThan(0.8);
  });
  it('a 40 cm stone wall stops it', () => {
    expect(speedAfterPenetration(Surface.Stone, 0.4, rifleEnergy)).toBe(0);
  });
  it('a hedge is crossed but an earth bank is not', () => {
    expect(speedAfterPenetration(Surface.Hedge, 1.5, rifleEnergy)).toBeGreaterThan(0);
    expect(speedAfterPenetration(Surface.Earth, 1.0, rifleEnergy)).toBe(0);
  });
  it('pistol rounds penetrate less than rifle rounds', () => {
    const colt = weapon('m1911a1');
    const e = kineticEnergy(colt.bulletMass, colt.muzzleVelocity);
    expect(speedAfterPenetration(Surface.Wood, 0.1, e)).toBeLessThan(speedAfterPenetration(Surface.Wood, 0.1, rifleEnergy));
  });
  it('glances off stone at shallow angles only', () => {
    expect(ricochets(Surface.Stone, 8)).toBe(true);
    expect(ricochets(Surface.Stone, 40)).toBe(false);
    expect(ricochets(Surface.Wood, 5)).toBe(false);
  });
});
