import type { TranslationStrings } from '@shared/i18n';

interface HostHelpModalProps {
  t: TranslationStrings;
  isRtl: boolean;
  onClose: () => void;
}

export function HostHelpModal({ t, isRtl, onClose }: HostHelpModalProps) {
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#0b0a09]/82"
    >
      <div className="w-full max-w-xl bg-[#181614] border border-[#ede7da]/16 rounded-lg p-6 shadow-2xl space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-[#f4efe6]">
            {t.host.title}
          </h2>
          <p className="text-sm text-[#b8b0a0] mt-1">{t.host.subtitle}</p>
        </div>

        <div className="space-y-3 text-sm text-[#dcd4c5]">
          <div className="p-3.5 bg-[#12110f] border border-[#ede7da]/10 rounded-md">
            <div className="font-semibold text-[#d48c2e] mb-1">{t.host.step1Title}</div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#cfc7b8]">{t.host.step1Body}</p>
          </div>

          <div className="p-3.5 bg-[#12110f] border border-[#ede7da]/10 rounded-md">
            <div className="font-semibold text-[#d48c2e] mb-1">{t.host.step2Title}</div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#cfc7b8]">{t.host.step2Body}</p>
          </div>

          <div className="p-3.5 bg-[#12110f] border border-[#ede7da]/10 rounded-md">
            <div className="font-semibold text-[#d48c2e] mb-1">{t.host.step3Title}</div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#cfc7b8]">{t.host.step3Body}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-6 py-2 text-sm font-semibold text-[#141210] bg-[#d48c2e] hover:bg-[#e39b3a] rounded-md transition-colors cursor-pointer"
          >
            {t.host.close}
          </button>
        </div>
      </div>
    </div>
  );
}
