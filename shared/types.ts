export type EraId = 'ww1' | 'ww2';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra' | 'auto';
export type QualityTier = 'low' | 'medium' | 'high';
export type DrawDistanceTier = 'short' | 'medium' | 'long' | 'ultra';
export type FpsCap = 30 | 45 | 60 | 90 | 120;

export interface GraphicsSettings {
  preset: GraphicsPreset;
  resolutionScale: number; // 50..100
  fpsCap: FpsCap;
  shadows: boolean;
  shadowQuality: QualityTier;
  drawDistance: DrawDistanceTier;
  textureQuality: QualityTier;
  antiAliasing: boolean;
  fog: boolean;
  bloom: boolean;
  motionBlur: boolean;
  foliageDensity: QualityTier;
  particleDensity: QualityTier;
  showFpsPing: boolean;
}

export type JoystickPositionMode = 'dynamic' | 'fixed';
export type FireButtonSide = 'left' | 'right';

export interface HudElementPosition {
  xPct: number; // 0..100 from left
  yPct: number; // 0..100 from top
  scale: number; // 0.7..1.4
}

export interface HudLayout {
  joystick: HudElementPosition;
  firePrimary: HudElementPosition;
  fireSecondary: HudElementPosition;
  ads: HudElementPosition;
  reload: HudElementPosition;
  crouch: HudElementPosition;
  jump: HudElementPosition;
  pause: HudElementPosition;
}

export interface ControlSettings {
  sensitivityHip: number; // 0.1..3.0
  sensitivityAds: number; // 0.1..3.0
  sensitivityScope: number; // 0.1..3.0
  sensitivityVehicle: number; // 0.1..3.0
  sensitivityAircraft: number; // 0.1..3.0
  sensitivityShip: number; // 0.1..3.0
  invertY: boolean;
  aimAssist: boolean;
  joystickSize: number; // 70..140 (%)
  joystickOpacity: number; // 30..100 (%)
  joystickPosition: JoystickPositionMode;
  fireButtonSide: FireButtonSide;
  autoFire: boolean;
  autoSprint: boolean;
  tiltAircraft: boolean;
  haptics: boolean;
  forceTouchHud: boolean;
  hudLayout: HudLayout;
}

export interface AudioSettings {
  master: number; // 0..100
  music: number; // 0..100
  effects: number; // 0..100
  voice: number; // 0..100
  ambient: number; // 0..100
}

export type LanguageCode = 'en' | 'ar';
export type CrosshairStyle = 'cross' | 'dot' | 'chevron' | 'dynamic';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface GameplaySettings {
  language: LanguageCode;
  fov: number; // 65..105
  crosshairStyle: CrosshairStyle;
  crosshairColor: string;
  hitMarkers: boolean;
  damageNumbers: boolean;
  colorblindMode: ColorblindMode;
}

export interface GameSettings {
  graphics: GraphicsSettings;
  controls: ControlSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
}

export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  playTimeSec: number;
}

export interface WeaponStats {
  id: string;
  name: string;
  era: EraId;
  category: 'bolt_rifle';
  damage: number;
  headshotMultiplier: number;
  fireRateRpm: number;
  boltCycleSec: number;
  reloadSec: number;
  magSize: number;
  reserveAmmo: number;
  muzzleVelocity: number;
  effectiveRange: number;
  hipSpreadDeg: number;
  adsSpreadDeg: number;
  recoilPitch: number;
  recoilYaw: number;
  adsFovFactor: number;
  adsTimeSec: number;
}

export interface HudTelemetry {
  hp: number;
  maxHp: number;
  ammoInMag: number;
  ammoReserve: number;
  weaponName: string;
  isReloading: boolean;
  reloadProgress: number;
  isAds: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isCyclingBolt: boolean;
  crosshairSpreadPx: number;
  fps: number;
  pingMs: number;
  lastHitTimestamp: number;
  lastHitCritical: boolean;
  lastDamage: number | null;
  lastDamageScreenPos: { x: number; y: number } | null;
  pointerLocked: boolean;
  qualityNotice: string | null;
}
