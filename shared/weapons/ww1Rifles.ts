import type { WeaponStats } from '../types';

export const WW1_M14_TRENCH_RIFLE: WeaponStats = {
  id: 'ww1_m14_trench_rifle',
  name: 'M.14 Trench Rifle',
  era: 'ww1',
  category: 'bolt_rifle',
  damage: 68,
  headshotMultiplier: 2.0,
  fireRateRpm: 48,
  boltCycleSec: 0.78,
  reloadSec: 2.25,
  magSize: 5,
  reserveAmmo: 45,
  muzzleVelocity: 240,
  effectiveRange: 220,
  hipSpreadDeg: 2.8,
  adsSpreadDeg: 0.12,
  recoilPitch: 0.048,
  recoilYaw: 0.016,
  adsFovFactor: 0.72,
  adsTimeSec: 0.18,
};
