import { THREE, OrbitControls, OBJLoader } from '../../vendor/three-bundle.min.js';
import { createScene } from '../../js/sim-kit-three.mjs';

const main = document.querySelector('[data-bible-lesson="sermon-on-the-mount"]');
const canvas = document.querySelector('#sermonScene');
const sceneLayer = document.querySelector('.som-scene');
const toggle = document.querySelector('.som-scene-toggle');
const progress = document.querySelector('.som-rose-progress');
const currentLabel = document.querySelector('.som-slide-current');
const totalLabel = document.querySelector('.som-slide-total');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const slideNames = ['Welcome','The bigger picture','The Galilean setting','Question and goals','Read in context','Geographic context','People and sources','Four study lenses','Practice and respond'];
const slides = Array.from(main.children).filter((child) => !child.classList.contains('bpl-back') && !child.classList.contains('bpl-nav'));

slides.forEach((slide, index) => {
  slide.classList.add('som-slide');
  slide.dataset.slide = String(index + 1);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'som-slide-dot';
  button.setAttribute('aria-label', `Slide ${index + 1}: ${slideNames[index] || 'Lesson section'}`);
  button.addEventListener('click', () => slide.scrollIntoView({ behavior:reduceMotion ? 'auto' : 'smooth', block:'start' }));
  progress.append(button);
});

const dots = Array.from(progress.children);
totalLabel.textContent = String(slides.length);
function setActiveSlide(index) {
  const safeIndex = Math.max(0,Math.min(slides.length - 1,index));
  currentLabel.textContent = String(safeIndex + 1);
  dots.forEach((dot,dotIndex) => dot.setAttribute('aria-current',dotIndex === safeIndex ? 'true' : 'false'));
  document.body.style.setProperty('--som-slide-progress',String(safeIndex / Math.max(1,slides.length - 1)));
}
setActiveSlide(0);
const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setActiveSlide(slides.indexOf(visible.target));
},{ rootMargin:'-28% 0px -46% 0px', threshold:[0,.15,.4,.7] });
slides.forEach((slide) => observer.observe(slide));

let sceneFocused = false;
function setSceneFocus(active) {
  sceneFocused = active;
  document.body.classList.toggle('is-scene-focus',active);
  toggle.setAttribute('aria-pressed',String(active));
  toggle.textContent = active ? 'Return to the lesson' : 'Explore the 3D scene';
}
toggle.addEventListener('click',() => setSceneFocus(!sceneFocused));
document.addEventListener('keydown',(event) => { if (event.key === 'Escape' && sceneFocused) setSceneFocus(false); });

try {
  const { renderer,scene,camera,syncSize } = createScene(canvas,{ THREE,fov:34,near:.01,far:50,clearColor:0x070b18,clearAlpha:1,maxDpr:1.75 });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  camera.position.set(.02,.02,3.35);
  const controls = new OrbitControls(camera,canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.minDistance = 1.8;
  controls.maxDistance = 5;
  controls.minPolarAngle = Math.PI * .25;
  controls.maxPolarAngle = Math.PI * .75;
  controls.target.set(0,0,0);
  controls.enabled = false;
  toggle.addEventListener('click',() => { controls.enabled = sceneFocused; });
  scene.add(new THREE.HemisphereLight(0xe8eeff,0x241428,2.2));
  const warmLight = new THREE.DirectionalLight(0xffdca1,2.4);
  warmLight.position.set(-2,3,4);
  scene.add(warmLight);
  const blueLight = new THREE.DirectionalLight(0x5a8bd6,1.35);
  blueLight.position.set(3,0,2);
  scene.add(blueLight);
  const [texture,model] = await Promise.all([
    new THREE.TextureLoader().loadAsync('../assets/models/sermon-on-the-mount/sermon-mount.webp'),
    new OBJLoader().loadAsync('../assets/models/sermon-on-the-mount/sermon-mount.obj')
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(2.25 / size.y);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshStandardMaterial({ map:texture,roughness:.72,metalness:0,side:THREE.DoubleSide });
  });
  scene.add(model);
  sceneLayer.classList.remove('is-loading');
  let lastTime = performance.now();
  function render(time) {
    const dt = Math.min(.05,(time - lastTime) / 1000);
    lastTime = time;
    syncSize();
    const slideProgress = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('--som-slide-progress')) || 0;
    if (!sceneFocused && !reduceMotion) {
      model.rotation.y += ((slideProgress - .5) * .18 - model.rotation.y) * Math.min(1,dt * 1.8);
      model.rotation.y += Math.sin(time * .00012) * .00012;
      model.position.y = Math.sin(time * .00018) * .012;
    }
    controls.update();
    renderer.render(scene,camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
} catch (error) {
  console.error('Sermon on the Mount scene failed to load:',error);
  sceneLayer.classList.remove('is-loading');
  sceneLayer.classList.add('is-error');
  toggle.disabled = true;
}
