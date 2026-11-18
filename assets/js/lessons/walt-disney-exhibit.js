(() => {
  'use strict';

  const exhibit = document.querySelector('#wd-exhibit');
  if (!exhibit) return;
  const get = name => exhibit.querySelector('#wd-' + name);
  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

  const video = get('reel-video');
  const seek = get('reel-seek');
  const reelPlay = get('reel-play');
  const filmRate = 24;
  const finalFrame = Number(seek.max);
  let reelFrame = 0;
  let pendingFrame = null;
  let reelTick = null;
  const strip = Array.from({ length: 7 }, () => {
    const button = document.createElement('button');
    const thumb = document.createElement('span');
    thumb.className = 'wd-film-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    button.type = 'button';
    button.append(thumb, label);
    button.addEventListener('click', () => jumpReel(Number(button.dataset.frame)));
    get('filmstrip').append(button);
    return { button, thumb, label };
  });

  function showFilmFrame(index) {
    reelFrame = clamp(index, 0, finalFrame);
    get('reel-count').value = 'Frame ' + (reelFrame + 1) + ' / ' + (finalFrame + 1) +
      ' · ' + (reelFrame / filmRate).toFixed(2) + ' s';
    seek.value = reelFrame;
    seek.setAttribute('aria-valuetext', 'Frame ' + (reelFrame + 1) + ' of ' + (finalFrame + 1));
    get('reel-back').disabled = reelFrame === 0;
    get('reel-next').disabled = reelFrame === finalFrame;
    strip.forEach(({ button, thumb, label }, slot) => {
      const frame = reelFrame + slot - 3;
      const outside = frame < 0 || frame > finalFrame;
      button.disabled = outside;
      button.setAttribute('aria-disabled', String(outside));
      if (outside) return;
      button.dataset.frame = frame;
      button.setAttribute('aria-label', 'Film frame ' + (frame + 1));
      button.setAttribute('aria-current', String(frame === reelFrame));
      thumb.style.backgroundPosition = ((frame % 24) / 23 * 100) + '% ' + (Math.floor(frame / 24) / 13 * 100) + '%';
      label.textContent = frame + 1;
    });
  }

  function applyFilmSeek() {
    if (pendingFrame === null || video.readyState < 1) return;
    // Seek to the middle of the sample so timestamp rounding cannot select its neighbor.
    video.currentTime = (pendingFrame + 0.5) / filmRate;
    pendingFrame = null;
  }

  function jumpReel(index) {
    video.pause();
    showFilmFrame(index);
    pendingFrame = reelFrame;
    if (video.readyState < 1) video.preload = 'metadata';
    applyFilmSeek();
  }

  function tickReel(_, metadata) {
    reelTick = null;
    if (video.paused || video.ended) return;
    const position = metadata?.mediaTime ?? video.currentTime;
    const index = clamp(Math.floor(position * filmRate + 0.0001), 0, finalFrame);
    if (index !== reelFrame) showFilmFrame(index);
    queueReelTick();
  }

  function queueReelTick() {
    if (reelTick !== null) return;
    reelTick = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tickReel) : requestAnimationFrame(tickReel);
  }

  function reelError() {
    const status = get('reel-status');
    status.hidden = false;
    status.textContent = 'The reel could not play. You can still inspect the frame thumbnails below.';
  }

  video.addEventListener('loadedmetadata', applyFilmSeek);
  video.addEventListener('error', reelError);
  video.addEventListener('playing', () => {
    stopSound();
    reelPlay.textContent = 'Pause reel';
    queueReelTick();
  });
  video.addEventListener('pause', () => { reelPlay.textContent = 'Play reel'; });
  video.addEventListener('ended', () => showFilmFrame(finalFrame));
  reelPlay.addEventListener('click', () => {
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.ended || reelFrame === finalFrame) jumpReel(0);
    video.play().catch(error => { if (error.name !== 'AbortError') reelError(); });
  });
  seek.addEventListener('input', () => jumpReel(Number(seek.value)));
  get('reel-back').addEventListener('click', () => jumpReel(reelFrame - 1));
  get('reel-next').addEventListener('click', () => jumpReel(reelFrame + 1));
  get('reel-slow').addEventListener('change', event => {
    video.playbackRate = event.target.checked ? 0.5 : 1;
  });
  showFilmFrame(0);

  const canvas = get('optical-track');
  const pitch = get('pitch');
  const level = get('level');
  const lamp = get('lamp');
  const read = get('read');
  const soundStatus = get('sound-status');
  const sampleRate = 22050;
  const magnifiedSeconds = .014;
  let track = createTrack(440, .7);
  let exposedPitch = 440;
  let exposedLevel = 70;
  let audio = null;
  let source = null;
  let amplifier = null;
  let readStarted = 0;
  let filmAnimation = null;
  let exposureStarted = null;

  // Store the clear width of the exposed track, as a value from 0 to 255 at each position.
  function createTrack(frequency, amplitude) {
    return Uint8Array.from({ length: sampleRate * 2 }, (_, index) => {
      const envelope = Math.min(1, index / 230, (sampleRate * 2 - 1 - index) / 385);
      const signal = amplitude * envelope * Math.sin(2 * Math.PI * frequency * index / sampleRate);
      return Math.round(128 + 100 * signal);
    });
  }

  function drawTrack(ctx, width, height, now = performance.now()) {
    ctx.fillStyle = '#10191c';
    ctx.fillRect(0, 0, width, height);
    const margin = 14;
    const length = Math.max(1, width - margin * 2);
    const middle = height * .54;
    const band = height * .38;
    const progress = exposureStarted === null ? 1 : clamp((now - exposureStarted) / 780, 0, 1);
    ctx.fillStyle = '#33454a';
    ctx.fillRect(margin, middle, length, band / 2);
    ctx.beginPath();
    ctx.moveTo(margin, middle + band / 2);
    for (let x = 0; x < length * progress; x++) {
      const index = Math.floor(sampleRate * (.025 + magnifiedSeconds * x / length));
      ctx.lineTo(margin + x, middle + band / 2 - band * track[index] / 255);
    }
    ctx.lineTo(margin + length * progress, middle + band / 2);
    ctx.closePath();
    ctx.fillStyle = '#f3efdf';
    ctx.fill();
    ctx.fillStyle = '#c4d0ce';
    ctx.font = '12px system-ui';
    ctx.fillText('Clear width on film', margin, 22);
    if (source) {
      const position = clamp((audio.currentTime - readStarted) / 2, 0, 1);
      const x = margin + position * length;
      ctx.fillStyle = lamp.checked ? '#ffd27d' : '#819297';
      ctx.fillRect(x, middle - band / 2 - 6, 2, band + 12);
      ctx.fillText(lamp.checked ? 'Reader slit · light reaches sensor' : 'Reader slit · lamp off', margin, height - 9);
    } else {
      ctx.fillText('Film travel →', margin, height - 9);
    }
  }

  const soundScreen = SimKit.canvas2d(canvas, { height: 112, onResize: drawTrack });
  function animateTrack(now) {
    filmAnimation = null;
    drawTrack(soundScreen.ctx, soundScreen.width, soundScreen.height, now);
    if (exposureStarted !== null && now - exposureStarted >= 780) {
      exposureStarted = null;
      read.disabled = false;
      soundStatus.textContent = 'Track exposed at ' + exposedPitch + ' Hz and ' + exposedLevel + '% level. Read it with the lamp.';
    }
    if (source || exposureStarted !== null) filmAnimation = requestAnimationFrame(animateTrack);
  }

  function refreshTrack() {
    if (filmAnimation === null) filmAnimation = requestAnimationFrame(animateTrack);
  }

  function stopSound() {
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source = null;
    }
    read.textContent = 'Read with lamp';
    refreshTrack();
  }

  function updateSignal() {
    get('pitch-label').value = pitch.value + ' Hz';
    get('level-label').value = level.value + '%';
  }

  pitch.addEventListener('input', updateSignal);
  level.addEventListener('input', updateSignal);
  get('expose').addEventListener('click', () => {
    stopSound();
    exposedPitch = Number(pitch.value);
    exposedLevel = Number(level.value);
    track = createTrack(exposedPitch, exposedLevel / 100);
    exposureStarted = matchMedia('(prefers-reduced-motion: reduce)').matches ? performance.now() - 780 : performance.now();
    read.disabled = true;
    soundStatus.textContent = 'The recording light changes the width of the exposed strip as the film moves.';
    refreshTrack();
  });

  read.addEventListener('click', async () => {
    if (source) {
      stopSound();
      soundStatus.textContent = 'Playback stopped.';
      return;
    }
    video.pause();
    read.disabled = true;
    try {
      if (!audio) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        audio = new Audio();
        amplifier = audio.createGain();
        amplifier.connect(audio.destination);
      }
      await audio.resume();
      if (document.hidden || exposureStarted !== null || !video.paused) return;
      const signal = audio.createBuffer(1, track.length, sampleRate);
      const output = signal.getChannelData(0);
      // A light sensor measures the transmitted fraction; subtract the steady baseline.
      for (let i = 0; i < track.length; i++) output[i] = (track[i] - 128) / 128;
      amplifier.gain.value = lamp.checked ? .32 : 0;
      source = audio.createBufferSource();
      source.buffer = signal;
      source.connect(amplifier);
      source.onended = () => {
        source.disconnect();
        source = null;
        read.textContent = 'Read with lamp';
        soundStatus.textContent = 'Playback complete. Change pitch and expose a new track to compare the spacing.';
        refreshTrack();
      };
      readStarted = audio.currentTime;
      source.start();
      read.textContent = 'Stop playback';
      soundStatus.textContent = lamp.checked ? 'Light through the film varies with the track’s width. The sensor turns that variation back into sound.' : 'The film is moving, but the lamp is off. Turn it on to hear the track.';
      refreshTrack();
    } catch {
      soundStatus.textContent = 'Audio playback is unavailable in this browser. You can still expose and inspect the track.';
    } finally {
      read.disabled = exposureStarted !== null;
    }
  });

  lamp.addEventListener('change', () => {
    if (amplifier) amplifier.gain.setTargetAtTime(lamp.checked ? .32 : 0, audio.currentTime, .01);
    if (source) soundStatus.textContent = lamp.checked
      ? 'Lamp on. Changing light at the sensor produces sound.'
      : 'Lamp off. No light reaches the sensor, so the speaker is silent.';
    refreshTrack();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    video.pause();
    stopSound();
  });
})();
