import React, { useState, useMemo } from 'react';
import { Landmark } from '../types';
import { LandmarkCard } from './LandmarkCard';
import { Search, Umbrella, MapPin } from 'lucide-react';

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
    { id: 'all', label: `All (${landmarks.length})` },
    { id: 'stb', label: 'Official attractions' },
    { id: 'curated', label: 'Hidden gems' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'heritage', label: 'Heritage' },
    { id: 'greenery', label: 'Greenery' },
    { id: 'eats_culture', label: 'Alleys & food' },
    { id: 'coastal', label: 'Coastal' },
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
      {/* Section heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="display text-3xl sm:text-4xl text-ink">Discover places</h2>
          <p className="text-base text-body mt-3 max-w-2xl">
            Heritage streets, quiet trails and local favourites, with shelter and crowd notes to help you plan around the weather.
          </p>
        </div>

        {/* Rain prompt when the forecast predicts rain */}
        {rainForecastActive && (
          <button
            type="button"
            onClick={() => setWeatherFilter(weatherFilter === 'sheltered' ? 'all' : 'sheltered')}
            aria-pressed={weatherFilter === 'sheltered'}
            className={`btn btn-sm shrink-0 self-start md:self-auto ${weatherFilter === 'sheltered' ? 'btn-dark' : 'btn-tertiary'}`}
          >
            <Umbrella className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{weatherFilter === 'sheltered' ? 'Showing rain-safe places only' : 'Rain expected: show rain-safe places'}</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="card space-y-5">
        <div className="relative">
          <label htmlFor="landmark-search" className="sr-only">
            Search places
          </label>
          <Search
            className="w-5 h-5 text-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="landmark-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, neighbourhood or keyword"
            className="input pl-12 pr-24"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn btn-sm btn-ghost absolute right-1 top-1/2 -translate-y-1/2"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Type of place</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className="chip"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Comfort</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWeatherFilter('all')}
              aria-pressed={weatherFilter === 'all'}
              className="chip"
            >
              Any
            </button>
            <button
              type="button"
              onClick={() => setWeatherFilter('sheltered')}
              aria-pressed={weatherFilter === 'sheltered'}
              className="chip"
            >
              <Umbrella className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Rain-safe</span>
            </button>
            <button
              type="button"
              onClick={() => setWeatherFilter('quiet')}
              aria-pressed={weatherFilter === 'quiet'}
              className="chip"
            >
              Quieter spots
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredLandmarks.length > 0 ? (
        <>
          <p className="text-sm text-body nums" aria-live="polite">
            {filteredLandmarks.length} {filteredLandmarks.length === 1 ? 'place' : 'places'}
          </p>
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
        </>
      ) : (
        <div className="card text-center py-12 space-y-3">
          <MapPin className="w-8 h-8 text-mute mx-auto" strokeWidth={1.75} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-ink">No places match</h3>
          <p className="text-base text-body max-w-md mx-auto">
            Try a different search, or clear the filters to see every place.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setWeatherFilter('all');
            }}
            className="btn btn-sm btn-secondary"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
};
