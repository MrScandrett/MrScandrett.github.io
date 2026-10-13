/* A visible work display; the existing score figures remain the source of truth. */
(function () {
  'use strict';
  var definitions = {
    gershwin: [["fascinating", "Fascinating Rhythm", ["gershwin-fascinating"]], ["someone", "Someone to Watch Over Me", ["gershwin-someone"]], ["rhythm", "I Got Rhythm", ["gershwin-rhythm"]]],
    morton: [["jelly", "Original Jelly Roll Blues", ["morton-jelly"]], ["new-orleans", "New Orleans Blues", ["morton-new-orleans"]], ["king", "King Porter Stomp", ["morton-king"]], ["black-bottom", "Black Bottom Stomp", ["morton-black-bottom"]]],
    bach: [['invention','Invention No. 8',['bach-invention-8']],['prelude','Prelude in C major',['bach-prelude-c-major','bach-prelude-complete-1']],['cello','Cello Suite No. 1',['bach-cello-prelude']]],
    beethoven: [['elise','Für Elise',['beethoven-fur-elise','beethoven-expanded-1']],['joy','Ode to Joy',['beethoven-ode-to-joy']],['seventh','Symphony No. 7',['beethoven-symphony-7-allegretto']]],
    chopin: [['prelude','Prelude in A major',['chopin-prelude-7']],['eminor','Prelude in E minor',['chopin-prelude-4-opening']],['cminor','Prelude in C minor',['chopin-prelude-20-melody']]],
    joplin: [['entertainer','The Entertainer',['joplin-entertainer','joplin-expanded-1']]],
    mozart: [['nachtmusik','Eine kleine Nachtmusik',['mozart-eine-kleine-opening']],['turkish','Turkish March',['mozart-rondo-alla-turca','mozart-turkish-march-a','mozart-turkish-march-b','mozart-turkish-march-c','mozart-turkish-march-d','mozart-turkish-march-e','mozart-turkish-march-f']],['sonata','Sonata facile',['mozart-sonata-facile']],['maman','Ah, vous dirai-je, Maman',['mozart-ah-vous-theme']]],
    tchaikovsky: [['song','Old French Song',['tchaikovsky-old-french-song','tchaikovsky-old-french-complete-1']]],
    vivaldi: [['spring','Spring',['vivaldi-expanded-1','vivaldi-expanded-2']]]
  };
  var name = location.pathname.split('/').pop().replace('.html','');
  var works = definitions[name];
  var area = document.getElementById('fl-sec-score');
  if (!works || !area) return;
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
  document.querySelector('.music-route').after(shelf);
  var choose = element('a',null,'Choose a piece from the display');choose.href='#composer-piece-shelf';area.querySelector('h2').after(choose);
  var panels = element('div','composer-reading'); area.appendChild(panels);
  var controls = [];
  var active = null;
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
    var parent = area.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
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
    var previewLabel = element('span','composer-preview-label','Opening notation');
    button.append(composer,coverTitle,preview,previewLabel);
    card.appendChild(button);
    card.appendChild(element('div','composer-pedestal')); 
    var hooks = {
      eminor: 'Hear the left-hand chords change beneath a melody that barely moves.',
      cminor: 'Follow the top voice of the opening chords, then compare it with the complete score.',
      invention: 'Hear the left hand copy the right hand one bar later and an octave lower.',
      prelude: name === 'chopin' ? 'Follow a complete 16-bar prelude and explore its singing melody.' : 'Predict which bars share a harmony, then listen for the opening pattern to return.',
      cello: 'Track the repeated low G. How do the notes above it change the harmony?',
      elise: 'Listen for E and D♯ rocking a half step apart before the broken chords enter.',
      seventh: 'Tap the Allegretto’s long–short–short rhythm, then follow its repeated notes.',
      joy: 'Follow the familiar theme one note at a time, then read ahead of the player.',
      entertainer: 'Tap the steady beat while the melody lands between beats.',
      nachtmusik: 'Follow the opening melody on the staff and listen for its repeated ideas.',
      turkish: 'Explore the circling theme, contrasting sections, and the big finish.',
      sonata: 'Read the opening melody slowly, then follow it as the player moves ahead.',
      maman: 'Recognize the familiar tune, then follow Mozart’s theme on the staff.',
      song: 'Listen for the rising line and the long D that keeps returning.',
      spring: 'Follow the opening phrase, its soft echo, and the return to forte.'
    };
    var hook = element('p','composer-piece-hook',hooks[id] || firstFigure.querySelector('figcaption').textContent.trim()); card.appendChild(hook);
    var actions = element('div','composer-piece-actions');
    var read = element('button',null,'Read & play');read.type='button';read.setAttribute('aria-label','Read and play '+workTitle);
    var listen = element('button',null,'Listen to opening');listen.type='button';listen.disabled=true;listen.setAttribute('aria-label','Listen to the opening of '+workTitle);
    actions.append(read,listen);card.appendChild(actions);grid.appendChild(card);
    var work = {panel:panel,button:button,heading:heading,preview:preview,figure:firstFigure}; controls.push(work);
    button.addEventListener('click',function () {show(work,true,false);});
    read.addEventListener('click',function () {show(work,true,false);});
    listen.addEventListener('click',function () {show(work,true,true);});
    back.addEventListener('click',function () {
      stop(panel);panel.hidden=true;button.setAttribute('aria-expanded','false');active=null;
      shelf.scrollIntoView({block:'start',behavior:'instant'});button.focus({preventScroll:true});
      history.pushState(null,'','#composer-piece-shelf');
    });
    // Clone existing engraving, not a fabricated historical score cover.
    function refreshPreview() {
      var svg=firstFigure.querySelector('.se-score');
      if (firstFigure.querySelector('.se-play')) listen.disabled=false;
      if (!svg || preview.firstChild) return;
      var copy=svg.cloneNode(true);copy.removeAttribute('width');copy.removeAttribute('height');
      copy.removeAttribute('role');copy.removeAttribute('aria-label');copy.setAttribute('aria-hidden','true');
      copy.querySelectorAll('[id]').forEach(function (node) {node.removeAttribute('id');});
      copy.querySelectorAll('[tabindex]').forEach(function (node) {node.removeAttribute('tabindex');});
      var box=svg.viewBox.baseVal;copy.setAttribute('viewBox','0 0 '+Math.min(box.width,640)+' '+Math.min(box.height,220));
      preview.appendChild(copy);
    }
    var observer=new MutationObserver(refreshPreview);observer.observe(firstFigure,{childList:true,subtree:true});refreshPreview();
  });
  var picker=document.getElementById('musicSection');
  picker.addEventListener('change',function(){if(picker.value==='fl-sec-score' && !active)show(controls[0],false,false);},true);
  var option=element('option',null,'Discover the music');option.value=shelf.id;picker.insertBefore(option,picker.children[1]);
  var turkish=document.getElementById('fl-sec-turkish');
  if(turkish) {var link=element('a',null,'Open the Turkish March scores');link.href='#piece-turkish';turkish.querySelector('h2').after(link);}
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
