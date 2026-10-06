import React, { useState, useMemo } from 'react';
import { Landmark, LandmarkCategory } from '../types';
import { LandmarkCard } from './LandmarkCard';
import { Search, Umbrella, Sparkles, Filter, SlidersHorizontal, MapPin } from 'lucide-react';

interface LandmarkExplorerProps {
  landmarks: Landmark[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onSelectForDetails: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
  initialSearchQuery?: string;
  rainForecastActive?: boolean;
}

export const LandmarkExplorer: React.FC<LandmarkExplorerProps> = ({
  landmarks,
  savedIds,
  onToggleSave,
  onSelectForDetails,
  onCheckWeather,
  onGetDirections,
  initialSearchQuery = '',
  rainForecastActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [weatherFilter, setWeatherFilter] = useState<'all' | 'sheltered' | 'quiet'>('all');

  const categories = [
    { id: 'all', label: `All Spots (${landmarks.length})` },
    { id: 'stb', label: 'STB Official' },
    { id: 'curated', label: 'Hidden Gems' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'heritage', label: 'Heritage' },
    { id: 'greenery', label: 'Greenery' },
    { id: 'eats_culture', label: 'Alleys & Food' },
    { id: 'coastal', label: 'Coastal Island' },
  ];

  const filteredLandmarks = useMemo(() => {
    return landmarks.filter((lm) => {
      // Category and Source filter
      if (selectedCategory === 'stb') {
        if (!lm.isStbAttraction) return false;
      } else if (selectedCategory === 'curated') {
        if (lm.isStbAttraction) return false;
      } else if (selectedCategory !== 'all' && lm.category !== selectedCategory) {
        return false;
      }

      // Weather & Comfort Filter
      if (weatherFilter === 'sheltered' && lm.shelterLevel === 'open_air') {
        return false;
      }
      if (weatherFilter === 'quiet' && lm.crowdLevel === 'Lively') {
        return false;
      }

      // Text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = lm.name.toLowerCase().includes(query);
        const matchesNeighborhood = lm.neighborhood.toLowerCase().includes(query);
        const matchesRegion = lm.region.toLowerCase().includes(query);
        const matchesDesc = lm.description.toLowerCase().includes(query);
        const matchesHighlights = lm.highlights.some((h) => h.toLowerCase().includes(query));
        return matchesName || matchesNeighborhood || matchesRegion || matchesDesc || matchesHighlights;
      }

      return true;
    });
  }, [landmarks, selectedCategory, weatherFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-emerald-800 uppercase flex items-center gap-2">
            <span>Authentic Singapore Archive</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">Beyond the Tourist Trail</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Off-The-Beaten-Path Landmarks
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Curated historical gems, architectural wonders, and neighborhood enclaves equipped with microclimate advisories and shelter ratings.
          </p>
        </div>

        {/* Rain Advisory Banner prompt if weather forecast is currently predicting rain */}
        {rainForecastActive && (
          <button
            onClick={() => setWeatherFilter(weatherFilter === 'sheltered' ? 'all' : 'sheltered')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition shadow-xs ${
              weatherFilter === 'sheltered'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Umbrella className="w-4 h-4" />
            <span>{weatherFilter === 'sheltered' ? 'Filter Active: Rain-Safe Only' : 'Rain Predicted: Filter Sheltered Spots'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Search Input Row */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by landmark name, neighborhood (e.g. Joo Chiat, Tiong Bahru), or keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Segmented Buttons Bar */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl shrink-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Comfort / Shelter Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setWeatherFilter('all')}
              className={`cursor-pointer px-2.5 py-1 text-xs rounded-lg border transition ${
                weatherFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setWeatherFilter('sheltered')}
              className={`cursor-pointer px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1 transition ${
                weatherFilter === 'sheltered'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Umbrella className="w-3 h-3 text-emerald-500" />
              <span>Rain-Safe (Sheltered)</span>
            </button>
            <button
              onClick={() => setWeatherFilter('quiet')}
              className={`cursor-pointer px-2.5 py-1 text-xs rounded-lg border transition ${
                weatherFilter === 'quiet'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Quiet Spots
            </button>
          </div>
        </div>

      </div>

      {/* Landmarks Grid */}
      {filteredLandmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLandmarks.map((landmark) => (
            <LandmarkCard
              key={landmark.id}
              landmark={landmark}
              isSaved={savedIds.includes(landmark.id)}
              onToggleSave={onToggleSave}
              onSelectForDetails={onSelectForDetails}
              onCheckWeather={onCheckWeather}
              onGetDirections={onGetDirections}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No matching landmarks found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your search query or switching off the rain-safe filter to see all hidden gems across Singapore.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setWeatherFilter('all');
            }}
            className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline pt-2"
          >
            Reset all filters
          </button>
        </div>
      )}

    </div>
  );
};
