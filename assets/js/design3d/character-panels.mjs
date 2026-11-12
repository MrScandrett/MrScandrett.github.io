// Keep the character's many controls manageable without changing saved projects.
export function setupCharacterPanels(host, id, onInspection) {
 const fieldset = host.querySelector('.d3w-controls > fieldset');
 const groups = [
  ['style', 'Style', ['artStyle','ears','muzzle','tail']],
  ['body', 'Body', ['height','shoulders','torso','waist','leg','arm','head']],
  ['face', 'Face', ['jaw','eyes','brows','nose','mouth']],
  ['hair', 'Hair', ['hair','hairStyle','hairPhysics','hairStiffness','hairDamping','hairWind']],
  ['outfit', 'Outfit', ['outfit']],
  ['color', 'Color', []]
 ];
 const nav = document.createElement('div');
 nav.className = 'character-categories';
 nav.setAttribute('role', 'group');
 nav.setAttribute('aria-label', 'Character feature categories');
 fieldset.querySelectorAll('.d3w-control-heading').forEach(n => n.remove());
 for (const [key, label, fields] of groups) {
  const panel = document.createElement('section');
  panel.id = `${id}-panel-${key}`;
  panel.className = 'character-panel';
  panel.hidden = key !== 'style';
  const heading = document.createElement('h3');
  heading.id = panel.id + '-title';
  heading.textContent = label === 'Body' ? 'Body and proportions' : label;
  panel.setAttribute('aria-labelledby', heading.id);
  panel.append(heading);
  for (const name of fields) panel.append(host.querySelector(`[data-param="${name}"]`).closest('.d3w-field'));
  if (key === 'style') {
   const input=panel.querySelector('[data-param="artStyle"]'),select=document.createElement('select');
   select.id=input.id;select.dataset.param='artStyle';
   select.innerHTML=['Rounded humanoid','Blocky character','3D stick figure','Anthropomorphic mascot','Sculpted game hero'].map((label,i)=>`<option value="${i}">${label}</option>`).join('');
   select.value=input.value;input.replaceWith(select);panel.querySelector('[data-slider="artStyle"]').hidden=true;
   const note=document.createElement('p');note.textContent='Switch shape language while keeping your proportions and colors. Ears, muzzle and tail apply to mascots. Hair and costume detail controls apply to rounded humanoids and sculpted game heroes; the other styles use simplified forms. Mascot tails and ears remain rigid in the starter rig.';panel.append(note);
  }
  if (key === 'color') for (const input of [...fieldset.querySelectorAll('[data-color]')]) {
   panel.append(fieldset.querySelector(`label[for="${input.id}"]`), input);
  }
  if(key==='hair'){
   const input=panel.querySelector('[data-param="hairPhysics"]'),select=document.createElement('select');
   select.id=input.id;select.dataset.param='hairPhysics';select.innerHTML='<option value="0">Off · sculpted hair</option><option value="1">On · simulated locks</option>';select.value=input.value;
   panel.querySelector(`label[for="${input.id}"]`).textContent='Dynamic hair';input.replaceWith(select);panel.querySelector('[data-slider="hairPhysics"]').hidden=true;
   const note=document.createElement('p');
   note.textContent='Turn on Dynamic hair for simulated locks with pinned roots and head collision. Hair volume controls length; hair style changes the groom. Adjust wind, stiffness and damping, then test a gust. This browser study uses a simplified strand solver; Blender has more detailed simulation and collision controls. JSON saves settings; OBJ captures a static pose.';
   const gust=document.createElement('button');gust.type='button';gust.textContent='Test a gust';gust.dataset.hairGust='';
   const motion=document.createElement('button');motion.type='button';motion.textContent='Play hair motion';motion.dataset.hairMotion='';motion.setAttribute('aria-pressed','false');panel.append(note,motion,gust);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-controls', panel.id);
  button.setAttribute('aria-pressed', String(!panel.hidden));
  button.addEventListener('click', () => {
   for (const p of fieldset.querySelectorAll('.character-panel')) p.hidden = p !== panel;
   for (const b of nav.children) b.setAttribute('aria-pressed', String(b === button));
  });
  nav.append(button);
  fieldset.append(panel);
 }
 fieldset.querySelector('legend').after(nav);
 const toolbar = document.createElement('div');
 toolbar.className = 'character-inspection';
 toolbar.setAttribute('role', 'group');
 toolbar.setAttribute('aria-label', 'Preview appearance');
 for (const [key, label] of [['shaded','Shaded'],['silhouette','Silhouette'],['wireframe','Wireframe']]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-pressed', String(key === 'shaded'));
  button.addEventListener('click', () => {
   for (const b of toolbar.children) b.setAttribute('aria-pressed', String(b === button));
   onInspection(key);
  });
  toolbar.append(button);
 }
 host.querySelector('.d3w-view').before(toolbar);
 // Refresh from project state, including presets, restored saves and undo/redo.
 return params => {
  const style = Math.round(params.artStyle), humanoid = style === 0 || style === 4;
  const mascot = style === 3;
  for (const name of ['ears','muzzle','tail','jaw','nose','mouth',
   'hair','hairStyle','hairPhysics','hairStiffness','hairDamping','hairWind','outfit']) {
   const input = host.querySelector(`[data-param="${name}"]`);
   const supported = ['ears','muzzle','tail'].includes(name) ? mascot : humanoid;
   const simulation = ['hairStiffness','hairDamping','hairWind'].includes(name);
   const visible = supported && (!simulation || Boolean(params.hairPhysics));
   input.closest('.d3w-field').hidden = !visible;
   for (const control of input.closest('.d3w-field').querySelectorAll('input, select')) control.disabled = !visible;
  }
  for (const key of ['hair','outfit']) {
   const panel = host.querySelector(`#${id}-panel-${key}`);
   const button = nav.querySelector(`[aria-controls="${panel.id}"]`);
   button.hidden = !humanoid;
   button.disabled = !humanoid;
   if (!humanoid && !panel.hidden) nav.firstElementChild.click();
  }
  for (const button of host.querySelectorAll('[data-hair-motion], [data-hair-gust]')) {
   button.hidden = !humanoid || !params.hairPhysics;
   button.disabled = button.hidden;
  }
  const skin = host.querySelector('[data-color="color"]');
  host.querySelector(`label[for="${skin.id}"]`).textContent = mascot ? 'Fur color' : style === 2 ? 'Figure color' : 'Skin tone';
 };

}
