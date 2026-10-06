import { WeatherCondition, DayForecast } from '../types';

/**
 * Deterministic weather predictor engine mimicking:
 * - Two-hour forecast (api-open.data.gov.sg/v2/real-time/api/two-hr-forecast)
 * - 24-hour forecast (twenty-four-hr-forecast)
 * - 4-day outlook (four-day-outlook)
 * - Air temperature, rainfall, UV, PSI, PM2.5, relative humidity, wind speed
 */
export function predictSingaporeWeather(
  locationName: string,
  dateStr: string, // YYYY-MM-DD
  timeStr: string // HH:mm
): WeatherCondition {
  // Parse hour (0 - 23)
  const parsedHour = parseInt(timeStr.split(':')[0], 10);
  const hour = Number.isNaN(parsedHour) ? 12 : parsedHour;
  
  // Calculate a seed from the date and location string for stable determinism
  let seed = 0;
  for (let i = 0; i < (dateStr + locationName).length; i++) {
    seed = (seed * 31 + (dateStr + locationName).charCodeAt(i)) % 10000;
  }
  const variance = (seed % 10) / 10; // 0.0 - 0.9

  // Singapore tropical diurnal climate model:
  // - Early morning (06:00 - 09:00): 26 - 28°C, calm, high humidity (82-88%), low UV (0-2)
  // - Midday (11:00 - 14:30): 31 - 34°C, intense tropical sun, high UV (8-11), lower humidity (62-72%)
  // - Mid-Afternoon (14:30 - 17:00): frequent tropical convection showers / thunderstorms, cooling to 28-30°C
  // - Evening (17:30 - 20:00): 28 - 30°C, pleasant coastal breeze, low UV (0-1)
  // - Night (20:30 - 05:00): 26 - 28°C, breezy, tropical warm night

  let condition: WeatherCondition['label'] = 'Partly Cloudy';
  let icon = 'cloud-sun';
  let tempC = 29;
  let rainProb = 20;
  let rainMm = 0.0;
  let uvIndex = 3;
  let humidity = 75;
  let windSpeed = 12;
  let twoHourForecast = 'Partly cloudy conditions expected across the sector.';
  let packingTip = 'Light cotton wear, water bottle, and comfortable walking shoes.';
  let comfortRating: WeatherCondition['comfortRating'] = 'High Comfort';

  if (hour >= 6 && hour < 10) {
    // Early morning
    tempC = Math.round(26.5 + variance * 2);
    rainProb = Math.round(15 + variance * 15);
    rainMm = rainProb > 25 ? 0.4 : 0.0;
    uvIndex = Math.min(3, Math.round(1 + (hour - 6)));
    humidity = Math.round(80 + variance * 8);
    windSpeed = Math.round(8 + variance * 6);
    condition = variance > 0.6 ? 'Fair & Breezy' : 'Sunny';
    icon = 'sun';
    twoHourForecast = `Clear skies with gentle morning breeze around ${locationName}. Ideal for outdoor photography.`;
    packingTip = 'Chilled water bottle, sunglasses, and camera. Morning air is crisp and comfortable.';
    comfortRating = 'High Comfort';
  } else if (hour >= 10 && hour < 14) {
    // Midday tropical peak heat
    tempC = Math.round(31 + variance * 3);
    rainProb = Math.round(20 + variance * 25);
    rainMm = 0.0;
    uvIndex = Math.round(9 + variance * 2.5); // Very high
    humidity = Math.round(62 + variance * 10);
    windSpeed = Math.round(14 + variance * 8);
    condition = variance > 0.7 ? 'Partly Cloudy' : 'Sunny';
    icon = 'sun-medium';
    twoHourForecast = `Intense equatorial sunshine and high ambient heat across ${locationName}.`;
    packingTip = 'SPF 50+ sunscreen, UV umbrella, and hydration electrolytes. Stick to shaded walkways.';
    comfortRating = 'Tropical Heat';
  } else if (hour >= 14 && hour < 17) {
    // Mid-afternoon convection thunder shower window
    const isShowerDay = (seed % 3) !== 0; // 66% chance of classic Singapore afternoon shower
    if (isShowerDay) {
      tempC = Math.round(27 + variance * 2.5);
      rainProb = Math.round(65 + variance * 28);
      rainMm = parseFloat((8.5 + variance * 14).toFixed(1));
      uvIndex = 2;
      humidity = Math.round(86 + variance * 9);
      windSpeed = Math.round(18 + variance * 12);
      condition = rainMm > 15 ? 'Thundery Showers' : 'Passing Showers';
      icon = rainMm > 15 ? 'cloud-lightning' : 'cloud-rain';
      twoHourForecast = `Passing thundery showers over ${locationName}. Gusty winds during precipitation.`;
      packingTip = 'Sturdy compact umbrella (brolly), water-resistant footwear, and plan a sheltered coffee stop!';
      comfortRating = 'Rain Shield Needed';
    } else {
      tempC = Math.round(31 + variance * 2);
      rainProb = 30;
      rainMm = 0.0;
      uvIndex = 6;
      humidity = 70;
      windSpeed = 12;
      condition = 'Partly Cloudy';
      icon = 'cloud-sun';
      twoHourForecast = `Scattered clouds with mild localized gusts around ${locationName}.`;
      packingTip = 'Carry a small umbrella just in case; light clothing recommended.';
      comfortRating = 'Moderate Humidity';
    }
  } else if (hour >= 17 && hour < 20) {
    // Golden twilight & early evening
    tempC = Math.round(28.5 + variance * 2);
    rainProb = Math.round(15 + variance * 15);
    rainMm = 0.0;
    uvIndex = Math.max(0, Math.round(2 - (hour - 17)));
    humidity = Math.round(74 + variance * 8);
    windSpeed = Math.round(15 + variance * 7);
    condition = 'Fair & Breezy';
    icon = 'sunset';
    twoHourForecast = `Mild evening temperatures and steady coastal breezes around ${locationName}. Prime golden hour!`;
    packingTip = 'Perfect time for open-air strolls, night markets, and skyline photography.';
    comfortRating = 'High Comfort';
  } else {
    // Night
    tempC = Math.round(26 + variance * 2);
    rainProb = 15;
    rainMm = 0.0;
    uvIndex = 0;
    humidity = Math.round(82 + variance * 6);
    windSpeed = Math.round(10 + variance * 6);
    condition = 'Partly Cloudy';
    icon = 'moon-star';
    twoHourForecast = `Calm, warm tropical night conditions across ${locationName}.`;
    packingTip = 'Light evening clothing. Great for alfresco dining, hidden speakeasies, and rooftop vistas.';
    comfortRating = 'High Comfort';
  }

  // Calculate Feels-Like (heat index based on humidity & temperature)
  const feelsLikeC = Math.round(tempC + (humidity > 75 ? (tempC >= 30 ? 3.5 : 1.8) : 0.8));

  // Singapore air quality metrics (PSI 35-55 is standard good/moderate, PM2.5 8-18 ug/m3)
  const psi = Math.round(36 + (seed % 22));
  const pm25 = Math.round(10 + (seed % 12));

  const twentyFourHourOutlook = `Daily temperatures ranging from 25°C to 33°C. Anticipate localized moderate afternoon showers with sunny morning intervals across Singapore.`;

  return {
    label: condition,
    icon,
    rainProbability: rainProb,
    rainfallMm: rainMm,
    temperatureC: tempC,
    feelsLikeC,
    uvIndex,
    relativeHumidity: humidity,
    windSpeedKmh: windSpeed,
    psi,
    pm25,
    twoHourForecast,
    twentyFourHourOutlook,
    packingTip,
    comfortRating,
    dataMode: 'model-estimate',
    forecastTempMin: 25,
    forecastTempMax: 32,
    sourceLabel: 'Model estimate — not live NEA forecast',
    temperatureBasis: 'Outside available NEA forecast window (derived from Singapore historical climate normals)',
    rainRiskScore: rainProb >= 60 ? 'High' : rainProb >= 35 ? 'Moderate' : 'Low',
    isLiveObservation: false
  };
}

export function getFourDayForecast(startDateStr: string): DayForecast[] {
  const baseDate = new Date(startDateStr || '2026-10-06');
  const days: DayForecast[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 4; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()];
    const dateFormatted = d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });

    // Alternating Singapore conditions
    const scenarios = [
      { cond: 'Passing Showers', rain: 60, min: 25, max: 31, icon: 'cloud-rain' },
      { cond: 'Fair & Sunny', rain: 20, min: 26, max: 33, icon: 'sun' },
      { cond: 'Thundery Showers', rain: 75, min: 24, max: 30, icon: 'cloud-lightning' },
      { cond: 'Partly Cloudy', rain: 30, min: 25, max: 32, icon: 'cloud-sun' }
    ];
    const s = scenarios[i % scenarios.length];

    days.push({
      dayName,
      dateStr: dateFormatted,
      tempMin: s.min,
      tempMax: s.max,
      condition: s.cond,
      rainChance: s.rain,
      icon: s.icon
    });
  }

  return days;
}
