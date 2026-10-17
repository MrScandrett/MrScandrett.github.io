import pa11y from 'pa11y';
import {findChromium} from './lib/find-chromium.mjs';
for(const slug of ['mars','earth','asteroid-belt','kuiper-belt']){
 const r=await pa11y(`http://localhost:8080/lessons/cosmology/solar-system/${slug}.html`,{chromeLaunchConfig:{executablePath:findChromium(),args:['--no-sandbox']},timeout:60000,wait:1000});
 console.log(slug,JSON.stringify(r.issues.map(i=>({code:i.code,message:i.message,selector:i.selector}))))
}
