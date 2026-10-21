// Tim Berners-Lee: restyle the earliest surviving web page (info.cern.ch, November 1992).
(() => {
  const htmlBox = document.getElementById('tbl-html');
  const cssBox = document.getElementById('tbl-css');
  const frame = document.getElementById('tbl-preview');
  const note = document.getElementById('tbl-note');
  if (!htmlBox || !cssBox || !frame) return;

  // Verbatim from http://info.cern.ch/hypertext/WWW/TheProject.html (public domain).
  const FIRST_PAGE = `<HEADER>
<TITLE>The World Wide Web project</TITLE>
<NEXTID N="55">
</HEADER>
<BODY>
<H1>World Wide Web</H1>The WorldWideWeb (W3) is a wide-area<A
NAME=0 HREF="WhatIs.html">
hypermedia</A> information retrieval
initiative aiming to give universal
access to a large universe of documents.<P>
Everything there is online about
W3 is linked directly or indirectly
to this document, including an <A
NAME=24 HREF="Summary.html">executive
summary</A> of the project, <A
NAME=29 HREF="Administration/Mailing/Overview.html">Mailing lists</A>
, <A
NAME=30 HREF="Policy.html">Policy</A> , November's  <A
NAME=34 HREF="News/9211.html">W3  news</A> ,
<A
NAME=41 HREF="FAQ/List.html">Frequently Asked Questions</A> .
<DL>
<DT><A
NAME=44 HREF="../DataSources/Top.html">What's out there?</A>
<DD> Pointers to the
world's online information,<A
NAME=45 HREF="../DataSources/bySubject/Overview.html"> subjects</A>
, <A
NAME=z54 HREF="../DataSources/WWW/Servers.html">W3 servers</A>, etc.
<DT><A
NAME=46 HREF="Help.html">Help</A>
<DD> on the browser you are using
<DT><A
NAME=13 HREF="Status.html">Software Products</A>
<DD> A list of W3 project
components and their current state.
(e.g. <A
NAME=27 HREF="LineMode/Browser.html">Line Mode</A> ,X11 <A
NAME=35 HREF="Status.html#35">Viola</A> ,  <A
NAME=26 HREF="NeXT/WorldWideWeb.html">NeXTStep</A>
, <A
NAME=25 HREF="Daemon/Overview.html">Servers</A> , <A
NAME=51 HREF="Tools/Overview.html">Tools</A> ,<A
NAME=53 HREF="MailRobot/Overview.html"> Mail robot</A> ,<A
NAME=52 HREF="Status.html#57">
Library</A> )
<DT><A
NAME=47 HREF="Technical.html">Technical</A>
<DD> Details of protocols, formats,
program internals etc
<DT><A
NAME=40 HREF="Bibliography.html">Bibliography</A>
<DD> Paper documentation
on  W3 and references.
<DT><A
NAME=14 HREF="People.html">People</A>
<DD> A list of some people involved
in the project.
<DT><A
NAME=15 HREF="History.html">History</A>
<DD> A summary of the history
of the project.
<DT><A
NAME=37 HREF="Helping.html">How can I help</A> ?
<DD> If you would like
to support the web..
<DT><A
NAME=48 HREF="../README.html">Getting code</A>
<DD> Getting the code by<A
NAME=49 HREF="LineMode/Defaults/Distribution.html">
anonymous FTP</A> , etc.</A>
</DL>
</BODY>`;

  const PRESETS = {
    none: '',
    article: `body {
  max-width: 38rem;
  margin: 3rem auto;
  padding: 0 1.5rem;
  font: 18px/1.65 Georgia, serif;
  color: #1f2328;
}
h1 { font: 700 2.4rem/1.1 system-ui, sans-serif; letter-spacing: -0.02em; }
a { color: #0969da; text-decoration-thickness: 2px; }
a:hover { background: #ddf4ff; }
dt { margin-top: 1rem; font-weight: 700; }
dd { margin-left: 0; color: #59636e; }`,
    dark: `body {
  max-width: 40rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  background: #0d1117;
  color: #e6edf3;
  font: 17px/1.6 system-ui, sans-serif;
}
h1 { color: #d2a8ff; }
a { color: #79c0ff; }
dt { margin-top: 0.9rem; }
dd { margin-left: 1rem; color: #9198a1; }`,
    index: `body { max-width: 52rem; margin: 0 auto; padding: 2rem 1.5rem; background: #f6f8fa; font: 16px/1.5 system-ui, sans-serif; color: #1f2328; }
h1 { font-size: 2.2rem; margin-top: 0; }
dl {
  display: grid;
  grid-template-columns: minmax(9rem, 14rem) 1fr;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  overflow: hidden;
}
dt, dd { margin: 0; padding: 0.75rem 1rem; border-bottom: 1px solid #d0d7de; }
dt { font-weight: 700; background: #f6f8fa; }
dd { color: #59636e; }
a { color: #8250df; }`
  };

  htmlBox.value = FIRST_PAGE;
  let timer = 0;

  const render = () => {
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBox.value.replace(/<\/style/gi, '')}</style></head><body>${FIRST_PAGE.replace(/<\/?(HEADER|BODY)>/g, '')}</body></html>`;
  };
  // The page's links are relative to info.cern.ch; keep clicks inside the lesson.
  frame.addEventListener('load', () => {
    try {
      frame.contentDocument.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        note.textContent = `On the real 1992 site this link would fetch "${a.getAttribute('href')}" from info.cern.ch with an HTTP GET request.`;
      });
    } catch { /* preview is cross-origin in some browsers; links simply stay inert */ }
  });

  const setPreset = (name) => {
    cssBox.value = PRESETS[name];
    document.querySelectorAll('[data-tbl-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tblPreset === name)));
    note.textContent = name === 'none'
      ? 'No CSS: this is roughly how the page looked in 1992. The browser chooses every font, size and colour.'
      : 'Same HTML, new CSS. Edit the styles on the right and watch the page change.';
    render();
  };

  document.querySelectorAll('[data-tbl-preset]').forEach((b) => b.addEventListener('click', () => setPreset(b.dataset.tblPreset)));
  cssBox.addEventListener('input', () => {
    document.querySelectorAll('[data-tbl-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    clearTimeout(timer);
    timer = setTimeout(render, 250);
  });
  setPreset('none');
})();
