import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CloudEngine = require('../assets/js/cloud-engine.js');

test('CloudEngine: calculateLCL matches adiabatic thermodynamics', () => {
  // At 75°F temp and 55°F dew point, spread is 20°F.
  // 20 / 4.4 * 1000 = 4545.45 => 4545 ft
  assert.equal(CloudEngine.calculateLCL(75, 55), 4545);

  // At 100% relative humidity (spread = 0), cloud base is at ground level (0 ft fog)
  assert.equal(CloudEngine.calculateLCL(60, 60), 0);

  // Dry desert air: 90°F temp, 35°F dew point -> spread 55°F
  // 55 / 4.4 * 1000 = 12500 ft
  assert.equal(CloudEngine.calculateLCL(90, 35), 12500);

  // If dew point exceeds temperature (clamped), return 0 ft
  assert.equal(CloudEngine.calculateLCL(50, 55), 0);
});

test('CloudEngine: all standard presets exist and declare complete physics properties', () => {
  const expectedPresets = [
    'cumulus',
    'cumulonimbus',
    'stratus_fog',
    'cirrus',
    'chimney_smoke',
    'volcano_ash',
    'water_cycle_evaporation',
    'campfire_smoke',
    'steam_vent',
    'heavy_gas'
  ];

  for (const id of expectedPresets) {
    const preset = CloudEngine.PRESETS[id];
    assert.ok(preset, `Preset '${id}' must be registered`);
    assert.equal(preset.id, id);
    assert.ok(preset.name, `Preset '${id}' has display name`);
    assert.ok(preset.description, `Preset '${id}' has description`);
    assert.ok(typeof preset.maxParticles === 'number' && preset.maxParticles > 0);
    assert.ok(typeof preset.buoyancy === 'number');
    assert.ok(typeof preset.turbulence === 'number');
    assert.ok(typeof preset.windSpeed === 'number');
  }
});

test('CloudEngine.System: altitude and canvas coordinate mapping', () => {
  const system = new CloudEngine.System(null, {
    tempF: 75,
    dewPointF: 55,
    maxAltitudeFt: 10000
  });

  // Canvas height is default 450, groundY is 450 - 25 = 425, skyTopY is 20
  // Span = 405 px for 10,000 ft
  const groundY = system.altitudeToY(0);
  assert.equal(groundY, 425);

  const topY = system.altitudeToY(10000);
  assert.equal(topY, 20);

  // Halfway altitude: 5000 ft
  const midY = system.altitudeToY(5000);
  assert.equal(midY, 20 + (425 - 20) * 0.5);

  // Round trip back to altitude
  const alt = system.yToAltitude(midY);
  assert.equal(alt, 5000);

  system.destroy();
});

test('CloudEngine.System: thermodynamics and LCL dynamic reaction', () => {
  let reportedLCL = null;
  const system = new CloudEngine.System(null, {
    tempF: 80,
    dewPointF: 58,
    onLCLChange: (lcl) => { reportedLCL = lcl; }
  });

  // Initial: 22 / 4.4 * 1000 = 5000
  assert.equal(system.lclFeet, 5000);

  // Update thermodynamics
  system.setThermodynamics({ tempF: 70, dewPointF: 48 });
  assert.equal(system.lclFeet, 5000);
  assert.equal(reportedLCL, 5000);

  system.setThermodynamics({ tempF: 80, dewPointF: 70 }); // Tropical moisture
  assert.equal(system.lclFeet, Math.round((10 / 4.4) * 1000));
  assert.equal(reportedLCL, Math.round((10 / 4.4) * 1000));

  system.destroy();
});

test('CloudEngine.System: wind velocity and compass angle mapping', () => {
  const system = new CloudEngine.System(null);

  system.setWind(12, 'N');
  assert.equal(system.windSpeed, 12);
  assert.equal(system.windAngle, 270);

  system.setWind(8, 'E');
  assert.equal(system.windSpeed, 8);
  assert.equal(system.windAngle, 0);

  system.setWind(20, 'SW');
  assert.equal(system.windSpeed, 20);
  assert.equal(system.windAngle, 135);

  system.setWind(15, 45);
  assert.equal(system.windSpeed, 15);
  assert.equal(system.windAngle, 45);

  system.destroy();
});

test('CloudEngine.System: particle simulation update loop and pooling', () => {
  const system = new CloudEngine.System(null, {
    preset: 'cumulus',
    tempF: 75,
    dewPointF: 55
  });

  // Pool is initialized
  assert.equal(system.pool.length, system.maxParticles);
  assert.equal(system.pool.filter(p => p.active).length, 0);

  // Allocate a particle
  const p = system.allocParticle();
  assert.ok(p);
  assert.equal(p.active, true);

  // Update step runs smoothly without crashing even in headless node
  system.update(0.016);
  assert.ok(system.simTime > 0);

  // Test triggering thermal
  system.triggerThermal(200, 300);
  const activeCount = system.pool.filter(item => item.active).length;
  assert.ok(activeCount > 1, 'Thermal should activate several particles');

  // Trigger lightning
  system.triggerLightning();
  assert.equal(system.lightningFlash, 1.0);

  system.destroy();
});

test('CloudEngine.System: WeatherEngine sync adapter', () => {
  const system = new CloudEngine.System(null, { preset: 'cumulus' });

  // Simulate WeatherEngine live payload
  const sampleWeather = {
    temperature: 88,
    dewPoint: 72,
    wind: 16,
    windDirection: 180,
    weatherCode: 95 // Thunderstorm
  };

  system.syncWithWeatherEngine(sampleWeather);

  assert.equal(system.surfaceTempF, 88);
  assert.equal(system.dewPointF, 72);
  assert.equal(system.lclFeet, Math.round((16 / 4.4) * 1000));
  assert.equal(system.windSpeed, 16);
  assert.equal(system.windAngle, 180);
  assert.equal(system.preset.id, 'cumulonimbus', 'Severe code 95 switches preset to cumulonimbus');

  system.destroy();
});

test('CloudEngine: volumetric sprite generation and Three.js helpers', () => {
  // Test makeVolumetricSprite
  const monoSprite = CloudEngine.makeVolumetricSprite(64, 'mono');
  assert.ok(monoSprite);
  assert.equal(monoSprite.width, 64);
  assert.equal(monoSprite.height, 64);

  const ashSprite = CloudEngine.makeVolumetricSprite(64, 'ash');
  assert.ok(ashSprite);

  const goldenSprite = CloudEngine.makeVolumetricSprite(64, 'golden');
  assert.ok(goldenSprite);

  // Test getSprite cache
  const bodySpr = CloudEngine.getSprite('cumulus_body');
  assert.ok(bodySpr);
  const steamSpr = CloudEngine.getSprite('steam');
  assert.ok(steamSpr);

  // Test createThreeTexture mock
  const mockThree = {
    CanvasTexture: class {
      constructor(canvas) {
        this.canvas = canvas;
      }
    },
    sRGBEncoding: 3001,
    LinearMipmapLinearFilter: 1008,
    LinearFilter: 1006
  };
  const tex = CloudEngine.createThreeTexture(mockThree, 'mono', 64);
  assert.ok(tex);
  assert.equal(tex.encoding, 3001);
  assert.equal(tex.canvas.width, 64);

  // Test renderCloudCluster doesn't throw with golden/sunset options
  const mockCtx = {
    save() {},
    restore() {},
    drawImage() {},
    globalAlpha: 1
  };
  assert.doesNotThrow(() => {
    CloudEngine.renderCloudCluster(mockCtx, 100, 100, 200, 100, { golden: true, time: 1.5 });
    CloudEngine.renderCloudCluster(mockCtx, 100, 100, 200, 100, { tint: 'ash', storm: true });
  });
});
