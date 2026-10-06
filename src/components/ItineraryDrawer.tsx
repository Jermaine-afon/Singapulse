import React from 'react';
import { Landmark } from '../types';
import { X, Trash2, Calendar, Clock, Navigation, Sun, Umbrella, Share2, Check, AlertCircle } from 'lucide-react';

interface ItineraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedLandmarks: Landmark[];
  onRemoveFromTrail: (id: string) => void;
  onClearTrail: () => void;
  onSelectForDetails: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
  selectedDate: string;
  selectedTime: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

export const ItineraryDrawer: React.FC<ItineraryDrawerProps> = ({
  isOpen,
  onClose,
  savedLandmarks,
  onRemoveFromTrail,
  onClearTrail,
  onSelectForDetails,
  onCheckWeather,
  onGetDirections,
  selectedDate,
  selectedTime,
}) => {
  const [copyState, setCopyState] = React.useState<CopyState>('idle');
  const resetTimer = React.useRef<number | undefined>(undefined);

  // Escape to close + body scroll lock while open
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  React.useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  if (!isOpen) return null;

  const handleShare = async () => {
    const text = savedLandmarks
      .map((lm, i) => `${i + 1}. ${lm.name} (${lm.neighborhood}) - Best time: ${lm.bestTimeOfDay.split('(')[0]}`)
      .join('\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(`My Singapore Hidden Gems Trail:\n${text}`);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/60 flex justify-end animate-fade" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trail-drawer-title"
        className="w-full max-w-md bg-canvas h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="trail-drawer-title" className="display text-ink text-3xl flex items-baseline gap-3">
              <span>My Trail</span>
              <span className="text-mute text-2xl nums">{savedLandmarks.length}</span>
            </h2>
            <p className="text-sm text-body mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-mute" aria-hidden="true" />
                <span className="nums">{selectedDate}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-mute" aria-hidden="true" />
                <span>
                  Start <span className="nums">{selectedTime}</span>
                </span>
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close My Trail"
            className="btn btn-icon btn-ghost shrink-0 -mr-2 -mt-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* List */}
        <div className="px-6 pb-6 overflow-y-auto flex-1">
          {savedLandmarks.length === 0 ? (
            <div className="card-soft text-center mt-4 space-y-4">
              <p className="text-base text-body">
                Nothing saved yet. Save places while you browse and they'll line up here as your day out.
              </p>
              <button type="button" onClick={onClose} className="btn btn-sm btn-dark">
                Find places
              </button>
            </div>
          ) : (
            <>
              <ol className="divide-y divide-canvas-line border-y border-canvas-line">
                {savedLandmarks.map((lm, index) => (
                  <li key={lm.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-canvas-soft text-ink text-sm font-semibold nums flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectForDetails(lm);
                          }}
                          className="text-left text-base font-semibold text-ink leading-snug hover:underline cursor-pointer"
                        >
                          {lm.name}
                        </button>
                        <p className="text-sm text-mute mt-0.5">{lm.neighborhood}</p>
                        <p className="text-sm text-body mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Best: {lm.bestTimeOfDay.split('(')[0].trim()}</span>
                          <span aria-hidden="true">·</span>
                          <span>{lm.recommendedDuration}</span>
                          {lm.shelterLevel === 'full_shelter' && (
                            <span className="badge badge-sm badge-positive">
                              <Umbrella className="w-3 h-3" aria-hidden="true" />
                              Rain-safe
                            </span>
                          )}
                        </p>

                        <div className="flex flex-wrap items-center gap-1 mt-2 -ml-3">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onCheckWeather(lm);
                            }}
                            className="btn btn-sm btn-ghost"
                          >
                            <Sun className="w-4 h-4" aria-hidden="true" />
                            Weather
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onGetDirections(lm);
                            }}
                            className="btn btn-sm btn-ghost"
                          >
                            <Navigation className="w-4 h-4" aria-hidden="true" />
                            Get there
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveFromTrail(lm.id)}
                        aria-label={`Remove ${lm.name} from trail`}
                        title="Remove from trail"
                        className="btn btn-icon btn-ghost shrink-0 text-mute hover:text-negative-deep"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Destructive action, kept apart from the share action */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClearTrail}
                  className="btn btn-sm btn-ghost !text-negative-deep"
                >
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom action */}
        {savedLandmarks.length > 0 && (
          <div className="px-6 py-4 border-t border-canvas-line">
            <button type="button" onClick={handleShare} className="btn btn-secondary w-full">
              {copyState === 'copied' ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : copyState === 'failed' ? (
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Share2 className="w-4 h-4" aria-hidden="true" />
              )}
              <span aria-live="polite">
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? "Couldn't copy" : 'Copy trail'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
