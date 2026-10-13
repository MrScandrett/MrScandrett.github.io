/* ClassroomOS Earth engine. Natural Earth geography is loaded separately;
   projections use the locally pinned D3 runtime and projection extension.
   No network dependencies, fictional geography, or silent dataset substitution. */
(function (root) {
  'use strict';
  var script = document.currentScript;
  var assetRoot = new URL('../', script.src);
  var DEG = Math.PI / 180;
  var metadata = Object.freeze({
    dataset: 'Natural Earth', version: '5.1.2', scale: '1:50 million',
    checked: '2026-10-12', license: 'Public domain',
    source: 'https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2',
    boundaryPolicy: 'https://www.naturalearthdata.com/about/disputed-boundaries-policy/',
    limits: 'Generalized reference geography, not survey precision or live borders. De facto boundaries do not establish sovereignty.'
  });
  var textureSources = Object.freeze({
    day: new URL('textures/earth/blue-marble.jpg', assetRoot).href,
    night: new URL('textures/earth/black-marble.jpg', assetRoot).href,
    credit: 'NASA Earth Observatory / NASA Goddard; historical satellite composites, public domain; not live imagery.'
  });
  var loading;
  function data() {
    if (!root.WORLD_GEOGRAPHY) throw new Error('Load assets/geodata/world/world-data.js before using EarthEngine geography.');
    return root.WORLD_GEOGRAPHY;
  }
  function load() {
    if (root.WORLD_GEOGRAPHY) return Promise.resolve(data());
    if (!loading) loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = new URL('geodata/world/world-data.js', assetRoot).href;
      s.onload = function () { resolve(data()); };
      s.onerror = function () { loading = null; s.remove(); reject(new Error('Earth geography could not load.')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  // Right-handed globe coordinates compatible with Three.js SphereGeometry's
  // default UVs: longitude 0 on +X; east towards -Z; north on +Y.
  function lonLatToVector(lon, lat, radius) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError('Longitude/latitude must be finite; latitude must be within ±90°.');
    var r = radius == null ? 1 : radius, a = lat * DEG, l = lon * DEG;
    return { x: r * Math.cos(a) * Math.cos(l), y: r * Math.sin(a), z: -r * Math.cos(a) * Math.sin(l) };
  }
  function vectorToLonLat(v) {
    var r = Math.hypot(v.x, v.y, v.z);
    if (!r) throw new RangeError('A zero vector has no latitude or longitude.');
    return [Math.atan2(-v.z, v.x) / DEG, Math.asin(Math.max(-1, Math.min(1, v.y / r))) / DEG];
  }
  function lonLatToUV(lon, lat) {
    return { u: ((lon + 180) / 360 % 1 + 1) % 1, v: (90 - lat) / 180 };
  }
  function projection(name, options) {
    var d3 = root.d3;
    if (!d3 || !d3.geoPath) throw new Error('Load the local d3-geo runtime to use projections.');
    var o = options || {}, p;
    switch (name) {
      case 'globe': p = d3.geoOrthographic().rotate(o.rotate || [20, -15]).clipAngle(90); break;
      case 'equirectangular': p = d3.geoEquirectangular(); break;
      case 'mercator': p = d3.geoMercator(); break;
      case 'peters': p = d3.geoCylindricalEqualArea().parallel(45); break;
      case 'robinson': p = d3.geoRobinson(); break;
      case 'natural-earth': p = d3.geoNaturalEarth1(); break;
      case 'conic': p = d3.geoConicConformal().parallels([30, 60]).center([15, 45]).clipAngle(120); break;
      case 'azimuthal': p = d3.geoAzimuthalEquidistant().rotate([0, -90]).clipAngle(179.9); break;
      default: throw new RangeError('Unknown Earth projection: ' + name);
    }
    if (o.rotate) p.rotate(o.rotate);
    p.precision(o.precision == null ? .15 : o.precision);
    if (o.scale != null) p.scale(o.scale).translate(o.translate || [0, 0]);
    else p.fitExtent(o.extent || [[20, 20], [880, 460]], o.geometry || (name === 'conic'
      ? { type: 'MultiPoint', coordinates: [[-30, 20], [60, 20], [-30, 70], [60, 70]] }
      : { type: 'Sphere' }));
    if (name === 'conic') p.clipExtent(o.extent || [[20, 20], [880, 460]]);
    return p;
  }
  function path(proj, geometry, context) {
    var gen = root.d3.geoPath(proj);
    if (context) gen.context(context);
    return gen(geometry);
  }
  function visible(proj, lonLat) {
    var angle = proj.clipAngle();
    if (!angle) return true;
    var center = root.d3.geoRotation(proj.rotate()).invert([0, 0]);
    return root.d3.geoDistance(center, lonLat) <= angle * DEG;
  }
  function landCanvas(width, height, colors) {
    var c = document.createElement('canvas'); c.width = width; c.height = height;
    var ctx = c.getContext('2d'), palette = colors || {};
    ctx.fillStyle = palette.ocean || '#0c3782'; ctx.fillRect(0, 0, width, height);
    var p = projection('equirectangular', { scale: width / (2 * Math.PI), translate: [width / 2, height / 2] });
    // Equirectangular images must have a 2:1 aspect ratio to map to a sphere.
    if (width !== height * 2) throw new RangeError('Earth textures require a 2:1 width:height ratio.');
    ctx.beginPath(); path(p, data().land, ctx);
    ctx.fillStyle = palette.land || '#50753b'; ctx.fill();
    return c;
  }
  function createThreeTexture(THREE, options) {
    var o = options || {};
    var canvas = landCanvas(o.width || 1024, (o.width || 1024) / 2, o.colors);
    var t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    if (o.satellite !== false) {
      var image = new Image();
      image.onload = function () { canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); t.needsUpdate = true; };
      image.onerror = function () { if (o.onError) o.onError(new Error('Satellite image unavailable; using Natural Earth land.')); };
      image.src = textureSources.day;
    }
    return t;
  }
  var reconRequests = new Map();
  var reconstruction = Object.freeze({
    model: 'MULLER2019', agesMa: Object.freeze(Array.from({ length: 25 }, function (_, i) { return i * 10; })),
    source: 'https://gwsdoc.gplates.org/reconstruction/reconstruct-coastlines/',
    credit: 'EarthByte / University of Sydney, CC BY 4.0',
    limits: 'Reconstructed modern outlines, not ancient shorelines. Model estimates at discrete ages; no synthetic intermediate geography.',
    nearestAge: function (age) {
      if (!Number.isFinite(age)) throw new RangeError('Reconstruction age must be finite.');
      return Math.max(0, Math.min(240, Math.round(age / 10) * 10));
    },
    load: function (age) {
      var t = reconstruction.nearestAge(age);
      if (!reconRequests.has(t)) reconRequests.set(t, fetch(new URL('geodata/pangaea/coastlines_' + t + 'ma_simple.json', assetRoot))
        .then(function (r) { if (!r.ok) throw new Error('Reconstruction HTTP ' + r.status); return r.json(); })
        .then(function (geo) {
          if (geo.reconstruction?.timeMa !== t || geo.reconstruction?.model !== reconstruction.model) throw new Error('Reconstruction metadata does not match the requested age and model.');
          return geo;
        }).catch(function (error) { reconRequests.delete(t); throw error; }));
      return reconRequests.get(t);
    }
  });
  root.EarthEngine = Object.freeze({ metadata: metadata, textures: textureSources,
    load: load, data: data, projection: projection, path: path, visible: visible,
    lonLatToVector: lonLatToVector, vectorToLonLat: vectorToLonLat, lonLatToUV: lonLatToUV,
    landCanvas: landCanvas, createThreeTexture: createThreeTexture, reconstruction: reconstruction });
}(window));
