import { useRef, useState } from 'react';
import type { TranslationStrings } from '@shared/i18n';
import type { GameSettings, HudElementPosition, HudLayout, HudTelemetry } from '@shared/types';
import { createDefaultHudLayout } from '@shared/settingsDefaults';
import type { GameEngine } from '../engine/GameEngine';

interface TouchHudProps {
  t: TranslationStrings;
  settings: GameSettings;
  telemetry: HudTelemetry;
  engine: GameEngine | null;
  isHudEditing: boolean;
  onPause: () => void;
  onUpdateHudLayout: (layout: HudLayout) => void;
  onExitHudEdit: () => void;
}

type HudControlKey = keyof HudLayout;

export function TouchHud({
  t,
  settings,
  telemetry,
  engine,
  isHudEditing,
  onPause,
  onUpdateHudLayout,
  onExitHudEdit,
}: TouchHudProps) {
  const isTouchDevice =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const showTouchControls = isTouchDevice || settings.controls.forceTouchHud || isHudEditing;

  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dynamicOrigin, setDynamicOrigin] = useState<{ x: number; y: number } | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const joyCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const lookPointerId = useRef<number | null>(null);
  const lookPrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragControlRef = useRef<{ key: HudControlKey; pointerId: number } | null>(null);

  const hitMarkerActive =
    settings.gameplay.hitMarkers && performance.now() - telemetry.lastHitTimestamp < 200;

  const layout = settings.controls.hudLayout;
  const joyRadius = 46 * (settings.controls.joystickSize / 100);
  const joyOpacity = settings.controls.joystickOpacity / 100;

  // HUD Layout Editor Drag Handlers
  const startDragHudElement = (key: HudControlKey, e: React.PointerEvent) => {
    if (!isHudEditing) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragControlRef.current = { key, pointerId: e.pointerId };
  };

  const moveDragHudElement = (e: React.PointerEvent) => {
    if (!isHudEditing || !dragControlRef.current || dragControlRef.current.pointerId !== e.pointerId) return;
    const xPct = Math.max(4, Math.min(96, (e.clientX / window.innerWidth) * 100));
    const yPct = Math.max(6, Math.min(92, (e.clientY / window.innerHeight) * 100));
    const k = dragControlRef.current.key;
    onUpdateHudLayout({
      ...layout,
      [k]: { ...layout[k], xPct, yPct },
    });
  };

  const endDragHudElement = () => {
    dragControlRef.current = null;
  };

  // Virtual Joystick Touch Handlers
  const handleJoyDown = (e: React.PointerEvent) => {
    if (isHudEditing) return startDragHudElement('joystick', e);
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx =
      settings.controls.joystickPosition === 'dynamic'
        ? e.clientX
        : rect.left + rect.width / 2;
    const cy =
      settings.controls.joystickPosition === 'dynamic'
        ? e.clientY
        : rect.top + rect.height / 2;
    joyCenterRef.current = { x: cx, y: cy };
    if (settings.controls.joystickPosition === 'dynamic') {
      setDynamicOrigin({ x: cx, y: cy });
    }
    setStickOffset({ x: 0, y: 0 });
  };

  const handleJoyMove = (e: React.PointerEvent) => {
    if (isHudEditing) return moveDragHudElement(e);
    if (joyPointerId.current !== e.pointerId) return;
    const dx = e.clientX - joyCenterRef.current.x;
    const dy = e.clientY - joyCenterRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(joyRadius, dist);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;
    setStickOffset({ x: ox, y: oy });
    engine?.setTouchMove(ox / joyRadius, -oy / joyRadius);
  };

  const handleJoyUp = (e: React.PointerEvent) => {
    if (isHudEditing) return endDragHudElement();
    if (joyPointerId.current !== e.pointerId) return;
    joyPointerId.current = null;
    setDynamicOrigin(null);
    setStickOffset({ x: 0, y: 0 });
    engine?.setTouchMove(0, 0);
  };

  // Right-half Swipe-to-Look Surface (only active when touch controls shown and not editing)
  const handleLookDown = (e: React.PointerEvent) => {
    if (isHudEditing || !showTouchControls) return;
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lookPrevRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lookPrevRef.current.x;
    const dy = e.clientY - lookPrevRef.current.y;
    lookPrevRef.current = { x: e.clientX, y: e.clientY };
    engine?.applyTouchLook(dx * 1.4, dy * 1.4);
  };

  const handleLookUp = (e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return;
    lookPointerId.current = null;
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Right-Side Touch Look Zone */}
      {showTouchControls && !isHudEditing && (
        <div
          onPointerDown={handleLookDown}
          onPointerMove={handleLookMove}
          onPointerUp={handleLookUp}
          onPointerCancel={handleLookUp}
          className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-auto touch-none"
        />
      )}

      {/* Top-Left Pause Button */}
      <button
        type="button"
        onClick={isHudEditing ? undefined : onPause}
        onPointerDown={(e) => isHudEditing && startDragHudElement('pause', e)}
        onPointerMove={moveDragHudElement}
        onPointerUp={endDragHudElement}
        style={posStyle(layout.pause)}
        className={`pointer-events-auto min-w-[44px] min-h-[44px] px-3.5 py-2 flex items-center justify-center bg-[#151412]/80 border rounded-md text-xs font-semibold tracking-wider text-[#ede7da] hover:border-[#d48c2e] cursor-pointer ${
          isHudEditing ? 'border-[#d48c2e] border-dashed' : 'border-[#ede7da]/18'
        }`}
      >
        II
      </button>

      {/* Top-Right FPS & Ping Counter */}
      {settings.graphics.showFpsPing && (
        <div className="absolute top-3 right-4 flex items-center gap-3 bg-[#151412]/78 border border-[#ede7da]/12 rounded px-3 py-1.5 text-xs font-mono-num text-[#d8d0c1]">
          <span>{telemetry.fps} FPS</span>
          <span className="text-[#ede7da]/30">/</span>
          <span>{telemetry.pingMs} ms</span>
        </div>
      )}

      {/* Desktop Pointer Lock Hint */}
      {!showTouchControls && !telemetry.pointerLocked && !isHudEditing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#151412]/85 border border-[#ede7da]/15 rounded px-4 py-1.5 text-xs text-[#e6decb]">
          {t.hud.clickToAim}
        </div>
      )}

      {/* Center Reticle (Crosshair) — fades out when ADS on iron sights */}
      {!telemetry.isAds && !isHudEditing && (
        <Crosshair
          styleType={settings.gameplay.crosshairStyle}
          color={settings.gameplay.crosshairColor}
          spreadPx={telemetry.crosshairSpreadPx}
        />
      )}

      {/* Hit Marker Flash */}
      {hitMarkerActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            className={telemetry.lastHitCritical ? 'text-[#e85d44]' : 'text-[#f5efe2]'}
          >
            <line x1="5" y1="5" x2="10" y2="10" stroke="currentColor" strokeWidth="2.4" />
            <line x1="23" y1="5" x2="18" y2="10" stroke="currentColor" strokeWidth="2.4" />
            <line x1="5" y1="23" x2="10" y2="18" stroke="currentColor" strokeWidth="2.4" />
            <line x1="23" y1="23" x2="18" y2="18" stroke="currentColor" strokeWidth="2.4" />
          </svg>
        </div>
      )}

      {/* Floating Damage Number */}
      {settings.gameplay.damageNumbers &&
        telemetry.lastDamage !== null &&
        telemetry.lastDamageScreenPos && (
          <div
            className={`absolute font-mono-num text-sm font-bold -translate-x-1/2 -translate-y-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              telemetry.lastHitCritical ? 'text-[#f27c5c] text-base' : 'text-[#f6e8c8]'
            }`}
            style={{
              left: telemetry.lastDamageScreenPos.x,
              top: telemetry.lastDamageScreenPos.y,
            }}
          >
            {telemetry.lastDamage}
          </div>
        )}

      {/* Bottom-Left Health & Stance Cluster */}
      <div className="absolute bottom-4 left-4 flex items-baseline gap-3 bg-[#151412]/80 border border-[#ede7da]/15 rounded-md px-3.5 py-2">
        <span className="font-mono-num text-2xl font-bold text-[#f3efe4]">{telemetry.hp}</span>
        <span className="text-xs uppercase tracking-wider text-[#b6ae9e]">
          {telemetry.isSprinting
            ? t.hud.sprinting
            : telemetry.isCrouching
              ? t.hud.crouching
              : t.hud.standing}
        </span>
      </div>

      {/* Bottom-Right Weapon & Ammo Cluster */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end bg-[#151412]/80 border border-[#ede7da]/15 rounded-md px-3.5 py-2 min-w-[168px]">
        <span className="text-xs tracking-wider uppercase text-[#c7baa2]">
          {telemetry.weaponName}
        </span>
        <div className="flex items-baseline gap-1.5 font-mono-num">
          <span className="text-2xl font-bold text-[#f3efe4]">{telemetry.ammoInMag}</span>
          <span className="text-sm text-[#9c9484]">/ {telemetry.ammoReserve}</span>
        </div>
        {(telemetry.isReloading || telemetry.isCyclingBolt) && (
          <div className="w-full mt-1">
            <div className="text-[11px] text-[#d48c2e] mb-0.5">
              {telemetry.isReloading ? t.hud.reloading : t.hud.cycling}
            </div>
            {telemetry.isReloading && (
              <div className="w-full h-1 bg-[#2c2822] rounded overflow-hidden">
                <div
                  className="h-full bg-[#d48c2e]"
                  style={{ width: `${Math.round(telemetry.reloadProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Touch Controls Layer */}
      {showTouchControls && (
        <>
          {/* Virtual Movement Joystick */}
          <div
            onPointerDown={handleJoyDown}
            onPointerMove={handleJoyMove}
            onPointerUp={handleJoyUp}
            onPointerCancel={handleJoyUp}
            style={{
              ...posStyle(layout.joystick),
              width: joyRadius * 2.2,
              height: joyRadius * 2.2,
              opacity: isHudEditing ? 1 : joyOpacity,
            }}
            className={`pointer-events-auto touch-none rounded-full border-2 flex items-center justify-center bg-[#151412]/40 ${
              isHudEditing ? 'border-[#d48c2e] border-dashed' : 'border-[#ede7da]/30'
            }`}
          >
            {!dynamicOrigin && (
              <div
                className="w-11 h-11 rounded-full bg-[#ede7da]/75 border border-[#151412]"
                style={{
                  transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                }}
              />
            )}
          </div>

          {dynamicOrigin && (
            <div
              className="fixed w-11 h-11 rounded-full bg-[#ede7da]/80 border border-[#151412] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: dynamicOrigin.x + stickOffset.x,
                top: dynamicOrigin.y + stickOffset.y,
                opacity: joyOpacity,
              }}
            />
          )}

          {/* Primary Fire Button */}
          <TouchActionBtn
            label={t.hud.fire}
            pos={layout.firePrimary}
            size={68}
            accent
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('firePrimary', e);
              engine?.triggerFire(true);
            }}
            onMove={moveDragHudElement}
            onUp={() => {
              if (isHudEditing) return endDragHudElement();
              engine?.triggerFire(false);
            }}
          />

          {/* Secondary Left-Side Fire / Thumb Convenience Button */}
          <TouchActionBtn
            label={t.hud.fire}
            pos={layout.fireSecondary}
            size={52}
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('fireSecondary', e);
              engine?.triggerFire(true);
            }}
            onMove={moveDragHudElement}
            onUp={() => {
              if (isHudEditing) return endDragHudElement();
              engine?.triggerFire(false);
            }}
          />

          {/* ADS Toggle */}
          <TouchActionBtn
            label={t.hud.aim}
            pos={layout.ads}
            size={54}
            active={telemetry.isAds}
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('ads', e);
              engine?.toggleTouchAds();
            }}
            onMove={moveDragHudElement}
            onUp={() => isHudEditing && endDragHudElement()}
          />

          {/* Reload */}
          <TouchActionBtn
            label={t.hud.reload}
            pos={layout.reload}
            size={50}
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('reload', e);
              engine?.triggerReload();
            }}
            onMove={moveDragHudElement}
            onUp={() => isHudEditing && endDragHudElement()}
          />

          {/* Crouch */}
          <TouchActionBtn
            label={t.hud.crouch}
            pos={layout.crouch}
            size={48}
            active={telemetry.isCrouching}
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('crouch', e);
              engine?.triggerCrouch();
            }}
            onMove={moveDragHudElement}
            onUp={() => isHudEditing && endDragHudElement()}
          />

          {/* Jump */}
          <TouchActionBtn
            label={t.hud.jump}
            pos={layout.jump}
            size={48}
            editing={isHudEditing}
            onDown={(e) => {
              if (isHudEditing) return startDragHudElement('jump', e);
              engine?.triggerJump();
            }}
            onMove={moveDragHudElement}
            onUp={() => isHudEditing && endDragHudElement()}
          />
        </>
      )}

      {/* HUD Editor Banner */}
      {isHudEditing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-wrap items-center gap-3 bg-[#151412]/95 border border-[#d48c2e]/50 rounded-md px-4 py-2.5 shadow-xl">
          <div>
            <div className="text-sm font-semibold text-[#f3efe4]">{t.hud.hudEditorTitle}</div>
            <div className="text-xs text-[#b8b0a0]">{t.hud.hudEditorHint}</div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateHudLayout(createDefaultHudLayout(settings.controls.fireButtonSide))}
            className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-[#272420] text-[#ede7da] rounded border border-[#ede7da]/15 cursor-pointer"
          >
            {t.hud.resetLayout}
          </button>
          <button
            type="button"
            onClick={onExitHudEdit}
            className="min-h-[38px] px-4 py-1.5 text-xs font-semibold bg-[#d48c2e] text-[#141210] rounded cursor-pointer"
          >
            {t.hud.done}
          </button>
        </div>
      )}
    </div>
  );
}

function posStyle(pos: HudElementPosition): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${pos.xPct}%`,
    top: `${pos.yPct}%`,
    transform: `translate(-50%, -50%) scale(${pos.scale})`,
  };
}

function TouchActionBtn({
  label,
  pos,
  size,
  accent = false,
  active = false,
  editing,
  onDown,
  onMove,
  onUp,
}: {
  label: string;
  pos: HudElementPosition;
  size: number;
  accent?: boolean;
  active?: boolean;
  editing: boolean;
  onDown: (e: React.PointerEvent) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onDown(e);
      }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ ...posStyle(pos), width: size, height: size }}
      className={`pointer-events-auto touch-none rounded-full flex items-center justify-center text-[11px] font-bold tracking-wider border transition-transform active:scale-95 ${
        editing
          ? 'border-[#d48c2e] border-dashed bg-[#181614]/85 text-[#f3efe4]'
          : accent
            ? 'bg-[#d48c2e]/85 border-[#f4dfb6]/60 text-[#141210]'
            : active
              ? 'bg-[#ede7da]/85 border-[#f5efe2] text-[#141210]'
              : 'bg-[#151412]/72 border-[#ede7da]/30 text-[#f3efe4]'
      }`}
    >
      {label}
    </button>
  );
}

function Crosshair({
  styleType,
  color,
  spreadPx,
}: {
  styleType: GameSettings['gameplay']['crosshairStyle'];
  color: string;
  spreadPx: number;
}) {
  const gap = styleType === 'dynamic' ? spreadPx : 6;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {styleType === 'dot' && (
        <span
          className="w-1.5 h-1.5 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          style={{ backgroundColor: color }}
        />
      )}
      {styleType === 'chevron' && (
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ color }}>
          <polyline
            points="6,15 12,9 18,15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      )}
      {(styleType === 'cross' || styleType === 'dynamic') && (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: color, opacity: 0.85 }}
          />
          <span
            className="absolute w-[2px] h-2.5"
            style={{ backgroundColor: color, transform: `translateY(${-gap - 4}px)` }}
          />
          <span
            className="absolute w-[2px] h-2.5"
            style={{ backgroundColor: color, transform: `translateY(${gap + 4}px)` }}
          />
          <span
            className="absolute h-[2px] w-2.5"
            style={{ backgroundColor: color, transform: `translateX(${-gap - 4}px)` }}
          />
          <span
            className="absolute h-[2px] w-2.5"
            style={{ backgroundColor: color, transform: `translateX(${gap + 4}px)` }}
          />
        </div>
      )}
    </div>
  );
}
