import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 px-4 pb-8 pt-3 shadow-card animate-slide-up">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-[12px] font-medium text-white/40">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/60"
          >
            <X size={15} strokeWidth={3} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
