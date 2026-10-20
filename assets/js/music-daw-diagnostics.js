/* Structured, privacy-safe diagnostic events and audio readiness checks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawDiagnostics = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function create(limit = 100) {
    const events = [];
    return {
      record(code, severity = 'notice', details = {}) {
        events.push({ code: String(code), severity, details: { ...details }, at: new Date().toISOString() });
        if (events.length > limit) events.splice(0, events.length - limit);
      },
      list() { return events.map(event => ({ ...event, details: { ...event.details } })); },
      clear() { events.length = 0; },
    };
  }
  async function permissionState(nav, name) {
    if (!nav?.permissions?.query) return 'unknown';
    try { return (await nav.permissions.query({ name })).state || 'unknown'; }
    catch (_error) { return 'unknown'; }
  }

  function latencyLabel(seconds) {
    return Number.isFinite(seconds) && seconds > 0 ? `${Math.round(seconds * 1000)} ms reported` : 'Not reported by this browser';
  }

  const rateLabel = rate => `${Number(rate).toLocaleString('en-US')} Hz`;
  const severityRank = { ready: 0, notice: 1, warning: 2, stopped: 3 };

  function sampleRateIssues(options = {}) {
    const output = Number(options.outputRate) || null;
    const input = Number(options.inputRate) || null;
    const preferred = Number(options.preferredRate) || null;
    const issues = [];
    const sourceRates = [...new Set((options.sourceRates || []).map(Number).filter(Boolean))];
    sourceRates.filter(rate => output && rate !== output).forEach(rate => issues.push({
      code: `source-rate-${rate}-${output}`, severity: 'notice', title: 'Imported audio is being converted',
      message: `${rateLabel(rate)} audio is playing in this ${rateLabel(output)} session. The browser converts it automatically.`,
      action: 'No change is usually needed. Keep the original file if you may move the project to another DAW.',
    }));
    if (input && output && input !== output) issues.push({
      code: `input-rate-${input}-${output}`, severity: 'notice', title: 'Input and output rates differ',
      message: `The microphone reports ${rateLabel(input)} while the session runs at ${rateLabel(output)}. The browser converts the recording live.`,
      action: `For the most predictable timing, set the audio interface and operating system to ${rateLabel(output)} before recording long takes.`,
    });
    if (preferred && output && preferred !== output) issues.push({
      code: `project-rate-${preferred}-${output}`, severity: 'warning', title: 'The browser did not use the project rate',
      message: `This project prefers ${rateLabel(preferred)}, but the active audio device opened at ${rateLabel(output)}.`,
      action: `Set the operating-system audio device to ${rateLabel(preferred)}, then reload Music Lab. Exports currently use ${rateLabel(output)}.`,
    });
    if ((options.captureDroppedFrames || 0) > 0) issues.push({
      code: 'capture-frames-missing', severity: 'warning', title: 'Frames were missed during recording',
      message: `${Number(options.captureDroppedFrames).toLocaleString('en-US')} input frames did not reach the take. A click or timing gap may be audible.`,
      action: 'Keep the take only if it sounds clean. Close other audio apps, use a wired device, and record it again.',
    });
    if (options.deviceChanged) issues.push({
      code: 'device-changed', severity: 'warning', title: 'The audio device changed',
      message: 'An input or output device changed while Music Lab was open. Browser routing and latency may now be different.',
      action: 'Stop playback, press Check again, and make a short test recording before continuing.',
    });
    return issues;
  }

  async function preflight(options = {}) {
    const nav = options.navigator || {};
    const context = options.context || null;
    const secure = options.secureContext !== false;
    const webAudio = options.webAudio !== false;
    const audioWorklet = !!options.audioWorklet;
    const microphoneApi = !!nav.mediaDevices?.getUserMedia;
    const microphonePermission = microphoneApi ? await permissionState(nav, 'microphone') : 'unavailable';
    const inputTrack = options.inputStream?.getAudioTracks?.()[0] || null;
    const inputSettings = inputTrack?.getSettings?.() || {};
    let level = 'ready';
    let summary = context ? 'Audio is ready.' : 'Ready when you press Play or Record.';
    if (!webAudio) { level = 'stopped'; summary = 'This browser cannot start the audio engine.'; }
    else if (!secure && microphoneApi) { level = 'warning'; summary = 'Playback is available, but microphone recording needs HTTPS.'; }
    else if (microphonePermission === 'denied') { level = 'warning'; summary = 'Playback is ready. Microphone access is blocked.'; }
    else if (context && context.state !== 'running') { level = 'notice'; summary = 'Audio is paused. Press Play to resume it.'; }
    else if (!context) level = 'notice';

    const outputRate = context?.sampleRate || null;
    const inputRate = inputSettings.sampleRate || null;
    const issues = sampleRateIssues({ ...options, outputRate, inputRate });
    issues.forEach(issue => { if (severityRank[issue.severity] > severityRank[level]) level = issue.severity; });
    if (issues.length) {
      const needsAttention = issues.some(issue => severityRank[issue.severity] >= severityRank.warning);
      summary = `${issues.length} audio ${needsAttention ? 'warning' : 'notice'}${issues.length === 1 ? '' : 's'} ${needsAttention ? 'needs attention' : 'to review'}.`;
    }
    const latency = (context?.baseLatency || 0) + (context?.outputLatency || 0);
    const items = [
      { label: 'Audio engine', value: webAudio ? (context ? context.state : 'Starts on first use') : 'Unavailable', state: webAudio ? 'ok' : 'bad' },
      { label: 'Output rate', value: outputRate ? rateLabel(outputRate) : 'Known after audio starts', state: 'neutral' },
      { label: 'WAV export rate', value: outputRate ? rateLabel(options.exportRate || outputRate) : 'Known after audio starts', state: 'neutral' },
      { label: 'Output latency', value: latencyLabel(latency), state: 'neutral' },
      { label: 'Input latency', value: inputTrack ? latencyLabel(inputSettings.latency) : 'Known after microphone permission', state: 'neutral' },
      { label: 'Microphone', value: microphonePermission === 'granted' ? 'Allowed' : microphonePermission === 'denied' ? 'Blocked in browser settings' : microphoneApi && secure ? 'Ask when you arm an audio track' : 'Unavailable', state: microphonePermission === 'denied' ? 'bad' : 'neutral' },
      { label: 'Input format', value: inputTrack ? `${inputSettings.sampleRate ? `${inputSettings.sampleRate.toLocaleString('en-US')} Hz, ` : ''}${inputSettings.channelCount || 1} channel${inputSettings.channelCount === 1 ? '' : 's'}` : 'Known after microphone permission', state: 'neutral' },
      { label: 'Recorder', value: audioWorklet && secure ? 'Ready' : 'Not supported here', state: audioWorklet && secure ? 'ok' : 'bad' },
      { label: 'MIDI keyboard', value: nav.requestMIDIAccess ? 'Supported' : 'Not supported by this browser', state: nav.requestMIDIAccess ? 'ok' : 'neutral' },
      { label: 'Browser plugins', value: options.wam ? 'Local host ready' : 'Host unavailable', state: options.wam ? 'ready' : 'neutral' },
      { label: 'Computer VST bridge', value: options.nativeBridge ? 'Connected' : 'Not connected', state: 'neutral' },
    ];
    const noticeLabel = issues.length ? 'Rate notice' : 'Audio setup';
    return { level, label: { ready: 'Ready', notice: noticeLabel, warning: 'Check audio', stopped: 'Audio stopped' }[level], summary, items, issues };
  }

  return { create, preflight, latencyLabel, sampleRateIssues };
}));
