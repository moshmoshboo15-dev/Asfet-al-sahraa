import { useEffect } from 'react';
import type { TranslationStrings } from '@shared/i18n';
import type { PlayerProfile } from '@shared/types';

interface TitleScreenProps {
  t: TranslationStrings;
  isRtl: boolean;
  profile: PlayerProfile;
  onDeploy: () => void;
  onOpenSettings: () => void;
  onOpenHostGuide: () => void;
  onUpdateCallsign: (name: string) => void;
}

export function TitleScreen({
  t,
  isRtl,
  profile,
  onDeploy,
  onOpenSettings,
  onOpenHostGuide,
  onUpdateCallsign,
}: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onDeploy();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDeploy]);

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none select-none bg-gradient-to-t from-[#0d0c0a]/80 via-transparent to-[#0d0c0a]/55"
    >
      {/* Top Row: Callsign Input & Utility Actions */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3 bg-[#151412]/88 border border-[#ede7da]/15 rounded-md px-3.5 py-2">
          <label htmlFor="ashfront-callsign" className="text-xs text-[#b8b0a0] whitespace-nowrap">
            {t.callsign}
          </label>
          <input
            id="ashfront-callsign"
            type="text"
            maxLength={18}
            value={profile.name}
            onChange={(e) => onUpdateCallsign(e.target.value)}
            className="w-32 sm:w-40 bg-transparent text-sm font-medium text-[#f4efe6] border-b border-[#ede7da]/20 focus:border-[#d48c2e] focus:outline-none py-0.5"
          />
          <span className="text-xs text-[#9c9484] font-mono-num whitespace-nowrap">
            LVL {profile.level}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenHostGuide}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-[#ede7da] bg-[#151412]/88 border border-[#ede7da]/18 rounded-md hover:border-[#d48c2e]/70 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.hostGuide}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-[#ede7da] bg-[#151412]/88 border border-[#ede7da]/18 rounded-md hover:border-[#d48c2e]/70 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.settings}
          </button>
        </div>
      </div>

      {/* Center-Left Calm Negative Space Hero Lockup */}
      <div className="max-w-xl my-auto pointer-events-auto">
        <p className="text-xs sm:text-sm tracking-[0.14em] uppercase text-[#d8c7a6] mb-3">
          {t.sectorLabel}
        </p>

        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 520 96"
          className="w-full max-w-[440px] h-auto mb-5 drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)]"
          role="img"
          aria-label="Ashfront"
        >
          <defs>
            <linearGradient id="ashMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5efe2" />
              <stop offset="55%" stopColor="#d5cab6" />
              <stop offset="100%" stopColor="#948977" />
            </linearGradient>
          </defs>
          <rect x="0" y="78" width="128" height="3" fill="#d48c2e" />
          <rect x="136" y="78" width="24" height="3" fill="#ede7da" opacity="0.45" />
          <text
            x="0"
            y="66"
            fill="url(#ashMetal)"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="700"
            fontSize="74"
            letterSpacing="8"
          >
            ASHFRONT
          </text>
        </svg>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDeploy}
            className="min-h-[48px] px-8 py-3 text-base font-semibold tracking-wide text-[#141210] bg-[#d48c2e] hover:bg-[#e39b3a] active:scale-[0.98] rounded-md shadow-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.deploy}
          </button>
        </div>
      </div>

      {/* Flat Single-Line Control Hint */}
      <div className="text-xs sm:text-sm text-[#d6cfc2]/85 tracking-wide">
        {isTouch ? t.controlHintTouch : t.controlHintDesktop}
      </div>
    </div>
  );
}
