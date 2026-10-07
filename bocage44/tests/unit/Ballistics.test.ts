import { describe, expect, it } from 'vitest';
import { flyTo, zeroAngle } from '../../src/weapons/Ballistics';
import { weapon } from '../../src/weapons/WeaponData';

const garand = weapon('m1_garand');
const SIGHT_HEIGHT = 0.05;

describe('Ballistics', () => {
  it('a Garand bullet takes 0.24–0.28 s to reach 200 m', () => {
    const t = flyTo(200, garand.muzzleVelocity, garand.ballisticCoefficient, 0).time;
    expect(t).toBeGreaterThan(0.24);
    expect(t).toBeLessThan(0.28);
  });

  it('keeps M2 ball speed close to published data (~720 m/s at 183 m)', () => {
    const v = flyTo(183, garand.muzzleVelocity, garand.ballisticCoefficient, 0).speed;
    expect(v).toBeGreaterThan(700);
    expect(v).toBeLessThan(750);
  });

  it('with sights zeroed at 100 m the bullet lands below the aim point at 200 m', () => {
    // Agreed with the user: drop is measured from the line of sight of a 100 m zero.
    // Physics gives ~11 cm; the spec's 15–25 cm only appears with no zero (~26 cm).
    const angle = zeroAngle(100, SIGHT_HEIGHT, garand.muzzleVelocity, garand.ballisticCoefficient);
    const at200 = flyTo(200, garand.muzzleVelocity, garand.ballisticCoefficient, angle);
    // Sight line is horizontal at SIGHT_HEIGHT above the bore.
    const drop = SIGHT_HEIGHT - at200.height;
    expect(drop).toBeGreaterThan(0.08);
    expect(drop).toBeLessThan(0.15);
    const at100 = flyTo(100, garand.muzzleVelocity, garand.ballisticCoefficient, angle);
    expect(at100.height).toBeCloseTo(SIGHT_HEIGHT, 2);
  });

  it('pistol rounds slow and drop far more than rifle rounds', () => {
    const colt = weapon('m1911a1');
    const pistol = flyTo(50, colt.muzzleVelocity, colt.ballisticCoefficient, 0);
    const rifle = flyTo(50, garand.muzzleVelocity, garand.ballisticCoefficient, 0);
    expect(pistol.height).toBeLessThan(rifle.height * 5);
  });
});
