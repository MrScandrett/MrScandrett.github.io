// "Be the server": how a simple static file server (Live Server, `npx serve`,
// `python3 -m http.server`, GitHub Pages) turns a requested URL into a file.
// Pure and DOM-free so tests/web-local-server.test.mjs can check every rule.

export const CONTENT_TYPES = {
  html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon',
  txt: 'text/plain', md: 'text/markdown', mp3: 'audio/mpeg', mp4: 'video/mp4',
  woff2: 'font/woff2',
};

export function contentType(path) {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase();
  return (ext && CONTENT_TYPES[ext]) || 'application/octet-stream';
}

// One file per line; tolerate "./", backslashes, leading slashes and blank lines.
export function parseFileList(text) {
  return String(text).split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/').replace(/^\.?\/+/, ''))
    .filter((line) => line && !line.endsWith('/'));
}

export function splitUrl(input, base = 'http://localhost:8080/') {
  const raw = String(input).trim();
  let url;
  try { url = new URL(raw || '/', base); } catch { return null; }
  return {
    href: url.href,
    scheme: url.protocol.replace(/:$/, ''),
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : ''),
    path: url.pathname,
    query: url.search,
    hash: url.hash,
  };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Resolve a request the way a static file server would.
 * @param {object} o
 * @param {string} o.url            what was typed in the address bar
 * @param {string[]} o.files        files in the folder the server was started in
 * @param {boolean} [o.caseSensitive=true]  Linux hosts (GitHub Pages) are; most laptops are not
 * @returns {{ parts, status, file?, location?, listing?, type?, steps: string[], hint?: string }}
 */
export function resolveRequest({ url, files, caseSensitive = true }) {
  const parts = splitUrl(url);
  const steps = [];
  if (!parts) return { parts: null, status: null, steps: ['That is not an address a browser can read.'] };

  if (parts.scheme === 'file') {
    return { parts, status: null, steps: [
      'file:// means no server at all: the browser opens the file straight from your disk.',
      'Pages work, but fetch(), JavaScript modules and service workers are blocked, and a path that starts with / means the top of your whole drive.',
    ], hint: 'Start a server in your project folder and open the http://localhost address it prints.' };
  }
  if (parts.scheme !== 'http' && parts.scheme !== 'https') {
    return { parts, status: null, steps: [`A web server answers http and https requests, not ${parts.scheme}:.`] };
  }
  if (!LOCAL_HOSTS.has(parts.host)) {
    steps.push(`${parts.host} is another computer. Your local server only answers for localhost (this computer); here we pretend it is yours.`);
  } else {
    steps.push(`${parts.host} means this computer. Port ${parts.port} picks which program on it answers: your server.`);
  }
  if (parts.query) steps.push(`The query ${parts.query} is ignored by a static server; only JavaScript on the page can read it.`);
  if (parts.hash) steps.push(`The ${parts.hash} part never reaches the server. The browser keeps it to scroll the page.`);

  let path;
  try { path = decodeURIComponent(parts.path); } catch { path = parts.path; }
  path = path.replace(/^\/+/, '');
  if (parts.path.includes('%20')) steps.push('%20 in an address is a space. Spaces work, but they make addresses ugly and easy to break; use hyphens.');

  const list = files.slice();
  const exact = new Set(list);
  const lower = new Map(list.map((f) => [f.toLowerCase(), f]));
  const find = (p) => {
    if (exact.has(p)) return { file: p, caseOnly: false };
    const other = lower.get(p.toLowerCase());
    if (other) return caseSensitive ? { file: null, near: other } : { file: other, caseOnly: true };
    return { file: null };
  };
  const isDir = (dir) => list.some((f) => (caseSensitive ? f.startsWith(dir) : f.toLowerCase().startsWith(dir.toLowerCase())));

  const found = (file, why) => {
    steps.push(why);
    return { parts, status: 200, file, type: contentType(file), steps };
  };
  const missing = (extra) => {
    const hint = extra || topLevelHint(path, list);
    steps.push(`Nothing at ${path || '/'} in the folder the server was started in. The answer is 404 Not Found.`);
    return { parts, status: 404, steps, ...(hint ? { hint } : {}) };
  };

  if (path === '' || path.endsWith('/')) {
    const index = find(`${path}index.html`);
    steps.push(`${path ? `/${path}` : '/'} names a folder, so the server looks for ${path}index.html inside it.`);
    if (index.file) return found(index.file, `Found ${index.file}. It is sent as ${contentType(index.file)}.`);
    if (index.near) return missing(`There is a file named ${index.near}, but the name must be exactly index.html in lower case.`);
    if (path === '' || isDir(path)) {
      steps.push('No index.html here. Live Server, serve and Python show a list of the files instead; GitHub Pages shows 404.');
      const listing = list.filter((f) => f.startsWith(path)).map((f) => f.slice(path.length).split('/')[0]);
      return { parts, status: 200, listing: [...new Set(listing)], type: 'text/html', steps,
        hint: path === '' ? 'Your home page must be called index.html and sit at the top of the folder you serve.' : undefined };
    }
    return missing();
  }

  const hit = find(path);
  if (hit.file && hit.caseOnly) {
    steps.push(`You asked for ${path}; the file is called ${hit.file}. This laptop ignores capital letters, so it is sent anyway.`);
    return { parts, status: 200, file: hit.file, type: contentType(hit.file), steps,
      hint: `On GitHub Pages this is a 404. Make the address and the filename match exactly: ${hit.file}.` };
  }
  if (hit.file) return found(hit.file, `Found ${hit.file}. It is sent as ${contentType(hit.file)}.`);
  if (hit.near) return missing(`There is a file named ${hit.near}. A case-sensitive server treats it as a different file. Make the names match exactly.`);

  if (list.some((f) => f.startsWith(`${path}/`))) {
    steps.push(`${path} is a folder. The server redirects to /${path}/ so links inside it work, then looks for index.html.`);
    return { parts, status: 301, location: `/${path}/`, steps };
  }
  return missing();
}

// "I started the server one folder too high (or too low)" is the most common local 404.
function topLevelHint(path, files) {
  const tops = [...new Set(files.filter((f) => f.includes('/')).map((f) => f.split('/')[0]))];
  for (const top of tops) {
    if (files.includes(`${top}/${path}`) || (path === '' && files.includes(`${top}/index.html`))) {
      return `That file is at /${top}/${path}. The server was started one folder above your site: stop it, cd into ${top}, and start it again.`;
    }
  }
  const first = path.split('/')[0];
  if (first && !files.some((f) => f.startsWith(`${first}/`)) && path.includes('/')) {
    const rest = path.slice(first.length + 1);
    if (files.includes(rest)) return `${rest} is at the top of the folder you served. Leave ${first}/ out of the address: the folder you start the server in becomes /.`;
  }
  return '';
}

export const REASON = { 200: 'OK', 301: 'Moved Permanently', 304: 'Not Modified', 404: 'Not Found', 500: 'Internal Server Error' };
