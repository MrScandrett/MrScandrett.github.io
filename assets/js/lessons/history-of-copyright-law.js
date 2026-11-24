(function () {
  'use strict';

  var COPYRIGHT_STOPS = [
    {
      year: 1710,
      title: '1710 · The Statute of Anne',
      summary: 'The first modern copyright law shifts power toward authors and sets a limited term instead of perpetual control.',
      termLabel: '14 years + possible renewal',
      bar: 14,
      lobby: 'Early printer and publisher pressure',
      mickey: false
    },
    {
      year: 1790,
      title: '1790 · The first U.S. Copyright Act',
      summary: 'The new U.S. law protects books, maps, and charts for 14 years, renewable once if the author is alive.',
      termLabel: '14 years + 14 renewal',
      bar: 18,
      lobby: 'Low corporate pressure',
      mickey: false
    },
    {
      year: 1831,
      title: '1831 · Music gains a stronger place',
      summary: 'Congress extends the initial term to 28 years and responds to a larger publishing economy.',
      termLabel: '28 years + 14 renewal',
      bar: 28,
      lobby: 'Growing publishing interests',
      mickey: false
    },
    {
      year: 1909,
      title: '1909 · Industrial media age expansion',
      summary: 'Copyright updates for records, photography, and mass entertainment in a more commercial media economy.',
      termLabel: '28 years + 28 renewal',
      bar: 40,
      lobby: 'Studios and publishers gain influence',
      mickey: true
    },
    {
      year: 1976,
      title: '1976 · Modern copyright structure',
      summary: 'Congress rewrites copyright law, extends terms, broadens protected works, and codifies fair use.',
      termLabel: 'Life of author + 50 years',
      bar: 72,
      lobby: 'Major media lobbying',
      mickey: true
    },
    {
      year: 1998,
      title: '1998 · DMCA and Sonny Bono extension',
      summary: 'Digital copying pressures collide with stronger legal control. Terms grow again, and anti-circumvention rules arrive.',
      termLabel: 'Life + 70 years',
      bar: 92,
      lobby: 'High corporate lobbying pressure',
      mickey: true
    },
    {
      year: 2024,
      title: '2024 · A public-domain milestone',
      summary: 'The 1928 film Steamboat Willie enters the U.S. public domain. Later versions and separate trademark rights require their own analysis.',
      termLabel: 'Life + 70 years',
      bar: 92,
      lobby: 'Long-tail corporate stewardship',
      mickey: true
    }
  ];

  var FAIR_USE_CASES = [
    {
      title: 'The Meme Case',
      text: 'A user adds text to a copyrighted movie screenshot to make a joke on social media.',
      factors: {
        purpose: { label: 'Purpose and character', value: 4, reason: 'Ask whether the joke comments on the film or simply uses it to illustrate an unrelated joke. Humor alone does not settle the purpose factor.' },
        nature: { label: 'Nature of the work', value: -2, reason: 'A movie frame comes from a creative, fictional work.' },
        amount: { label: 'Amount used', value: 2, reason: 'One frame is a small slice of the whole movie.' },
        market: { label: 'Market effect', value: 4, reason: 'It may not replace viewing the film, but consider relevant licensing markets and the particular use.' }
      }
    },
    {
      title: 'The Textbook Case',
      text: 'A teacher photocopies an entire 400-page workbook for 30 students.',
      factors: {
        purpose: { label: 'Purpose and character', value: 2, reason: 'Education helps, but copying whole books is still risky.' },
        nature: { label: 'Nature of the work', value: -1, reason: 'A workbook is factual but also sold as a structured teaching product.' },
        amount: { label: 'Amount used', value: -5, reason: 'The entire workbook is copied, not a small excerpt.' },
        market: { label: 'Market effect', value: -10, reason: 'The copies replace sales of the original workbook.' }
      }
    },
    {
      title: 'The Video Essay Case',
      text: 'A film student uses 45 seconds of short clips from a two-hour movie to analyze how lighting shapes suspense in a free educational critique.',
      factors: {
        purpose: { label: 'Purpose and character', value: 6, reason: 'Criticism, commentary, and teaching are core examples in 17 U.S.C. § 107 when the clips illustrate the analysis.' },
        nature: { label: 'Nature of the work', value: -2, reason: 'A commercial motion picture is highly creative, though already published.' },
        amount: { label: 'Amount used', value: 4, reason: 'Brief clips tied strictly to the lighting analysis take no more than necessary.' },
        market: { label: 'Market effect', value: 5, reason: 'A short analytical essay does not substitute for watching the feature film.' }
      }
    },
    {
      title: 'The Beat Sample Case',
      text: 'A producer loops an unchanged 4-second chorus hook from a hit song as the main backing track of a commercial single without clearing a license.',
      factors: {
        purpose: { label: 'Purpose and character', value: -4, reason: 'Commercial use that uses the recognizable hook for the same musical appeal rather than criticizing it.' },
        nature: { label: 'Nature of the work', value: -3, reason: 'Pop music recordings sit near the core of creative expression, with separate composition and sound-recording rights.' },
        amount: { label: 'Amount used', value: -3, reason: 'Even four seconds can weigh against fair use if it captures the qualitative "heart of the work."' },
        market: { label: 'Market effect', value: -6, reason: 'Sample licensing is an active commercial market that unauthorized looping bypasses.' }
      }
    }
  ];

  var REMIX_TOOLS = {
    crop: { className: 'is-cropped', delta: 25, note: 'Cropping changes framing and what the viewer is asked to notice.' },
    filter: { className: 'is-filtered', delta: 20, note: 'Filtering changes mood and visual language, but not necessarily meaning on its own.' },
    context: { className: 'is-contextualized', delta: 35, note: 'Adding context can make the work criticism, commentary, or scholarship instead of simple copying.' }
  };

  var scrollSvg = document.getElementById('copyrightScroll');
  var yearSlider = document.getElementById('copyrightYear');
  var durationBar = document.getElementById('copyrightDurationBar');
  var mickey = document.getElementById('copyrightMickey');
  var lawTitle = document.getElementById('copyrightLawTitle');
  var lawSummary = document.getElementById('copyrightLawSummary');
  var termChip = document.getElementById('copyrightTermChip');
  var lobbyChip = document.getElementById('copyrightLobbyChip');
  var publicDomainBadge = document.getElementById('publicDomainBadge');
  var fairUseCases = document.getElementById('fairUseCases');
  var fairUseFactors = document.getElementById('fairUseFactors');
  var fairUseCaseTitle = document.getElementById('fairUseCaseTitle');
  var fairUseCaseText = document.getElementById('fairUseCaseText');
  var fairUseNeedle = document.getElementById('fairUseNeedle');
  var fairUseVerdict = document.getElementById('fairUseVerdict');
  var fairUseReason = document.getElementById('fairUseReason');
  var remixArtwork = document.getElementById('remixArtwork');
  var remixTools = document.getElementById('remixTools');
  var remixVerdict = document.getElementById('remixVerdict');
  var remixMeterNote = document.getElementById('remixMeterNote');

  if (!yearSlider) return;

  function renderScroll() {
    scrollSvg.innerHTML =
      '<path d="M 40 96 C 180 18, 330 148, 500 86 S 820 36, 1000 92" fill="none" stroke="#c98b2e" stroke-width="8" stroke-linecap="round"></path>' +
      COPYRIGHT_STOPS.map(function (stop, index) {
        var x = 72 + index * 160;
        var y = index % 2 === 0 ? 74 : 112;
        return '<g class="folio-tl-group" data-year="' + stop.year + '"><circle class="folio-tl-node" cx="' + x + '" cy="' + y + '" r="12" fill="#286fb8" opacity="0.9"></circle>' +
          '<text class="folio-tl-text" x="' + x + '" y="' + (y - 24) + '" text-anchor="middle" font-family="Special Elite, monospace" font-size="12" fill="#44556a">' + stop.year + '</text></g>';
      }).join('');
  }

  function updateTimer() {
    var stop = COPYRIGHT_STOPS[Number(yearSlider.value)];
    yearSlider.setAttribute('aria-valuetext', stop.title);
    document.querySelectorAll('[data-stop]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === Number(yearSlider.value)));
    });
    durationBar.style.width = stop.bar + '%';
    lawTitle.textContent = stop.title;
    lawSummary.textContent = stop.summary;
    termChip.textContent = stop.termLabel;
    lobbyChip.textContent = 'Check the source for term details';
    mickey.classList.toggle('is-visible', stop.mickey);

    var publicDomainSoon = stop.bar <= 28;
    publicDomainBadge.textContent = publicDomainSoon
      ? 'Expiry allows new generations to reuse works'
      : 'Terms vary by date, authorship, and type of work';
    publicDomainBadge.classList.toggle('is-glowing', publicDomainSoon);

    scrollSvg.querySelectorAll('.folio-tl-group').forEach(function (g) {
      var isMatch = Number(g.getAttribute('data-year')) === stop.year;
      var circle = g.querySelector('.folio-tl-node');
      var text = g.querySelector('.folio-tl-text');
      var originalCy = Number(circle.getAttribute('cy'));

      if (isMatch) {
        circle.setAttribute('fill', '#c98b2e');
        circle.setAttribute('r', '18');
        text.setAttribute('fill', '#c98b2e');
        text.setAttribute('font-size', '15');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('y', originalCy - 30);
      } else {
        circle.setAttribute('fill', '#286fb8');
        circle.setAttribute('r', '12');
        text.setAttribute('fill', '#44556a');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'normal');
        text.setAttribute('y', originalCy - 24);
      }
    });
  }

  var fairCaseIndex = 0;
  var fairState = { purpose: 0, nature: 0, amount: 0, market: 0 };

  function renderFairUseCases() {
    fairUseCases.innerHTML = FAIR_USE_CASES.map(function (item, index) {
      return '<button class="folio-case-btn' + (index === fairCaseIndex ? ' is-active' : '') + '" type="button" aria-pressed="' + (index === fairCaseIndex) + '" data-case-index="' + index + '">' + item.title + '</button>';
    }).join('');

    fairUseCases.querySelectorAll('[data-case-index]').forEach(function (button) {
      button.addEventListener('click', function () {
        fairCaseIndex = Number(button.dataset.caseIndex);
        var selected = FAIR_USE_CASES[fairCaseIndex];
        Object.keys(selected.factors).forEach(function (key) {
          fairState[key] = selected.factors[key].value;
        });
        renderFairUseCases();
        renderFairUseFactors();
        updateFairUseVerdict();
      });
    });
  }

  function renderFairUseFactors() {
    var selected = FAIR_USE_CASES[fairCaseIndex];
    fairUseCaseTitle.textContent = selected.title;
    fairUseCaseText.textContent = selected.text;
    fairUseFactors.innerHTML = Object.entries(selected.factors).map(function (entry) {
      var key = entry[0];
      var factor = entry[1];
      return '<div class="folio-factor-item">' +
        '<strong>' + factor.label + '</strong>' +
        '<span>' + factor.reason + '</span>' +
        '<div class="folio-case-list">' +
          '<button class="folio-factor-btn ' + (fairState[key] >= 0 ? 'is-active' : '') + '" type="button" data-factor="' + key + '" aria-pressed="' + (fairState[key] >= 0) + '" data-value="' + Math.abs(factor.value) + '">Leans fair</button>' +
          '<button class="folio-factor-btn ' + (fairState[key] < 0 ? 'is-active' : '') + '" type="button" data-factor="' + key + '" aria-pressed="' + (fairState[key] < 0) + '" data-value="' + (-Math.abs(factor.value)) + '">Weighs against fair use</button>' +
        '</div>' +
      '</div>';
    }).join('');

    fairUseFactors.querySelectorAll('[data-factor]').forEach(function (button) {
      button.addEventListener('click', function () {
        fairState[button.dataset.factor] = Number(button.dataset.value);
        renderFairUseFactors();
        updateFairUseVerdict();
      });
    });
  }

  function updateFairUseVerdict() {
    var supporting = Object.values(fairState).filter(function (value) { return value > 0; }).length;
    fairUseNeedle.style.transform = 'rotate(' + ((2 - supporting) * 12) + 'deg)';
    fairUseVerdict.textContent = supporting === 4 ? 'Your argument favors fair use' : supporting === 0 ? 'Your argument raises concerns' : 'Your argument has mixed factors';
    fairUseReason.textContent = 'Explain which evidence matters most and why. Factors are not equally weighted; this display does not predict a court decision.';
  }

  var remixState = { crop: false, filter: false, context: false };

  function updateRemix() {
    Object.entries(REMIX_TOOLS).forEach(function (entry) {
      remixArtwork.classList.toggle(entry[1].className, remixState[entry[0]]);
    });
    remixVerdict.textContent = remixState.context ? 'A purpose to investigate: criticism' : 'A visual edit does not establish fair use';
    remixMeterNote.textContent = remixState.context
      ? 'Imagine a review analyzing how this poster persuades its audience. Why is showing it necessary? How much is needed? Could your use replace a sale or license? Criticism may support fair use, but all factors still apply.'
      : 'Cropping and filtering change appearance. They do not automatically create a different purpose. What is the new work doing with the original, and what evidence supports your answer?';
  }

  remixTools.querySelectorAll('[data-tool]').forEach(function (button) {
    button.addEventListener('click', function () {
      var tool = button.dataset.tool;
      remixState[tool] = !remixState[tool];
      button.classList.toggle('is-active', remixState[tool]);
      button.setAttribute('aria-pressed', String(remixState[tool]));
      updateRemix();
    });
  });

  document.querySelectorAll('[data-tool]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  document.getElementById('copyrightStops').innerHTML = COPYRIGHT_STOPS.map(function (stop, index) {
    return '<button type="button" class="folio-case-btn" data-stop="' + index + '">' + stop.year + '</button>';
  }).join('');
  document.querySelectorAll('[data-stop]').forEach(function (button) {
    button.addEventListener('click', function () {
      yearSlider.value = button.dataset.stop;
      updateTimer();
    });
  });
  renderScroll();
  renderFairUseCases();
  Object.keys(FAIR_USE_CASES[0].factors).forEach(function (key) {
    fairState[key] = FAIR_USE_CASES[0].factors[key].value;
  });
  renderFairUseFactors();
  updateFairUseVerdict();
  updateRemix();
  updateTimer();
  yearSlider.addEventListener('input', updateTimer);
}());
