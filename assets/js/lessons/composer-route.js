/* composer-route.js — the Composers chapter as one route through music history.
 * A slim strip at the top of each composer lesson (eras as a stepper, this composer, previous / next)
 * and a "What came next" card after Practice Problems. The route itself (eras, order, dates) lives in
 * music-family.js; this file only adds the sentence that links each composer to the next one.
 * Mount: <div data-composer-route></div> just before the page's .music-route bar.
 * Adding a composer: add them to ERAS in music-family.js, then a NEXT entry here (optional: without
 * one, the card still links on, just without the connecting sentence).
 */
(function () {
  'use strict';

  // Keyed by the composer the card sits on; the sentence leads into the next composer.
  var NEXT = {
    vivaldi: 'Bach copied out Vivaldi’s concertos and arranged several of them for keyboard, learning how Vivaldi built bright, driving fast movements.',
    bach: 'At eight, Mozart met Bach’s youngest son Johann Christian in London; in Vienna in 1782 he studied J. S. Bach’s fugues and arranged five of them for string quartet.',
    mozart: 'In 1787, aged 16, Beethoven travelled to Vienna hoping to study with Mozart, but was called home within weeks because his mother was dying.',
    beethoven: 'Chopin was 17 when Beethoven died in Vienna in 1827. Two years later he gave his own first concerts in that same city.',
    chopin: 'Chopin’s 24 Preludes give each short piece one mood; Tchaikovsky’s Album for the Young (1878) is also 24 short piano pieces, each one scene, written for children learning to play.',
    tchaikovsky: 'At 18, Debussy became house pianist to Nadezhda von Meck, Tchaikovsky’s patron, and she sent Tchaikovsky one of Debussy’s first piano pieces to look at.',
    debussy: 'Debussy and Satie were friends from about 1891, and in 1897 Debussy orchestrated two of Satie’s Gymnopédies.',
    satie: 'Across the Atlantic, Scott Joplin, born about two years after Satie, was making ragtime America’s popular music. Satie later wrote a ragtime into his 1917 ballet Parade.',
    joplin: 'Jelly Roll Morton grew up with ragtime in New Orleans. In his 1938 Library of Congress sessions he played Joplin’s Maple Leaf Rag as written, then again turned into jazz.',
    morton: 'Morton was publishing jazz on paper by 1915. In the same years in New York, a teenage George Gershwin was a Tin Pan Alley song plugger, playing new sheet music for customers.',
    gershwin: 'Gershwin took jazz into the concert hall with Rhapsody in Blue in 1924. Duke Ellington, a year younger, did it his own way with Black, Brown and Beige at Carnegie Hall in 1943.',
    'duke-ellington': 'Ellington and Louis Armstrong rose in the same years and finally recorded a whole album of Ellington’s tunes together in 1961.',
    'louis-armstrong': 'Armstrong’s records of the 1920s made the improvised solo the centre of jazz. In the 1940s Charlie Parker’s bebop gave solos new speed and new harmonies.'
  };
  // After the last composer the route leads back out of the chapter.
  var END = {
    title: 'Where the scales came from',
    text: 'Parker’s lines move through scales and modes that are far older than jazz. The Modes lesson traces them from ancient Greece, through the medieval church, to today.',
    links: [
      { file: 'lessons/music/theory/music-modes-evolution.html', label: 'Modes: From Greece to Today', rel: 'next' },
      { file: 'steam-lessons.html#module-music', label: 'Back to the Music chapters' }
    ]
  };

  var family = window.MusicFamily;
  var mount = document.querySelector('[data-composer-route]');
  if (!family || !mount) return;
  var list = family.composers;
  var at = -1;
  list.forEach(function (c, i) { if (family.here(c.file)) at = i; });
  if (at < 0) return;
  var me = list[at], prev = list[at - 1], next = list[at + 1];

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function slug(c) { return c.file.replace(/^.*\//, '').replace(/\.html$/, ''); }

  // The strip: eras · this composer · previous / next.
  var nav = el('nav', { class: 'composer-route', 'aria-label': 'Composer route through music history' });
  var eras = el('ol', { class: 'cr-eras' });
  family.eras.forEach(function (era) {
    var li = el('li', { class: 'cr-era' + (era === me.era ? ' is-here' : '') });
    var first = era.composers[0];
    var names = era.composers.map(function (c) { return c.label; }).join(', ');
    var a = el('a', { href: family.base + first.file, title: era.label + ': ' + names, 'aria-label': era.label + ' era: ' + names });
    if (era === me.era) a.setAttribute('aria-current', 'step');
    // The full era name is in the title and in the "now" text; the stepper uses the short one
    // (and on phones the tiny one, when an era has it).
    a.appendChild(el('span', { class: 'cr-era-label' + (era.tiny ? ' has-tiny' : '') }, era.short || era.label));
    if (era.tiny) a.appendChild(el('span', { class: 'cr-era-tiny', 'aria-hidden': 'true' }, era.tiny));
    li.appendChild(a);
    eras.appendChild(li);
  });
  nav.appendChild(eras);

  var now = el('p', { class: 'cr-now' });
  now.appendChild(el('strong', {}, me.label));
  now.appendChild(el('span', { class: 'cr-now-dates' }, ' ' + me.dates));
  now.appendChild(el('span', { class: 'cr-now-era' }, ' · ' + me.era.label));
  nav.appendChild(now);

  var steps = el('p', { class: 'cr-steps' });
  if (prev) steps.appendChild(el('a', { href: family.base + prev.file, rel: 'prev', 'aria-label': 'Previous composer: ' + prev.name }, '← ' + prev.label));
  if (next) steps.appendChild(el('a', { href: family.base + next.file, rel: 'next', 'aria-label': 'Next composer: ' + next.name }, next.label + ' →'));
  nav.appendChild(steps);
  mount.replaceWith(nav);

  // "What came next", after the practice problems.
  var card = el('aside', { class: 'fl-card composer-next', 'aria-labelledby': 'composer-next-title' });
  card.appendChild(el('p', { class: 'cr-next-kicker' }, next ? 'What came next' : 'Where the route goes from here'));
  var title = el('h2', { id: 'composer-next-title' });
  card.appendChild(title);
  var links = el('p', { class: 'cr-next-links' });
  if (next) {
    title.textContent = next.name + ' (' + next.dates + ')';
    if (NEXT[slug(me)]) card.appendChild(el('p', { class: 'cr-next-text' }, NEXT[slug(me)]));
    links.appendChild(el('a', { href: family.base + next.file, rel: 'next' }, 'Go to ' + next.label + ' →'));
  } else {
    title.textContent = END.title;
    card.appendChild(el('p', { class: 'cr-next-text' }, END.text));
    END.links.forEach(function (link) {
      var attrs = { href: family.base + link.file };
      if (link.rel) attrs.rel = link.rel;
      links.appendChild(el('a', attrs, link.label + (link.rel ? ' →' : '')));
    });
  }
  card.appendChild(links);
  var practice = document.getElementById('fl-sec-practice');
  var footer = document.querySelector('main .site-footer');
  if (practice && practice.parentNode) practice.parentNode.insertBefore(card, practice.nextSibling);
  else if (footer) footer.parentNode.insertBefore(card, footer);
})();
