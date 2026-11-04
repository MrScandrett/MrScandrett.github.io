import { pageDocument } from './project.mjs';
import { makeZip } from './zip.mjs';
const $ = id => document.getElementById(`fs-${id}`);
const key = 'classroomos-first-site-v1';
const starter = {
  'index.html': pageDocument('My little corner of the web', `  <main>
    <p class="eyebrow">HELLO, WORLD. THIS IS MY SPACE.</p>
    <h1>Big ideas start with a little curiosity.</h1>
    <p>I’m making a website about the things I love. This is just the beginning.</p>
    <button id="hello">Say hello ↗</button>
    <p id="message" aria-live="polite"></p>
  </main>`),
  'style.css': `body {
  margin: 0;
  padding: 48px 28px;
  background: #f3efdf;
  color: #213d35;
  font-family: system-ui, sans-serif;
}
main { max-width: 540px; margin: auto; }
.eyebrow { font-size: 11px; letter-spacing: 2px; }
h1 { font-size: clamp(32px, 6vw, 52px); line-height: 1.08; }
p { line-height: 1.7; }
button {
  background: #213d35;
  color: white;
  padding: 14px 22px;
  border: 0;
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}
button:hover { background: #385c4f; }
`,
  'script.js': `console.log("script.js is running");

const button = document.querySelector("#hello");
button.addEventListener("click", () => {
  document.querySelector("#message").textContent =
    "Hello from my very own website!";
});
`
};
let files = { ...starter }, active = 'index.html', timer, token;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && Object.keys(starter).every(name => typeof saved[name] === 'string')) files = saved;
} catch { /* A new project still works if browser storage is unavailable. */ }
const hints = {
  'index.html': ['Structure', 'HTML gives your page meaning. Try changing the heading between <h1> and </h1>.'],
  'style.css': ['Style', 'CSS sets the mood. Try changing background: #f3efdf to another colour.'],
  'script.js': ['Behavior', 'JavaScript makes things happen. Change the greeting, then click the preview button.']
};
function select(name) {
  active = name;
  $('editor').value = files[name];
  $('label').textContent = `${name} · ${hints[name][0]}`;
  $('hint').textContent = hints[name][1];
  document.querySelectorAll('[data-fs-file]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fsFile === name)));
}
function save() {
  try { localStorage.setItem(key, JSON.stringify(files)); $('save').textContent = 'Saved in this browser'; }
  catch { $('save').textContent = 'Not saved · download to keep your work'; }
}
function run() {
  clearTimeout(timer);
  token = crypto.randomUUID();
  $('console').textContent = '';
  const doc = new DOMParser().parseFromString(files['index.html'], 'text/html');
  // Keep preview content isolated, and do not let relative URLs load classroom pages.
  const policy = doc.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src https: data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(policy);
  const bridge = doc.createElement('script');
  bridge.textContent = `const send=(s)=>parent.postMessage({firstSite:${JSON.stringify(token)},text:String(s)},'*');console.log=(...a)=>send(a.join(' '));addEventListener('error',e=>send('Error: '+e.message));addEventListener('unhandledrejection',e=>send('Error: '+e.reason));`;
  policy.after(bridge);
  let css = false, js = false;
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    if (link.getAttribute('href') === 'style.css') {
      const style = doc.createElement('style'); style.textContent = files['style.css']; link.replaceWith(style); css = true;
    }
  });
  doc.querySelectorAll('script[src]').forEach(script => {
    if (script.getAttribute('src') === 'script.js') {
      // A data-independent blob preserves the semantics of defer for a head script.
      script.remove(); js = true;
    }
  });
  if (js) {
    const script = doc.createElement('script');
    // Keep literal end tags inside the serialized script element.
    script.textContent = files['script.js'].replace(/<\/script/gi, '<\\/script');
    doc.body.append(script);
  }
  // Escape literal style end tags introduced by CSS, keeping them inside their element.
  doc.querySelectorAll('style').forEach(style => { style.textContent = style.textContent.replace(/<\/style/gi, '<\\/style'); });
  $('frame').srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
  $('status').textContent = [!css && 'Connect your CSS: use href="style.css".', !js && 'Connect your JavaScript: use src="script.js".'].filter(Boolean).join(' ') || 'Preview updated · click your button to try the JavaScript. Download your files when you’re ready.';
}
window.addEventListener('message', e => {
  if (e.source !== $('frame').contentWindow || e.data?.firstSite !== token || typeof e.data.text !== 'string') return;
  $('console').textContent = ($('console').textContent + e.data.text.slice(0, 2000) + '\n').slice(-6000);
});
document.querySelectorAll('[data-fs-file]').forEach(b => b.addEventListener('click', () => select(b.dataset.fsFile)));
$('editor').addEventListener('input', () => { files[active] = $('editor').value; save(); clearTimeout(timer); timer = setTimeout(run, 450); });
let escapeTab = false;
$('editor').addEventListener('keydown', e => {
  if (e.key === 'Escape') { escapeTab = true; return; }
  if (e.key === 'Tab' && !e.shiftKey && !escapeTab) {
    e.preventDefault(); const editor = $('editor'); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); editor.dispatchEvent(new Event('input'));
  }
  escapeTab = false;
});
$('run').addEventListener('click', run);
$('width').addEventListener('change', () => $('frame').classList.toggle('is-phone', $('width').value === 'phone'));
$('reset').addEventListener('click', () => {
  if (!confirm('Replace your work with the starter website? Download it first if you want to keep it.')) return;
  files = { ...starter }; select('index.html'); save(); run();
});
$('download').addEventListener('click', () => {
  const blob = new Blob([makeZip(Object.entries(files))], { type: 'application/zip' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'my-site.zip'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  $('status').textContent = 'Website downloaded. Unzip my-site.zip, open the folder in VS Code, and continue with the lesson below.';
});
select(active); save(); run();
