/* Pure math, time-formatting, solar-terminator, and relativistic helpers
 * for Clocks & Telling Time (lessons/mathematics/foundations/clocks-and-time.html).
 * Zero DOM dependencies so it can be unit-tested in Node and shared by the browser UI.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClocksTimeMath = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C_METERS_PER_NS = 0.299792458;
  var FT_PER_METER = 3.280839895;
  var IN_PER_METER = 39.37007874;

  var NUMBER_WORDS = [
    'Twelve', 'One', 'Two', 'Three', 'Four', 'Five',
    'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'
  ];

  var ONES_WORDS = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'
  ];

  var TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

  function pad2(n) {
    return String(Math.floor(n)).padStart(2, '0');
  }

  function cleanDeg(d) {
    var r = ((d % 360) + 360) % 360;
    return Math.abs(r - 360) < 1e-9 ? 0 : r;
  }

  function normalizeMinutesOfDay(mins) {
    if (!Number.isFinite(mins)) return 0;
    var wrapped = ((mins % 1440) + 1440) % 1440;
    return Math.abs(wrapped - 1440) < 1e-9 ? 0 : wrapped;
  }

  function clockHandAngles(hours, minutes, seconds) {
    var h = ((Number(hours) || 0) % 12 + 12) % 12;
    var m = (((Number(minutes) || 0) % 60) + 60) % 60;
    var s = (((Number(seconds) || 0) % 60) + 60) % 60;

    var secDeg = cleanDeg(s * 6);
    var minDeg = cleanDeg((m + s / 60) * 6);
    var hourDeg = cleanDeg((h + m / 60 + s / 3600) * 30);

    var rawDiff = Math.abs(hourDeg - minDeg) % 360;
    var handGapDeg = rawDiff > 180 ? 360 - rawDiff : rawDiff;

    return {
      secDeg: secDeg,
      minDeg: minDeg,
      hourDeg: hourDeg,
      handGapDeg: Math.round(handGapDeg * 10) / 10
    };
  }

  function formatTime12(hours24, minutes, seconds, includeSeconds) {
    var h24 = (((Math.floor(Number(hours24) || 0)) % 24) + 24) % 24;
    var m = (((Math.floor(Number(minutes) || 0)) % 60) + 60) % 60;
    var s = (((Math.floor(Number(seconds) || 0)) % 60) + 60) % 60;
    var suffix = h24 >= 12 ? 'PM' : 'AM';
    var h12 = h24 % 12 || 12;
    var base = h12 + ':' + pad2(m);
    if (includeSeconds) base += ':' + pad2(s);
    return base + ' ' + suffix;
  }

  function formatTime24(hours24, minutes, seconds, includeSeconds) {
    var h24 = (((Math.floor(Number(hours24) || 0)) % 24) + 24) % 24;
    var m = (((Math.floor(Number(minutes) || 0)) % 60) + 60) % 60;
    var s = (((Math.floor(Number(seconds) || 0)) % 60) + 60) % 60;
    var base = pad2(h24) + ':' + pad2(m);
    return includeSeconds ? base + ':' + pad2(s) : base;
  }

  function numberToLowerWords(n) {
    if (n < 20) return ONES_WORDS[n];
    var tens = Math.floor(n / 10);
    var ones = n % 10;
    return ones ? TENS_WORDS[tens] + '-' + ONES_WORDS[ones] : TENS_WORDS[tens];
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function timeToWords(hours24, minutes) {
    var h24 = (((Math.floor(Number(hours24) || 0)) % 24) + 24) % 24;
    var m = (((Math.floor(Number(minutes) || 0)) % 60) + 60) % 60;

    if (h24 === 0 && m === 0) return 'Midnight';
    if (h24 === 12 && m === 0) return 'Noon';

    var h12 = h24 % 12 || 12;
    var nextH12 = (h24 + 1) % 12 || 12;
    var hourWord = NUMBER_WORDS[h12];
    var nextWord = NUMBER_WORDS[nextH12].toLowerCase();

    if (m === 0) return hourWord + " o'clock";
    if (m === 15) return 'Quarter past ' + hourWord.toLowerCase();
    if (m === 30) return 'Half past ' + hourWord.toLowerCase();
    if (m === 45) return 'Quarter to ' + nextWord;
    if (m === 5 || m === 10 || m === 20 || m === 25) {
      return capitalize(numberToLowerWords(m)) + ' past ' + hourWord.toLowerCase();
    }
    if (m === 35 || m === 40 || m === 50 || m === 55) {
      return capitalize(numberToLowerWords(60 - m)) + ' to ' + nextWord;
    }
    if (m < 10) {
      return hourWord + ' oh-' + numberToLowerWords(m);
    }
    return hourWord + ' ' + numberToLowerWords(m);
  }

  function computeElapsedTime(startMins, endMins) {
    var start = Math.round(normalizeMinutesOfDay(startMins));
    var end = Math.round(normalizeMinutesOfDay(endMins));
    var crossedMidnight = end < start;
    var totalMinutes = (end - start + 1440) % 1440;
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;

    var jumps = [];
    if (totalMinutes > 0) {
      var cursor = start;
      var rem = totalMinutes;

      if (cursor % 60 !== 0) {
        var toNextHour = 60 - (cursor % 60);
        if (rem >= toNextHour) {
          jumps.push({
            from: cursor,
            to: cursor + toNextHour,
            delta: toNextHour,
            kind: 'hill',
            label: '+' + toNextHour + 'm'
          });
          cursor += toNextHour;
          rem -= toNextHour;
        }
      }

      var wholeHours = Math.floor(rem / 60);
      if (wholeHours > 0) {
        if (wholeHours <= 4) {
          for (var i = 0; i < wholeHours; i++) {
            jumps.push({
              from: cursor,
              to: cursor + 60,
              delta: 60,
              kind: 'mountain',
              label: '+1h'
            });
            cursor += 60;
          }
        } else {
          var block = wholeHours * 60;
          jumps.push({
            from: cursor,
            to: cursor + block,
            delta: block,
            kind: 'mountain',
            label: '+' + wholeHours + 'h'
          });
          cursor += block;
        }
        rem -= wholeHours * 60;
      }

      if (rem > 0) {
        jumps.push({
          from: cursor,
          to: cursor + rem,
          delta: rem,
          kind: 'rock',
          label: '+' + rem + 'm'
        });
      }
    }

    return {
      start: start,
      end: end,
      totalMinutes: totalMinutes,
      hours: hours,
      minutes: minutes,
      crossedMidnight: crossedMidnight,
      jumps: jumps
    };
  }

  function solarPosition(date) {
    var d = date instanceof Date ? date : new Date(date);
    var yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    var dayOfYear = Math.floor((d.getTime() - yearStart) / 86400000) + 1;
    var declDeg = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);

    var utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    var rawLon = (12 - utcHours) * 15;
    var subLonDeg = ((((rawLon + 180) % 360) + 360) % 360) - 180;

    return {
      dayOfYear: dayOfYear,
      declDeg: declDeg,
      subLonDeg: subLonDeg
    };
  }

  function solarTerminatorPath(date, width, height) {
    var w = width || 800;
    var h = height || 400;
    var pos = solarPosition(date);
    var declRad = (pos.declDeg * Math.PI) / 180;
    var safeTan = Math.tan(Math.abs(declRad) < 0.005 ? (declRad >= 0 ? 0.005 : -0.005) : declRad);
    var subLonRad = (pos.subLonDeg * Math.PI) / 180;

    var points = [];
    for (var lon = -180; lon <= 180; lon += 2) {
      var lonRad = (lon * Math.PI) / 180;
      var latRad = Math.atan(-Math.cos(lonRad - subLonRad) / safeTan);
      var latDeg = (latRad * 180) / Math.PI;
      var x = ((lon + 180) / 360) * w;
      var y = ((90 - latDeg) / 180) * h;
      points.push(x.toFixed(1) + ',' + y.toFixed(1));
    }

    // When solar declination >= 0 (Northern summer), the South Pole (y = h) is in night.
    // When solar declination < 0 (Northern winter), the North Pole (y = 0) is in night.
    var nightPoleY = pos.declDeg >= 0 ? h : 0;
    var pathD = 'M0,' + nightPoleY + ' L' + points.join(' L') + ' L' + w + ',' + nightPoleY + ' Z';

    return {
      pathD: pathD,
      declDeg: pos.declDeg,
      subsolar: {
        lat: pos.declDeg,
        lon: pos.subLonDeg,
        x: ((pos.subLonDeg + 180) / 360) * w,
        y: ((90 - pos.declDeg) / 180) * h
      }
    };
  }

  function lorentzFactor(beta) {
    var b = Number(beta);
    if (!Number.isFinite(b) || b < 0) return NaN;
    if (b >= 1) return Infinity;
    return 1 / Math.sqrt(1 - b * b);
  }

  function timeDilation(beta, shipYears) {
    var b = Math.max(0, Number(beta) || 0);
    var sy = Math.max(0, Number(shipYears) || 0);
    var gamma = lorentzFactor(b);
    var asymptotic = b >= 0.99995 || !Number.isFinite(gamma);
    var earthYears = Number.isFinite(gamma) ? gamma * sy : Infinity;
    return {
      beta: b,
      gamma: gamma,
      earthYears: earthYears,
      shipRate: Number.isFinite(gamma) ? 1 / gamma : 0,
      ageDiffYears: Number.isFinite(earthYears) ? earthYears - sy : Infinity,
      asymptotic: asymptotic
    };
  }

  function wireLengthForNanoseconds(ns) {
    var n = Number(ns);
    if (!Number.isFinite(n) || n <= 0) return null;
    var meters = n * C_METERS_PER_NS;
    return {
      ns: n,
      meters: meters,
      cm: meters * 100,
      mm: meters * 1000,
      km: meters / 1000,
      inches: meters * IN_PER_METER,
      feet: meters * FT_PER_METER,
      yards: (meters * FT_PER_METER) / 3,
      miles: (meters * FT_PER_METER) / 5280
    };
  }

  function parsePracticeAnswer(raw, expectedType) {
    if (raw == null) return NaN;
    var trimmed = String(raw).trim();
    if (!trimmed) return NaN;

    var type = expectedType || 'number';
    if (type === 'time24' || type === 'clock') {
      var colonMatch = trimmed.match(/^(\d{1,2})\s*:\s*(\d{2})(?:\s*(am|pm))?$/i);
      if (colonMatch) {
        var h = parseInt(colonMatch[1], 10);
        var min = parseInt(colonMatch[2], 10);
        var ampm = colonMatch[3] ? colonMatch[3].toLowerCase() : null;
        if (min < 0 || min >= 60) return NaN;
        if (type === 'time24') {
          if (ampm === 'pm' && h >= 1 && h < 12) h += 12;
          else if (ampm === 'am' && h === 12) h = 0;
          if (h < 0 || h > 23) return NaN;
          return h * 60 + min;
        }
        // 'clock' represents 12-hour analog reading in decimal hours (e.g. "3:00" -> 3)
        if (h < 0 || h > 23) return NaN;
        var h12 = h % 12 || 12;
        return h12 + min / 60;
      }
    }

    var cleaned = trimmed
      .replace(/,/g, '')
      .replace(/[°%]/g, '')
      .replace(/\s+(?:inches|inch|in|minutes|minute|mins|min|degrees|deg|years|year|yrs|yr|hours|hour|hrs|hr|zones|zone)\.?$/i, '')
      .trim();

    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
    return parseFloat(cleaned);
  }

  return {
    C_METERS_PER_NS: C_METERS_PER_NS,
    normalizeMinutesOfDay: normalizeMinutesOfDay,
    clockHandAngles: clockHandAngles,
    formatTime12: formatTime12,
    formatTime24: formatTime24,
    timeToWords: timeToWords,
    computeElapsedTime: computeElapsedTime,
    solarPosition: solarPosition,
    solarTerminatorPath: solarTerminatorPath,
    lorentzFactor: lorentzFactor,
    timeDilation: timeDilation,
    wireLengthForNanoseconds: wireLengthForNanoseconds,
    parsePracticeAnswer: parsePracticeAnswer
  };
}));
