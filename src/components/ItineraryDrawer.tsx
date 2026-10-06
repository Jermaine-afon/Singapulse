import React from 'react';
import { Landmark } from '../types';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  Navigation,
  Sun,
  Umbrella,
  Share2,
  Check,
  Compass,
  ArrowRight
} from 'lucide-react';

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
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleShare = () => {
    const text = savedLandmarks
      .map((lm, i) => `${i + 1}. ${lm.name} (${lm.neighborhood}) - Best time: ${lm.bestTimeOfDay.split('(')[0]}`)
      .join('\n');
    navigator.clipboard?.writeText?.(`My Singapore Hidden Gems Trail:\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Top Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Singapore Tourist Itinerary</span>
            </div>
            <h3 className="text-lg font-bold font-display text-white mt-0.5">
              My Expedition Trail ({savedLandmarks.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trail Items List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Quick Schedule Context Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Visit Date: {selectedDate}</span>
            </span>
            <span className="font-mono text-emerald-700 font-semibold">
              Planned Start: {selectedTime}
            </span>
          </div>

          {savedLandmarks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-800">Your Trail is Empty</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Explore off-the-beaten-path landmarks and bookmark them with the ribbon icon to build your custom itinerary.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedLandmarks.map((lm, index) => (
                <div
                  key={lm.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-mono flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {lm.neighborhood}
                        </div>
                        <h4 className="text-sm font-bold font-display text-slate-900 leading-snug">
                          {lm.name}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>{lm.recommendedDuration}</span>
                          <span>·</span>
                          <span>{lm.shelterLevel === 'full_shelter' ? 'Fully Sheltered' : 'Outdoor'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveFromTrail(lm.id)}
                      className="cursor-pointer text-slate-400 hover:text-rose-600 transition p-1"
                      title="Remove from itinerary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Card Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectForDetails(lm);
                      }}
                      className="cursor-pointer py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition text-center truncate"
                    >
                      Story
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onCheckWeather(lm);
                      }}
                      className="cursor-pointer py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-800 font-medium transition text-center truncate flex items-center justify-center gap-1"
                    >
                      <Sun className="w-3 h-3 text-emerald-600" />
                      <span>Forecast</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onGetDirections(lm);
                      }}
                      className="cursor-pointer py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white font-medium transition text-center truncate flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3 h-3 text-emerald-400" />
                      <span>Route</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Drawer Bottom Action Strip */}
        {savedLandmarks.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <button
              onClick={handleShare}
              className="cursor-pointer w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Copied Trail to Clipboard!' : 'Copy / Share Expedition Trail'}</span>
            </button>

            <button
              onClick={onClearTrail}
              className="cursor-pointer w-full py-2 text-slate-500 hover:text-rose-600 text-xs font-medium transition"
            >
              Clear all landmarks
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
