import { THREE, OrbitControls, OBJLoader } from '../../vendor/three-bundle.min.js';
import { createScene } from '../../js/sim-kit-three.mjs';

const main = document.querySelector('[data-bible-lesson="sermon-on-the-mount"]');
const canvas = document.querySelector('#sermonScene');
const sceneLayer = document.querySelector('.som-scene');
const toggle = document.querySelector('.som-scene-toggle');
const progress = document.querySelector('.som-rose-progress');
const currentLabel = document.querySelector('.som-slide-current');
const totalLabel = document.querySelector('.som-slide-total');
const sceneStatus = document.querySelector('.som-scene-status');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sermonMap = [
  { chapter:'Matthew 5', title:'Kingdom character and deep righteousness', summary:'Jesus begins with blessing, gives His disciples a public vocation, and presses righteousness beneath minimum compliance into the heart and relationships.', units:[['5:1–12','Blessing','Who receives the kingdom’s surprising blessing?'],['5:13–20','Witness','How do visible deeds point beyond the disciple?'],['5:21–37','Reconciliation and integrity','How do anger, desire, and truthful speech reach beneath outward conduct?'],['5:38–48','Enemy love','What makes this love resemble the Father?']] },
  { chapter:'Matthew 6', title:'Hidden devotion and undivided trust', summary:'Giving, prayer, fasting, treasure, and anxiety reveal the audience a disciple seeks and the kingdom a disciple trusts.', units:[['6:1–4','Giving','Who is the action performed for?'],['6:5–18','Prayer and fasting','What does the repeated language about the Father reveal?'],['6:19–24','Treasure','What masters the heart and directs the eye?'],['6:25–34','Trust','How does seeking the kingdom reshape anxiety about tomorrow?']] },
  { chapter:'Matthew 7', title:'Discernment and practiced obedience', summary:'Jesus closes with relationships, prayer, discernment, two ways, two kinds of fruit, and two foundations.', units:[['7:1–12','Judgment, asking, and neighbor love','How do humility and the Golden Rule shape relationships?'],['7:13–23','Ways and fruit','What tests a claim of discipleship?'],['7:24–29','Two foundations','What is the difference between hearing and doing?']] }
];

function structureMarkup() {
  return `<section class="bpl-card som-structure" aria-labelledby="som-structure-title"><div class="som-section-head"><div><p class="bpl-label">Map the Sermon</p><h2 id="som-structure-title">Three chapters, one practiced way</h2></div><p>Choose a chapter, follow its movement, then open a passage in the reader.</p></div><div class="som-structure-layout"><div class="som-chapter-tabs" role="tablist" aria-label="Chapters in the Sermon on the Mount">${sermonMap.map((chapter,index) => `<button type="button" role="tab" id="som-chapter-${index}" aria-controls="som-chapter-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-chapter="${index}"><span>${chapter.chapter}</span><strong>${chapter.title}</strong></button>`).join('')}</div><article class="som-chapter-panel" id="som-chapter-panel" role="tabpanel" aria-labelledby="som-chapter-0" tabindex="0" aria-live="polite"></article></div></section>`;
}

function contextMarkup() {
  return `<section class="bpl-card som-context" aria-labelledby="som-context-title"><div class="som-section-head"><div><p class="bpl-label">Read with care</p><h2 id="som-context-title">Setting, shape, and interpretation</h2></div><p>Separate what Matthew states from later tradition and responsible comparison.</p></div><div class="som-context-grid"><article><h3>Audience and setting</h3><p>Matthew 5:1–2 presents Jesus going up the mountain, sitting, and teaching His disciples, while the crowds remain part of the wider scene. Matthew does not name the exact hillside.</p></article><article><h3>A connected sermon</h3><p>The Beatitudes frame kingdom life; the middle chapters join action, motive, relationship, devotion, and trust; the conclusion demands hearing that becomes practice. Read the teachings as a movement, not isolated slogans.</p></article><article><h3>Matthew and Luke</h3><p>Luke 6:17–49 contains closely related teaching in a shorter sermon set on a level place. Compare shared sayings and each Gospel’s literary setting before proposing how the accounts relate.</p></article><article><h3>Interpretive humility</h3><p>Christian traditions differ on how particular commands relate to disciples, churches, civil life, and the kingdom’s future. Begin with textual evidence, name assumptions, and do not use a difficult saying to excuse harm.</p></article></div></section>`;
}

const reader = main.querySelector('.bpl-reader');
reader.insertAdjacentHTML('beforebegin', structureMarkup() + contextMarkup());

const entitySection = main.querySelector('.bpl-entities');
if (entitySection) {
  const content = entitySection.innerHTML;
  entitySection.innerHTML = `<details class="som-sources"><summary><span>Sources and context</span><strong>Open people, places, and reference images</strong></summary><div class="som-sources-content">${content}</div></details>`;
}

const passageSelect = main.querySelector('.bpl-passage-select');
const chapterPassageIndexes = [[0,1,2,3],[4,5],[6,7,8]];
const chapterTabs = Array.from(main.querySelectorAll('[data-chapter]'));
const chapterPanel = main.querySelector('.som-chapter-panel');

function selectChapter(index, moveFocus = false) {
  const chapter = sermonMap[index];
  chapterTabs.forEach((button, buttonIndex) => { const active = buttonIndex === index; button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1; });
  chapterPanel.setAttribute('aria-labelledby',`som-chapter-${index}`);
  chapterPanel.innerHTML = `<p class="som-chapter-kicker">${chapter.chapter}</p><h3>${chapter.title}</h3><p>${chapter.summary}</p><ol>${chapter.units.map((unit,unitIndex) => `<li><button type="button" data-reader-index="${chapterPassageIndexes[index][Math.min(unitIndex,chapterPassageIndexes[index].length - 1)]}"><span>${unit[0]}</span><strong>${unit[1]}</strong><small>${unit[2]}</small></button></li>`).join('')}</ol>`;
  chapterPanel.querySelectorAll('[data-reader-index]').forEach((button) => button.addEventListener('click',() => { passageSelect.selectedIndex = Number(button.dataset.readerIndex); passageSelect.dispatchEvent(new Event('change')); reader.scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth',block:'start'}); window.setTimeout(() => passageSelect.focus(),reduceMotion ? 0 : 450); }));
  if (moveFocus) chapterTabs[index].focus();
}
chapterTabs.forEach((button,index) => {
  button.addEventListener('click',() => selectChapter(index));
  button.addEventListener('keydown',(event) => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? chapterTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + chapterTabs.length) % chapterTabs.length; selectChapter(next,true); });
});
selectChapter(0);

let slides = [];
let dots = [];
function slideName(slide,index) { if (slide.classList.contains('bpl-hero')) return 'Welcome'; const heading = slide.querySelector('h2,h1,summary strong'); if (heading) return heading.textContent.trim(); const caption = slide.querySelector('figcaption p,figcaption'); return caption ? caption.textContent.trim().split(/[.!?]/)[0] : `Lesson section ${index + 1}`; }
function buildSlideNavigation() {
  progress.replaceChildren();
  slides = Array.from(main.children).filter((child) => !child.classList.contains('bpl-back') && !child.classList.contains('bpl-nav'));
  slides.forEach((slide,index) => { slide.classList.add('som-slide'); slide.dataset.slide = String(index + 1); const button = document.createElement('button'); button.type = 'button'; button.className = 'som-slide-dot'; button.setAttribute('aria-label',`Section ${index + 1}: ${slideName(slide,index)}`); button.title = slideName(slide,index); button.addEventListener('click',() => slide.scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth',block:'start'})); progress.append(button); });
  dots = Array.from(progress.children); totalLabel.textContent = String(slides.length);
}
buildSlideNavigation();

let requestSceneRender = () => {};
function setActiveSlide(index) { const safeIndex = Math.max(0,Math.min(slides.length - 1,index)); currentLabel.textContent = String(safeIndex + 1); dots.forEach((dot,dotIndex) => dot.setAttribute('aria-current',dotIndex === safeIndex ? 'true' : 'false')); document.body.style.setProperty('--som-slide-progress',String(safeIndex / Math.max(1,slides.length - 1))); requestSceneRender(); }
setActiveSlide(0);
const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0]; if (visible) setActiveSlide(slides.indexOf(visible.target)); },{root:document.querySelector('.ll-sim'),rootMargin:'-28% 0px -46% 0px',threshold:[0,.15,.4,.7]});
slides.forEach((slide) => observer.observe(slide));

document.addEventListener('keydown',(event) => { if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return; if (!['PageUp','PageDown'].includes(event.key)) return; event.preventDefault(); const current = Math.max(0,dots.findIndex((dot) => dot.getAttribute('aria-current') === 'true')); const next = Math.max(0,Math.min(slides.length - 1,current + (event.key === 'PageDown' ? 1 : -1))); slides[next].scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth',block:'start'}); });

let sceneFocused = false;
function setSceneFocus(active) { sceneFocused = active; document.body.classList.toggle('is-scene-focus',active); toggle.setAttribute('aria-pressed',String(active)); toggle.textContent = active ? 'Return to the lesson' : 'Explore the 3D scene'; requestSceneRender(); if (!active) toggle.focus(); }
toggle.addEventListener('click',() => setSceneFocus(!sceneFocused));
document.addEventListener('keydown',(event) => { if (event.key === 'Escape' && sceneFocused) setSceneFocus(false); });

try {
  const assetRoot = new URL('../../models/sermon-on-the-mount/',import.meta.url);
  const { renderer,scene,camera,syncSize } = createScene(canvas,{THREE,fov:34,near:.01,far:50,clearColor:0x070b18,clearAlpha:1,maxDpr:1.75});
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; camera.position.set(.02,.02,3.35);
  const controls = new OrbitControls(camera,canvas); controls.enableDamping = true; controls.dampingFactor = .055; controls.enablePan = false; controls.minDistance = 1.8; controls.maxDistance = 5; controls.minPolarAngle = Math.PI * .25; controls.maxPolarAngle = Math.PI * .75; controls.target.set(0,0,0); controls.enabled = false;
  toggle.addEventListener('click',() => { controls.enabled = sceneFocused; });
  scene.add(new THREE.HemisphereLight(0xe8eeff,0x241428,2.2)); const warmLight = new THREE.DirectionalLight(0xffdca1,2.4); warmLight.position.set(-2,3,4); scene.add(warmLight); const blueLight = new THREE.DirectionalLight(0x5a8bd6,1.35); blueLight.position.set(3,0,2); scene.add(blueLight);
  const [texture,model] = await Promise.all([new THREE.TextureLoader().loadAsync(new URL('sermon-mount.webp',assetRoot).href),new OBJLoader().loadAsync(new URL('sermon-mount.obj',assetRoot).href)]);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy()); const bounds = new THREE.Box3().setFromObject(model); const center = bounds.getCenter(new THREE.Vector3()); const size = bounds.getSize(new THREE.Vector3()); model.position.sub(center); model.scale.setScalar(2.25 / size.y); model.traverse((child) => { if (child.isMesh) child.material = new THREE.MeshStandardMaterial({map:texture,roughness:.72,metalness:0,side:THREE.DoubleSide}); }); scene.add(model);
  sceneLayer.classList.remove('is-loading'); sceneLayer.dataset.sceneDescription = 'A rotatable stained-glass artwork of Jesus teaching gathered listeners. It is a later artistic interpretation, not a reconstruction of the Galilean hillside.'; if (sceneStatus) sceneStatus.textContent = 'Stained-glass interpretation ready';
  let frame = 0;
  function draw() { frame = 0; if (document.hidden) return; syncSize(); if (!sceneFocused) { const slideProgress = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('--som-slide-progress')) || 0; model.rotation.y = (slideProgress - .5) * .18; } controls.update(); renderer.render(scene,camera); if (sceneFocused && !reduceMotion) frame = requestAnimationFrame(draw); }
  requestSceneRender = () => { if (!frame) frame = requestAnimationFrame(draw); };
  controls.addEventListener('change',requestSceneRender); document.addEventListener('visibilitychange',requestSceneRender); window.addEventListener('resize',requestSceneRender,{passive:true}); requestSceneRender();
} catch (error) {
  console.error('Sermon on the Mount scene failed to load:',error); sceneLayer.classList.remove('is-loading'); sceneLayer.classList.add('is-error'); if (sceneStatus) sceneStatus.textContent = '3D scene unavailable; the lesson remains usable.'; toggle.disabled = true;
}
