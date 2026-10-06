import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SINGAPORE_LANDMARKS, POPULAR_START_POINTS } from './data/landmarks';
import { predictSingaporeWeather, getFourDayForecast } from './data/mockWeatherEngine';
import { fetchLiveSingaporeWeather, LiveWeatherResponse, getSingaporeCurrentTime } from './services/liveWeatherService';
import { Landmark, WeatherCondition, DayForecast, StartPoint } from './types';
import { Header, type AppTab } from './components/Header';
import { AiPlanner } from './components/AiPlanner';
import { HeroBanner } from './components/HeroBanner';
import { WeatherPredictorCard } from './components/WeatherPredictorCard';
import { InteractiveMap } from './components/InteractiveMap';
import { LandmarkExplorer } from './components/LandmarkExplorer';
import { LandmarkDetailModal } from './components/LandmarkDetailModal';
import { RouteModal } from './components/RouteModal';
import { ItineraryDrawer } from './components/ItineraryDrawer';
import { Footer } from './components/Footer';

const START_POINT_KEY = 'singapulse_start_point_v1';
const DEFAULT_START_POINT: StartPoint = (() => {
  const { name, lat, lng } = POPULAR_START_POINTS[1];
  return { name, lat, lng };
})();

// Accept only a stored point that is a real place inside Singapore
function loadStartPoint(): StartPoint {
  try {
    const raw = localStorage.getItem(START_POINT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const inSingapore =
        typeof p?.lat === 'number' && typeof p?.lng === 'number' &&
        p.lat > 1.1 && p.lat < 1.5 && p.lng > 103.5 && p.lng < 104.1;
      if (typeof p?.name === 'string' && p.name.trim() && inSingapore) {
        return { name: p.name.slice(0, 120), lat: p.lat, lng: p.lng };
      }
    }
  } catch {
    // Corrupt or inaccessible storage — fall back to the default
  }
  return DEFAULT_START_POINT;
}

const SAVED_TRAIL_KEY = 'singapulse_saved_trail_v1';
// First-time visitors start with two sample gems; after that the stored list wins (even if empty)
const DEFAULT_SAVED_IDS = ['fort-canning-tunnel', 'tiong-bahru-art-deco'];

function loadSavedTrail(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_TRAIL_KEY);
    if (raw !== null) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        const knownIds = new Set(SINGAPORE_LANDMARKS.map((lm) => lm.id));
        return ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id));
      }
    }
  } catch {
    // Corrupt or inaccessible storage — fall back to defaults
  }
  return DEFAULT_SAVED_IDS;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('planner');
  
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

  // Saved / Bookmarked Landmark IDs (persisted so My Trail survives reloads)
  const [savedIds, setSavedIds] = useState<string[]>(loadSavedTrail);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_TRAIL_KEY, JSON.stringify(savedIds));
    } catch {
      // Storage unavailable (private mode / blocked) — trail just won't persist
    }
  }, [savedIds]);

  // Modals & Navigation state
  const [detailModalLandmark, setDetailModalLandmark] = useState<Landmark | null>(null);
  const [routeModalLandmark, setRouteModalLandmark] = useState<Landmark | null>(null);
  const [userStartPoint, setUserStartPoint] = useState<StartPoint>(loadStartPoint);

  useEffect(() => {
    try {
      localStorage.setItem(START_POINT_KEY, JSON.stringify(userStartPoint));
    } catch {
      // Storage unavailable — the start point just won't persist
    }
  }, [userStartPoint]);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);

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

  // One-line weather context for the AI planner
  const plannerWeatherSummary = useMemo(() => {
    const w = activeWeather;
    const dayLabel =
      selectedDate === sgTimeInfo.sgDate
        ? 'Today'
        : new Date(`${selectedDate}T12:00:00+08:00`).toLocaleDateString('en-SG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Singapore',
          });
    return `${dayLabel}: ${w.label.toLowerCase()}, ${Math.round(w.temperatureC)}°C, ${w.rainProbability}% chance of rain. ${w.twentyFourHourOutlook}`;
  }, [activeWeather, selectedDate, sgTimeInfo.sgDate]);

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
    const query = loc.trim().toLowerCase();
    if (!query) return; // cleared input — keep the current selection

    // Only an exact name match selects a catalog landmark; partial typing never jumps the map
    const matched = SINGAPORE_LANDMARKS.find((lm) => lm.name.toLowerCase() === query);
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
        imageUrl: '/images/hero_singapore_hidden_garden_1791208088141.jpg',
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

  const handleSaveManyToTrail = (ids: string[]) => {
    setSavedIds((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
  };

  const handleShowOnMap = (landmark: Landmark) => {
    setMapSelectedLandmark(landmark);
    setActiveTab('map');
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedIds.length}
        onOpenItinerary={() => setIsItineraryOpen(true)}
      />

      <main className="flex-1">
        {/* Plan (default). Kept mounted so the plan & chat survive tab switches */}
        <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
          <AiPlanner
            landmarks={SINGAPORE_LANDMARKS}
            savedLandmarks={savedLandmarks}
            savedIds={savedIds}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            startPoint={userStartPoint}
            onStartPointChange={setUserStartPoint}
            weatherSummary={plannerWeatherSummary}
            onSelectForDetails={(lm) => setDetailModalLandmark(lm)}
            onShowOnMap={handleShowOnMap}
            onSaveToTrail={handleSaveManyToTrail}
          />
        </div>

        {/* Discover. Kept mounted so filters survive tab switches */}
        <section
          ref={exploreSectionRef}
          className={activeTab === 'explore' ? 'block bg-canvas-soft scroll-mt-20' : 'hidden'}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
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
        </section>

        {activeTab === 'weather' && (
          <section ref={weatherSectionRef} className="bg-canvas-soft scroll-mt-20 animate-fade">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
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

              <WeatherPredictorCard
                locationName={mapSelectedLandmark?.name ?? selectedLocation}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                weather={activeWeather}
                fourDayOutlook={activeFourDay}
                outlookIsEstimate={!liveWeatherData?.fourDayOutlook?.length}
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

              {mapSelectedLandmark && (
                <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-ink">{mapSelectedLandmark.name}</h2>
                    <p className="mt-1 text-body">Read about this place, or see how to get there from your start point.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setDetailModalLandmark(mapSelectedLandmark)} className="btn btn-tertiary">
                      Place details
                    </button>
                    <button type="button" onClick={() => handleGetDirections(mapSelectedLandmark)} className="btn btn-dark">
                      Getting there
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'map' && (
          <section ref={mapSectionRef} className="bg-canvas-soft scroll-mt-20 animate-fade">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
              <InteractiveMap
                landmarks={SINGAPORE_LANDMARKS}
                selectedLandmark={mapSelectedLandmark}
                onSelectLandmark={(lm) => {
                  setMapSelectedLandmark(lm);
                  setSelectedLocation(lm.name);
                }}
                onGetDirections={handleGetDirections}
                onCheckWeather={handleCheckWeatherForLandmark}
                startPoint={userStartPoint}
              />
            </div>
          </section>
        )}
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

      {/* 4. OneMap Route Directions Modal */}
      <RouteModal
        landmark={routeModalLandmark}
        onClose={() => setRouteModalLandmark(null)}
        userStartPoint={userStartPoint}
        onStartPointChange={setUserStartPoint}
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
