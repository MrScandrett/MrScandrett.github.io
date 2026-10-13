/* Lazy-loaded lava surface. Simulation units are CSS pixels and seconds. */
(function () {
  'use strict';
  // Theme identity and colors come from the existing registry, never a second preference.
  function themeAppearance() {
    var registry = window.ClassroomOSThemeRegistry;
    var id = document.documentElement.dataset.theme || 'day';
    var theme = registry ? registry.get(id) : { id: id, swatch: [], accentRGB: [0,113,227] };
    var accent = theme.accentRGB.map(function (v) { return v / 255; });
    var swatch = theme.swatch.map(function (hex) {
      var value = parseInt(hex.slice(1), 16);
      return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
    });
    return { id: theme.id, look: theme.id === 'vaporwave' ? 1 : theme.id === 'mandelbrot' ? 3 : 0,
      accent: accent, secondary: swatch[swatch.length - 1] || accent,
      base: swatch[0] || accent, wax: swatch.length > 2 ? swatch.slice(1) : [accent, swatch[swatch.length - 1] || accent] };
  }
  function create() {
    var surface = document.createElement('canvas');
    var gl = surface.getContext('webgl', { alpha: false, antialias: false, depth: false });
    if (!gl || !window.LiquidEngine || !window.LiquidEngine.ThermalBlobs) return null;
    var vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fragment = `precision mediump float;
    uniform vec2 size; uniform float time; uniform int look; uniform int count;
    uniform vec4 balls[24]; uniform vec3 colors[24];
    uniform vec3 accent; uniform vec3 secondary; uniform vec3 base;
    void main(){
      vec2 uv=gl_FragCoord.xy/size; vec2 p=vec2(uv.x,1.-uv.y)*size;
      p.x+=sin(p.y*.04+time*2.)*2.*pow(uv.y,8.);
      float field=0.;vec2 grad=vec2(0.);vec3 tint=vec3(0.);
      for(int i=0;i<24;i++){if(i<count){vec2 d=p-balls[i].xy;float r=balls[i].w;d.x*=r/balls[i].z;float q=dot(d,d)+r*r*.16;float f=r*r/q;field+=f;grad+=-2.*r*r*d*vec2(r/balls[i].z,1.)/(q*q);tint+=colors[i]*f;}}
      tint/=max(field,.001);
      if(look==0)tint=mix(accent,secondary,uv.y*.35);
      float heater=exp(-pow((uv.x-.5)*2.,2.))*pow(1.-uv.y,8.);
      vec3 bg=base*.035+accent*.12*heater;
      if(look==1){bg=base*.06+accent*.07*(.5+.5*sin(uv.y*22.))*smoothstep(.3,.8,uv.y);float grid=pow(max(0.,cos(uv.x*60./max(.2,uv.y))),24.)*pow(1.-uv.y,5.);bg+=secondary*.1*grid;tint=mix(accent,secondary,uv.y);}
      if(look==3){bg=base*.05+accent*.025*(.5+.5*sin(uv.x*10.+sin(uv.y*8.+time*.1)));}
      float edge=exp(-max(0.,field-1.)*1.5);
      vec3 normal=normalize(vec3(-grad*(size.y/5.3),.65));
      float gloss=pow(max(0.,dot(normal,normalize(vec3(-.5,.7,1.)))),18.);
      vec3 wax=tint*(.5+.3*edge)+tint*heater*.7+secondary*edge*.18+mix(accent,secondary,.5)*gloss*.55;
      if(look==1)wax+=secondary*edge*.5;
      if(look==3)wax=tint*(.65+.25*step(.5,fract(field*2.5)));
      float mask=smoothstep(.96,1.04,field);vec3 col=mix(bg,wax,mask);
      if(look==1){col*=.96+.04*sin(gl_FragCoord.y*3.+time*.3);col+=accent*.004*(1.+sin(uv.y*90.+time*1.5))+secondary*.004*(1.+sin(uv.y*90.+time*1.5+.4));}
      gl_FragColor=vec4(col,1.);
    }`;
    function shader(type, source) { var s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var program;
    try { program = gl.createProgram(); gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null; } catch (_) { return null; }
    gl.useProgram(program);
    var buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    var attr = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    var locations = {}; ['size','time','look','count','balls','colors','accent','secondary','base'].forEach(function (n) { locations[n] = gl.getUniformLocation(program,n); });
    // Wax physics (heating, buoyancy, merging, splitting) is LiquidEngine.ThermalBlobs; this file only renders it.
    var blobs=new window.LiquidEngine.ThermalBlobs({count:8}), width=0,height=0, last=null, lastDraw=0, slow=0, frames=0, costs=[], renderScale=.5;

    function resize(w,h) {
      blobs.resize(w,h);
      width=w;height=h;surface.width=Math.max(1,Math.round(w*renderScale));surface.height=Math.max(1,Math.round(h*renderScale));gl.viewport(0,0,surface.width,surface.height);
    }
    surface.addEventListener('webglcontextlost',function(e){e.preventDefault(); api.failed=true;});
    var api={failed:false,resize:resize,pause:function(){last=null;blobs.pause();},stats:function(){return {frames:frames,steps:blobs.steps,seconds:blobs.seconds,bodies:blobs.bodies.length,area:blobs.area(),fpsCap:slow>12?30:60,resolutionScale:renderScale,renderMsP95:costs.length?costs.slice().sort(function(a,b){return a-b;})[Math.floor((costs.length-1)*.95)]:0};},draw:function(ctx,w,h,now,mouse){
      if(api.failed)return false;if(w!==width||h!==height)resize(w,h);
      if(last===null)last=now;blobs.update((now-last)/1000,mouse);last=now;var elapsed=blobs.seconds;
      if(now-lastDraw<(slow>12?1000/30:1000/60)-1){ctx.drawImage(surface,0,0,w,h);return true;}lastDraw=now;
      var begin=performance.now(), data=new Float32Array(96),colors=new Float32Array(72),n=0, appearance=themeAppearance();
      blobs.bodies.forEach(function(b){var tail=Math.min(b.r*.85,Math.abs(b.vy)*.7);for(var k=0;k<2;k++){data.set([b.x*renderScale,(b.y+(k?tail*(b.vy<0?1:-1):0))*renderScale,b.r*(k?.55:.88)*renderScale,b.r*(k?.55:.88)*renderScale],n*4);colors.set(appearance.wax[0].map(function(c,i){return c*b.mix[0]+appearance.wax[1%appearance.wax.length][i]*b.mix[1];}),n*3);n++;}});
      // Pool belongs to the same field, so rising bodies form necks before release.
      for(var i=0;i<8;i++){data.set([(i+.5)*w/8*renderScale,(h+12+Math.sin(elapsed+i)*5)*renderScale,Math.max(w/8,50)*renderScale,48*renderScale],n*4);colors.set(appearance.accent,n*3);n++;}
      gl.uniform2f(locations.size,surface.width,surface.height);gl.uniform1f(locations.time,elapsed);gl.uniform1i(locations.look,appearance.look);gl.uniform3fv(locations.accent,appearance.accent);gl.uniform3fv(locations.secondary,appearance.secondary);gl.uniform3fv(locations.base,appearance.base);gl.uniform1i(locations.count,n);gl.uniform4fv(locations.balls,data);gl.uniform3fv(locations.colors,colors);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(surface,0,0,w,h);frames++;var cost=performance.now()-begin;costs.push(cost);if(costs.length>120)costs.shift();slow=cost>25?slow+1:Math.max(0,slow-1);if(cost>40 && slow>3 && renderScale>.125){renderScale=Math.max(.125,renderScale*.5);resize(w,h);costs=[];}return true;
    }};return api;
  }
  window.ClassroomOSLava={create:create};
})();
