import React, { useState } from 'react';
import { Landmark } from '../types';
import {
  MapPin,
  Clock,
  Compass,
  Bookmark,
  BookmarkCheck,
  Umbrella,
  Eye,
  Sun,
  Navigation,
  Sparkles
} from 'lucide-react';

interface LandmarkCardProps {
  landmark: Landmark;
  isSaved: boolean;
  onToggleSave: (landmarkId: string) => void;
  onSelectForDetails: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
}

export const LandmarkCard: React.FC<LandmarkCardProps> = ({
  landmark,
  isSaved,
  onToggleSave,
  onSelectForDetails,
  onCheckWeather,
  onGetDirections,
}) => {
  const [imageError, setImageError] = useState(false);

  // Category label formatter
  const getCategoryLabel = (cat: Landmark['category']) => {
    switch (cat) {
      case 'architecture':
        return 'Architecture';
      case 'heritage':
        return 'Cultural Heritage';
      case 'greenery':
        return 'Secret Trail';
      case 'eats_culture':
        return 'Alley & Cafe';
      case 'coastal':
        return 'Coastal Island';
      default:
        return 'Landmark';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col group">
      
      {/* Visual Asset Container (4:3 aspect ratio) */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
        {!imageError ? (
          <img
            src={landmark.imageUrl}
            alt={landmark.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-slate-800 to-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="font-display font-bold text-base">{landmark.name}</span>
            <span className="text-xs text-slate-300 mt-1">{landmark.neighborhood}</span>
          </div>
        )}

        {/* Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

        {/* Quick Bookmark Button Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(landmark.id);
          }}
          aria-label={isSaved ? 'Remove from saved' : 'Save landmark to trail'}
          className={`cursor-pointer absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md transition-colors ${
            isSaved
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-slate-900/60 text-white hover:bg-slate-900/90'
          }`}
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4 text-white" />
          ) : (
            <Bookmark className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Bottom image overlay metadata: unboxed quiet text */}
        <div className="absolute bottom-3 left-3 right-3 text-white text-xs flex items-center justify-between pointer-events-none">
          <span className="font-semibold text-emerald-300 drop-shadow-sm">
            {landmark.neighborhood} · {landmark.region}
          </span>
          {landmark.shelterLevel === 'full_shelter' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-200 drop-shadow-sm">
              <Umbrella className="w-3 h-3 text-emerald-400" />
              <span>Covered Walk</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        <div className="space-y-2">
          {/* Unboxed 1-line text kicker */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            {landmark.isStbAttraction ? (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                STB Attraction
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Curated Gem
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{getCategoryLabel(landmark.category)}</span>
            <span aria-hidden="true">·</span>
            <span>{landmark.recommendedDuration}</span>
          </div>

          {/* Primary Title */}
          <h3 className="text-lg font-bold text-slate-900 font-display leading-snug group-hover:text-emerald-700 transition-colors">
            {landmark.name}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {landmark.description}
          </p>

          {/* Secret Lore Quote Box */}
          <div className="p-2.5 rounded-lg bg-amber-50/60 border-l-2 border-amber-500 text-xs text-amber-950 font-normal">
            <span className="font-semibold text-amber-900">Secret Tip: </span>
            <span className="line-clamp-2">{landmark.secretLore}</span>
          </div>
        </div>

        {/* Card Footer: Metadata and Actions */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          
          {/* MRT location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{landmark.nearestMrt}</span>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSelectForDetails(landmark)}
              className="cursor-pointer py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1 transition"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">Story</span>
            </button>

            <button
              onClick={() => onCheckWeather(landmark)}
              className="cursor-pointer py-2 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1 transition border border-emerald-100"
            >
              <Sun className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">Forecast</span>
            </button>

            <button
              onClick={() => onGetDirections(landmark)}
              className="cursor-pointer py-2 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1 transition"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">Route</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
