(function () {
  'use strict';
  var posts = [
    { id: 'stunt', title: 'Impossible bike stunt', watch: 95, useful: 15 },
    { id: 'repair', title: 'Fix a flat tire', watch: 55, useful: 95 },
    { id: 'review', title: 'New bike review', watch: 80, useful: 40 },
    { id: 'route', title: 'Local cycling route', watch: 65, useful: 60 }
  ];
  var goal = 'watch';
  var feedback = document.getElementById('rankFeedback');
  function score(post) {
    return goal === 'balanced' ? (post.watch + post.useful) / 2 : post[goal];
  }
  function render() {
    var ranked = posts.slice().sort(function (a, b) { return score(b) - score(a); });
    var list = document.getElementById('rankResults');
    list.replaceChildren();
    ranked.forEach(function (post) {
      var item = document.createElement('li');
      var title = document.createElement('strong');
      title.textContent = post.title + ' · ranking score ' + score(post);
      var evidence = document.createElement('span');
      evidence.textContent = 'Watch time: ' + post.watch + ' points · Task usefulness: ' + post.useful + ' points';
      item.append(title, evidence);
      list.append(item);
    });
    document.getElementById('rankRule').textContent = 'Rule: score = ' +
      (goal === 'balanced' ? '(watch-time points + usefulness points) ÷ 2.' : goal === 'watch' ? 'watch-time points.' : 'usefulness points.') +
      ' All numbers are invented classroom scores from 0 to 100, not probabilities or real platform weights. Equal scores keep the original order.';
    return ranked[0];
  }
  document.getElementById('rankTest').addEventListener('click', function () {
    var prediction = document.getElementById('rankPrediction').value;
    if (!prediction) { feedback.textContent = 'Choose a post for your prediction first.'; return; }
    goal = 'watch';
    document.querySelector('input[name="rankGoal"][value="watch"]').checked = true;
    render();
    feedback.textContent = (prediction === 'stunt' ? 'Your prediction matches the result. ' : 'Compare your prediction with the result. ') +
      'The stunt wins with 95 watch-time points, but has only 15 usefulness points. Now change the goal to usefulness.';
  });
  document.querySelectorAll('input[name="rankGoal"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      goal = radio.value;
      var winner = render();
      feedback.textContent = winner.title + ' ranks first with ' + score(winner) + ' points. Only the goal changed; all post scores stayed fixed. Which goal serves the bicycle repair task?';
    });
  });
  render();
}());
