/* Rounded heliocentric distances, not an ephemeris or spacecraft flight model. */
(() => {
  'use strict';
  const range = document.getElementById('sv-range');
  if (!range) return;
  const initial = range.value;
  const au = document.getElementById('sv-au');
  const light = document.getElementById('sv-light');
  const delay = document.getElementById('sv-delay');
  function update() {
    const distance = Number(range.value);
    au.textContent = `${distance.toFixed(2)} AU`;
    const irradiance = 1 / (distance * distance);
    light.textContent = `${(irradiance * 100).toLocaleString(undefined, { maximumFractionDigits: irradiance < .01 ? 3 : 1 })}% of Earth’s`;
    const minutes = distance * 8.32;
    delay.textContent = minutes < 60 ? `${minutes.toFixed(1)} minutes` : `${Math.floor(minutes / 60)} h ${(minutes % 60).toFixed(0)} min`;
    range.setAttribute('aria-valuetext', `${distance.toFixed(2)} astronomical units`);
  }
  range.addEventListener('input', update);
  document.getElementById('sv-home').addEventListener('click', () => { range.value = 1; update(); });
  document.getElementById('sv-reset').addEventListener('click', () => { range.value = initial; update(); });
  update();
})();
