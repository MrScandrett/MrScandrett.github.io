/* Seasonal teaching overlay for the climate globe. These are representative
   formation regions, never observed storms or a forecast of storm counts. */
(function (root) {
  'use strict';
  const BASINS = [
    { name: 'North Atlantic', lat: 19, lon: -58, peak: 9, hemisphere: 'north' },
    { name: 'Western North Pacific', lat: 18, lon: 137, peak: 9, hemisphere: 'north' },
    { name: 'Eastern North Pacific', lat: 15, lon: -112, peak: 8, hemisphere: 'north' },
    { name: 'Bay of Bengal', lat: 16, lon: 89, peak: 10, hemisphere: 'north' },
    { name: 'South Indian Ocean', lat: -16, lon: 78, peak: 2, hemisphere: 'south' },
    { name: 'Coral Sea', lat: -17, lon: 162, peak: 2, hemisphere: 'south' }
  ];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function seasonalWeight(month, peak) {
    const distance = Math.min(Math.abs(month - peak), 12 - Math.abs(month - peak));
    return clamp((4 - distance) / 4, 0, 1);
  }
  function conditions(month, anomalyC) {
    const warming = Math.max(0, anomalyC);
    // Clausius-Clapeyron classroom approximation: moisture capacity, not rainfall forecast.
    const moistureFactor = Math.exp(0.07 * warming);
    const basins = BASINS.map(b => ({ ...b, season: seasonalWeight(month, b.peak) }))
      .filter(b => b.season >= 0.25);
    return { moistureFactor, basins, note: 'Seasonal formation regions only; warm water, low wind shear, humidity, and an existing disturbance must coincide.' };
  }
  root.ClimateWeather = { BASINS, seasonalWeight, conditions };
  if (typeof module === 'object' && module.exports) module.exports = root.ClimateWeather;
})(typeof window !== 'undefined' ? window : globalThis);
