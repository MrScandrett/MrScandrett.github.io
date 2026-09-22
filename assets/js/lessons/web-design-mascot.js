/* Bracket: a page-local help mascot for the web design pathway hub.
   Tracks which section is on screen and shows a short tip plus any jargon
   used there. No network calls; everything is authored inline below. */
(() => {
  'use strict';
  const root = document.querySelector('[data-web-mascot]');
  if (!root) return;

  const help = {
    intro: {
      title: 'Welcome',
      tip: "This is the big picture — skim it once, then jump straight to the course map below. You don't have to read everything up here before you start building.",
      terms: [
        ['HTML', 'the tags that give a page its structure.'],
        ['CSS', 'the rules that give a page its look.'],
        ['JavaScript', 'the code that makes a page respond.']
      ]
    },
    'website-blocks': {
      title: 'Build with blocks',
      tip: 'Drag-and-drop blocks build the exact same site as typing code. Try this if typing feels like too much right now — you can always switch to code later.',
      terms: [['block', 'a puzzle-piece version of one line of code.']]
    },
    workflow: {
      title: 'Your routine',
      tip: "This loop repeats all course: predict, edit, run, explain. You don't need to memorize it — it just names what you're already doing.",
      terms: [
        ['VS Code', 'the free program you write your files in.'],
        ['inspector', "a browser tool that shows a page's code without changing your files."]
      ]
    },
    course: {
      title: 'Course map',
      tip: 'Do lessons 1–5 in order — each one needs the last. After that, pick one project and take the two side lessons whenever you want.',
      terms: [
        ['Flexbox', 'a CSS tool for lining elements up in a row or column.'],
        ['Grid', 'a CSS tool for laying elements out in rows and columns at once.'],
        ['DOM', 'the live version of your page that JavaScript can read and change.'],
        ['event', 'something that happens, like a click, that JavaScript can react to.']
      ]
    },
    projects: {
      title: 'Choose a project',
      tip: "Pick the one you'd actually use or show a friend — that's the one you'll finish."
    },
    toolbox: {
      title: 'Toolbox',
      tip: "These are backup tools, not new lessons. Only open one if you're stuck on that exact thing.",
      terms: [
        ['GitHub', 'a free place to save and publish your code online.'],
        ['WebXR', 'a way to view a website in 3D or VR.']
      ]
    },
    demonstration: {
      title: 'Final demonstration',
      tip: 'This is your finish line — a working checklist, not a test with one right answer.'
    }
  };
  const order = Object.keys(help);

  const toggle = root.querySelector('[data-mascot-toggle]');
  const panel = root.querySelector('[data-mascot-panel]');
  const sectionEl = root.querySelector('[data-mascot-section]');
  const tipEl = root.querySelector('[data-mascot-tip]');
  const termsEl = root.querySelector('[data-mascot-terms]');
  let current = order[0];
  let open = false;

  function render() {
    const entry = help[current] || help[order[0]];
    sectionEl.textContent = entry.title;
    tipEl.textContent = entry.tip;
    termsEl.innerHTML = '';
    if (entry.terms && entry.terms.length) {
      const dl = document.createElement('dl');
      dl.className = 'web-mascot-terms-list';
      entry.terms.forEach(([term, def]) => {
        const dt = document.createElement('dt'); dt.textContent = term;
        const dd = document.createElement('dd'); dd.textContent = def;
        dl.append(dt, dd);
      });
      termsEl.append(dl);
    }
  }

  function setOpen(next) {
    open = next;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { render(); panel.querySelector('.web-mascot-close').focus(); }
    else toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(!open));
  panel.querySelector('.web-mascot-close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) setOpen(false); });
  document.addEventListener('click', event => {
    if (open && !root.contains(event.target)) setOpen(false);
  });

  const sections = order.map(id => document.getElementById(id)).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.intersectionRatio));
      let best = current, bestRatio = 0;
      visible.forEach((ratio, id) => { if (ratio > bestRatio) { bestRatio = ratio; best = id; } });
      if (bestRatio > 0 && best !== current) { current = best; if (open) render(); }
    }, { threshold: [0, .25, .5, .75, 1], rootMargin: '-15% 0px -55% 0px' });
    sections.forEach(section => observer.observe(section));
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setTimeout(() => {
      toggle.classList.add('is-greeting');
      toggle.addEventListener('animationend', () => toggle.classList.remove('is-greeting'), { once: true });
    }, 900);
  }

  render();
})();
