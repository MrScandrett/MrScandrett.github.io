/* Textbook model using the existing OI SVG/card/slider/lightbox engine. */
(function () {
  'use strict';
  var OI = window.OI, S = OI.s;
  OI.add({
    id: 'perspective-model', sec: 'size', kind: 'svg', w: 720, h: 480,
    title: 'Perspective model: equal marks, converging context', states: 2,
    teachingModel: true,
    stateLabels: ['Remove the depth cues', 'Restore the depth cues'],
    slider: { label: 'Convergence:', min: 0, max: 100, value: 75, step: 5, unit: '%' },
    q: 'Both orange bars are 160 drawing units long. Does the upper one look longer? Vary the convergence, then remove the rails.',
    a: 'The bars remain equal at every setting. The rails provide a depth cue, not a measurement of the bars.',
    credit: 'Original ClassroomOS diagram · perspective is a teaching model, not a full explanation of every size illusion.',
    why: '<p>Parallel edges in a scene often project to converging lines in an image. The visual system may interpret the upper bar as farther away. A farther object that spans the same angle would be larger, so this context can change apparent size. The model keeps the orange bars fixed while changing only the context. Other cues and visual interactions also matter; results vary between observers.</p>',
    draw: function (state, value) {
      var topLeft = 130 + value * 1.9, topRight = 590 - value * 1.9;
      var out = S.text(360, 35, 'FIXED BARS · ADJUSTABLE CONTEXT', 20, '#334155');
      if (!state) {
        out += S.line(130, 430, topLeft, 70, '#64748b', 4) + S.line(590, 430, topRight, 70, '#64748b', 4);
        [110, 180, 270, 380].forEach(function (y) {
          var f = (430 - y) / 360;
          out += S.line(130 + (topLeft - 130) * f, y, 590 + (topRight - 590) * f, y, '#cbd5e1', 3);
        });
      }
      [150, 350].forEach(function (y) { out += S.line(280, y, 440, y, '#c2410c', 12); });
      if (state) {
        out += S.guide(280, 110, 280, 390) + S.guide(440, 110, 440, 390);
        out += S.text(360, 250, '160 units = 160 units', 23, '#9f1239');
      }
      return out;
    }
  });
})();
