import React, { useState } from 'react';
import {
  CloudRain,
  Sun,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Umbrella,
  CalendarDays
} from 'lucide-react';
import { WeatherCondition, DayForecast, Landmark } from '../types';

interface WeatherPredictorCardProps {
  locationName: string;
  selectedDate: string;
  selectedTime: string;
  weather: WeatherCondition;
  fourDayOutlook: DayForecast[];
  onTimeChange: (time: string) => void;
  onSelectShelteredGem?: () => void;
  shelteredLandmark?: Landmark;
  isLive: boolean;
  lastUpdated?: string;
  sourceStation?: string;
  onRefreshLive: () => void;
  isLoadingLive?: boolean;
}

// NEA PSI health bands: https://www.haze.gov.sg/
const getPsiBand = (psi: number) => {
  if (psi <= 50) return 'Good';
  if (psi <= 100) return 'Moderate';
  if (psi <= 200) return 'Unhealthy';
  if (psi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

export const WeatherPredictorCard: React.FC<WeatherPredictorCardProps> = ({
  locationName,
  selectedDate,
  selectedTime,
  weather,
  fourDayOutlook,
  onTimeChange,
  onSelectShelteredGem,
  shelteredLandmark,
  isLive: propIsLive,
  lastUpdated,
  sourceStation,
  onRefreshLive,
  isLoadingLive,
}) => {
  const [showApiInspector, setShowApiInspector] = useState(false);

  // Determine actual active mode
  const dataMode = weather.dataMode || (propIsLive ? 'live' : 'model-estimate');
  const isLiveObservation = dataMode === 'live';
  const isForecastEstimate = dataMode === 'forecast-estimate';
  const isModelEstimate = dataMode === 'model-estimate';

  // Parse hour for the slider
  const currentHour = parseInt(selectedTime.split(':')[0], 10) || 12;

  // Choose icon component
  const getWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'sun':
      case 'sun-medium':
        return <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />;
      case 'cloud-lightning':
        return <CloudLightning className="w-8 h-8 text-indigo-500" />;
      case 'cloud-rain':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      default:
        return <Sun className="w-8 h-8 text-amber-500" />;
    }
  };

  // UV risk level helper
  const getUvRisk = (uv: number) => {
    if (uv <= 2) return { label: 'Low', color: 'text-emerald-700 bg-emerald-50' };
    if (uv <= 5) return { label: 'Moderate', color: 'text-amber-700 bg-amber-50' };
    if (uv <= 7) return { label: 'High', color: 'text-orange-700 bg-orange-50' };
    return { label: 'Very High', color: 'text-rose-700 bg-rose-50' };
  };

  // Rain risk rating
  const isHighRainRisk =
    weather.rainRiskScore === 'High' ||
    weather.rainRiskScore === 'Very High' ||
    weather.rainProbability >= 45;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Top Header Strip */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1">
            
            {/* Distinctive Badges according to Provenance Mode */}
            {isLiveObservation && (
              <span className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live API Feed (Data.gov.sg)</span>
              </span>
            )}

            {isForecastEstimate && (
              <span className="flex items-center gap-1.5 bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Forecast (Data.gov.sg)</span>
              </span>
            )}

            {isModelEstimate && (
              <span className="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Model Estimate</span>
              </span>
            )}

            <span aria-hidden="true" className="text-slate-600">·</span>
            
            <span className="text-slate-400 font-normal normal-case">
              {isLiveObservation
                ? (sourceStation || 'Nearest NEA station')
                : isForecastEstimate
                ? (weather.sourceLabel || sourceStation || 'NEA forecast range')
                : 'Outside available NEA forecast window'}
              {lastUpdated && isLiveObservation ? ` · Refreshed ${lastUpdated}` : ''}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              {locationName}
            </h2>
            <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {selectedTime} hrs ({new Date(selectedDate).toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' })})
            </span>
          </div>
        </div>

        {/* Action button & Time Scrubber */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {isLiveObservation && (
            <button
              onClick={onRefreshLive}
              disabled={isLoadingLive}
              className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
              title="Fetch latest reading from Data.gov.sg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{isLoadingLive ? 'Updating...' : 'Sync Live'}</span>
            </button>
          )}

          {/* Time Scrubber / Hour Slider */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 min-w-[260px]">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Visit Hour Scrubber</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{selectedTime}</span>
            </div>
            <input
              type="range"
              min="6"
              max="23"
              step="1"
              value={currentHour}
              onChange={(e) => {
                const h = parseInt(e.target.value, 10);
                const formatted = `${h.toString().padStart(2, '0')}:00`;
                onTimeChange(formatted);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        
        {/* Main Observation Hero Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-slate-100 pb-6">
          
          {/* Temperature & Condition */}
          <div className="md:col-span-5 flex items-center gap-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shrink-0">
              {getWeatherIcon(weather.icon)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-display tabular-nums">
                  {weather.temperatureC}°C
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Feels like <span className="text-slate-800 font-semibold tabular-nums">{weather.feelsLikeC}°C</span>
                </span>
              </div>
              
              {/* Temperature provenance label */}
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                {isLiveObservation ? (
                  <span className="text-emerald-700 font-bold">Live observation</span>
                ) : isForecastEstimate ? (
                  <span className="text-sky-700 font-bold">Estimated for selected time</span>
                ) : (
                  <span className="text-amber-700 font-bold">Model estimate</span>
                )}
              </div>

              <p className="text-base font-semibold text-slate-800 mt-1">
                {weather.label}
              </p>
              
              <p className="text-xs text-slate-500 mt-0.5">
                {isLiveObservation ? (
                  `${weather.comfortRating} · ${sourceStation || 'Nearest station'}`
                ) : isForecastEstimate && weather.forecastTempMin !== undefined && weather.forecastTempMax !== undefined ? (
                  `NEA range ${weather.forecastTempMin}°C–${weather.forecastTempMax}°C · ${weather.comfortRating}`
                ) : (
                  `${weather.comfortRating} · Outside official NEA forecast window`
                )}
              </p>
            </div>
          </div>

          {/* 2-Hour / 24-Hour Micro Forecast Box */}
          <div className="md:col-span-7 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isLiveObservation
                  ? 'Two-Hour Micro Forecast (data.gov.sg/v2/real-time/api/two-hr-forecast)'
                  : isForecastEstimate
                  ? 'Official NEA Regional Outlook & Range'
                  : 'Historical Climate Projection'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
              {weather.twoHourForecast}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1.5">
              💡 {weather.twentyFourHourOutlook}
            </p>
            {weather.temperatureBasis && (
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Basis: {weather.temperatureBasis}
              </p>
            )}
          </div>

        </div>

        {/* Meteorological Indicators - Adapted between Live Observations and Future Forecast Estimates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isLiveObservation
                ? 'Real-Time Meteorological Metrics (Instantaneous Sensor Telemetry)'
                : 'Forecast Parameters & Diurnal Estimates'}
            </h3>
            {!isLiveObservation && (
              <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Derived for {selectedTime} hrs ({selectedDate})
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Metric 1: Rain Risk */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Rain Risk</span>
                <CloudRain className={`w-4 h-4 ${isHighRainRisk ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {isLiveObservation ? `${weather.rainProbability}%` : (weather.rainRiskScore || 'Moderate')}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation
                  ? (weather.rainfallMm > 0 ? `${weather.rainfallMm} mm shower` : 'Dry conditions')
                  : 'Derived from forecast text'}
              </div>
            </div>

            {/* Metric 2: UV / Solar Radiation */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">UV Radiation</span>
                <Sun className={`w-4 h-4 ${weather.uvIndex >= 6 ? 'text-amber-500' : 'text-slate-400'}`} />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums flex items-center gap-1.5">
                <span>{weather.uvIndex}</span>
                <span className={`text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded ${getUvRisk(weather.uvIndex).color}`}>
                  {getUvRisk(weather.uvIndex).label}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation ? 'Live solar sensor' : `Diurnal curve at ${selectedTime}`}
              </div>
            </div>

            {/* Metric 3: Air Quality / NEA Forecast Range */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">{isLiveObservation ? 'Air Quality' : 'NEA Day Range'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {isLiveObservation ? (
                  <>{weather.psi} <span className="text-xs font-normal text-slate-500">PSI</span></>
                ) : (
                  <>{weather.forecastTempMin ?? 25}°–{weather.forecastTempMax ?? 33}°C</>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation ? `PM2.5: ${weather.pm25} µg/m³ · ${getPsiBand(weather.psi)}` : 'Official Min / Max'}
              </div>
            </div>

            {/* Metric 4: Relative Humidity */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Humidity</span>
                <Droplets className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {weather.relativeHumidity}%
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation ? 'Live hygrometer' : 'Diurnal moisture model'}
              </div>
            </div>

            {/* Metric 5: Wind Speed */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Wind Speed</span>
                <Wind className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {weather.windSpeedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation ? 'Live anemometer' : 'Prevailing breeze'}
              </div>
            </div>

            {/* Metric 6: Air Temp */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">{isLiveObservation ? 'Live Air Temp' : 'Estimated Temp'}</span>
                <Thermometer className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {weather.temperatureC}°C
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isLiveObservation ? 'Nearest station' : `Target: ${selectedTime} hrs`}
              </div>
            </div>

          </div>

          {/* Clarification Notice for Future Dates */}
          {!isLiveObservation && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Weather Provenance Notice:</strong> Live sensor telemetry (instantaneous rainfall gauges, live UV meters, and real-time PSI) applies only to current conditions. For your selected future visit at <strong>{selectedTime} ({selectedDate})</strong>, temperatures are calculated from official NEA daily forecast ranges using Singapore’s diurnal curve, and rain risks are categorized from published forecast summaries.
              </span>
            </div>
          )}
        </div>

        {/* Tourist Travel Advice & Packing Tips */}
        <div className={`p-4 rounded-xl border ${isHighRainRisk ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${isHighRainRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isHighRainRisk ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {isHighRainRisk ? 'Tropical Rain Advisory for Your Visit' : 'Optimal Exploration Window'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                  {weather.packingTip}
                </p>
              </div>
            </div>

            {/* If raining, offer sheltered alternative prompt */}
            {isHighRainRisk && shelteredLandmark && (
              <button
                onClick={onSelectShelteredGem}
                className="cursor-pointer shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Umbrella className="w-3.5 h-3.5" />
                <span>Switch to Sheltered Gem: {shelteredLandmark.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Day Extended Outlook (from four-day-outlook API) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>4-Day Extended Weather Outlook (Official NEA Feed)</span>
            </h3>
            <span className="text-[11px] text-slate-400">api-open.data.gov.sg/v2</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fourDayOutlook.map((day, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition text-center"
              >
                <div className="text-xs font-bold text-slate-800">{day.dayName}</div>
                <div className="text-[10px] text-slate-400 font-mono mb-2">{day.dateStr}</div>
                <div className="flex justify-center mb-1.5">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="text-xs font-medium text-slate-700 truncate">{day.condition}</div>
                <div className="text-xs font-mono font-semibold text-slate-900 mt-1">
                  {day.tempMin}° – {day.tempMax}°C
                </div>
                <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                  {day.rainChance >= 65 ? 'High rain risk' : day.rainChance >= 45 ? 'Moderate rain risk' : 'Low rain risk'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Authentication & Keyless Breakdown Section */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Destination: <strong className="text-slate-700">{locationName}</strong></span>
          <button
            onClick={() => setShowApiInspector(!showApiInspector)}
            className="cursor-pointer text-emerald-700 hover:text-emerald-800 underline underline-offset-2 flex items-center gap-1 font-medium"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showApiInspector ? 'Hide API Authentication Analysis' : 'Are API Keys Required? (Detailed Analysis)'}</span>
          </button>
        </div>

        {showApiInspector && (
          <div className="bg-slate-900 text-slate-200 p-5 rounded-xl text-xs space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold font-sans text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>API Key & Token Requirements Summary</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Course Project Audit</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              
              {/* Group A: Keyless APIs */}
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Weather & Environment (Data.gov.sg v2) — ZERO KEY</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  All 10 endpoints (<code className="text-amber-300 font-mono">two-hr-forecast</code>, <code className="text-amber-300 font-mono">twenty-four-hr-forecast</code>, <code className="text-amber-300 font-mono">four-day-outlook</code>, <code className="text-amber-300 font-mono">air-temperature</code>, <code className="text-amber-300 font-mono">rainfall</code>, <code className="text-amber-300 font-mono">psi</code>, <code className="text-amber-300 font-mono">pm25</code>, <code className="text-amber-300 font-mono">uv</code>, <code className="text-amber-300 font-mono">relative-humidity</code>, <code className="text-amber-300 font-mono">wind-speed</code>) require <strong>NO API KEY AT ALL</strong>.
                </p>
                <div className="text-[11px] text-emerald-200 font-medium">
                  Status: 🟢 Actively querying live in this app right now with zero auth.
                </div>
              </div>

              {/* Group B: OneMap Token Required */}
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. OneMap Spatial & Routing — ACCESS TOKEN</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  • <code className="text-sky-300 font-mono">search</code>: Works publicly, or with Authorization token.<br />
                  • <code className="text-sky-300 font-mono">routingsvc/route</code> & <code className="text-sky-300 font-mono">revgeocode</code>: Require an Authorization Bearer token.<br />
                  • You obtain the token by posting email & password to <code className="text-slate-300 font-mono">getToken</code> (lasts 72 hours).
                </p>
                <div className="text-[11px] text-emerald-300 font-medium">
                  Status: 🟢 Live Search & Singapore Geocoding active.
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
