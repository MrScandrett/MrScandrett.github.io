/**
 * Pure mathematics, geodesic geometry, visual acuity, acoustic beamforming,
 * Shannon-Hartley channel capacity, mission tracking, and quiz grading for
 * Engineering an Immersive Sphere.
 *
 * Zero DOM dependencies: loads as a classic browser script (global SphereSystemsModel)
 * and as a CommonJS module in Node tests.
 */
(function (root) {
  'use strict';

  var SQM_TO_SQFT = 10.7639104167;
  var CUM_TO_CUFT = 35.3146667215;
  var M_TO_FT = 3.280839895;
  var SPEED_OF_SOUND = 343; // m/s at ~20 C

  function clamp(value, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  var VENUE_PRESETS = Object.freeze({
    'classroom-dome': Object.freeze({
      id: 'classroom-dome',
      label: 'Planetarium Dome',
      radiusM: 10,
      coveragePct: 50,
      frequency: 2,
      note: 'A 10 m hemisphere (50% of a sphere) typical of a school or museum dome.'
    }),
    'imax-dome': Object.freeze({
      id: 'imax-dome',
      label: 'Dome Theater',
      radiusM: 25,
      coveragePct: 55,
      frequency: 3,
      note: 'Tilted dome theater scale around 25 m radius.'
    }),
    'sphere-ideal': Object.freeze({
      id: 'sphere-ideal',
      label: 'Ideal Arena Sphere',
      radiusM: 68,
      coveragePct: 78,
      frequency: 4,
      note: 'Idealized mathematical sphere at large arena scale (not a construction drawing).'
    }),
    'mega-dome': Object.freeze({
      id: 'mega-dome',
      label: 'Mega Shell',
      radiusM: 110,
      coveragePct: 65,
      frequency: 5,
      note: 'Upper bound of the slider to compare extreme volume growth.'
    })
  });

  var DISPLAY_PRESETS = Object.freeze({
    'fine-interior': Object.freeze({
      id: 'fine-interior',
      label: 'Fine Indoor (4 mm)',
      pixelPitchMm: 4,
      distanceM: 20,
      fovDeg: 150
    }),
    'sphere-interior': Object.freeze({
      id: 'sphere-interior',
      label: 'Curved Venue (9 mm)',
      pixelPitchMm: 9,
      distanceM: 40,
      fovDeg: 165
    }),
    'arena-board': Object.freeze({
      id: 'arena-board',
      label: 'Arena Wall (16 mm)',
      pixelPitchMm: 16,
      distanceM: 35,
      fovDeg: 140
    }),
    'exosphere-grid': Object.freeze({
      id: 'exosphere-grid',
      label: 'Exterior Grid (35 mm)',
      pixelPitchMm: 35,
      distanceM: 60,
      fovDeg: 120
    })
  });

  var meshCache = Object.create(null);

  function normalizeVec(v) {
    var len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  function vertexKey(v) {
    var x = Math.abs(v[0]) < 1e-7 ? 0 : v[0];
    var y = Math.abs(v[1]) < 1e-7 ? 0 : v[1];
    var z = Math.abs(v[2]) < 1e-7 ? 0 : v[2];
    return x.toFixed(5) + ',' + y.toFixed(5) + ',' + z.toFixed(5);
  }

  /**
   * Build a unit-radius geodesic icosahedron subdivided at integer frequency 1..5.
   * Satisfies V = 10f^2 + 2, E = 30f^2, F = 20f^2 (Euler V - E + F = 2).
   */
  function buildGeodesicMesh(frequency) {
    var f = Math.round(clamp(frequency, 1, 5));
    if (meshCache[f]) return meshCache[f];

    var phi = (1 + Math.sqrt(5)) / 2;
    var rawVerts = [
      [-1,  phi,  0], [ 1,  phi,  0], [-1, -phi,  0], [ 1, -phi,  0],
      [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
      [ phi,  0, -1], [ phi,  0,  1], [-phi,  0, -1], [-phi,  0,  1]
    ].map(normalizeVec);

    var rawFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    // Ensure every base icosahedron face is oriented outward (CCW from outside).
    for (var fi = 0; fi < rawFaces.length; fi++) {
      var fa = rawVerts[rawFaces[fi][0]];
      var fb = rawVerts[rawFaces[fi][1]];
      var fc = rawVerts[rawFaces[fi][2]];
      var abx = fb[0] - fa[0], aby = fb[1] - fa[1], abz = fb[2] - fa[2];
      var acx = fc[0] - fa[0], acy = fc[1] - fa[1], acz = fc[2] - fa[2];
      var nx = aby * acz - abz * acy;
      var ny = abz * acx - abx * acz;
      var nz = abx * acy - aby * acx;
      var dot = nx * (fa[0] + fb[0] + fc[0]) + ny * (fa[1] + fb[1] + fc[1]) + nz * (fa[2] + fb[2] + fc[2]);
      if (dot < 0) {
        var tmp = rawFaces[fi][1];
        rawFaces[fi][1] = rawFaces[fi][2];
        rawFaces[fi][2] = tmp;
      }
    }

    var vertices = [];
    var vertMap = Object.create(null);
    var faces = [];
    var edgeMap = Object.create(null);
    var edges = [];

    function addVertex(v) {
      var unit = normalizeVec(v);
      var k = vertexKey(unit);
      if (k in vertMap) return vertMap[k];
      var idx = vertices.length;
      vertices.push(unit);
      vertMap[k] = idx;
      return idx;
    }

    function addEdge(a, b) {
      var lo = a < b ? a : b;
      var hi = a < b ? b : a;
      var k = lo + ':' + hi;
      if (!(k in edgeMap)) {
        edgeMap[k] = edges.length;
        edges.push([lo, hi]);
      }
    }

    for (var t = 0; t < rawFaces.length; t++) {
      var A = rawVerts[rawFaces[t][0]];
      var B = rawVerts[rawFaces[t][1]];
      var C = rawVerts[rawFaces[t][2]];
      var grid = [];
      for (var i = 0; i <= f; i++) {
        grid[i] = [];
        for (var j = 0; j <= i; j++) {
          var wA = (f - i) / f;
          var wB = (i - j) / f;
          var wC = j / f;
          grid[i][j] = addVertex([
            wA * A[0] + wB * B[0] + wC * C[0],
            wA * A[1] + wB * B[1] + wC * C[1],
            wA * A[2] + wB * B[2] + wC * C[2]
          ]);
        }
      }
      for (var r = 0; r < f; r++) {
        for (var c = 0; c <= r; c++) {
          var v0 = grid[r][c];
          var v1 = grid[r + 1][c];
          var v2 = grid[r + 1][c + 1];
          faces.push([v0, v1, v2]);
          addEdge(v0, v1);
          addEdge(v1, v2);
          addEdge(v2, v0);
          if (c < r) {
            var v3 = grid[r][c + 1];
            faces.push([v0, v2, v3]);
            addEdge(v0, v2);
            addEdge(v2, v3);
            addEdge(v3, v0);
          }
        }
      }
    }

    var unitMeshArea = 0;
    var faceCentroidsY = new Float64Array(faces.length);
    for (var p = 0; p < faces.length; p++) {
      var p0 = vertices[faces[p][0]];
      var p1 = vertices[faces[p][1]];
      var p2 = vertices[faces[p][2]];
      var e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], e1z = p1[2] - p0[2];
      var e2x = p2[0] - p0[0], e2y = p2[1] - p0[1], e2z = p2[2] - p0[2];
      var cx = e1y * e2z - e1z * e2y;
      var cy = e1z * e2x - e1x * e2z;
      var cz = e1x * e2y - e1y * e2x;
      unitMeshArea += 0.5 * Math.hypot(cx, cy, cz);
      faceCentroidsY[p] = (p0[1] + p1[1] + p2[1]) / 3;
    }

    var minUnitEdge = Infinity;
    var maxUnitEdge = 0;
    for (var ei = 0; ei < edges.length; ei++) {
      var ea = vertices[edges[ei][0]];
      var eb = vertices[edges[ei][1]];
      var len = Math.hypot(eb[0] - ea[0], eb[1] - ea[1], eb[2] - ea[2]);
      if (len < minUnitEdge) minUnitEdge = len;
      if (len > maxUnitEdge) maxUnitEdge = len;
    }

    var idealArea = 4 * Math.PI;
    var areaErrorPct = ((idealArea - unitMeshArea) / idealArea) * 100;

    var result = Object.freeze({
      frequency: f,
      vertices: vertices,
      faces: faces,
      edges: edges,
      faceCentroidsY: faceCentroidsY,
      vertexCount: vertices.length,
      faceCount: faces.length,
      edgeCount: edges.length,
      unitMeshArea: unitMeshArea,
      areaErrorPct: areaErrorPct,
      minUnitEdge: minUnitEdge,
      maxUnitEdge: maxUnitEdge
    });
    meshCache[f] = result;
    return result;
  }

  function computeSphereGeometry(opts) {
    var input = opts || {};
    var radiusM = clamp(input.radiusM != null ? input.radiusM : 60, 10, 120);
    var coveragePct = clamp(input.coveragePct != null ? input.coveragePct : 60, 10, 100);
    var frequency = Math.round(clamp(input.frequency != null ? input.frequency : 3, 1, 5));

    var areaM2 = 4 * Math.PI * radiusM * radiusM;
    var volumeM3 = (4 / 3) * Math.PI * radiusM * radiusM * radiusM;
    var diameterM = 2 * radiusM;
    var circumferenceM = 2 * Math.PI * radiusM;

    var fraction = coveragePct / 100;
    var coveredAreaM2 = areaM2 * fraction;
    // Spherical cap from north pole (y = 1) down to y = 1 - 2*fraction
    var capCosThreshold = clamp(1 - 2 * fraction, -1, 1);
    var capHalfAngleRad = Math.acos(capCosThreshold);
    var capHalfAngleDeg = (capHalfAngleRad * 180) / Math.PI;
    var capHeightM = 2 * fraction * radiusM;

    var mesh = buildGeodesicMesh(frequency);
    var meshAreaM2 = mesh.unitMeshArea * radiusM * radiusM;

    return {
      radiusM: radiusM,
      diameterM: diameterM,
      circumferenceM: circumferenceM,
      coveragePct: coveragePct,
      fraction: fraction,
      frequency: frequency,
      areaM2: areaM2,
      coveredAreaM2: coveredAreaM2,
      volumeM3: volumeM3,
      capCosThreshold: capCosThreshold,
      capHalfAngleRad: capHalfAngleRad,
      capHalfAngleDeg: capHalfAngleDeg,
      capHeightM: capHeightM,
      meshAreaM2: meshAreaM2,
      areaErrorPct: mesh.areaErrorPct,
      faceCount: mesh.faceCount,
      edgeCount: mesh.edgeCount,
      vertexCount: mesh.vertexCount,
      minStrutM: mesh.minUnitEdge * radiusM,
      maxStrutM: mesh.maxUnitEdge * radiusM,
      areaFt2: areaM2 * SQM_TO_SQFT,
      coveredAreaFt2: coveredAreaM2 * SQM_TO_SQFT,
      volumeFt3: volumeM3 * CUM_TO_CUFT,
      diameterFt: diameterM * M_TO_FT,
      radiusFt: radiusM * M_TO_FT
    };
  }

  function compareRadiusScaling(rBefore, rAfter) {
    var r0 = Math.max(0.001, Number(rBefore) || 1);
    var r1 = Math.max(0.001, Number(rAfter) || 1);
    var ratio = r1 / r0;
    return {
      radiusRatio: ratio,
      areaRatio: ratio * ratio,
      volumeRatio: ratio * ratio * ratio
    };
  }

  function computeAcuityMetrics(opts) {
    var input = opts || {};
    var distanceM = clamp(input.distanceM != null ? input.distanceM : 35, 5, 80);
    var pixelPitchMm = clamp(input.pixelPitchMm != null ? input.pixelPitchMm : 10, 2, 40);
    var fovDeg = clamp(input.fovDeg != null ? input.fovDeg : 160, 90, 200);
    var screenAreaM2 = Math.max(1, Number(input.screenAreaM2) || 16000);

    var pitchM = pixelPitchMm / 1000;
    var angularRad = 2 * Math.atan(pitchM / (2 * distanceM));
    var arcmin = angularRad * (180 / Math.PI) * 60;
    var ppd = 60 / arcmin;
    var oneArcminRad = (Math.PI / 180) / 60;
    var minSeamlessDistM = pitchM / (2 * Math.tan(oneArcminRad / 2));

    var acuityBand = arcmin <= 1.0 ? 'seamless' : (arcmin <= 2.5 ? 'crisp' : 'visible-grid');
    var pixelsPerM2 = Math.pow(1000 / pixelPitchMm, 2);
    var totalMegapixels = (screenAreaM2 * pixelsPerM2) / 1e6;
    var horizontalPixels = Math.round((fovDeg * 60) / arcmin);

    return {
      distanceM: distanceM,
      pixelPitchMm: pixelPitchMm,
      fovDeg: fovDeg,
      arcmin: arcmin,
      ppd: ppd,
      minSeamlessDistM: minSeamlessDistM,
      isSeamless: arcmin <= 1.0,
      acuityBand: acuityBand,
      pixelsPerM2: pixelsPerM2,
      totalMegapixels: totalMegapixels,
      horizontalPixels: horizontalPixels
    };
  }

  function computeArrayFactor(angleDeg, opts) {
    var input = opts || {};
    var mode = input.mode || 'steered';
    var driverCount = Math.round(clamp(input.driverCount != null ? input.driverCount : 10, 2, 16));
    var frequencyHz = clamp(input.frequencyHz != null ? input.frequencyHz : 850, 250, 2000);
    var steerAngleDeg = clamp(input.steerAngleDeg != null ? input.steerAngleDeg : 0, -50, 50);
    var apertureM = Math.max(1, Number(input.apertureM) || 6);

    var theta = (clamp(angleDeg, -90, 90) * Math.PI) / 180;
    if (mode === 'whispering') {
      // Unfocused wide spherical-shell radiation with strong concave focus ambiguity
      return 0.62 + 0.38 * Math.cos(theta * 1.15);
    }

    var wavelengthM = SPEED_OF_SOUND / frequencyHz;
    var k = (2 * Math.PI) / wavelengthM;
    var spacingM = apertureM / Math.max(1, driverCount - 1);

    function singleBeam(targetDeg) {
      var theta0 = (targetDeg * Math.PI) / 180;
      var psi = k * spacingM * (Math.sin(theta) - Math.sin(theta0));
      var re = 0;
      var im = 0;
      for (var n = 0; n < driverCount; n++) {
        var phase = n * psi;
        re += Math.cos(phase);
        im += Math.sin(phase);
      }
      return Math.hypot(re, im) / driverCount;
    }

    if (mode === 'dual') {
      var splitDeg = Math.max(18, Math.abs(steerAngleDeg));
      var thetaPlus = (splitDeg * Math.PI) / 180;
      var thetaMinus = (-splitDeg * Math.PI) / 180;
      var reD = 0;
      var imD = 0;
      var half = (driverCount - 1) / 2;
      for (var m = 0; m < driverCount; m++) {
        var pos = (m - half) * spacingM;
        // Symmetric weight cos(k*pos*sin(split)) creates two steerable beams at +/- splitDeg
        var weight = Math.cos(k * pos * Math.sin(thetaPlus));
        var pWave = k * pos * Math.sin(theta);
        reD += weight * Math.cos(pWave);
        imD += weight * Math.sin(pWave);
      }
      // Normalize against the beam peak at +/- splitDeg
      var rePeak = 0;
      var imPeak = 0;
      for (var q = 0; q < driverCount; q++) {
        var posQ = (q - half) * spacingM;
        var wQ = Math.cos(k * posQ * Math.sin(thetaPlus));
        var pQ = k * posQ * Math.sin(thetaPlus);
        rePeak += wQ * Math.cos(pQ);
        imPeak += wQ * Math.sin(pQ);
      }
      var norm = Math.max(0.001, Math.hypot(rePeak, imPeak));
      void thetaMinus;
      return clamp(Math.hypot(reD, imD) / norm, 0, 1);
    }

    return clamp(singleBeam(steerAngleDeg), 0, 1);
  }

  function computeBeamforming(opts) {
    var input = opts || {};
    var mode = input.mode || 'steered';
    var driverCount = Math.round(clamp(input.driverCount != null ? input.driverCount : 10, 2, 16));
    var frequencyHz = clamp(input.frequencyHz != null ? input.frequencyHz : 850, 250, 2000);
    var steerAngleDeg = clamp(input.steerAngleDeg != null ? input.steerAngleDeg : 0, -50, 50);
    var apertureM = Math.max(1, Number(input.apertureM) || 6);

    var wavelengthM = SPEED_OF_SOUND / frequencyHz;
    var spacingM = apertureM / Math.max(1, driverCount - 1);
    var beamwidthDeg = mode === 'whispering'
      ? 140
      : Math.min(180, (50.8 * wavelengthM) / apertureM);
    var hasGratingLobe = mode !== 'whispering' && spacingM > wavelengthM / 2;

    return {
      mode: mode,
      driverCount: driverCount,
      frequencyHz: frequencyHz,
      steerAngleDeg: steerAngleDeg,
      apertureM: apertureM,
      wavelengthM: wavelengthM,
      spacingM: spacingM,
      halfWavelengthM: wavelengthM / 2,
      beamwidthDeg: beamwidthDeg,
      hasGratingLobe: hasGratingLobe
    };
  }

  function samplePolarPattern(opts, steps) {
    var count = Math.max(15, Math.round(steps || 151));
    var out = [];
    for (var i = 0; i < count; i++) {
      var angleDeg = -75 + (150 * i) / (count - 1);
      out.push({
        angleDeg: angleDeg,
        gain: computeArrayFactor(angleDeg, opts)
      });
    }
    return out;
  }

  function computeChannelCapacity(opts) {
    var input = opts || {};
    var bandwidthMHz = clamp(input.bandwidthMHz != null ? input.bandwidthMHz : 10, 1, 40);
    var snrLinear = clamp(input.snrLinear != null ? input.snrLinear : 10, 1, 40);

    var spectralEfficiency = Math.log2(1 + snrLinear);
    var capacityMbps = bandwidthMHz * spectralEfficiency;
    var snrDb = 10 * Math.log10(snrLinear);
    var doubleBandwidthMbps = 2 * capacityMbps;
    var doubleSnrMbps = bandwidthMHz * Math.log2(1 + 2 * snrLinear);
    var doubleSnrGainPct = ((doubleSnrMbps - capacityMbps) / capacityMbps) * 100;
    var maxSliderCapacity = 40 * Math.log2(41);
    var barPct = Math.min(100, (capacityMbps / maxSliderCapacity) * 100);
    var equivalent4kStreams = capacityMbps / 25;

    return {
      bandwidthMHz: bandwidthMHz,
      snrLinear: snrLinear,
      snrDb: snrDb,
      spectralEfficiency: spectralEfficiency,
      capacityMbps: capacityMbps,
      doubleBandwidthMbps: doubleBandwidthMbps,
      doubleSnrMbps: doubleSnrMbps,
      doubleSnrGainPct: doubleSnrGainPct,
      barPct: barPct,
      equivalent4kStreams: equivalent4kStreams
    };
  }

  var MISSIONS = Object.freeze([
    Object.freeze({
      id: 'square-cube',
      title: 'Square-Cube Proof',
      detail: 'Test doubling radius in Lab 1 (Area ×4, Volume ×8)'
    }),
    Object.freeze({
      id: 'geodesic-convergence',
      title: 'Curvature Fit',
      detail: 'Subdivide the geodesic shell to frequency ≥ 4 (< 2% error)'
    }),
    Object.freeze({
      id: 'retina-seat',
      title: 'Seamless Screen',
      detail: 'Reach ≤ 1.0 arcmin angular pixel size in Lab 2'
    }),
    Object.freeze({
      id: 'steer-beam',
      title: 'Aim the Sound',
      detail: 'Steer a phased array beam off-axis (|θ| ≥ 20°) in Lab 3'
    }),
    Object.freeze({
      id: 'shannon-tradeoff',
      title: 'Bandwidth vs. Power',
      detail: 'Compare doubling B vs. doubling S/N in Lab 4'
    })
  ]);

  function evaluateMissions(state) {
    var s = state || {};
    var completedIds = [];
    if (s.doubledRadius || (s.predictionCorrect && s.testedRadiusScaling)) {
      completedIds.push('square-cube');
    }
    if ((s.maxFrequencyUsed || 0) >= 4 || (s.frequency || 0) >= 4) {
      completedIds.push('geodesic-convergence');
    }
    if (s.reachedSeamlessAcuity || (typeof s.arcmin === 'number' && s.arcmin <= 1.0)) {
      completedIds.push('retina-seat');
    }
    if (s.steeredOffAxis || (s.acousticMode === 'steered' && Math.abs(s.steerAngleDeg || 0) >= 20)) {
      completedIds.push('steer-beam');
    }
    if (s.comparedChannelScaling || (s.usedDoubleB && s.usedDoubleSnr)) {
      completedIds.push('shannon-tradeoff');
    }
    return {
      completedIds: completedIds,
      completedCount: completedIds.length,
      totalCount: MISSIONS.length
    };
  }

  var QUIZ_QUESTIONS = Object.freeze([
    Object.freeze({
      id: 'sq1',
      prompt: 'If a design team doubles the radius of an ideal spherical shell while keeping coverage at 60%, what happens to display area and interior volume?',
      options: Object.freeze([
        { value: '2-2', label: 'Both display area and interior volume double (×2).' },
        { value: '4-8', label: 'Display area becomes 4× larger (r²); volume becomes 8× larger (r³).' },
        { value: '8-4', label: 'Display area becomes 8× larger; volume becomes 4× larger.' },
        { value: '4-4', label: 'Both become 4× larger because coverage stays at 60%.' }
      ]),
      answer: '4-8',
      explanation: 'Any proportional fraction of 4πr² still scales as r² (2² = 4), while enclosed volume (4/3)πr³ scales as r³ (2³ = 8).'
    }),
    Object.freeze({
      id: 'sq2',
      prompt: 'Why do engineers subdivide a geodesic dome into higher-frequency triangles instead of using a single coarse icosahedron?',
      options: Object.freeze([
        { value: 'flat-chord', label: 'Smaller flat triangles follow the curved sphere more closely and reduce chord-area error.' },
        { value: 'no-loads', label: 'Smaller triangles automatically calculate structural wind and snow loads.' },
        { value: 'remove-struts', label: 'Higher subdivision eliminates struts and leaves zero joints.' },
        { value: 'volume-zero', label: 'Subdivision changes the enclosed sphere volume formula.' }
      ]),
      answer: 'flat-chord',
      explanation: 'Higher subdivision reduces geometric discretization error against a true sphere, though real structural strength still requires material properties and finite element analysis.'
    }),
    Object.freeze({
      id: 'sq3',
      prompt: 'A curved screen uses 10 mm pixel pitch. Around how far back must a viewer with 1 arcminute acuity sit before individual pixels stop looking distinct?',
      options: Object.freeze([
        { value: '3.4', label: 'About 3.4 m' },
        { value: '10', label: 'About 10 m' },
        { value: '34', label: 'About 34 m' },
        { value: '100', label: 'About 100 m' }
      ]),
      answer: '34',
      explanation: 'At 1 arcminute (1/60 degree), distance ≈ pitch / (2 tan(0.5 arcmin)) ≈ 3.44 × pitch_mm ≈ 34.4 m.'
    }),
    Object.freeze({
      id: 'sq4',
      prompt: 'Why can an unbaffled concave spherical wall create distracting audio hot spots ("whispering gallery" echoes)?',
      options: Object.freeze([
        { value: 'focus', label: 'The concave curvature reflects sound waves inward toward focal zones.' },
        { value: 'light', label: 'Sound waves convert into light inside curved domes.' },
        { value: 'vacuum', label: 'Air pressure drops to zero at the center of a sphere.' },
        { value: 'shannon', label: 'Shannon-Hartley limits acoustic frequencies to below 20 Hz.' }
      ]),
      answer: 'focus',
      explanation: 'Concave surfaces reflect wavefronts inward; acoustic treatment and beamforming arrays help direct controlled energy to seats instead.'
    }),
    Object.freeze({
      id: 'sq5',
      prompt: 'In an ideal AWGN channel (C = B log₂(1 + S/N)), why does doubling bandwidth B give a larger capacity jump than doubling S/N (when S/N ≥ 1)?',
      options: Object.freeze([
        { value: 'linear-vs-log', label: 'B multiplies capacity linearly, whereas S/N sits inside a base-2 logarithm.' },
        { value: 'noise-free', label: 'Doubling B removes all thermal noise from the receiver.' },
        { value: 'snr-ignored', label: 'Signal-to-noise ratio has zero effect on channel capacity.' },
        { value: 'speed-sound', label: 'Bandwidth increases the speed of sound in air.' }
      ]),
      answer: 'linear-vs-log',
      explanation: 'Capacity scales linearly with B (2×B gives 2×C at fixed S/N), while doubling S/N only adds less than 1 bit/s/Hz inside log₂(1 + S/N).'
    }),
    Object.freeze({
      id: 'sq6',
      prompt: 'Why can you not recover Sphere Las Vegas\'s published 580,000 ft² exterior and 160,000 ft² interior screen directly from 4πr² alone?',
      options: Object.freeze([
        { value: 'real-geometry', label: 'A real venue is not a complete mathematical sphere, and interior/exterior surfaces have distinct geometries and coverage.' },
        { value: 'pi-wrong', label: 'The formula 4πr² only works in metric units, not square feet.' },
        { value: 'volume-same', label: 'Screen area is always equal to building volume.' },
        { value: 'no-triangles', label: 'Real domes have no surface area unless made of squares.' }
      ]),
      answer: 'real-geometry',
      explanation: 'An ideal sphere is a starting model. Real venues sit on foundations, truncate at the ground, and separate exterior cladding from interior seating-bowl canvases.'
    })
  ]);

  function gradeQuiz(answers) {
    var submitted = answers || {};
    var correct = 0;
    var results = QUIZ_QUESTIONS.map(function (q) {
      var chosen = submitted[q.id] || '';
      var isCorrect = chosen === q.answer;
      if (isCorrect) correct++;
      return {
        id: q.id,
        chosen: chosen,
        answer: q.answer,
        isCorrect: isCorrect,
        explanation: q.explanation
      };
    });
    return {
      correct: correct,
      total: QUIZ_QUESTIONS.length,
      results: results
    };
  }

  var api = {
    SQM_TO_SQFT: SQM_TO_SQFT,
    CUM_TO_CUFT: CUM_TO_CUFT,
    M_TO_FT: M_TO_FT,
    SPEED_OF_SOUND: SPEED_OF_SOUND,
    VENUE_PRESETS: VENUE_PRESETS,
    DISPLAY_PRESETS: DISPLAY_PRESETS,
    MISSIONS: MISSIONS,
    QUIZ_QUESTIONS: QUIZ_QUESTIONS,
    clamp: clamp,
    buildGeodesicMesh: buildGeodesicMesh,
    computeSphereGeometry: computeSphereGeometry,
    compareRadiusScaling: compareRadiusScaling,
    computeAcuityMetrics: computeAcuityMetrics,
    computeArrayFactor: computeArrayFactor,
    computeBeamforming: computeBeamforming,
    samplePolarPattern: samplePolarPattern,
    computeChannelCapacity: computeChannelCapacity,
    evaluateMissions: evaluateMissions,
    gradeQuiz: gradeQuiz
  };

  root.SphereSystemsModel = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
