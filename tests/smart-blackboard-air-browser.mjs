import { chooseShape, openControls } from './helpers/blackboard-studio.mjs';
// Camera pipeline test with a fake video device and controlled tracker output.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
function hand(point = false, dx = 0, dy = 0) {
  const lm = Array(21);
  lm[0] = { x: .5, y: .85, z: 0 };
  for (const [i,x] of [[5,.44],[9,.48],[13,.52],[17,.56]]) {
    lm[i] = {x,y:.65,z:0};
    const curled = point && i !== 5;
    let angle = -Math.PI/2, p = lm[i];
    for(let j=1;j<=3;j++) {
      if(curled && j>1) angle += (j===2?100:70)*Math.PI/180;
      const len = curled?.055:.07;
      p={x:p.x+Math.cos(angle)*len/(4/3),y:p.y+Math.sin(angle)*len,z:0};lm[i+j]=p;
    }
  }
  lm[1]={x:.46,y:.80,z:0};lm[2]={x:.43,y:.74,z:0};
  lm[3]=point?{x:.46,y:.70,z:0}:{x:.35,y:.72,z:0};
  lm[4]=point?{x:.48,y:.66,z:0}:{x:.28,y:.70,z:0};
  return lm.map(p=>({x:p.x+dx,y:p.y+dy,z:p.z}));
}
const browser=await chromium.launch({executablePath:findChromium(),headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try {
  const context=await browser.newContext({permissions:['camera'],viewport:{width:1440,height:1000}});
  const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.Hands=class {
      setOptions(){} onResults(callback){window.emitAirFrame=callback;}
      async send(){} async close(){}
    };
  });
  await page.goto('http://127.0.0.1:8080/lessons/mathematics/geometry-and-trigonometry/smart-blackboard.html');
  await chooseShape(page, 'circle');
  await page.locator('#btn-air-chalk').click();
  await page.waitForFunction(()=>!!window.emitAirFrame);
  await page.selectOption('#air-input-mode','point');
  await page.locator('#chk-air-commands').uncheck();
  async function emit(lm,count=8){await page.evaluate(async({lm,count})=>{for(let i=0;i<count;i++){window.emitAirFrame({multiHandLandmarks:lm?[lm]:[],multiHandedness:[{score:.99}]});await new Promise(r=>setTimeout(r,25));}},{lm,count});}
  const image=()=>page.locator('#chalk-canvas').evaluate(el=>el.toDataURL());
  const draw=async()=>{await emit(hand());await emit(hand(true));for(let i=0;i<12;i++)await emit(hand(true,-.015*i),1);await emit(hand());};
  await page.selectOption('#air-tool','ink');
  const before=await image(), radius=await page.locator('#val-m1').textContent();
  await draw();const ink=await image();assert.notEqual(ink,before,'Ink must render');
  assert.equal(await page.locator('#val-m1').textContent(),radius,'Ink cannot change circle geometry');
  await page.locator('#air-undo-ink').click();assert.equal(await image(),before);
  await draw();await page.locator('#air-clear-ink').click();assert.equal(await image(),before);
  await page.locator('#air-undo-ink').click();assert.notEqual(await image(),before);
  await page.selectOption('#air-tool','erase');await draw();assert.equal(await image(),before,'Eraser removes annotation strokes');
  await page.locator('#air-undo-ink').click();assert.notEqual(await image(),before,'Erasing is undoable');
  await page.selectOption('#air-tool','laser');const laserBefore=await image();await draw();assert.equal(await image(),laserBefore,'Laser leaves board unchanged');
  await page.selectOption('#air-tool','ink');await page.locator('#air-pause').click();const paused=await image();await draw();assert.equal(await image(),paused);await page.locator('#air-pause').click();
  await chooseShape(page, '3d-cone', 'air');await page.selectOption('#air-3d-action','unfold');
  await emit(hand());await emit(hand(true));for(let i=0;i<12;i++)await emit(hand(true,-.015*i),1);
  assert.ok(Number(await page.locator('#unfold-slider').inputValue())>5,'Air action must open net');
  await emit(hand());
  await page.selectOption('#air-3d-action','slice');await emit(hand());await emit(hand(true));await emit(hand(true,0,-.15),12);
  assert.match(await page.locator('#air-coach').textContent(),/unavailable/,'Slicing unfolded net gives guidance');
  await emit(hand());await page.locator('#unfold-slider').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input'));});
  await emit(hand(true));await emit(hand(true,0,-.15),12);
  assert.ok(Number(await page.locator('#slice-slider').inputValue())>5,'Air slice action moves plane');
  await emit(hand());
  await page.locator('#air-tools-title').evaluate(el=>el.parentElement.querySelector('details').open=true);
  await page.locator('#air-calibrate').click();await emit(hand(true,.15,-.10));await page.locator('#air-calibrate-capture').click();
  await emit(hand(true,-.15,.10));await page.locator('#air-calibrate-capture').click();assert.match(await page.locator('#air-calibration-help').textContent(),/Reach calibrated/);
  await page.locator('#air-reset-settings').click();assert.match(await page.locator('#air-calibration-help').textContent(),/Default reach restored/);
  await emit(null,12);assert.match(await page.locator('#air-coach').textContent(),/Hand not tracked/);
  await page.locator('#btn-air-close').click();assert.equal(await page.locator('#btn-air-chalk').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>[...document.getElementById('air-video').srcObject.getTracks()].every(t=>t.readyState==='ended')),true);
  assert.deepEqual(errors,[]);
  console.log('Air Chalk browser checks passed: camera lifecycle, ink/eraser/undo, laser, pause, unfolding, slicing, calibration and tracking loss.');
}finally{await browser.close();}
