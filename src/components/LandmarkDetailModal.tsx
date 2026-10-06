import React, { useEffect, useState } from 'react';
import { Landmark } from '../types';
import { LandmarkPhoto, PhotoCredit } from './LandmarkPhoto';
import {
  X,
  MapPin,
  Utensils,
  Camera,
  Umbrella,
  Bookmark,
  BookmarkCheck,
  Navigation,
  Sun,
  Sparkles,
  ExternalLink,
  TrainFront,
} from 'lucide-react';

interface LandmarkDetailModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
}

// Some STB text fields carry raw <sup> tags; show plain text only.
const stripSup = (text: string) => text.replace(/<\/?sup>/gi, '');

// STB data sometimes uses a generic placeholder instead of a real station.
const isPlaceholderMrt = (mrt: string) => {
  const v = mrt.trim().toLowerCase();
  return !v || /^(nearby|nearest)\s+mrt(\s+station)?s?$/.test(v) || v === 'mrt' || v === 'mrt station';
};

export const LandmarkDetailModal: React.FC<LandmarkDetailModalProps> = ({
  landmark,
  onClose,
  isSaved,
  onToggleSave,
  onCheckWeather,
  onGetDirections,
}) => {
  const isOpen = landmark !== null;

  // Escape to close + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!landmark) return null;

  const titleId = `landmark-detail-title-${landmark.id}`;
  const shelterLabel =
    landmark.shelterLevel === 'full_shelter'
      ? 'Rain-safe'
      : landmark.shelterLevel === 'partial_shelter'
        ? 'Partly covered'
        : 'Open air';
  const showMrt = !isPlaceholderMrt(landmark.nearestMrt);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 flex items-start sm:items-center justify-center p-4 sm:p-6 animate-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-canvas rounded-3xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative p-2 shrink-0">
          <div className="aspect-16/9 sm:aspect-21/9 rounded-2xl overflow-hidden bg-canvas-soft">
            <LandmarkPhoto landmark={landmark} alt={stripSup(landmark.name)} className="w-full h-full" />
          </div>
          <PhotoCredit landmark={landmark} className="px-2 pt-1.5" />

          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon absolute top-5 right-5 bg-canvas text-ink hover:bg-canvas-soft"
            aria-label="Close details"
          >
            <X className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 sm:px-8 pt-4 pb-6 overflow-y-auto space-y-8 text-body">
          {/* Title block */}
          <div className="space-y-3">
            <h2 id={titleId} className="display text-3xl sm:text-4xl text-ink">
              {stripSup(landmark.name)}
            </h2>
            <p className="text-base text-body">
              {landmark.neighborhood} · {landmark.region}
              {landmark.isStbAttraction && <span className="text-mute"> · Official attraction</span>}
            </p>
          </div>

          {/* Quick facts */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
            <div>
              <dt className="text-sm text-mute">Best time</dt>
              <dd className="text-base font-semibold text-ink mt-0.5">{landmark.bestTimeOfDay.split('(')[0]}</dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Time needed</dt>
              <dd className="text-base font-semibold text-ink mt-0.5 nums">{landmark.recommendedDuration}</dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Shelter</dt>
              <dd className="mt-1">
                <span className={`badge badge-sm ${landmark.shelterLevel === 'full_shelter' ? 'badge-positive' : 'badge-neutral'}`}>
                  {landmark.shelterLevel === 'full_shelter' && (
                    <Umbrella className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {shelterLabel}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Crowds</dt>
              <dd className="text-base font-semibold text-ink mt-0.5">{landmark.crowdLevel}</dd>
            </div>
          </dl>

          {/* About */}
          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-ink">About</h3>
            <p className="text-base leading-relaxed">{stripSup(landmark.description)}</p>
          </section>

          {/* Secret tip */}
          <section className="card-soft space-y-2">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
              Secret tip
            </h3>
            <p className="text-base leading-relaxed">{stripSup(landmark.secretLore)}</p>
          </section>

          {/* Photo & food tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Camera className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                Best photo spot
              </h3>
              <p className="text-base leading-relaxed">{stripSup(landmark.photoSpotTip)}</p>
            </section>
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Utensils className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                Eat nearby
              </h3>
              <p className="text-base leading-relaxed">{stripSup(landmark.localFoodTip)}</p>
            </section>
          </div>

          {/* Getting there + hours */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-ink">Getting there</h3>
            <p className="flex items-start gap-2 text-base">
              <MapPin className="w-5 h-5 text-mute shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
              <span>{stripSup(landmark.address)}</span>
            </p>
            {showMrt && (
              <p className="flex items-start gap-2 text-base">
                <TrainFront className="w-5 h-5 text-mute shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
                <span>{stripSup(landmark.nearestMrt)}</span>
              </p>
            )}
            {landmark.openingHours && (
              <div className="pt-2">
                <h4 className="text-base font-semibold text-ink">Opening hours</h4>
                <p className="text-base leading-relaxed mt-1">{stripSup(landmark.openingHours)}</p>
              </div>
            )}
            {landmark.externalLink && (
              <a
                href={landmark.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-base font-semibold text-ink underline"
              >
                <span>Official website</span>
                <ExternalLink className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
            )}
          </section>
        </div>

        {/* Actions */}
        <div className="px-6 sm:px-8 py-4 border-t border-canvas-line flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(landmark.id)}
            aria-pressed={isSaved}
            className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} mr-auto`}
          >
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Bookmark className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{isSaved ? 'Saved' : 'Save to My Trail'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCheckWeather(landmark);
            }}
            className="btn btn-sm btn-secondary"
          >
            <Sun className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Forecast</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGetDirections(landmark);
            }}
            className="btn btn-sm btn-secondary"
          >
            <Navigation className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
