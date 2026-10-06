/** Where the visitor starts their day: a preset or any OneMap search result */
export interface StartPoint {
  name: string;
  lat: number;
  lng: number;
}

export type ShelterLevel = 'full_shelter' | 'partial_shelter' | 'open_air';
export type LandmarkCategory = 'architecture' | 'greenery' | 'heritage' | 'eats_culture' | 'coastal';

export interface Landmark {
  id: string;
  name: string;
  subtitle: string;
  neighborhood: string;
  region: 'Central' | 'East' | 'West' | 'North' | 'South';
  category: LandmarkCategory;
  description: string;
  secretLore: string;
  localFoodTip: string;
  latitude: number;
  longitude: number;
  address: string;
  nearestMrt: string;
  shelterLevel: ShelterLevel;
  bestTimeOfDay: string;
  recommendedDuration: string;
  crowdLevel: 'Quiet' | 'Moderate' | 'Lively';
  admission: 'Free' | 'Paid';
  /** Empty when no verified photo exists (the UI shows a placeholder) */
  imageUrl: string;
  /** Attribution for a freely licensed photo (required by its licence) */
  imageCredit?: {
    author: string;
    license: string;
    licenseUrl?: string;
    sourceUrl: string;
  };
  highlights: string[];
  photoSpotTip: string;
  openingHours?: string;
  externalLink?: string;
  isStbAttraction?: boolean;
}

export type WeatherDataMode = 'live' | 'forecast-estimate' | 'model-estimate';

export interface WeatherCondition {
  label: 'Sunny' | 'Fair & Breezy' | 'Partly Cloudy' | 'Cloudy' | 'Passing Showers' | 'Thundery Showers' | 'Heavy Monsoon Rain';
  icon: string;
  rainProbability: number; // 0 - 100 (app-derived score when forecasting)
  rainfallMm: number; // e.g. 0.0 - 24.5 mm
  temperatureC: number;
  feelsLikeC: number;
  uvIndex: number; // 0 - 12
  relativeHumidity: number; // %
  windSpeedKmh: number;
  psi: number; // Pollutant Standards Index (0 - 150)
  pm25: number; // ug/m3
  twoHourForecast: string;
  twentyFourHourOutlook: string;
  packingTip: string;
  comfortRating: 'High Comfort' | 'Moderate Humidity' | 'Tropical Heat' | 'Rain Shield Needed';
  // Enhanced audit & provenance fields
  dataMode?: WeatherDataMode;
  forecastTempMin?: number;
  forecastTempMax?: number;
  sourceLabel?: string;
  temperatureBasis?: string;
  rainRiskScore?: 'Low' | 'Moderate' | 'High' | 'Very High';
  isLiveObservation?: boolean;
}

export interface DayForecast {
  dayName: string;
  dateStr: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  rainChance: number;
  icon: string;
}

export interface SavedItineraryItem {
  landmarkId: string;
  visitDate: string;
  visitTime: string;
  customNotes?: string;
}
