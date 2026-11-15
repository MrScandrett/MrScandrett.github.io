/* Legacy lesson print action; fingering and printing use the shared score planner. */
(function () {
  'use strict';
  window.MozartRondoPrintScore = function () {
    var figure = document.querySelector('figure[data-score="mozart-turkish-march"]');
    if (!figure || !figure.scoreData || !window.ScoreEngine) return;
    window.ScoreEngine.printScore(figure.scoreData, figure.scoreFingeringPrint ? figure.scoreFingeringPrint() : {});
  };
})();
