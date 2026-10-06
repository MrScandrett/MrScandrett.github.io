const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MUSIC_TEST_URL || 'http://127.0.0.1:8080/';
const paths = [
  'lessons/music/sheet-music-trainer.html',
  'lessons/music/piano.html',
  'lessons/music/violin-fingerboard.html',
  'lessons/music/drums.html',
  'music-lab.html',
  'lessons/music/guitar.html',
  'lessons/music/music-modes-evolution.html',
  'lessons/music/beethoven.html',
  'lessons/technical-elements/cymatics.html',
  'lessons/physics/waves-and-sound/physics-of-music.html',
  'lessons/physics/waves-and-sound/do-atoms-make-music.html'
];
(async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for(const path of paths) {
      await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(await page.evaluate(() => typeof MusicNotation.note),'function',path);
      if(path.includes('sheet-music-trainer')) {
        for(let level=0;level<6;level++) {
          await page.locator('.stb-level').nth(level).click();
          for(const mode of ['id','build']) {
            await page.locator('.stb-drill-modes [data-drill$="-'+mode+'"]').click();
            const ids = await page.locator('.stb-drill:not(.is-locked)').evaluateAll(bs => bs.map(b => b.dataset.drill));
            for(const id of ids) {
              const btn=page.locator('.stb-drill[data-drill="'+id+'"]');
              await btn.click();
              assert.equal(await btn.getAttribute('aria-pressed'),'true');
              assert.equal(await page.locator('#stbStage svg').count(),1);
              assert.ok(await page.locator('#stbStage .mn-glyph').count());
            }
          }
        }
        await page.locator('.stb-level').nth(0).click();
        await page.locator('.stb-drill-modes [data-drill$="-id"]').click();
        await page.locator('.stb-drill[data-drill="note-id"]').click();
        await page.locator('#stbHintBtn').click();
        assert.ok(await page.locator('#stbHint').isVisible());
        await page.locator('#stbAnswers button').first().click();
        assert.ok(await page.locator('#stbNext').isVisible());
        await page.locator('#stbNext').click();
        await page.locator('.stb-drill-modes [data-drill$="-build"]').click();
        await page.locator('#stbStage svg').focus();
        await page.keyboard.press('ArrowUp');
        assert.ok(await page.locator('#stbGhost .stb-head-ghost').count());
        await page.keyboard.press('Enter');
        assert.ok(await page.locator('#stbStage .is-placed, #stbStage .is-good, #stbStage .is-bad').count());
        await page.locator('.stb-clef-map img').click();
        assert.ok(await page.locator('.photo-lightbox, #photo-lightbox, [role="dialog"]').first().isVisible());
        await page.keyboard.press('Escape');
      }
      if(path.includes('music/piano.html')) {
        const count = await page.evaluate(() => {
          const M=MusicNotation, P=PianoTheory; let count=0;
          const host=document.createElement('div');document.body.appendChild(host);
          for(let root=0;root<12;root++) for(const scale of P.SCALE_TYPES) {
            const names=M.spellPattern(M.fromMidi(60+root),scale.intervals,scale.degrees.map(d => Number(d.replace(/[^0-9]/g,''))-1));
            const notes=names.map((spelling,i) => ({absIndex:root+scale.intervals[i],spelling,dur:1}));
            P.renderStaff(host,notes,{showLabels:true});
            const labels=[...host.querySelectorAll('.pc-note-label')].map(n=>n.textContent);
            if(JSON.stringify(labels)!==JSON.stringify(names)) throw Error('Spelling mismatch');
            names.forEach((n,i) => {if(M.parsePitch(n).midi!==60+notes[i].absIndex)throw Error('Sound/notation mismatch');});
            const svg=host.querySelector('svg'), view=svg.viewBox.baseVal;
            for(const g of svg.querySelectorAll('.mn-glyph')) {
              const box=g.getBBox(),mat=g.transform.baseVal.consolidate().matrix;
              const y1=box.y*mat.d+mat.f,y2=(box.y+box.height)*mat.d+mat.f;
              if(Math.min(y1,y2)<-1 || Math.max(y1,y2)>view.height+1)throw Error('Clipped music glyph');
            }
            count++;
          }
          P.renderStaff(host,[{absIndex:0,dur:.5},{absIndex:2,dur:1.5,dotted:true},{absIndex:4,dur:4}]);
          if(host.querySelectorAll('.mn-stem').length!==2)throw Error('Whole note incorrectly has a stem');
          host.remove();return count;
        });
        console.log('Piano scale cases:',count);
        await page.locator('#pcPieceRow button').last().click();
        await page.locator('#pcPiecePlay').click();
        await page.waitForFunction(() => document.querySelector('.pc-note-group.is-current'));
        await page.locator('#pcPiecePlay').click();
      }
      if(path.includes('violin-fingerboard')) {
        await page.locator('#tab-range').click();
        assert.equal(await page.locator('#vlnStaff .mn-glyph.vln-notehead').count(),12);
      }
      if(path.includes('/drums')) {
        assert.ok(await page.locator('.dr-staff .mn-glyph').count());
        await page.locator('#drCardChoices button').first().click();
        await page.locator('#drCardNext').click();
      }
      if(path==='music-lab.html') {
        const cases = await page.evaluate(() => {
          let count=0;
          for(const key of Object.keys(NOTATION_KEYS)) {
            notationState.key=key;
            for(const clef of ['treble','bass','alto','soprano','grand']) {
              renderActiveChord([59,60,64,67,71,72],clef);
              if(!document.querySelector('#staffSystem .mn-glyph'))throw Error('Music Lab notation missing');
              count++;
            }
          }
          notationState.key='F#';
          if(getTheoryNote(65).pitchLabel!=='E♯')throw Error('F# major misspelled');
          notationState.key='Db';
          if(getNoteLayout(getTheoryNote(71),71).steps!==0)throw Error('Clef reference moved with key');
          notationState.key='C';renderActiveChord([60,64,67],'grand');return count;
        });
        console.log('Music Lab key/clef cases:',cases);
      }
      await page.setViewportSize({width:390,height:844});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth-innerWidth);
      console.log(path,'mobile overflow:',overflow);
      if(path.includes('sheet-music-trainer')) assert.ok(overflow<=1,'Trainer mobile overflow');
      await page.setViewportSize({width:1440,height:1000});
    }
    assert.deepEqual(errors,[],'Browser errors');
    console.log('Music notation browser regression passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e);process.exitCode=1; });
