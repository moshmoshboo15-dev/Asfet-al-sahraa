import type {
  GameSettings,
  GraphicsPreset,
  GraphicsSettings,
  HudLayout,
  PlayerProfile,
} from './types';

export const SETTINGS_STORAGE_KEY = 'ashfront_settings_v1';
export const PROFILE_STORAGE_KEY = 'ashfront_profile_v1';

export function createDefaultHudLayout(fireSide: 'left' | 'right' = 'right'): HudLayout {
  const rightFire = fireSide === 'right';
  return {
    joystick: { xPct: rightFire ? 14 : 86, yPct: 73, scale: 1.0 },
    firePrimary: { xPct: rightFire ? 84 : 16, yPct: 72, scale: 1.05 },
    fireSecondary: { xPct: rightFire ? 18 : 82, yPct: 45, scale: 0.9 },
    ads: { xPct: rightFire ? 88 : 12, yPct: 48, scale: 0.95 },
    reload: { xPct: rightFire ? 74 : 26, yPct: 84, scale: 0.9 },
    crouch: { xPct: rightFire ? 72 : 28, yPct: 62, scale: 0.9 },
    jump: { xPct: rightFire ? 91 : 9, yPct: 62, scale: 0.9 },
    pause: { xPct: 5, yPct: 8, scale: 1.0 },
  };
}

export const GRAPHICS_PRESETS: Record<Exclude<GraphicsPreset, 'auto'>, Omit<GraphicsSettings, 'preset' | 'showFpsPing'>> = {
  low: {
    resolutionScale: 65,
    fpsCap: 30,
    shadows: false,
    shadowQuality: 'low',
    drawDistance: 'short',
    textureQuality: 'low',
    antiAliasing: false,
    fog: true,
    bloom: false,
    motionBlur: false,
    foliageDensity: 'low',
    particleDensity: 'low',
  },
  medium: {
    resolutionScale: 80,
    fpsCap: 60,
    shadows: true,
    shadowQuality: 'low',
    drawDistance: 'medium',
    textureQuality: 'medium',
    antiAliasing: true,
    fog: true,
    bloom: true,
    motionBlur: false,
    foliageDensity: 'medium',
    particleDensity: 'medium',
  },
  high: {
    resolutionScale: 100,
    fpsCap: 60,
    shadows: true,
    shadowQuality: 'medium',
    drawDistance: 'long',
    textureQuality: 'high',
    antiAliasing: true,
    fog: true,
    bloom: true,
    motionBlur: false,
    foliageDensity: 'high',
    particleDensity: 'high',
  },
  ultra: {
    resolutionScale: 100,
    fpsCap: 120,
    shadows: true,
    shadowQuality: 'high',
    drawDistance: 'ultra',
    textureQuality: 'high',
    antiAliasing: true,
    fog: true,
    bloom: true,
    motionBlur: true,
    foliageDensity: 'high',
    particleDensity: 'high',
  },
};

export function createDefaultSettings(): GameSettings {
  return {
    graphics: {
      preset: 'high',
      ...GRAPHICS_PRESETS.high,
      showFpsPing: true,
    },
    controls: {
      sensitivityHip: 1.0,
      sensitivityAds: 0.65,
      sensitivityScope: 0.45,
      sensitivityVehicle: 1.0,
      sensitivityAircraft: 1.0,
      sensitivityShip: 0.9,
      invertY: false,
      aimAssist: true,
      joystickSize: 100,
      joystickOpacity: 75,
      joystickPosition: 'dynamic',
      fireButtonSide: 'right',
      autoFire: false,
      autoSprint: false,
      tiltAircraft: false,
      haptics: true,
      forceTouchHud: false,
      hudLayout: createDefaultHudLayout('right'),
    },
    audio: {
      master: 85,
      music: 55,
      effects: 90,
      voice: 85,
      ambient: 75,
    },
    gameplay: {
      language: 'en',
      fov: 78,
      crosshairStyle: 'dynamic',
      crosshairColor: '#f3efe4',
      hitMarkers: true,
      damageNumbers: true,
      colorblindMode: 'none',
    },
  };
}

export function createDefaultProfile(): PlayerProfile {
  return {
    name: 'Vanguard-01',
    level: 1,
    xp: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    playTimeSec: 0,
  };
}

export function loadSettings(): GameSettings {
  const defaults = createDefaultSettings();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      graphics: { ...defaults.graphics, ...(parsed.graphics ?? {}) },
      controls: {
        ...defaults.controls,
        ...(parsed.controls ?? {}),
        hudLayout: {
          ...defaults.controls.hudLayout,
          ...(parsed.controls?.hudLayout ?? {}),
        },
      },
      audio: { ...defaults.audio, ...(parsed.audio ?? {}) },
      gameplay: { ...defaults.gameplay, ...(parsed.gameplay ?? {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota errors in restricted webviews
  }
}

export function loadProfile(): PlayerProfile {
  const defaults = createDefaultProfile();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<PlayerProfile>) };
  } catch {
    return defaults;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore quota errors
  }
}
