/* Measured passages keep the flag unobscured and the words stationary. */
(() => {
  'use strict';
  const stage = document.getElementById('pledgeStage');
  if (!stage) return;
  const text = document.getElementById('pledgeCrawl');
  const status = document.getElementById('presentationStatus');
  const progress = document.getElementById('pledgeProgress');
  const progressBar = progress.parentElement;
  const play = document.getElementById('btnPlay');
  const pause = document.getElementById('btnPause');
  const restart = document.getElementById('btnRestart');
  const mute = document.getElementById('btnMute');
  const motion = document.getElementById('btnMotion');
  const fullscreen = document.getElementById('btnFullscreen');
  const presentation = document.getElementById('presentation');
  const audio = document.getElementById('patrioticAudio');
  const audioStatus = document.getElementById('audioStatus');
  const volume = document.getElementById('volumeControl');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const passages = [
    'I pledge allegiance to the Flag of the United States of America,',
    'and to the Republic for which it stands,',
    'one Nation under God, indivisible,',
    'with liberty and justice for all.'
  ];
  // Give the longer opening passage more time; total presentation is 28 seconds.
  const ends = [9, 16, 22, 28];
  let elapsed = 0;
  let passage = -1;
  let loop;
  let musicEnabled = false;
  let stageVisible = true;
  audio.volume = .4;
  audio.muted = true;

  function setFlagMotion(paused) {
    stage.dataset.motion = paused ? 'paused' : 'playing';
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? 'Resume flag' : 'Pause flag';
  }
  setFlagMotion(reducedMotion.matches);
  reducedMotion.addEventListener('change', event => setFlagMotion(event.matches));
  motion.addEventListener('click', () => setFlagMotion(stage.dataset.motion !== 'paused'));
  document.getElementById('windMode').addEventListener('change', event => {
    stage.dataset.wind = event.target.value;
  });

  function playMusic() {
    if (!musicEnabled || audio.error || document.hidden || !stageVisible) return;
    audio.play().catch(() => {
      audioStatus.textContent = 'Music could not start. Select Enable music to try again; the presentation can continue silently.';
      musicEnabled = false;
      audio.muted = true;
      mute.textContent = 'Enable music';
      mute.setAttribute('aria-pressed', 'true');
    });
  }
  function updatePassage() {
    const index = Math.min(ends.findIndex(end => elapsed < end), passages.length - 1);
    if (index < 0 || index === passage) return;
    passage = index;
    text.textContent = passages[index];
    text.classList.remove('passage-enter');
    void text.offsetWidth;
    text.classList.add('passage-enter');
    status.textContent = `Passage ${index + 1} of ${passages.length}`;
  }
  function setProgress(value) {
    progress.style.width = `${value}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(value)));
  }
  function start(reset = false) {
    if (reset || stage.dataset.crawl === 'finished') {
      elapsed = 0;
      passage = -1;
      audio.currentTime = 0;
      setProgress(0);
    }
    stage.dataset.crawl = 'playing';
    updatePassage();
    status.textContent = `Passage ${passage + 1} of ${passages.length}`;
    play.disabled = true;
    pause.disabled = false;
    pause.textContent = 'Pause';
    loop.resume();
    playMusic();
  }
  loop = SimKit.loop(dt => {
    if (stage.dataset.crawl !== 'playing') return;
    elapsed = Math.min(28, elapsed + dt);
    setProgress(elapsed / 28 * 100);
    if (elapsed < 28) updatePassage();
    else {
      stage.dataset.crawl = 'finished';
      status.textContent = 'Presentation complete. Take a moment to reflect.';
      play.disabled = false;
      pause.disabled = true;
      pause.textContent = 'Pause';
      audio.pause();
      loop.pause();
    }
  }, { el: stage, maxDt: .25 });
  loop.pause();
  play.addEventListener('click', () => start());
  restart.addEventListener('click', () => start(true));
  pause.addEventListener('click', () => {
    if (stage.dataset.crawl === 'paused') { start(); return; }
    stage.dataset.crawl = 'paused';
    pause.textContent = 'Resume';
    status.textContent = `Paused · Passage ${passage + 1} of ${passages.length}`;
    audio.pause();
    loop.pause();
  });
  mute.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    audio.muted = !musicEnabled;
    mute.textContent = musicEnabled ? 'Mute music' : 'Enable music';
    mute.setAttribute('aria-pressed', String(!musicEnabled));
    if (musicEnabled && stage.dataset.crawl === 'playing') playMusic();
    else if (!musicEnabled) audio.pause();
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    document.getElementById('volumeValue').textContent = `${volume.value}%`;
  });
  audio.addEventListener('error', () => {
    audioStatus.textContent = 'The optional music is unavailable. The presentation can continue silently.';
    mute.disabled = true;
    volume.disabled = true;
  });
  new IntersectionObserver(entries => {
    stageVisible = entries[0].isIntersecting;
    if (!stageVisible) audio.pause();
    else if (stage.dataset.crawl === 'playing') playMusic();
  }).observe(stage);
  new MutationObserver(() => {
    const unavailable = stage.dataset.renderer === 'fallback';
    motion.disabled = unavailable;
    document.getElementById('windMode').disabled = unavailable;
    if (unavailable) motion.textContent = 'Still flag';
  }).observe(stage, { attributes: true, attributeFilter: ['data-renderer'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
    else if (stage.dataset.crawl === 'playing') playMusic();
  });
  let expandedInert = [];
  let originalOverflow = '';
  function setExpanded(expanded) {
    presentation.classList.toggle('presentation-expanded', expanded);
    fullscreen.textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
    if (expanded) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const main = document.getElementById('main');
      expandedInert = [...document.body.children, ...main.children]
        .filter(el => el !== main && el !== presentation && !el.inert && !['SCRIPT', 'STYLE'].includes(el.tagName));
      expandedInert.forEach(el => { el.inert = true; });
      fullscreen.focus();
    } else {
      document.body.style.overflow = originalOverflow;
      expandedInert.forEach(el => { el.inert = false; });
      expandedInert = [];
    }
  }
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (presentation.requestFullscreen) await presentation.requestFullscreen();
      else {
        setExpanded(!presentation.classList.contains('presentation-expanded'));
      }
    } catch {
      status.textContent = 'Fullscreen is unavailable. You can still present in this window.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && presentation.classList.contains('presentation-expanded')) {
      setExpanded(false);
      fullscreen.focus();
    }
  });
})();
