import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CloudSun } from 'lucide-react';
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

// OneMap uses the string "NIL" for missing fields
const getOneMapResultName = (res: OneMapSearchResult) =>
  res.BUILDING && res.BUILDING !== 'NIL' ? res.BUILDING : res.SEARCHVAL;

const QUICK_SLOTS: { time: string; label: string }[] = [
  { time: '08:30', label: 'Morning' },
  { time: '12:30', label: 'Midday' },
  { time: '15:30', label: 'Afternoon showers' },
  { time: '18:00', label: 'Sunset' },
];

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
}) => {
  const [liveSearchResults, setLiveSearchResults] = useState<OneMapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced live OneMap search query
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
    <section aria-labelledby="weather-visit-heading" className="space-y-6">
      <div className="space-y-3">
        <h2 id="weather-visit-heading" className="display text-3xl sm:text-4xl text-ink">
          Weather for your visit
        </h2>
        <p className="text-base text-body max-w-2xl">
          Check conditions at a place and time, live now or estimated ahead.
        </p>
      </div>

      <div className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
          {/* Place with live OneMap autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="visit-place" className="field-label flex items-center justify-between">
              <span>Place</span>
              {isSearching && (
                <Loader2 className="w-4 h-4 text-mute animate-spin" aria-label="Searching" />
              )}
            </label>
            <input
              id="visit-place"
              type="text"
              autoComplete="off"
              value={selectedLocation}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                onLocationChange(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="e.g. Fort Canning, Joo Chiat"
              className="input"
            />

            {showDropdown && (liveSearchResults.length > 0 || landmarks.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-canvas rounded-2xl shadow-[0_8px_24px_rgb(14_15_12/0.12)] overflow-hidden max-h-72 overflow-y-auto py-2 animate-fade">
                {liveSearchResults.length > 0 && (
                  <div className="px-4 pt-1 pb-1 text-sm font-semibold text-mute">Places in Singapore</div>
                )}
                {liveSearchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onLocationChange(getOneMapResultName(res), {
                        lat: parseFloat(res.LATITUDE),
                        lng: parseFloat(res.LONGITUDE)
                      });
                      setShowDropdown(false);
                    }}
                    className="cursor-pointer w-full text-left px-4 py-2.5 min-h-[44px] hover:bg-canvas-soft transition-colors flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-mute shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="text-sm font-semibold text-ink block truncate">
                        {getOneMapResultName(res)}
                      </span>
                      <span className="text-sm text-mute block truncate">
                        {res.ROAD_NAME} {res.POSTAL !== 'NIL' ? `(${res.POSTAL})` : ''}
                      </span>
                    </span>
                  </button>
                ))}

                <div className="px-4 pt-3 pb-1 text-sm font-semibold text-mute">Hidden gems</div>
                {landmarks.slice(0, 4).map((lm) => (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => {
                      onQuickSelectLandmark(lm);
                      setShowDropdown(false);
                    }}
                    className="cursor-pointer w-full text-left px-4 py-2.5 min-h-[44px] hover:bg-canvas-soft transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-semibold text-ink truncate">{lm.name}</span>
                    <span className="text-sm text-mute shrink-0">{lm.neighborhood}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="visit-date" className="field-label">Date</label>
            <input
              id="visit-date"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="input nums"
            />
          </div>

          {/* Time */}
          <div>
            <label htmlFor="visit-time" className="field-label">Time</label>
            <input
              id="visit-time"
              type="time"
              value={selectedTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="input nums"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick times">
            {QUICK_SLOTS.map((slot) => (
              <button
                key={slot.time}
                type="button"
                className="chip"
                aria-pressed={selectedTime === slot.time}
                onClick={() => onTimeChange(slot.time)}
              >
                <span className="nums">{slot.time}</span>
                <span className="font-normal">{slot.label}</span>
              </button>
            ))}
          </div>

          <button type="button" onClick={onSearchSubmit} className="btn btn-primary w-full sm:w-auto">
            <CloudSun className="w-5 h-5" />
            <span>Check weather</span>
          </button>
        </div>
      </div>
    </section>
  );
};
