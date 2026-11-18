import { useCallback, useEffect, useRef, useState } from 'react';
import { TRANSLATIONS } from '@shared/i18n';
import {
  loadProfile,
  loadSettings,
  saveProfile,
  saveSettings,
} from '@shared/settingsDefaults';
import type { GameSettings, HudLayout, HudTelemetry, PlayerProfile } from '@shared/types';
import { GameEngine, type GameModeState } from './engine/GameEngine';
import { TitleScreen } from './ui/TitleScreen';
import { SettingsModal } from './ui/SettingsModal';
import { TouchHud } from './ui/TouchHud';
import { PauseModal } from './ui/PauseModal';
import { HostHelpModal } from './ui/HostHelpModal';

const INITIAL_TELEMETRY: HudTelemetry = {
  hp: 100,
  maxHp: 100,
  ammoInMag: 5,
  ammoReserve: 45,
  weaponName: 'M.14 Trench Rifle',
  isReloading: false,
  reloadProgress: 0,
  isAds: false,
  isSprinting: false,
  isCrouching: false,
  isCyclingBolt: false,
  crosshairSpreadPx: 8,
  fps: 60,
  pingMs: 0,
  lastHitTimestamp: 0,
  lastHitCritical: false,
  lastDamage: null,
  lastDamageScreenPos: null,
  pointerLocked: false,
  qualityNotice: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [mode, setMode] = useState<GameModeState>('title');
  const [showSettings, setShowSettings] = useState(false);
  const [showHostGuide, setShowHostGuide] = useState(false);
  const [hudEditOrigin, setHudEditOrigin] = useState<'title' | 'paused'>('title');
  const [telemetry, setTelemetry] = useState<HudTelemetry>(INITIAL_TELEMETRY);
  const [webglError, setWebglError] = useState(false);

  const t = TRANSLATIONS[settings.gameplay.language];
  const isRtl = settings.gameplay.language === 'ar';

  const handlePauseRef = useRef<() => void>(() => {});
  handlePauseRef.current = () => {
    setMode((prev) => {
      if (prev === 'playing') {
        engineRef.current?.setMode('paused');
        return 'paused';
      }
      if (prev === 'paused') {
        engineRef.current?.setMode('playing');
        engineRef.current?.player.requestPointerLock();
        return 'playing';
      }
      return prev;
    });
  };

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    try {
      const engine = new GameEngine(mount, settings, profile, {
        onTelemetry: (next) => setTelemetry(next),
        onPause: () => handlePauseRef.current(),
        onProfileChange: (nextProfile) => {
          setProfile(nextProfile);
          saveProfile(nextProfile);
        },
        onAutoQualityAdjust: (adjusted) => {
          setSettings(adjusted);
          saveSettings(adjusted);
        },
      });
      engineRef.current = engine;

      const canvas = mount.querySelector('canvas');
      const onLost = (e: Event) => {
        e.preventDefault();
        setWebglError(true);
      };
      const onRestored = () => {
        setWebglError(false);
      };
      canvas?.addEventListener('webglcontextlost', onLost);
      canvas?.addEventListener('webglcontextrestored', onRestored);

      return () => {
        canvas?.removeEventListener('webglcontextlost', onLost);
        canvas?.removeEventListener('webglcontextrestored', onRestored);
        engine.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglError(true);
    }
    // Mount WebGL scene once so React UI updates never reset the game loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleDeploy = useCallback(() => {
    engineRef.current?.audio.playUiClick();
    engineRef.current?.deploy();
    setShowSettings(false);
    setShowHostGuide(false);
    setMode('playing');
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.audio.playUiClick();
    engineRef.current?.setMode('playing');
    engineRef.current?.player.requestPointerLock();
    setMode('playing');
  }, []);

  const handleReturnMenu = useCallback(() => {
    engineRef.current?.audio.playUiClick();
    engineRef.current?.setMode('title');
    setShowSettings(false);
    setMode('title');
  }, []);

  const handleRestartPos = useCallback(() => {
    engineRef.current?.audio.playUiClick();
    engineRef.current?.resetPlayerPosition();
    engineRef.current?.setMode('playing');
    engineRef.current?.player.requestPointerLock();
    setMode('playing');
  }, []);

  const handleEnterHudEdit = useCallback(
    (origin: 'title' | 'paused') => {
      engineRef.current?.audio.playUiClick();
      setHudEditOrigin(origin);
      setShowSettings(false);
      engineRef.current?.setMode('hud_edit');
      setMode('hud_edit');
    },
    [],
  );

  const handleExitHudEdit = useCallback(() => {
    engineRef.current?.audio.playUiClick();
    if (hudEditOrigin === 'title') {
      engineRef.current?.setMode('title');
      setMode('title');
      setShowSettings(true);
    } else {
      engineRef.current?.setMode('paused');
      setMode('paused');
    }
  }, [hudEditOrigin]);

  const handleUpdateHudLayout = useCallback(
    (layout: HudLayout) => {
      const next: GameSettings = {
        ...settings,
        controls: { ...settings.controls, hudLayout: layout },
      };
      handleSettingsChange(next);
    },
    [settings, handleSettingsChange],
  );

  const handleUpdateCallsign = useCallback(
    (name: string) => {
      const next = { ...profile, name };
      setProfile(next);
      saveProfile(next);
    },
    [profile],
  );

  const cbClass =
    settings.gameplay.colorblindMode === 'protanopia'
      ? 'cb-protanopia'
      : settings.gameplay.colorblindMode === 'deuteranopia'
        ? 'cb-deuteranopia'
        : settings.gameplay.colorblindMode === 'tritanopia'
          ? 'cb-tritanopia'
          : '';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#12110f] touch-none-canvas">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className={`w-full h-full ${cbClass}`} />

      {webglError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#141311] text-center">
          <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-[#f4efe6] mb-2">
            ASHFRONT
          </h1>
          <p className="text-sm text-[#c4bcae] max-w-md">
            WebGL rendering is unavailable or paused in this browser context. Reload or enable hardware acceleration to enter the 3D battlefield.
          </p>
        </div>
      )}

      {mode === 'title' && !showSettings && !showHostGuide && (
        <TitleScreen
          t={t}
          isRtl={isRtl}
          profile={profile}
          onDeploy={handleDeploy}
          onOpenSettings={() => {
            engineRef.current?.audio.playUiClick();
            setShowSettings(true);
          }}
          onOpenHostGuide={() => {
            engineRef.current?.audio.playUiClick();
            setShowHostGuide(true);
          }}
          onUpdateCallsign={handleUpdateCallsign}
        />
      )}

      {(mode === 'playing' || mode === 'hud_edit') && (
        <TouchHud
          t={t}
          settings={settings}
          telemetry={telemetry}
          engine={engineRef.current}
          isHudEditing={mode === 'hud_edit'}
          onPause={() => handlePauseRef.current()}
          onUpdateHudLayout={handleUpdateHudLayout}
          onExitHudEdit={handleExitHudEdit}
        />
      )}

      {mode === 'paused' && !showSettings && (
        <PauseModal
          t={t}
          isRtl={isRtl}
          onResume={handleResume}
          onRestartPos={handleRestartPos}
          onEditHud={() => handleEnterHudEdit('paused')}
          onOpenSettings={() => {
            engineRef.current?.audio.playUiClick();
            setShowSettings(true);
          }}
          onReturnMenu={handleReturnMenu}
        />
      )}

      {showSettings && (
        <SettingsModal
          t={t}
          isRtl={isRtl}
          settings={settings}
          onChange={handleSettingsChange}
          onEditHud={() => handleEnterHudEdit(mode === 'paused' ? 'paused' : 'title')}
          onClose={() => {
            engineRef.current?.audio.playUiClick();
            setShowSettings(false);
          }}
        />
      )}

      {showHostGuide && (
        <HostHelpModal
          t={t}
          isRtl={isRtl}
          onClose={() => {
            engineRef.current?.audio.playUiClick();
            setShowHostGuide(false);
          }}
        />
      )}
    </div>
  );
}
