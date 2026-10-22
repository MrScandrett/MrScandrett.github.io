/* A visible work display; the existing score figures remain the source of truth. */
(function () {
  'use strict';
  var definitions = {
    gershwin: [["fascinating", "Fascinating Rhythm", ["gershwin-fascinating"]], ["someone", "Someone to Watch Over Me", ["gershwin-someone"]], ["rhythm", "I Got Rhythm", ["gershwin-rhythm"]]],
    morton: [["jelly", "Original Jelly Roll Blues", ["morton-jelly"]], ["new-orleans", "New Orleans Blues", ["morton-new-orleans"]], ["king", "King Porter Stomp", ["morton-king"]], ["black-bottom", "Black Bottom Stomp", ["morton-black-bottom"]]],
    bach: [['invention','Invention No. 8',['bach-invention-8']],['prelude','Prelude in C major',['bach-prelude-c-major']],['cello','Cello Suite No. 1 · Prélude',['bach-cello-prelude']]],
    beethoven: [['elise','Für Elise',['beethoven-fur-elise']],['joy','Ode to Joy',['beethoven-ode-to-joy']],['seventh','Symphony No. 7 · Allegretto',['beethoven-symphony-7-allegretto']]],
    chopin: [['prelude','Prelude in A major',['chopin-prelude-7']],['eminor','Prelude in E minor',['chopin-prelude-4']],['cminor','Prelude in C minor',['chopin-prelude-20']]],
    joplin: [['entertainer','The Entertainer',['joplin-entertainer']]],
    mozart: [['nachtmusik','Eine kleine Nachtmusik',['mozart-eine-kleine-1']],['turkish','Turkish March',['mozart-turkish-march']],['sonata','Sonata facile',['mozart-sonata-facile']],['maman','Ah, vous dirai-je, Maman',['mozart-ah-vous-theme']]],
    tchaikovsky: [['song','Old French Song',['tchaikovsky-old-french-song']]],
    debussy: [['clair','Clair de Lune',['debussy-clair-de-lune']],['arabesque','Première Arabesque',['debussy-arabesque-1']]],
    satie: [['gymnopedie1','Gymnopédie No. 1',['satie-gymnopedie-1']],['gnossienne1','Gnossienne No. 1',['satie-gnossienne-1']]],
    vivaldi: [['spring','Spring',['vivaldi-spring-1']]]
  };
  var name = location.pathname.split('/').pop().replace('.html','');
  var works = definitions[name];
  var area = document.getElementById('fl-sec-score');
  if (!works || !area) return;
  // Larger staff spacing lets a class read the notation at the default zoom.
  // ScoreEngine still reflows systems to the available width, and its zoom
  // controls remain available for closer study.
  area.querySelectorAll('figure[data-score]').forEach(function (figure) {
    figure.setAttribute('data-score-readable', '');
  });
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  var shelf = element('section','composer-display');
  shelf.id = 'composer-piece-shelf';
  shelf.dataset.routeLabel = 'Discover the music';
  shelf.setAttribute('aria-labelledby','composerDisplayTitle');
  var title = element('h2',null,'Discover the music'); title.id = 'composerDisplayTitle';
  shelf.appendChild(title);
  shelf.appendChild(element('p',null,'Choose a piece to listen, read its score, and explore what makes it distinctive.'));
  var grid = element('div','composer-pedestals'); shelf.appendChild(grid);
  // The shelf opens the hands-on part of the lesson, after the biography and the musical idea.
  area.before(shelf);
  var choose = element('a',null,'Choose a piece from the display');choose.href='#composer-piece-shelf';area.querySelector('h2').after(choose);
  var panels = element('div','composer-reading'); area.appendChild(panels);
  var controls = [];
  var active = null;
  var headerScorePrint = null;
  function printWork(work) {
    var figure = work && work.figure;
    if (!figure || !figure.scoreData) return;
    if (figure.dataset.score === 'mozart-turkish-march' && window.MozartRondoPrintScore) window.MozartRondoPrintScore();
    else if (window.ScoreEngine) window.ScoreEngine.printScore(figure.scoreData);
  }
  function updateHeaderScorePrint() {
    if (!headerScorePrint) return;
    var ready = !!(active && active.figure.scoreData);
    headerScorePrint.hidden = !ready;
    if (ready) headerScorePrint.querySelector('small').textContent = active.heading.textContent;
  }
  // Browser Print and the header's score action follow the piece currently open.
  // The header's explicit Print lesson action sets data-print-lesson to opt out.
  window.addEventListener('beforeprint', function () {
    if (!active || !active.figure.scoreData || document.body.hasAttribute('data-print-lesson') ||
      document.body.classList.contains('se-print-score-active') || document.body.classList.contains('mz-print-rondo')) return;
    if (window.ScoreEngine) window.ScoreEngine.preparePrintScore(active.figure.scoreData);
  });
  document.addEventListener('DOMContentLoaded', function () {
    var menu = document.querySelector('.lesson-print-menu');
    if (!menu) return;
    headerScorePrint = element('button',null,'');
    headerScorePrint.type = 'button';
    headerScorePrint.innerHTML = '<strong>Print open score</strong><small></small>';
    headerScorePrint.addEventListener('click', function () { printWork(active); });
    menu.insertBefore(headerScorePrint,menu.firstChild);
    updateHeaderScorePrint();
  });
  function stop(panel) {
    panel.querySelectorAll('.se-stop').forEach(function (button) { button.click(); });
    panel.querySelectorAll('audio').forEach(function (audio) { audio.pause(); });
  }
  function show(work, focus, listen) {
    if (active && active !== work) stop(active.panel);
    controls.forEach(function (item) {
      item.panel.hidden = item !== work;
      item.button.setAttribute('aria-expanded',String(item === work));
    });
    active = work;
    updateHeaderScorePrint();
    var parent = area.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    work.panel.querySelectorAll('figure[data-score]').forEach(function (figure) {
      figure.dispatchEvent(new CustomEvent('score:reveal'));
    });
    window.dispatchEvent(new Event('resize'));
    if (focus) {
      work.panel.scrollIntoView({block:'start',behavior:'instant'});
      work.heading.focus({preventScroll:true});
      history.pushState(null,'','#'+work.panel.id);
    }
    if (listen) requestAnimationFrame(function () {
      var play = work.panel.querySelector('.se-play');
      if (play && !work.panel.querySelector('.se-playing')) play.click();
    });
  }
  works.forEach(function (definition) {
    var id = definition[0], workTitle = definition[1], scoreIds = definition[2];
    var groups = scoreIds.map(function (scoreId) {
      var figure = document.querySelector('figure[data-score="'+scoreId+'"]');
      return figure && figure.closest('.composer-piece-group');
    }).filter(function (group,index,list) { return group && list.indexOf(group) === index; });
    if (!groups.length) return;
    var firstFigure = groups[0].querySelector('figure[data-score]');
    var panel = element('section','composer-work-panel'); panel.id = 'piece-'+id;
    var heading = element('h3',null,workTitle); heading.tabIndex = -1; panel.appendChild(heading);
    panel.setAttribute('aria-labelledby','piece-title-'+id); heading.id = 'piece-title-'+id;
    var back = element('button','composer-back','← Back to the pieces'); back.type = 'button'; panel.appendChild(back);
    groups.forEach(function (group) {
      var passage = element('section','composer-passage');
      var summary = group.querySelector(':scope > summary');
      passage.appendChild(element('h4',null,summary.textContent));
      summary.remove();
      while (group.firstChild) passage.appendChild(group.firstChild);
      // Keep nearby teaching notes with the passage they explain.
      var notes = group.nextElementSibling;
      if (notes && notes.classList.contains('fl-look-for')) passage.appendChild(notes);
      group.replaceWith(passage); panel.appendChild(passage);
    });
    panels.appendChild(panel); panel.hidden = true;
    var card = element('article','composer-piece-card');
    var button = element('button','composer-cover'); button.type = 'button';
    button.setAttribute('aria-label','Read and play '+workTitle);
    button.setAttribute('aria-controls',panel.id); button.setAttribute('aria-expanded','false');
    var composer = element('span','composer-cover-author',document.querySelector('h1').textContent);
    var coverTitle = element('span','composer-cover-title',workTitle);
    var preview = element('span','composer-score-preview'); preview.setAttribute('aria-hidden','true');
    var previewLabel = element('span','composer-preview-label','Opening bars');
    button.append(composer,coverTitle,preview,previewLabel);
    card.appendChild(button);
    card.appendChild(element('div','composer-pedestal')); 
    var hooks = {
      eminor: 'The whole prelude: chords that sink a half step at a time under a two-note melody.',
      cminor: 'All thirteen bars of chords: loud, then soft over a falling bass, then an echo.',
      invention: 'All 34 bars: hear the left hand copy the right hand one bar later, then trade roles.',
      prelude: name === 'chopin' ? 'Follow a complete 16-bar prelude and explore its singing melody.' : 'All 35 bars, one chord per bar: the guide names every chord as it plays.',
      cello: 'The whole Prélude on one cello, from the open-G pedal to the chromatic climb.',
      elise: 'The complete bagatelle: the famous refrain and both contrasting episodes.',
      seventh: 'The complete movement for full orchestra: one rhythm, passed from section to section.',
      joy: 'Follow the familiar theme one note at a time, then read ahead of the player.',
      entertainer: 'The whole rag: introduction, four strains and every repeat.',
      nachtmusik: 'The complete first movement for strings, a model sonata form.',
      turkish: 'The complete Rondo alla turca, every section and repeat, to the drumming coda.',
      sonata: 'The complete first movement with both hands: exposition, development, recapitulation.',
      maman: 'The complete 24-bar theme Mozart varied twelve times.',
      song: 'The complete piece with both hands, from the pickup to the final G-minor chord.',
      clair: 'The iconic 14-bar opening Nocturne: descending thirds and floating 9/8 moonlight.',
      arabesque: 'The complete 16-bar opening section: cascading triplets, Art Nouveau curves, and two-against-three polyrhythm.',
      spring: 'The complete first movement in full score: ritornello, birds, streams and storm.'
    };
    var hook = element('p','composer-piece-hook',hooks[id] || firstFigure.querySelector('figcaption').textContent.trim()); card.appendChild(hook);
    var actions = element('div','composer-piece-actions');
    var read = element('button',null,'Read & play');read.type='button';read.setAttribute('aria-label','Read and play '+workTitle);
    var listen = element('button',null,'Listen');listen.type='button';listen.disabled=true;listen.setAttribute('aria-label','Listen to '+workTitle);
    var print = element('button',null,'Print score');print.type='button';print.disabled=true;
    print.setAttribute('aria-label','Print a paginated score of '+workTitle);
    function printReady() { print.disabled = !firstFigure.scoreData; updateHeaderScorePrint(); }
    firstFigure.addEventListener('score:data',printReady);
    printReady();
    print.addEventListener('click',function () { printWork(work); });
    actions.append(read,listen,print);card.appendChild(actions);grid.appendChild(card);
    var work = {panel:panel,button:button,heading:heading,preview:preview,figure:firstFigure}; controls.push(work);
    button.addEventListener('click',function () {show(work,true,false);});
    read.addEventListener('click',function () {show(work,true,false);});
    listen.addEventListener('click',function () {show(work,true,true);});
    back.addEventListener('click',function () {
      stop(panel);panel.hidden=true;button.setAttribute('aria-expanded','false');active=null;updateHeaderScorePrint();
      shelf.scrollIntoView({block:'start',behavior:'instant'});button.focus({preventScroll:true});
      history.pushState(null,'','#composer-piece-shelf');
    });
    // The cover engraves the piece's own opening bars (not a fabricated historical cover).
    function refreshPreview() {
      if (firstFigure.scoreData) listen.disabled=false;
      if (preview.firstChild || !firstFigure.scoreData || !window.ScoreEngine) return;
      try { preview.innerHTML=window.ScoreEngine.previewSvg(firstFigure.scoreData,2,520); } catch (err) { /* the full score still works */ }
    }
    var observer=new MutationObserver(refreshPreview);observer.observe(firstFigure,{childList:true,subtree:true});refreshPreview();
    firstFigure.addEventListener('score:data', refreshPreview);
  });
  var picker=document.getElementById('musicSection');
  picker.addEventListener('change',function(){if(picker.value==='fl-sec-score' && !active)show(controls[0],false,false);},true);
  var option=element('option',null,'Discover the music');option.value=shelf.id;picker.insertBefore(option,picker.children[1]);
  function hash() {
    var target=document.getElementById(location.hash.slice(1));
    if(target === area && !active)show(controls[0],false,false);
    var panel=target && target.closest('.composer-work-panel');
    if(panel) {var work=controls.find(function (item) {return item.panel===panel;});if(work) show(work,false,false);}
  }
  window.addEventListener('hashchange',hash);window.addEventListener('popstate',hash);
  // Internal links may use pushState rather than a hashchange.
  document.addEventListener('click',function(event){if(event.target.closest('a[href="#fl-sec-score"]') && !active)show(controls[0],false,false);var link=event.target.closest('a[href^="#piece-"]');if(!link)return;var work=controls.find(function(item){return '#'+item.panel.id===link.getAttribute('href');});if(work)show(work,false,false);},true);
  hash();
})();
