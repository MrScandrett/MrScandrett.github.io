// Pure, browser/Node-compatible project and response engine. Never executes source.
export const LIMITS = Object.freeze({ fileBytes: 512 * 1024, projectBytes: 8 * 1024 * 1024, files: 400, responseChars: 2 * 1024 * 1024 });
const encoder = new TextEncoder();
export const bytes = text => encoder.encode(text).length;
const ignoredDirs = new Set(['node_modules', 'apps', 'dist', 'build', 'coverage', 'vendor', '__pycache__', 'venv', 'target']);
const textExtensions = /\.(?:html?|css|scss|sass|less|[cm]?js|jsx|tsx?|json|md|txt|py|gd|tscn|tres|godot|lua|java|c|h|cpp|hpp|cs|rs|go|rb|php|ya?ml|toml|xml|svg|sql|sh|glsl|vert|frag)$/i;

export function safePath(value) {
  if (typeof value !== 'string' || !value || value.length > 240 || value !== value.trim()
    || /[\\:\x00-\x1f\x7f%?#<>"|*]/.test(value) || value.startsWith('/')) throw new Error('Use a relative project path, such as src/player.js.');
  const parts = value.split('/');
  if (parts.some(part => !part || part.startsWith('.') || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error(`Unsupported project path: ${value}`);
  return value;
}

export function sourcePath(path) {
  try { safePath(path); } catch { return false; }
  const parts = path.split('/');
  const name = parts.at(-1);
  return !parts.slice(0, -1).some(part => ignoredDirs.has(part.toLowerCase()))
    && !/(?:^|[-_.])(?:secrets?|credentials?|private[-_]?key|service[-_]?account)(?:[-_.]|$)/i.test(name)
    && !/(?:\.min\.(?:[cm]?js|css)|\.map|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(name)
    && (textExtensions.test(name) || /^(?:README|LICENSE|Makefile)$/i.test(name));
}

export function validateFiles(entries) {
  if (!Array.isArray(entries) || entries.length > LIMITS.files) throw new Error(`Choose at most ${LIMITS.files} source files.`);
  const files = new Map();
  const portableNames = new Set();
  let total = 0;
  for (const entry of entries) {
    const path = safePath(entry.path);
    if (!sourcePath(path)) throw new Error(`Not an eligible source file: ${path}`);
    if (typeof entry.text !== 'string' || entry.text.includes('\0')) throw new Error(`Not a text file: ${path}`);
    const size = bytes(entry.text);
    if (size > LIMITS.fileBytes) throw new Error(`${path} exceeds the 512 KB file limit.`);
    total += size;
    if (total > LIMITS.projectBytes) throw new Error('Source exceeds the 8 MB project limit. Open a smaller project folder.');
    if (portableNames.has(path.toLowerCase())) throw new Error(`Duplicate or case-conflicting path: ${path}`);
    portableNames.add(path.toLowerCase());
    files.set(path, entry.text);
  }
  return files;
}

export function fenceFor(text) {
  let length = 3;
  for (const match of text.matchAll(/`+/g)) length = Math.max(length, match[0].length + 1);
  return '`'.repeat(length);
}

export function buildPacket({ files, selected, brief, goal, behavior, test, checkpoint = '', budget = 12000 }) {
  if (!files.size || !selected.size) throw new Error('Select at least one current source file.');
  if (!goal.trim() || !test.trim()) throw new Error('Describe one goal and an observable test before preparing a request.');
  const sent = new Map();
  for (const path of [...selected].sort()) {
    if (!files.has(path)) throw new Error(`Reload the missing file: ${path}`);
    sent.set(path, files.get(path));
  }
  const sections = [
    'Help me make one small, testable change to my student coding project.',
    `PROJECT BRIEF\n${brief.trim() || 'No brief yet. Ask about any missing project requirements.'}`,
    `ONE GOAL\n${goal.trim()}`,
    `CURRENT BEHAVIOR / ERROR\n${behavior.trim() || 'No error reported.'}`,
    `SUCCESS TEST\n${test.trim()}`,
    `LATEST CHECKPOINT (student-reported, not independently verified)\n${checkpoint || 'None yet.'}`,
    `ELIGIBLE SOURCE FILE MAP (names only; only selected files have contents below)\n${[...files.keys()].sort().join('\n')}`,
    'RESPONSE RULES\nUse the supplied current files as the source of truth. Ask for missing dependencies before guessing. Explain your plan briefly. Keep the task small; preserve unrelated behavior. Return COMPLETE contents of each changed file, not snippets, patches, placeholders, or omitted sections. Do not return unchanged files. You may change only supplied files; explain any necessary new file. Do not delete or rename files. For each file, use exactly this heading followed by a fenced code block:\n### FILE: src/example.js\n```javascript\n// Complete file contents here.\n```\nChoose a longer code fence if the file itself contains triple backticks. After the files, explain the change and give test steps. If you need information instead, ask a question without FILE headings.',
    ...[...sent].map(([path, text]) => { const fence = fenceFor(text); return `CURRENT FILE: ${path}\n${fence}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`; }),
  ];
  const text = sections.join('\n\n');
  if (text.length > budget) throw new Error(`Request is ${text.length.toLocaleString()} characters; budget is ${budget.toLocaleString()}. Select fewer files, shorten the task, or deliberately raise the budget. No source was truncated.`);
  return { text, sent, baseline: new Map(files), goal: goal.trim(), test: test.trim(), chars: text.length, estimatedTokens: Math.ceil(text.length / 4) };
}

export function parseResponse(response) {
  if (typeof response !== 'string' || response.length > LIMITS.responseChars) throw new Error('Response exceeds the 2 MB limit. Ask for a smaller change.');
  const lines = response.replace(/\r\n?/g, '\n').split('\n');
  const files = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const heading = /^(?:#{1,6}\s+)?FILE:\s*(.*?)\s*$/.exec(lines[i]);
    if (!heading) continue;
    const path = safePath(heading[1]);
    if (!sourcePath(path)) throw new Error(`Response targets an excluded or unsupported file: ${path}`);
    if (seen.has(path.toLowerCase())) throw new Error(`Response contains the same file twice: ${path}`);
    seen.add(path.toLowerCase());
    while (i + 1 < lines.length && !lines[i + 1].trim()) i++;
    const opening = /^(`{3,}|~{3,})[^`~]*$/.exec(lines[++i] || '');
    if (!opening) throw new Error(`Missing code fence after FILE: ${path}. Ask for complete labeled files.`);
    const fence = opening[1];
    const body = [];
    let closed = false;
    while (++i < lines.length) {
      if (new RegExp(`^${fence[0]}{${fence.length},}\\s*$`).test(lines[i])) { closed = true; break; }
      body.push(lines[i]);
    }
    if (!closed) throw new Error(`The response stops inside ${path}. Ask for the complete file again.`);
    if (body.some(line => /^\s*(?:\/\/|#|<!--)?\s*(?:\.\.\.|…|(?:the )?rest (?:of (?:the )?(?:code|file) )?(?:is )?(?:unchanged|omitted)|(?:existing|remaining) code (?:here|unchanged))\s*(?:-->)?\s*$/i.test(line)
      || /^\s*(?:\/\/|#|<!--)\s*(?:\.\.\.|…)?\s*(?:(?:the )?rest of (?:the )?(?:code|file)|(?:your )?existing code|(?:code )?(?:unchanged|omitted))\b/i.test(line))) throw new Error(`${path} contains an omitted-code placeholder. Ask for its complete contents.`);
    const text = body.length ? `${body.join('\n')}\n` : '';
    if (bytes(text) > LIMITS.fileBytes || text.includes('\0')) throw new Error(`${path} is too large or is not text.`);
    files.push({ path, text });
  }
  if (!files.length) throw new Error('No labeled files found. If the AI asked a question, answer it first. Otherwise ask for ### FILE: path followed by a complete fenced file.');
  return files;
}

export function reviewResponse(response, packet, current) {
  if (!packet) throw new Error('Prepare a request before importing its response.');
  const changes = parseResponse(response).map(({ path, text }) => {
    const original = packet.baseline.get(path);
    if (packet.baseline.has(path) && !packet.sent.has(path)) throw new Error(`${path} was not sent in this request. Include its current contents in a new request first.`);
    if (current.has(path) !== packet.baseline.has(path) || current.get(path) !== original) throw new Error(`${path} changed after this request. Reload and prepare a fresh request.`);
    if ([...current.keys()].some(name => name !== path && name.toLowerCase() === path.toLowerCase())) throw new Error(`Filename case conflicts with an existing file: ${path}`);
    if (original?.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
    if (original?.startsWith('\ufeff') && !text.startsWith('\ufeff')) text = '\ufeff' + text;
    const isNew = !packet.baseline.has(path);
    return { path, before: original ?? '', after: text, isNew, approved: false, applied: false };
  }).filter(change => change.isNew || change.before !== change.after);
  if (!changes.length) throw new Error('The returned files match the current files. No changes to apply.');
  validateFiles([...current].filter(([path]) => !changes.some(change => change.path === path)).map(([path, text]) => ({ path, text })).concat(changes.map(change => ({ path: change.path, text: change.after }))));
  return changes;
}

// A bounded line diff: common edges are exact; middle alignment uses LCS only
// below a fixed work budget, so a long AI response cannot freeze the page.
export function lineDiff(before, after) {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  let start = 0, tail = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (tail < a.length - start && tail < b.length - start && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const left = a.slice(start, a.length - tail), right = b.slice(start, b.length - tail);
  const middle = [];
  if (left.length * right.length > 150000 || left.length + right.length > 5000) {
    for (const text of left) middle.push({ type: 'remove', text });
    for (const text of right) middle.push({ type: 'add', text });
  } else {
    const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
    for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    let i = 0, j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) { middle.push({ type: 'same', text: left[i++] }); j++; }
      else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) middle.push({ type: 'add', text: right[j++] });
      else middle.push({ type: 'remove', text: left[i++] });
    }
  }
  return [...a.slice(0, start).map(text => ({ type: 'same', text })), ...middle, ...a.slice(a.length - tail).map(text => ({ type: 'same', text }))];
}

export function parseSession(raw) {
  if (typeof raw !== 'string' || raw.length > 24 * 1024 * 1024) throw new Error('Session is too large.');
  const data = JSON.parse(raw);
  if (data?.format !== 'code-bridge' || data.version !== 1) throw new Error('Choose a Code Bridge session JSON file.');
  const files = validateFiles(data.files);
  const fields = {};
  for (const key of ['name', 'brief', 'goal', 'behavior', 'test']) {
    if (typeof data[key] !== 'string' || data[key].length > 20000) throw new Error(`Invalid session field: ${key}`);
    fields[key] = data[key];
  }
  if (!Array.isArray(data.checkpoints) || data.checkpoints.length > 100 || data.checkpoints.some(item => !item || ['date', 'goal', 'test', 'result', 'explanation', 'next'].some(key => typeof item[key] !== 'string' || item[key].length > 20000) || !['passed', 'failed', 'not-tested'].includes(item.result))) throw new Error('Invalid checkpoint history.');
  return { ...fields, files, selected: new Set(), checkpoints: data.checkpoints };
}
