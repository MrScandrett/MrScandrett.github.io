/* The Climate Simulator's energy-balance model and scenario presets (lessons/earth-science/climate-simulator.html).
 * No DOM, no Three.js. Moved unchanged out of the page's inline module <script>; climate-simulator.mjs imports it.
 * Tested in tests/climate-simulator-core.test.mjs. */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Baseline reference: 1850 Pre-industrial (CO2 = 280 ppm, CH4 = 722 ppb, Solar = 100%, Ice = 100%, Deforest = 0%)
    // produces ΔF = 0.0 W/m², ΔT = +0.0°C, Sea Level = +0.00 m, Ocean pH = 8.18, Storm Index = 1.0×.
    // Today (2026: CO2 = 429 ppm, CH4 = 1930 ppb, Ice = 60%, Deforest = 30%, Ocean = 70%)
    // produces ΔF = +2.7 W/m², ΔT = +1.3°C, Sea Level = +0.25 m, Ocean pH = 8.06, Storm Index = 1.2×.
    function computeClimate(co2, solar, ice, deforest, ch4, ocean) {
      const C0 = 280;
      const M0 = 722;
      // Myhre et al. (1998) / IPCC radiative forcing for CO2 and CH4 (with indirect H2O/O3 factor)
      const co2Force    = 5.35 * Math.log(co2 / C0);
      const ch4Force    = 0.036 * (Math.sqrt(ch4) - Math.sqrt(M0));
      // Solar irradiance forcing (~0.30 W/m² per 1% TSI change around 100%)
      const solarForce  = (solar - 100) * 0.30;
      // Cryosphere surface-albedo feedback relative to pre-industrial 100% ice cover
      const albedoForce = (100 - ice) * 0.012;
      // Land-use / deforestation carbon-sink & biophysical forcing
      const defoForce   = deforest * 0.008;

      const rawForcing = co2Force + ch4Force + solarForce + albedoForce + defoForce;

      // Ocean heat uptake & aerosol/cloud buffering:
      // Oceans absorb ~90% of Earth's energy imbalance, damping transient surface forcing.
      // At ocean=70% (modern baseline), effective radiative forcing is ~75% of raw GHG+albedo forcing.
      const oceanDamping = 1 - 0.25 * (ocean / 70);
      const totalForcing = rawForcing * clamp(oceanDamping, 0.55, 1.0);

      // Two-layer energy balance temperature response:
      // Equilibrium sensitivity ~0.78 K/(W/m²) (~2.9°C per 2×CO2), buffered by transient ocean thermal inertia,
      // with positive water-vapor/cloud/carbon-sink feedback amplification at high radiative forcing (>4 W/m²).
      const inertiaFactor = 1.0 - 0.50 * Math.pow(ocean / 100, 0.85);
      const feedbackAmp   = 1.0 + 0.068 * Math.max(0, rawForcing - 4.0);
      const tempAnomaly   = totalForcing * 0.78 * inertiaFactor * feedbackAmp;

      // Sea level rise (m): thermosteric ocean expansion + nonlinear glacier/ice-sheet melt above +1.1°C
      const posTemp     = Math.max(0, tempAnomaly);
      const stericRise  = posTemp * 0.14 * (0.65 + 0.35 * (ocean / 70));
      const meltRise    = posTemp * 0.055 + Math.pow(Math.max(0, posTemp - 1.1), 1.65) * 0.16;
      const seaLevel    = clamp(stericRise + meltRise, 0, 12);

      // Surface ocean pH: carbonate buffer logarithmic dependence on pCO2
      // 8.18 in 1850 (280 ppm) -> 8.06 today (429 ppm) -> 7.91 at 700 ppm
      const oceanPH = 8.18 - 0.66 * Math.log10(Math.max(180, co2) / C0);

      // Remaining polar sea/land ice percentage after thermal retreat
      const iceLeft = clamp(ice - Math.max(0, tempAnomaly) * 3.2 - Math.min(0, tempAnomaly) * 2.0, 0, 100);

      return { totalForcing, tempAnomaly, seaLevel, oceanPH, iceLeft };
    }

    // Scenario presets
    const PRESETS = {
      preindustrial: { co2: 280, solar: 100, ice: 100, deforest: 0,  ch4: 722,  ocean: 70 },
      today:         { co2: 429, solar: 100, ice: 60,  deforest: 30, ch4: 1930, ocean: 70 },
      paris:         { co2: 450, solar: 100, ice: 50,  deforest: 40, ch4: 2000, ocean: 70 },
      bau:           { co2: 700, solar: 100, ice: 20,  deforest: 70, ch4: 3200, ocean: 55 },
    };
  export { clamp, computeClimate, PRESETS };
