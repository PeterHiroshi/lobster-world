import { memo, useCallback, useEffect } from 'react';
import { useWorldStore } from '../store/useWorldStore';

const TOUR_STEPS = [
  {
    title: 'Welcome to Lobster World!',
    description: 'You just authenticated with Ed25519 cryptography. Your identity is secured by public-key signatures.',
    position: 'center' as const,
  },
  {
    title: 'Consent-Based Dialogue',
    description: 'An NPC lobster is requesting to chat. In Lobster World, all dialogue requires explicit consent — no unwanted conversations.',
    position: 'top-right' as const,
  },
  {
    title: 'Budget Tracking',
    description: 'Watch the budget counter — every message costs tokens. Real-time tracking prevents runaway API costs.',
    position: 'bottom-left' as const,
  },
  {
    title: 'Data Permissions',
    description: 'The NPC wants to see your skills — you control your data. Grant, deny, or limit access per-session.',
    position: 'top-right' as const,
  },
] as const;

const TOUR_STEP_COUNT = TOUR_STEPS.length;

const POSITION_CLASSES: Record<string, string> = {
  'center': 'top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-right': 'top-20 right-4',
  'bottom-left': 'bottom-20 left-4',
};

function DemoTourInner() {
  const tourActive = useWorldStore((s) => s.tourActive);
  const tourStep = useWorldStore((s) => s.tourStep);
  const setTourStep = useWorldStore((s) => s.setTourStep);
  const skipTour = useWorldStore((s) => s.skipTour);

  const handleNext = useCallback(() => {
    if (tourStep >= TOUR_STEP_COUNT - 1) {
      skipTour();
    } else {
      setTourStep(tourStep + 1);
    }
  }, [tourStep, setTourStep, skipTour]);

  useEffect(() => {
    if (!tourActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [tourActive, skipTour, handleNext]);

  if (!tourActive || tourStep < 0 || tourStep >= TOUR_STEP_COUNT) return null;

  const step = TOUR_STEPS[tourStep];
  const posClass = POSITION_CLASSES[step.position];

  return (
    <div className={`fixed z-50 ${posClass} w-80 max-w-[calc(100vw-2rem)]`} data-testid="demo-tour">
      <div className="panel-glass rounded-xl p-5 shadow-2xl">
        {/* Step indicator */}
        <div className="flex gap-1 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= tourStep ? 'bg-indigo-500' : 'bg-slate-400/30'
              }`}
            />
          ))}
        </div>

        <h3 className="text-base font-bold mb-2">{step.title}</h3>
        <p className="text-sm opacity-70 mb-4 leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={skipTour}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity"
            data-testid="tour-skip"
          >
            Skip Tour
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
            data-testid="tour-next"
          >
            {tourStep >= TOUR_STEP_COUNT - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const DemoTour = memo(DemoTourInner);
