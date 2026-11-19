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
assert.ok(bytes<16*1024*1024,'whole bank stays below 16 MiB');
const browser=await chromium.launch({executablePath:findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),headless:true});
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
   const voice=MusicSynth.startVoice(context,context.destination,instrument,pitch,.7,0,null,{scoreExpression:true});
   if(!voice.sampled)throw new Error(instrument+': sample unavailable');
   voice.release(.55);
   const audio=await context.startRendering(), data=audio.getChannelData(0);
   let peak=0,energy=0,tail=0;
   for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i>data.length*.98)tail=Math.max(tail,Math.abs(data[i]));}
   const detected=FakeBookPitch.detect(data.slice(6000,14192),44100,{minHz:30,maxHz:4000,gate:.00001});
   // Every recorded root, played at its own label, must sound that pitch: a mislabelled
   // upstream file (clarinet "Fs6" that is really F6) detunes every note mapped to it.
   // Read sustained instruments after the attack (a bowed or blown attack scoops into pitch).
   const manifestSustain=name=>!!banks[name].sustain;
   const roots=[];
   if(instrument!=='timpani') for(const root of bank.roots) {
    const ctx=new OfflineAudioContext(1,44100,44100);
    await MusicSynth.prepare(ctx,[{instrument,pitches:[root.midi]}]);
    const v=MusicSynth.startVoice(ctx,ctx.destination,instrument,root.midi,.7,0,null,{scoreExpression:true});
    const buf=await ctx.startRendering(), d=buf.getChannelData(0);
    const found=FakeBookPitch.detect(d.slice(manifestSustain(instrument)?22050:4000,(manifestSustain(instrument)?22050:4000)+8192),44100,{minHz:25,maxHz:4500,gate:.00001});
    roots.push({midi:root.midi,detected:found&&found.midi});
   }
   result.push({instrument,pitch,roots,detected:detected&&detected.midi,loaded:report.loaded,expected:bank.roots.length,failed:report.failed,peak,rms:Math.sqrt(energy/data.length),tail,stats:MusicSampler.stats(context)});
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
  // Timpani's inharmonic decay makes autocorrelation track an octave-low partial.
  // Its playback roots follow the upstream SFZ mapping, with a wider drum tolerance.
  const pitchDifference = Math.abs(r.detected-r.pitch);
  const pitchError = r.instrument === 'timpani' ? Math.min(pitchDifference, Math.abs(pitchDifference-12)) : pitchDifference;
  assert.ok(r.detected !== null && pitchError < (r.instrument === 'timpani' ? .75 : .35),
    r.instrument+': recorded pitch agrees with root mapping');
  for(const root of r.roots) {
   // Octave slips are a detector limit on very low or very high notes, and plucked strings can
   // lock onto their 3rd or 4th harmonic (+19, +24); a wrong label is off by a non-harmonic step.
   if(root.detected===null||root.detected===undefined) continue;
   const slips=manifest.banks[r.instrument].sustain?[0,12]:[0,12,19,24];
   const off=root.detected-root.midi, err=Math.min(...slips.map(k=>Math.abs(Math.abs(off)-k)));
   assert.ok(err<.35,`${r.instrument} root ${root.midi}: sounds ${root.detected.toFixed(2)} (wrong label or tuning)`);
  }
  assert.ok(r.stats.bytes<=96*1024*1024,r.instrument+': bounded cache');
  // Sustained samples must stop after release; plucked recordings may retain their natural tail.
  if(manifest.banks[r.instrument].sustain)assert.ok(r.tail<.002,r.instrument+': release reaches silence');
  console.log(`${r.instrument}: ${r.loaded} recordings decoded, RMS ${r.rms.toFixed(4)}, peak ${r.peak.toFixed(3)}, pitch ${r.pitch}/${r.detected?.toFixed(2)}`);
 }
 // Verify a whole symphony's requested roots coexist in the bounded cache.
 const ensemble = await page.evaluate(async () => {
  const score = await ScoreEngine.loadScore('beethoven-symphony-7-allegretto');
  const model = ScoreEngine.prepare(score);
  ScoreEngine.analyse(model);
  const player = new ScoreEngine.Player(null, model);
  const context = new OfflineAudioContext(2, 44100, 44100);
  const report = await player.prepareSound(context, 'piano', false, true);
  const bankData = await fetch('/assets/audio/instruments/manifest.json').then(response => response.json());
  const seen = new Set(), missing = [];
  for (const note of player.notes) {
   const key = note.staff + ':' + note.midi;
   if (seen.has(key)) continue;
   seen.add(key);
   const instrument = player.sampleInstrument(note.staff);
   const voice = MusicSampler.startVoice(context, context.destination, instrument, note.midi, .7, 0);
   if (!voice) {
    const nearest = MusicSampler.nearest(bankData.banks[instrument].roots, note.midi);
    missing.push({ instrument, pitch: note.midi, distance: Math.abs(nearest.midi - note.midi) });
   }
   else voice.kill(0);
  }
  return { report, missing, stats: MusicSampler.stats(context) };
 });
 assert.equal(ensemble.report.failed, 0);
 assert.ok(ensemble.missing.every(note => note.distance > 7),
  'every orchestral pitch within the recorded range has its sample cached');
 assert.ok(ensemble.stats.bytes <= 96 * 1024 * 1024);
 console.log('Full symphony samples coexist in cache; all in-range pitches use recordings.');
 console.log(`Audio QA passed: ${files} verified recordings, ${(bytes/1024/1024).toFixed(2)} MiB, ${Object.keys(manifest.banks).length} rendered instruments, canceled attacks silent.`);
}finally{await browser.close();}
