import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Clock, Sparkles, Navigation, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { Landmark } from '../types';
import { searchOneMap, OneMapSearchResult } from '../services/oneMapService';

interface HeroBannerProps {
  landmarks: Landmark[];
  selectedLocation: string;
  onLocationChange: (loc: string, coords?: { lat: number; lng: number }) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  onSearchSubmit: () => void;
  onQuickSelectLandmark: (landmark: Landmark) => void;
  isLiveWeatherActive: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  landmarks,
  selectedLocation,
  onLocationChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  onSearchSubmit,
  onQuickSelectLandmark,
  isLiveWeatherActive,
}) => {
  const [imgError, setImgError] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<OneMapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const featuredLandmark = landmarks[0]; // Fort Canning Tree Tunnel

  // Debounced live OneMap elastic search query
  useEffect(() => {
    if (!selectedLocation || selectedLocation.trim().length < 2) {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchOneMap(selectedLocation);
        setLiveSearchResults(results.slice(0, 5));
      } catch {
        setLiveSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedLocation]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200 pt-8 pb-12 sm:pt-12 sm:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Editorial Proposition & Planner Input */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Data Badge + Unboxed editorial subtitle */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Data.gov.sg & OneMap Connected</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500 font-normal">No Key Required for Weather</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08] font-display text-balance">
              Discover Singapore’s hidden soul, rain or shine.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Explore secret spiral staircases, pastel Peranakan shophouses, and rustic islands—paired with real-time microclimate predictions and sheltered route calculation.
            </p>

            {/* Visit Input Form Card */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* 1. Location Input with Live OneMap Autocomplete */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Destination / Spot</span>
                    </span>
                    {isSearching && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedLocation}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        onLocationChange(e.target.value);
                        setShowDropdown(true);
                      }}
                      placeholder="e.g. Fort Canning, Joo Chiat"
                      className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Autocomplete Dropdown with Live OneMap Results */}
                  {showDropdown && (liveSearchResults.length > 0 || landmarks.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {liveSearchResults.length > 0 && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          OneMap Singapore Live Geocodes
                        </div>
                      )}
                      {liveSearchResults.map((res, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            onLocationChange(res.BUILDING || res.SEARCHVAL, {
                              lat: parseFloat(res.LATITUDE),
                              lng: parseFloat(res.LONGITUDE)
                            });
                            setShowDropdown(false);
                          }}
                          className="cursor-pointer w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition border-b border-slate-50 last:border-0 flex items-start gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 block truncate">
                              {res.BUILDING || res.SEARCHVAL}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {res.ROAD_NAME} {res.POSTAL !== 'NIL' ? `(${res.POSTAL})` : ''}
                            </span>
                          </div>
                        </button>
                      ))}

                      <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Curated Hidden Gems
                      </div>
                      {landmarks.slice(0, 4).map((lm) => (
                        <button
                          key={lm.id}
                          type="button"
                          onClick={() => {
                            onQuickSelectLandmark(lm);
                            setShowDropdown(false);
                          }}
                          className="cursor-pointer w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800 truncate">{lm.name}</span>
                          <span className="text-[10px] text-emerald-700 shrink-0 font-medium">{lm.neighborhood}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Visit Date</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                </div>

                {/* 3. Time of Day Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Time of Visit</span>
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => onTimeChange(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition font-mono"
                  />
                </div>
              </div>

              {/* Action row with quick presets & CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1 sm:pb-0">
                  <span className="shrink-0 font-medium">Quick Slots:</span>
                  <button
                    onClick={() => onTimeChange('08:30')}
                    className="cursor-pointer hover:text-emerald-700 underline underline-offset-2 shrink-0 px-1 py-0.5"
                  >
                    08:30 Morning
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => onTimeChange('12:30')}
                    className="cursor-pointer hover:text-emerald-700 underline underline-offset-2 shrink-0 px-1 py-0.5"
                  >
                    12:30 Midday
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => onTimeChange('15:30')}
                    className="cursor-pointer hover:text-emerald-700 underline underline-offset-2 shrink-0 px-1 py-0.5"
                  >
                    15:30 Shower Watch
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => onTimeChange('18:00')}
                    className="cursor-pointer hover:text-emerald-700 underline underline-offset-2 shrink-0 px-1 py-0.5"
                  >
                    18:00 Sunset
                  </button>
                </div>

                <button
                  onClick={onSearchSubmit}
                  className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>Predict Weather & Discover</span>
                </button>
              </div>

            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="font-medium text-slate-700">Explore instantly:</span>
              {landmarks.slice(0, 4).map((lm) => (
                <button
                  key={lm.id}
                  onClick={() => onQuickSelectLandmark(lm)}
                  className="cursor-pointer hover:text-emerald-700 hover:underline transition-colors"
                >
                  {lm.name.split(' ')[0]} {lm.name.split(' ')[1]}
                </button>
              ))}
            </div>

          </div>

          {/* Right Column: Spotlight Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-900 aspect-4/3 group">
              {!imgError ? (
                <img
                  src={featuredLandmark.imageUrl}
                  alt={featuredLandmark.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-emerald-800 to-slate-900 flex items-center justify-center p-6 text-white text-center">
                  <div>
                    <Sparkles className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p className="font-display font-bold text-lg">{featuredLandmark.name}</p>
                    <p className="text-xs text-emerald-200 mt-1">{featuredLandmark.neighborhood}</p>
                  </div>
                </div>
              )}

              {/* Scrim overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent pointer-events-none" />

              {/* Card overlay content */}
              <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-2">
                  <span>Spotlight Gem</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredLandmark.neighborhood}</span>
                </div>
                
                <h3 className="text-xl font-bold font-display text-white mb-1.5 leading-snug">
                  {featuredLandmark.name}
                </h3>
                
                <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                  {featuredLandmark.subtitle}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs">
                  <span className="text-emerald-300 font-medium">Best: {featuredLandmark.bestTimeOfDay.split('(')[0]}</span>
                  <button
                    onClick={() => onQuickSelectLandmark(featuredLandmark)}
                    className="cursor-pointer text-white font-medium hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>View Forecast</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
