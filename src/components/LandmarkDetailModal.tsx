import React, { useState } from 'react';
import { Landmark } from '../types';
import {
  X,
  MapPin,
  Clock,
  Utensils,
  Camera,
  Umbrella,
  Compass,
  Bookmark,
  BookmarkCheck,
  Navigation,
  Sun,
  Shield,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface LandmarkDetailModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
}

export const LandmarkDetailModal: React.FC<LandmarkDetailModalProps> = ({
  landmark,
  onClose,
  isSaved,
  onToggleSave,
  onCheckWeather,
  onGetDirections,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!landmark) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Visual Header */}
        <div className="relative aspect-16/9 sm:aspect-21/9 bg-slate-950 shrink-0">
          {!imageError ? (
            <img
              src={landmark.imageUrl}
              alt={landmark.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-slate-900 to-emerald-950 flex items-center justify-center text-white">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
          )}

          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white transition backdrop-blur-xs"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Unboxed Header Metadata on Image */}
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-1 flex flex-wrap items-center gap-2">
              {landmark.isStbAttraction && (
                <span className="bg-rose-950/80 text-rose-300 border border-rose-700 px-1.5 py-0.5 rounded text-[10px]">
                  STB Official Attraction
                </span>
              )}
              <span>{landmark.neighborhood}</span>
              <span aria-hidden="true">·</span>
              <span>{landmark.region} Region</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
              {landmark.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Quick Stats Grid: unboxed tabular stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Recommended Time</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{landmark.bestTimeOfDay.split('(')[0]}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Visit Duration</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{landmark.recommendedDuration}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Shelter Rating</span>
              <span className="font-semibold text-slate-800 mt-0.5 block flex items-center gap-1">
                {landmark.shelterLevel === 'full_shelter' ? 'Fully Covered' : landmark.shelterLevel === 'partial_shelter' ? 'Partial Cover' : 'Open Air'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Crowd Level</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{landmark.crowdLevel}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Overview & Architecture
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {landmark.description}
            </p>
          </div>

          {/* Secret Lore Story */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Secret Local Lore & Background</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
              {landmark.secretLore}
            </p>
          </div>

          {/* Highlights & Photo Spot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Photo Tip */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Tourist Photo Spot Angle</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {landmark.photoSpotTip}
              </p>
            </div>

            {/* Local Food */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-rose-500" />
                <span>Nearby Local Food Pairing</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {landmark.localFoodTip}
              </p>
            </div>

          </div>

          {/* Transit & Address */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-700 uppercase tracking-wider">
              Transit & Access
            </div>
            <div className="text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{landmark.address}</span>
            </div>
            <div className="text-emerald-800 font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{landmark.nearestMrt}</span>
            </div>
          </div>

          {/* Visiting Hours & Website */}
          {(landmark.openingHours || landmark.externalLink) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              {landmark.openingHours && (
                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                    Operating Hours
                  </div>
                  <p className="text-slate-600 leading-relaxed">{landmark.openingHours}</p>
                </div>
              )}
              {landmark.externalLink && (
                <div className="pt-0.5">
                  <a
                    href={landmark.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visit Official Website</span>
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onToggleSave(landmark.id)}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isSaved
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-700" /> : <Bookmark className="w-4 h-4 text-slate-500" />}
            <span>{isSaved ? 'Saved in My Trail' : 'Save to Trail'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onCheckWeather(landmark);
              }}
              className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Sun className="w-4 h-4" />
              <span>Predict Weather Here</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onGetDirections(landmark);
              }}
              className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Route Directions</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
