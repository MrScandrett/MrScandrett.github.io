/* LeversCore: the DOM-free physics of the Levers lesson (lessons/physics/mechanics/levers.html).
 * torques() is the Balance Lab's law of the lever on its 8 m beam; launch() is the catapult's release speed and
 * projectile flight. Both are the expressions the page's update() and calc() used inline, lifted out with the
 * slider reads left behind; levers.js needs this file first. Tested in tests/levers-core.test.mjs. */
  var LeversCore = (function () {
    const PIVOT_XM=-0.60,PIVOT_YM=0.90,G=9.81;

    /* s = { fp: fulcrum position from the load end (m), w: load (N), e: effort (N) } */
    function torques(s){
      const dl=s.fp,de=8-s.fp,tl=s.w*dl,te=s.e*de,delta=(te-tl)/Math.max(te,tl);
      return{dl,de,tl,te,delta};
    }

    /* a: arm length (cm), A: release angle (deg), p: pull-back (%), m: projectile mass (g) */
    function launch(a,A,p,m){
      const v=8.2*(a/40)*Math.sqrt(p/60)*Math.sqrt(5/m),rad=A*Math.PI/180,g=G;
      const armM=0.85*(a/40);
      const x0=PIVOT_XM+Math.cos(rad)*armM,h0=PIVOT_YM+Math.sin(rad)*armM;
      const vx=v*Math.cos(rad),vy=v*Math.sin(rad);
      const t=(vy+Math.sqrt(vy*vy+2*g*h0))/g,r=Math.max(0,x0+vx*t);
      return{a,A,p,m,v,vx,vy,t,r,rad,x0,h0,armM,g};
    }

    return {
      PIVOT_XM, PIVOT_YM, G, torques, launch
    };
  })();
