import raw from '../../data/weapons.json';

/** Weapon values come from data/weapons.json, the single source of truth. */
export interface WeaponSpec {
  id: string;
  displayName: string;
  side: 'allied' | 'german';
  class: 'rifle' | 'smg' | 'pistol' | 'machine_gun';
  action: 'semi_auto' | 'full_auto' | 'bolt';
  cartridge: string;
  muzzleVelocity: number;
  bulletMass: number;
  ballisticCoefficient: number;
  magazineSize: number;
  fireRate: number;
  boltCycleTime?: number;
  reloadTimeEmpty: number;
  reloadTimePartial: number;
  reloadPartialIsPerRound?: boolean;
  damage: number;
  effectiveRange: number;
  recoil: { vertical: number; horizontal: number };
  special: string[];
}

export interface ThrowableSpec {
  id: string;
  displayName: string;
  fuseTimeMin: number;
  fuseTimeMax: number;
  lethalRadius: number;
  woundRadius: number;
  throwSpeed?: number;
  placeTime?: number;
}

const weapons = raw.weapons as WeaponSpec[];

export function weapon(id: string): WeaponSpec {
  const w = weapons.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown weapon ${id}`);
  return w;
}

export function throwable(id: string): ThrowableSpec {
  const t = (raw.throwables as ThrowableSpec[]).find((x) => x.id === id);
  if (!t) throw new Error(`Unknown throwable ${id}`);
  return t;
}
