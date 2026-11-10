/* BreadboardCore: the DOM-free rules of the Breadboard Basics lesson
 * (lessons/engineering/arduino-and-electronics/breadboard-basics.html): which holes a breadboard joins, and the
 * build-a-circuit challenge's placement checks. Moved unchanged out of the page's inline <script>;
 * breadboard-basics.js needs this file first. Tested in tests/breadboard-basics-core.test.mjs. */
  var BreadboardCore = (function () {
    'use strict';

    const COLS = 20;              // number of columns shown

    // Row metadata
    const ROW_META = {
      'rail-top-plus':  { type: 'rail', rail: 'top-plus',  color: '#ff3b30', label: '+' },
      'rail-top-minus': { type: 'rail', rail: 'top-minus', color: '#0a84ff', label: '−' },
      'a': { type: 'tie', half: 'top', color: '#34c759', label: 'a' },
      'b': { type: 'tie', half: 'top', color: '#34c759', label: 'b' },
      'c': { type: 'tie', half: 'top', color: '#34c759', label: 'c' },
      'd': { type: 'tie', half: 'top', color: '#34c759', label: 'd' },
      'e': { type: 'tie', half: 'top', color: '#34c759', label: 'e' },
      'f': { type: 'tie', half: 'bot', color: '#30d158', label: 'f' },
      'g': { type: 'tie', half: 'bot', color: '#30d158', label: 'g' },
      'h': { type: 'tie', half: 'bot', color: '#30d158', label: 'h' },
      'i': { type: 'tie', half: 'bot', color: '#30d158', label: 'i' },
      'j': { type: 'tie', half: 'bot', color: '#30d158', label: 'j' },
      'rail-bot-minus': { type: 'rail', rail: 'bot-minus', color: '#0a84ff', label: '−' },
      'rail-bot-plus':  { type: 'rail', rail: 'bot-plus',  color: '#ff3b30', label: '+' },
    };

    const TIE_ROWS_TOP = ['a','b','c','d','e'];

    const TIE_ROWS_BOT = ['f','g','h','i','j'];

    const RAIL_ROWS = ['rail-top-plus','rail-top-minus','rail-bot-minus','rail-bot-plus'];

    // Get all holes connected to (row, col)
    function getConnected(row, col) {
      const meta = ROW_META[row];
      if (!meta) return [];
      if (meta.type === 'rail') {
        // All columns on same rail
        return Array.from({ length: COLS }, (_, i) => ({ row, col: i + 1 }));
      }
      if (meta.type === 'tie') {
        // Same column, same half
        const group = meta.half === 'top' ? TIE_ROWS_TOP : TIE_ROWS_BOT;
        return group.map(r => ({ row: r, col }));
      }
      return [];
    }

    function pointMatches(point, expected) {
      if (!point || !expected) return false;
      if (expected.special) return point.special === expected.special;
      return point.row === expected.row && (expected.col == null || point.col === expected.col);
    }

    function connects(comp, first, second) {
      return (pointMatches(comp.from, first) && pointMatches(comp.to, second))
        || (pointMatches(comp.from, second) && pointMatches(comp.to, first));
    }

    function hasPoweredRails(comps) {
      const red = comps.some(c => c.type === 'wire-red'
        && connects(c, { special: 'bat+' }, { row: 'rail-top-plus' }));
      const black = comps.some(c => c.type === 'wire-black'
        && connects(c, { special: 'bat-' }, { row: 'rail-top-minus' }));
      return red && black;
    }

    function hasResistor(comps) {
      return comps.some(c => c.type === 'resistor'
        && connects(c, { row: 'a', col: 3 }, { row: 'a', col: 6 }));
    }

    function hasLed(comps) {
      return comps.some(c => c.type === 'led'
        && pointMatches(c.from, { row: 'b', col: 6 })
        && pointMatches(c.to, { row: 'b', col: 9 }));
    }

    function hasLoopWires(comps) {
      const input = comps.some(c => c.type === 'wire-red'
        && connects(c, { row: 'rail-top-plus' }, { row: 'a', col: 3 }));
      const output = comps.some(c => c.type === 'wire-black'
        && connects(c, { row: 'rail-top-minus' }, { row: 'a', col: 9 }));
      return input && output;
    }

    function allowedEndpoints(challenge, tool) {
      if (challenge === 1 && tool === 'wire-red') {
        return [{ special: 'bat+' }, { row: 'rail-top-plus' }];
      }
      if (challenge === 1 && tool === 'wire-black') {
        return [{ special: 'bat-' }, { row: 'rail-top-minus' }];
      }
      if (challenge === 2 && tool === 'resistor') {
        return [{ row: 'a', col: 3 }, { row: 'a', col: 6 }];
      }
      if (challenge === 3 && tool === 'led') {
        return [{ row: 'b', col: 6 }];
      }
      if (challenge === 4 && tool === 'wire-red') {
        return [{ row: 'rail-top-plus' }, { row: 'a', col: 3 }];
      }
      if (challenge === 4 && tool === 'wire-black') {
        return [{ row: 'rail-top-minus' }, { row: 'a', col: 9 }];
      }
      return [];
    }

    return {
      COLS, ROW_META, TIE_ROWS_TOP, TIE_ROWS_BOT, RAIL_ROWS, getConnected, pointMatches, connects, hasPoweredRails, hasResistor, hasLed, hasLoopWires, allowedEndpoints
    };
  })();
