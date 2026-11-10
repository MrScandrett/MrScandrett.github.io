/* RocksSoilCore: the soil texture classifier behind the Rocks and Soil lesson's texture triangle
 * (lessons/earth-science/rocks-and-soil.html). No DOM. Moved unchanged out of the page's inline <script>;
 * rocks-and-soil.js needs this file first. Tested in tests/rocks-and-soil-core.test.mjs. */
  var RocksSoilCore = (function () {
    function classifySoil(sand, silt, clay) {
      if (clay >= 40) {
        if (sand >= 45) return { name: "Sandy Clay", drain: 20, cec: 90, air: 25, work: 20, desc: "Dense, heavy soil dominated by clay. Very sticky when wet, cracks when dry, holds copious nutrients but drains poorly." };
        if (silt >= 40) return { name: "Silty Clay", drain: 25, cec: 92, air: 30, work: 25, desc: "Smooth yet highly plastic soil. Fine pores retain massive water, susceptible to compaction under machinery." };
        return { name: "Clay", drain: 15, cec: 98, air: 20, work: 15, desc: "Over 40% microscopic clay platelets. Supreme nutrient retention, high plasticity, high shrink-swell potential." };
      }
      if (clay >= 27 && clay < 40) {
        if (sand >= 45) return { name: "Sandy Clay Loam", drain: 45, cec: 70, air: 55, work: 50, desc: "Gritty feel with strong clay binding. Good moisture reservoir with better drainage than pure clay." };
        if (sand <= 20) return { name: "Silty Clay Loam", drain: 35, cec: 80, air: 45, work: 45, desc: "Velvety smooth and plastic. Very common in fertile river floodplains and glaciated plains." };
        return { name: "Clay Loam", drain: 40, cec: 75, air: 50, work: 50, desc: "Sturdy agricultural soil with substantial clay and silt. Excellent for deep-root grains like corn and soybeans." };
      }
      if (clay >= 7 && clay < 27) {
        if (silt >= 50 && clay < 12) return { name: "Silt", drain: 50, cec: 55, air: 60, work: 70, desc: "Rare almost pure silt (windblown loess). Feels like dry talc powder or silk, highly erodible by rainfall." };
        if (silt >= 50) return { name: "Silt Loam", drain: 55, cec: 65, air: 65, work: 75, desc: "One of the most naturally productive agricultural soils on Earth. Easy to till, retains abundant moisture." };
        if (sand >= 52) return { name: "Sandy Loam", drain: 75, cec: 45, air: 80, work: 85, desc: "Dominantly gritty with enough clay/humus to bind nutrients. Excellent for root crops like carrots and potatoes." };
        return { name: "Loam", drain: 60, cec: 75, air: 70, work: 85, desc: "The textbook ideal soil! An even balance of sand, silt, and clay providing optimal drainage, aeration, and fertility." };
      }
      // Clay < 7%
      if (sand >= 85) return { name: "Sand", drain: 98, cec: 10, air: 98, work: 95, desc: "Coarse, loose grains with huge macropores. Rapid drainage causes severe nutrient leaching; drought-prone." };
      if (sand >= 70) return { name: "Loamy Sand", drain: 88, cec: 25, air: 90, work: 90, desc: "Predominantly sand with a slight dust of silt and clay. Slightly better water-holding capacity than pure sand." };
      return { name: "Silt Loam", drain: 55, cec: 65, air: 65, work: 75, desc: "Predominantly silt and sand with low clay. Silky and friable." };
    }

    return {
      classifySoil
    };
  })();
