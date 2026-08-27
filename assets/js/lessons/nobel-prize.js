(function () {
  'use strict';

  var filters = Array.from(document.querySelectorAll('.nobel-filter button'));
  var dossiers = Array.from(document.querySelectorAll('.nobel-dossier'));
  var filterStatus = document.getElementById('filter-status');

  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.dataset.filter;
      filters.forEach(function (item) {
        var selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      var visible = 0;
      dossiers.forEach(function (card) {
        var match = filter === 'all' || card.dataset.category.split(' ').includes(filter);
        card.hidden = !match;
        if (match) visible += 1;
      });
      filterStatus.textContent = filter === 'all'
        ? 'Showing ' + visible + ' laureate files across all fields.'
        : 'Showing ' + visible + ' ' + filter + ' laureate ' + (visible === 1 ? 'file.' : 'files.');
    });
  });

  var candidates = {
    amara: { name: 'Dr. Amara Okafor', impact: 9, evidence: 9, access: 9, lasting: 7 },
    ilya: { name: 'Dr. Ilya Moreno', impact: 10, evidence: 8, access: 4, lasting: 9 },
    sanaa: { name: 'Sanaa Bekele Network', impact: 7, evidence: 7, access: 8, lasting: 8 }
  };
  var weights = ['impact', 'evidence', 'access', 'lasting'];
  function updateCommittee() {
    var weightValues = {};
    weights.forEach(function (key) {
      var input = document.getElementById('weight-' + key);
      weightValues[key] = Number(input.value);
      document.getElementById('weight-' + key + '-out').textContent = input.value;
    });
    var totalWeight = weights.reduce(function (sum, key) { return sum + weightValues[key]; }, 0);
    var scores = Object.keys(candidates).map(function (key) {
      var candidate = candidates[key];
      var raw = weights.reduce(function (sum, factor) { return sum + candidate[factor] * weightValues[factor]; }, 0);
      return { key: key, score: Math.round((raw / (totalWeight * 10)) * 100) };
    }).sort(function (a, b) { return b.score - a.score; });

    scores.forEach(function (result) {
      var article = document.querySelector('[data-candidate="' + result.key + '"]');
      article.querySelector('meter').value = result.score;
      article.querySelector('.candidate-score').textContent = result.score;
      article.classList.toggle('is-leading', result.key === scores[0].key);
    });
    document.getElementById('committee-winner').textContent = candidates[scores[0].key].name;
    var highest = weights.slice().sort(function (a, b) { return weightValues[b] - weightValues[a]; })[0];
    var labels = { impact: 'large-scale benefit', evidence: 'strong existing evidence', access: 'wide access', lasting: 'lasting change' };
    document.getElementById('committee-reason').textContent = 'Your heaviest priority is ' + labels[highest] + '. Change a slider and watch how an apparently neutral rule changes the result.';
  }
  weights.forEach(function (key) { document.getElementById('weight-' + key).addEventListener('input', updateCommittee); });
  updateCommittee();

  var reviewResults = new Map();
  document.querySelectorAll('.nobel-question').forEach(function (question, index) {
    question.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        var correct = button.dataset.choice === question.dataset.answer;
        question.querySelectorAll('button').forEach(function (item) {
          item.classList.remove('is-correct', 'is-wrong');
          if (item === button) item.classList.add(correct ? 'is-correct' : 'is-wrong');
        });
        reviewResults.set(index, correct);
        var feedback = question.querySelector('.nobel-question-feedback');
        feedback.className = 'nobel-question-feedback ' + (correct ? 'is-good' : '');
        feedback.textContent = (correct ? 'Correct. ' : 'Not yet. ') + question.dataset.explain;
        var correctCount = Array.from(reviewResults.values()).filter(Boolean).length;
        document.getElementById('review-score').textContent = reviewResults.size + ' of 5 checked · ' + correctCount + ' correct';
      });
    });
  });
}());
