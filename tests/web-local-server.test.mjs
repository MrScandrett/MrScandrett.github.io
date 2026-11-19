import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequest, parseFileList, splitUrl, contentType } from '../assets/js/lessons/web-local-server-core.mjs';

const files = parseFileList(`index.html
./style.css
script.js
projects.json
images\\logo.png
pages/about.html

pages/index.html`);
const ask = (url, caseSensitive = true, list = files) => resolveRequest({ url, files: list, caseSensitive });

test('file lists tolerate ./, backslashes and blank lines', () => {
  assert.deepEqual(files, ['index.html', 'style.css', 'script.js', 'projects.json', 'images/logo.png', 'pages/about.html', 'pages/index.html']);
});

test('the address splits into scheme, host, port and path', () => {
  const p = splitUrl('http://localhost:8080/pages/about.html?x=1#top');
  assert.equal(p.scheme, 'http'); assert.equal(p.host, 'localhost'); assert.equal(p.port, '8080');
  assert.equal(p.path, '/pages/about.html'); assert.equal(p.query, '?x=1'); assert.equal(p.hash, '#top');
});

test('a folder address serves its index.html', () => {
  assert.equal(ask('http://localhost:8080/').file, 'index.html');
  assert.equal(ask('http://localhost:8080/pages/').file, 'pages/index.html');
  assert.equal(ask('http://localhost:8080/').type, 'text/html');
});

test('a folder without the final slash redirects', () => {
  const r = ask('http://localhost:8080/pages');
  assert.equal(r.status, 301); assert.equal(r.location, '/pages/');
});

test('case matters only on a case-sensitive host', () => {
  assert.equal(ask('http://localhost:8080/images/Logo.png', true).status, 404);
  const loose = ask('http://localhost:8080/images/Logo.png', false);
  assert.equal(loose.status, 200); assert.equal(loose.file, 'images/logo.png'); assert.match(loose.hint, /GitHub Pages/);
});

test('query and fragment never change which file is sent', () => {
  const r = ask('http://localhost:8080/projects.json?sort=new#top');
  assert.equal(r.file, 'projects.json'); assert.equal(r.type, 'application/json');
});

test('starting the server one folder too high is diagnosed', () => {
  const high = files.map((f) => `my-site/${f}`);
  const r = ask('http://localhost:8080/style.css', true, high);
  assert.equal(r.status, 404); assert.match(r.hint, /cd into my-site/);
  const root = ask('http://localhost:8080/', true, high);
  assert.ok(root.listing.includes('my-site'));
});

test('naming the site folder in the address is diagnosed', () => {
  const r = ask('http://localhost:8080/my-site/index.html');
  assert.equal(r.status, 404); assert.match(r.hint, /Leave my-site\/ out/);
});

test('file:// is not a request at all', () => {
  const r = ask('file:///Users/ada/my-site/index.html');
  assert.equal(r.status, null); assert.match(r.hint, /localhost/);
});

test('missing files are 404 and spaces decode', () => {
  assert.equal(ask('http://localhost:8080/nope.html').status, 404);
  assert.equal(ask('http://localhost:8080/team%20photo.jpg', true, ['team photo.jpg']).status, 200);
  assert.equal(contentType('a.unknownext'), 'application/octet-stream');
});
