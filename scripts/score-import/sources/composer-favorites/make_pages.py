import sys, html
sys.path.insert(0, sys.argv[1])
from composers import C
OUT = sys.argv[2]
UP = '../../../'

MODES = '<option value="original">Original scoring</option><option value="piano">Solo piano · two-part study</option><option value="melody">Melody / selected voice</option><option value="violin">Violin · selected voice</option><option value="alto">E♭ alto saxophone</option><option value="tenor">B♭ tenor saxophone</option><option value="guitar">Guitar · melody tablature</option><option value="bass">Bass · selected voice</option>'
CARE = '<details><summary>Arranging with care</summary><p>A source staff is not always the melody: in an orchestral score, find the staff carrying the theme. A two-part piano study pairs your selected voice with a source bass; it is not a concert reduction and wide leaps may need redistribution. Saxophone notation is transposed while playback stays at concert pitch. Violin parts stay at concert pitch and are moved by octaves to sit above the open G string. Guitar tab preserves pitch and rhythm but may need a different octave or fingering. Original ensembles are available only where the source contains those parts. Piano reductions and original classroom studies retain their source identities.</p></details>'

def page(slug, c):
    nav = ''.join(f'<li><a href="{UP}{h}"{a}>{t}</a></li>' for h, t, a in [
        ('index.html', 'Home', ''), ('steam-lessons.html', 'Lessons', ' aria-current="page"'), ('paths.html', 'Paths', ''),
        ('showcase.html', 'Showcase', ''), ('applications.html', 'Apps', ''), ('library.html', 'Library', ''), ('about.html', 'About', '')])
    p = c['portrait']
    bio = '\n'.join(f'<p>{x}</p>' for x in c['bio'])
    tl = '\n'.join(f'<li data-when="{w}">{t}</li>' for w, t in c['timeline'])
    idea = '\n'.join(f'<p>{x}</p>' for x in c['idea_text'])
    listen = '\n'.join(f'<li>{x}</li>' for x in c['listen'])
    practice = '\n'.join(f'<li>{x}</li>' for x in c['practice'])
    name = c['name']
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} · Mr. Scandrett’s ClassroomOS</title>
<meta name="description" content="{html.escape(c['desc'], quote=True)}">
<link rel="icon" href="{UP}assets/images/favicon.svg">
<link rel="stylesheet" href="{UP}assets/css/classroom-home.css">
<link rel="stylesheet" href="{UP}assets/css/lesson-layout.css">
<link rel="stylesheet" href="{UP}assets/css/lessons/figure-lesson.css">
<link rel="stylesheet" href="{UP}assets/css/lessons/composer-lesson.css">
<link rel="stylesheet" href="{UP}assets/css/lessons/music-route.css">
<link rel="stylesheet" href="{UP}assets/css/lessons/composer-route.css">
<link rel="stylesheet" href="{UP}assets/css/music-notation.css">
<link rel="stylesheet" href="{UP}assets/css/score-engine.css">
<link rel="stylesheet" href="{UP}assets/css/lessons/composer-studio.css">
<link rel="stylesheet" href="{UP}assets/css/creation-app.css">
</head>
<body class="theme-liquid-woodland theme-steam">
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="ll-viewport">  <header class="site-header">
    <div class="nav-wrap">
      <a class="brand" href="{UP}index.html">Mr. Scandrett's ClassroomOS</a>
      <nav class="site-nav" aria-label="Primary">
        <ul>{nav}</ul>
      </nav>
    </div>
  </header>

<div class="ll-stage">
<div class="ll-sim">
<main class="fl-page" id="main-content" data-composer-idea="{slug}">
<section id="composer-studio" data-composer-studio data-initial-score="{c['initial']}" class="fl-card bv-studio" data-creation-app data-creation-fit aria-labelledby="bv-title">
          <p class="eyebrow">Music pioneer · {c['era']} · Composer arrangement studio</p>
          <h1 id="bv-title">{name}</h1>
          <div class="bv-fields">
            <label>Sheet music selection<select id="bv-work"></select></label>
            <label>Arrangement<select id="bv-mode">{MODES}</select></label>
            <label>Source staff<select id="bv-staff"></select></label>
            <label>Voice<select id="bv-voice"></select></label>
            <label>Concert octave<select id="bv-octave"><option value="-12">Down one octave</option><option value="0" selected>Source octave</option><option value="12">Up one octave</option></select></label>
          </div>
          <p id="bv-note" role="status"></p>
          <div class="bv-actions"><button type="button" id="bv-print">Print arrangement</button><button type="button" id="bv-save">Save arrangement</button><label class="bv-open">Open saved arrangement <input type="file" id="bv-open" accept="application/json,.json"></label></div>
          <figure id="bv-score" data-score-print="opening" aria-label="Current arrangement"></figure>
          <div id="bv-tab" class="bv-tab"></div>
          <p>{c['intro']} Playback uses sampled or synthesized instruments; consult the linked edition for fingering, bowing, pedaling, and expressive detail.</p>
          {CARE}
          <p><small>Recordings: Nicholaus P. Brosowsky’s Tonejs-Instruments sample collection, CC BY 3.0; VSCO 2 Community Edition, CC0. <a href="{UP}assets/audio/instruments/README.md">Sample credits and processing</a>.</small></p>
        </section>
<section class="hero fl-hero composer-intro" data-composer-intro>
<p class="eyebrow">Music pioneer · {c['era']} · {c['dates']}</p>
<h2>About {name}</h2>
<figure class="composer-portrait" data-zoomable data-lightbox-group="{slug}" data-full="{UP}assets/images/lessons/composers/{p['src']}">
<img src="{UP}assets/images/lessons/composers/{p['src']}" alt="{html.escape(p['alt'], quote=True)}" loading="eager">
<figcaption>{p['cap']}</figcaption>
</figure>
<p class="fl-lede">{c['lede']}</p>
</section>
<div data-composer-route>
</div>
<nav class="music-route" aria-label="Lesson sections">
<a href="{UP}steam-lessons.html#module-music">← Music lessons</a> · <a href="#composer-studio">Play the scores</a> · <a href="#fl-sec-bio">Life</a> · <a href="#fl-sec-timeline">Timeline</a> · <a href="#fl-sec-idea">Musical idea</a> · <a href="#fl-sec-listen">Listening</a> · <a href="#fl-sec-practice">Practice</a>
</nav>
<section class="fl-card" id="fl-sec-bio">
<h2>Life and context</h2>
{bio}
</section>
<section class="fl-card" id="fl-sec-timeline">
<h2>{name}: a timeline</h2>
<ol data-timeline data-timeline-title="{name}, {c['dates']}">
{tl}
</ol>
</section>
<section class="fl-card" id="fl-sec-idea">
<h2>{c['idea']}</h2>
{idea}
</section>
<section class="fl-card" aria-labelledby="lab-title">
<p class="eyebrow">Music pioneer · {c['era']}</p>
<h2 id="lab-title">Sound experiment: {c['kicker'][0].lower() + c['kicker'][1:]}</h2>
<p>{c['lab_q']}</p>
<p>This is an original classroom demonstration of a musical idea, not an excerpt or recording of the composer’s work.</p>
<label for="study-version">Version</label> <select id="study-version">
<option value="a">A · starting idea</option>
<option value="b">B · comparison</option>
</select> <button type="button" id="study-play">Play example</button> <button type="button" id="study-stop">Stop</button>
<p id="study-status" role="status">Choose a version, then press Play.</p>
<p>
<a href="../instruments/piano.html">Try your own idea at the piano →</a>
</p>
</section>
<section class="fl-card" id="fl-sec-listen">
<h2>Guided listening</h2>
<p>Choose a performance of one of these works. Listen once for its overall character, then again for the detail in the prompt.</p>
<ul>
{listen}
</ul>
<p>
<a href="{c['link'][0]}" target="_blank" rel="noopener">{c['link'][1]} ↗</a>
</p>
</section>
<section class="fl-card" id="fl-sec-practice">
<h2>Practice and reflection</h2>
<ol>
{practice}
</ol>
<details>
<summary>Check your listening</summary>
<p>{c['check']} A useful answer names a feature you can hear and explains its effect. More than one interpretation is possible.</p>
</details>
<p>
<label for="study-reflection">My listening notes</label>
<br>
<textarea id="study-reflection" rows="4" style="width:100%;max-width:48rem" placeholder="Name the work and describe what you heard.">
</textarea>
</p>
<p>Use the heart | save pill to keep these notes in this browser, or copy them before leaving.</p>
<p>{c['related']}</p>
</section>
<footer class="site-footer">
<p>
<a href="{UP}steam-lessons.html#module-music">Back to Music lessons</a>
</p>
</footer>
</main>
</div>
</div>
</div>
<script src="{UP}assets/js/music-notation.js"></script>
<script src="{UP}assets/js/theme-registry.js"></script>
<script src="{UP}assets/js/nav-mobile.js"></script>
<script src="{UP}assets/js/lesson-content.js"></script>
<script src="{UP}assets/js/lesson-print-button.js"></script>
<script src="{UP}assets/js/music-family.js"></script>
<script src="{UP}assets/js/lessons/composer-route.js"></script>
<script src="{UP}assets/js/music-synth.js"></script>
<script src="{UP}assets/js/audio-kit.js"></script>
<script src="{UP}assets/js/lessons/composer-idea-lab.js"></script>
<script src="{UP}assets/js/photo-lightbox.js"></script>
<script src="{UP}assets/js/score-navigation.js"></script>
<script src="{UP}assets/js/score-engine.js"></script>
<script src="{UP}assets/js/composer-arrangement.js"></script>
<script src="{UP}assets/js/guitar-tablature.js"></script>
<script src="{UP}assets/js/lessons/fake-book-melody.js"></script>
<script src="{UP}assets/js/lessons/composer-studio.js"></script>
<script src="{UP}assets/js/creation-app.js"></script>
</body>
</html>
'''

for slug, c in C.items():
    open(f'{OUT}/{slug}.html', 'w').write(page(slug, c))
    print('wrote', slug)
