/* Browser client for the optional loopback-only Music Lab VST companion. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicVstBridge = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const DEFAULT_URL = 'http://127.0.0.1:4777';
  function endpoint(value = DEFAULT_URL) {
    const url = new URL(value);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new Error('The VST companion must use a local loopback address.');
    }
    return url.origin;
  }
  function createClient(options = {}) {
    const base = endpoint(options.baseUrl);
    const request = options.fetch || globalThis.fetch;
    let token = String(options.token || '');
    async function call(path, init = {}) {
      const headers = { Accept: 'application/json', ...(init.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await request(`${base}${path}`, { ...init, headers });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Companion returned ${response.status}`);
      return body;
    }
    return {
      baseUrl: base, setToken(value) { token = String(value || '').trim(); },
      health: () => call('/v1/health'), plugins: () => call('/v1/plugins'),
      readiness: () => call('/v1/readiness'), launches: () => call('/v1/launches'),
      launch: id => call(`/v1/plugins/${encodeURIComponent(id)}/launch`, { method: 'POST' }),
    };
  }
  return { DEFAULT_URL, endpoint, createClient };
}));
