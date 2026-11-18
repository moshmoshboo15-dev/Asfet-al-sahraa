import { useState } from 'react';
import type { TranslationStrings } from '@shared/i18n';
import type {
  ColorblindMode,
  CrosshairStyle,
  DrawDistanceTier,
  FireButtonSide,
  FpsCap,
  GameSettings,
  GraphicsPreset,
  JoystickPositionMode,
  LanguageCode,
  QualityTier,
} from '@shared/types';
import {
  createDefaultHudLayout,
  createDefaultSettings,
  GRAPHICS_PRESETS,
} from '@shared/settingsDefaults';

interface SettingsModalProps {
  t: TranslationStrings;
  isRtl: boolean;
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onEditHud: () => void;
  onClose: () => void;
}

type SettingsTab = 'graphics' | 'controls' | 'audio' | 'gameplay';

export function SettingsModal({
  t,
  isRtl,
  settings,
  onChange,
  onEditHud,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('graphics');

  const updateGraphics = <K extends keyof GameSettings['graphics']>(
    key: K,
    val: GameSettings['graphics'][K],
  ) => {
    const nextGraphics = { ...settings.graphics, [key]: val };
    if (key === 'preset' && val !== 'auto') {
      const presetVals = GRAPHICS_PRESETS[val as Exclude<GraphicsPreset, 'auto'>];
      Object.assign(nextGraphics, presetVals);
    }
    onChange({ ...settings, graphics: nextGraphics });
  };

  const updateControls = <K extends keyof GameSettings['controls']>(
    key: K,
    val: GameSettings['controls'][K],
  ) => {
    const nextControls = { ...settings.controls, [key]: val };
    if (key === 'fireButtonSide') {
      nextControls.hudLayout = createDefaultHudLayout(val as FireButtonSide);
    }
    onChange({ ...settings, controls: nextControls });
  };

  const updateAudio = <K extends keyof GameSettings['audio']>(
    key: K,
    val: GameSettings['audio'][K],
  ) => {
    onChange({ ...settings, audio: { ...settings.audio, [key]: val } });
  };

  const updateGameplay = <K extends keyof GameSettings['gameplay']>(
    key: K,
    val: GameSettings['gameplay'][K],
  ) => {
    onChange({ ...settings, gameplay: { ...settings.gameplay, [key]: val } });
  };

  const handleReset = () => {
    onChange(createDefaultSettings());
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#0b0a09]/82"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#181614] border border-[#ede7da]/15 rounded-lg shadow-2xl overflow-hidden">
        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#ede7da]/12 bg-[#141311]">
          <h2 className="font-display text-2xl font-bold tracking-wider uppercase text-[#f4efe6]">
            {t.settings}
          </h2>

          <div className="flex items-center gap-1 bg-[#0f0e0c] p-1 rounded-md border border-[#ede7da]/10">
            {(['graphics', 'controls', 'audio', 'gameplay'] as SettingsTab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === id
                    ? 'bg-[#d48c2e] text-[#141210]'
                    : 'text-[#bfb7a6] hover:text-white'
                }`}
              >
                {t.tabs[id]}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'graphics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <SelectRow
                label={t.graphics.preset}
                value={settings.graphics.preset}
                options={[
                  { value: 'low', label: t.graphics.low },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'high', label: t.graphics.high },
                  { value: 'ultra', label: t.graphics.ultra },
                  { value: 'auto', label: t.graphics.auto },
                ]}
                onChange={(v) => updateGraphics('preset', v as GraphicsPreset)}
              />
              <SliderRow
                label={t.graphics.resolutionScale}
                value={settings.graphics.resolutionScale}
                min={50}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => updateGraphics('resolutionScale', v)}
              />
              <SelectRow
                label={t.graphics.fpsCap}
                value={String(settings.graphics.fpsCap)}
                options={[30, 45, 60, 90, 120].map((n) => ({ value: String(n), label: `${n} FPS` }))}
                onChange={(v) => updateGraphics('fpsCap', Number(v) as FpsCap)}
              />
              <ToggleRow
                label={t.graphics.shadows}
                checked={settings.graphics.shadows}
                onChange={(v) => updateGraphics('shadows', v)}
              />
              <SelectRow
                label={t.graphics.shadowQuality}
                value={settings.graphics.shadowQuality}
                options={[
                  { value: 'low', label: t.graphics.low },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'high', label: t.graphics.high },
                ]}
                onChange={(v) => updateGraphics('shadowQuality', v as QualityTier)}
              />
              <SelectRow
                label={t.graphics.drawDistance}
                value={settings.graphics.drawDistance}
                options={[
                  { value: 'short', label: t.graphics.short },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'long', label: t.graphics.long },
                  { value: 'ultra', label: t.graphics.ultra },
                ]}
                onChange={(v) => updateGraphics('drawDistance', v as DrawDistanceTier)}
              />
              <SelectRow
                label={t.graphics.textureQuality}
                value={settings.graphics.textureQuality}
                options={[
                  { value: 'low', label: t.graphics.low },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'high', label: t.graphics.high },
                ]}
                onChange={(v) => updateGraphics('textureQuality', v as QualityTier)}
              />
              <SelectRow
                label={t.graphics.foliageDensity}
                value={settings.graphics.foliageDensity}
                options={[
                  { value: 'low', label: t.graphics.low },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'high', label: t.graphics.high },
                ]}
                onChange={(v) => updateGraphics('foliageDensity', v as QualityTier)}
              />
              <SelectRow
                label={t.graphics.particleDensity}
                value={settings.graphics.particleDensity}
                options={[
                  { value: 'low', label: t.graphics.low },
                  { value: 'medium', label: t.graphics.medium },
                  { value: 'high', label: t.graphics.high },
                ]}
                onChange={(v) => updateGraphics('particleDensity', v as QualityTier)}
              />
              <ToggleRow
                label={t.graphics.antiAliasing}
                checked={settings.graphics.antiAliasing}
                onChange={(v) => updateGraphics('antiAliasing', v)}
              />
              <ToggleRow
                label={t.graphics.fog}
                checked={settings.graphics.fog}
                onChange={(v) => updateGraphics('fog', v)}
              />
              <ToggleRow
                label={t.graphics.bloom}
                checked={settings.graphics.bloom}
                onChange={(v) => updateGraphics('bloom', v)}
              />
              <ToggleRow
                label={t.graphics.motionBlur}
                checked={settings.graphics.motionBlur}
                onChange={(v) => updateGraphics('motionBlur', v)}
              />
              <ToggleRow
                label={t.graphics.showFpsPing}
                checked={settings.graphics.showFpsPing}
                onChange={(v) => updateGraphics('showFpsPing', v)}
              />
            </div>
          )}

          {tab === 'controls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <SliderRow
                label={t.controls.sensHip}
                value={Math.round(settings.controls.sensitivityHip * 100)}
                min={15}
                max={280}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityHip', v / 100)}
              />
              <SliderRow
                label={t.controls.sensAds}
                value={Math.round(settings.controls.sensitivityAds * 100)}
                min={15}
                max={250}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityAds', v / 100)}
              />
              <SliderRow
                label={t.controls.sensScope}
                value={Math.round(settings.controls.sensitivityScope * 100)}
                min={10}
                max={200}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityScope', v / 100)}
              />
              <SliderRow
                label={t.controls.sensVehicle}
                value={Math.round(settings.controls.sensitivityVehicle * 100)}
                min={20}
                max={250}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityVehicle', v / 100)}
              />
              <SliderRow
                label={t.controls.sensAircraft}
                value={Math.round(settings.controls.sensitivityAircraft * 100)}
                min={20}
                max={250}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityAircraft', v / 100)}
              />
              <SliderRow
                label={t.controls.sensShip}
                value={Math.round(settings.controls.sensitivityShip * 100)}
                min={20}
                max={250}
                step={5}
                unit="%"
                onChange={(v) => updateControls('sensitivityShip', v / 100)}
              />
              <SliderRow
                label={t.controls.joystickSize}
                value={settings.controls.joystickSize}
                min={70}
                max={140}
                step={5}
                unit="%"
                onChange={(v) => updateControls('joystickSize', v)}
              />
              <SliderRow
                label={t.controls.joystickOpacity}
                value={settings.controls.joystickOpacity}
                min={30}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => updateControls('joystickOpacity', v)}
              />
              <SelectRow
                label={t.controls.joystickPosition}
                value={settings.controls.joystickPosition}
                options={[
                  { value: 'dynamic', label: t.controls.dynamic },
                  { value: 'fixed', label: t.controls.fixed },
                ]}
                onChange={(v) => updateControls('joystickPosition', v as JoystickPositionMode)}
              />
              <SelectRow
                label={t.controls.fireButtonSide}
                value={settings.controls.fireButtonSide}
                options={[
                  { value: 'right', label: t.controls.right },
                  { value: 'left', label: t.controls.left },
                ]}
                onChange={(v) => updateControls('fireButtonSide', v as FireButtonSide)}
              />
              <ToggleRow
                label={t.controls.invertY}
                checked={settings.controls.invertY}
                onChange={(v) => updateControls('invertY', v)}
              />
              <ToggleRow
                label={t.controls.aimAssist}
                checked={settings.controls.aimAssist}
                onChange={(v) => updateControls('aimAssist', v)}
              />
              <ToggleRow
                label={t.controls.autoFire}
                checked={settings.controls.autoFire}
                onChange={(v) => updateControls('autoFire', v)}
              />
              <ToggleRow
                label={t.controls.autoSprint}
                checked={settings.controls.autoSprint}
                onChange={(v) => updateControls('autoSprint', v)}
              />
              <ToggleRow
                label={t.controls.tiltAircraft}
                checked={settings.controls.tiltAircraft}
                onChange={(v) => updateControls('tiltAircraft', v)}
              />
              <ToggleRow
                label={t.controls.haptics}
                checked={settings.controls.haptics}
                onChange={(v) => updateControls('haptics', v)}
              />
              <ToggleRow
                label={t.controls.forceTouchHud}
                checked={settings.controls.forceTouchHud}
                onChange={(v) => updateControls('forceTouchHud', v)}
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#e3ddd0]">{t.controls.editHudBtn}</span>
                <button
                  type="button"
                  onClick={onEditHud}
                  className="min-h-[40px] px-4 py-1.5 text-sm font-medium bg-[#272420] border border-[#d48c2e]/60 text-[#f3dfb6] rounded hover:bg-[#322e28] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.editHud}
                </button>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <SliderRow
                label={t.audio.master}
                value={settings.audio.master}
                min={0}
                max={100}
                step={2}
                unit="%"
                onChange={(v) => updateAudio('master', v)}
              />
              <SliderRow
                label={t.audio.music}
                value={settings.audio.music}
                min={0}
                max={100}
                step={2}
                unit="%"
                onChange={(v) => updateAudio('music', v)}
              />
              <SliderRow
                label={t.audio.effects}
                value={settings.audio.effects}
                min={0}
                max={100}
                step={2}
                unit="%"
                onChange={(v) => updateAudio('effects', v)}
              />
              <SliderRow
                label={t.audio.voice}
                value={settings.audio.voice}
                min={0}
                max={100}
                step={2}
                unit="%"
                onChange={(v) => updateAudio('voice', v)}
              />
              <SliderRow
                label={t.audio.ambient}
                value={settings.audio.ambient}
                min={0}
                max={100}
                step={2}
                unit="%"
                onChange={(v) => updateAudio('ambient', v)}
              />
            </div>
          )}

          {tab === 'gameplay' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <SelectRow
                label={t.gameplay.language}
                value={settings.gameplay.language}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
                onChange={(v) => updateGameplay('language', v as LanguageCode)}
              />
              <SliderRow
                label={t.gameplay.fov}
                value={settings.gameplay.fov}
                min={65}
                max={105}
                step={1}
                unit="°"
                onChange={(v) => updateGameplay('fov', v)}
              />
              <SelectRow
                label={t.gameplay.crosshairStyle}
                value={settings.gameplay.crosshairStyle}
                options={[
                  { value: 'dynamic', label: t.gameplay.dynamic },
                  { value: 'cross', label: t.gameplay.cross },
                  { value: 'dot', label: t.gameplay.dot },
                  { value: 'chevron', label: t.gameplay.chevron },
                ]}
                onChange={(v) => updateGameplay('crosshairStyle', v as CrosshairStyle)}
              />
              <div className="flex items-center justify-between py-2 border-b border-[#ede7da]/8">
                <span className="text-sm text-[#e3ddd0]">{t.gameplay.crosshairColor}</span>
                <div className="flex items-center gap-2">
                  {['#f3efe4', '#e05a47', '#67d17c', '#e6b84c', '#74c4e8'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Color ${hex}`}
                      onClick={() => updateGameplay('crosshairColor', hex)}
                      className={`w-7 h-7 rounded border cursor-pointer ${
                        settings.gameplay.crosshairColor === hex
                          ? 'border-white scale-110'
                          : 'border-white/25'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <ToggleRow
                label={t.gameplay.hitMarkers}
                checked={settings.gameplay.hitMarkers}
                onChange={(v) => updateGameplay('hitMarkers', v)}
              />
              <ToggleRow
                label={t.gameplay.damageNumbers}
                checked={settings.gameplay.damageNumbers}
                onChange={(v) => updateGameplay('damageNumbers', v)}
              />
              <SelectRow
                label={t.gameplay.colorblindMode}
                value={settings.gameplay.colorblindMode}
                options={[
                  { value: 'none', label: t.gameplay.none },
                  { value: 'protanopia', label: t.gameplay.protanopia },
                  { value: 'deuteranopia', label: t.gameplay.deuteranopia },
                  { value: 'tritanopia', label: t.gameplay.tritanopia },
                ]}
                onChange={(v) => updateGameplay('colorblindMode', v as ColorblindMode)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#ede7da]/12 bg-[#141311]">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[42px] px-4 py-2 text-sm font-medium text-[#d88979] hover:text-[#f0a596] bg-[#221a18] border border-[#d88979]/25 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.resetDefaults}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-6 py-2 text-sm font-semibold text-[#141210] bg-[#d48c2e] hover:bg-[#e39b3a] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.saveClose}
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#ede7da]/8">
      <span className="text-sm text-[#e3ddd0]">{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ash-slider w-28 sm:w-36"
        />
        <span className="w-14 text-right text-xs font-mono-num text-[#d48c2e]">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#ede7da]/8">
      <span className="text-sm text-[#e3ddd0]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-md p-1 transition-colors flex items-center cursor-pointer ${
          checked ? 'bg-[#d48c2e] justify-end' : 'bg-[#2a2723] justify-start'
        }`}
      >
        <span className="w-5 h-5 rounded-sm bg-[#f5efe2] shadow" />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#ede7da]/8">
      <span className="text-sm text-[#e3ddd0]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[38px] bg-[#24211d] text-sm text-[#f4efe6] border border-[#ede7da]/18 rounded px-3 py-1 focus:outline-none focus:border-[#d48c2e]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
