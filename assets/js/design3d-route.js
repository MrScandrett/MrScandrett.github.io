/* Shared curriculum context for the existing 3D lessons and Forge. */
(function () {
  'use strict';
  const root = new URL('../../', document.currentScript.src);
  const home = 'lessons/3d-design/3d-design.html';
  const stages = [
    ['plan', 'Plan in 2D', 'Blueprint drafting', 'lessons/3d-design/cad-and-printing/blueprint-drafting.html'],
    ['foundation', 'Start here', 'Shared foundation', '#foundation'],
    ['real', 'Make it real', 'CAD → Forge → print', '#make-real'],
    ['look', 'Make it look', 'Model → sculpt → render', '#make-look'],
    ['play', 'Make it play', 'Game Asset Studio', '#make-play']
  ];
  // the open studio sits beside the tracks: any of them can be built in it
  const studio = ['workbench', 'Build anything', 'Workbench studio', 'workbench.html'];
  const references = {
    'blender-furniture-design.html': ['game-asset-furniture.html', 'Furniture'],
    'blender-environments.html': ['game-asset-modular-rooms.html', 'Modular rooms'],
    'blender-materials-render.html': ['game-asset-uv-export.html', 'UV, materials & export']
  };
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('assets/css/components/design3d-route.css', root).href;
  document.head.append(style);
  document.querySelectorAll('[data-design3d-route]').forEach(host => {
    host.classList.add('d3-route');
    const nav = document.createElement('nav'); nav.setAttribute('aria-label', '3D Design curriculum');
    const homeLink = document.createElement('a'); homeLink.href = new URL(home, root).href;
    homeLink.textContent = '3D Design · Curriculum home'; nav.append(homeLink);
    const list = document.createElement('ul');
    [...stages, studio].forEach(([id, title, sub, hash]) => {
      const li = document.createElement('li'), link = document.createElement('a');
      link.href = new URL(hash.startsWith('#') ? home + hash : hash, root).href;
      if (host.dataset.design3dRoute === id) link.setAttribute('aria-current', 'step');
      const strong = document.createElement('strong'), small = document.createElement('small');
      strong.textContent = title; small.textContent = sub; link.append(strong, small); li.append(link); list.append(li);
    });
    if (document.querySelector('[data-design3d-workshop]')) {
      const details=document.createElement('details'),summary=document.createElement('summary');
      const current=stages.find(s=>s[0]===host.dataset.design3dRoute);
      summary.textContent=(current?current[1]:'Reference')+' · choose a curriculum track';
      details.append(summary,list);nav.append(details);
    } else nav.append(list);
    host.append(nav);
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
}());
