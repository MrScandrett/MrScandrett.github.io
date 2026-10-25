/* Shared curriculum context for the existing 3D lessons and Forge. */
(function () {
  'use strict';
  const root = new URL('../../', document.currentScript.src);
  const home = 'lessons/3d-design/3d-design.html';
  const stages = [
    ['home', 'First project', 'K–12 desk helper', '#first-project'],
    ['foundation', 'Shared skills', 'Inspect → draw → resize → cut', '#foundation'],
    ['real', 'Make it real', 'CAD → Forge → print', '#make-real'],
    ['look', 'Make it look', 'Model → sculpt → render', '#make-look'],
    ['play', 'Make it play', 'Game Asset Studio', '#make-play']
  ];
  // the open studio sits beside the tracks: any of them can be built in it
  const studio = ['workbench', 'Build anything', 'Workbench studio', 'workbench.html'];
  const lessonPaths = [
    [
      ['cad-and-printing/cad-camera-controls.html', 'Inspect three views'],
      ['cad-and-printing/blueprint-drafting.html', 'Draw and measure'],
      ['blender/blender-interface-basics.html', 'Change one size'],
      ['blender/blender-windows-doors.html', 'Make an opening']
    ], [
      ['forge.html', 'Build in Forge'],
      ['cad-and-printing/3d-printing.html', 'Prepare the print']
    ], [
      ['blender/blender-props-tools.html', 'Refine your model'],
      ['blender/blender-materials-render.html', 'Render the model']
    ], [
      ['game-asset-studio/game-asset-textures.html', 'Create textures'],
      ['game-asset-studio/game-asset-furniture.html', 'Build a prop'],
      ['game-asset-studio/game-asset-modular-rooms.html', 'Assemble a room'],
      ['game-asset-studio/game-asset-uv-export.html', 'Export and test']
    ]
  ];
  const lessonUrl = path => new URL(path.includes('/') ? 'lessons/3d-design/' + path : path, root).href;
  const references = {
    'blender-furniture-design.html': ['game-asset-furniture.html', 'Furniture'],
    'blender-environments.html': ['game-asset-modular-rooms.html', 'Modular rooms'],
    'blender-materials-render.html': ['game-asset-uv-export.html', 'UV, materials & export']
  };
  const handoffs = {
    navigate: {
      label: 'Shared skill 1 of 4 · See the object',
      question: 'Where does the item enter your holder?',
      actions: ['Practice the camera on the sample model.', 'Return to your desk helper: draw or capture its Top and Front views. Check the opening and base.'],
      evidence: 'Keep two views of your helper and name one proportion to change.',
      next: 'cad-and-printing/blueprint-drafting.html', nextLabel: 'Next: draw and measure'
    },
    transform: {
      label: 'Shared skill 3 of 4 · Change the object',
      question: 'Which size change would make your helper easier to use?',
      actions: ['Practice resizing the sample block.', 'Change one size on your desk helper in Workbench, physical materials, or your modeling app. Compare it with your first version.'],
      evidence: 'Keep both versions and explain the size change.',
      next: 'blender/blender-windows-doors.html', nextLabel: 'Next: cut an opening'
    },
    boolean: {
      label: 'Shared skill 4 of 4 · Remove material',
      question: 'Would a slot or pocket help hold your item?',
      actions: ['Practice the cut on the sample wall.', 'If your helper needs a slot or pocket, cut it in a copy of your own design; inspect it from Front and Side.'],
      evidence: 'Save the editable cut. Test fit and stability with the real item.',
      next: '3d-design.html#routes', nextLabel: 'Next: choose one outcome'
    }
  };
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('assets/css/components/design3d-route.css', root).href;
  document.head.append(style);
  // The older walkthrough's h1 sits in a collapsed disclosure under the workshop (or the
  // page's own h1); announce it one level down so the page keeps a single top heading.
  const refTitles = [...document.querySelectorAll('.d3-original-reference h1')];
  if (refTitles.length && (document.querySelector('[data-design3d-workshop]') || [...document.querySelectorAll('h1')].some(h => !h.closest('.d3-original-reference')))) {
    refTitles.forEach(h => h.setAttribute('aria-level', '2'));
  }
  document.querySelectorAll('[data-design3d-route]').forEach(host => {
    host.classList.add('d3-route');
    const nav = document.createElement('nav'); nav.setAttribute('aria-label', '3D Design curriculum');
    const homeLink = document.createElement('a'); homeLink.href = new URL(home, root).href;
    homeLink.textContent = '3D Design · Curriculum home'; nav.append(homeLink);
    const path = lessonPaths.find(items => items.some(([url]) => lessonUrl(url) === location.href.split(/[?#]/)[0]));
    if (path) {
      const index = path.findIndex(([url]) => lessonUrl(url) === location.href.split(/[?#]/)[0]);
      const trackId = host.dataset.design3dRoute === 'plan' ? 'foundation' : host.dataset.design3dRoute;
      const track = stages.find(([id]) => id === trackId);
      const place = document.createElement('div'); place.className = 'd3-route-place';
      const label = document.createElement('p'); label.className = 'd3-route-place-label';
      label.textContent = (track ? track[1] : '3D Design') + ' · lesson ' + (index + 1) + ' of ' + path.length;
      const title = document.createElement('strong'); title.textContent = path[index][1];
      const links = document.createElement('div'); links.className = 'd3-route-place-links';
      if (index > 0) {
        const previous = document.createElement('a'); previous.href = lessonUrl(path[index - 1][0]);
        previous.textContent = '← Previous: ' + path[index - 1][1]; links.append(previous);
      } else {
        const previous = document.createElement('a'); previous.href = new URL(home + (trackId === 'foundation' ? '#first-project' : '#routes'), root).href;
        previous.textContent = trackId === 'foundation' ? '← First project' : '← Choose an outcome'; links.append(previous);
      }
      if (index + 1 < path.length) {
        const next = document.createElement('a'); next.href = lessonUrl(path[index + 1][0]);
        next.textContent = 'Next: ' + path[index + 1][1] + ' →'; links.append(next);
      } else {
        const finish = document.createElement('a'); finish.href = new URL(home + (trackId === 'foundation' ? '#routes' : '#portfolio'), root).href;
        finish.textContent = trackId === 'foundation' ? 'Next: choose one outcome →' : 'Finish: record your design →'; links.append(finish);
      }
      place.append(label, title, links); nav.append(place);
    } else {
      const note = document.createElement('p'); note.className = 'd3-route-optional';
      note.textContent = 'Optional lesson · ' + (document.querySelector('h1')?.textContent.trim() || '3D Design');
      nav.append(note);
    }
    const list = document.createElement('ul');
    [...stages, studio].forEach(([id, title, sub, hash]) => {
      const li = document.createElement('li'), link = document.createElement('a');
      link.href = new URL(hash.startsWith('#') ? home + hash : hash, root).href;
      if (host.dataset.design3dRoute === id || (host.dataset.design3dRoute === 'plan' && id === 'foundation')) link.setAttribute('aria-current', 'step');
      const strong = document.createElement('strong'), small = document.createElement('small');
      strong.textContent = title; small.textContent = sub; link.append(strong, small); li.append(link); list.append(li);
    });
    const details=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent='Jump to another stage';
    details.append(summary,list);nav.append(details);
    host.append(nav);
    const workshop = document.querySelector('[data-design3d-workshop]');
    const handoff = workshop && handoffs[workshop.dataset.design3dWorkshop];
    if (handoff && host.nextElementSibling === workshop) {
      const section = document.createElement('section');
      section.className = 'd3-project-bridge';
      section.setAttribute('aria-label', 'Desk helper project connection');
      const listItems = handoff.actions.map(action => `<li>${action}</li>`).join('');
      section.innerHTML = `<div class="d3-project-bridge-head"><p>${handoff.label}</p><h2>Try the skill, then apply it</h2></div><div class="d3-project-bridge-body"><div><h3>Design question</h3><p>${handoff.question}</p><ol>${listItems}</ol></div><div class="d3-project-evidence"><h3>Keep as evidence</h3><p>${handoff.evidence}</p><p>The workshop sample is practice. Keep building your own helper in <a href="${new URL('workbench.html?new=product', root)}">Workbench</a>, physical materials, or your modeling app.</p></div></div><nav aria-label="Project steps"><a href="${new URL(home + '#first-project', root)}">First project</a><a href="${new URL('lessons/3d-design/' + handoff.next, root)}">${handoff.nextLabel}</a></nav>`;
      workshop.before(section);
    }
    const ref = references[location.pathname.split('/').pop()];
    if (ref || host.dataset.design3dRoute === 'reference') {
      const note = document.createElement('p');
      note.textContent = ref ? 'Reuse your existing model. This Blender walkthrough supports the shared project; you do not need to build it again. ' : 'Optional Blender reference: choose your required projects from the curriculum home. You do not need to complete both older pathways. ';
      if (ref) {
        const link = document.createElement('a'); link.href = new URL('lessons/3d-design/game-asset-studio/' + ref[0], root).href;
        link.textContent = 'Shared project: ' + ref[1]; note.append(link);
      }
      host.append(note);
    }
    const history = host.closest('main')?.querySelector('.d3-original-reference .bl-history');
    if (history) host.after(history);
  });
  // Deep links from the activity shelf must reveal labs inside reference disclosures.
  function revealHashTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let ancestor = target.parentElement;
    let revealed = false;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS' && !ancestor.open) { ancestor.open = true; revealed = true; }
      ancestor = ancestor.parentElement;
    }
    if (revealed) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  revealHashTarget();
  window.addEventListener('hashchange', revealHashTarget);
}());
