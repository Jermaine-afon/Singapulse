import React from 'react';
import { Bookmark, Compass, CloudSun, MapPin } from 'lucide-react';

interface HeaderProps {
  activeTab: 'explore' | 'weather' | 'map';
  setActiveTab: (tab: 'explore' | 'weather' | 'map') => void;
  savedCount: number;
  onOpenItinerary: () => void;
  onOpenQuickPlanner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenItinerary,
  onOpenQuickPlanner,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-1.5"
        >
          <span>Kaki Trails</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mb-1" />
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('explore')}
            className={`cursor-pointer transition-colors py-1 ${
              activeTab === 'explore'
                ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            Discover Gems
          </button>
          
          <button
            onClick={() => setActiveTab('weather')}
            className={`cursor-pointer transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'weather'
                ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            <CloudSun className="w-4 h-4 text-amber-500" />
            <span>Weather Predictor</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`cursor-pointer transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'map'
                ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Interactive Map</span>
          </button>

          <button
            onClick={onOpenItinerary}
            className="cursor-pointer text-slate-600 hover:text-slate-900 transition-colors py-1 flex items-center gap-1.5"
          >
            <Bookmark className="w-4 h-4 text-slate-500" />
            <span>My Trail</span>
            {savedCount > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenItinerary}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 relative"
            aria-label="View saved itinerary"
          >
            <Bookmark className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={onOpenQuickPlanner}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plan Visit</span>
          </button>
        </div>

      </div>
    </header>
  );
};
