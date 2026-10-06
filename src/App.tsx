import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SINGAPORE_LANDMARKS, POPULAR_START_POINTS } from './data/landmarks';
import { predictSingaporeWeather, getFourDayForecast } from './data/mockWeatherEngine';
import { fetchLiveSingaporeWeather, LiveWeatherResponse, getSingaporeCurrentTime } from './services/liveWeatherService';
import { Landmark, WeatherCondition, DayForecast } from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { WeatherPredictorCard } from './components/WeatherPredictorCard';
import { InteractiveMap } from './components/InteractiveMap';
import { LandmarkExplorer } from './components/LandmarkExplorer';
import { LandmarkDetailModal } from './components/LandmarkDetailModal';
import { RouteModal } from './components/RouteModal';
import { OneMapSettingsModal } from './components/OneMapSettingsModal';
import { ItineraryDrawer } from './components/ItineraryDrawer';
import { Footer } from './components/Footer';
import { Compass, Sparkles, CloudSun, MapPin, Search } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'explore' | 'weather' | 'map'>('explore');
  
  // Tourist visit parameters
  const [selectedLocation, setSelectedLocation] = useState<string>(
    'Fort Canning Tree Tunnel & Spiral Staircase'
  );
  
  // Format today's date and current time in Singapore timezone (Asia/Singapore)
  const sgTimeInfo = useMemo(() => getSingaporeCurrentTime(), []);
  const [selectedDate, setSelectedDate] = useState<string>(sgTimeInfo.sgDate);
  const [selectedTime, setSelectedTime] = useState<string>(
    `${sgTimeInfo.sgHour.toString().padStart(2, '0')}:00`
  );

  // Saved / Bookmarked Landmark IDs
  const [savedIds, setSavedIds] = useState<string[]>([
    'fort-canning-tunnel',
    'tiong-bahru-art-deco'
  ]);

  // Modals & Navigation state
  const [detailModalLandmark, setDetailModalLandmark] = useState<Landmark | null>(null);
  const [routeModalLandmark, setRouteModalLandmark] = useState<Landmark | null>(null);
  const [userStartPoint, setUserStartPoint] = useState<string>(POPULAR_START_POINTS[1].name);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isOneMapModalOpen, setIsOneMapModalOpen] = useState(false);

  // Selected Landmark for Map focus
  const [mapSelectedLandmark, setMapSelectedLandmark] = useState<Landmark | null>(
    SINGAPORE_LANDMARKS[0]
  );

  // Live API weather state
  const [liveWeatherData, setLiveWeatherData] = useState<LiveWeatherResponse | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);

  // References for smooth scrolling
  const weatherSectionRef = useRef<HTMLDivElement>(null);
  const exploreSectionRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Fallback deterministic weather condition
  const fallbackWeather = useMemo(() => {
    return predictSingaporeWeather(selectedLocation, selectedDate, selectedTime);
  }, [selectedLocation, selectedDate, selectedTime]);

  const fallbackFourDay = useMemo(() => {
    return getFourDayForecast(selectedDate);
  }, [selectedDate]);

  // Actual active weather (Live if available, otherwise deterministic model)
  const activeWeather: WeatherCondition = useMemo(() => {
    if (liveWeatherData?.weather) {
      return liveWeatherData.weather;
    }
    return fallbackWeather;
  }, [liveWeatherData, fallbackWeather]);

  const activeFourDay: DayForecast[] = useMemo(() => {
    if (liveWeatherData?.fourDayOutlook && liveWeatherData.fourDayOutlook.length > 0) {
      return liveWeatherData.fourDayOutlook;
    }
    return fallbackFourDay;
  }, [liveWeatherData, fallbackFourDay]);

  // Fetch live weather from Data.gov.sg
  const loadLiveWeather = useCallback(async (loc: string, date: string, time: string, coords?: { lat: number; lng: number }) => {
    setIsLoadingLive(true);
    try {
      const res = await fetchLiveSingaporeWeather(loc, date, time, coords);
      setLiveWeatherData(res);
      setIsLiveActive(res.dataMode === 'live');
    } catch (err) {
      console.warn('Falling back to local weather engine due to network:', err);
      setIsLiveActive(false);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  // Fetch on mount and when location / time changes
  useEffect(() => {
    const coords = mapSelectedLandmark
      ? { lat: mapSelectedLandmark.latitude, lng: mapSelectedLandmark.longitude }
      : undefined;
    loadLiveWeather(selectedLocation, selectedDate, selectedTime, coords);
  }, [selectedLocation, selectedDate, selectedTime, mapSelectedLandmark, loadLiveWeather]);

  // Find a sheltered alternative landmark (e.g. Tiong Bahru or Gillman Barracks)
  const shelteredAlternative = useMemo(() => {
    return SINGAPORE_LANDMARKS.find(
      (lm) => lm.shelterLevel === 'full_shelter' && lm.name !== selectedLocation
    ) || SINGAPORE_LANDMARKS[3];
  }, [selectedLocation]);

  // Saved landmarks objects
  const savedLandmarks = useMemo(() => {
    return SINGAPORE_LANDMARKS.filter((lm) => savedIds.includes(lm.id));
  }, [savedIds]);

  // Handlers
  const handleToggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearTrail = () => {
    setSavedIds([]);
  };

  const handleSearchSubmit = () => {
    setActiveTab('weather');
    setTimeout(() => {
      weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleLocationChange = (loc: string, coords?: { lat: number; lng: number }) => {
    setSelectedLocation(loc);
    const query = loc.toLowerCase();
    const matched = SINGAPORE_LANDMARKS.find(
      (lm) =>
        lm.name.toLowerCase() === query ||
        query.includes(lm.name.toLowerCase()) ||
        lm.name.toLowerCase().includes(query)
    );
    if (matched) {
      setMapSelectedLandmark(matched);
    } else if (coords) {
      // Temporary simulated custom landmark
      setMapSelectedLandmark({
        id: 'custom-spot',
        name: loc,
        subtitle: 'OneMap Singapore Geocoded Location',
        neighborhood: 'Custom Destination',
        region: 'Central',
        category: 'architecture',
        description: `Direct destination at coordinates ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} found via OneMap search.`,
        secretLore: 'OneMap official Singapore survey geodetic point.',
        localFoodTip: 'Explore nearby neighborhood hawker centers within 300m.',
        latitude: coords.lat,
        longitude: coords.lng,
        address: loc,
        nearestMrt: 'Nearby MRT',
        shelterLevel: 'partial_shelter',
        bestTimeOfDay: '08:30 - 18:00',
        recommendedDuration: '1 hour',
        crowdLevel: 'Moderate',
        admission: 'Free',
        imageUrl: '/src/assets/images/hero_singapore_hidden_garden_1791208088141.jpg',
        highlights: ['Geocoded destination', 'Live weather sensor point'],
        photoSpotTip: 'Street level panorama'
      });
    }
  };

  const handleQuickSelectLandmark = (landmark: Landmark) => {
    setSelectedLocation(landmark.name);
    setMapSelectedLandmark(landmark);
    setActiveTab('weather');
    setTimeout(() => {
      weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCheckWeatherForLandmark = (landmark: Landmark) => {
    setSelectedLocation(landmark.name);
    setMapSelectedLandmark(landmark);
    setActiveTab('weather');
    setTimeout(() => {
      weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleGetDirections = (landmark: Landmark) => {
    setRouteModalLandmark(landmark);
  };

  const handleSelectShelteredGem = () => {
    if (shelteredAlternative) {
      setSelectedLocation(shelteredAlternative.name);
      setMapSelectedLandmark(shelteredAlternative);
      setDetailModalLandmark(shelteredAlternative);
    }
  };

  const handleOpenQuickPlanner = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-800 flex flex-col font-sans">
      
      {/* 1. Header (Strict Top Bar Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedIds.length}
        onOpenItinerary={() => setIsItineraryOpen(true)}
        onOpenQuickPlanner={handleOpenQuickPlanner}
        onOpenOneMapSettings={() => setIsOneMapModalOpen(true)}
      />

      {/* 2. Hero Banner (Always visible at top with Destination / Time input & Live OneMap Search) */}
      <HeroBanner
        landmarks={SINGAPORE_LANDMARKS}
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedTime={selectedTime}
        onTimeChange={setSelectedTime}
        onSearchSubmit={handleSearchSubmit}
        onQuickSelectLandmark={handleQuickSelectLandmark}
        isLiveWeatherActive={isLiveActive}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 space-y-12">
        
        {/* Navigation Switcher Pills (Secondary Section Switcher) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('explore')}
              className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'explore'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Explore Hidden Gems</span>
            </button>

            <button
              onClick={() => setActiveTab('weather')}
              className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'weather'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-500" />
              <span>Weather Predictor</span>
              {isLiveActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Map & Radar</span>
            </button>
          </div>

          {/* Quick status text */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>Destination: <strong className="text-slate-800">{selectedLocation}</strong></span>
            <span>·</span>
            <span className="font-mono text-emerald-700">{selectedTime} hrs</span>
          </div>
        </div>

        {/* View 1: Weather Predictor Tab */}
        {activeTab === 'weather' && (
          <div ref={weatherSectionRef} className="space-y-8 animate-fadeIn">
            <WeatherPredictorCard
              locationName={selectedLocation}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              weather={activeWeather}
              fourDayOutlook={activeFourDay}
              onTimeChange={setSelectedTime}
              onSelectShelteredGem={handleSelectShelteredGem}
              shelteredLandmark={shelteredAlternative}
              isLive={activeWeather.dataMode === 'live'}
              lastUpdated={liveWeatherData?.lastUpdated}
              sourceStation={liveWeatherData?.sourceStation}
              onRefreshLive={() => {
                const coords = mapSelectedLandmark
                  ? { lat: mapSelectedLandmark.latitude, lng: mapSelectedLandmark.longitude }
                  : undefined;
                loadLiveWeather(selectedLocation, selectedDate, selectedTime, coords);
              }}
              isLoadingLive={isLoadingLive}
            />

            {/* Quick Context Landmark Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Active Destination Match
                  </div>
                  <h3 className="text-lg font-bold font-display text-slate-900 mt-0.5">
                    {selectedLocation}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Ready to visit this spot? Check step-by-step sheltered routes, MRT transit connections, or add it to your travel trail.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const matched = SINGAPORE_LANDMARKS.find((lm) => lm.name === selectedLocation) || SINGAPORE_LANDMARKS[0];
                      setDetailModalLandmark(matched);
                    }}
                    className="cursor-pointer px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition"
                  >
                    View History & Lore
                  </button>
                  <button
                    onClick={() => {
                      const matched = SINGAPORE_LANDMARKS.find((lm) => lm.name === selectedLocation) || SINGAPORE_LANDMARKS[0];
                      handleGetDirections(matched);
                    }}
                    className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Get Route Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Interactive Map & Radar Tab */}
        {activeTab === 'map' && (
          <div ref={mapSectionRef} className="space-y-8 animate-fadeIn">
            <InteractiveMap
              landmarks={SINGAPORE_LANDMARKS}
              selectedLandmark={mapSelectedLandmark}
              onSelectLandmark={(lm) => {
                setMapSelectedLandmark(lm);
                setSelectedLocation(lm.name);
              }}
              onGetDirections={handleGetDirections}
              onCheckWeather={handleCheckWeatherForLandmark}
              userStartPointName={userStartPoint}
            />
          </div>
        )}

        {/* View 3: Landmark Explorer Grid (Default) */}
        <div ref={exploreSectionRef} className={activeTab === 'explore' ? 'block' : 'hidden'}>
          <LandmarkExplorer
            landmarks={SINGAPORE_LANDMARKS}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onSelectForDetails={(lm) => setDetailModalLandmark(lm)}
            onCheckWeather={handleCheckWeatherForLandmark}
            onGetDirections={handleGetDirections}
            rainForecastActive={activeWeather.rainProbability >= 45}
          />
        </div>

      </main>

      {/* 3. Landmark Detail Modal */}
      <LandmarkDetailModal
        landmark={detailModalLandmark}
        onClose={() => setDetailModalLandmark(null)}
        isSaved={detailModalLandmark ? savedIds.includes(detailModalLandmark.id) : false}
        onToggleSave={handleToggleSave}
        onCheckWeather={handleCheckWeatherForLandmark}
        onGetDirections={handleGetDirections}
      />

      {/* 4. OneMap Route Directions Modal with Token Manager */}
      <RouteModal
        landmark={routeModalLandmark}
        onClose={() => setRouteModalLandmark(null)}
        userStartPoint={userStartPoint}
        onStartPointChange={setUserStartPoint}
      />

      {/* 4b. Dedicated OneMap Credentials & Token Manager Modal */}
      <OneMapSettingsModal
        isOpen={isOneMapModalOpen}
        onClose={() => setIsOneMapModalOpen(false)}
      />

      {/* 5. Itinerary Drawer */}
      <ItineraryDrawer
        isOpen={isItineraryOpen}
        onClose={() => setIsItineraryOpen(false)}
        savedLandmarks={savedLandmarks}
        onRemoveFromTrail={handleToggleSave}
        onClearTrail={handleClearTrail}
        onSelectForDetails={(lm) => setDetailModalLandmark(lm)}
        onCheckWeather={handleCheckWeatherForLandmark}
        onGetDirections={handleGetDirections}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />

      {/* 6. Quiet Footer */}
      <Footer />

    </div>
  );
}
