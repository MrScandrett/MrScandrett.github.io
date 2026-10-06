/**
 * weather-engine.js — Central Weather & Atmospheric Science Engine
 * Mr. Scandrett's ClassroomOS
 *
 * Provides shared meteorological calculations, Open-Meteo forecasting,
 * geocoding search, road driving safety analytics, and wardrobe layering advice.
 */
(function (global) {
  'use strict';

  // ── PRESET LOCATIONS ────────────────────────────────────────────────────────
  const PRESET_LOCATIONS = [
    { id: 'longwood', label: 'Longwood, FL (Classroom Base)', stationId: 'LW_FL_32750', latitude: 28.7031, longitude: -81.3384, climate: 'Humid Subtropical' },
    { id: 'nyc', label: 'New York, NY', stationId: 'NYC_NY_10001', latitude: 40.7128, longitude: -74.0060, climate: 'Humid Continental' },
    { id: 'seattle', label: 'Seattle, WA', stationId: 'SEA_WA_98101', latitude: 47.6062, longitude: -122.3321, climate: 'Marine West Coast' },
    { id: 'denver', label: 'Denver, CO (Mile High)', stationId: 'DEN_CO_80202', latitude: 39.7392, longitude: -104.9903, climate: 'Semi-Arid Continental' },
    { id: 'phoenix', label: 'Phoenix, AZ (Sonoran Desert)', stationId: 'PHX_AZ_85001', latitude: 33.4484, longitude: -112.0740, climate: 'Hot Desert' },
    { id: 'chicago', label: 'Chicago, IL (Windy City)', stationId: 'CHI_IL_60601', latitude: 41.8781, longitude: -87.6298, climate: 'Continental / Lake Effect' },
    { id: 'fairbanks', label: 'Fairbanks, AK (Subarctic)', stationId: 'FAI_AK_99701', latitude: 64.8378, longitude: -147.7164, climate: 'Subarctic' },
    { id: 'honolulu', label: 'Honolulu, HI', stationId: 'HNL_HI_96813', latitude: 21.3069, longitude: -157.8583, climate: 'Tropical Maritime' },
    { id: 'london', label: 'London, UK', stationId: 'LON_UK_EC1A', latitude: 51.5074, longitude: -0.1278, climate: 'Temperate Oceanic' },
    { id: 'tokyo', label: 'Tokyo, Japan', stationId: 'TYO_JP_10000', latitude: 35.6762, longitude: 139.6503, climate: 'Humid Subtropical' },
    { id: 'alert', label: 'Alert, Nunavut (High Arctic)', stationId: 'YLT_NU_X0A0', latitude: 82.5018, longitude: -62.3481, climate: 'Polar Tundra' }
  ];

  const DEFAULT_LOCATION = PRESET_LOCATIONS[0];
  const WEATHER_CACHE_KEY = 'weather-engine-cache-v2';
  const WEATHER_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

  // ── WMO WEATHER CODE MAPPINGS ───────────────────────────────────────────────
  const WMO_CODES = {
    0:  { label: 'Clear sky', icon: '☀️', severe: false, precipType: 'none' },
    1:  { label: 'Mainly clear', icon: '🌤️', severe: false, precipType: 'none' },
    2:  { label: 'Partly cloudy', icon: '⛅', severe: false, precipType: 'none' },
    3:  { label: 'Overcast', icon: '☁️', severe: false, precipType: 'none' },
    45: { label: 'Fog', icon: '🌫️', severe: false, precipType: 'fog' },
    48: { label: 'Depositing rime fog', icon: '🌫️', severe: true, precipType: 'ice_fog' },
    51: { label: 'Light drizzle', icon: '🌦️', severe: false, precipType: 'rain' },
    53: { label: 'Moderate drizzle', icon: '🌦️', severe: false, precipType: 'rain' },
    55: { label: 'Dense drizzle', icon: '🌧️', severe: false, precipType: 'rain' },
    56: { label: 'Light freezing drizzle', icon: '🌧️❄️', severe: true, precipType: 'freezing_rain' },
    57: { label: 'Dense freezing drizzle', icon: '🌧️❄️', severe: true, precipType: 'freezing_rain' },
    61: { label: 'Slight rain', icon: '🌦️', severe: false, precipType: 'rain' },
    63: { label: 'Moderate rain', icon: '🌧️', severe: false, precipType: 'rain' },
    65: { label: 'Heavy rain', icon: '🌧️', severe: false, precipType: 'heavy_rain' },
    66: { label: 'Light freezing rain', icon: '🧊🌧️', severe: true, precipType: 'freezing_rain' },
    67: { label: 'Heavy freezing rain', icon: '🧊🌧️', severe: true, precipType: 'freezing_rain' },
    71: { label: 'Slight snow fall', icon: '🌨️', severe: false, precipType: 'snow' },
    73: { label: 'Moderate snow fall', icon: '🌨️', severe: false, precipType: 'snow' },
    75: { label: 'Heavy snow fall', icon: '❄️🌨️', severe: true, precipType: 'heavy_snow' },
    77: { label: 'Snow grains', icon: '❄️', severe: false, precipType: 'snow' },
    80: { label: 'Slight rain showers', icon: '🌦️', severe: false, precipType: 'rain' },
    81: { label: 'Moderate rain showers', icon: '🌧️', severe: false, precipType: 'rain' },
    82: { label: 'Violent rain showers', icon: '⛈️', severe: true, precipType: 'heavy_rain' },
    85: { label: 'Slight snow showers', icon: '🌨️', severe: false, precipType: 'snow' },
    86: { label: 'Heavy snow showers', icon: '❄️🌨️', severe: true, precipType: 'heavy_snow' },
    95: { label: 'Thunderstorm', icon: '⛈️', severe: true, precipType: 'thunderstorm' },
    96: { label: 'Thunderstorm with slight hail', icon: '⛈️🧊', severe: true, precipType: 'hail' },
    99: { label: 'Thunderstorm with heavy hail', icon: '⛈️🧊', severe: true, precipType: 'hail' }
  };

  // ── METEOROLOGICAL CALCULATIONS ─────────────────────────────────────────────

  /**
   * Calculates Dew Point in Fahrenheit using the Magnus formula.
   * Dew point reflects absolute atmospheric moisture.
   * @param {number} tempF - Temperature in Fahrenheit
   * @param {number} rh - Relative humidity (0 - 100)
   * @returns {number} Dew Point in Fahrenheit
   */
  function calculateDewPoint(tempF, rh) {
    if (rh <= 0) return tempF - 50;
    const tempC = (tempF - 32) * (5 / 9);
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(rh / 100);
    const dewPointC = (b * alpha) / (a - alpha);
    return Math.round((dewPointC * (9 / 5) + 32) * 10) / 10;
  }

  /**
   * Describes Dew Point comfort level for human physiology.
   * @param {number} dewF - Dew Point in Fahrenheit
   */
  function dewPointComfort(dewF) {
    if (dewF < 50) return { category: 'Crisp & Dry', feel: 'Pleasantly dry. Low moisture in the air.' };
    if (dewF < 55) return { category: 'Comfortable', feel: 'Ideal comfort level for human skin evaporation.' };
    if (dewF < 60) return { category: 'Pleasant', feel: 'Comfortable, slight hint of moisture.' };
    if (dewF < 65) return { category: 'Noticeably Humid', feel: 'Air begins feeling sticky during activity.' };
    if (dewF < 70) return { category: 'Muggy & Sticky', feel: 'Sweat evaporates slower; outdoor effort feels heavy.' };
    if (dewF < 75) return { category: 'Oppressive', feel: 'Very humid and uncomfortable; heat stress risk elevated.' };
    return { category: 'Extreme Tropical', feel: 'Suffocatingly humid; sweat struggles to cool the body.' };
  }

  /**
   * Lifting Condensation Level (LCL): Estimates cloud base height above ground.
   * LCL (feet) ≈ ((Temp - DewPoint) / 4.4) * 1000
   * @param {number} tempF - Air temperature (°F)
   * @param {number} dewF - Dew point (°F)
   * @returns {{ feet: number, meters: number }}
   */
  function calculateCloudBase(tempF, dewF) {
    const spread = Math.max(0, tempF - dewF);
    const feet = Math.round((spread / 4.4) * 1000);
    const meters = Math.round(feet * 0.3048);
    return { feet, meters, spread: Math.round(spread * 10) / 10 };
  }

  /**
   * Converts wind degrees to 8-point and 16-point compass directions.
   */
  function degreesToCompass(deg) {
    if (deg == null) return { short: 'VRB', full: 'Variable' };
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const fullPoints = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const idx = Math.round(deg / 45) % 8;
    return { short: points[idx], full: fullPoints[idx], degrees: deg };
  }

  /**
   * Beaufort Wind Scale translation.
   */
  function beaufortScale(speedMph) {
    if (speedMph < 1) return { number: 0, name: 'Calm', effect: 'Smoke rises vertically.' };
    if (speedMph <= 3) return { number: 1, name: 'Light air', effect: 'Smoke drift indicates wind direction.' };
    if (speedMph <= 7) return { number: 2, name: 'Light breeze', effect: 'Wind felt on face; leaves rustle.' };
    if (speedMph <= 12) return { number: 3, name: 'Gentle breeze', effect: 'Leaves and small twigs in constant motion.' };
    if (speedMph <= 18) return { number: 4, name: 'Moderate breeze', effect: 'Raises dust and loose paper; small branches move.' };
    if (speedMph <= 24) return { number: 5, name: 'Fresh breeze', effect: 'Small trees in leaf begin to sway.' };
    if (speedMph <= 31) return { number: 6, name: 'Strong breeze', effect: 'Large branches in motion; umbrellas used with difficulty.' };
    if (speedMph <= 38) return { number: 7, name: 'Near gale', effect: 'Whole trees in motion; walking against wind is inconvenient.' };
    if (speedMph <= 46) return { number: 8, name: 'Gale', effect: 'Twigs break off trees; vehicles veer on highways.' };
    if (speedMph <= 54) return { number: 9, name: 'Strong gale', effect: 'Slight structural damage occurs (chimney pots and slates removed).' };
    if (speedMph <= 63) return { number: 10, name: 'Storm', effect: 'Trees uprooted; considerable structural damage.' };
    if (speedMph <= 72) return { number: 11, name: 'Violent storm', effect: 'Widespread damage very rarely experienced.' };
    return { number: 12, name: 'Hurricane force', effect: 'Devastation occurring; seek sturdy shelter.' };
  }

  /**
   * Barometric pressure analysis and tendency interpretation.
   * Standard sea level pressure = 1013.25 hPa / 29.92 inHg.
   */
  function analyzePressure(hPa) {
    const inHg = Math.round((hPa * 0.02953) * 100) / 100;
    let system = 'Normal';
    let meaning = 'Stable intermediate air mass.';
    if (hPa >= 1022) {
      system = 'Strong High Pressure';
      meaning = 'Sinking air (subsidence) suppresses clouds; expect fair, stable, clear weather.';
    } else if (hPa >= 1014) {
      system = 'Moderate High Pressure';
      meaning = 'Generally stable conditions with light winds and minimal rain chance.';
    } else if (hPa >= 1005) {
      system = 'Normal / Neutral Pressure';
      meaning = 'Standard atmospheric boundary. Weather driven by local terrain and moisture.';
    } else if (hPa >= 995) {
      system = 'Low Pressure System';
      meaning = 'Rising air converges, cools, and condenses. Clouds, winds, and precipitation likely.';
    } else {
      system = 'Deep / Severe Low Pressure';
      meaning = 'Intense cyclonic activity, strong storm fronts, gale winds, or tropical system.';
    }
    return { hPa: Math.round(hPa * 10) / 10, inHg, system, meaning };
  }

  /**
   * UV Index classification and skin safety.
   */
  function analyzeUV(uv) {
    if (uv >= 11) return { category: 'Extreme', color: '#9c27b0', burnTime: 'Under 10 mins', advice: 'Avoid sun outside 10am–4pm. Full protection mandatory: UV400 glasses, SPF 50+, hat, shade.' };
    if (uv >= 8) return { category: 'Very High', color: '#f44336', burnTime: '15–25 mins', advice: 'Extra protection needed. Seek shade during midday, wear hat and protective clothing.' };
    if (uv >= 6) return { category: 'High', color: '#ff9800', burnTime: '30–45 mins', advice: 'Protection required: apply SPF 30+ every 2 hours, wear sunglasses and a wide-brim hat.' };
    if (uv >= 3) return { category: 'Moderate', color: '#ffc107', burnTime: '45–60 mins', advice: 'Take precautions: wear sunglasses, use sunscreen if staying outdoors over 45 minutes.' };
    return { category: 'Low', color: '#4caf50', burnTime: 'Over 60 mins', advice: 'Minimal danger for average skin. Wear sunglasses on bright days or snow cover.' };
  }

  /**
   * Moon phase calculation from date.
   */
  function getMoonPhase(date = new Date()) {
    const knownNew = new Date('2000-01-06T18:14:00Z');
    const synodicMonth = 29.53058867;
    const elapsed = (date - knownNew) / 86400000;
    const phase = ((elapsed % synodicMonth) + synodicMonth) % synodicMonth;
    const illumination = Math.round((1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)) / 2 * 100);
    let name, emoji;
    if (phase < 1.85)       { name = 'New Moon';        emoji = '🌑'; }
    else if (phase < 7.38)  { name = 'Waxing Crescent'; emoji = '🌒'; }
    else if (phase < 9.22)  { name = 'First Quarter';   emoji = '🌓'; }
    else if (phase < 14.77) { name = 'Waxing Gibbous';  emoji = '🌔'; }
    else if (phase < 16.61) { name = 'Full Moon';       emoji = '🌕'; }
    else if (phase < 22.15) { name = 'Waning Gibbous';  emoji = '🌖'; }
    else if (phase < 23.99) { name = 'Last Quarter';    emoji = '🌗'; }
    else                    { name = 'Waning Crescent'; emoji = '🌘'; }
    return { name, emoji, illumination, phaseDays: Math.round(phase * 10) / 10 };
  }

  // ── DECISION ENGINE 1: SAFE DRIVING & ROAD PHYSICS ──────────────────────────

  /**
   * Evaluates road driving conditions and braking physics.
   * Formula: Braking Distance d = v^2 / (2 * μ * g)
   * where:
   *   v = speed in ft/s (v_mph * 1.467)
   *   μ = coefficient of friction (dry: 0.75, wet: 0.40, packed snow: 0.20, black ice: 0.08)
   *   g = gravitational acceleration (32.174 ft/s^2)
   *
   * @param {object} weather - Weather dataset
   * @param {number} [speedMph=55] - Vehicle cruising speed
   */
  function evaluateDrivingConditions(weather, speedMph = 55) {
    const tempF = weather.temperature;
    const weatherCode = weather.weatherCode;
    const windGusts = weather.windGusts || weather.wind;
    const rainChance = weather.rainChance || 0;
    const visibilityMiles = weather.visibilityMiles != null ? weather.visibilityMiles : 10;
    const isFreezing = tempF <= 32;
    const nearFreezing = tempF <= 36 && tempF > 32;

    const hazards = [];
    let status = 'NOMINAL';
    let statusClass = 'good';
    let statusTitle = 'Good Driving Conditions';
    let frictionMu = 0.75; // baseline dry asphalt
    let roadState = 'Dry Asphalt';

    // 1. Precipitation & Wet Road / Hydroplaning
    const isSnowing = (weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86);
    const isFreezingRain = (weatherCode === 56 || weatherCode === 57 || weatherCode === 66 || weatherCode === 67 || weatherCode === 48);
    const isHeavyRain = (weatherCode === 65 || weatherCode === 82 || weatherCode >= 95);
    const isRaining = (weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || rainChance >= 50;

    if (isFreezingRain) {
      frictionMu = 0.07;
      roadState = 'Black Ice / Glaze Freezing Rain';
      status = 'SEVERE';
      statusClass = 'severe';
      statusTitle = 'Extreme Hazard: Glaze Ice';
      hazards.push({
        type: 'black_ice',
        severity: 'critical',
        title: 'Freezing Rain & Black Ice',
        desc: 'Invisible glaze ice eliminates tire grip. Steering and braking are severely compromised. Avoid travel until salt/sand crews treat roads.'
      });
    } else if (isSnowing) {
      if (tempF <= 25) {
        frictionMu = 0.18;
        roadState = 'Hard-Packed Snow & Ice';
      } else {
        frictionMu = 0.22;
        roadState = 'Wet Slush / Snow';
      }
      status = 'HAZARDOUS';
      statusClass = 'hazardous';
      statusTitle = 'Winter Storm Hazards';
      hazards.push({
        type: 'snow',
        severity: 'high',
        title: 'Snow Accumulation & Slush Rutting',
        desc: 'Greatly reduced traction. Slush ridges can pull steering sharply. Accelerate, steer, and brake gently in a straight line.'
      });
    } else if (isHeavyRain) {
      frictionMu = 0.35;
      roadState = 'Standing Water / Heavy Rain';
      status = 'HAZARDOUS';
      statusClass = 'hazardous';
      statusTitle = 'Hydroplaning & Flash Flood Risk';
      hazards.push({
        type: 'hydroplaning',
        severity: 'high',
        title: 'Hydroplaning Danger',
        desc: 'At speeds over 35–45 mph, water wedge can lift tires off the pavement. Never use cruise control on wet roads. If hydroplaning occurs, ease off gas; do not slam brakes.'
      });
    } else if (isRaining) {
      frictionMu = 0.45;
      roadState = 'Wet Pavement';
      if (status !== 'HAZARDOUS' && status !== 'SEVERE') {
        status = 'CAUTION';
        statusClass = 'caution';
        statusTitle = 'Wet Roads: Increased Stopping Distance';
      }
      hazards.push({
        type: 'wet_road',
        severity: 'moderate',
        title: 'Wet Asphalt Friction Drop',
        desc: 'Tire braking distance increases by ~60%. Road oils rise during initial rain, creating extra slick surfaces for the first 15–20 minutes.'
      });
    }

    // 2. Bridge Freezing Warning (Convective physics)
    if ((nearFreezing || isFreezing) && (isRaining || weather.humidity >= 85 || weather.dewPoint >= 30)) {
      hazards.push({
        type: 'bridge_freeze',
        severity: isFreezing ? 'high' : 'moderate',
        title: 'Bridge Deck Freezing Hazard',
        desc: 'Bridges lose heat from both above and underneath by convection. Elevated bridge decks and overpasses freeze before ground-level road surfaces!'
      });
      if (status === 'NOMINAL') {
        status = 'CAUTION';
        statusClass = 'caution';
        statusTitle = 'Bridge Freezing Risk';
      }
    }

    // 3. Visibility & Fog
    if (visibilityMiles < 0.25 || weatherCode === 45 || weatherCode === 48) {
      hazards.push({
        type: 'fog',
        severity: 'high',
        title: 'Dense Fog: Severe Visibility Reduction',
        desc: 'Visibility under 1/4 mile. Use LOW-BEAM headlights or fog lights only. High beams reflect off micro-droplets directly back into your eyes, blinding you.'
      });
      if (status !== 'SEVERE') {
        status = 'HAZARDOUS';
        statusClass = 'hazardous';
        statusTitle = 'Dense Fog Hazard';
      }
    } else if (visibilityMiles < 1.0) {
      hazards.push({
        type: 'reduced_visibility',
        severity: 'moderate',
        title: 'Reduced Visibility',
        desc: 'Visibility restricted under 1 mile. Turn on headlights to make your vehicle visible to oncoming and trailing drivers.'
      });
      if (status === 'NOMINAL') {
        status = 'CAUTION';
        statusClass = 'caution';
        statusTitle = 'Caution: Limited Visibility';
      }
    }

    // 4. High Wind & Crosswinds
    if (windGusts >= 40) {
      hazards.push({
        type: 'high_wind',
        severity: 'high',
        title: `High Wind Gusts (${Math.round(windGusts)} MPH)`,
        desc: 'Hazardous crosswinds for high-profile vehicles (vans, trucks, buses, trailers). Sudden gusts on bridges and open highway cuts can shift lane position.'
      });
      if (status !== 'SEVERE') {
        status = 'HAZARDOUS';
        statusClass = 'hazardous';
        statusTitle = 'High Wind Warning';
      }
    } else if (windGusts >= 28) {
      hazards.push({
        type: 'gusty_wind',
        severity: 'moderate',
        title: `Brisk Wind Gusts (${Math.round(windGusts)} MPH)`,
        desc: 'Maintain two hands firmly on the wheel. Watch for flying debris, branches, and sudden bridge gusts.'
      });
      if (status === 'NOMINAL') {
        status = 'CAUTION';
        statusClass = 'caution';
        statusTitle = 'Brisk Winds';
      }
    }

    // 5. Thunderstorms & Lightning
    if (weatherCode >= 95) {
      hazards.push({
        type: 'thunderstorm',
        severity: 'high',
        title: 'Severe Thunderstorm & Lightning',
        desc: 'Sudden downpours, flash flooding, and zero visibility. "Turn Around, Don’t Drown" — just 12 inches of rushing water can float a passenger car.'
      });
      status = 'HAZARDOUS';
      statusClass = 'hazardous';
      statusTitle = 'Severe Thunderstorm En Route';
    }

    // ── Braking Physics Calculation ──
    const g = 32.174; // ft/s^2
    const v_fps = speedMph * 1.46667;
    // Dry baseline
    const dryDistFt = Math.round((v_fps * v_fps) / (2 * 0.75 * g));
    // Wet / actual road state
    const actualDistFt = Math.round((v_fps * v_fps) / (2 * frictionMu * g));
    // Reaction distance (assuming 1.5s human reaction time)
    const reactionDistFt = Math.round(v_fps * 1.5);
    const totalStoppingDistFt = actualDistFt + reactionDistFt;
    const distanceMultiplier = Math.round((actualDistFt / dryDistFt) * 10) / 10;

    // Follow distance seconds recommendation
    let followDistanceSec = 3;
    if (status === 'CAUTION') followDistanceSec = 5;
    if (status === 'HAZARDOUS') followDistanceSec = 8;
    if (status === 'SEVERE') followDistanceSec = 12;

    const checklist = [
      { rule: 'Headlights with Wipers', ok: true, note: isRaining ? 'MANDATORY: State law requires headlights when wipers are active.' : 'Use low beams in low light, rain, and fog.' },
      { rule: 'Cruise Control', ok: !isRaining && !isSnowing && !isFreezingRain, note: (isRaining || isSnowing || isFreezingRain) ? 'DISENGAGE: Cruise control can cause instant spin-outs on wet or icy pavement.' : 'Safe to use on dry, open roadways.' },
      { rule: 'Following Distance', ok: true, note: `Keep at least ${followDistanceSec} seconds of space behind the vehicle ahead.` },
      { rule: 'Tire Pressure & Tread', ok: true, note: 'Adequate tread channels water away to prevent hydroplaning. Check tire pressure in cold weather.' }
    ];

    return {
      status,
      statusClass,
      statusTitle,
      roadState,
      frictionMu,
      speedMph,
      brakingDistanceFt: actualDistFt,
      dryBrakingDistanceFt: dryDistFt,
      reactionDistanceFt: reactionDistFt,
      totalStoppingDistFt,
      distanceMultiplier,
      followDistanceSec,
      hazards,
      checklist
    };
  }

  // ── DECISION ENGINE 2: WARDROBE & THERMAL LAYERING ──────────────────────────

  /**
   * Evaluates outdoor thermal comfort and generates a comprehensive 3-layer wardrobe system.
   * Based on Apparent Temperature ("Feels Like"), wind chill, UV index, and precipitation.
   *
   * @param {object} weather - Current weather data
   */
  function evaluateClothing(weather) {
    const tempF = Math.round(weather.temperature);
    const feelsF = Math.round(weather.feelsLike != null ? weather.feelsLike : tempF);
    const rainChance = weather.rainChance || 0;
    const isRaining = (weather.weatherCode >= 51 && weather.weatherCode <= 67) || (weather.weatherCode >= 80 && weather.weatherCode <= 82) || rainChance >= 50;
    const isSnowing = (weather.weatherCode >= 71 && weather.weatherCode <= 77) || (weather.weatherCode >= 85 && weather.weatherCode <= 86);
    const windSpeed = weather.wind || 0;
    const uv = weather.uvIndex != null ? weather.uvIndex : 2;

    let thermalCategory = '';
    let emoji = '🌤️';
    let summaryText = '';
    let baseLayer = '';
    let midLayer = '';
    let outerShell = '';
    let lowerBody = '';
    let footwear = '';
    let accessories = [];
    let recessRating = 'Normal Outdoor Recess';

    if (feelsF >= 95) {
      thermalCategory = 'Extreme Heat Hazard';
      emoji = '🥵';
      summaryText = `Dangerous heat at ${feelsF}°F feels-like. Lightest breathable clothing, maximum ventilation, and shade.`;
      baseLayer = 'Ultra-light moisture-wicking synthetic or linen (loose fit)';
      midLayer = 'None (avoid extra insulation)';
      outerShell = 'None / UV rashguard if in direct sun';
      lowerBody = 'Breathable lightweight shorts or moisture-wicking skirts';
      footwear = 'Breathable mesh sneakers or cushioned ventilated sandals';
      accessories.push('Wide-brim sun hat (3+ inch brim)', 'UV400 protective sunglasses', 'Broad-spectrum SPF 50+ sunscreen', 'Electrolyte water bottle');
      recessRating = 'Restricted / Shaded Recess Only (Heat Stress Alert)';
    } else if (feelsF >= 85) {
      thermalCategory = 'Hot & Sunny';
      emoji = '☀️';
      summaryText = `Hot at ${feelsF}°F! T-shirt, shorts, and sun defense are top priorities.`;
      baseLayer = 'Lightweight cotton or technical sports t-shirt';
      midLayer = 'None needed';
      outerShell = 'None';
      lowerBody = 'Shorts, lightweight athletic pants, or skirts';
      footwear = 'Canvas shoes, light sneakers, or sandals';
      accessories.push('Baseball cap or sun visor', 'Sunglasses', 'SPF 30+ sunscreen');
      recessRating = 'Full Outdoor Recess (Frequent Hydration Breaks)';
    } else if (feelsF >= 72) {
      thermalCategory = 'Warm & Pleasant';
      emoji = '😎';
      summaryText = `Comfortable warmth at ${feelsF}°F. Ideal weather for simple single-layer outfits.`;
      baseLayer = 'Short-sleeve tee, polo, or light button-down';
      midLayer = 'Optional light overshirt or cardigan for morning/evening';
      outerShell = 'None';
      lowerBody = 'Jeans, chinos, leggings, or casual shorts';
      footwear = 'Everyday sneakers, flats, or slip-ons';
      if (uv >= 6) accessories.push('Sunglasses', 'Sunscreen on exposed skin');
      recessRating = 'Ideal Recess Conditions';
    } else if (feelsF >= 60) {
      thermalCategory = 'Mild / Transitional';
      emoji = '🌤️';
      summaryText = `Mild at ${feelsF}°F. Bring a light layer you can take off as afternoon warms up.`;
      baseLayer = 'Long-sleeve tee or soft crewneck';
      midLayer = 'Lightweight hoodie, fleece zip, or sweater';
      outerShell = 'Windbreaker or denim jacket (handy for breezes)';
      lowerBody = 'Full-length denim, sweatpants, or travel pants';
      footwear = 'Closed-toe sneakers or casual leather shoes';
      recessRating = 'Full Outdoor Recess';
    } else if (feelsF >= 48) {
      thermalCategory = 'Cool & Crisp';
      emoji = '🍂';
      summaryText = `Chilly at ${feelsF}°F. Two-to-three layers keep core body heat locked in.`;
      baseLayer = 'Thermal or long-sleeve cotton shirt';
      midLayer = 'Insulating wool sweater, mid-weight fleece, or sweatshirt';
      outerShell = 'Light puffer vest, utility jacket, or trench coat';
      lowerBody = 'Heavy denim jeans or fleece-lined leggings';
      footwear = 'Warm socks and sturdy sneakers or ankle boots';
      accessories.push('Light beanie or knit hat for early mornings');
      recessRating = 'Full Outdoor Recess (Coats Required)';
    } else if (feelsF >= 32) {
      thermalCategory = 'Cold / Winter Layering';
      emoji = '🧥';
      summaryText = `Cold at ${feelsF}°F! Bundle up with full winter jacket, warm socks, and gloves.`;
      baseLayer = 'Merino wool or synthetic thermal long underwear';
      midLayer = 'Heavy fleece pullover, thick wool sweater, or down vest';
      outerShell = 'Insulated winter parka or heavy down coat with hood';
      lowerBody = 'Heavy pants, corduroys, or thermal-lined trousers';
      footwear = 'Insulated winter boots or weatherized shoes with wool socks';
      accessories.push('Insulated knit beanie', 'Warm fleece gloves or mittens', 'Knit scarf or fleece neck gaiter');
      recessRating = 'Modified Recess (Winter Gear Mandatory, 20-min max)';
    } else {
      thermalCategory = 'Freezing / Sub-Zero';
      emoji = '🥶';
      summaryText = `Freezing cold at ${feelsF}°F! Frostbite and hypothermia danger if skin is exposed.`;
      baseLayer = 'Heavyweight moisture-wicking thermal base layers (top & bottom)';
      midLayer = 'High-loft fleece or down jacket with thermal loft';
      outerShell = 'Windproof, waterproof heavy Arctic expedition parka with storm hood';
      lowerBody = 'Insulated snow pants or ski bibs over thermal pants';
      footwear = 'Waterproof rated winter snow boots (thinsulate) with thick wool socks';
      accessories.push('Thermal balaclava or windproof face mask', 'Heavy insulated mittens (warmer than gloves)', 'Ear protection and snow goggles');
      recessRating = 'Indoor Recess Mandatory (Freeze Hazard)';
    }

    // Rain / Wet Overrides
    if (isRaining || rainChance >= 60) {
      outerShell = 'Waterproof breathable hardshell raincoat (Gore-Tex or treated nylon) with hood';
      footwear = 'Waterproof rain boots or treated water-resistant shoes';
      accessories.push('Sturdy wind-resistant umbrella', 'Waterproof backpack cover');
    } else if (rainChance >= 35) {
      accessories.push('Compact umbrella in backpack just in case');
    }

    if (isSnowing) {
      outerShell = 'Waterproof insulated ski/snow jacket';
      footwear = 'Waterproof snow boots with deep traction tread';
      accessories.push('Waterproof insulated ski mittens');
    }

    // High Wind modifier
    if (windSpeed >= 20) {
      outerShell += ' (Wind-resistant fabric shell strongly advised)';
      accessories.push('Wind-blocking neck warmer');
    }

    return {
      thermalCategory,
      emoji,
      tempF,
      feelsF,
      summaryText,
      recessRating,
      layers: {
        base: baseLayer,
        mid: midLayer,
        outer: outerShell,
        lower: lowerBody,
        footwear,
        accessories: [...new Set(accessories)]
      }
    };
  }

  // ── DATA FETCHING & API INTEGRATION ─────────────────────────────────────────

  /**
   * Synthesizes realistic meteorological data when offline or network fails.
   */
  function synthesizeOfflineWeather(location) {
    const lat = location.latitude || 28.7;
    const isCold = Math.abs(lat) > 55;
    const isTropical = Math.abs(lat) < 25;
    const isDesert = location.climate && location.climate.includes('Desert');

    let baseTemp = 74;
    let code = 2; // partly cloudy
    let rh = 62;
    let wind = 9;

    if (isCold) {
      baseTemp = 28;
      code = 71; // light snow
      rh = 75;
      wind = 12;
    } else if (isDesert) {
      baseTemp = 92;
      code = 0; // clear
      rh = 20;
      wind = 8;
    } else if (isTropical) {
      baseTemp = 82;
      code = 1;
      rh = 76;
      wind = 11;
    } else if (location.id === 'seattle') {
      baseTemp = 54;
      code = 51; // drizzle
      rh = 84;
      wind = 8;
    } else if (location.id === 'denver') {
      baseTemp = 58;
      code = 2;
      rh = 36;
      wind = 14;
    }

    const dew = calculateDewPoint(baseTemp, rh);
    const dewFeel = dewPointComfort(dew);
    const cloudBase = calculateCloudBase(baseTemp, dew);
    const wmo = WMO_CODES[code] || WMO_CODES[0];
    const compass = degreesToCompass(75);
    const beaufort = beaufortScale(wind);
    const pressure = analyzePressure(1016.5);
    const uv = isDesert ? 9 : (isCold ? 1 : 6);
    const uvInfo = analyzeUV(uv);

    const now = Date.now();
    const sunriseEpoch = new Date().setHours(6, 45, 0, 0);
    const sunsetEpoch = new Date().setHours(19, 15, 0, 0);
    const moon = getMoonPhase(new Date());

    const hourly = [];
    for (let i = 0; i < 24; i++) {
      const hDate = new Date();
      hDate.setHours(hDate.getHours() + i);
      const hHour = hDate.getHours();
      const hLabel = hHour === 0 ? '12 AM' : (hHour === 12 ? '12 PM' : (hHour > 12 ? `${hHour - 12} PM` : `${hHour} AM`));
      const delta = Math.round(Math.sin((hHour - 6) / 24 * Math.PI * 2) * 8);
      hourly.push({
        timeLabel: hLabel,
        temp: baseTemp + delta,
        feelsLike: baseTemp + delta,
        dewPoint: dew,
        precipProb: code >= 50 ? 45 : 10,
        windSpeed: wind,
        windGust: wind + 6,
        icon: (hHour < 6 || hHour > 20) ? '🌙' : wmo.icon,
        code
      });
    }

    const daily = [];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 0; d < 7; d++) {
      const dDate = new Date();
      dDate.setDate(dDate.getDate() + d);
      daily.push({
        dateStr: dDate.toISOString().split('T')[0],
        dayName: d === 0 ? 'Today' : weekdayNames[dDate.getDay()],
        icon: wmo.icon,
        condition: wmo.label,
        code,
        min: baseTemp - 10,
        max: baseTemp + 6,
        rainChance: code >= 50 ? 60 : 15,
        precipSum: code >= 50 ? 0.25 : 0,
        uvMax: uv
      });
    }

    const weatherData = {
      location: {
        label: location.label || 'Your Location',
        stationId: location.stationId || 'WX_DEFAULT_01',
        latitude: lat,
        longitude: location.longitude || -81.3,
        climate: location.climate || 'Temperate'
      },
      temperature: baseTemp,
      feelsLike: baseTemp,
      condition: wmo.label,
      weatherCode: code,
      icon: wmo.icon,
      isDay: true,
      humidity: rh,
      dewPoint: dew,
      dewComfort: dewFeel,
      cloudBase,
      cloudCover: 35,
      pressure,
      wind,
      windDirection: 75,
      windCompass: compass,
      windGusts: wind + 7,
      beaufort,
      uvIndex: uv,
      uvInfo,
      rainChance: code >= 50 ? 55 : 15,
      precipCurrent: 0,
      min: baseTemp - 10,
      max: baseTemp + 6,
      sunriseEpoch,
      sunsetEpoch,
      moon,
      hourly,
      daily,
      visibilityMiles: code === 45 ? 0.5 : 10,
      savedAt: now,
      isSimulated: true
    };

    weatherData.driving = evaluateDrivingConditions(weatherData, 55);
    weatherData.clothing = evaluateClothing(weatherData);

    return weatherData;
  }

  /**
   * Fetches full forecast and hourly telemetry from Open-Meteo.
   * @param {object} location - { latitude, longitude, label, stationId }
   */
  async function fetchWeather(location = DEFAULT_LOCATION) {
    const lat = location.latitude;
    const lon = location.longitude;

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m');
    url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,visibility,wind_speed_10m,wind_gusts_10m,uv_index');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit', 'mph');
    url.searchParams.set('precipitation_unit', 'inch');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'auto');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let payload;
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) throw new Error(`Weather service error: ${response.status}`);
      payload = await response.json();
    } catch (fetchErr) {
      // Offline fallback: synthesize realistic meteorological dataset
      return synthesizeOfflineWeather(location);
    } finally {
      clearTimeout(timeout);
    }

    const cur = payload && payload.current;
    const daily = payload && payload.daily;
    const hourly = payload && payload.hourly;
    if (!cur || !daily || !daily.time) {
      return synthesizeOfflineWeather(location);
    }

    const code = cur.weather_code || 0;
    const wmo = WMO_CODES[code] || { label: 'Clear', icon: '☀️', severe: false, precipType: 'none' };
    const currentIcon = (cur.is_day === 0 && code <= 1) ? '🌙' : wmo.icon;
    const temp = Math.round(cur.temperature_2m);
    const feels = Math.round(cur.apparent_temperature != null ? cur.apparent_temperature : temp);
    const rh = Math.round(cur.relative_humidity_2m || 50);
    const dew = calculateDewPoint(temp, rh);
    const dewFeel = dewPointComfort(dew);
    const cloudBase = calculateCloudBase(temp, dew);
    const compass = degreesToCompass(cur.wind_direction_10m);
    const beaufort = beaufortScale(cur.wind_speed_10m || 0);
    const pressure = analyzePressure(cur.pressure_msl || cur.surface_pressure || 1013.25);
    const uvMaxToday = Number(daily.uv_index_max && daily.uv_index_max[0]) || 0;
    const uvInfo = analyzeUV(uvMaxToday);
    const rainChanceToday = Number(daily.precipitation_probability_max && daily.precipitation_probability_max[0]) || 0;

    // Ephemeris & Sun
    const sunriseIso = daily.sunrise && daily.sunrise[0];
    const sunsetIso = daily.sunset && daily.sunset[0];
    const offsetSec = payload.utc_offset_seconds || 0;
    const sunriseEpoch = sunriseIso ? (Date.parse(`${sunriseIso}:00Z`) - offsetSec * 1000) : null;
    const sunsetEpoch = sunsetIso ? (Date.parse(`${sunsetIso}:00Z`) - offsetSec * 1000) : null;
    const moon = getMoonPhase(new Date());

    // 24-Hour hourly forecast slice (from current hour)
    const nowHourIndex = Math.min(Math.max(0, new Date().getHours()), 23);
    const hourlySlice = [];
    if (hourly && hourly.time) {
      for (let i = nowHourIndex; i < nowHourIndex + 24 && i < hourly.time.length; i++) {
        const timeIso = hourly.time[i];
        const hDate = new Date(timeIso);
        const hHour = hDate.getHours();
        const hLabel = hHour === 0 ? '12 AM' : (hHour === 12 ? '12 PM' : (hHour > 12 ? `${hHour - 12} PM` : `${hHour} AM`));
        const hCode = hourly.weather_code ? hourly.weather_code[i] : 0;
        const hWmo = WMO_CODES[hCode] || { icon: '🌤️' };
        hourlySlice.push({
          timeLabel: hLabel,
          temp: Math.round(hourly.temperature_2m[i]),
          feelsLike: Math.round(hourly.apparent_temperature[i]),
          dewPoint: Math.round(hourly.dew_point_2m ? hourly.dew_point_2m[i] : (hourly.temperature_2m[i] - 10)),
          precipProb: Math.round(hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0),
          windSpeed: Math.round(hourly.wind_speed_10m ? hourly.wind_speed_10m[i] : 0),
          windGust: Math.round(hourly.wind_gusts_10m ? hourly.wind_gusts_10m[i] : 0),
          icon: hWmo.icon,
          code: hCode
        });
      }
    }

    // 7-day daily forecast
    const dailyForecast = [];
    for (let d = 0; d < daily.time.length && d < 7; d++) {
      const dDate = new Date(`${daily.time[d]}T12:00:00`);
      const dCode = daily.weather_code ? daily.weather_code[d] : 0;
      const dWmo = WMO_CODES[dCode] || { label: 'Clear', icon: '☀️' };
      dailyForecast.push({
        dateStr: daily.time[d],
        dayName: d === 0 ? 'Today' : dDate.toLocaleDateString(undefined, { weekday: 'short' }),
        icon: dWmo.icon,
        condition: dWmo.label,
        code: dCode,
        min: Math.round(daily.temperature_2m_min[d]),
        max: Math.round(daily.temperature_2m_max[d]),
        rainChance: Math.round(daily.precipitation_probability_max ? daily.precipitation_probability_max[d] : 0),
        precipSum: daily.precipitation_sum ? Math.round(daily.precipitation_sum[d] * 100) / 100 : 0,
        uvMax: Math.round((daily.uv_index_max ? daily.uv_index_max[d] : 0) * 10) / 10
      });
    }

    const weatherData = {
      location: {
        label: location.label || 'Your Location',
        stationId: location.stationId || `WX_${Math.round(lat * 100)}_${Math.round(lon * 100)}`,
        latitude: lat,
        longitude: lon,
        climate: location.climate || 'Temperate'
      },
      temperature: temp,
      feelsLike: feels,
      condition: wmo.label,
      weatherCode: code,
      icon: currentIcon,
      isDay: cur.is_day !== 0,
      humidity: rh,
      dewPoint: dew,
      dewComfort: dewFeel,
      cloudBase,
      cloudCover: cur.cloud_cover || 0,
      pressure,
      wind: Math.round(cur.wind_speed_10m || 0),
      windDirection: cur.wind_direction_10m,
      windCompass: compass,
      windGusts: Math.round(cur.wind_gusts_10m || cur.wind_speed_10m || 0),
      beaufort,
      uvIndex: uvMaxToday,
      uvInfo,
      rainChance: rainChanceToday,
      precipCurrent: cur.precipitation || 0,
      min: Math.round(daily.temperature_2m_min[0]),
      max: Math.round(daily.temperature_2m_max[0]),
      sunriseEpoch,
      sunsetEpoch,
      moon,
      hourly: hourlySlice,
      daily: dailyForecast,
      visibilityMiles: (hourly && hourly.visibility && hourly.visibility[nowHourIndex])
        ? Math.round((hourly.visibility[nowHourIndex] / 1609.34) * 10) / 10
        : 10,
      savedAt: Date.now()
    };

    // Attach real-time evaluations
    weatherData.driving = evaluateDrivingConditions(weatherData, 55);
    weatherData.clothing = evaluateClothing(weatherData);

    return weatherData;
  }

  /**
   * Search locations worldwide via Open-Meteo Geocoding API.
   * @param {string} query - Name of city, zip, or region
   * @returns {Promise<Array>} List of locations
   */
  async function searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query.trim());
    url.searchParams.set('count', '6');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !data.results) return [];

    return data.results.map((r) => {
      const parts = [r.name];
      if (r.admin1) parts.push(r.admin1);
      if (r.country_code) parts.push(r.country_code.toUpperCase());
      return {
        label: parts.join(', '),
        latitude: r.latitude,
        longitude: r.longitude,
        country: r.country,
        stationId: `WX_${Math.abs(Math.round(r.latitude * 10))}_${Math.abs(Math.round(r.longitude * 10))}`
      };
    });
  }

  // ── EXPORT TO GLOBAL ENVIRONMENT ───────────────────────────────────────────
  const WeatherEngine = {
    PRESET_LOCATIONS,
    DEFAULT_LOCATION,
    WMO_CODES,
    calculateDewPoint,
    dewPointComfort,
    calculateCloudBase,
    degreesToCompass,
    beaufortScale,
    analyzePressure,
    analyzeUV,
    getMoonPhase,
    evaluateDrivingConditions,
    evaluateClothing,
    fetchWeather,
    searchLocations
  };

  global.WeatherEngine = WeatherEngine;

})(typeof window !== 'undefined' ? window : this);
