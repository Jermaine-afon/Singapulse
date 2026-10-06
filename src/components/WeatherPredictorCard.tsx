import React from 'react';
import {
  CloudRain,
  Sun,
  CloudLightning,
  AlertTriangle,
  ShieldCheck,
  Info,
  RefreshCw,
  Umbrella,
} from 'lucide-react';
import { WeatherCondition, DayForecast, Landmark } from '../types';

interface WeatherPredictorCardProps {
  locationName: string;
  selectedDate: string;
  selectedTime: string;
  weather: WeatherCondition;
  fourDayOutlook: DayForecast[];
  /** True when NEA's outlook couldn't be fetched and fourDayOutlook is a typical-pattern estimate */
  outlookIsEstimate?: boolean;
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

type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High';

// Weather risk colours: low = positive, moderate = warning, high/very high = negative
const riskBadgeClass = (level: RiskLevel) => {
  if (level === 'Low') return 'badge badge-sm badge-positive';
  if (level === 'Moderate') return 'badge badge-sm badge-warning';
  return 'badge badge-sm badge-negative';
};

const rainLevelFromChance = (chance: number): RiskLevel =>
  chance >= 65 ? 'High' : chance >= 45 ? 'Moderate' : 'Low';

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
  outlookIsEstimate = false,
}) => {
  // Determine actual active mode
  const dataMode = weather.dataMode || (propIsLive ? 'live' : 'model-estimate');
  const isLiveObservation = dataMode === 'live';
  const isForecastEstimate = dataMode === 'forecast-estimate';

  // Parse hour for the slider
  const currentHour = parseInt(selectedTime.split(':')[0], 10) || 12;

  // Choose icon component
  const getWeatherIcon = (iconName: string, size = 'w-8 h-8') => {
    switch (iconName) {
      case 'sun':
      case 'sun-medium':
        return <Sun className={`${size} text-warning-deep`} aria-hidden="true" />;
      case 'cloud-lightning':
        return <CloudLightning className={`${size} text-ink`} aria-hidden="true" />;
      case 'cloud-rain':
        return <CloudRain className={`${size} text-ink`} aria-hidden="true" />;
      default:
        return <Sun className={`${size} text-warning-deep`} aria-hidden="true" />;
    }
  };

  // UV risk level helper
  const getUvRisk = (uv: number): RiskLevel => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    return 'Very High';
  };

  // Rain risk rating
  const isHighRainRisk =
    weather.rainRiskScore === 'High' ||
    weather.rainRiskScore === 'Very High' ||
    weather.rainProbability >= 45;

  // One plain verdict that weighs rain, air quality and sun together
  const verdict = (() => {
    if (isHighRainRisk) return { caution: true, title: 'Rain likely, plan for cover', reason: '' };
    if (isLiveObservation && weather.psi > 100)
      return {
        caution: true,
        title: 'Air quality is unhealthy',
        reason: `PSI ${weather.psi}: keep strenuous outdoor time short and favour indoor stops.`,
      };
    if (weather.uvIndex >= 8)
      return { caution: true, title: 'Strong sun, find shade at midday', reason: `UV index ${weather.uvIndex}.` };
    return { caution: false, title: 'Good window to explore', reason: '' };
  })();

  const rainLevel: RiskLevel = weather.rainRiskScore || rainLevelFromChance(weather.rainProbability);
  const uvLevel = getUvRisk(weather.uvIndex);

  const visitDateLabel = new Date(selectedDate).toLocaleDateString('en-SG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const sourceLine = isLiveObservation
    ? `${sourceStation || 'Nearest NEA station'}${lastUpdated ? ` · updated ${lastUpdated}` : ''}`
    : isForecastEstimate
    ? weather.forecastTempMin !== undefined && weather.forecastTempMax !== undefined
      ? `From the NEA forecast range of ${weather.forecastTempMin}–${weather.forecastTempMax}°C`
      : weather.sourceLabel || sourceStation || 'From the NEA forecast range'
    : 'Outside the NEA forecast window, based on typical conditions';

  return (
    <div className="space-y-4">
      {/* Answer card */}
      <div className="card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-ink">{locationName}</h2>
            <p className="text-sm text-body mt-1 nums">
              {visitDateLabel} · {selectedTime}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLiveObservation ? (
              <span className="badge badge-positive">
                <span className="w-2 h-2 rounded-full bg-positive" aria-hidden="true" />
                Live
              </span>
            ) : isForecastEstimate ? (
              <span className="badge badge-neutral">Forecast estimate</span>
            ) : (
              <span className="badge badge-warning">Model estimate</span>
            )}
            {isLiveObservation && (
              <button
                type="button"
                onClick={onRefreshLive}
                disabled={isLoadingLive}
                className="btn btn-secondary btn-sm"
                title="Fetch the latest reading"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{isLoadingLive ? 'Updating…' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Temperature + condition */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-canvas-soft flex items-center justify-center shrink-0">
            {getWeatherIcon(weather.icon)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="display text-6xl sm:text-7xl text-ink nums">{weather.temperatureC}°C</span>
              <span className="text-base text-body">
                Feels like <span className="font-semibold text-ink nums">{weather.feelsLikeC}°C</span>
              </span>
            </div>
            <p className="text-lg font-semibold text-ink mt-2">{weather.label}</p>
            <p className="text-sm text-body mt-0.5">
              <span className="font-semibold text-ink">
                {isLiveObservation ? 'Live observation' : isForecastEstimate ? 'Forecast estimate' : 'Model estimate'}
              </span>
              {' · '}
              {sourceLine}
            </p>
          </div>
        </div>

        {/* What to do */}
        <div className="border-t border-canvas-line pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {verdict.caution ? (
              <AlertTriangle className="w-5 h-5 text-warning-deep shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-positive shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="text-base font-semibold text-ink">{verdict.title}</p>
              {verdict.reason && <p className="text-base text-body">{verdict.reason}</p>}
              <p className="text-base text-body">{weather.packingTip}</p>
              <p className="text-sm text-body">
                {weather.twoHourForecast} {weather.twentyFourHourOutlook}
              </p>
            </div>
          </div>
          {isHighRainRisk && shelteredLandmark && (
            <button type="button" onClick={onSelectShelteredGem} className="btn btn-dark btn-sm shrink-0">
              <Umbrella className="w-4 h-4" aria-hidden="true" />
              <span>Try sheltered: {shelteredLandmark.name.split(' ')[0]}</span>
            </button>
          )}
        </div>

        {/* Hour scrubber */}
        <div className="border-t border-canvas-line pt-5">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="visit-hour" className="text-sm font-semibold text-ink">
              Visit hour
            </label>
            <span className="text-base font-semibold text-ink nums">{selectedTime}</span>
          </div>
          <input
            id="visit-hour"
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
            className="w-full h-11 cursor-pointer accent-ink"
          />
          <div className="flex justify-between text-sm text-mute nums">
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="card space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-ink mb-4">
            {isLiveObservation ? 'Conditions now' : `Expected at ${selectedTime}`}
          </h3>
          <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">Rain</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold text-ink nums">
                  {isLiveObservation ? `${weather.rainProbability}%` : (weather.rainRiskScore || 'Moderate')}
                </span>
                {isLiveObservation && <span className={riskBadgeClass(rainLevel)}>{rainLevel}</span>}
              </dd>
              <dd className="text-sm text-mute mt-1">
                {isLiveObservation
                  ? (weather.rainfallMm > 0 ? `${weather.rainfallMm} mm falling now` : 'Dry right now')
                  : 'From the forecast summary'}
              </dd>
            </div>

            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">UV index</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold text-ink nums">{weather.uvIndex}</span>
                <span className={riskBadgeClass(uvLevel)}>{uvLevel}</span>
              </dd>
              <dd className="text-sm text-mute mt-1">
                {isLiveObservation ? 'Measured now' : `Typical for ${selectedTime}`}
              </dd>
            </div>

            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">{isLiveObservation ? 'Air quality' : 'Day range'}</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink nums">
                {isLiveObservation ? (
                  <>{weather.psi} <span className="text-sm font-normal text-body">PSI</span></>
                ) : (
                  <>{weather.forecastTempMin ?? 25}–{weather.forecastTempMax ?? 33}°C</>
                )}
              </dd>
              <dd className="text-sm text-mute mt-1 nums">
                {isLiveObservation
                  ? `${getPsiBand(weather.psi)} · PM2.5 ${weather.pm25} µg/m³`
                  : 'NEA forecast low / high'}
              </dd>
            </div>

            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">Humidity</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink nums">{weather.relativeHumidity}%</dd>
              <dd className="text-sm text-mute mt-1">
                {isLiveObservation ? 'Measured now' : 'Typical for this hour'}
              </dd>
            </div>

            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">Wind</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink nums">
                {weather.windSpeedKmh} <span className="text-sm font-normal text-body">km/h</span>
              </dd>
              <dd className="text-sm text-mute mt-1">
                {isLiveObservation ? 'Measured now' : 'Prevailing breeze'}
              </dd>
            </div>

            <div className="bg-canvas-soft rounded-2xl p-4">
              <dt className="text-sm text-body">Comfort</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink leading-tight">{weather.comfortRating}</dd>
              <dd className="text-sm text-mute mt-1 nums">
                Feels like {weather.feelsLikeC}°C
              </dd>
            </div>
          </dl>

          {!isLiveObservation && (
            <p className="mt-4 text-sm text-body flex items-start gap-2">
              <Info className="w-4 h-4 text-mute shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Live readings only cover right now, so for <span className="nums">{selectedTime}</span> on{' '}
                {visitDateLabel} these figures are estimated from NEA forecasts and Singapore's usual daily pattern.
                {weather.temperatureBasis && <> Temperature basis: {weather.temperatureBasis}.</>}
              </span>
            </p>
          )}
        </div>

        {/* 4-day outlook */}
        <div className="border-t border-canvas-line pt-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-ink">Next four days</h3>
            {outlookIsEstimate && <span className="badge badge-sm badge-warning">Estimate</span>}
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fourDayOutlook.map((day, idx) => {
              const level = rainLevelFromChance(day.rainChance);
              return (
                <li key={idx} className="bg-canvas-soft rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-ink">{day.dayName}</div>
                      <div className="text-sm text-mute nums">{day.dateStr}</div>
                    </div>
                    {getWeatherIcon(day.icon, 'w-6 h-6')}
                  </div>
                  <div className="text-sm text-body mt-3 line-clamp-2">{day.condition}</div>
                  <div className="text-base font-semibold text-ink nums mt-1">
                    {day.tempMin}–{day.tempMax}°C
                  </div>
                  <span className={`${riskBadgeClass(level)} mt-2`}>{level} rain</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-sm text-mute">
          {outlookIsEstimate
            ? "Readings: NEA via Data.gov.sg. NEA's four-day outlook is unavailable right now, so these days show a typical pattern, not a forecast."
            : 'Source: NEA via Data.gov.sg'}
        </p>
      </div>
    </div>
  );
};
