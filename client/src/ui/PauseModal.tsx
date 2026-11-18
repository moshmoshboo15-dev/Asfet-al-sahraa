import type { TranslationStrings } from '@shared/i18n';

interface PauseModalProps {
  t: TranslationStrings;
  isRtl: boolean;
  onResume: () => void;
  onRestartPos: () => void;
  onEditHud: () => void;
  onOpenSettings: () => void;
  onReturnMenu: () => void;
}

export function PauseModal({
  t,
  isRtl,
  onResume,
  onRestartPos,
  onEditHud,
  onOpenSettings,
  onReturnMenu,
}: PauseModalProps) {
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#0b0a09]/78"
    >
      <div className="w-full max-w-sm bg-[#181614] border border-[#ede7da]/16 rounded-lg p-6 shadow-2xl space-y-3">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-[#f4efe6] mb-4">
          {t.pausedTitle}
        </h2>

        <button
          type="button"
          onClick={onResume}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold text-[#141210] bg-[#d48c2e] hover:bg-[#e39b3a] rounded-md transition-colors cursor-pointer"
        >
          {t.resume}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#ede7da] bg-[#24211d] hover:bg-[#2d2a25] border border-[#ede7da]/14 rounded-md transition-colors cursor-pointer"
        >
          {t.settings}
        </button>

        <button
          type="button"
          onClick={onEditHud}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#ede7da] bg-[#24211d] hover:bg-[#2d2a25] border border-[#ede7da]/14 rounded-md transition-colors cursor-pointer"
        >
          {t.editHud}
        </button>

        <button
          type="button"
          onClick={onRestartPos}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#ede7da] bg-[#24211d] hover:bg-[#2d2a25] border border-[#ede7da]/14 rounded-md transition-colors cursor-pointer"
        >
          {t.restartPosition}
        </button>

        <button
          type="button"
          onClick={onReturnMenu}
          className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#d88979] bg-[#221a18] hover:bg-[#2c211e] border border-[#d88979]/25 rounded-md transition-colors cursor-pointer"
        >
          {t.returnMenu}
        </button>
      </div>
    </div>
  );
}
