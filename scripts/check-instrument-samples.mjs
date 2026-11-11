// Browser audio QA: decode every bundled sample and render every instrument offline.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
const manifest=JSON.parse(await readFile(new URL('../assets/audio/instruments/manifest.json',import.meta.url)));
let files=0,bytes=0;
for(const bank of Object.values(manifest.banks))for(const sample of bank.roots) {
 const contents=await readFile(new URL('../assets/audio/instruments/'+sample.file,import.meta.url));
 assert.equal(createHash('sha256').update(contents).digest('hex'),sample.sha256);bytes+=contents.length;files++;
}
assert.ok(bytes<8*1024*1024,'whole bank stays below 8 MiB');
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
try {
 const page=await browser.newPage();
 await page.goto((process.env.SCORE_TEST_URL||'http://127.0.0.1:8080')+'/lessons/music/pioneers/charlie-parker.html');
 await page.waitForFunction(()=>!!document.querySelector('#bv-score').scorePlayer);
 await page.addScriptTag({url:(process.env.SCORE_TEST_URL||'http://127.0.0.1:8080')+'/assets/js/lessons/fake-book-pitch.js'});
 const results=await page.evaluate(async banks=>{
  const result=[];
  for(const [instrument,bank] of Object.entries(banks)) {
   const context=new OfflineAudioContext(1,44100,44100);
   const report=await MusicSynth.prepare(context,[{instrument,pitches:bank.roots.map(r=>r.midi)}]);
   const pitch=bank.roots[Math.floor(bank.roots.length/2)].midi;
   const voice=MusicSynth.startVoice(context,context.destination,instrument,pitch,.7,0);
   if(!voice.sampled)throw new Error(instrument+': sample unavailable');
   voice.release(.55);
   const audio=await context.startRendering(), data=audio.getChannelData(0);
   let peak=0,energy=0,tail=0;
   for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i>data.length*.98)tail=Math.max(tail,Math.abs(data[i]));}
   const detected=FakeBookPitch.detect(data.slice(6000,14192),44100,{minHz:30,maxHz:4000,gate:.00001});
   result.push({instrument,pitch,detected:detected&&detected.midi,loaded:report.loaded,expected:bank.roots.length,failed:report.failed,peak,rms:Math.sqrt(energy/data.length),tail,stats:MusicSampler.stats(context)});
  }
  // Canceling a future sampled attack must produce silence (voice stealing/Stop).
  const context=new OfflineAudioContext(1,44100,44100);await MusicSynth.prepare(context,[{instrument:'piano',pitches:[60]}]);
  const v=MusicSynth.startVoice(context,context.destination,'piano',60,.8,.5);v.kill(0);
  const cancelled=await context.startRendering();result.push({cancelledPeak:Math.max(...cancelled.getChannelData(0).map(Math.abs))});
  return result;
 },manifest.banks);
 for(const r of results) {
  if('cancelledPeak' in r){assert.equal(r.cancelledPeak,0);continue;}
  assert.equal(r.failed,0,r.instrument);assert.equal(r.loaded,r.expected,r.instrument);
  assert.ok(r.peak>.005 && r.peak<=1,r.instrument+': audible, unclipped');
  assert.ok(r.rms>.0005,r.instrument+': non-silent recording');
  assert.ok(r.detected !== null && Math.abs(r.detected-r.pitch)<.35,r.instrument+': recorded pitch agrees with root mapping');assert.ok(r.stats.bytes<=48*1024*1024,r.instrument+': bounded cache');
  // Sustained samples must stop after release; plucked recordings may retain their natural tail.
  if(manifest.banks[r.instrument].sustain)assert.ok(r.tail<.002,r.instrument+': release reaches silence');
  console.log(`${r.instrument}: ${r.loaded} recordings decoded, RMS ${r.rms.toFixed(4)}, peak ${r.peak.toFixed(3)}, pitch ${r.pitch}/${r.detected?.toFixed(2)}`);
 }
 console.log(`Audio QA passed: ${files} verified recordings, ${(bytes/1024/1024).toFixed(2)} MiB, 17 rendered instruments, canceled attacks silent.`);
}finally{await browser.close();}
