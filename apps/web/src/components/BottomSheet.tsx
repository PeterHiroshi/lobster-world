import { memo, useCallback, useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function BottomSheetInner({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={handleBackdropClick}
      data-testid="bottom-sheet-backdrop"
    >
      <div
        ref={sheetRef}
        className="w-full max-h-[70vh] panel-glass rounded-t-2xl overflow-hidden animate-slide-up"
        data-testid="bottom-sheet"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-400/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-300/20 dark:border-slate-700/50">
          <h3 className="text-sm font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-sm opacity-50 hover:opacity-100 transition-opacity"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export const BottomSheet = memo(BottomSheetInner);
