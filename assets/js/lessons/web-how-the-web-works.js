// How the Web Works: URL anatomy, the request trip, packets, and the quiz.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------- Lab 1: URL anatomy
  const urlInput = $('url-input');
  if (urlInput) {
    const parts = $('url-parts');
    const feedback = $('url-feedback');
    const render = () => {
      const raw = urlInput.value.trim();
      let u;
      try { u = new URL(raw); } catch {
        parts.innerHTML = '';
        feedback.textContent = /\s/.test(raw)
          ? 'Addresses cannot contain spaces. Browsers send a space as %20, so a file named "my page.html" becomes my%20page.html. Name files without spaces.'
          : 'That is not a complete address yet. Start with https:// and a domain, such as https://example.com/.';
        return;
      }
      const rows = [
        ['Scheme', u.protocol.replace(':', ''), 'hw-scheme', u.protocol === 'https:'
          ? 'Your browser. https means: open an encrypted connection first.'
          : u.protocol === 'http:' ? 'Your browser. Plain http: anyone along the route can read or change the page, and browsers mark it "Not secure".'
            : 'Your browser. This is not a web page address.'],
        ['Domain', u.hostname, 'hw-domain', 'DNS. This is the only part used to find the server’s IP address.' + (u.hostname.endsWith('github.io') ? ' github.io sites are all served by GitHub’s servers.' : '')],
        u.port ? ['Port', u.port, 'hw-port', 'Your browser and the server: which "door" on that computer to knock on. Normally hidden: 443 for https, 80 for http.'] : null,
        ['Path', u.pathname, 'hw-path', u.pathname === '/' ? 'The server. Just "/" asks for the folder’s default file, usually index.html.' : 'The server. It looks for a file at this path, letter for letter. Capitals matter.'],
        u.search ? ['Query', u.search, 'hw-query', 'The server or the page’s JavaScript: extra settings, as name=value pairs joined with &.'] : null,
        u.hash ? ['Fragment', u.hash, 'hw-fragment', 'Only your browser. It scrolls to the element with id="' + u.hash.slice(1) + '". Never sent to the server.'] : null
      ].filter(Boolean);
      parts.innerHTML = rows.map(([name, value, cls, who]) =>
        `<li class="${cls}"><span class="hw-part-name">${name}</span><code>${esc(value)}</code><span class="hw-part-who">${esc(who)}</span></li>`).join('');
      feedback.textContent = `${rows.length} parts. DNS will look up "${u.hostname}"; the server will be asked for "${u.pathname}${u.search}".`
        + (/\s/.test(raw) ? ' Notice the space became %20: addresses cannot contain spaces, so name your files without them.' : '');
    };
    urlInput.addEventListener('input', render);
    document.querySelectorAll('[data-url-example]').forEach((b) => b.addEventListener('click', () => { urlInput.value = b.dataset.urlExample; render(); }));
    render();
  }

  // ---------------------------------------------------------------- Lab 2: the trip
  const stepBox = $('trip-step');
  if (stepBox) {
    const wire = $('trip-wire');
    const waterfall = $('trip-waterfall');
    const count = $('trip-count');
    const host = 'maya-codes.github.io';
    const ip = '185.199.108.153';
    const files = [['index.html', '4.1 KB'], ['style.css', '2.3 KB'], ['script.js', '1.8 KB'], ['images/orbit.png', '86 KB']];

    const scenarios = {
      normal: () => [
        { at: 'browser', title: 'You press Enter', text: `The browser reads the address. The scheme is https, so it will need a secure connection, and the domain is ${host}. First it checks its own memory: has it looked this name up recently? No.`, wire: `https://${host}/` },
        { at: 'dns', title: 'DNS lookup: name → number', text: `The browser asks a DNS resolver (usually run by your school or internet provider) for ${host}’s IP address. If the resolver doesn’t know, it asks the servers for .io, then GitHub’s own name servers.`, wire: `Q: What is the address of ${host}?\nA: ${host}  →  ${ip}` },
        { at: 'server', title: 'Connect and lock the line (TLS)', text: `The browser opens a connection to ${ip} on port 443. The server shows a certificate proving it really is ${host}, and the two agree on a secret key. From here on, everything is encrypted. This is the padlock.`, wire: 'ClientHello  →\n             ←  ServerHello + certificate for *.github.io\nKey agreed. Connection encrypted. 🔒' },
        { at: 'server', title: 'Ask for the page (HTTP request)', text: 'Inside the encrypted line, the browser sends a short text message: the method (GET), the path, and some headers saying who is asking and what it can read.', wire: `GET / HTTP/2\nHost: ${host}\nAccept: text/html\nUser-Agent: Mozilla/5.0 (your browser)`, file: 0 },
        { at: 'browser', title: 'The server replies', text: 'The server finds index.html and sends it back with a status code (200: OK) and headers describing the file.', wire: 'HTTP/2 200\ncontent-type: text/html; charset=utf-8\ncontent-length: 4198\ncache-control: max-age=600\n\n<!doctype html>\n<html lang="en"> …', status: [0, 200] },
        { at: 'server', title: 'The HTML asks for more files', text: 'While reading the HTML, the browser finds <link href="style.css">, <script src="script.js"> and an <img>. Each one is a new request on the same connection.', wire: 'GET /style.css HTTP/2\nGET /script.js HTTP/2\nGET /images/orbit.png HTTP/2', file: [1, 2, 3] },
        { at: 'browser', title: 'Everything arrives; the page appears', text: 'Each file comes back with 200. The browser applies the CSS, runs the JavaScript, draws the image, and paints the page. Four requests, about a second.', wire: 'HTTP/2 200  style.css\nHTTP/2 200  script.js\nHTTP/2 200  images/orbit.png\n\n✔ Page rendered', status: [[1, 200], [2, 200], [3, 200]] }
      ],
      cached: () => [
        { at: 'browser', title: 'You come back an hour later', text: `The browser still remembers ${host}’s IP address from last time, so it skips DNS completely.`, wire: `${host}  →  ${ip}  (remembered)` },
        { at: 'server', title: 'Ask: has anything changed?', text: 'The HTML’s cache time ran out, so the browser asks again, but adds a note: "I have a copy from this time; only send it if it changed."', wire: `GET / HTTP/2\nHost: ${host}\nIf-Modified-Since: Tue, 20 Oct 2026 14:02:11 GMT`, file: 0 },
        { at: 'browser', title: '304: use your copy', text: 'Nothing changed, so the server sends no file at all, just "304 Not Modified". The images and CSS are still fresh in the cache and are not requested.', wire: 'HTTP/2 304\n(no body: use the copy you have)', status: [0, 304], cache: [1, 2, 3] },
        { at: 'browser', title: 'Why your edit "didn’t show up"', text: 'This is why a change you just published can look missing: your browser is showing its saved copy. A hard reload (Ctrl+Shift+R or Cmd+Shift+R) asks for every file again.', wire: '✔ Page rendered from cache in a few milliseconds' }
      ],
      domain: () => [
        { at: 'browser', title: 'You press Enter', text: 'The address has a typo: mayacodes.github.io instead of maya-codes.github.io. The browser can’t tell; it only knows it needs this name’s number.', wire: 'https://mayacodes.github.io/' },
        { at: 'dns', title: 'DNS: no such name', text: 'The resolver asks around, but nobody has that exact name registered. It replies NXDOMAIN: "non-existent domain".', wire: 'Q: What is the address of mayacodes.github.io?\nA: NXDOMAIN (no such name)', fail: true },
        { at: 'browser', title: '"This site can’t be reached"', text: 'Without an IP address there is nobody to send a request to. No server ever hears about it, so there is no 404 either: the trip stopped at step two. Check the spelling of the domain.', wire: 'DNS_PROBE_FINISHED_NXDOMAIN', fail: true }
      ],
      file: () => {
        const s = scenarios.normal().slice(0, 6);
        s[5] = { ...s[5], text: 'The HTML names <link href="Style.css"> with a capital S, but the real file is style.css. On your laptop that might have worked. The server compares names letter for letter.', wire: 'GET /Style.css HTTP/2\nGET /script.js HTTP/2\nGET /images/orbit.png HTTP/2', file: [1, 2, 3], rename: [1, 'Style.css'] };
        s.push({ at: 'browser', title: 'A 404 for the stylesheet', text: 'DNS worked, the connection worked, the HTML arrived. Only one file is missing, so the page still shows, but as plain black text on white. Match the name in the HTML to the real file.', wire: 'HTTP/2 404  Style.css   ← not found\nHTTP/2 200  script.js\nHTTP/2 200  images/orbit.png', status: [[1, 404], [2, 200], [3, 200]], fail: true });
        return s;
      },
      http: () => [
        { at: 'browser', title: 'You type http:// (no s)', text: 'The browser will connect without encryption, on port 80.', wire: `http://${host}/` },
        { at: 'dns', title: 'DNS lookup', text: 'DNS works exactly the same: the name becomes a number.', wire: `${host}  →  ${ip}` },
        { at: 'server', title: 'An unencrypted request', text: 'The request goes out as readable text. Anyone on the same Wi-Fi, or any network along the route, could read it or change the reply.', wire: `GET / HTTP/1.1\nHost: ${host}`, file: 0, fail: true },
        { at: 'browser', title: '301: go to https instead', text: 'GitHub Pages (with "Enforce HTTPS" on) won’t send the page over plain http. It answers 301 Moved Permanently, pointing at the https address, and the browser starts the trip again securely.', wire: `HTTP/1.1 301 Moved Permanently\nLocation: https://${host}/`, status: [0, 301] },
        { at: 'browser', title: 'Back on the secure path', text: 'From here the trip is the normal one, with the padlock. Sites that don’t redirect show "Not secure" in the address bar.', wire: '→ restart with https:// 🔒' }
      ]
    };

    let mode = 'normal';
    let steps = scenarios.normal();
    let i = 0;

    const render = () => {
      const s = steps[i];
      count.textContent = `Step ${i + 1} of ${steps.length}`;
      stepBox.className = 'hw-step' + (s.fail ? ' hw-fail' : '');
      stepBox.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>`;
      wire.textContent = s.wire;
      document.querySelectorAll('#trip-lab .hw-node').forEach((n) => n.classList.toggle('hw-active', n.dataset.node === s.at));
      // Rebuild the waterfall from all steps up to this one.
      const rows = new Map();
      const names = files.map((f) => f[0]);
      steps.slice(0, i + 1).forEach((st) => {
        if (st.rename) names[st.rename[0]] = st.rename[1];
        [].concat(st.file ?? []).forEach((f) => rows.set(f, { name: names[f], size: files[f][1], status: '…' }));
        [].concat(st.cache ?? []).forEach((f) => rows.set(f, { name: names[f], size: files[f][1], status: 'cache' }));
        const sts = st.status ? (Array.isArray(st.status[0]) ? st.status : [st.status]) : [];
        sts.forEach(([f, code]) => { if (rows.has(f)) rows.get(f).status = code; });
      });
      waterfall.innerHTML = [...rows.values()].map((r) =>
        `<li class="hw-req hw-s${String(r.status)[0]}"><code>${esc(r.name)}</code><span>${r.size}</span><strong>${r.status}</strong></li>`).join('');
      $('trip-prev').disabled = i === 0;
      $('trip-next').disabled = i === steps.length - 1;
    };

    document.querySelectorAll('input[name="trip-mode"]').forEach((r) => r.addEventListener('change', () => {
      mode = r.value; steps = scenarios[mode](); i = 0; render();
    }));
    $('trip-next').addEventListener('click', () => { if (i < steps.length - 1) { i++; render(); } });
    $('trip-prev').addEventListener('click', () => { if (i > 0) { i--; render(); } });
    $('trip-reset').addEventListener('click', () => { i = 0; render(); });
    render();
  }

  // ---------------------------------------------------------------- Packets
  const send = $('packet-send');
  if (send) {
    const run = () => {
      const msg = $('packet-input').value || 'Hello';
      const size = Math.max(3, Math.ceil(msg.length / 6));
      const packets = [];
      for (let k = 0, n = 1; k < msg.length; k += size, n++) packets.push({ n, data: msg.slice(k, k + size) });
      const order = packets.slice();
      for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
      const lost = $('packet-lose').checked && order.length > 1 ? order[Math.floor(Math.random() * order.length)].n : null;
      const total = packets.length;
      $('packet-arrived').innerHTML = order.map((p) => p.n === lost
        ? `<li class="hw-lost">#${p.n} of ${total}<span>lost</span></li>`
        : `<li>#${p.n} of ${total}<span>${esc(p.data.replace(/ /g, ' '))}</span></li>`).join('');
      const rebuilt = packets.map((p) => p.n === lost ? `[#${p.n} missing]` : p.data).join('');
      $('packet-rebuilt').textContent = lost
        ? `${rebuilt}  → Packet #${lost} never arrived, so your computer asks for it again. The message is complete only when every number from 1 to ${total} is there.`
        : `${rebuilt}  ✔ All ${total} packets arrived out of order and were put back by number.`;
    };
    send.addEventListener('click', run);
    run();
  }

  // ---------------------------------------------------------------- Quiz
  document.querySelectorAll('.hw-q').forEach((q) => {
    const fb = q.querySelector('.web-feedback');
    q.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => {
      const right = b.dataset.choice === q.dataset.answer;
      q.querySelectorAll('[data-choice]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fb.textContent = (right ? 'Yes. ' : 'Not quite. ') + fb.dataset.why;
      fb.classList.toggle('hw-right', right);
    }));
  });
})();
