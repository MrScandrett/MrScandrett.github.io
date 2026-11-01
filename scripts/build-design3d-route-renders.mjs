// Original, reproducible 3D teaching renders. No external models or textures.
// Run with the local server available: node scripts/build-design3d-route-renders.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.DESIGN3D_RENDER_URL || 'http://127.0.0.1:5501';
const out = new URL('../assets/images/lessons/design3d-visuals/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, deviceScaleFactor: 1 });
  await page.route(base + '/__design3d_render__', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0;background:#edf3f8"></body></html>' }));
  await page.goto(base + '/__design3d_render__');
  await page.evaluate(async baseURL => {
    const { THREE: T } = await import(baseURL + '/assets/vendor/three-bundle.min.js');
    const { createScene } = await import(baseURL + '/assets/js/sim-kit-three.mjs');
    window.drawStudy = async (kind, mobile = false) => {
      document.body.replaceChildren();
      const palettes = { teal: 0x16849a, gold: 0xe8b34b, navy: 0x294761, white: 0xf0f3f6, red: 0xc55649 };
      function mesh(geo, color, roughness = .42) {
        const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness, metalness: .12 }));
        m.castShadow = true; m.receiveShadow = true; return m;
      }
      function box(w,h,d,color,x=0,y=h/2,z=0) {
        const m=mesh(new T.BoxGeometry(w,h,d),color);m.position.set(x,y,z);return m;
      }
      function cylinder(r,h,color,x=0,y=h/2,z=0) {
        const m=mesh(new T.CylinderGeometry(r,r,h,64),color);m.position.set(x,y,z);return m;
      }
      function sleeve(outer,inner,height,color) {
        const shape=new T.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
        const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
        const m=mesh(new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:64}),color);
        m.rotation.x=-Math.PI/2;return m;
      }
      function holder(pencil=true,wide=true) {
        const g=new T.Group();g.add(box(wide?5:2.1,.35,wide?4:2.1,palettes.teal));
        const tube=sleeve(.91,.58,1.7,palettes.teal);tube.position.y=.35;g.add(tube);
        if(pencil){g.add(cylinder(.39,5.7,palettes.gold,0,3.3));
          const tip=mesh(new T.ConeGeometry(.39,.8,6),0xd9b588);tip.position.y=6.55;g.add(tip);
          const lead=mesh(new T.ConeGeometry(.13,.32,6),0x343b42);lead.position.y=6.98;g.add(lead);}
        return g;
      }
      function ruler(){const g=new T.Group();g.add(box(5.5,.12,.9,0xf4d38b));for(let i=0;i<23;i++)g.add(box(.025,.015,i%5===0?.58:.28,palettes.navy,-2.5+i*.23,.13,-.12));return g;}
      function room(cols,rows) {
        const g=new T.Group();for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){
          g.add(box(1.45,.16,1.45,0xcbd7e3,x*1.5,.08,z*1.5));
          if(z===0)g.add(box(1.46,1.5,.15,palettes.teal,x*1.5,.91,-.68));
          if(x===0)g.add(box(.15,1.5,1.46,palettes.navy,-.68,.91,z*1.5));}
        g.position.set(-(cols-1)*.75,0,-(rows-1)*.75);return g;
      }
      function owl() {
        const g=new T.Group();g.add(cylinder(1.35,.25,palettes.gold));const body=sleeve(1.2,.9,2.5,palettes.gold);body.position.y=.25;g.add(body);
        [-.48,.48].forEach(x=>{const eye=cylinder(.43,.12,palettes.white,x,1.9,1.08);eye.rotation.x=Math.PI/2;g.add(eye);
          const pupil=cylinder(.18,.15,palettes.navy,x,1.9,1.18);pupil.rotation.x=Math.PI/2;g.add(pupil);
          const ear=mesh(new T.ConeGeometry(.42,.8,3),palettes.gold);ear.position.set(x*1.8,3,.45);g.add(ear);});
        const beak=mesh(new T.ConeGeometry(.23,.5,3),0xb35b32);beak.rotation.x=Math.PI/2;beak.position.set(0,1.5,1.3);g.add(beak);return g;
      }
      function hinge(){const g=new T.Group();g.add(box(2.1,.25,3,palettes.teal,-1.15));
        const leaf=box(2.1,.25,3,palettes.gold,1.05);const pivot=new T.Group();pivot.add(leaf);pivot.rotation.z=.55;g.add(pivot);
        for(let i=0;i<5;i++){const ring=sleeve(.36,.18,.48,i%2?palettes.gold:palettes.teal);ring.rotation.x=Math.PI/2;ring.position.set(0,.34,-1.18+i*.59);g.add(ring);}
        const pin=cylinder(.13,3.15,palettes.navy,0,.34);pin.rotation.x=Math.PI/2;g.add(pin);
        [-1.65,1.65].forEach(z=>{const cap=cylinder(.3,.15,palettes.navy,0,.34,z);cap.rotation.x=Math.PI/2;g.add(cap);});return g;}
      const studies = {
        hero: [['A holder with room to fit','One item. A wide base. An opening.',()=>holder()]],
        prototype: [
          ['1. Measure your item','Use your pencil and a ruler.',()=>{const g=new T.Group();const p=holder();p.children.slice(0,2).forEach(c=>p.remove(c));p.rotation.z=-Math.PI/2;p.position.set(-3.2,.55,0);p.scale.setScalar(.8);g.add(p);const r=ruler();r.position.z=1.3;g.add(r);return g;}],
          ['2. Build the holder','Leave room around the item.',()=>holder(false)],
          ['3. Test and change','Check fit, then check stability.',()=>holder()]],
        views: [
          ['Perspective view','See the depth and the opening.',()=>holder(false),'perspective'],
          ['Top view','See the opening and base width.',()=>holder(false),'top'],
          ['Front view','See the height and base width.',()=>holder(false),'front']],
        clearance: [0,.15,.57].map((gap,i)=>[
          ['Too tight','Working gap','Too loose'][i],['Touching parts can fuse.','Empty space lets parts turn.','Extra space can cause wobble.'][i],()=>{
            const g=new T.Group();const outer=sleeve(2,1.3,1.1,palettes.teal);g.add(outer);
            g.add(cylinder(1.3-gap,1.1,[palettes.red,palettes.gold,palettes.gold][i],i===2?.35:0));return g;},'close']),
        materials: [1,.4,.08].map((r,i)=>[['Rough','Satin','Polished'][i],['Soft, spread-out highlight','Smaller, brighter highlight','Sharp reflection'][i],()=>{
          const m=mesh(new T.SphereGeometry(1.6,80,64),palettes.teal,r);m.position.y=1.6;return m;},'material']),
        rooms: [
          ['One reusable kit','Floor tiles and matching walls',()=>{const g=new T.Group();g.add(box(1.6,.2,1.6,0xcbd7e3,-1.5));g.add(box(1.6,1.5,.18,palettes.teal,1.1,.75,-.5));g.add(box(.18,1.5,1.6,palettes.navy,1.1,.75,1));return g;}],
          ['Layout A','Two tiles wide, two tiles deep',()=>room(2,2)],
          ['Layout B','Three tiles wide, two tiles deep',()=>room(3,2)]],
        trio: [
          ['Moves','A hinge turns; its pin stays inside.',hinge],
          ['Useful','A holder keeps a pencil upright.',()=>{const h=holder();h.scale.setScalar(.7);return h;}],
          ['Likeness','An owl cup has a readable outline.',owl]]
      };
      const panels=studies[kind];const single=panels.length===1;
      const stage=document.createElement('div');stage.id='render-stage';stage.style.cssText=`display:grid;grid-template-columns:repeat(${mobile?1:panels.length},1fr);grid-template-rows:repeat(${mobile?panels.length:1},minmax(0,1fr));gap:18px;padding:24px;width:${mobile?640:1440}px;height:${mobile?1920:single?1040:680}px;box-sizing:border-box;font-family:Arial,sans-serif;color:#173149;background:#edf3f8`;
      document.body.append(stage);
      for(const [title,subtitle,make,view] of panels){
        const panel=document.createElement('div');panel.style.cssText='min-width:0;background:#f9fbfd;display:grid;grid-template-rows:auto 1fr auto;border:1px solid #a7bacb;border-radius:14px;overflow:hidden';
        const heading=document.createElement('h2');heading.textContent=title;heading.style.cssText='margin:24px 24px 0;font-size:30px;line-height:1.2';
        const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%;min-height:0;display:block';
        const sub=document.createElement('p');sub.textContent=subtitle;sub.style.cssText='font-size:24px;line-height:1.4;margin:10px 24px 24px';panel.append(heading,canvas,sub);stage.append(panel);
        const setup=createScene(canvas,{THREE:T,preserveDrawingBuffer:true});const {scene,renderer}=setup;setup.syncSize();
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;scene.background=new T.Color(0xf9fbfd);
        scene.add(new T.HemisphereLight(0xdcecff,0x7e8e9f,2.1));
        const light=new T.DirectionalLight(0xfff2df,4);light.position.set(-4,10,7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-10;light.shadow.camera.right=10;light.shadow.camera.top=10;light.shadow.camera.bottom=-10;light.shadow.normalBias=.03;scene.add(light);
        const fill=new T.DirectionalLight(0xc1dcff,1.3);fill.position.set(5,4,-4);scene.add(fill);
        // The same reflected studio softbox is used for each roughness comparison.
        if(view==='material'){
          const studio=new T.Scene();studio.background=new T.Color(0x798b9d);
          [[-3,4,3,3,5],[4,1,2,1,4]].forEach(([x,y,z,w,h])=>{const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);});
          const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(studio);scene.environment=env.texture;pmrem.dispose();
        }
        const floor=mesh(new T.PlaneGeometry(200,200),0xe8eff5,.9);floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.castShadow=false;scene.add(floor);
        const model=make();scene.add(model);model.updateMatrixWorld(true);
        const bounds=new T.Box3().setFromObject(model);const center=bounds.getCenter(new T.Vector3());const size=bounds.getSize(new T.Vector3());
        const aspect=canvas.clientWidth/canvas.clientHeight;const span=Math.max(size.y,size.x/Math.min(aspect,1),size.z)*(kind==='rooms'?1.65:1.35);
        const camera=new T.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,200);
        const direction=view==='top'?new T.Vector3(0,1,.0001):view==='front'?new T.Vector3(0,0,1):new T.Vector3(7,6,9).normalize();
        if(view==='top')camera.up.set(0,0,-1);
        camera.position.copy(center).addScaledVector(direction,35);camera.lookAt(center);renderer.render(scene,camera);
      }
      await document.fonts.ready;
    };
  },base);
  for(const kind of ['hero','prototype','views','clearance','materials','rooms','trio']) {
    for (const mobile of kind === 'hero' ? [false] : [false,true]) {
      await page.evaluate(({kind,mobile})=>window.drawStudy(kind,mobile),{kind,mobile});
      const png=await page.locator('#render-stage').screenshot();
      const name=`route-${kind}${mobile?'-mobile':''}.webp`;
      await sharp(png).webp({quality:88}).toFile(fileURLToPath(new URL(name,out)));
      console.log(`Rendered ${name}`);
    }
  }
} finally { await browser.close(); }
