(()=>{var Qu=0,sc=1,ed=2;var Bs=1,Po=2,Or=3,Br=0,Jt=1,kn=2,Vn=0,zs=1,ac=2,oc=3,lc=4,td=5;var zr=100,nd=101,id=102,rd=103,sd=104,ad=200,od=201,ld=202,cd=203,hd=204,ud=205,dd=206,pd=207,md=208,fd=209,gd=210,vd=211,_d=212,yd=213,xd=214,cc=0,hc=1,uc=2,Io=3,dc=4,pc=5,mc=6,fc=7,Md=0,Sd=1,bd=2,An=0,gc=1,vc=2,_c=3,Gr=4,yc=5,xc=6,Mc=7;var Sc=300,kr=301,Hi=302,Lo=303,Do=304,Gs=306,Wa=1e3,_i=1001,Xa=1002,pn=1003,Td=1004;var ks=1005;var kt=1006,No=1007;var Wi=1008;var on=1009,bc=1010,Tc=1011,Vr=1012,Uo=1013,ai=1014,gn=1015,Hn=1016,Fo=1017,Oo=1018,Hr=1020,Ec=35902,wc=35899,Ed=1021,wd=1022,Cn=1023,Ti=1026,Xi=1027,Bo=1028,zo=1029,ji=1030,Ac=1031;var Cc=1033,Go=33776,ko=33777,Vo=33778,Ho=33779,Rc=35840,Pc=35841,Ic=35842,Lc=35843,Dc=36196,Nc=37492,Uc=37496,Fc=37488,Oc=37489,Wo=37490,Bc=37491,zc=37808,Gc=37809,kc=37810,Vc=37811,Hc=37812,Wc=37813,Xc=37814,jc=37815,qc=37816,Yc=37817,Zc=37818,Jc=37819,$c=37820,Kc=37821,Qc=36492,eh=36494,th=36495,nh=36283,ih=36284,Xo=36285,rh=36286;var us=2300,ja=2301,Ha=2302,Wl=2303,Xl=2400,jl=2401,ql=2402;var sh=0,Ad=1,qi="",zt="srgb",ds="srgb-linear",ps="linear",Qe="srgb";var Fi=7680;var Cd=512,Rd=513,Pd=514,jo=515,Id=516,Ld=517,qo=518,Dd=519,Yl=35044,ah=35048;var oh="300 es",ni=2e3,xr=2001;function tm(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function ms(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Nd(){let i=ms("canvas");return i.style.display="block",i}var vu={},Mr=null;function lh(...i){let e="THREE."+i.shift();Mr?Mr("log",e,...i):console.log(e,...i)}function Ud(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ae(...i){let e="THREE."+(i=Ud(i)).shift();if(Mr)Mr("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Re(...i){let e="THREE."+(i=Ud(i)).shift();if(Mr)Mr("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Oi(...i){let e=i.join(" ");e in vu||(vu[e]=!0,Ae(...i))}function Fd(i,e,t){return new Promise(function(n,r){setTimeout(function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}},t)})}var Od={[cc]:1,[uc]:6,[dc]:7,[Io]:5,[hc]:0,[mc]:2,[fc]:4,[pc]:3},zn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}},Ot=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],_u=1234567,_r=Math.PI/180,Sr=180/Math.PI;function Yi(){let i=4294967295*Math.random()|0,e=4294967295*Math.random()|0,t=4294967295*Math.random()|0,n=4294967295*Math.random()|0;return(Ot[255&i]+Ot[i>>8&255]+Ot[i>>16&255]+Ot[i>>24&255]+"-"+Ot[255&e]+Ot[e>>8&255]+"-"+Ot[e>>16&15|64]+Ot[e>>24&255]+"-"+Ot[63&t|128]+Ot[t>>8&255]+"-"+Ot[t>>16&255]+Ot[t>>24&255]+Ot[255&n]+Ot[n>>8&255]+Ot[n>>16&255]+Ot[n>>24&255]).toLowerCase()}function Ve(i,e,t){return Math.max(e,Math.min(t,i))}function Zl(i,e){return(i%e+e)%e}function ls(i,e,t){return(1-t)*i+t*e}function vr(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Xt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(4294967295*i);case Uint16Array:return Math.round(65535*i);case Uint8Array:return Math.round(255*i);case Int32Array:return Math.round(2147483647*i);case Int16Array:return Math.round(32767*i);case Int8Array:return Math.round(127*i);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var ch={DEG2RAD:_r,RAD2DEG:Sr,generateUUID:Yi,clamp:Ve,euclideanModulo:Zl,mapLinear:function(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)},inverseLerp:function(i,e,t){return i!==e?(t-i)/(e-i):0},lerp:ls,damp:function(i,e,t,n){return ls(i,e,1-Math.exp(-t*n))},pingpong:function(i,e=1){return e-Math.abs(Zl(i,2*e)-e)},smoothstep:function(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e))*i*(3-2*i)},smootherstep:function(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e))*i*i*(i*(6*i-15)+10)},randInt:function(i,e){return i+Math.floor(Math.random()*(e-i+1))},randFloat:function(i,e){return i+Math.random()*(e-i)},randFloatSpread:function(i){return i*(.5-Math.random())},seededRandom:function(i){i!==void 0&&(_u=i);let e=_u+=1831565813;return e=Math.imul(e^e>>>15,1|e),e^=e+Math.imul(e^e>>>7,61|e),((e^e>>>14)>>>0)/4294967296},degToRad:function(i){return i*_r},radToDeg:function(i){return i*Sr},isPowerOfTwo:function(i){return!(i&i-1)&&i!==0},ceilPowerOfTwo:function(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))},floorPowerOfTwo:function(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))},setQuaternionFromProperEuler:function(i,e,t,n,r){let s=Math.cos,a=Math.sin,o=s(t/2),c=a(t/2),l=s((e+n)/2),h=a((e+n)/2),u=s((e-n)/2),p=a((e-n)/2),d=s((n-e)/2),f=a((n-e)/2);switch(r){case"XYX":i.set(o*h,c*u,c*p,o*l);break;case"YZY":i.set(c*p,o*h,c*u,o*l);break;case"ZXZ":i.set(c*u,c*p,o*h,o*l);break;case"XZX":i.set(o*h,c*f,c*d,o*l);break;case"YXY":i.set(c*d,o*h,c*f,o*l);break;case"ZYZ":i.set(c*f,c*d,o*h,o*l);break;default:Ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}},normalize:Xt,denormalize:vr},mh=class mh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ve(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};mh.prototype.isVector2=!0;var ie=mh,Zt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let c=n[r+0],l=n[r+1],h=n[r+2],u=n[r+3],p=s[a+0],d=s[a+1],f=s[a+2],m=s[a+3];if(u!==m||c!==p||l!==d||h!==f){let _=c*p+l*d+h*f+u*m;_<0&&(p=-p,d=-d,f=-f,m=-m,_=-_);let g=1-o;if(_<.9995){let v=Math.acos(_),x=Math.sin(v);g=Math.sin(g*v)/x,c=c*g+p*(o=Math.sin(o*v)/x),l=l*g+d*o,h=h*g+f*o,u=u*g+m*o}else{c=c*g+p*o,l=l*g+d*o,h=h*g+f*o,u=u*g+m*o;let v=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=v,l*=v,h*=v,u*=v}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,s,a){let o=n[r],c=n[r+1],l=n[r+2],h=n[r+3],u=s[a],p=s[a+1],d=s[a+2],f=s[a+3];return e[t]=o*f+h*u+c*d-l*p,e[t+1]=c*f+h*p+l*u-o*d,e[t+2]=l*f+h*d+o*p-c*u,e[t+3]=h*f-o*u-c*p-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(r/2),u=o(s/2),p=c(n/2),d=c(r/2),f=c(s/2);switch(a){case"XYZ":this._x=p*h*u+l*d*f,this._y=l*d*u-p*h*f,this._z=l*h*f+p*d*u,this._w=l*h*u-p*d*f;break;case"YXZ":this._x=p*h*u+l*d*f,this._y=l*d*u-p*h*f,this._z=l*h*f-p*d*u,this._w=l*h*u+p*d*f;break;case"ZXY":this._x=p*h*u-l*d*f,this._y=l*d*u+p*h*f,this._z=l*h*f+p*d*u,this._w=l*h*u-p*d*f;break;case"ZYX":this._x=p*h*u-l*d*f,this._y=l*d*u+p*h*f,this._z=l*h*f-p*d*u,this._w=l*h*u+p*d*f;break;case"YZX":this._x=p*h*u+l*d*f,this._y=l*d*u+p*h*f,this._z=l*h*f-p*d*u,this._w=l*h*u-p*d*f;break;case"XZY":this._x=p*h*u-l*d*f,this._y=l*d*u-p*h*f,this._z=l*h*f+p*d*u,this._w=l*h*u+p*d*f;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],u=t[10],p=n+o+u;if(p>0){let d=.5/Math.sqrt(p+1);this._w=.25/d,this._x=(h-c)*d,this._y=(s-l)*d,this._z=(a-r)*d}else if(n>o&&n>u){let d=2*Math.sqrt(1+n-o-u);this._w=(h-c)/d,this._x=.25*d,this._y=(r+a)/d,this._z=(s+l)/d}else if(o>u){let d=2*Math.sqrt(1+o-n-u);this._w=(s-l)/d,this._x=(r+a)/d,this._y=.25*d,this._z=(c+h)/d}else{let d=2*Math.sqrt(1+u-n-o);this._w=(a-r)/d,this._x=(s+l)/d,this._y=(c+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ve(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+r*l-s*c,this._y=r*h+a*c+s*o-n*l,this._z=s*h+a*l+n*c-r*o,this._w=a*h-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,s=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,s=-s,a=-a,o=-o);let c=1-t;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+a*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},fh=class fh{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(yu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(yu.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*r-o*n),h=2*(o*t-s*r),u=2*(s*n-a*t);return this.x=t+c*l+a*u-o*h,this.y=n+c*h+o*l-s*u,this.z=r+c*u+s*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this.z=Ve(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this.z=Ve(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return vl.copy(this).projectOnVector(e),this.sub(vl)}reflect(e){return this.sub(vl.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ve(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,4*t)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,3*t)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=2*Math.random()-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};fh.prototype.isVector3=!0;var C=fh,vl=new C,yu=new Zt,gh=class gh{constructor(e,t,n,r,s,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l)}set(e,t,n,r,s,a,o,c,l){let h=this.elements;return h[0]=e,h[1]=r,h[2]=o,h[3]=t,h[4]=s,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],u=n[7],p=n[2],d=n[5],f=n[8],m=r[0],_=r[3],g=r[6],v=r[1],x=r[4],b=r[7],S=r[2],y=r[5],P=r[8];return s[0]=a*m+o*v+c*S,s[3]=a*_+o*x+c*y,s[6]=a*g+o*b+c*P,s[1]=l*m+h*v+u*S,s[4]=l*_+h*x+u*y,s[7]=l*g+h*b+u*P,s[2]=p*m+d*v+f*S,s[5]=p*_+d*x+f*y,s[8]=p*g+d*b+f*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*s*h+n*o*c+r*s*l-r*a*c}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=h*a-o*l,p=o*c-h*s,d=l*s-a*c,f=t*u+n*p+r*d;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/f;return e[0]=u*m,e[1]=(r*l-h*n)*m,e[2]=(o*n-r*a)*m,e[3]=p*m,e[4]=(h*t-r*c)*m,e[5]=(r*s-o*t)*m,e[6]=d*m,e[7]=(n*c-l*t)*m,e[8]=(a*t-n*s)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){let c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-r*l,r*c,-r*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return Oi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(_l.makeScale(e,t)),this}rotate(e){return Oi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(_l.makeRotation(-e)),this}translate(e,t){return Oi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(_l.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};gh.prototype.isMatrix3=!0;var Be=gh,_l=new Be,xu=new Be().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Mu=new Be().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function nm(){let i={enabled:!0,workingColorSpace:ds,spaces:{},convert:function(r,s,a){return this.enabled!==!1&&s!==a&&s&&a&&(this.spaces[s].transfer===Qe&&(r.r=ti(r.r),r.g=ti(r.g),r.b=ti(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Qe&&(r.r=yr(r.r),r.g=yr(r.g),r.b=yr(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===""?ps:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Oi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Oi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[ds]:{primaries:e,whitePoint:n,transfer:ps,toXYZ:xu,fromXYZ:Mu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:zt},outputColorSpaceConfig:{drawingBufferColorSpace:zt}},[zt]:{primaries:e,whitePoint:n,transfer:Qe,toXYZ:xu,fromXYZ:Mu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:zt}}}),i}var je=nm();function ti(i){return i<.04045?.0773993808*i:Math.pow(.9478672986*i+.0521327014,2.4)}function yr(i){return i<.0031308?12.92*i:1.055*Math.pow(i,.41666)-.055}var sr,qa=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{sr===void 0&&(sr=ms("canvas")),sr.width=e.width,sr.height=e.height;let r=sr.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=sr}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=ms("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=255*ti(s[a]/255);return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(255*ti(t[n]/255)):t[n]=ti(t[n]);return{data:t,width:e.width,height:e.height}}return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},im=0,br=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:im++}),this.uuid=Yi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(yl(r[a].image)):s.push(yl(r[a]))}else s=yl(r);n.url=s}return t||(e.images[this.uuid]=n),n}};function yl(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?qa.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}var rm=0,xl=new C,qt=class i extends zn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=1001,r=1001,s=1006,a=1008,o=1023,c=1009,l=i.DEFAULT_ANISOTROPY,h=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:rm++}),this.uuid=Yi(),this.name="",this.source=new br(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new ie(0,0),this.repeat=new ie(1,1),this.center=new ie(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Be,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(xl).x}get height(){return this.source.getSize(xl).y}get depth(){return this.source.getSize(xl).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];r!==void 0?r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n:Ae(`Texture.setValues(): property '${t}' does not exist.`)}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Sc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Wa:e.x=e.x-Math.floor(e.x);break;case _i:e.x=e.x<0?0:1;break;case Xa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case Wa:e.y=e.y-Math.floor(e.y);break;case _i:e.y=e.y<0?0:1;break;case Xa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};qt.DEFAULT_IMAGE=null,qt.DEFAULT_MAPPING=Sc,qt.DEFAULT_ANISOTROPY=1;var vh=class vh{constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s,c=e.elements,l=c[0],h=c[4],u=c[8],p=c[1],d=c[5],f=c[9],m=c[2],_=c[6],g=c[10];if(Math.abs(h-p)<.01&&Math.abs(u-m)<.01&&Math.abs(f-_)<.01){if(Math.abs(h+p)<.1&&Math.abs(u+m)<.1&&Math.abs(f+_)<.1&&Math.abs(l+d+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let x=(l+1)/2,b=(d+1)/2,S=(g+1)/2,y=(h+p)/4,P=(u+m)/4,F=(f+_)/4;return x>b&&x>S?x<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(x),r=y/n,s=P/n):b>S?b<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(b),n=y/r,s=F/r):S<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(S),n=P/s,r=F/s),this.set(n,r,s,t),this}let v=Math.sqrt((_-f)*(_-f)+(u-m)*(u-m)+(p-h)*(p-h));return Math.abs(v)<.001&&(v=1),this.x=(_-f)/v,this.y=(u-m)/v,this.z=(p-h)/v,this.w=Math.acos((l+d+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this.z=Ve(this.z,e.z,t.z),this.w=Ve(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this.z=Ve(this.z,e,t),this.w=Ve(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};vh.prototype.isVector4=!0;var it=vh,Ya=class extends zn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:kt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new it(0,0,e,t),this.scissorTest=!1,this.viewport=new it(0,0,e,t),this.textures=[];let r={width:e,height:t,depth:n.depth},s=new qt(r),a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:kt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let r=Object.assign({},e.textures[t].image);this.textures[t].source=new br(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},tn=class extends Ya{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},fs=class extends qt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=pn,this.minFilter=pn,this.wrapR=_i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Za=class extends qt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=pn,this.minFilter=pn,this.wrapR=_i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ro=class Ro{constructor(e,t,n,r,s,a,o,c,l,h,u,p,d,f,m,_){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l,h,u,p,d,f,m,_)}set(e,t,n,r,s,a,o,c,l,h,u,p,d,f,m,_){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=s,g[5]=a,g[9]=o,g[13]=c,g[2]=l,g[6]=h,g[10]=u,g[14]=p,g[3]=d,g[7]=f,g[11]=m,g[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ro().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/ar.setFromMatrixColumn(e,0).length(),s=1/ar.setFromMatrixColumn(e,1).length(),a=1/ar.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){let p=a*h,d=a*u,f=o*h,m=o*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=d+f*l,t[5]=p-m*l,t[9]=-o*c,t[2]=m-p*l,t[6]=f+d*l,t[10]=a*c}else if(e.order==="YXZ"){let p=c*h,d=c*u,f=l*h,m=l*u;t[0]=p+m*o,t[4]=f*o-d,t[8]=a*l,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=d*o-f,t[6]=m+p*o,t[10]=a*c}else if(e.order==="ZXY"){let p=c*h,d=c*u,f=l*h,m=l*u;t[0]=p-m*o,t[4]=-a*u,t[8]=f+d*o,t[1]=d+f*o,t[5]=a*h,t[9]=m-p*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let p=a*h,d=a*u,f=o*h,m=o*u;t[0]=c*h,t[4]=f*l-d,t[8]=p*l+m,t[1]=c*u,t[5]=m*l+p,t[9]=d*l-f,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let p=a*c,d=a*l,f=o*c,m=o*l;t[0]=c*h,t[4]=m-p*u,t[8]=f*u+d,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=d*u+f,t[10]=p-m*u}else if(e.order==="XZY"){let p=a*c,d=a*l,f=o*c,m=o*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=p*u+m,t[5]=a*h,t[9]=d*u-f,t[2]=f*u-d,t[6]=o*h,t[10]=m*u+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(sm,e,am)}lookAt(e,t,n){let r=this.elements;return Kt.subVectors(e,t),Kt.lengthSq()===0&&(Kt.z=1),Kt.normalize(),hi.crossVectors(n,Kt),hi.lengthSq()===0&&(Math.abs(n.z)===1?Kt.x+=1e-4:Kt.z+=1e-4,Kt.normalize(),hi.crossVectors(n,Kt)),hi.normalize(),fa.crossVectors(Kt,hi),r[0]=hi.x,r[4]=fa.x,r[8]=Kt.x,r[1]=hi.y,r[5]=fa.y,r[9]=Kt.y,r[2]=hi.z,r[6]=fa.z,r[10]=Kt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],u=n[5],p=n[9],d=n[13],f=n[2],m=n[6],_=n[10],g=n[14],v=n[3],x=n[7],b=n[11],S=n[15],y=r[0],P=r[4],F=r[8],L=r[12],D=r[1],O=r[5],N=r[9],H=r[13],X=r[2],k=r[6],Z=r[10],j=r[14],te=r[3],fe=r[7],we=r[11],ye=r[15];return s[0]=a*y+o*D+c*X+l*te,s[4]=a*P+o*O+c*k+l*fe,s[8]=a*F+o*N+c*Z+l*we,s[12]=a*L+o*H+c*j+l*ye,s[1]=h*y+u*D+p*X+d*te,s[5]=h*P+u*O+p*k+d*fe,s[9]=h*F+u*N+p*Z+d*we,s[13]=h*L+u*H+p*j+d*ye,s[2]=f*y+m*D+_*X+g*te,s[6]=f*P+m*O+_*k+g*fe,s[10]=f*F+m*N+_*Z+g*we,s[14]=f*L+m*H+_*j+g*ye,s[3]=v*y+x*D+b*X+S*te,s[7]=v*P+x*O+b*k+S*fe,s[11]=v*F+x*N+b*Z+S*we,s[15]=v*L+x*H+b*j+S*ye,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],u=e[6],p=e[10],d=e[14],f=e[3],m=e[7],_=e[11],g=e[15],v=c*d-l*p,x=o*d-l*u,b=o*p-c*u,S=a*d-l*h,y=a*p-c*h,P=a*u-o*h;return t*(m*v-_*x+g*b)-n*(f*v-_*S+g*y)+r*(f*x-m*S+g*P)-s*(f*b-m*y+_*P)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],s=e[1],a=e[5],o=e[9],c=e[2],l=e[6],h=e[10];return t*(a*h-o*l)-n*(s*h-o*c)+r*(s*l-a*c)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=e[9],p=e[10],d=e[11],f=e[12],m=e[13],_=e[14],g=e[15],v=t*o-n*a,x=t*c-r*a,b=t*l-s*a,S=n*c-r*o,y=n*l-s*o,P=r*l-s*c,F=h*m-u*f,L=h*_-p*f,D=h*g-d*f,O=u*_-p*m,N=u*g-d*m,H=p*g-d*_,X=v*H-x*N+b*O+S*D-y*L+P*F;if(X===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let k=1/X;return e[0]=(o*H-c*N+l*O)*k,e[1]=(r*N-n*H-s*O)*k,e[2]=(m*P-_*y+g*S)*k,e[3]=(p*y-u*P-d*S)*k,e[4]=(c*D-a*H-l*L)*k,e[5]=(t*H-r*D+s*L)*k,e[6]=(_*b-f*P-g*x)*k,e[7]=(h*P-p*b+d*x)*k,e[8]=(a*N-o*D+l*F)*k,e[9]=(n*D-t*N-s*F)*k,e[10]=(f*y-m*b+g*v)*k,e[11]=(u*b-h*y-d*v)*k,e[12]=(o*L-a*O-c*F)*k,e[13]=(t*O-n*L+r*F)*k,e[14]=(m*x-f*S-_*v)*k,e[15]=(h*S-u*x+p*v)*k,this}scale(e){let t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,h=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,h*o+n,h*c-r*a,0,l*c-r*o,h*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,h=a+a,u=o+o,p=s*l,d=s*h,f=s*u,m=a*h,_=a*u,g=o*u,v=c*l,x=c*h,b=c*u,S=n.x,y=n.y,P=n.z;return r[0]=(1-(m+g))*S,r[1]=(d+b)*S,r[2]=(f-x)*S,r[3]=0,r[4]=(d-b)*y,r[5]=(1-(p+g))*y,r[6]=(_+v)*y,r[7]=0,r[8]=(f+x)*P,r[9]=(_-v)*P,r[10]=(1-(p+m))*P,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let s=this.determinantAffine();if(s===0)return n.set(1,1,1),t.identity(),this;let a=ar.set(r[0],r[1],r[2]).length(),o=ar.set(r[4],r[5],r[6]).length(),c=ar.set(r[8],r[9],r[10]).length();s<0&&(a=-a),bn.copy(this);let l=1/a,h=1/o,u=1/c;return bn.elements[0]*=l,bn.elements[1]*=l,bn.elements[2]*=l,bn.elements[4]*=h,bn.elements[5]*=h,bn.elements[6]*=h,bn.elements[8]*=u,bn.elements[9]*=u,bn.elements[10]*=u,t.setFromRotationMatrix(bn),n.x=a,n.y=o,n.z=c,this}makePerspective(e,t,n,r,s,a,o=2e3,c=!1){let l=this.elements,h=2*s/(t-e),u=2*s/(n-r),p=(t+e)/(t-e),d=(n+r)/(n-r),f,m;if(c)f=s/(a-s),m=a*s/(a-s);else if(o===ni)f=-(a+s)/(a-s),m=-2*a*s/(a-s);else{if(o!==xr)throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);f=-a/(a-s),m=-a*s/(a-s)}return l[0]=h,l[4]=0,l[8]=p,l[12]=0,l[1]=0,l[5]=u,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=m,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=2e3,c=!1){let l=this.elements,h=2/(t-e),u=2/(n-r),p=-(t+e)/(t-e),d=-(n+r)/(n-r),f,m;if(c)f=1/(a-s),m=a/(a-s);else if(o===ni)f=-2/(a-s),m=-(a+s)/(a-s);else{if(o!==xr)throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);f=-1/(a-s),m=-s/(a-s)}return l[0]=h,l[4]=0,l[8]=0,l[12]=p,l[1]=0,l[5]=u,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=f,l[14]=m,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};Ro.prototype.isMatrix4=!0;var Oe=Ro,ar=new C,bn=new Oe,sm=new C(0,0,0),am=new C(1,1,1),hi=new C,fa=new C,Kt=new C,Su=new Oe,bu=new Zt,wn=class i{constructor(e=0,t=0,n=0,r=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],h=r[9],u=r[2],p=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(Ve(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(p,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ve(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ve(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Ve(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(p,d),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ve(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-Ve(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(p,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,d),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Su.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Su,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return bu.setFromEuler(this),this.setFromQuaternion(bu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};wn.DEFAULT_ORDER="XYZ";var Tr=class{constructor(){this.mask=1}set(e){this.mask=1<<e>>>0}enable(e){this.mask|=1<<e}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e}disable(e){this.mask&=~(1<<e)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&1<<e)}},om=0,Tu=new C,or=new Zt,Zn=new Oe,ga=new C,ts=new C,lm=new C,cm=new Zt,Eu=new C(1,0,0),wu=new C(0,1,0),Au=new C(0,0,1),Cu={type:"added"},hm={type:"removed"},lr={type:"childadded",child:null},Ml={type:"childremoved",child:null},Nt=class i extends zn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:om++}),this.uuid=Yi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new C,t=new wn,n=new Zt,r=new C(1,1,1);t._onChange(function(){n.setFromEuler(t,!1)}),n._onChange(function(){t.setFromQuaternion(n,void 0,!1)}),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Oe},normalMatrix:{value:new Be}}),this.matrix=new Oe,this.matrixWorld=new Oe,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Tr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.multiply(or),this}rotateOnWorldAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.premultiply(or),this}rotateX(e){return this.rotateOnAxis(Eu,e)}rotateY(e){return this.rotateOnAxis(wu,e)}rotateZ(e){return this.rotateOnAxis(Au,e)}translateOnAxis(e,t){return Tu.copy(e).applyQuaternion(this.quaternion),this.position.add(Tu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Eu,e)}translateY(e){return this.translateOnAxis(wu,e)}translateZ(e){return this.translateOnAxis(Au,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Zn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ga.copy(e):ga.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),ts.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Zn.lookAt(ts,ga,this.up):Zn.lookAt(ga,ts,this.up),this.quaternion.setFromRotationMatrix(Zn),r&&(Zn.extractRotation(r.matrixWorld),or.setFromRotationMatrix(Zn),this.quaternion.premultiply(or.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Re("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Cu),lr.child=e,this.dispatchEvent(lr),lr.child=null):Re("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(hm),Ml.child=e,this.dispatchEvent(Ml),Ml.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Zn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Zn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Zn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Cu),lr.child=e,this.dispatchEvent(lr),lr.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let s=this.children[n].getObjectByProperty(e,t);if(s!==void 0)return s}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,e,lm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,cm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*r,s[13]+=n-s[1]*t-s[5]*n-s[9]*r,s[14]+=r-s[2]*t-s[6]*n-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let s=this.children;for(let a=0,o=s.length;a<o;a++)s[a].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON())),this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];s(e.shapes,u)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];r.animations.push(s(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),u=a(e.shapes),p=a(e.skeletons),d=a(e.animations),f=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),p.length>0&&(n.skeletons=p),d.length>0&&(n.animations=d),f.length>0&&(n.nodes=f)}return n.object=r,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let r=e.children[n];this.add(r.clone())}return this}};Nt.DEFAULT_UP=new C(0,1,0),Nt.DEFAULT_MATRIX_AUTO_UPDATE=!0,Nt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Gt=class extends Nt{constructor(){super(),this.isGroup=!0,this.type="Group"}},um={type:"move"},Er=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Gt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Gt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Gt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(let m of e.hand.values()){let _=t.getJointPose(m,n),g=this._getHandJoint(l,m);_!==null&&(g.matrix.fromArray(_.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=_.radius),g.visible=_!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],p=h.position.distanceTo(u.position),d=.02,f=.005;l.inputState.pinching&&p>d+f?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&p<=d-f&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(um)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Gt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Bd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ui={h:0,s:0,l:0},va={h:0,s:0,l:0};function Sl(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+6*(e-i)*t:t<.5?e:t<2/3?i+6*(e-i)*(2/3-t):i}var xe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(255&e)/255,je.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=je.workingColorSpace){return this.r=e,this.g=t,this.b=n,je.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=je.workingColorSpace){if(e=Zl(e,1),t=Ve(t,0,1),n=Ve(n,0,1),t===0)this.r=this.g=this.b=n;else{let s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Sl(a,s,e+1/3),this.g=Sl(a,s,e),this.b=Sl(a,s,e-1/3)}return je.colorSpaceToWorking(this,r),this}setStyle(e,t=zt){function n(s){s!==void 0&&parseFloat(s)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=zt){let n=Bd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ti(e.r),this.g=ti(e.g),this.b=ti(e.b),this}copyLinearToSRGB(e){return this.r=yr(e.r),this.g=yr(e.g),this.b=yr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=zt){return je.workingToColorSpace(Bt.copy(this),e),65536*Math.round(Ve(255*Bt.r,0,255))+256*Math.round(Ve(255*Bt.g,0,255))+Math.round(Ve(255*Bt.b,0,255))}getHexString(e=zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=je.workingColorSpace){je.workingToColorSpace(Bt.copy(this),t);let n=Bt.r,r=Bt.g,s=Bt.b,a=Math.max(n,r,s),o=Math.min(n,r,s),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case n:c=(r-s)/u+(r<s?6:0);break;case r:c=(s-n)/u+2;break;case s:c=(n-r)/u+4}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=je.workingColorSpace){return je.workingToColorSpace(Bt.copy(this),t),e.r=Bt.r,e.g=Bt.g,e.b=Bt.b,e}getStyle(e=zt){je.workingToColorSpace(Bt.copy(this),e);let t=Bt.r,n=Bt.g,r=Bt.b;return e!==zt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(255*t)},${Math.round(255*n)},${Math.round(255*r)})`}offsetHSL(e,t,n){return this.getHSL(ui),this.setHSL(ui.h+e,ui.s+t,ui.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ui),e.getHSL(va);let n=ls(ui.h,va.h,t),r=ls(ui.s,va.s,t),s=ls(ui.l,va.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Bt=new xe;xe.NAMES=Bd;var gs=class i{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new xe(e),this.density=t}clone(){return new i(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}};var wr=class extends Nt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new wn,this.environmentIntensity=1,this.environmentRotation=new wn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Tn=new C,Jn=new C,bl=new C,$n=new C,cr=new C,hr=new C,Ru=new C,Tl=new C,El=new C,wl=new C,Al=new it,Cl=new it,Rl=new it,ei=class i{constructor(e=new C,t=new C,n=new C){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Tn.subVectors(e,t),r.cross(Tn);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){Tn.subVectors(r,t),Jn.subVectors(n,t),bl.subVectors(e,t);let a=Tn.dot(Tn),o=Tn.dot(Jn),c=Tn.dot(bl),l=Jn.dot(Jn),h=Jn.dot(bl),u=a*l-o*o;if(u===0)return s.set(0,0,0),null;let p=1/u,d=(l*c-o*h)*p,f=(a*h-o*c)*p;return s.set(1-d-f,f,d)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,$n)!==null&&$n.x>=0&&$n.y>=0&&$n.x+$n.y<=1}static getInterpolation(e,t,n,r,s,a,o,c){return this.getBarycoord(e,t,n,r,$n)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,$n.x),c.addScaledVector(a,$n.y),c.addScaledVector(o,$n.z),c)}static getInterpolatedAttribute(e,t,n,r,s,a){return Al.setScalar(0),Cl.setScalar(0),Rl.setScalar(0),Al.fromBufferAttribute(e,t),Cl.fromBufferAttribute(e,n),Rl.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Al,s.x),a.addScaledVector(Cl,s.y),a.addScaledVector(Rl,s.z),a}static isFrontFacing(e,t,n,r){return Tn.subVectors(n,t),Jn.subVectors(e,t),Tn.cross(Jn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Tn.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),.5*Tn.cross(Jn).length()}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return i.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,s=this.c,a,o;cr.subVectors(r,n),hr.subVectors(s,n),Tl.subVectors(e,n);let c=cr.dot(Tl),l=hr.dot(Tl);if(c<=0&&l<=0)return t.copy(n);El.subVectors(e,r);let h=cr.dot(El),u=hr.dot(El);if(h>=0&&u<=h)return t.copy(r);let p=c*u-h*l;if(p<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector(cr,a);wl.subVectors(e,s);let d=cr.dot(wl),f=hr.dot(wl);if(f>=0&&d<=f)return t.copy(s);let m=d*l-c*f;if(m<=0&&l>=0&&f<=0)return o=l/(l-f),t.copy(n).addScaledVector(hr,o);let _=h*f-d*u;if(_<=0&&u-h>=0&&d-f>=0)return Ru.subVectors(s,r),o=(u-h)/(u-h+(d-f)),t.copy(r).addScaledVector(Ru,o);let g=1/(_+m+p);return a=m*g,o=p*g,t.copy(n).addScaledVector(cr,a).addScaledVector(hr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},mn=class{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(En.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(En.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=En.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,En):En.fromBufferAttribute(s,a),En.applyMatrix4(e.matrixWorld),this.expandByPoint(En);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_a.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_a.copy(n.boundingBox)),_a.applyMatrix4(e.matrixWorld),this.union(_a)}let r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,En),En.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ns),ya.subVectors(this.max,ns),ur.subVectors(e.a,ns),dr.subVectors(e.b,ns),pr.subVectors(e.c,ns),di.subVectors(dr,ur),pi.subVectors(pr,dr),Li.subVectors(ur,pr);let t=[0,-di.z,di.y,0,-pi.z,pi.y,0,-Li.z,Li.y,di.z,0,-di.x,pi.z,0,-pi.x,Li.z,0,-Li.x,-di.y,di.x,0,-pi.y,pi.x,0,-Li.y,Li.x,0];return!!Pl(t,ur,dr,pr,ya)&&(t=[1,0,0,0,1,0,0,0,1],!!Pl(t,ur,dr,pr,ya)&&(xa.crossVectors(di,pi),t=[xa.x,xa.y,xa.z],Pl(t,ur,dr,pr,ya)))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,En).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=.5*this.getSize(En).length()),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()||(Kn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Kn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Kn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Kn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Kn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Kn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Kn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Kn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Kn)),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Kn=[new C,new C,new C,new C,new C,new C,new C,new C],En=new C,_a=new mn,ur=new C,dr=new C,pr=new C,di=new C,pi=new C,Li=new C,ns=new C,ya=new C,xa=new C,Di=new C;function Pl(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){Di.fromArray(i,s);let o=r.x*Math.abs(Di.x)+r.y*Math.abs(Di.y)+r.z*Math.abs(Di.z),c=e.dot(Di),l=t.dot(Di),h=n.dot(Di);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var u0=dm();function dm(){let i=new ArrayBuffer(4),e=new Float32Array(i),t=new Uint32Array(i),n=new Uint32Array(512),r=new Uint32Array(512);for(let c=0;c<256;++c){let l=c-127;l<-27?(n[c]=0,n[256|c]=32768,r[c]=24,r[256|c]=24):l<-14?(n[c]=1024>>-l-14,n[256|c]=1024>>-l-14|32768,r[c]=-l-1,r[256|c]=-l-1):l<=15?(n[c]=l+15<<10,n[256|c]=l+15<<10|32768,r[c]=13,r[256|c]=13):l<128?(n[c]=31744,n[256|c]=64512,r[c]=24,r[256|c]=24):(n[c]=31744,n[256|c]=64512,r[c]=13,r[256|c]=13)}let s=new Uint32Array(2048),a=new Uint32Array(64),o=new Uint32Array(64);for(let c=1;c<1024;++c){let l=c<<13,h=0;for(;!(8388608&l);)l<<=1,h-=8388608;l&=-8388609,h+=947912704,s[c]=l|h}for(let c=1024;c<2048;++c)s[c]=939524096+(c-1024<<13);for(let c=1;c<31;++c)a[c]=c<<23;a[31]=1199570944,a[32]=2147483648;for(let c=33;c<63;++c)a[c]=2147483648+(c-32<<23);a[63]=3347054592;for(let c=1;c<64;++c)c!==32&&(o[c]=1024);return{floatView:e,uint32View:t,baseTable:n,shiftTable:r,mantissaTable:s,exponentTable:a,offsetTable:o}}var xt=new C,Ma=new ie,pm=0,Yt=class extends zn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:pm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Yl,this.updateRanges=[],this.gpuType=gn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ma.fromBufferAttribute(this,t),Ma.applyMatrix3(e),this.setXY(t,Ma.x,Ma.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)xt.fromBufferAttribute(this,t),xt.applyMatrix3(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)xt.fromBufferAttribute(this,t),xt.applyMatrix4(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)xt.fromBufferAttribute(this,t),xt.applyNormalMatrix(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)xt.fromBufferAttribute(this,t),xt.transformDirection(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=vr(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Xt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=vr(t,this.array)),t}setX(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=vr(t,this.array)),t}setY(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=vr(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=vr(t,this.array)),t}setW(e,t){return this.normalized&&(t=Xt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array),r=Xt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=Xt(t,this.array),n=Xt(n,this.array),r=Xt(r,this.array),s=Xt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Yl&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var vs=class extends Yt{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var _s=class extends Yt{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Ce=class extends Yt{constructor(e,t,n){super(new Float32Array(e),t,n)}},mm=new mn,is=new C,Il=new C,fn=class{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):mm.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;is.subVectors(e,this.center);let t=is.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),r=.5*(n-this.radius);this.center.addScaledVector(is,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Il.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(is.copy(e.center).add(Il)),this.expandByPoint(is.copy(e.center).sub(Il))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},fm=0,dn=new Oe,Ll=new Nt,mr=new C,Qt=new mn,rs=new mn,Ct=new C,rt=class i extends zn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:fm++}),this.uuid=Yi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new((function(t){for(let n=t.length-1;n>=0;--n)if(t[n]>=65535)return!0;return!1})(e)?_s:vs)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new Be().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return dn.makeRotationFromQuaternion(e),this.applyMatrix4(dn),this}rotateX(e){return dn.makeRotationX(e),this.applyMatrix4(dn),this}rotateY(e){return dn.makeRotationY(e),this.applyMatrix4(dn),this}rotateZ(e){return dn.makeRotationZ(e),this.applyMatrix4(dn),this}translate(e,t,n){return dn.makeTranslation(e,t,n),this.applyMatrix4(dn),this}scale(e,t,n){return dn.makeScale(e,t,n),this.applyMatrix4(dn),this}lookAt(e){return Ll.lookAt(e),Ll.updateMatrix(),this.applyMatrix4(Ll.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(mr).negate(),this.translate(mr.x,mr.y,mr.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let r=0,s=e.length;r<s;r++){let a=e[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ce(n,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new mn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)return Re("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),void this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){let s=t[n];Qt.setFromBufferAttribute(s),this.morphTargetsRelative?(Ct.addVectors(this.boundingBox.min,Qt.min),this.boundingBox.expandByPoint(Ct),Ct.addVectors(this.boundingBox.max,Qt.max),this.boundingBox.expandByPoint(Ct)):(this.boundingBox.expandByPoint(Qt.min),this.boundingBox.expandByPoint(Qt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Re('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new fn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)return Re("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),void this.boundingSphere.set(new C,1/0);if(e){let n=this.boundingSphere.center;if(Qt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){let o=t[s];rs.setFromBufferAttribute(o),this.morphTargetsRelative?(Ct.addVectors(Qt.min,rs.min),Qt.expandByPoint(Ct),Ct.addVectors(Qt.max,rs.max),Qt.expandByPoint(Ct)):(Qt.expandByPoint(rs.min),Qt.expandByPoint(rs.max))}Qt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)Ct.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(Ct));if(t)for(let s=0,a=t.length;s<a;s++){let o=t[s],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)Ct.fromBufferAttribute(o,l),c&&(mr.fromBufferAttribute(e,l),Ct.add(mr)),r=Math.max(r,n.distanceToSquared(Ct))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Re('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0)return void Re("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");let n=t.position,r=t.normal,s=t.uv,a=this.getAttribute("tangent");a!==void 0&&a.count===n.count||(a=new Yt(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],c=[];for(let F=0;F<n.count;F++)o[F]=new C,c[F]=new C;let l=new C,h=new C,u=new C,p=new ie,d=new ie,f=new ie,m=new C,_=new C;function g(F,L,D){l.fromBufferAttribute(n,F),h.fromBufferAttribute(n,L),u.fromBufferAttribute(n,D),p.fromBufferAttribute(s,F),d.fromBufferAttribute(s,L),f.fromBufferAttribute(s,D),h.sub(l),u.sub(l),d.sub(p),f.sub(p);let O=1/(d.x*f.y-f.x*d.y);isFinite(O)&&(m.copy(h).multiplyScalar(f.y).addScaledVector(u,-d.y).multiplyScalar(O),_.copy(u).multiplyScalar(d.x).addScaledVector(h,-f.x).multiplyScalar(O),o[F].add(m),o[L].add(m),o[D].add(m),c[F].add(_),c[L].add(_),c[D].add(_))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let F=0,L=v.length;F<L;++F){let D=v[F],O=D.start;for(let N=O,H=O+D.count;N<H;N+=3)g(e.getX(N+0),e.getX(N+1),e.getX(N+2))}let x=new C,b=new C,S=new C,y=new C;function P(F){S.fromBufferAttribute(r,F),y.copy(S);let L=o[F];x.copy(L),x.sub(S.multiplyScalar(S.dot(L))).normalize(),b.crossVectors(y,L);let D=b.dot(c[F])<0?-1:1;a.setXYZW(F,x.x,x.y,x.z,D)}for(let F=0,L=v.length;F<L;++F){let D=v[F],O=D.start;for(let N=O,H=O+D.count;N<H;N+=3)P(e.getX(N+0)),P(e.getX(N+1)),P(e.getX(N+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new Yt(new Float32Array(3*t.count),3),this.setAttribute("normal",n);else for(let p=0,d=n.count;p<d;p++)n.setXYZ(p,0,0,0);let r=new C,s=new C,a=new C,o=new C,c=new C,l=new C,h=new C,u=new C;if(e)for(let p=0,d=e.count;p<d;p+=3){let f=e.getX(p+0),m=e.getX(p+1),_=e.getX(p+2);r.fromBufferAttribute(t,f),s.fromBufferAttribute(t,m),a.fromBufferAttribute(t,_),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),o.fromBufferAttribute(n,f),c.fromBufferAttribute(n,m),l.fromBufferAttribute(n,_),o.add(h),c.add(h),l.add(h),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(m,c.x,c.y,c.z),n.setXYZ(_,l.x,l.y,l.z)}else for(let p=0,d=t.count;p<d;p+=3)r.fromBufferAttribute(t,p+0),s.fromBufferAttribute(t,p+1),a.fromBufferAttribute(t,p+2),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),n.setXYZ(p+0,h.x,h.y,h.z),n.setXYZ(p+1,h.x,h.y,h.z),n.setXYZ(p+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Ct.fromBufferAttribute(e,t),Ct.normalize(),e.setXYZ(t,Ct.x,Ct.y,Ct.z)}toNonIndexed(){function e(o,c){let l=o.array,h=o.itemSize,u=o.normalized,p=new l.constructor(c.length*h),d=0,f=0;for(let m=0,_=c.length;m<_;m++){d=o.isInterleavedBufferAttribute?c[m]*o.data.stride+o.offset:c[m]*h;for(let g=0;g<h;g++)p[f++]=l[d++]}return new Yt(p,h,u)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,r=this.attributes;for(let o in r){let c=e(r[o],n);t.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let c=[],l=s[o];for(let h=0,u=l.length;h<u;h++){let p=e(l[h],n);c.push(p)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,p=l.length;u<p;u++){let d=l[u];h.push(d.toJSON(e.data))}h.length>0&&(r[c]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let l in r){let h=r[l];this.setAttribute(l,h.clone(t))}let s=e.morphAttributes;for(let l in s){let h=[],u=s[l];for(let p=0,d=u.length;p<d;p++)h.push(u[p].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,h=a.length;l<h;l++){let u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var d0=new C;var gm=0,ii=class extends zn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:gm++}),this.uuid=Yi(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xe(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Fi,this.stencilZFail=Fi,this.stencilZPass=Fi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];r!==void 0?r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n:Ae(`Material: '${t}' is not a property of THREE.${this.type}.`)}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};function r(s){let a=[];for(let o in s){let c=s[o];delete c.metadata,a.push(c)}return a}if(n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Fi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Fi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Fi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData),t){let s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new xe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ie().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ie().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var p0=new C,m0=new C,f0=new C,g0=new ie,v0=new ie,_0=new Oe,y0=new C,x0=new C,M0=new C,S0=new ie,b0=new ie,T0=new ie;var E0=new C,w0=new C;var Qn=new C,Dl=new C,Sa=new C,mi=new C,Nl=new C,ba=new C,Ul=new C,yi=class{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Qn.copy(this.origin).addScaledVector(this.direction,t),Qn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Dl.copy(e).add(t).multiplyScalar(.5),Sa.copy(t).sub(e).normalize(),mi.copy(this.origin).sub(Dl);let s=.5*e.distanceTo(t),a=-this.direction.dot(Sa),o=mi.dot(this.direction),c=-mi.dot(Sa),l=mi.lengthSq(),h=Math.abs(1-a*a),u,p,d,f;if(h>0)if(u=a*c-o,p=a*o-c,f=s*h,u>=0)if(p>=-f)if(p<=f){let m=1/h;u*=m,p*=m,d=u*(u+a*p+2*o)+p*(a*u+p+2*c)+l}else p=s,u=Math.max(0,-(a*p+o)),d=-u*u+p*(p+2*c)+l;else p=-s,u=Math.max(0,-(a*p+o)),d=-u*u+p*(p+2*c)+l;else p<=-f?(u=Math.max(0,-(-a*s+o)),p=u>0?-s:Math.min(Math.max(-s,-c),s),d=-u*u+p*(p+2*c)+l):p<=f?(u=0,p=Math.min(Math.max(-s,-c),s),d=p*(p+2*c)+l):(u=Math.max(0,-(a*s+o)),p=u>0?s:Math.min(Math.max(-s,-c),s),d=-u*u+p*(p+2*c)+l);else p=a>0?-s:s,u=Math.max(0,-(a*p+o)),d=-u*u+p*(p+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Dl).addScaledVector(Sa,p),d}intersectSphere(e,t){Qn.subVectors(e.center,this.origin);let n=Qn.dot(this.direction),r=Qn.dot(Qn)-n*n,s=e.radius*e.radius;if(r>s)return null;let a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return!(e.radius<0)&&this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0?!0:e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,p=this.origin;return l>=0?(n=(e.min.x-p.x)*l,r=(e.max.x-p.x)*l):(n=(e.max.x-p.x)*l,r=(e.min.x-p.x)*l),h>=0?(s=(e.min.y-p.y)*h,a=(e.max.y-p.y)*h):(s=(e.max.y-p.y)*h,a=(e.min.y-p.y)*h),n>a||s>r?null:((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-p.z)*u,c=(e.max.z-p.z)*u):(o=(e.max.z-p.z)*u,c=(e.min.z-p.z)*u),n>c||o>r?null:((o>n||n!=n)&&(n=o),(c<r||r!=r)&&(r=c),r<0?null:this.at(n>=0?n:r,t)))}intersectsBox(e){return this.intersectBox(e,Qn)!==null}intersectTriangle(e,t,n,r,s){Nl.subVectors(t,e),ba.subVectors(n,e),Ul.crossVectors(Nl,ba);let a,o=this.direction.dot(Ul);if(o>0){if(r)return null;a=1}else{if(!(o<0))return null;a=-1,o=-o}mi.subVectors(this.origin,e);let c=a*this.direction.dot(ba.crossVectors(mi,ba));if(c<0)return null;let l=a*this.direction.dot(Nl.cross(mi));if(l<0||c+l>o)return null;let h=-a*mi.dot(Ul);return h<0?null:this.at(h/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Gn=class extends ii{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Pu=new Oe,Ni=new yi,Ta=new fn,Iu=new C,Ea=new C,wa=new C,Aa=new C,Fl=new C,Ca=new C,Lu=new C,Ra=new C,Tt=class extends Nt{constructor(e=new rt,t=new Gn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=n.length;r<s;r++){let a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(s&&o){Ca.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let h=o[c],u=s[c];h!==0&&(Fl.fromBufferAttribute(u,e),a?Ca.addScaledVector(Fl,h):Ca.addScaledVector(Fl.sub(t),h))}t.add(Ca)}return t}raycast(e,t){let n=this.geometry,r=this.material,s=this.matrixWorld;if(r!==void 0){if(n.boundingSphere===null&&n.computeBoundingSphere(),Ta.copy(n.boundingSphere),Ta.applyMatrix4(s),Ni.copy(e.ray).recast(e.near),Ta.containsPoint(Ni.origin)===!1&&(Ni.intersectSphere(Ta,Iu)===null||Ni.origin.distanceToSquared(Iu)>(e.far-e.near)**2))return;Pu.copy(s).invert(),Ni.copy(e.ray).applyMatrix4(Pu),n.boundingBox!==null&&Ni.intersectsBox(n.boundingBox)===!1||this._computeIntersections(e,t,Ni)}}_computeIntersections(e,t,n){let r,s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,p=s.groups,d=s.drawRange;if(o!==null)if(Array.isArray(a))for(let f=0,m=p.length;f<m;f++){let _=p[f],g=a[_.materialIndex];for(let v=Math.max(_.start,d.start),x=Math.min(o.count,Math.min(_.start+_.count,d.start+d.count));v<x;v+=3)r=Pa(this,g,e,n,l,h,u,o.getX(v),o.getX(v+1),o.getX(v+2)),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=_.materialIndex,t.push(r))}else for(let f=Math.max(0,d.start),m=Math.min(o.count,d.start+d.count);f<m;f+=3)r=Pa(this,a,e,n,l,h,u,o.getX(f),o.getX(f+1),o.getX(f+2)),r&&(r.faceIndex=Math.floor(f/3),t.push(r));else if(c!==void 0)if(Array.isArray(a))for(let f=0,m=p.length;f<m;f++){let _=p[f],g=a[_.materialIndex];for(let v=Math.max(_.start,d.start),x=Math.min(c.count,Math.min(_.start+_.count,d.start+d.count));v<x;v+=3)r=Pa(this,g,e,n,l,h,u,v,v+1,v+2),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=_.materialIndex,t.push(r))}else for(let f=Math.max(0,d.start),m=Math.min(c.count,d.start+d.count);f<m;f+=3)r=Pa(this,a,e,n,l,h,u,f,f+1,f+2),r&&(r.faceIndex=Math.floor(f/3),t.push(r))}};function Pa(i,e,t,n,r,s,a,o,c,l){i.getVertexPosition(o,Ea),i.getVertexPosition(c,wa),i.getVertexPosition(l,Aa);let h=(function(u,p,d,f,m,_,g,v){let x;if(x=p.side===1?f.intersectTriangle(g,_,m,!0,v):f.intersectTriangle(m,_,g,p.side===0,v),x===null)return null;Ra.copy(v),Ra.applyMatrix4(u.matrixWorld);let b=d.ray.origin.distanceTo(Ra);return b<d.near||b>d.far?null:{distance:b,point:Ra.clone(),object:u}})(i,e,t,n,Ea,wa,Aa,Lu);if(h){let u=new C;ei.getBarycoord(Lu,Ea,wa,Aa,u),r&&(h.uv=ei.getInterpolatedAttribute(r,o,c,l,u,new ie)),s&&(h.uv1=ei.getInterpolatedAttribute(s,o,c,l,u,new ie)),a&&(h.normal=ei.getInterpolatedAttribute(a,o,c,l,u,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let p={a:o,b:c,c:l,normal:new C,materialIndex:0};ei.getNormal(Ea,wa,Aa,p.normal),h.face=p,h.barycoord=u}return h}var A0=new it,C0=new it,R0=new it,P0=new it,I0=new Oe,L0=new C,D0=new fn,N0=new Oe,U0=new yi;var ys=class extends qt{constructor(e=null,t=1,n=1,r,s,a,o,c,l=1003,h=1003,u,p){super(null,a,o,c,l,h,r,s,u,p),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},F0=new Oe,O0=new Oe;var xs=class extends Yt{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},fr=new Oe,Du=new Oe,Ia=[],Nu=new mn,vm=new Oe,ss=new Tt,as=new fn,Ar=class extends Tt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new xs(new Float32Array(16*n),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,vm)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new mn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,fr),Nu.copy(e.boundingBox).applyMatrix4(fr),this.boundingBox.union(Nu)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new fn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,fr),as.copy(e.boundingSphere).applyMatrix4(fr),this.boundingSphere.union(as)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,3*e)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,16*e)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=e*(n.length+1)+1;for(let a=0;a<n.length;a++)n[a]=r[s+a]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(ss.geometry=this.geometry,ss.material=this.material,ss.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),as.copy(this.boundingSphere),as.applyMatrix4(n),e.ray.intersectsSphere(as)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,fr),Du.multiplyMatrices(n,fr),ss.matrixWorld=Du,ss.raycast(e,Ia);for(let a=0,o=Ia.length;a<o;a++){let c=Ia[a];c.instanceId=s,c.object=this,t.push(c)}Ia.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new xs(new Float32Array(3*this.instanceMatrix.count).fill(1),3)),t.toArray(this.instanceColor.array,3*e),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,16*e),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new ys(new Float32Array(r*this.count),r,this.count,Bo,gn));let s=this.morphTexture.source.data.data,a=0;for(let l=0;l<n.length;l++)a+=n[l];let o=this.geometry.morphTargetsRelative?1:1-a,c=r*e;return s[c]=o,s.set(n,c+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Ol=new C,_m=new C,ym=new Be,On=class{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Ol.subVectors(n,t).cross(_m.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Ol),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/s;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ym.getNormalMatrix(e),r=this.coplanarPoint(Ol).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ui=new fn,xm=new ie(.5,.5),La=new C,ri=class{constructor(e=new On,t=new On,n=new On,r=new On,s=new On,a=new On){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=2e3,n=!1){let r=this.planes,s=e.elements,a=s[0],o=s[1],c=s[2],l=s[3],h=s[4],u=s[5],p=s[6],d=s[7],f=s[8],m=s[9],_=s[10],g=s[11],v=s[12],x=s[13],b=s[14],S=s[15];if(r[0].setComponents(l-a,d-h,g-f,S-v).normalize(),r[1].setComponents(l+a,d+h,g+f,S+v).normalize(),r[2].setComponents(l+o,d+u,g+m,S+x).normalize(),r[3].setComponents(l-o,d-u,g-m,S-x).normalize(),n)r[4].setComponents(c,p,_,b).normalize(),r[5].setComponents(l-c,d-p,g-_,S-b).normalize();else if(r[4].setComponents(l-c,d-p,g-_,S-b).normalize(),t===ni)r[5].setComponents(l+c,d+p,g+_,S+b).normalize();else{if(t!==xr)throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);r[5].setComponents(c,p,_,b).normalize()}return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ui.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ui.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ui)}intersectsSprite(e){Ui.center.set(0,0,0);let t=xm.distanceTo(e.center);return Ui.radius=.7071067811865476+t,Ui.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ui)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(La.x=r.normal.x>0?e.max.x:e.min.x,La.y=r.normal.y>0?e.max.y:e.min.y,La.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(La)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Uu=new Oe,Ja=class i{constructor(){this.coordinateSystem=ni,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,n=this._frustums;for(let r=0;r<t.length;r++){let s=t[r];Uu.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),n[r]===void 0&&(n[r]=new ri),n[r].setFromProjectionMatrix(Uu,s.coordinateSystem,s.reversedDepth)}return this._count=t.length,this}intersectsObject(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,n=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new ri),t[r].copy(n[r]);return this._count=e._count,this}clone(){return new i().copy(this)}};var Jl=class{constructor(){this.index=0,this.pool=[],this.list=[]}push(e,t,n,r){let s=this.pool,a=this.list;this.index>=s.length&&s.push({start:-1,count:-1,z:-1,index:-1});let o=s[this.index];a.push(o),this.index++,o.start=e,o.count=t,o.z=n,o.index=r}reset(){this.list.length=0,this.index=0}},B0=new Oe,z0=new xe(1,1,1),G0=new ri,k0=new Ja,V0=new mn,H0=new fn,W0=new C,X0=new C,j0=new C,q0=new Jl,Y0=new Tt;var Z0=new C,J0=new C,$0=new Oe,K0=new yi,Q0=new fn,ev=new C,tv=new C;var nv=new C,iv=new C;var Cr=class extends ii{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Fu=new Oe,$l=new yi,Da=new fn,Na=new C,Ms=class extends Nt{constructor(e=new rt,t=new Cr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Da.copy(n.boundingSphere),Da.applyMatrix4(r),Da.radius+=s,e.ray.intersectsSphere(Da)===!1)return;Fu.copy(r).invert(),$l.copy(e.ray).applyMatrix4(Fu);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,h=n.attributes.position;if(l!==null)for(let u=Math.max(0,a.start),p=Math.min(l.count,a.start+a.count);u<p;u++){let d=l.getX(u);Na.fromBufferAttribute(h,d),Ou(Na,d,c,r,e,t,this)}else for(let u=Math.max(0,a.start),p=Math.min(h.count,a.start+a.count);u<p;u++)Na.fromBufferAttribute(h,u),Ou(Na,u,c,r,e,t,this)}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=n.length;r<s;r++){let a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Ou(i,e,t,n,r,s,a){let o=$l.distanceSqToPoint(i);if(o<t){let c=new C;$l.closestPointToPoint(i,c),c.applyMatrix4(n);let l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;s.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}var Ss=class extends qt{constructor(e=[],t=301,n,r,s,a,o,c,l,h){super(e,t,n,r,s,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};var si=class extends qt{constructor(e,t,n=1014,r,s,a,o=1003,c=1003,l,h=1026,u=1){if(h!==Ti&&h!==1027)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super({width:e,height:t,depth:u},r,s,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new br(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},$a=class extends si{constructor(e,t=1014,n=301,r,s,a=1003,o=1003,c,l=1026){let h={width:e,height:e,depth:1},u=[h,h,h,h,h,h];super(e,e,t,n,r,s,a,o,c,l),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},bs=class extends qt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Bi=class i extends rt{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};let o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);let c=[],l=[],h=[],u=[],p=0,d=0;function f(m,_,g,v,x,b,S,y,P,F,L){let D=b/P,O=S/F,N=b/2,H=S/2,X=y/2,k=P+1,Z=F+1,j=0,te=0,fe=new C;for(let we=0;we<Z;we++){let ye=we*O-H;for(let Me=0;Me<k;Me++){let re=Me*D-N;fe[m]=re*v,fe[_]=ye*x,fe[g]=X,l.push(fe.x,fe.y,fe.z),fe[m]=0,fe[_]=0,fe[g]=y>0?1:-1,h.push(fe.x,fe.y,fe.z),u.push(Me/P),u.push(1-we/F),j+=1}}for(let we=0;we<F;we++)for(let ye=0;ye<P;ye++){let Me=p+ye+k*we,re=p+ye+k*(we+1),de=p+(ye+1)+k*(we+1),ce=p+(ye+1)+k*we;c.push(Me,re,ce),c.push(re,de,ce),te+=6}o.addGroup(d,te,L),d+=te,p+=j}f("z","y","x",-1,-1,n,t,e,a,s,0),f("z","y","x",1,-1,n,t,-e,a,s,1),f("x","z","y",1,1,e,n,t,r,a,2),f("x","z","y",1,-1,e,n,-t,r,a,3),f("x","y","z",1,-1,e,t,n,r,s,4),f("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new Ce(l,3)),this.setAttribute("normal",new Ce(h,3)),this.setAttribute("uv",new Ce(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}},nn=class i extends rt{constructor(e=1,t=1,n=4,r=8,s=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:s},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),s=Math.max(1,Math.floor(s));let a=[],o=[],c=[],l=[],h=t/2,u=Math.PI/2*e,p=t,d=2*u+p,f=2*n+s,m=r+1,_=new C,g=new C;for(let v=0;v<=f;v++){let x=0,b=0,S=0,y=0;if(v<=n){let L=v/n,D=L*Math.PI/2;b=-h-e*Math.cos(D),S=e*Math.sin(D),y=-e*Math.cos(D),x=L*u}else if(v<=n+s){let L=(v-n)/s;b=L*t-h,S=e,y=0,x=u+L*p}else{let L=(v-n-s)/n,D=L*Math.PI/2;b=h+e*Math.sin(D),S=e*Math.cos(D),y=e*Math.sin(D),x=u+p+L*u}let P=Math.max(0,Math.min(1,x/d)),F=0;v===0?F=.5/r:v===f&&(F=-.5/r);for(let L=0;L<=r;L++){let D=L/r,O=D*Math.PI*2,N=Math.sin(O),H=Math.cos(O);g.x=-S*H,g.y=b,g.z=S*N,o.push(g.x,g.y,g.z),_.set(-S*H,y,S*N),_.normalize(),c.push(_.x,_.y,_.z),l.push(D+F,P)}if(v>0){let L=(v-1)*m;for(let D=0;D<r;D++){let O=L+D,N=L+D+1,H=v*m+D,X=v*m+D+1;a.push(O,N,H),a.push(N,X,H)}}}this.setIndex(a),this.setAttribute("position",new Ce(o,3)),this.setAttribute("normal",new Ce(c,3)),this.setAttribute("uv",new Ce(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}},Rr=class i extends rt{constructor(e=1,t=32,n=0,r=2*Math.PI){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let s=[],a=[],o=[],c=[],l=new C,h=new ie;a.push(0,0,0),o.push(0,0,1),c.push(.5,.5);for(let u=0,p=3;u<=t;u++,p+=3){let d=n+u/t*r;l.x=e*Math.cos(d),l.y=e*Math.sin(d),a.push(l.x,l.y,l.z),o.push(0,0,1),h.x=(a[p]/e+1)/2,h.y=(a[p+1]/e+1)/2,c.push(h.x,h.y)}for(let u=1;u<=t;u++)s.push(u,u+1,0);this.setIndex(s),this.setAttribute("position",new Ce(a,3)),this.setAttribute("normal",new Ce(o,3)),this.setAttribute("uv",new Ce(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},Vt=class i extends rt{constructor(e=1,t=1,n=1,r=32,s=1,a=!1,o=0,c=2*Math.PI){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let h=[],u=[],p=[],d=[],f=0,m=[],_=n/2,g=0;function v(x){let b=f,S=new ie,y=new C,P=0,F=x===!0?e:t,L=x===!0?1:-1;for(let O=1;O<=r;O++)u.push(0,_*L,0),p.push(0,L,0),d.push(.5,.5),f++;let D=f;for(let O=0;O<=r;O++){let N=O/r*c+o,H=Math.cos(N),X=Math.sin(N);y.x=F*X,y.y=_*L,y.z=F*H,u.push(y.x,y.y,y.z),p.push(0,L,0),S.x=.5*H+.5,S.y=.5*X*L+.5,d.push(S.x,S.y),f++}for(let O=0;O<r;O++){let N=b+O,H=D+O;x===!0?h.push(H,H+1,N):h.push(H+1,H,N),P+=3}l.addGroup(g,P,x===!0?1:2),g+=P}(function(){let x=new C,b=new C,S=0,y=(t-e)/n;for(let P=0;P<=s;P++){let F=[],L=P/s,D=L*(t-e)+e;for(let O=0;O<=r;O++){let N=O/r,H=N*c+o,X=Math.sin(H),k=Math.cos(H);b.x=D*X,b.y=-L*n+_,b.z=D*k,u.push(b.x,b.y,b.z),x.set(X,y,k).normalize(),p.push(x.x,x.y,x.z),d.push(N,1-L),F.push(f++)}m.push(F)}for(let P=0;P<r;P++)for(let F=0;F<s;F++){let L=m[F][P],D=m[F+1][P],O=m[F+1][P+1],N=m[F][P+1];(e>0||F!==0)&&(h.push(L,D,N),S+=3),(t>0||F!==s-1)&&(h.push(D,O,N),S+=3)}l.addGroup(g,S,0),g+=S})(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Ce(u,3)),this.setAttribute("normal",new Ce(p,3)),this.setAttribute("uv",new Ce(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},rn=class i extends Vt{constructor(e=1,t=1,n=32,r=1,s=!1,a=0,o=2*Math.PI){super(0,e,t,n,r,s,a,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:s,thetaStart:a,thetaLength:o}}static fromJSON(e){return new i(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},xi=class i extends rt{constructor(e=[],t=[],n=1,r=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:r};let s=[],a=[];function o(d,f,m,_){let g=_+1,v=[];for(let x=0;x<=g;x++){v[x]=[];let b=d.clone().lerp(m,x/g),S=f.clone().lerp(m,x/g),y=g-x;for(let P=0;P<=y;P++)v[x][P]=P===0&&x===g?b:b.clone().lerp(S,P/y)}for(let x=0;x<g;x++)for(let b=0;b<2*(g-x)-1;b++){let S=Math.floor(b/2);b%2==0?(c(v[x][S+1]),c(v[x+1][S]),c(v[x][S])):(c(v[x][S+1]),c(v[x+1][S+1]),c(v[x+1][S]))}}function c(d){s.push(d.x,d.y,d.z)}function l(d,f){let m=3*d;f.x=e[m+0],f.y=e[m+1],f.z=e[m+2]}function h(d,f,m,_){_<0&&d.x===1&&(a[f]=d.x-1),m.x===0&&m.z===0&&(a[f]=_/2/Math.PI+.5)}function u(d){return Math.atan2(d.z,-d.x)}function p(d){return Math.atan2(-d.y,Math.sqrt(d.x*d.x+d.z*d.z))}(function(d){let f=new C,m=new C,_=new C;for(let g=0;g<t.length;g+=3)l(t[g+0],f),l(t[g+1],m),l(t[g+2],_),o(f,m,_,d)})(r),(function(d){let f=new C;for(let m=0;m<s.length;m+=3)f.x=s[m+0],f.y=s[m+1],f.z=s[m+2],f.normalize().multiplyScalar(d),s[m+0]=f.x,s[m+1]=f.y,s[m+2]=f.z})(n),(function(){let d=new C;for(let f=0;f<s.length;f+=3){d.x=s[f+0],d.y=s[f+1],d.z=s[f+2];let m=u(d)/2/Math.PI+.5,_=p(d)/Math.PI+.5;a.push(m,1-_)}(function(){let f=new C,m=new C,_=new C,g=new C,v=new ie,x=new ie,b=new ie;for(let S=0,y=0;S<s.length;S+=9,y+=6){f.set(s[S+0],s[S+1],s[S+2]),m.set(s[S+3],s[S+4],s[S+5]),_.set(s[S+6],s[S+7],s[S+8]),v.set(a[y+0],a[y+1]),x.set(a[y+2],a[y+3]),b.set(a[y+4],a[y+5]),g.copy(f).add(m).add(_).divideScalar(3);let P=u(g);h(v,y+0,f,P),h(x,y+2,m,P),h(b,y+4,_,P)}})(),(function(){for(let f=0;f<a.length;f+=6){let m=a[f+0],_=a[f+2],g=a[f+4],v=Math.max(m,_,g),x=Math.min(m,_,g);v>.9&&x<.1&&(m<.2&&(a[f+0]+=1),_<.2&&(a[f+2]+=1),g<.2&&(a[f+4]+=1))}})()})(),this.setAttribute("position",new Ce(s,3)),this.setAttribute("normal",new Ce(s.slice(),3)),this.setAttribute("uv",new Ce(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals()}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.vertices,e.indices,e.radius,e.detail)}},Pr=class i extends xi{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n;super([-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r],[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type="DodecahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}},Ua=new C,Fa=new C,Bl=new C,Oa=new ei,Ka=class extends rt{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){let r=Math.pow(10,4),s=Math.cos(_r*t),a=e.getIndex(),o=e.getAttribute("position"),c=a?a.count:o.count,l=[0,0,0],h=["a","b","c"],u=new Array(3),p={},d=[];for(let f=0;f<c;f+=3){a?(l[0]=a.getX(f),l[1]=a.getX(f+1),l[2]=a.getX(f+2)):(l[0]=f,l[1]=f+1,l[2]=f+2);let{a:m,b:_,c:g}=Oa;if(m.fromBufferAttribute(o,l[0]),_.fromBufferAttribute(o,l[1]),g.fromBufferAttribute(o,l[2]),Oa.getNormal(Bl),u[0]=`${Math.round(m.x*r)},${Math.round(m.y*r)},${Math.round(m.z*r)}`,u[1]=`${Math.round(_.x*r)},${Math.round(_.y*r)},${Math.round(_.z*r)}`,u[2]=`${Math.round(g.x*r)},${Math.round(g.y*r)},${Math.round(g.z*r)}`,u[0]!==u[1]&&u[1]!==u[2]&&u[2]!==u[0])for(let v=0;v<3;v++){let x=(v+1)%3,b=u[v],S=u[x],y=Oa[h[v]],P=Oa[h[x]],F=`${b}_${S}`,L=`${S}_${b}`;L in p&&p[L]?(Bl.dot(p[L].normal)<=s&&(d.push(y.x,y.y,y.z),d.push(P.x,P.y,P.z)),p[L]=null):F in p||(p[F]={index0:l[v],index1:l[x],normal:Bl.clone()})}}for(let f in p)if(p[f]){let{index0:m,index1:_}=p[f];Ua.fromBufferAttribute(o,m),Fa.fromBufferAttribute(o,_),d.push(Ua.x,Ua.y,Ua.z),d.push(Fa.x,Fa.y,Fa.z)}this.setAttribute("position",new Ce(d,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}},sn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ae("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(r),t.push(s),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,s=n.length,a;a=t||e*n[s-1];let o,c=0,l=s-1;for(;c<=l;)if(r=Math.floor(c+(l-c)/2),o=n[r]-a,o<0)c=r+1;else{if(!(o>0)){l=r;break}l=r-1}if(r=l,n[r]===a)return r/(s-1);let h=n[r];return(r+(a-h)/(n[r+1]-h))/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);let a=this.getPoint(r),o=this.getPoint(s),c=t||(a.isVector2?new ie:new C);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new C,r=[],s=[],a=[],o=new C,c=new Oe;for(let d=0;d<=e;d++){let f=d/e;r[d]=this.getTangentAt(f,new C)}s[0]=new C,a[0]=new C;let l=Number.MAX_VALUE,h=Math.abs(r[0].x),u=Math.abs(r[0].y),p=Math.abs(r[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),p<=l&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let d=1;d<=e;d++){if(s[d]=s[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(r[d-1],r[d]),o.length()>Number.EPSILON){o.normalize();let f=Math.acos(Ve(r[d-1].dot(r[d]),-1,1));s[d].applyMatrix4(c.makeRotationAxis(o,f))}a[d].crossVectors(r[d],s[d])}if(t===!0){let d=Math.acos(Ve(s[0].dot(s[e]),-1,1));d/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(d=-d);for(let f=1;f<=e;f++)s[f].applyMatrix4(c.makeRotationAxis(r[f],d*f)),a[f].crossVectors(r[f],s[f])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Ir=class extends sn{constructor(e=0,t=0,n=1,r=1,s=0,a=2*Math.PI,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new ie){let n=t,r=2*Math.PI,s=this.aEndAngle-this.aStartAngle,a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(s=a?0:r),this.aClockwise!==!0||a||(s===r?s=-r:s-=r);let o=this.aStartAngle+e*s,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),p=c-this.aX,d=l-this.aY;c=p*h-d*u+this.aX,l=p*u+d*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Qa=class extends Ir{constructor(e,t,n,r,s,a){super(e,t,n,n,r,s,a),this.isArcCurve=!0,this.type="ArcCurve"}};function hh(){let i=0,e=0,t=0,n=0;function r(s,a,o,c){i=s,e=o,t=-3*s+3*a-2*o-c,n=2*s-2*a+o+c}return{initCatmullRom:function(s,a,o,c,l){r(a,o,l*(o-s),l*(c-a))},initNonuniformCatmullRom:function(s,a,o,c,l,h,u){let p=(a-s)/l-(o-s)/(l+h)+(o-a)/h,d=(o-a)/h-(c-a)/(h+u)+(c-o)/u;p*=h,d*=h,r(a,o,p,d)},calc:function(s){let a=s*s;return i+e*s+t*a+n*(a*s)}}}var Bu=new C,zu=new C,zl=new hh,Gl=new hh,kl=new hh,eo=class extends sn{constructor(e=[],t=!1,n="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new C){let n=t,r=this.points,s=r.length,a=(s-(this.closed?0:1))*e,o,c,l=Math.floor(a),h=a-l;this.closed?l+=l>0?0:(Math.floor(Math.abs(l)/s)+1)*s:h===0&&l===s-1&&(l=s-2,h=1),this.closed||l>0?o=r[(l-1)%s]:(zu.subVectors(r[0],r[1]).add(r[0]),o=zu);let u=r[l%s],p=r[(l+1)%s];if(this.closed||l+2<s?c=r[(l+2)%s]:(Bu.subVectors(r[s-1],r[s-2]).add(r[s-1]),c=Bu),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,f=Math.pow(o.distanceToSquared(u),d),m=Math.pow(u.distanceToSquared(p),d),_=Math.pow(p.distanceToSquared(c),d);m<1e-4&&(m=1),f<1e-4&&(f=m),_<1e-4&&(_=m),zl.initNonuniformCatmullRom(o.x,u.x,p.x,c.x,f,m,_),Gl.initNonuniformCatmullRom(o.y,u.y,p.y,c.y,f,m,_),kl.initNonuniformCatmullRom(o.z,u.z,p.z,c.z,f,m,_)}else this.curveType==="catmullrom"&&(zl.initCatmullRom(o.x,u.x,p.x,c.x,this.tension),Gl.initCatmullRom(o.y,u.y,p.y,c.y,this.tension),kl.initCatmullRom(o.z,u.z,p.z,c.z,this.tension));return n.set(zl.calc(h),Gl.calc(h),kl.calc(h)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let r=e.points[t];this.points.push(new C().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Gu(i,e,t,n,r){let s=.5*(n-e),a=.5*(r-t),o=i*i;return(2*t-2*n+s+a)*(i*o)+(-3*t+3*n-2*s-a)*o+s*i+t}function cs(i,e,t,n){return(function(r,s){let a=1-r;return a*a*s})(i,e)+(function(r,s){return 2*(1-r)*r*s})(i,t)+(function(r,s){return r*r*s})(i,n)}function hs(i,e,t,n,r){return(function(s,a){let o=1-s;return o*o*o*a})(i,e)+(function(s,a){let o=1-s;return 3*o*o*s*a})(i,t)+(function(s,a){return 3*(1-s)*s*s*a})(i,n)+(function(s,a){return s*s*s*a})(i,r)}var Ts=class extends sn{constructor(e=new ie,t=new ie,n=new ie,r=new ie){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new ie){let n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(hs(e,r.x,s.x,a.x,o.x),hs(e,r.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},to=class extends sn{constructor(e=new C,t=new C,n=new C,r=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new C){let n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(hs(e,r.x,s.x,a.x,o.x),hs(e,r.y,s.y,a.y,o.y),hs(e,r.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Es=class extends sn{constructor(e=new ie,t=new ie){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ie){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ie){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},no=class extends sn{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ws=class extends sn{constructor(e=new ie,t=new ie,n=new ie){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ie){let n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(cs(e,r.x,s.x,a.x),cs(e,r.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},As=class extends sn{constructor(e=new C,t=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new C){let n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(cs(e,r.x,s.x,a.x),cs(e,r.y,s.y,a.y),cs(e,r.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Cs=class extends sn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ie){let n=t,r=this.points,s=(r.length-1)*e,a=Math.floor(s),o=s-a,c=r[a===0?a:a-1],l=r[a],h=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(Gu(o,c.x,l.x,h.x,u.x),Gu(o,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let r=e.points[t];this.points.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let r=this.points[t];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let r=e.points[t];this.points.push(new ie().fromArray(r))}return this}},io=Object.freeze({__proto__:null,ArcCurve:Qa,CatmullRomCurve3:eo,CubicBezierCurve:Ts,CubicBezierCurve3:to,EllipseCurve:Ir,LineCurve:Es,LineCurve3:no,QuadraticBezierCurve:ws,QuadraticBezierCurve3:As,SplineCurve:Cs}),ro=class extends sn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new io[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),s=0;for(;s<r.length;){if(r[s]>=n){let a=r[s]-n,o=this.curves[s],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}s++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,s=this.curves;r<s.length;r++){let a=s[r],o=a.isEllipseCurve?2*e:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let r=e.curves[t];this.curves.push(r.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let r=this.curves[t];e.curves.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let r=e.curves[t];this.curves.push(new io[r.type]().fromJSON(r))}return this}},Rs=class extends ro{constructor(e){super(),this.type="Path",this.currentPoint=new ie,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Es(this.currentPoint.clone(),new ie(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let s=new ws(this.currentPoint.clone(),new ie(e,t),new ie(n,r));return this.curves.push(s),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,s,a){let o=new Ts(this.currentPoint.clone(),new ie(e,t),new ie(n,r),new ie(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new Cs(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,s,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,r,s,a),this}absarc(e,t,n,r,s,a){return this.absellipse(e,t,n,n,r,s,a),this}ellipse(e,t,n,r,s,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,r,s,a,o,c),this}absellipse(e,t,n,r,s,a,o,c){let l=new Ir(e,t,n,r,s,a,o,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Ps=class extends Rs{constructor(e){super(e),this.uuid=Yi(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let r=e.holes[t];this.holes.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let r=this.holes[t];e.holes.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let r=e.holes[t];this.holes.push(new Rs().fromJSON(r))}return this}};function Mm(i,e,t=2){let n=e&&e.length,r=n?e[0]*t:i.length,s=ku(i,0,r,t,!0),a=[];if(!s||s.next===s.prev)return a;let o,c,l;if(n&&(s=(function(h,u,p,d){let f=[];for(let m=0,_=u.length;m<_;m++){let g=ku(h,u[m]*d,m<_-1?u[m+1]*d:h.length,d,!1);g===g.next&&(g.steiner=!0),f.push(Rm(g))}f.sort(wm);for(let m=0;m<f.length;m++)p=Am(f[m],p);return p})(i,e,s,t)),i.length>80*t){o=i[0],c=i[1];let h=o,u=c;for(let p=t;p<r;p+=t){let d=i[p],f=i[p+1];d<o&&(o=d),f<c&&(c=f),d>h&&(h=d),f>u&&(u=f)}l=Math.max(h-o,u-c),l=l!==0?32767/l:0}return Is(s,a,t,o,c,l,0),a}function ku(i,e,t,n,r){let s;if(r===(function(a,o,c,l){let h=0;for(let u=o,p=c-l;u<c;u+=l)h+=(a[p]-a[u])*(a[u+1]+a[p+1]),p=u;return h})(i,e,t,n)>0)for(let a=e;a<t;a+=n)s=Vu(a/n|0,i[a],i[a+1],s);else for(let a=t-n;a>=e;a-=n)s=Vu(a/n|0,i[a],i[a+1],s);return s&&Lr(s,s.next)&&(Ds(s),s=s.next),s}function zi(i,e){if(!i)return i;e||(e=i);let t,n=i;do if(t=!1,n.steiner||!Lr(n,n.next)&&dt(n.prev,n,n.next)!==0)n=n.next;else{if(Ds(n),n=e=n.prev,n===n.next)break;t=!0}while(t||n!==e);return e}function Is(i,e,t,n,r,s,a){if(!i)return;!a&&s&&(function(c,l,h,u){let p=c;do p.z===0&&(p.z=Kl(p.x,p.y,l,h,u)),p.prevZ=p.prev,p.nextZ=p.next,p=p.next;while(p!==c);p.prevZ.nextZ=null,p.prevZ=null,(function(d){let f,m=1;do{let _,g=d;d=null;let v=null;for(f=0;g;){f++;let x=g,b=0;for(let y=0;y<m&&(b++,x=x.nextZ,x);y++);let S=m;for(;b>0||S>0&&x;)b!==0&&(S===0||!x||g.z<=x.z)?(_=g,g=g.nextZ,b--):(_=x,x=x.nextZ,S--),v?v.nextZ=_:d=_,_.prevZ=v,v=_;g=x}v.nextZ=null,m*=2}while(f>1)})(p)})(i,n,r,s);let o=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(s?bm(i,n,r,s):Sm(i))e.push(c.i,i.i,l.i),Ds(i),i=l.next,o=l.next;else if((i=l)===o){a?a===1?Is(i=Tm(zi(i),e),e,t,n,r,s,2):a===2&&Em(i,e,t,n,r,s):Is(zi(i),e,t,n,r,s,1);break}}}function Sm(i){let e=i.prev,t=i,n=i.next;if(dt(e,t,n)>=0)return!1;let r=e.x,s=t.x,a=n.x,o=e.y,c=t.y,l=n.y,h=Math.min(r,s,a),u=Math.min(o,c,l),p=Math.max(r,s,a),d=Math.max(o,c,l),f=n.next;for(;f!==e;){if(f.x>=h&&f.x<=p&&f.y>=u&&f.y<=d&&os(r,o,s,c,a,l,f.x,f.y)&&dt(f.prev,f,f.next)>=0)return!1;f=f.next}return!0}function bm(i,e,t,n){let r=i.prev,s=i,a=i.next;if(dt(r,s,a)>=0)return!1;let o=r.x,c=s.x,l=a.x,h=r.y,u=s.y,p=a.y,d=Math.min(o,c,l),f=Math.min(h,u,p),m=Math.max(o,c,l),_=Math.max(h,u,p),g=Kl(d,f,e,t,n),v=Kl(m,_,e,t,n),x=i.prevZ,b=i.nextZ;for(;x&&x.z>=g&&b&&b.z<=v;){if(x.x>=d&&x.x<=m&&x.y>=f&&x.y<=_&&x!==r&&x!==a&&os(o,h,c,u,l,p,x.x,x.y)&&dt(x.prev,x,x.next)>=0||(x=x.prevZ,b.x>=d&&b.x<=m&&b.y>=f&&b.y<=_&&b!==r&&b!==a&&os(o,h,c,u,l,p,b.x,b.y)&&dt(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;x&&x.z>=g;){if(x.x>=d&&x.x<=m&&x.y>=f&&x.y<=_&&x!==r&&x!==a&&os(o,h,c,u,l,p,x.x,x.y)&&dt(x.prev,x,x.next)>=0)return!1;x=x.prevZ}for(;b&&b.z<=v;){if(b.x>=d&&b.x<=m&&b.y>=f&&b.y<=_&&b!==r&&b!==a&&os(o,h,c,u,l,p,b.x,b.y)&&dt(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function Tm(i,e){let t=i;do{let n=t.prev,r=t.next.next;!Lr(n,r)&&Gd(n,t,t.next,r)&&Ls(n,r)&&Ls(r,n)&&(e.push(n.i,t.i,r.i),Ds(t),Ds(t.next),t=i=r),t=t.next}while(t!==i);return zi(t)}function Em(i,e,t,n,r,s){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Pm(a,o)){let c=kd(a,o);return a=zi(a,a.next),c=zi(c,c.next),Is(a,e,t,n,r,s,0),void Is(c,e,t,n,r,s,0)}o=o.next}a=a.next}while(a!==i)}function wm(i,e){let t=i.x-e.x;return t===0&&(t=i.y-e.y,t===0)&&(t=(i.next.y-i.y)/(i.next.x-i.x)-(e.next.y-e.y)/(e.next.x-e.x)),t}function Am(i,e){let t=(function(r,s){let a=s,o=r.x,c=r.y,l,h=-1/0;if(Lr(r,a))return a;do{if(Lr(r,a.next))return a.next;if(c<=a.y&&c>=a.next.y&&a.next.y!==a.y){let m=a.x+(c-a.y)*(a.next.x-a.x)/(a.next.y-a.y);if(m<=o&&m>h&&(h=m,l=a.x<a.next.x?a:a.next,m===o))return l}a=a.next}while(a!==s);if(!l)return null;let u=l,p=l.x,d=l.y,f=1/0;a=l;do{if(o>=a.x&&a.x>=p&&o!==a.x&&zd(c<d?o:h,c,p,d,c<d?h:o,c,a.x,a.y)){let m=Math.abs(c-a.y)/(o-a.x);Ls(a,r)&&(m<f||m===f&&(a.x>l.x||a.x===l.x&&Cm(l,a)))&&(l=a,f=m)}a=a.next}while(a!==u);return l})(i,e);if(!t)return e;let n=kd(t,i);return zi(n,n.next),zi(t,t.next)}function Cm(i,e){return dt(i.prev,i,e.prev)<0&&dt(e.next,i,i.next)<0}function Kl(i,e,t,n,r){return(i=1431655765&((i=858993459&((i=252645135&((i=16711935&((i=(i-t)*r|0)|i<<8))|i<<4))|i<<2))|i<<1))|(e=1431655765&((e=858993459&((e=252645135&((e=16711935&((e=(e-n)*r|0)|e<<8))|e<<4))|e<<2))|e<<1))<<1}function Rm(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function zd(i,e,t,n,r,s,a,o){return(r-a)*(e-o)>=(i-a)*(s-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(n-o)}function os(i,e,t,n,r,s,a,o){return!(i===a&&e===o)&&zd(i,e,t,n,r,s,a,o)}function Pm(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!(function(t,n){let r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==n.i&&r.next.i!==n.i&&Gd(r,r.next,t,n))return!0;r=r.next}while(r!==t);return!1})(i,e)&&(Ls(i,e)&&Ls(e,i)&&(function(t,n){let r=t,s=!1,a=(t.x+n.x)/2,o=(t.y+n.y)/2;do r.y>o!=r.next.y>o&&r.next.y!==r.y&&a<(r.next.x-r.x)*(o-r.y)/(r.next.y-r.y)+r.x&&(s=!s),r=r.next;while(r!==t);return s})(i,e)&&(dt(i.prev,i,e.prev)||dt(i,e.prev,e))||Lr(i,e)&&dt(i.prev,i,i.next)>0&&dt(e.prev,e,e.next)>0)}function dt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Lr(i,e){return i.x===e.x&&i.y===e.y}function Gd(i,e,t,n){let r=za(dt(i,e,t)),s=za(dt(i,e,n)),a=za(dt(t,n,i)),o=za(dt(t,n,e));return r!==s&&a!==o||!(r!==0||!Ba(i,t,e))||!(s!==0||!Ba(i,n,e))||!(a!==0||!Ba(t,i,n))||!(o!==0||!Ba(t,e,n))}function Ba(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function za(i){return i>0?1:i<0?-1:0}function Ls(i,e){return dt(i.prev,i,i.next)<0?dt(i,e,i.next)>=0&&dt(i,i.prev,e)>=0:dt(i,e,i.prev)<0||dt(i,i.next,e)<0}function kd(i,e){let t=Ql(i.i,i.x,i.y),n=Ql(e.i,e.x,e.y),r=i.next,s=e.prev;return i.next=e,e.prev=i,t.next=r,r.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function Vu(i,e,t,n){let r=Ql(i,e,t);return n?(r.next=n.next,r.prev=n,n.next.prev=r,n.next=r):(r.prev=r,r.next=r),r}function Ds(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Ql(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}var ec=class{static triangulate(e,t,n=2){return Mm(e,t,n)}},Bn=class i{static area(e){let t=e.length,n=0;for(let r=t-1,s=0;s<t;r=s++)n+=e[r].x*e[s].y-e[s].x*e[r].y;return .5*n}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],r=[],s=[];Hu(e),Wu(n,e);let a=e.length;t.forEach(Hu);for(let c=0;c<t.length;c++)r.push(a),a+=t[c].length,Wu(n,t[c]);let o=ec.triangulate(n,r);for(let c=0;c<o.length;c+=3)s.push(o.slice(c,c+3));return s}};function Hu(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Wu(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var so=class i extends rt{constructor(e=new Ps([new ie(.5,.5),new ie(-.5,.5),new ie(-.5,-.5),new ie(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],s=[];for(let o=0,c=e.length;o<c;o++)a(e[o]);function a(o){let c=[],l=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1,p=t.bevelEnabled===void 0||t.bevelEnabled,d=t.bevelThickness!==void 0?t.bevelThickness:.2,f=t.bevelSize!==void 0?t.bevelSize:d-.1,m=t.bevelOffset!==void 0?t.bevelOffset:0,_=t.bevelSegments!==void 0?t.bevelSegments:3,g=t.extrudePath,v=t.UVGenerator!==void 0?t.UVGenerator:Im,x,b,S,y,P,F=!1;if(g){x=g.getSpacedPoints(h),F=!0,p=!1;let R=!!g.isCatmullRomCurve3&&g.closed;b=g.computeFrenetFrames(h,R),S=new C,y=new C,P=new C}p||(_=0,d=0,f=0,m=0);let L=o.extractPoints(l),D=L.shape,O=L.holes;if(!Bn.isClockWise(D)){D=D.reverse();for(let R=0,z=O.length;R<z;R++){let M=O[R];Bn.isClockWise(M)&&(O[R]=M.reverse())}}function N(R){let z=10000000000000001e-36,M=R[0];for(let B=1;B<=R.length;B++){let U=B%R.length,A=R[U],W=A.x-M.x,q=A.y-M.y,J=W*W+q*q,ae=Math.max(Math.abs(A.x),Math.abs(A.y),Math.abs(M.x),Math.abs(M.y));J<=z*ae*ae?(R.splice(U,1),B--):M=A}}N(D),O.forEach(N);let H=O.length,X=D;for(let R=0;R<H;R++){let z=O[R];D=D.concat(z)}function k(R,z,M){return z||Re("ExtrudeGeometry: vec does not exist"),R.clone().addScaledVector(z,M)}let Z=D.length;function j(R,z,M){let B,U,A,W=R.x-z.x,q=R.y-z.y,J=M.x-R.x,ae=M.y-R.y,Se=W*W+q*q,be=W*ae-q*J;if(Math.abs(be)>Number.EPSILON){let pe=Math.sqrt(Se),Le=Math.sqrt(J*J+ae*ae),ne=z.x-q/pe,oe=z.y+W/pe,se=((M.x-ae/Le-ne)*ae-(M.y+J/Le-oe)*J)/(W*ae-q*J);B=ne+W*se-R.x,U=oe+q*se-R.y;let ge=B*B+U*U;if(ge<=2)return new ie(B,U);A=Math.sqrt(ge/2)}else{let pe=!1;W>Number.EPSILON?J>Number.EPSILON&&(pe=!0):W<-Number.EPSILON?J<-Number.EPSILON&&(pe=!0):Math.sign(q)===Math.sign(ae)&&(pe=!0),pe?(B=-q,U=W,A=Math.sqrt(Se)):(B=W,U=q,A=Math.sqrt(Se/2))}return new ie(B/A,U/A)}let te=[];for(let R=0,z=X.length,M=z-1,B=R+1;R<z;R++,M++,B++)M===z&&(M=0),B===z&&(B=0),te[R]=j(X[R],X[M],X[B]);let fe=[],we,ye,Me=te.concat();for(let R=0,z=H;R<z;R++){let M=O[R];we=[];for(let B=0,U=M.length,A=U-1,W=B+1;B<U;B++,A++,W++)A===U&&(A=0),W===U&&(W=0),we[B]=j(M[B],M[A],M[W]);fe.push(we),Me=Me.concat(we)}if(_===0)ye=Bn.triangulateShape(X,O);else{let R=[],z=[];for(let M=0;M<_;M++){let B=M/_,U=d*Math.cos(B*Math.PI/2),A=f*Math.sin(B*Math.PI/2)+m;for(let W=0,q=X.length;W<q;W++){let J=k(X[W],te[W],A);ve(J.x,J.y,-U),B===0&&R.push(J)}for(let W=0,q=H;W<q;W++){let J=O[W];we=fe[W];let ae=[];for(let Se=0,be=J.length;Se<be;Se++){let pe=k(J[Se],we[Se],A);ve(pe.x,pe.y,-U),B===0&&ae.push(pe)}B===0&&z.push(ae)}}ye=Bn.triangulateShape(R,z)}let re=ye.length,de=f+m;for(let R=0;R<Z;R++){let z=p?k(D[R],Me[R],de):D[R];F?(y.copy(b.normals[0]).multiplyScalar(z.x),S.copy(b.binormals[0]).multiplyScalar(z.y),P.copy(x[0]).add(y).add(S),ve(P.x,P.y,P.z)):ve(z.x,z.y,0)}for(let R=1;R<=h;R++)for(let z=0;z<Z;z++){let M=p?k(D[z],Me[z],de):D[z];F?(y.copy(b.normals[R]).multiplyScalar(M.x),S.copy(b.binormals[R]).multiplyScalar(M.y),P.copy(x[R]).add(y).add(S),ve(P.x,P.y,P.z)):ve(M.x,M.y,u/h*R)}for(let R=_-1;R>=0;R--){let z=R/_,M=d*Math.cos(z*Math.PI/2),B=f*Math.sin(z*Math.PI/2)+m;for(let U=0,A=X.length;U<A;U++){let W=k(X[U],te[U],B);ve(W.x,W.y,u+M)}for(let U=0,A=O.length;U<A;U++){let W=O[U];we=fe[U];for(let q=0,J=W.length;q<J;q++){let ae=k(W[q],we[q],B);F?ve(ae.x,ae.y+x[h-1].y,x[h-1].x+M):ve(ae.x,ae.y,u+M)}}}function ce(R,z){let M=R.length;for(;--M>=0;){let B=M,U=M-1;U<0&&(U=R.length-1);for(let A=0,W=h+2*_;A<W;A++){let q=Z*A,J=Z*(A+1);ee(z+B+q,z+U+q,z+U+J,z+B+J)}}}function ve(R,z,M){c.push(R),c.push(z),c.push(M)}function ke(R,z,M){I(R),I(z),I(M);let B=r.length/3,U=v.generateTopUV(n,r,B-3,B-2,B-1);T(U[0]),T(U[1]),T(U[2])}function ee(R,z,M,B){I(R),I(z),I(B),I(z),I(M),I(B);let U=r.length/3,A=v.generateSideWallUV(n,r,U-6,U-3,U-2,U-1);T(A[0]),T(A[1]),T(A[3]),T(A[1]),T(A[2]),T(A[3])}function I(R){r.push(c[3*R+0]),r.push(c[3*R+1]),r.push(c[3*R+2])}function T(R){s.push(R.x),s.push(R.y)}(function(){let R=r.length/3;if(p){let z=0,M=Z*z;for(let B=0;B<re;B++){let U=ye[B];ke(U[2]+M,U[1]+M,U[0]+M)}z=h+2*_,M=Z*z;for(let B=0;B<re;B++){let U=ye[B];ke(U[0]+M,U[1]+M,U[2]+M)}}else{for(let z=0;z<re;z++){let M=ye[z];ke(M[2],M[1],M[0])}for(let z=0;z<re;z++){let M=ye[z];ke(M[0]+Z*h,M[1]+Z*h,M[2]+Z*h)}}n.addGroup(R,r.length/3-R,0)})(),(function(){let R=r.length/3,z=0;ce(X,z),z+=X.length;for(let M=0,B=O.length;M<B;M++){let U=O[M];ce(U,z),z+=U.length}n.addGroup(R,r.length/3-R,1)})()}this.setAttribute("position",new Ce(r,3)),this.setAttribute("uv",new Ce(s,2)),this.computeVertexNormals()}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return(function(t,n,r){if(r.shapes=[],Array.isArray(t))for(let s=0,a=t.length;s<a;s++){let o=t[s];r.shapes.push(o.uuid)}else r.shapes.push(t.uuid);return r.options=Object.assign({},n),n.extrudePath!==void 0&&(r.options.extrudePath=n.extrudePath.toJSON()),r})(this.parameters.shapes,this.parameters.options,e)}static fromJSON(e,t){let n=[];for(let s=0,a=e.shapes.length;s<a;s++){let o=t[e.shapes[s]];n.push(o)}let r=e.options.extrudePath;return r!==void 0&&(e.options.extrudePath=new io[r.type]().fromJSON(r)),new i(n,e.options)}},Im={generateTopUV:function(i,e,t,n,r){let s=e[3*t],a=e[3*t+1],o=e[3*n],c=e[3*n+1],l=e[3*r],h=e[3*r+1];return[new ie(s,a),new ie(o,c),new ie(l,h)]},generateSideWallUV:function(i,e,t,n,r,s){let a=e[3*t],o=e[3*t+1],c=e[3*t+2],l=e[3*n],h=e[3*n+1],u=e[3*n+2],p=e[3*r],d=e[3*r+1],f=e[3*r+2],m=e[3*s],_=e[3*s+1],g=e[3*s+2];return Math.abs(o-h)<Math.abs(a-l)?[new ie(a,1-c),new ie(l,1-u),new ie(p,1-f),new ie(m,1-g)]:[new ie(o,1-c),new ie(h,1-u),new ie(d,1-f),new ie(_,1-g)]}},Mi=class i extends xi{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2;super([-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}},ao=class i extends rt{constructor(e=[new ie(0,-.5),new ie(.5,0),new ie(0,.5)],t=12,n=0,r=2*Math.PI){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=Ve(r,0,2*Math.PI);let s=[],a=[],o=[],c=[],l=[],h=1/t,u=new C,p=new ie,d=new C,f=new C,m=new C,_=0,g=0;for(let v=0;v<=e.length-1;v++)switch(v){case 0:_=e[v+1].x-e[v].x,g=e[v+1].y-e[v].y,d.x=1*g,d.y=-_,d.z=0*g,m.copy(d),d.normalize(),c.push(d.x,d.y,d.z);break;case e.length-1:c.push(m.x,m.y,m.z);break;default:_=e[v+1].x-e[v].x,g=e[v+1].y-e[v].y,d.x=1*g,d.y=-_,d.z=0*g,f.copy(d),d.x+=m.x,d.y+=m.y,d.z+=m.z,d.normalize(),c.push(d.x,d.y,d.z),m.copy(f)}for(let v=0;v<=t;v++){let x=n+v*h*r,b=Math.sin(x),S=Math.cos(x);for(let y=0;y<=e.length-1;y++){u.x=e[y].x*b,u.y=e[y].y,u.z=e[y].x*S,a.push(u.x,u.y,u.z),p.x=v/t,p.y=y/(e.length-1),o.push(p.x,p.y);let P=c[3*y+0]*b,F=c[3*y+1],L=c[3*y+0]*S;l.push(P,F,L)}}for(let v=0;v<t;v++)for(let x=0;x<e.length-1;x++){let b=x+v*e.length,S=b,y=b+e.length,P=b+e.length+1,F=b+1;s.push(S,y,F),s.push(P,F,y)}this.setIndex(s),this.setAttribute("position",new Ce(a,3)),this.setAttribute("uv",new Ce(o,2)),this.setAttribute("normal",new Ce(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.points,e.segments,e.phiStart,e.phiLength)}},oo=class i extends xi{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}},Si=class i extends rt{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,h=c+1,u=e/o,p=t/c,d=[],f=[],m=[],_=[];for(let g=0;g<h;g++){let v=g*p-a;for(let x=0;x<l;x++){let b=x*u-s;f.push(b,-v,0),m.push(0,0,1),_.push(x/o),_.push(1-g/c)}}for(let g=0;g<c;g++)for(let v=0;v<o;v++){let x=v+l*g,b=v+l*(g+1),S=v+1+l*(g+1),y=v+1+l*g;d.push(x,b,y),d.push(b,S,y)}this.setIndex(d),this.setAttribute("position",new Ce(f,3)),this.setAttribute("normal",new Ce(m,3)),this.setAttribute("uv",new Ce(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},Dr=class i extends rt{constructor(e=.5,t=1,n=32,r=1,s=0,a=2*Math.PI){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:s,thetaLength:a},n=Math.max(3,n);let o=[],c=[],l=[],h=[],u=e,p=(t-e)/(r=Math.max(1,r)),d=new C,f=new ie;for(let m=0;m<=r;m++){for(let _=0;_<=n;_++){let g=s+_/n*a;d.x=u*Math.cos(g),d.y=u*Math.sin(g),c.push(d.x,d.y,d.z),l.push(0,0,1),f.x=(d.x/t+1)/2,f.y=(d.y/t+1)/2,h.push(f.x,f.y)}u+=p}for(let m=0;m<r;m++){let _=m*(n+1);for(let g=0;g<n;g++){let v=g+_,x=v,b=v+n+1,S=v+n+2,y=v+1;o.push(x,b,y),o.push(b,S,y)}}this.setIndex(o),this.setAttribute("position",new Ce(c,3)),this.setAttribute("normal",new Ce(l,3)),this.setAttribute("uv",new Ce(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}},lo=class i extends rt{constructor(e=new Ps([new ie(0,.5),new ie(-.5,-.5),new ie(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};let n=[],r=[],s=[],a=[],o=0,c=0;if(Array.isArray(e)===!1)l(e);else for(let h=0;h<e.length;h++)l(e[h]),this.addGroup(o,c,h),o+=c,c=0;function l(h){let u=r.length/3,p=h.extractPoints(t),d=p.shape,f=p.holes;Bn.isClockWise(d)===!1&&(d=d.reverse());for(let _=0,g=f.length;_<g;_++){let v=f[_];Bn.isClockWise(v)===!0&&(f[_]=v.reverse())}let m=Bn.triangulateShape(d,f);for(let _=0,g=f.length;_<g;_++){let v=f[_];d=d.concat(v)}for(let _=0,g=d.length;_<g;_++){let v=d[_];r.push(v.x,v.y,0),s.push(0,0,1),a.push(v.x,v.y)}for(let _=0,g=m.length;_<g;_++){let v=m[_],x=v[0]+u,b=v[1]+u,S=v[2]+u;n.push(x,b,S),c+=3}}this.setIndex(n),this.setAttribute("position",new Ce(r,3)),this.setAttribute("normal",new Ce(s,3)),this.setAttribute("uv",new Ce(a,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return(function(t,n){if(n.shapes=[],Array.isArray(t))for(let r=0,s=t.length;r<s;r++){let a=t[r];n.shapes.push(a.uuid)}else n.shapes.push(t.uuid);return n})(this.parameters.shapes,e)}static fromJSON(e,t){let n=[];for(let r=0,s=e.shapes.length;r<s;r++){let a=t[e.shapes[r]];n.push(a)}return new i(n,e.curveSegments)}},Rt=class i extends rt{constructor(e=1,t=32,n=16,r=0,s=2*Math.PI,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let c=Math.min(a+o,Math.PI),l=0,h=[],u=new C,p=new C,d=[],f=[],m=[],_=[];for(let g=0;g<=n;g++){let v=[],x=g/n,b=a+x*o,S=e*Math.cos(b),y=Math.sqrt(e*e-S*S),P=0;g===0&&a===0?P=.5/t:g===n&&c===Math.PI&&(P=-.5/t);for(let F=0;F<=t;F++){let L=F/t,D=r+L*s;u.x=-y*Math.cos(D),u.y=S,u.z=y*Math.sin(D),f.push(u.x,u.y,u.z),p.copy(u).normalize(),m.push(p.x,p.y,p.z),_.push(L+P,1-x),v.push(l++)}h.push(v)}for(let g=0;g<n;g++)for(let v=0;v<t;v++){let x=h[g][v+1],b=h[g][v],S=h[g+1][v],y=h[g+1][v+1];(g!==0||a>0)&&d.push(x,b,y),(g!==n-1||c<Math.PI)&&d.push(b,S,y)}this.setIndex(d),this.setAttribute("position",new Ce(f,3)),this.setAttribute("normal",new Ce(m,3)),this.setAttribute("uv",new Ce(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}},co=class i extends xi{constructor(e=1,t=0){super([1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],[2,1,0,0,3,2,1,3,0,2,3,1],e,t),this.type="TetrahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new i(e.radius,e.detail)}},Gi=class i extends rt{constructor(e=1,t=.4,n=12,r=48,s=2*Math.PI,a=0,o=2*Math.PI){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:s,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let c=[],l=[],h=[],u=[],p=new C,d=new C,f=new C;for(let m=0;m<=n;m++){let _=a+m/n*o;for(let g=0;g<=r;g++){let v=g/r*s;d.x=(e+t*Math.cos(_))*Math.cos(v),d.y=(e+t*Math.cos(_))*Math.sin(v),d.z=t*Math.sin(_),l.push(d.x,d.y,d.z),p.x=e*Math.cos(v),p.y=e*Math.sin(v),f.subVectors(d,p).normalize(),h.push(f.x,f.y,f.z),u.push(g/r),u.push(m/n)}}for(let m=1;m<=n;m++)for(let _=1;_<=r;_++){let g=(r+1)*m+_-1,v=(r+1)*(m-1)+_-1,x=(r+1)*(m-1)+_,b=(r+1)*m+_;c.push(g,v,b),c.push(v,x,b)}this.setIndex(c),this.setAttribute("position",new Ce(l,3)),this.setAttribute("normal",new Ce(h,3)),this.setAttribute("uv",new Ce(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}},ho=class i extends rt{constructor(e=1,t=.4,n=64,r=8,s=2,a=3){super(),this.type="TorusKnotGeometry",this.parameters={radius:e,tube:t,tubularSegments:n,radialSegments:r,p:s,q:a},n=Math.floor(n),r=Math.floor(r);let o=[],c=[],l=[],h=[],u=new C,p=new C,d=new C,f=new C,m=new C,_=new C,g=new C;for(let x=0;x<=n;++x){let b=x/n*s*Math.PI*2;v(b,s,a,e,d),v(b+.01,s,a,e,f),_.subVectors(f,d),g.addVectors(f,d),m.crossVectors(_,g),g.crossVectors(m,_),m.normalize(),g.normalize();for(let S=0;S<=r;++S){let y=S/r*Math.PI*2,P=-t*Math.cos(y),F=t*Math.sin(y);u.x=d.x+(P*g.x+F*m.x),u.y=d.y+(P*g.y+F*m.y),u.z=d.z+(P*g.z+F*m.z),c.push(u.x,u.y,u.z),p.subVectors(u,d).normalize(),l.push(p.x,p.y,p.z),h.push(x/n),h.push(S/r)}}for(let x=1;x<=n;x++)for(let b=1;b<=r;b++){let S=(r+1)*(x-1)+(b-1),y=(r+1)*x+(b-1),P=(r+1)*x+b,F=(r+1)*(x-1)+b;o.push(S,y,F),o.push(y,P,F)}function v(x,b,S,y,P){let F=Math.cos(x),L=Math.sin(x),D=S/b*x,O=Math.cos(D);P.x=y*(2+O)*.5*F,P.y=y*(2+O)*L*.5,P.z=y*Math.sin(D)*.5}this.setIndex(o),this.setAttribute("position",new Ce(c,3)),this.setAttribute("normal",new Ce(l,3)),this.setAttribute("uv",new Ce(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.tubularSegments,e.radialSegments,e.p,e.q)}},uo=class i extends rt{constructor(e=new As(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,n=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:s};let a=e.computeFrenetFrames(t,s);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new C,c=new C,l=new ie,h=new C,u=[],p=[],d=[],f=[];function m(_){h=e.getPointAt(_/t,h);let g=a.normals[_],v=a.binormals[_];for(let x=0;x<=r;x++){let b=x/r*Math.PI*2,S=Math.sin(b),y=-Math.cos(b);c.x=y*g.x+S*v.x,c.y=y*g.y+S*v.y,c.z=y*g.z+S*v.z,c.normalize(),p.push(c.x,c.y,c.z),o.x=h.x+n*c.x,o.y=h.y+n*c.y,o.z=h.z+n*c.z,u.push(o.x,o.y,o.z)}}(function(){for(let _=0;_<t;_++)m(_);m(s===!1?t:0),(function(){for(let _=0;_<=t;_++)for(let g=0;g<=r;g++)l.x=_/t,l.y=g/r,d.push(l.x,l.y)})(),(function(){for(let _=1;_<=t;_++)for(let g=1;g<=r;g++){let v=(r+1)*(_-1)+(g-1),x=(r+1)*_+(g-1),b=(r+1)*_+g,S=(r+1)*(_-1)+g;f.push(v,x,S),f.push(x,b,S)}})()})(),this.setIndex(f),this.setAttribute("position",new Ce(u,3)),this.setAttribute("normal",new Ce(p,3)),this.setAttribute("uv",new Ce(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new i(new io[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}},po=class extends rt{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],n=new Set,r=new C,s=new C;if(e.index!==null){let a=e.attributes.position,o=e.index,c=e.groups;c.length===0&&(c=[{start:0,count:o.count,materialIndex:0}]);for(let l=0,h=c.length;l<h;++l){let u=c[l],p=u.start;for(let d=p,f=p+u.count;d<f;d+=3)for(let m=0;m<3;m++){let _=o.getX(d+m),g=o.getX(d+(m+1)%3);r.fromBufferAttribute(a,_),s.fromBufferAttribute(a,g),Xu(r,s,n)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}}else{let a=e.attributes.position;for(let o=0,c=a.count/3;o<c;o++)for(let l=0;l<3;l++){let h=3*o+l,u=3*o+(l+1)%3;r.fromBufferAttribute(a,h),s.fromBufferAttribute(a,u),Xu(r,s,n)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}this.setAttribute("position",new Ce(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};function Xu(i,e,t){let n=`${i.x},${i.y},${i.z}-${e.x},${e.y},${e.z}`,r=`${e.x},${e.y},${e.z}-${i.x},${i.y},${i.z}`;return t.has(n)!==!0&&t.has(r)!==!0&&(t.add(n),t.add(r),!0)}var rv=Object.freeze({__proto__:null,BoxGeometry:Bi,CapsuleGeometry:nn,CircleGeometry:Rr,ConeGeometry:rn,CylinderGeometry:Vt,DodecahedronGeometry:Pr,EdgesGeometry:Ka,ExtrudeGeometry:so,IcosahedronGeometry:Mi,LatheGeometry:ao,OctahedronGeometry:oo,PlaneGeometry:Si,PolyhedronGeometry:xi,RingGeometry:Dr,ShapeGeometry:lo,SphereGeometry:Rt,TetrahedronGeometry:co,TorusGeometry:Gi,TorusKnotGeometry:ho,TubeGeometry:uo,WireframeGeometry:po});function Zi(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let r=i[t][n];if(ju(r))r.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone();else if(Array.isArray(r))if(ju(r[0])){let s=[];for(let a=0,o=r.length;a<o;a++)s[a]=r[a].clone();e[t][n]=s}else e[t][n]=r.slice();else e[t][n]=r}}return e}function Ht(i){let e={};for(let t=0;t<i.length;t++){let n=Zi(i[t]);for(let r in n)e[r]=n[r]}return e}function ju(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function uh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:je.workingColorSpace}var Vd={clone:Zi,merge:Ht},an=class extends ii{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,this.fragmentShader=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Zi(e.uniforms),this.uniformsGroups=(function(t){let n=[];for(let r=0;r<t.length;r++)n.push(t[r].clone());return n})(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let r in this.uniforms){let s=this.uniforms[r].value;s&&s.isTexture?t.uniforms[r]={type:"t",value:s.toJSON(e).uuid}:s&&s.isColor?t.uniforms[r]={type:"c",value:s.getHex()}:s&&s.isVector2?t.uniforms[r]={type:"v2",value:s.toArray()}:s&&s.isVector3?t.uniforms[r]={type:"v3",value:s.toArray()}:s&&s.isVector4?t.uniforms[r]={type:"v4",value:s.toArray()}:s&&s.isMatrix3?t.uniforms[r]={type:"m3",value:s.toArray()}:s&&s.isMatrix4?t.uniforms[r]={type:"m4",value:s.toArray()}:t.uniforms[r]={value:s}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case"t":this.uniforms[n].value=t[r.value]||null;break;case"c":this.uniforms[n].value=new xe().setHex(r.value);break;case"v2":this.uniforms[n].value=new ie().fromArray(r.value);break;case"v3":this.uniforms[n].value=new C().fromArray(r.value);break;case"v4":this.uniforms[n].value=new it().fromArray(r.value);break;case"m3":this.uniforms[n].value=new Be().fromArray(r.value);break;case"m4":this.uniforms[n].value=new Oe().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},mo=class extends an{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},ki=class extends ii{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Ns=class extends ki{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ie(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ve(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new xe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new xe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new xe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var fo=class extends ii{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},go=class extends ii{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ga(i,e){return i&&i.constructor!==e?typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i):i}var bi=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],s=t[n-1];n:{e:{let a;t:{i:if(!(e<r)){for(let o=n+2;;){if(r===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=r,r=t[++n],e<r)break e}a=t.length;break t}if(!(e>=s)){let o=t[1];e<o&&(n=2,s=o);for(let c=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(r=s,s=t[--n-1],e>=s)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(r=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,r)}return this.interpolate_(n,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r;for(let a=0;a!==r;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},vo=class extends bi{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Xl,endingEnd:Xl}}intervalChanged_(e,t,n){let r=this.parameterPositions,s=e-2,a=e+1,o=r[s],c=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case jl:s=e,o=2*t-n;break;case ql:s=r.length-2,o=t+r[s]-r[s+1];break;default:s=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case jl:a=e,c=2*n-t;break;case ql:a=1,c=n+r[1]-r[0];break;default:a=e-1,c=t}let l=.5*(n-t),h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=s*h,this._offsetNext=a*h}interpolate_(e,t,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,u=this._offsetNext,p=this._weightPrev,d=this._weightNext,f=(n-t)/(r-t),m=f*f,_=m*f,g=-p*_+2*p*m-p*f,v=(1+p)*_+(-1.5-2*p)*m+(-.5+p)*f+1,x=(-1-d)*_+(1.5+d)*m+.5*f,b=d*_-d*m;for(let S=0;S!==o;++S)s[S]=g*a[h+S]+v*a[l+S]+x*a[c+S]+b*a[u+S];return s}},_o=class extends bi{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(r-t),u=1-h;for(let p=0;p!==o;++p)s[p]=a[l+p]*u+a[c+p]*h;return s}},yo=class extends bi{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},xo=class extends bi{interpolate_(e,t,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this.inTangents,u=this.outTangents;if(!h||!u){let f=(n-t)/(r-t),m=1-f;for(let _=0;_!==o;++_)s[_]=a[l+_]*m+a[c+_]*f;return s}let p=2*o,d=e-1;for(let f=0;f!==o;++f){let m=a[l+f],_=a[c+f],g=d*p+2*f,v=u[g],x=u[g+1],b=e*p+2*f,S=h[b],y=h[b+1],P,F,L,D,O,N=(n-t)/(r-t);for(let H=0;H<8;H++){P=N*N,F=P*N,L=1-N,D=L*L,O=D*L;let X=O*t+3*D*N*v+3*L*P*S+F*r-n;if(Math.abs(X)<1e-10)break;let k=3*D*(v-t)+6*L*N*(S-v)+3*P*(r-S);if(Math.abs(k)<1e-10)break;N-=X/k,N=Math.max(0,Math.min(1,N))}s[f]=O*m+3*D*N*x+3*L*P*y+F*_}return s}},en=class{constructor(e,t,n,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ga(t,this.TimeBufferType),this.values=Ga(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ga(e.times,Array),values:Ga(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(n.interpolation=r)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new yo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new _o(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new vo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new xo(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case us:t=this.InterpolantFactoryMethodDiscrete;break;case ja:t=this.InterpolantFactoryMethodLinear;break;case Ha:t=this.InterpolantFactoryMethodSmooth;break;case Wl:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0){if(e===this.DefaultInterpolation)throw new Error(n);this.setInterpolation(this.DefaultInterpolation)}return Ae("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return us;case this.InterpolantFactoryMethodLinear:return ja;case this.InterpolantFactoryMethodSmooth:return Ha;case this.InterpolantFactoryMethodBezier:return Wl}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,s=0,a=r-1;for(;s!==r&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==r){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Re("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,r=this.values,s=n.length;s===0&&(Re("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){Re("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){Re("KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(r!==void 0&&tm(r))for(let o=0,c=r.length;o!==c;++o){let l=r[o];if(isNaN(l)){Re("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Ha,s=e.length-1,a=1;for(let o=1;o<s;++o){let c=!1,l=e[o];if(l!==e[o+1]&&(o!==1||l!==e[0]))if(r)c=!0;else{let h=o*n,u=h-n,p=h+n;for(let d=0;d!==n;++d){let f=t[h+d];if(f!==t[u+d]||f!==t[p+d]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let h=o*n,u=a*n;for(let p=0;p!==n;++p)t[u+p]=t[h+p]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=new this.constructor(this.name,e,t);return n.createInterpolant=this.createInterpolant,n}};en.prototype.ValueTypeName="",en.prototype.TimeBufferType=Float32Array,en.prototype.ValueBufferType=Float32Array,en.prototype.DefaultInterpolation=ja;var gi=class extends en{constructor(e,t,n){super(e,t,n)}};gi.prototype.ValueTypeName="bool",gi.prototype.ValueBufferType=Array,gi.prototype.DefaultInterpolation=us,gi.prototype.InterpolantFactoryMethodLinear=void 0,gi.prototype.InterpolantFactoryMethodSmooth=void 0;var Mo=class extends en{constructor(e,t,n,r){super(e,t,n,r)}};Mo.prototype.ValueTypeName="color";var So=class extends en{constructor(e,t,n,r){super(e,t,n,r)}};So.prototype.ValueTypeName="number";var bo=class extends bi{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(r-t),l=e*o;for(let h=l+o;l!==h;l+=4)Zt.slerpFlat(s,0,a,l-o,a,l,c);return s}},Us=class extends en{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new bo(this.times,this.values,this.getValueSize(),e)}};Us.prototype.ValueTypeName="quaternion",Us.prototype.InterpolantFactoryMethodSmooth=void 0;var vi=class extends en{constructor(e,t,n){super(e,t,n)}};vi.prototype.ValueTypeName="string",vi.prototype.ValueBufferType=Array,vi.prototype.DefaultInterpolation=us,vi.prototype.InterpolantFactoryMethodLinear=void 0,vi.prototype.InterpolantFactoryMethodSmooth=void 0;var To=class extends en{constructor(e,t,n,r){super(e,t,n,r)}};To.prototype.ValueTypeName="vector";var Eo=class{constructor(e,t,n){let r=this,s,a=!1,o=0,c=0,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){c++,a===!1&&r.onStart!==void 0&&r.onStart(h,o,c),a=!0},this.itemEnd=function(h){o++,r.onProgress!==void 0&&r.onProgress(h,o,c),o===c&&(a=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),s?s(h):h},this.setURLModifier=function(h){return s=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,p=l.length;u<p;u+=2){let d=l[u],f=l[u+1];if(d.global&&(d.lastIndex=0),d.test(h))return f}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Hd=new Eo,wo=class{constructor(e){this.manager=e!==void 0?e:Hd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};wo.DEFAULT_MATERIAL_NAME="__DEFAULT";var Fs=class extends Nt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xe(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Nr=class extends Fs{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Nt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Vl=new Oe,qu=new C,Yu=new C,tc=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ie(512,512),this.mapType=on,this.map=null,this.mapPass=null,this.matrix=new Oe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ri,this._frameExtents=new ie(1,1),this._viewportCount=1,this._viewports=[new it(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;qu.setFromMatrixPosition(e.matrixWorld),t.position.copy(qu),Yu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Yu),t.updateMatrixWorld(),Vl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Vl,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===xr||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Vl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),this.mapSize.x===512&&this.mapSize.y===512||(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},ka=new C,Va=new Zt,Fn=new C,Ur=class extends Nt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Oe,this.projectionMatrix=new Oe,this.projectionMatrixInverse=new Oe,this.coordinateSystem=ni,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(ka,Va,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ka,Va,Fn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(ka,Va,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ka,Va,Fn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},fi=new C,Zu=new ie,Ju=new ie,Dt=class extends Ur{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=2*Sr*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(.5*_r*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return 2*Sr*Math.atan(Math.tan(.5*_r*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){fi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(fi.x,fi.y).multiplyScalar(-e/fi.z),fi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(fi.x,fi.y).multiplyScalar(-e/fi.z)}getViewSize(e,t){return this.getViewBounds(e,Zu,Ju),t.subVectors(Ju,Zu)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(.5*_r*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,t-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var Fr=class extends Ur{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=n-e,a=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},nc=class extends tc{constructor(){super(new Fr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Vi=class extends Fs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Nt.DEFAULT_UP),this.updateMatrix(),this.target=new Nt,this.shadow=new nc}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var sv=new Oe,av=new Oe,ov=new Oe;var gr=-90,Ao=class extends Nt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Dt(gr,1,e,t);r.layers=this.layers,this.add(r);let s=new Dt(gr,1,e,t);s.layers=this.layers,this.add(s);let a=new Dt(gr,1,e,t);a.layers=this.layers,this.add(a);let o=new Dt(gr,1,e,t);o.layers=this.layers,this.add(o);let c=new Dt(gr,1,e,t);c.layers=this.layers,this.add(c);let l=new Dt(gr,1,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,c]=t;for(let l of t)this.remove(l);if(e===ni)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else{if(e!==xr)throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1)}for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,a,o,c,l,h]=this.children,u=e.getRenderTarget(),p=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let _=!1;_=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(u,p,d),e.xr.enabled=f,n.texture.needsPMREMUpdate=!0}},Co=class extends Dt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var lv=new C,cv=new Zt,hv=new C,uv=new C,dv=new C;var pv=new C,mv=new Zt,fv=new C,gv=new C;var dh="\\[\\]\\.:\\/",Lm=new RegExp("["+dh+"]","g"),Hl="[^"+dh+"]",Dm="[^"+dh.replace("\\.","")+"]",Nm=new RegExp("^"+/((?:WC+[\/:])*)/.source.replace("WC",Hl)+/(WCOD+)?/.source.replace("WCOD",Dm)+/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Hl)+/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Hl)+"$"),Um=["material","materials","bones","map"],ot=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Lm,"")}static parseTrackName(e){let t=Nm.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=n.nodeName.substring(r+1);Um.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,r=t.propertyName,s=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e)return void Ae("PropertyBinding: No target node found for track: "+this.path+".");if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material)return void Re("PropertyBinding: Can not bind to material as node does not have a material.",this);if(!e.material.materials)return void Re("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);e=e.material.materials;break;case"bones":if(!e.skeleton)return void Re("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material)return void Re("PropertyBinding: Can not bind to material as node does not have a material.",this);if(!e.material.map)return void Re("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);e=e.material.map;break;default:if(e[n]===void 0)return void Re("PropertyBinding: Can not bind to objectName of node undefined.",this);e=e[n]}if(l!==void 0){if(e[l]===void 0)return void Re("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);e=e[l]}}let a=e[r];if(a===void 0)return void Re("PropertyBinding: Trying to update property for track: "+t.nodeName+"."+r+" but it wasn't found.",e);let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry)return void Re("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);if(!e.geometry.morphAttributes)return void Re("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ot.Composite=class{constructor(i,e,t){let n=t||ot.parseTrackName(e);this._targetGroup=i,this._bindings=i.subscribe_(e,n)}getValue(i,e){this.bind();let t=this._targetGroup.nCachedObjects_,n=this._bindings[t];n!==void 0&&n.getValue(i,e)}setValue(i,e){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,r=t.length;n!==r;++n)t[n].setValue(i,e)}bind(){let i=this._bindings;for(let e=this._targetGroup.nCachedObjects_,t=i.length;e!==t;++e)i[e].bind()}unbind(){let i=this._bindings;for(let e=this._targetGroup.nCachedObjects_,t=i.length;e!==t;++e)i[e].unbind()}},ot.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},ot.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},ot.prototype.GetterByBindingType=[ot.prototype._getValue_direct,ot.prototype._getValue_array,ot.prototype._getValue_arrayElement,ot.prototype._getValue_toArray],ot.prototype.SetterByBindingTypeAndVersioning=[[ot.prototype._setValue_direct,ot.prototype._setValue_direct_setNeedsUpdate,ot.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_array,ot.prototype._setValue_array_setNeedsUpdate,ot.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_arrayElement,ot.prototype._setValue_arrayElement_setNeedsUpdate,ot.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_fromArray,ot.prototype._setValue_fromArray_setNeedsUpdate,ot.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var vv=new Float32Array(1);var $u=new Oe,Os=class{constructor(e,t,n=0,r=1/0){this.ray=new yi(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new Tr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Re("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return $u.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4($u),this}intersectObject(e,t=!0,n=[]){return ic(e,this,n,t),n.sort(Ku),n}intersectObjects(e,t=!0,n=[]){for(let r=0,s=e.length;r<s;r++)ic(e[r],this,n,t);return n.sort(Ku),n}};function Ku(i,e){return i.distance-e.distance}function ic(i,e,t,n){let r=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){let s=i.children;for(let a=0,o=s.length;a<o;a++)ic(s[a],e,t,!0)}}var _h=class _h{constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let s=this.elements;return s[0]=e,s[2]=t,s[1]=n,s[3]=r,this}};_h.prototype.isMatrix2=!0;var rc=_h,_v=new ie;var yv=new C,xv=new C,Mv=new C,Sv=new C,bv=new C,Tv=new C,Ev=new C;var wv=new C;var Av=new C,Cv=new Oe,Rv=new Oe;var Pv=new C,Iv=new xe,Lv=new xe;var Dv=new C,Nv=new C,Uv=new C;var Fv=new C,Ov=new Ur;var Bv=new mn;var zv=new C;function ph(i,e,t,n){let r=(function(s){switch(s){case on:case bc:return{byteLength:1,components:1};case Vr:case Tc:case Hn:return{byteLength:2,components:1};case Fo:case Oo:return{byteLength:2,components:4};case ai:case Uo:case gn:return{byteLength:4,components:1};case Ec:case wc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)})(n);switch(t){case 1021:return i*e;case Bo:case zo:return i*e/r.components*r.byteLength;case 1030:case 1031:return i*e*2/r.components*r.byteLength;case 1022:return i*e*3/r.components*r.byteLength;case Cn:case 1033:return i*e*4/r.components*r.byteLength;case 33776:case 33777:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case 33778:case 33779:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case 35841:case 35843:return Math.max(i,16)*Math.max(e,8)/4;case 35840:case 35842:return Math.max(i,8)*Math.max(e,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case 37496:case 37490:case 37491:case 37808:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case 37809:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case 37810:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case 37811:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case 37812:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case 37813:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case 37814:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case 37815:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case 37816:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case 37817:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case 37818:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case 37819:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case 37820:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case 37821:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(i/4)*Math.ceil(e/4)*16;case 36283:case 36284:return Math.ceil(i/4)*Math.ceil(e/4)*8;case 36285:case 36286:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"185"}})),typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="185");function dp(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function Om(i){let e=new WeakMap;return{get:function(t){return t.isInterleavedBufferAttribute&&(t=t.data),e.get(t)},remove:function(t){t.isInterleavedBufferAttribute&&(t=t.data);let n=e.get(t);n&&(i.deleteBuffer(n.buffer),e.delete(t))},update:function(t,n){if(t.isInterleavedBufferAttribute&&(t=t.data),t.isGLBufferAttribute){let s=e.get(t);return void((!s||s.version<t.version)&&e.set(t,{buffer:t.buffer,type:t.type,bytesPerElement:t.elementSize,version:t.version}))}let r=e.get(t);if(r===void 0)e.set(t,(function(s,a){let o=s.array,c=s.usage,l=o.byteLength,h=i.createBuffer(),u;if(i.bindBuffer(a,h),i.bufferData(a,o,c),s.onUploadCallback(),o instanceof Float32Array)u=i.FLOAT;else if(typeof Float16Array<"u"&&o instanceof Float16Array)u=i.HALF_FLOAT;else if(o instanceof Uint16Array)u=s.isFloat16BufferAttribute?i.HALF_FLOAT:i.UNSIGNED_SHORT;else if(o instanceof Int16Array)u=i.SHORT;else if(o instanceof Uint32Array)u=i.UNSIGNED_INT;else if(o instanceof Int32Array)u=i.INT;else if(o instanceof Int8Array)u=i.BYTE;else if(o instanceof Uint8Array)u=i.UNSIGNED_BYTE;else{if(!(o instanceof Uint8ClampedArray))throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+o);u=i.UNSIGNED_BYTE}return{buffer:h,type:u,bytesPerElement:o.BYTES_PER_ELEMENT,version:s.version,size:l}})(t,n));else if(r.version<t.version){if(r.size!==t.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");(function(s,a,o){let c=a.array,l=a.updateRanges;if(i.bindBuffer(o,s),l.length===0)i.bufferSubData(o,0,c);else{l.sort((u,p)=>u.start-p.start);let h=0;for(let u=1;u<l.length;u++){let p=l[h],d=l[u];d.start<=p.start+p.count+1?p.count=Math.max(p.count,d.start+d.count-p.start):(++h,l[h]=d)}l.length=h+1;for(let u=0,p=l.length;u<p;u++){let d=l[u];i.bufferSubData(o,d.start*c.BYTES_PER_ELEMENT,c,d.start,d.count)}a.clearUpdateRanges()}a.onUploadCallback()})(r.buffer,t,n),r.version=t.version}}}}var He={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:"gl_FragColor = linearToOutputTexel( gl_FragColor );",colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},ue={common:{diffuse:{value:new xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new ie(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new C},probesMax:{value:new C},probesResolution:{value:new C}},points:{diffuse:{value:new xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new xe(16777215)},opacity:{value:1},center:{value:new ie(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},Xn={basic:{uniforms:Ht([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:He.meshbasic_vert,fragmentShader:He.meshbasic_frag},lambert:{uniforms:Ht([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new xe(0)},envMapIntensity:{value:1}}]),vertexShader:He.meshlambert_vert,fragmentShader:He.meshlambert_frag},phong:{uniforms:Ht([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new xe(0)},specular:{value:new xe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:He.meshphong_vert,fragmentShader:He.meshphong_frag},standard:{uniforms:Ht([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag},toon:{uniforms:Ht([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new xe(0)}}]),vertexShader:He.meshtoon_vert,fragmentShader:He.meshtoon_frag},matcap:{uniforms:Ht([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:He.meshmatcap_vert,fragmentShader:He.meshmatcap_frag},points:{uniforms:Ht([ue.points,ue.fog]),vertexShader:He.points_vert,fragmentShader:He.points_frag},dashed:{uniforms:Ht([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:He.linedashed_vert,fragmentShader:He.linedashed_frag},depth:{uniforms:Ht([ue.common,ue.displacementmap]),vertexShader:He.depth_vert,fragmentShader:He.depth_frag},normal:{uniforms:Ht([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:He.meshnormal_vert,fragmentShader:He.meshnormal_frag},sprite:{uniforms:Ht([ue.sprite,ue.fog]),vertexShader:He.sprite_vert,fragmentShader:He.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:He.background_vert,fragmentShader:He.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:He.backgroundCube_vert,fragmentShader:He.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:He.cube_vert,fragmentShader:He.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:He.equirect_vert,fragmentShader:He.equirect_frag},distance:{uniforms:Ht([ue.common,ue.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:He.distance_vert,fragmentShader:He.distance_frag},shadow:{uniforms:Ht([ue.lights,ue.fog,{color:{value:new xe(0)},opacity:{value:1}}]),vertexShader:He.shadow_vert,fragmentShader:He.shadow_frag}};Xn.physical={uniforms:Ht([Xn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new ie(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new ie},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new xe(0)},specularColor:{value:new xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new ie},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag};var Yo={r:0,b:0,g:0},Bm=new Oe,pp=new Be;function zm(i,e,t,n,r,s){let a=new xe(0),o,c,l=r===!0?0:1,h=null,u=0,p=null;function d(m){let _=m.isScene===!0?m.background:null;if(_&&_.isTexture){let g=m.backgroundBlurriness>0;_=e.get(_,g)}return _}function f(m,_){m.getRGB(Yo,uh(i)),t.buffers.color.setClear(Yo.r,Yo.g,Yo.b,_,s)}return{getClearColor:function(){return a},setClearColor:function(m,_=1){a.set(m),l=_,f(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(m){l=m,f(a,l)},render:function(m){let _=!1,g=d(m);g===null?f(a,l):g&&g.isColor&&(f(g,1),_=!0);let v=i.xr.getEnvironmentBlendMode();v==="additive"?t.buffers.color.setClear(0,0,0,1,s):v==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(i.autoClear||_)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))},addToRenderList:function(m,_){let g=d(_);g&&(g.isCubeTexture||g.mapping===Gs)?(c===void 0&&(c=new Tt(new Bi(1,1,1),new an({name:"BackgroundCubeMaterial",uniforms:Zi(Xn.backgroundCube.uniforms),vertexShader:Xn.backgroundCube.vertexShader,fragmentShader:Xn.backgroundCube.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(v,x,b){this.matrixWorld.copyPosition(b.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=g,c.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Bm.makeRotationFromEuler(_.backgroundRotation)).transpose(),g.isCubeTexture&&g.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(pp),c.material.toneMapped=je.getTransfer(g.colorSpace)!==Qe,h===g&&u===g.version&&p===i.toneMapping||(c.material.needsUpdate=!0,h=g,u=g.version,p=i.toneMapping),c.layers.enableAll(),m.unshift(c,c.geometry,c.material,0,0,null)):g&&g.isTexture&&(o===void 0&&(o=new Tt(new Si(2,2),new an({name:"BackgroundMaterial",uniforms:Zi(Xn.background.uniforms),vertexShader:Xn.background.vertexShader,fragmentShader:Xn.background.fragmentShader,side:Br,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),o.geometry.deleteAttribute("normal"),Object.defineProperty(o.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(o)),o.material.uniforms.t2D.value=g,o.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,o.material.toneMapped=je.getTransfer(g.colorSpace)!==Qe,g.matrixAutoUpdate===!0&&g.updateMatrix(),o.material.uniforms.uvTransform.value.copy(g.matrix),h===g&&u===g.version&&p===i.toneMapping||(o.material.needsUpdate=!0,h=g,u=g.version,p=i.toneMapping),o.layers.enableAll(),m.unshift(o,o.geometry,o.material,0,0,null))},dispose:function(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),o!==void 0&&(o.geometry.dispose(),o.material.dispose(),o=void 0)}}}function Gm(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=l(null),s=r,a=!1;function o(g){return i.bindVertexArray(g)}function c(g){return i.deleteVertexArray(g)}function l(g){let v=[],x=[],b=[];for(let S=0;S<t;S++)v[S]=0,x[S]=0,b[S]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:v,enabledAttributes:x,attributeDivisors:b,object:g,attributes:{},index:null}}function h(){let g=s.newAttributes;for(let v=0,x=g.length;v<x;v++)g[v]=0}function u(g){p(g,0)}function p(g,v){let x=s.newAttributes,b=s.enabledAttributes,S=s.attributeDivisors;x[g]=1,b[g]===0&&(i.enableVertexAttribArray(g),b[g]=1),S[g]!==v&&(i.vertexAttribDivisor(g,v),S[g]=v)}function d(){let g=s.newAttributes,v=s.enabledAttributes;for(let x=0,b=v.length;x<b;x++)v[x]!==g[x]&&(i.disableVertexAttribArray(x),v[x]=0)}function f(g,v,x,b,S,y,P){P===!0?i.vertexAttribIPointer(g,v,x,S,y):i.vertexAttribPointer(g,v,x,b,S,y)}function m(){_(),a=!0,s!==r&&(s=r,o(s.object))}function _(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:function(g,v,x,b,S){let y=!1,P=(function(F,L,D,O){let N=O.wireframe===!0,H=n[L.id];H===void 0&&(H={},n[L.id]=H);let X=F.isInstancedMesh===!0?F.id:0,k=H[X];k===void 0&&(k={},H[X]=k);let Z=k[D.id];Z===void 0&&(Z={},k[D.id]=Z);let j=Z[N];return j===void 0&&(j=l(i.createVertexArray()),Z[N]=j),j})(g,b,x,v);s!==P&&(s=P,o(s.object)),y=(function(F,L,D,O){let N=s.attributes,H=L.attributes,X=0,k=D.getAttributes();for(let Z in k)if(k[Z].location>=0){let j=N[Z],te=H[Z];if(te===void 0&&(Z==="instanceMatrix"&&F.instanceMatrix&&(te=F.instanceMatrix),Z==="instanceColor"&&F.instanceColor&&(te=F.instanceColor)),j===void 0||j.attribute!==te||te&&j.data!==te.data)return!0;X++}return s.attributesNum!==X||s.index!==O})(g,b,x,S),y&&(function(F,L,D,O){let N={},H=L.attributes,X=0,k=D.getAttributes();for(let Z in k)if(k[Z].location>=0){let j=H[Z];j===void 0&&(Z==="instanceMatrix"&&F.instanceMatrix&&(j=F.instanceMatrix),Z==="instanceColor"&&F.instanceColor&&(j=F.instanceColor));let te={};te.attribute=j,j&&j.data&&(te.data=j.data),N[Z]=te,X++}s.attributes=N,s.attributesNum=X,s.index=O})(g,b,x,S),S!==null&&e.update(S,i.ELEMENT_ARRAY_BUFFER),(y||a)&&(a=!1,(function(F,L,D,O){h();let N=O.attributes,H=D.getAttributes(),X=L.defaultAttributeValues;for(let k in H){let Z=H[k];if(Z.location>=0){let j=N[k];if(j===void 0&&(k==="instanceMatrix"&&F.instanceMatrix&&(j=F.instanceMatrix),k==="instanceColor"&&F.instanceColor&&(j=F.instanceColor)),j!==void 0){let te=j.normalized,fe=j.itemSize,we=e.get(j);if(we===void 0)continue;let ye=we.buffer,Me=we.type,re=we.bytesPerElement,de=Me===i.INT||Me===i.UNSIGNED_INT||j.gpuType===Uo;if(j.isInterleavedBufferAttribute){let ce=j.data,ve=ce.stride,ke=j.offset;if(ce.isInstancedInterleavedBuffer){for(let ee=0;ee<Z.locationSize;ee++)p(Z.location+ee,ce.meshPerAttribute);F.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let ee=0;ee<Z.locationSize;ee++)u(Z.location+ee);i.bindBuffer(i.ARRAY_BUFFER,ye);for(let ee=0;ee<Z.locationSize;ee++)f(Z.location+ee,fe/Z.locationSize,Me,te,ve*re,(ke+fe/Z.locationSize*ee)*re,de)}else{if(j.isInstancedBufferAttribute){for(let ce=0;ce<Z.locationSize;ce++)p(Z.location+ce,j.meshPerAttribute);F.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let ce=0;ce<Z.locationSize;ce++)u(Z.location+ce);i.bindBuffer(i.ARRAY_BUFFER,ye);for(let ce=0;ce<Z.locationSize;ce++)f(Z.location+ce,fe/Z.locationSize,Me,te,fe*re,fe/Z.locationSize*ce*re,de)}}else if(X!==void 0){let te=X[k];if(te!==void 0)switch(te.length){case 2:i.vertexAttrib2fv(Z.location,te);break;case 3:i.vertexAttrib3fv(Z.location,te);break;case 4:i.vertexAttrib4fv(Z.location,te);break;default:i.vertexAttrib1fv(Z.location,te)}}}}d()})(g,v,x,b),S!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(S).buffer))},reset:m,resetDefaultState:_,dispose:function(){m();for(let g in n){let v=n[g];for(let x in v){let b=v[x];for(let S in b){let y=b[S];for(let P in y)c(y[P].object),delete y[P];delete b[S]}}delete n[g]}},releaseStatesOfGeometry:function(g){if(n[g.id]===void 0)return;let v=n[g.id];for(let x in v){let b=v[x];for(let S in b){let y=b[S];for(let P in y)c(y[P].object),delete y[P];delete b[S]}}delete n[g.id]},releaseStatesOfObject:function(g){for(let v in n){let x=n[v],b=g.isInstancedMesh===!0?g.id:0,S=x[b];if(S!==void 0){for(let y in S){let P=S[y];for(let F in P)c(P[F].object),delete P[F];delete S[y]}delete x[b],Object.keys(x).length===0&&delete n[v]}}},releaseStatesOfProgram:function(g){for(let v in n){let x=n[v];for(let b in x){let S=x[b];if(S[g.id]===void 0)continue;let y=S[g.id];for(let P in y)c(y[P].object),delete y[P];delete S[g.id]}}},initAttributes:h,enableAttribute:u,disableUnusedAttributes:d}}function km(i,e,t){let n;this.setMode=function(r){n=r},this.render=function(r,s){i.drawArrays(n,r,s),t.update(s,n,1)},this.renderInstances=function(r,s,a){a!==0&&(i.drawArraysInstanced(n,r,s,a),t.update(s,n,a))},this.renderMultiDraw=function(r,s,a){if(a===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,r,0,s,0,a);let o=0;for(let c=0;c<a;c++)o+=s[c];t.update(o,n,1)}}function Vm(i,e,t,n){let r;function s(h){if(h==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";h="mediump"}return h==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let a=t.precision!==void 0?t.precision:"highp",o=s(a);o!==a&&(Ae("WebGLRenderer:",a,"not supported, using",o,"instead."),a=o);let c=t.logarithmicDepthBuffer===!0,l=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");return t.reversedDepthBuffer===!0&&l===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),{isWebGL2:!0,getMaxAnisotropy:function(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){let h=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(h.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r},getMaxPrecision:s,textureFormatReadable:function(h){return h===Cn||n.convert(h)===i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT)},textureTypeReadable:function(h){let u=h===Hn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(h!==on&&n.convert(h)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&h!==gn&&!u)},precision:a,logarithmicDepthBuffer:c,reversedDepthBuffer:l,maxTextures:i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),maxVertexTextures:i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),maxTextureSize:i.getParameter(i.MAX_TEXTURE_SIZE),maxCubemapSize:i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),maxAttributes:i.getParameter(i.MAX_VERTEX_ATTRIBS),maxVertexUniforms:i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),maxVaryings:i.getParameter(i.MAX_VARYING_VECTORS),maxFragmentUniforms:i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),maxSamples:i.getParameter(i.MAX_SAMPLES),samples:i.getParameter(i.SAMPLES)}}function Hm(i){let e=this,t=null,n=0,r=!1,s=!1,a=new On,o=new Be,c={value:null,needsUpdate:!1};function l(h,u,p,d){let f=h!==null?h.length:0,m=null;if(f!==0){if(m=c.value,d!==!0||m===null){let _=p+4*f,g=u.matrixWorldInverse;o.getNormalMatrix(g),(m===null||m.length<_)&&(m=new Float32Array(_));for(let v=0,x=p;v!==f;++v,x+=4)a.copy(h[v]).applyMatrix4(g,o),a.normal.toArray(m,x),m[x+3]=a.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=f,e.numIntersection=0,m}this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,u){let p=h.length!==0||u||n!==0||r;return r=u,n=h.length,p},this.beginShadows=function(){s=!0,l(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,u){t=l(h,u,0)},this.setState=function(h,u,p){let d=h.clippingPlanes,f=h.clipIntersection,m=h.clipShadows,_=i.get(h);if(!r||d===null||d.length===0||s&&!m)s?l(null):(function(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0})();else{let g=s?0:n,v=4*g,x=_.clippingState||null;c.value=x,x=l(d,u,v,p);for(let b=0;b!==v;++b)x[b]=t[b];_.clippingState=x,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=g}}}pp.set(-1,0,0,0,1,0,0,0,1);var Wd=[.125,.215,.35,.446,.526,.582],Vs=20,Hs=new Fr,Xd=new xe,yh=null,xh=0,Mh=0,Sh=!1,Wm=new C,Jo=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,s={}){let{size:a=256,position:o=Wm}=s;yh=this._renderer.getRenderTarget(),xh=this._renderer.getActiveCubeFace(),Mh=this._renderer.getActiveMipmapLevel(),Sh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,r,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Yd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=qd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(yh,xh,Mh),this._renderer.xr.enabled=Sh,e.scissorTest=!1,Wr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===kr||e.mapping===Hi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),yh=this._renderer.getRenderTarget(),xh=this._renderer.getActiveCubeFace(),Mh=this._renderer.getActiveMipmapLevel(),Sh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:kt,minFilter:kt,generateMipmaps:!1,type:Hn,format:Cn,colorSpace:ds,depthBuffer:!1},r=jd(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=jd(e,t,n);let{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=(function(a){let o=[],c=[],l=[],h=a,u=a-4+1+Wd.length;for(let p=0;p<u;p++){let d=Math.pow(2,h);o.push(d);let f=1/d;p>a-4?f=Wd[p-a+4-1]:p===0&&(f=0),c.push(f);let m=1/(d-2),_=-m,g=1+m,v=[_,_,g,_,g,g,_,_,g,g,_,g],x=6,b=6,S=3,y=2,P=1,F=new Float32Array(S*b*x),L=new Float32Array(y*b*x),D=new Float32Array(P*b*x);for(let N=0;N<x;N++){let H=N%3*2/3-1,X=N>2?0:-1,k=[H,X,0,H+2/3,X,0,H+2/3,X+1,0,H,X,0,H+2/3,X+1,0,H,X+1,0];F.set(k,S*b*N),L.set(v,y*b*N);let Z=[N,N,N,N,N,N];D.set(Z,P*b*N)}let O=new rt;O.setAttribute("position",new Yt(F,S)),O.setAttribute("uv",new Yt(L,y)),O.setAttribute("faceIndex",new Yt(D,P)),l.push(new Tt(O,null)),h>4&&h--}return{lodMeshes:l,sizeLods:o,sigmas:c}})(s)),this._blurMaterial=(function(a,o,c){let l=new Float32Array(Vs),h=new C(0,1,0);return new an({name:"SphericalGaussianBlur",defines:{n:Vs,CUBEUV_TEXEL_WIDTH:1/o,CUBEUV_TEXEL_HEIGHT:1/c,CUBEUV_MAX_MIP:`${a}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:l},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:h}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Vn,depthTest:!1,depthWrite:!1})})(s,e,t),this._ggxMaterial=(function(a,o,c){return new an({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:256,CUBEUV_TEXEL_WIDTH:1/o,CUBEUV_TEXEL_HEIGHT:1/c,CUBEUV_MAX_MIP:`${a}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:$o(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Vn,depthTest:!1,depthWrite:!1})})(s,e,t)}return r}_compileMaterial(e){let t=new Tt(new rt,e);this._renderer.compile(t,Hs)}_sceneToCubeUV(e,t,n,r,s){let a=new Dt(90,1,t,n),o=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],l=this._renderer,h=l.autoClear,u=l.toneMapping;l.getClearColor(Xd),l.toneMapping=An,l.autoClear=!1,l.state.buffers.depth.getReversed()&&(l.setRenderTarget(r),l.clearDepth(),l.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Tt(new Bi,new Gn({name:"PMREM.Background",side:Jt,depthWrite:!1,depthTest:!1})));let p=this._backgroundBox,d=p.material,f=!1,m=e.background;m?m.isColor&&(d.color.copy(m),e.background=null,f=!0):(d.color.copy(Xd),f=!0);for(let _=0;_<6;_++){let g=_%3;g===0?(a.up.set(0,o[_],0),a.position.set(s.x,s.y,s.z),a.lookAt(s.x+c[_],s.y,s.z)):g===1?(a.up.set(0,0,o[_]),a.position.set(s.x,s.y,s.z),a.lookAt(s.x,s.y+c[_],s.z)):(a.up.set(0,o[_],0),a.position.set(s.x,s.y,s.z),a.lookAt(s.x,s.y,s.z+c[_]));let v=this._cubeSize;Wr(r,g*v,_>2?v:0,v,v),l.setRenderTarget(r),f&&l.render(p,a),l.render(e,a)}l.toneMapping=u,l.autoClear=h,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===kr||e.mapping===Hi;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Yd()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=qd());let s=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s,s.uniforms.envMap.value=e;let o=this._cubeSize;Wr(t,0,0,3*o,2*o),n.setRenderTarget(t),n.render(a,Hs)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let s=1;s<r;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let c=a.uniforms,l=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(l*l-h*h)*(0+1.25*l),{_lodMax:p}=this,d=this._sizeLods[n],f=3*d*(n>p-4?n-p+4:0),m=4*(this._cubeSize-d);c.envMap.value=e.texture,c.roughness.value=u,c.mipInt.value=p-t,Wr(s,f,m,3*d,2*d),r.setRenderTarget(s),r.render(o,Hs),c.envMap.value=s.texture,c.roughness.value=0,c.mipInt.value=p-n,Wr(e,f,m,3*d,2*d),r.setRenderTarget(e),r.render(o,Hs)}_blur(e,t,n,r,s){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){let c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&Re("blur direction must be either latitudinal or longitudinal!");let h=this._lodMeshes[r];h.material=l;let u=l.uniforms,p=this._sizeLods[n]-1,d=isFinite(s)?Math.PI/(2*p):2*Math.PI/39,f=s/d,m=isFinite(s)?1+Math.floor(3*f):Vs;m>Vs&&Ae(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to 20`);let _=[],g=0;for(let b=0;b<Vs;++b){let S=b/f,y=Math.exp(-S*S/2);_.push(y),b===0?g+=y:b<m&&(g+=2*y)}for(let b=0;b<_.length;b++)_[b]=_[b]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=_,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);let{_lodMax:v}=this;u.dTheta.value=d,u.mipInt.value=v-n;let x=this._sizeLods[r];Wr(t,3*x*(r>v-4?r-v+4:0),4*(this._cubeSize-x),3*x,2*x),c.setRenderTarget(t),c.render(h,Hs)}};function jd(i,e,t){let n=new tn(i,e,t);return n.texture.mapping=Gs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Wr(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function qd(){return new an({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Vn,depthTest:!1,depthWrite:!1})}function Yd(){return new an({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$o(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Vn,depthTest:!1,depthWrite:!1})}function $o(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ko=class extends tn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Ss(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Bi(5,5,5),s=new an({name:"CubemapFromEquirect",uniforms:Zi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Jt,blending:Vn});s.uniforms.tEquirect.value=t;let a=new Tt(r,s),o=t.minFilter;return t.minFilter===Wi&&(t.minFilter=kt),new Ao(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}};function Xm(i){let e=new WeakMap,t=new WeakMap,n=null;function r(o,c){return c===Lo?o.mapping=kr:c===Do&&(o.mapping=Hi),o}function s(o){let c=o.target;c.removeEventListener("dispose",s);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(o){let c=o.target;c.removeEventListener("dispose",a);let l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}return{get:function(o,c=!1){return o==null?null:c?(function(l){if(l&&l.isTexture){let h=l.mapping,u=h===Lo||h===Do,p=h===kr||h===Hi;if(u||p){let d=t.get(l),f=d!==void 0?d.texture.pmremVersion:0;if(l.isRenderTargetTexture&&l.pmremVersion!==f)return n===null&&(n=new Jo(i)),d=u?n.fromEquirectangular(l,d):n.fromCubemap(l,d),d.texture.pmremVersion=l.pmremVersion,t.set(l,d),d.texture;if(d!==void 0)return d.texture;{let m=l.image;return u&&m&&m.height>0||p&&m&&(function(_){let g=0,v=6;for(let x=0;x<v;x++)_[x]!==void 0&&g++;return g===v})(m)?(n===null&&(n=new Jo(i)),d=u?n.fromEquirectangular(l):n.fromCubemap(l),d.texture.pmremVersion=l.pmremVersion,t.set(l,d),l.addEventListener("dispose",a),d.texture):null}}}return l})(o):(function(l){if(l&&l.isTexture){let h=l.mapping;if(h===Lo||h===Do){if(e.has(l))return r(e.get(l).texture,l.mapping);{let u=l.image;if(u&&u.height>0){let p=new Ko(u.height);return p.fromEquirectangularTexture(i,l),e.set(l,p),l.addEventListener("dispose",s),r(p.texture,l.mapping)}return null}}}return l})(o)},dispose:function(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}}}function jm(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let r=i.getExtension(n);return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let r=t(n);return r===null&&Oi("WebGLRenderer: "+n+" extension not supported."),r}}}function qm(i,e,t,n){let r={},s=new WeakMap;function a(c){let l=c.target;l.index!==null&&e.remove(l.index);for(let u in l.attributes)e.remove(l.attributes[u]);l.removeEventListener("dispose",a),delete r[l.id];let h=s.get(l);h&&(e.remove(h),s.delete(l)),n.releaseStatesOfGeometry(l),l.isInstancedBufferGeometry===!0&&delete l._maxInstanceCount,t.memory.geometries--}function o(c){let l=[],h=c.index,u=c.attributes.position,p=0;if(u===void 0)return;if(h!==null){let m=h.array;p=h.version;for(let _=0,g=m.length;_<g;_+=3){let v=m[_+0],x=m[_+1],b=m[_+2];l.push(v,x,x,b,b,v)}}else{let m=u.array;p=u.version;for(let _=0,g=m.length/3-1;_<g;_+=3){let v=_+0,x=_+1,b=_+2;l.push(v,x,x,b,b,v)}}let d=new(u.count>=65535?_s:vs)(l,1);d.version=p;let f=s.get(c);f&&e.remove(f),s.set(c,d)}return{get:function(c,l){return r[l.id]===!0||(l.addEventListener("dispose",a),r[l.id]=!0,t.memory.geometries++),l},update:function(c){let l=c.attributes;for(let h in l)e.update(l[h],i.ARRAY_BUFFER)},getWireframeAttribute:function(c){let l=s.get(c);if(l){let h=c.index;h!==null&&l.version<h.version&&o(c)}else o(c);return s.get(c)}}}function Ym(i,e,t){let n,r,s;this.setMode=function(a){n=a},this.setIndex=function(a){r=a.type,s=a.bytesPerElement},this.render=function(a,o){i.drawElements(n,o,r,a*s),t.update(o,n,1)},this.renderInstances=function(a,o,c){c!==0&&(i.drawElementsInstanced(n,o,r,a*s,c),t.update(o,n,c))},this.renderMultiDraw=function(a,o,c){if(c===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,o,0,r,a,0,c);let l=0;for(let h=0;h<c;h++)l+=o[h];t.update(l,n,1)}}function Zm(i){let e={frame:0,calls:0,triangles:0,points:0,lines:0};return{memory:{geometries:0,textures:0},render:e,programs:null,autoReset:!0,reset:function(){e.calls=0,e.triangles=0,e.points=0,e.lines=0},update:function(t,n,r){switch(e.calls++,n){case i.TRIANGLES:e.triangles+=r*(t/3);break;case i.LINES:e.lines+=r*(t/2);break;case i.LINE_STRIP:e.lines+=r*(t-1);break;case i.LINE_LOOP:e.lines+=r*t;break;case i.POINTS:e.points+=r*t;break;default:Re("WebGLInfo: Unknown draw mode:",n)}}}}function Jm(i,e,t){let n=new WeakMap,r=new it;return{update:function(s,a,o){let c=s.morphTargetInfluences,l=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=l!==void 0?l.length:0,u=n.get(a);if(u===void 0||u.count!==h){let F=function(){y.dispose(),n.delete(a),a.removeEventListener("dispose",F)};u!==void 0&&u.texture.dispose();let p=a.morphAttributes.position!==void 0,d=a.morphAttributes.normal!==void 0,f=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],_=a.morphAttributes.normal||[],g=a.morphAttributes.color||[],v=0;p===!0&&(v=1),d===!0&&(v=2),f===!0&&(v=3);let x=a.attributes.position.count*v,b=1;x>e.maxTextureSize&&(b=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);let S=new Float32Array(x*b*4*h),y=new fs(S,x,b,h);y.type=gn,y.needsUpdate=!0;let P=4*v;for(let L=0;L<h;L++){let D=m[L],O=_[L],N=g[L],H=x*b*4*L;for(let X=0;X<D.count;X++){let k=X*P;p===!0&&(r.fromBufferAttribute(D,X),S[H+k+0]=r.x,S[H+k+1]=r.y,S[H+k+2]=r.z,S[H+k+3]=0),d===!0&&(r.fromBufferAttribute(O,X),S[H+k+4]=r.x,S[H+k+5]=r.y,S[H+k+6]=r.z,S[H+k+7]=0),f===!0&&(r.fromBufferAttribute(N,X),S[H+k+8]=r.x,S[H+k+9]=r.y,S[H+k+10]=r.z,S[H+k+11]=N.itemSize===4?r.w:1)}}u={count:h,texture:y,size:new ie(x,b)},n.set(a,u),a.addEventListener("dispose",F)}if(s.isInstancedMesh===!0&&s.morphTexture!==null)o.getUniforms().setValue(i,"morphTexture",s.morphTexture,t);else{let p=0;for(let f=0;f<c.length;f++)p+=c[f];let d=a.morphTargetsRelative?1:1-p;o.getUniforms().setValue(i,"morphTargetBaseInfluence",d),o.getUniforms().setValue(i,"morphTargetInfluences",c)}o.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),o.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}}}function $m(i,e,t,n,r){let s=new WeakMap;function a(o){let c=o.target;c.removeEventListener("dispose",a),n.releaseStatesOfObject(c),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:function(o){let c=r.render.frame,l=o.geometry,h=e.get(o,l);if(s.get(h)!==c&&(e.update(h),s.set(h,c)),o.isInstancedMesh&&(o.hasEventListener("dispose",a)===!1&&o.addEventListener("dispose",a),s.get(o)!==c&&(t.update(o.instanceMatrix,i.ARRAY_BUFFER),o.instanceColor!==null&&t.update(o.instanceColor,i.ARRAY_BUFFER),s.set(o,c))),o.isSkinnedMesh){let u=o.skeleton;s.get(u)!==c&&(u.update(),s.set(u,c))}return h},dispose:function(){s=new WeakMap}}}var Km={[gc]:"LINEAR_TONE_MAPPING",[vc]:"REINHARD_TONE_MAPPING",[_c]:"CINEON_TONE_MAPPING",[Gr]:"ACES_FILMIC_TONE_MAPPING",[xc]:"AGX_TONE_MAPPING",[Mc]:"NEUTRAL_TONE_MAPPING",[yc]:"CUSTOM_TONE_MAPPING"};function Qm(i,e,t,n,r,s){let a=new tn(e,t,{type:i,depthBuffer:r,stencilBuffer:s,samples:n?4:0,depthTexture:r?new si(e,t):void 0}),o=new tn(e,t,{type:Hn,depthBuffer:!1,stencilBuffer:!1}),c=new rt;c.setAttribute("position",new Ce([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Ce([0,2,0,0,2,0],2));let l=new mo({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),h=new Tt(c,l),u=new Fr(-1,1,1,-1,0,1),p,d=null,f=null,m=!1,_=null,g=[],v=!1;this.setSize=function(x,b){a.setSize(x,b),o.setSize(x,b);for(let S=0;S<g.length;S++){let y=g[S];y.setSize&&y.setSize(x,b)}},this.setEffects=function(x){g=x,v=g.length>0&&g[0].isRenderPass===!0;let b=a.width,S=a.height;for(let y=0;y<g.length;y++){let P=g[y];P.setSize&&P.setSize(b,S)}},this.begin=function(x,b){if(m||x.toneMapping===An&&g.length===0)return!1;if(_=b,b!==null){let S=b.width,y=b.height;a.width===S&&a.height===y||this.setSize(S,y)}return v===!1&&x.setRenderTarget(a),p=x.toneMapping,x.toneMapping=An,!0},this.hasRenderPass=function(){return v},this.end=function(x,b){x.toneMapping=p,m=!0;let S=a,y=o;for(let P=0;P<g.length;P++){let F=g[P];if(F.enabled!==!1&&(F.render(x,y,S,b),F.needsSwap!==!1)){let L=S;S=y,y=L}}if(d!==x.outputColorSpace||f!==x.toneMapping){d=x.outputColorSpace,f=x.toneMapping,l.defines={},je.getTransfer(d)===Qe&&(l.defines.SRGB_TRANSFER="");let P=Km[f];P&&(l.defines[P]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=S.texture,x.setRenderTarget(_),x.render(h,u),_=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){a.depthTexture&&a.depthTexture.dispose(),a.dispose(),o.dispose(),c.dispose(),l.dispose()}}var mp=new qt,Eh=new si(1,1),fp=new fs,gp=new Za,vp=new Ss,Zd=[],Jd=[],$d=new Float32Array(16),Kd=new Float32Array(9),Qd=new Float32Array(4);function jr(i,e,t){let n=i[0];if(n<=0||n>0)return i;let r=e*t,s=Zd[r];if(s===void 0&&(s=new Float32Array(r),Zd[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function Et(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function wt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Qo(i,e){let t=Jd[e];t===void 0&&(t=new Int32Array(e),Jd[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function ef(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function tf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;i.uniform2fv(this.addr,e),wt(t,e)}}function nf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)t[0]===e.r&&t[1]===e.g&&t[2]===e.b||(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Et(t,e))return;i.uniform3fv(this.addr,e),wt(t,e)}}function rf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;i.uniform4fv(this.addr,e),wt(t,e)}}function sf(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Et(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,n))return;Qd.set(n),i.uniformMatrix2fv(this.addr,!1,Qd),wt(t,n)}}function af(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Et(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,n))return;Kd.set(n),i.uniformMatrix3fv(this.addr,!1,Kd),wt(t,n)}}function of(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Et(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,n))return;$d.set(n),i.uniformMatrix4fv(this.addr,!1,$d),wt(t,n)}}function lf(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function cf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;i.uniform2iv(this.addr,e),wt(t,e)}}function hf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;i.uniform3iv(this.addr,e),wt(t,e)}}function uf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;i.uniform4iv(this.addr,e),wt(t,e)}}function df(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function pf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y||(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;i.uniform2uiv(this.addr,e),wt(t,e)}}function mf(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z||(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;i.uniform3uiv(this.addr,e),wt(t,e)}}function ff(i,e){let t=this.cache;if(e.x!==void 0)t[0]===e.x&&t[1]===e.y&&t[2]===e.z&&t[3]===e.w||(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;i.uniform4uiv(this.addr,e),wt(t,e)}}function gf(i,e,t){let n=this.cache,r=t.allocateTextureUnit(),s;n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),this.type===i.SAMPLER_2D_SHADOW?(Eh.compareFunction=t.isReversedDepthBuffer()?qo:jo,s=Eh):s=mp,t.setTexture2D(e||s,r)}function vf(i,e,t){let n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||gp,r)}function _f(i,e,t){let n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||vp,r)}function yf(i,e,t){let n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||fp,r)}function xf(i,e){i.uniform1fv(this.addr,e)}function Mf(i,e){let t=jr(e,this.size,2);i.uniform2fv(this.addr,t)}function Sf(i,e){let t=jr(e,this.size,3);i.uniform3fv(this.addr,t)}function bf(i,e){let t=jr(e,this.size,4);i.uniform4fv(this.addr,t)}function Tf(i,e){let t=jr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Ef(i,e){let t=jr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function wf(i,e){let t=jr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Af(i,e){i.uniform1iv(this.addr,e)}function Cf(i,e){i.uniform2iv(this.addr,e)}function Rf(i,e){i.uniform3iv(this.addr,e)}function Pf(i,e){i.uniform4iv(this.addr,e)}function If(i,e){i.uniform1uiv(this.addr,e)}function Lf(i,e){i.uniform2uiv(this.addr,e)}function Df(i,e){i.uniform3uiv(this.addr,e)}function Nf(i,e){i.uniform4uiv(this.addr,e)}function Uf(i,e,t){let n=this.cache,r=e.length,s=Qo(t,r),a;Et(n,s)||(i.uniform1iv(this.addr,s),wt(n,s)),a=this.type===i.SAMPLER_2D_SHADOW?Eh:mp;for(let o=0;o!==r;++o)t.setTexture2D(e[o]||a,s[o])}function Ff(i,e,t){let n=this.cache,r=e.length,s=Qo(t,r);Et(n,s)||(i.uniform1iv(this.addr,s),wt(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||gp,s[a])}function Of(i,e,t){let n=this.cache,r=e.length,s=Qo(t,r);Et(n,s)||(i.uniform1iv(this.addr,s),wt(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||vp,s[a])}function Bf(i,e,t){let n=this.cache,r=e.length,s=Qo(t,r);Et(n,s)||(i.uniform1iv(this.addr,s),wt(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||fp,s[a])}var wh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=(function(r){switch(r){case 5126:return ef;case 35664:return tf;case 35665:return nf;case 35666:return rf;case 35674:return sf;case 35675:return af;case 35676:return of;case 5124:case 35670:return lf;case 35667:case 35671:return cf;case 35668:case 35672:return hf;case 35669:case 35673:return uf;case 5125:return df;case 36294:return pf;case 36295:return mf;case 36296:return ff;case 35678:case 36198:case 36298:case 36306:case 35682:return gf;case 35679:case 36299:case 36307:return vf;case 35680:case 36300:case 36308:case 36293:return _f;case 36289:case 36303:case 36311:case 36292:return yf}})(t.type)}},Ah=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=(function(r){switch(r){case 5126:return xf;case 35664:return Mf;case 35665:return Sf;case 35666:return bf;case 35674:return Tf;case 35675:return Ef;case 35676:return wf;case 5124:case 35670:return Af;case 35667:case 35671:return Cf;case 35668:case 35672:return Rf;case 35669:case 35673:return Pf;case 5125:return If;case 36294:return Lf;case 36295:return Df;case 36296:return Nf;case 35678:case 36198:case 36298:case 36306:case 35682:return Uf;case 35679:case 36299:case 36307:return Ff;case 35680:case 36300:case 36308:case 36293:return Of;case 36289:case 36303:case 36311:case 36292:return Bf}})(t.type)}},Ch=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let s=0,a=r.length;s!==a;++s){let o=r[s];o.setValue(e,t[o.id],n)}}},bh=/(\w+)(\])?(\[|\.)?/g;function ep(i,e){i.seq.push(e),i.map[e.id]=e}function zf(i,e,t){let n=i.name,r=n.length;for(bh.lastIndex=0;;){let s=bh.exec(n),a=bh.lastIndex,o=s[1],c=s[2]==="]",l=s[3];if(c&&(o|=0),l===void 0||l==="["&&a+2===r){ep(t,l===void 0?new wh(o,i,e):new Ah(o,i,e));break}{let h=t.map[o];h===void 0&&(h=new Ch(o),ep(t,h)),t=h}}}var Xr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=e.getActiveUniform(t,a);zf(o,e.getUniformLocation(t,o.name),this)}let r=[],s=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(a):s.push(a);r.length>0&&(this.seq=r.concat(s))}setValue(e,t,n,r){let s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){let o=t[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,s=e.length;r!==s;++r){let a=e[r];a.id in t&&n.push(a)}return n}};function tp(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Gf=0,np=new Be;function ip(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let s=/ERROR: 0:(\d+)/.exec(r);if(s){let a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+(function(o,c){let l=o.split(`
`),h=[],u=Math.max(c-6,0),p=Math.min(c+6,l.length);for(let d=u;d<p;d++){let f=d+1;h.push(`${f===c?">":" "} ${f}: ${l[d]}`)}return h.join(`
`)})(i.getShaderSource(e),a)}return r}function kf(i,e){let t=(function(n){je._getMatrix(np,je.workingColorSpace,n);let r=`mat3( ${np.elements.map(s=>s.toFixed(4))} )`;switch(je.getTransfer(n)){case ps:return[r,"LinearTransferOETF"];case Qe:return[r,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",n),[r,"LinearTransferOETF"]}})(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var Vf={[gc]:"Linear",[vc]:"Reinhard",[_c]:"Cineon",[Gr]:"ACESFilmic",[xc]:"AgX",[Mc]:"Neutral",[yc]:"Custom"};function Hf(i,e){let t=Vf[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Zo=new C;function Wf(){return je.getLuminanceCoefficients(Zo),["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${Zo.x.toFixed(4)}, ${Zo.y.toFixed(4)}, ${Zo.z.toFixed(4)} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ws(i){return i!==""}function rp(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function sp(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Xf=/^[ \t]*#include +<([\w\d./]+)>/gm;function Rh(i){return i.replace(Xf,qf)}var jf=new Map;function qf(i,e){let t=He[e];if(t===void 0){let n=jf.get(e);if(n===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");t=He[n],Ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n)}return Rh(t)}var Yf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ap(i){return i.replace(Yf,Zf)}function Zf(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function op(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var Jf={[Bs]:"SHADOWMAP_TYPE_PCF",[Or]:"SHADOWMAP_TYPE_VSM"},$f={[kr]:"ENVMAP_TYPE_CUBE",[Hi]:"ENVMAP_TYPE_CUBE",[Gs]:"ENVMAP_TYPE_CUBE_UV"},Kf={[Hi]:"ENVMAP_MODE_REFRACTION"},Qf={[Md]:"ENVMAP_BLENDING_MULTIPLY",[Sd]:"ENVMAP_BLENDING_MIX",[bd]:"ENVMAP_BLENDING_ADD"};function eg(i,e,t,n){let r=i.getContext(),s=t.defines,a=t.vertexShader,o=t.fragmentShader,c=(function(O){return Jf[O.shadowMapType]||"SHADOWMAP_TYPE_BASIC"})(t),l=(function(O){return O.envMap===!1?"ENVMAP_TYPE_CUBE":$f[O.envMapMode]||"ENVMAP_TYPE_CUBE"})(t),h=(function(O){return O.envMap===!1?"ENVMAP_MODE_REFLECTION":Kf[O.envMapMode]||"ENVMAP_MODE_REFLECTION"})(t),u=(function(O){return O.envMap===!1?"ENVMAP_BLENDING_NONE":Qf[O.combine]||"ENVMAP_BLENDING_NONE"})(t),p=(function(O){let N=O.envMapCubeUVHeight;if(N===null)return null;let H=Math.log2(N)-2,X=1/N;return{texelWidth:1/(3*Math.max(Math.pow(2,H),112)),texelHeight:X,maxMip:H}})(t),d=(function(O){return[O.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",O.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ws).join(`
`)})(t),f=(function(O){let N=[];for(let H in O){let X=O[H];X!==!1&&N.push("#define "+H+" "+X)}return N.join(`
`)})(s),m=r.createProgram(),_,g,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Ws).join(`
`),_.length>0&&(_+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Ws).join(`
`),g.length>0&&(g+=`
`)):(_=[op(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ws).join(`
`),g=[op(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==An?"#define TONE_MAPPING":"",t.toneMapping!==An?He.tonemapping_pars_fragment:"",t.toneMapping!==An?Hf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",He.colorspace_pars_fragment,kf("linearToOutputTexel",t.outputColorSpace),Wf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ws).join(`
`)),a=Rh(a),a=rp(a,t),a=sp(a,t),o=Rh(o),o=rp(o,t),o=sp(o,t),a=ap(a),o=ap(o),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,_=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,g=["#define varying in",t.glslVersion===oh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===oh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);let x=v+_+a,b=v+g+o,S=tp(r,r.VERTEX_SHADER,x),y=tp(r,r.FRAGMENT_SHADER,b);function P(O){if(i.debug.checkShaderErrors){let N=r.getProgramInfoLog(m)||"",H=r.getShaderInfoLog(S)||"",X=r.getShaderInfoLog(y)||"",k=N.trim(),Z=H.trim(),j=X.trim(),te=!0,fe=!0;if(r.getProgramParameter(m,r.LINK_STATUS)===!1)if(te=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,m,S,y);else{let we=ip(r,S,"vertex"),ye=ip(r,y,"fragment");Re("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(m,r.VALIDATE_STATUS)+`

Material Name: `+O.name+`
Material Type: `+O.type+`

Program Info Log: `+k+`
`+we+`
`+ye)}else k!==""?Ae("WebGLProgram: Program Info Log:",k):Z!==""&&j!==""||(fe=!1);fe&&(O.diagnostics={runnable:te,programLog:k,vertexShader:{log:Z,prefix:_},fragmentShader:{log:j,prefix:g}})}r.deleteShader(S),r.deleteShader(y),F=new Xr(r,m),L=(function(N,H){let X={},k=N.getProgramParameter(H,N.ACTIVE_ATTRIBUTES);for(let Z=0;Z<k;Z++){let j=N.getActiveAttrib(H,Z),te=j.name,fe=1;j.type===N.FLOAT_MAT2&&(fe=2),j.type===N.FLOAT_MAT3&&(fe=3),j.type===N.FLOAT_MAT4&&(fe=4),X[te]={type:j.type,location:N.getAttribLocation(H,te),locationSize:fe}}return X})(r,m)}let F,L;r.attachShader(m,S),r.attachShader(m,y),t.index0AttributeName!==void 0?r.bindAttribLocation(m,0,t.index0AttributeName):t.hasPositionAttribute===!0&&r.bindAttribLocation(m,0,"position"),r.linkProgram(m),this.getUniforms=function(){return F===void 0&&P(this),F},this.getAttributes=function(){return L===void 0&&P(this),L};let D=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return D===!1&&(D=r.getProgramParameter(m,37297)),D},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Gf++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=S,this.fragmentShader=y,this}var tg=0,Ph=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Ih(e),t.set(e,n)),n}},Ih=class{constructor(e){this.id=tg++,this.code=e,this.usedTimes=0}};function ng(i,e,t,n,r,s){let a=new Tr,o=new Ph,c=new Set,l=[],h=new Map,u=n.logarithmicDepthBuffer,p=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(m){return c.add(m),m===0?"uv":`uv${m}`}return{getParameters:function(m,_,g,v,x,b){let S=v.fog,y=x.geometry,P=m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial?v.environment:null,F=m.isMeshStandardMaterial||m.isMeshLambertMaterial&&!m.envMap||m.isMeshPhongMaterial&&!m.envMap,L=e.get(m.envMap||P,F),D=L&&L.mapping===Gs?L.image.height:null,O=d[m.type];m.precision!==null&&(p=n.getMaxPrecision(m.precision),p!==m.precision&&Ae("WebGLProgram.getParameters:",m.precision,"not supported, using",p,"instead."));let N=y.morphAttributes.position||y.morphAttributes.normal||y.morphAttributes.color,H=N!==void 0?N.length:0,X,k,Z,j,te=0;if(y.morphAttributes.position!==void 0&&(te=1),y.morphAttributes.normal!==void 0&&(te=2),y.morphAttributes.color!==void 0&&(te=3),O){let yn=Xn[O];X=yn.vertexShader,k=yn.fragmentShader}else{X=m.vertexShader,k=m.fragmentShader;let yn=o.getVertexShaderStage(m),Ri=o.getFragmentShaderStage(m);o.update(m,yn,Ri),Z=yn.id,j=Ri.id}let fe=i.getRenderTarget(),we=i.state.buffers.depth.getReversed(),ye=x.isInstancedMesh===!0,Me=x.isBatchedMesh===!0,re=!!m.map,de=!!m.matcap,ce=!!L,ve=!!m.aoMap,ke=!!m.lightMap,ee=!!m.bumpMap&&m.wireframe===!1,I=!!m.normalMap,T=!!m.displacementMap,R=!!m.emissiveMap,z=!!m.metalnessMap,M=!!m.roughnessMap,B=m.anisotropy>0,U=m.clearcoat>0,A=m.dispersion>0,W=m.iridescence>0,q=m.sheen>0,J=m.transmission>0,ae=B&&!!m.anisotropyMap,Se=U&&!!m.clearcoatMap,be=U&&!!m.clearcoatNormalMap,pe=U&&!!m.clearcoatRoughnessMap,Le=W&&!!m.iridescenceMap,ne=W&&!!m.iridescenceThicknessMap,oe=q&&!!m.sheenColorMap,se=q&&!!m.sheenRoughnessMap,ge=!!m.specularMap,st=!!m.specularColorMap,Ke=!!m.specularIntensityMap,gt=J&&!!m.transmissionMap,Wt=J&&!!m.thicknessMap,Ee=!!m.gradientMap,tt=!!m.alphaMap,We=m.alphaTest>0,It=!!m.alphaHash,at=!!m.extensions,St=An;m.toneMapped&&(fe!==null&&fe.isXRRenderTarget!==!0||(St=i.toneMapping));let pt={shaderID:O,shaderType:m.type,shaderName:m.name,vertexShader:X,fragmentShader:k,defines:m.defines,customVertexShaderID:Z,customFragmentShaderID:j,isRawShaderMaterial:m.isRawShaderMaterial===!0,glslVersion:m.glslVersion,precision:p,batching:Me,batchingColor:Me&&x._colorsTexture!==null,instancing:ye,instancingColor:ye&&x.instanceColor!==null,instancingMorph:ye&&x.morphTexture!==null,outputColorSpace:fe===null?i.outputColorSpace:fe.isXRRenderTarget===!0?fe.texture.colorSpace:je.workingColorSpace,alphaToCoverage:!!m.alphaToCoverage,map:re,matcap:de,envMap:ce,envMapMode:ce&&L.mapping,envMapCubeUVHeight:D,aoMap:ve,lightMap:ke,bumpMap:ee,normalMap:I,displacementMap:T,emissiveMap:R,normalMapObjectSpace:I&&m.normalMapType===Ad,normalMapTangentSpace:I&&m.normalMapType===sh,packedNormalMap:I&&m.normalMapType===sh&&(hn=m.normalMap.format,hn===ji||hn===Wo||hn===Xo),metalnessMap:z,roughnessMap:M,anisotropy:B,anisotropyMap:ae,clearcoat:U,clearcoatMap:Se,clearcoatNormalMap:be,clearcoatRoughnessMap:pe,dispersion:A,iridescence:W,iridescenceMap:Le,iridescenceThicknessMap:ne,sheen:q,sheenColorMap:oe,sheenRoughnessMap:se,specularMap:ge,specularColorMap:st,specularIntensityMap:Ke,transmission:J,transmissionMap:gt,thicknessMap:Wt,gradientMap:Ee,opaque:m.transparent===!1&&m.blending===zs&&m.alphaToCoverage===!1,alphaMap:tt,alphaTest:We,alphaHash:It,combine:m.combine,mapUv:re&&f(m.map.channel),aoMapUv:ve&&f(m.aoMap.channel),lightMapUv:ke&&f(m.lightMap.channel),bumpMapUv:ee&&f(m.bumpMap.channel),normalMapUv:I&&f(m.normalMap.channel),displacementMapUv:T&&f(m.displacementMap.channel),emissiveMapUv:R&&f(m.emissiveMap.channel),metalnessMapUv:z&&f(m.metalnessMap.channel),roughnessMapUv:M&&f(m.roughnessMap.channel),anisotropyMapUv:ae&&f(m.anisotropyMap.channel),clearcoatMapUv:Se&&f(m.clearcoatMap.channel),clearcoatNormalMapUv:be&&f(m.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:pe&&f(m.clearcoatRoughnessMap.channel),iridescenceMapUv:Le&&f(m.iridescenceMap.channel),iridescenceThicknessMapUv:ne&&f(m.iridescenceThicknessMap.channel),sheenColorMapUv:oe&&f(m.sheenColorMap.channel),sheenRoughnessMapUv:se&&f(m.sheenRoughnessMap.channel),specularMapUv:ge&&f(m.specularMap.channel),specularColorMapUv:st&&f(m.specularColorMap.channel),specularIntensityMapUv:Ke&&f(m.specularIntensityMap.channel),transmissionMapUv:gt&&f(m.transmissionMap.channel),thicknessMapUv:Wt&&f(m.thicknessMap.channel),alphaMapUv:tt&&f(m.alphaMap.channel),vertexTangents:!!y.attributes.tangent&&(I||B),vertexNormals:!!y.attributes.normal,vertexColors:m.vertexColors,vertexAlphas:m.vertexColors===!0&&!!y.attributes.color&&y.attributes.color.itemSize===4,pointsUvs:x.isPoints===!0&&!!y.attributes.uv&&(re||tt),fog:!!S,useFog:m.fog===!0,fogExp2:!!S&&S.isFogExp2,flatShading:m.wireframe===!1&&(m.flatShading===!0||y.attributes.normal===void 0&&I===!1&&(m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)),sizeAttenuation:m.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:we,skinning:x.isSkinnedMesh===!0,hasPositionAttribute:y.attributes.position!==void 0,morphTargets:y.morphAttributes.position!==void 0,morphNormals:y.morphAttributes.normal!==void 0,morphColors:y.morphAttributes.color!==void 0,morphTargetsCount:H,morphTextureStride:te,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numLightProbeGrids:b.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:m.dithering,shadowMapEnabled:i.shadowMap.enabled&&g.length>0,shadowMapType:i.shadowMap.type,toneMapping:St,decodeVideoTexture:re&&m.map.isVideoTexture===!0&&je.getTransfer(m.map.colorSpace)===Qe,decodeVideoTextureEmissive:R&&m.emissiveMap.isVideoTexture===!0&&je.getTransfer(m.emissiveMap.colorSpace)===Qe,premultipliedAlpha:m.premultipliedAlpha,doubleSided:m.side===kn,flipSided:m.side===Jt,useDepthPacking:m.depthPacking>=0,depthPacking:m.depthPacking||0,index0AttributeName:m.index0AttributeName,extensionClipCullDistance:at&&m.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(at&&m.extensions.multiDraw===!0||Me)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:m.customProgramCacheKey()};var hn;return pt.vertexUv1s=c.has(1),pt.vertexUv2s=c.has(2),pt.vertexUv3s=c.has(3),c.clear(),pt},getProgramCacheKey:function(m){let _=[];if(m.shaderID?_.push(m.shaderID):(_.push(m.customVertexShaderID),_.push(m.customFragmentShaderID)),m.defines!==void 0)for(let g in m.defines)_.push(g),_.push(m.defines[g]);return m.isRawShaderMaterial===!1&&((function(g,v){g.push(v.precision),g.push(v.outputColorSpace),g.push(v.envMapMode),g.push(v.envMapCubeUVHeight),g.push(v.mapUv),g.push(v.alphaMapUv),g.push(v.lightMapUv),g.push(v.aoMapUv),g.push(v.bumpMapUv),g.push(v.normalMapUv),g.push(v.displacementMapUv),g.push(v.emissiveMapUv),g.push(v.metalnessMapUv),g.push(v.roughnessMapUv),g.push(v.anisotropyMapUv),g.push(v.clearcoatMapUv),g.push(v.clearcoatNormalMapUv),g.push(v.clearcoatRoughnessMapUv),g.push(v.iridescenceMapUv),g.push(v.iridescenceThicknessMapUv),g.push(v.sheenColorMapUv),g.push(v.sheenRoughnessMapUv),g.push(v.specularMapUv),g.push(v.specularColorMapUv),g.push(v.specularIntensityMapUv),g.push(v.transmissionMapUv),g.push(v.thicknessMapUv),g.push(v.combine),g.push(v.fogExp2),g.push(v.sizeAttenuation),g.push(v.morphTargetsCount),g.push(v.morphAttributeCount),g.push(v.numDirLights),g.push(v.numPointLights),g.push(v.numSpotLights),g.push(v.numSpotLightMaps),g.push(v.numHemiLights),g.push(v.numRectAreaLights),g.push(v.numDirLightShadows),g.push(v.numPointLightShadows),g.push(v.numSpotLightShadows),g.push(v.numSpotLightShadowsWithMaps),g.push(v.numLightProbes),g.push(v.shadowMapType),g.push(v.toneMapping),g.push(v.numClippingPlanes),g.push(v.numClipIntersection),g.push(v.depthPacking)})(_,m),(function(g,v){a.disableAll(),v.instancing&&a.enable(0),v.instancingColor&&a.enable(1),v.instancingMorph&&a.enable(2),v.matcap&&a.enable(3),v.envMap&&a.enable(4),v.normalMapObjectSpace&&a.enable(5),v.normalMapTangentSpace&&a.enable(6),v.clearcoat&&a.enable(7),v.iridescence&&a.enable(8),v.alphaTest&&a.enable(9),v.vertexColors&&a.enable(10),v.vertexAlphas&&a.enable(11),v.vertexUv1s&&a.enable(12),v.vertexUv2s&&a.enable(13),v.vertexUv3s&&a.enable(14),v.vertexTangents&&a.enable(15),v.anisotropy&&a.enable(16),v.alphaHash&&a.enable(17),v.batching&&a.enable(18),v.dispersion&&a.enable(19),v.batchingColor&&a.enable(20),v.gradientMap&&a.enable(21),v.packedNormalMap&&a.enable(22),v.vertexNormals&&a.enable(23),g.push(a.mask),a.disableAll(),v.fog&&a.enable(0),v.useFog&&a.enable(1),v.flatShading&&a.enable(2),v.logarithmicDepthBuffer&&a.enable(3),v.reversedDepthBuffer&&a.enable(4),v.skinning&&a.enable(5),v.morphTargets&&a.enable(6),v.morphNormals&&a.enable(7),v.morphColors&&a.enable(8),v.premultipliedAlpha&&a.enable(9),v.shadowMapEnabled&&a.enable(10),v.doubleSided&&a.enable(11),v.flipSided&&a.enable(12),v.useDepthPacking&&a.enable(13),v.dithering&&a.enable(14),v.transmission&&a.enable(15),v.sheen&&a.enable(16),v.opaque&&a.enable(17),v.pointsUvs&&a.enable(18),v.decodeVideoTexture&&a.enable(19),v.decodeVideoTextureEmissive&&a.enable(20),v.alphaToCoverage&&a.enable(21),v.numLightProbeGrids>0&&a.enable(22),v.hasPositionAttribute&&a.enable(23),g.push(a.mask)})(_,m),_.push(i.outputColorSpace)),_.push(m.customProgramCacheKey),_.join()},getUniforms:function(m){let _=d[m.type],g;if(_){let v=Xn[_];g=Vd.clone(v.uniforms)}else g=m.uniforms;return g},acquireProgram:function(m,_){let g=h.get(_);return g!==void 0?++g.usedTimes:(g=new eg(i,_,m,r),l.push(g),h.set(_,g)),g},releaseProgram:function(m){if(--m.usedTimes===0){let _=l.indexOf(m);l[_]=l[l.length-1],l.pop(),h.delete(m.cacheKey),m.destroy()}},releaseShaderCache:function(m){o.remove(m)},programs:l,dispose:function(){o.dispose()}}}function ig(){let i=new WeakMap;return{has:function(e){return i.has(e)},get:function(e){let t=i.get(e);return t===void 0&&(t={},i.set(e,t)),t},remove:function(e){i.delete(e)},update:function(e,t,n){i.get(e)[t]=n},dispose:function(){i=new WeakMap}}}function rg(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function lp(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function cp(){let i=[],e=0,t=[],n=[],r=[];function s(o){let c=0;return o.isInstancedMesh&&(c+=2),o.isSkinnedMesh&&(c+=1),c}function a(o,c,l,h,u,p){let d=i[e];return d===void 0?(d={id:o.id,object:o,geometry:c,material:l,materialVariant:s(o),groupOrder:h,renderOrder:o.renderOrder,z:u,group:p},i[e]=d):(d.id=o.id,d.object=o,d.geometry=c,d.material=l,d.materialVariant=s(o),d.groupOrder=h,d.renderOrder=o.renderOrder,d.z=u,d.group=p),e++,d}return{opaque:t,transmissive:n,transparent:r,init:function(){e=0,t.length=0,n.length=0,r.length=0},push:function(o,c,l,h,u,p){let d=a(o,c,l,h,u,p);l.transmission>0?n.push(d):l.transparent===!0?r.push(d):t.push(d)},unshift:function(o,c,l,h,u,p){let d=a(o,c,l,h,u,p);l.transmission>0?n.unshift(d):l.transparent===!0?r.unshift(d):t.unshift(d)},finish:function(){for(let o=e,c=i.length;o<c;o++){let l=i[o];if(l.id===null)break;l.id=null,l.object=null,l.geometry=null,l.material=null,l.group=null}},sort:function(o,c,l){t.length>1&&t.sort(o||rg),n.length>1&&n.sort(c||lp),r.length>1&&r.sort(c||lp),l&&(t.reverse(),n.reverse(),r.reverse())}}}function sg(){let i=new WeakMap;return{get:function(e,t){let n=i.get(e),r;return n===void 0?(r=new cp,i.set(e,[r])):t>=n.length?(r=new cp,n.push(r)):r=n[t],r},dispose:function(){i=new WeakMap}}}function ag(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new xe};break;case"SpotLight":t={position:new C,direction:new C,color:new xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new xe,groundColor:new xe};break;case"RectAreaLight":t={color:new xe,position:new C,halfWidth:new C,halfHeight:new C}}return i[e.id]=t,t}}}var og=0;function lg(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function cg(i){let e=new ag,t=(function(){let o={};return{get:function(c){if(o[c.id]!==void 0)return o[c.id];let l;switch(c.type){case"DirectionalLight":case"SpotLight":l={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"PointLight":l={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie,shadowCameraNear:1,shadowCameraFar:1e3}}return o[c.id]=l,l}}})(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let o=0;o<9;o++)n.probe.push(new C);let r=new C,s=new Oe,a=new Oe;return{setup:function(o){let c=0,l=0,h=0;for(let P=0;P<9;P++)n.probe[P].set(0,0,0);let u=0,p=0,d=0,f=0,m=0,_=0,g=0,v=0,x=0,b=0,S=0;o.sort(lg);for(let P=0,F=o.length;P<F;P++){let L=o[P],D=L.color,O=L.intensity,N=L.distance,H=null;if(L.shadow&&L.shadow.map&&(H=L.shadow.map.texture.format===ji?L.shadow.map.texture:L.shadow.map.depthTexture||L.shadow.map.texture),L.isAmbientLight)c+=D.r*O,l+=D.g*O,h+=D.b*O;else if(L.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(L.sh.coefficients[X],O);S++}else if(L.isDirectionalLight){let X=e.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){let k=L.shadow,Z=t.get(L);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,n.directionalShadow[u]=Z,n.directionalShadowMap[u]=H,n.directionalShadowMatrix[u]=L.shadow.matrix,_++}n.directional[u]=X,u++}else if(L.isSpotLight){let X=e.get(L);X.position.setFromMatrixPosition(L.matrixWorld),X.color.copy(D).multiplyScalar(O),X.distance=N,X.coneCos=Math.cos(L.angle),X.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),X.decay=L.decay,n.spot[d]=X;let k=L.shadow;if(L.map&&(n.spotLightMap[x]=L.map,x++,k.updateMatrices(L),L.castShadow&&b++),n.spotLightMatrix[d]=k.matrix,L.castShadow){let Z=t.get(L);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,n.spotShadow[d]=Z,n.spotShadowMap[d]=H,v++}d++}else if(L.isRectAreaLight){let X=e.get(L);X.color.copy(D).multiplyScalar(O),X.halfWidth.set(.5*L.width,0,0),X.halfHeight.set(0,.5*L.height,0),n.rectArea[f]=X,f++}else if(L.isPointLight){let X=e.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),X.distance=L.distance,X.decay=L.decay,L.castShadow){let k=L.shadow,Z=t.get(L);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,Z.shadowCameraNear=k.camera.near,Z.shadowCameraFar=k.camera.far,n.pointShadow[p]=Z,n.pointShadowMap[p]=H,n.pointShadowMatrix[p]=L.shadow.matrix,g++}n.point[p]=X,p++}else if(L.isHemisphereLight){let X=e.get(L);X.skyColor.copy(L.color).multiplyScalar(O),X.groundColor.copy(L.groundColor).multiplyScalar(O),n.hemi[m]=X,m++}}f>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ue.LTC_FLOAT_1,n.rectAreaLTC2=ue.LTC_FLOAT_2):(n.rectAreaLTC1=ue.LTC_HALF_1,n.rectAreaLTC2=ue.LTC_HALF_2)),n.ambient[0]=c,n.ambient[1]=l,n.ambient[2]=h;let y=n.hash;y.directionalLength===u&&y.pointLength===p&&y.spotLength===d&&y.rectAreaLength===f&&y.hemiLength===m&&y.numDirectionalShadows===_&&y.numPointShadows===g&&y.numSpotShadows===v&&y.numSpotMaps===x&&y.numLightProbes===S||(n.directional.length=u,n.spot.length=d,n.rectArea.length=f,n.point.length=p,n.hemi.length=m,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=g,n.pointShadowMap.length=g,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=g,n.spotLightMatrix.length=v+x-b,n.spotLightMap.length=x,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=S,y.directionalLength=u,y.pointLength=p,y.spotLength=d,y.rectAreaLength=f,y.hemiLength=m,y.numDirectionalShadows=_,y.numPointShadows=g,y.numSpotShadows=v,y.numSpotMaps=x,y.numLightProbes=S,n.version=og++)},setupView:function(o,c){let l=0,h=0,u=0,p=0,d=0,f=c.matrixWorldInverse;for(let m=0,_=o.length;m<_;m++){let g=o[m];if(g.isDirectionalLight){let v=n.directional[l];v.direction.setFromMatrixPosition(g.matrixWorld),r.setFromMatrixPosition(g.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(f),l++}else if(g.isSpotLight){let v=n.spot[u];v.position.setFromMatrixPosition(g.matrixWorld),v.position.applyMatrix4(f),v.direction.setFromMatrixPosition(g.matrixWorld),r.setFromMatrixPosition(g.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(f),u++}else if(g.isRectAreaLight){let v=n.rectArea[p];v.position.setFromMatrixPosition(g.matrixWorld),v.position.applyMatrix4(f),a.identity(),s.copy(g.matrixWorld),s.premultiply(f),a.extractRotation(s),v.halfWidth.set(.5*g.width,0,0),v.halfHeight.set(0,.5*g.height,0),v.halfWidth.applyMatrix4(a),v.halfHeight.applyMatrix4(a),p++}else if(g.isPointLight){let v=n.point[h];v.position.setFromMatrixPosition(g.matrixWorld),v.position.applyMatrix4(f),h++}else if(g.isHemisphereLight){let v=n.hemi[d];v.direction.setFromMatrixPosition(g.matrixWorld),v.direction.transformDirection(f),d++}}},state:n}}function hp(i){let e=new cg(i),t=[],n=[],r=[],s={lightsArray:t,shadowsArray:n,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:function(a){s.camera=a,t.length=0,n.length=0,r.length=0},state:s,setupLights:function(){e.setup(t)},setupLightsView:function(a){e.setupView(t,a)},pushLight:function(a){t.push(a)},pushShadow:function(a){n.push(a)},pushLightProbeGrid:function(a){r.push(a)}}}function hg(i){let e=new WeakMap;return{get:function(t,n=0){let r=e.get(t),s;return r===void 0?(s=new hp(i),e.set(t,[s])):n>=r.length?(s=new hp(i),r.push(s)):s=r[n],s},dispose:function(){e=new WeakMap}}}var ug=[new C(1,0,0),new C(-1,0,0),new C(0,1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1)],dg=[new C(0,-1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1),new C(0,-1,0),new C(0,-1,0)],up=new Oe,Xs=new C,Th=new C;function pg(i,e,t){let n=new ri,r=new ie,s=new ie,a=new it,o=new fo,c=new go,l={},h=t.maxTextureSize,u={[Br]:Jt,[Jt]:Br,[kn]:kn},p=new an({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ie},radius:{value:4}},vertexShader:`void main() {
	gl_Position = vec4( position, 1.0 );
}`,fragmentShader:`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`}),d=p.clone();d.defines.HORIZONTAL_PASS=1;let f=new rt;f.setAttribute("position",new Yt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let m=new Tt(f,p),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Bs;let g=this.type;function v(y,P){let F=e.update(m);p.defines.VSM_SAMPLES!==y.blurSamples&&(p.defines.VSM_SAMPLES=y.blurSamples,d.defines.VSM_SAMPLES=y.blurSamples,p.needsUpdate=!0,d.needsUpdate=!0),y.mapPass===null&&(y.mapPass=new tn(r.x,r.y,{format:ji,type:Hn})),p.uniforms.shadow_pass.value=y.map.depthTexture,p.uniforms.resolution.value=y.mapSize,p.uniforms.radius.value=y.radius,i.setRenderTarget(y.mapPass),i.clear(),i.renderBufferDirect(P,null,F,p,m,null),d.uniforms.shadow_pass.value=y.mapPass.texture,d.uniforms.resolution.value=y.mapSize,d.uniforms.radius.value=y.radius,i.setRenderTarget(y.map),i.clear(),i.renderBufferDirect(P,null,F,d,m,null)}function x(y,P,F,L){let D=null,O=F.isPointLight===!0?y.customDistanceMaterial:y.customDepthMaterial;if(O!==void 0)D=O;else if(D=F.isPointLight===!0?c:o,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){let N=D.uuid,H=P.uuid,X=l[N];X===void 0&&(X={},l[N]=X);let k=X[H];k===void 0&&(k=D.clone(),X[H]=k,P.addEventListener("dispose",S)),D=k}return D.visible=P.visible,D.wireframe=P.wireframe,D.side=L===Or?P.shadowSide!==null?P.shadowSide:P.side:P.shadowSide!==null?P.shadowSide:u[P.side],D.alphaMap=P.alphaMap,D.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,D.map=P.map,D.clipShadows=P.clipShadows,D.clippingPlanes=P.clippingPlanes,D.clipIntersection=P.clipIntersection,D.displacementMap=P.displacementMap,D.displacementScale=P.displacementScale,D.displacementBias=P.displacementBias,D.wireframeLinewidth=P.wireframeLinewidth,D.linewidth=P.linewidth,F.isPointLight===!0&&D.isMeshDistanceMaterial===!0&&(i.properties.get(D).light=F),D}function b(y,P,F,L,D){if(y.visible===!1)return;if(y.layers.test(P.layers)&&(y.isMesh||y.isLine||y.isPoints)&&(y.castShadow||y.receiveShadow&&D===Or)&&(!y.frustumCulled||n.intersectsObject(y))){y.modelViewMatrix.multiplyMatrices(F.matrixWorldInverse,y.matrixWorld);let N=e.update(y),H=y.material;if(Array.isArray(H)){let X=N.groups;for(let k=0,Z=X.length;k<Z;k++){let j=X[k],te=H[j.materialIndex];if(te&&te.visible){let fe=x(y,te,L,D);y.onBeforeShadow(i,y,P,F,N,fe,j),i.renderBufferDirect(F,null,N,fe,y,j),y.onAfterShadow(i,y,P,F,N,fe,j)}}}else if(H.visible){let X=x(y,H,L,D);y.onBeforeShadow(i,y,P,F,N,X,null),i.renderBufferDirect(F,null,N,X,y,null),y.onAfterShadow(i,y,P,F,N,X,null)}}let O=y.children;for(let N=0,H=O.length;N<H;N++)b(O[N],P,F,L,D)}function S(y){y.target.removeEventListener("dispose",S);for(let P in l){let F=l[P],L=y.target.uuid;L in F&&(F[L].dispose(),delete F[L])}}this.render=function(y,P,F){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||y.length===0)return;this.type===Po&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Bs);let L=i.getRenderTarget(),D=i.getActiveCubeFace(),O=i.getActiveMipmapLevel(),N=i.state;N.setBlending(Vn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);let H=g!==this.type;H&&P.traverse(function(X){X.material&&(Array.isArray(X.material)?X.material.forEach(k=>k.needsUpdate=!0):X.material.needsUpdate=!0)});for(let X=0,k=y.length;X<k;X++){let Z=y[X],j=Z.shadow;if(j===void 0){Ae("WebGLShadowMap:",Z,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);let te=j.getFrameExtents();r.multiply(te),s.copy(j.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/te.x),r.x=s.x*te.x,j.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/te.y),r.y=s.y*te.y,j.mapSize.y=s.y));let fe=i.state.buffers.depth.getReversed();if(j.camera._reversedDepth=fe,j.map===null||H===!0){if(j.map!==null&&(j.map.depthTexture!==null&&(j.map.depthTexture.dispose(),j.map.depthTexture=null),j.map.dispose()),this.type===Or){if(Z.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}j.map=new tn(r.x,r.y,{format:ji,type:Hn,minFilter:kt,magFilter:kt,generateMipmaps:!1}),j.map.texture.name=Z.name+".shadowMap",j.map.depthTexture=new si(r.x,r.y,gn),j.map.depthTexture.name=Z.name+".shadowMapDepth",j.map.depthTexture.format=Ti,j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=pn,j.map.depthTexture.magFilter=pn}else Z.isPointLight?(j.map=new Ko(r.x),j.map.depthTexture=new $a(r.x,ai)):(j.map=new tn(r.x,r.y),j.map.depthTexture=new si(r.x,r.y,ai)),j.map.depthTexture.name=Z.name+".shadowMap",j.map.depthTexture.format=Ti,this.type===Bs?(j.map.depthTexture.compareFunction=fe?qo:jo,j.map.depthTexture.minFilter=kt,j.map.depthTexture.magFilter=kt):(j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=pn,j.map.depthTexture.magFilter=pn);j.camera.updateProjectionMatrix()}let we=j.map.isWebGLCubeRenderTarget?6:1;for(let ye=0;ye<we;ye++){if(j.map.isWebGLCubeRenderTarget)i.setRenderTarget(j.map,ye),i.clear();else{ye===0&&(i.setRenderTarget(j.map),i.clear());let Me=j.getViewport(ye);a.set(s.x*Me.x,s.y*Me.y,s.x*Me.z,s.y*Me.w),N.viewport(a)}if(Z.isPointLight){let Me=j.camera,re=j.matrix,de=Z.distance||Me.far;de!==Me.far&&(Me.far=de,Me.updateProjectionMatrix()),Xs.setFromMatrixPosition(Z.matrixWorld),Me.position.copy(Xs),Th.copy(Me.position),Th.add(ug[ye]),Me.up.copy(dg[ye]),Me.lookAt(Th),Me.updateMatrixWorld(),re.makeTranslation(-Xs.x,-Xs.y,-Xs.z),up.multiplyMatrices(Me.projectionMatrix,Me.matrixWorldInverse),j._frustum.setFromProjectionMatrix(up,Me.coordinateSystem,Me.reversedDepth)}else j.updateMatrices(Z);n=j.getFrustum(),b(P,F,j.camera,Z,this.type)}j.isPointLightShadow!==!0&&this.type===Or&&v(j,F),j.needsUpdate=!1}g=this.type,_.needsUpdate=!1,i.setRenderTarget(L,D,O)}}function mg(i,e){let t=new function(){let M=!1,B=new it,U=null,A=new it(0,0,0,0);return{setMask:function(W){U===W||M||(i.colorMask(W,W,W,W),U=W)},setLocked:function(W){M=W},setClear:function(W,q,J,ae,Se){Se===!0&&(W*=ae,q*=ae,J*=ae),B.set(W,q,J,ae),A.equals(B)===!1&&(i.clearColor(W,q,J,ae),A.copy(B))},reset:function(){M=!1,U=null,A.set(-1,0,0,0)}}},n=new function(){let M=!1,B=!1,U=null,A=null,W=null;return{setReversed:function(q){if(B!==q){let J=e.get("EXT_clip_control");q?J.clipControlEXT(J.LOWER_LEFT_EXT,J.ZERO_TO_ONE_EXT):J.clipControlEXT(J.LOWER_LEFT_EXT,J.NEGATIVE_ONE_TO_ONE_EXT),B=q;let ae=W;W=null,this.setClear(ae)}},getReversed:function(){return B},setTest:function(q){q?ce(i.DEPTH_TEST):ve(i.DEPTH_TEST)},setMask:function(q){U===q||M||(i.depthMask(q),U=q)},setFunc:function(q){if(B&&(q=Od[q]),A!==q){switch(q){case cc:i.depthFunc(i.NEVER);break;case hc:i.depthFunc(i.ALWAYS);break;case uc:i.depthFunc(i.LESS);break;case Io:i.depthFunc(i.LEQUAL);break;case dc:i.depthFunc(i.EQUAL);break;case pc:i.depthFunc(i.GEQUAL);break;case mc:i.depthFunc(i.GREATER);break;case fc:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}A=q}},setLocked:function(q){M=q},setClear:function(q){W!==q&&(W=q,B&&(q=1-q),i.clearDepth(q))},reset:function(){M=!1,U=null,A=null,W=null,B=!1}}},r=new function(){let M=!1,B=null,U=null,A=null,W=null,q=null,J=null,ae=null,Se=null;return{setTest:function(be){M||(be?ce(i.STENCIL_TEST):ve(i.STENCIL_TEST))},setMask:function(be){B===be||M||(i.stencilMask(be),B=be)},setFunc:function(be,pe,Le){U===be&&A===pe&&W===Le||(i.stencilFunc(be,pe,Le),U=be,A=pe,W=Le)},setOp:function(be,pe,Le){q===be&&J===pe&&ae===Le||(i.stencilOp(be,pe,Le),q=be,J=pe,ae=Le)},setLocked:function(be){M=be},setClear:function(be){Se!==be&&(i.clearStencil(be),Se=be)},reset:function(){M=!1,B=null,U=null,A=null,W=null,q=null,J=null,ae=null,Se=null}}},s=new WeakMap,a=new WeakMap,o={},c={},l={},h=new WeakMap,u=[],p=null,d=!1,f=null,m=null,_=null,g=null,v=null,x=null,b=null,S=new xe(0,0,0),y=0,P=!1,F=null,L=null,D=null,O=null,N=null,H=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),X=!1,k=0,Z=i.getParameter(i.VERSION);Z.indexOf("WebGL")!==-1?(k=parseFloat(/^WebGL (\d)/.exec(Z)[1]),X=k>=1):Z.indexOf("OpenGL ES")!==-1&&(k=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),X=k>=2);let j=null,te={},fe=i.getParameter(i.SCISSOR_BOX),we=i.getParameter(i.VIEWPORT),ye=new it().fromArray(fe),Me=new it().fromArray(we);function re(M,B,U,A){let W=new Uint8Array(4),q=i.createTexture();i.bindTexture(M,q),i.texParameteri(M,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(M,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let J=0;J<U;J++)M===i.TEXTURE_3D||M===i.TEXTURE_2D_ARRAY?i.texImage3D(B,0,i.RGBA,1,1,A,0,i.RGBA,i.UNSIGNED_BYTE,W):i.texImage2D(B+J,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,W);return q}let de={};function ce(M){o[M]!==!0&&(i.enable(M),o[M]=!0)}function ve(M){o[M]!==!1&&(i.disable(M),o[M]=!1)}de[i.TEXTURE_2D]=re(i.TEXTURE_2D,i.TEXTURE_2D,1),de[i.TEXTURE_CUBE_MAP]=re(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),de[i.TEXTURE_2D_ARRAY]=re(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),de[i.TEXTURE_3D]=re(i.TEXTURE_3D,i.TEXTURE_3D,1,1),t.setClear(0,0,0,1),n.setClear(1),r.setClear(0),ce(i.DEPTH_TEST),n.setFunc(Io),T(!1),R(sc),ce(i.CULL_FACE),I(Vn);let ke={[zr]:i.FUNC_ADD,[nd]:i.FUNC_SUBTRACT,[id]:i.FUNC_REVERSE_SUBTRACT};ke[rd]=i.MIN,ke[sd]=i.MAX;let ee={[ad]:i.ZERO,[od]:i.ONE,[ld]:i.SRC_COLOR,[hd]:i.SRC_ALPHA,[gd]:i.SRC_ALPHA_SATURATE,[md]:i.DST_COLOR,[dd]:i.DST_ALPHA,[cd]:i.ONE_MINUS_SRC_COLOR,[ud]:i.ONE_MINUS_SRC_ALPHA,[fd]:i.ONE_MINUS_DST_COLOR,[pd]:i.ONE_MINUS_DST_ALPHA,[vd]:i.CONSTANT_COLOR,[_d]:i.ONE_MINUS_CONSTANT_COLOR,[yd]:i.CONSTANT_ALPHA,[xd]:i.ONE_MINUS_CONSTANT_ALPHA};function I(M,B,U,A,W,q,J,ae,Se,be){if(M!==Vn){if(d===!1&&(ce(i.BLEND),d=!0),M===td)W=W||B,q=q||U,J=J||A,B===m&&W===v||(i.blendEquationSeparate(ke[B],ke[W]),m=B,v=W),U===_&&A===g&&q===x&&J===b||(i.blendFuncSeparate(ee[U],ee[A],ee[q],ee[J]),_=U,g=A,x=q,b=J),ae.equals(S)!==!1&&Se===y||(i.blendColor(ae.r,ae.g,ae.b,Se),S.copy(ae),y=Se),f=M,P=!1;else if(M!==f||be!==P){if(m===zr&&v===zr||(i.blendEquation(i.FUNC_ADD),m=zr,v=zr),be)switch(M){case zs:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ac:i.blendFunc(i.ONE,i.ONE);break;case oc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case lc:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Re("WebGLState: Invalid blending: ",M)}else switch(M){case zs:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ac:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case oc:Re("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case lc:Re("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Re("WebGLState: Invalid blending: ",M)}_=null,g=null,x=null,b=null,S.set(0,0,0),y=0,f=M,P=be}}else d===!0&&(ve(i.BLEND),d=!1)}function T(M){F!==M&&(M?i.frontFace(i.CW):i.frontFace(i.CCW),F=M)}function R(M){M!==Qu?(ce(i.CULL_FACE),M!==L&&(M===sc?i.cullFace(i.BACK):M===ed?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ve(i.CULL_FACE),L=M}function z(M,B,U){M?(ce(i.POLYGON_OFFSET_FILL),O===B&&N===U||(O=B,N=U,n.getReversed()&&(B=-B),i.polygonOffset(B,U))):ve(i.POLYGON_OFFSET_FILL)}return{buffers:{color:t,depth:n,stencil:r},enable:ce,disable:ve,bindFramebuffer:function(M,B){return l[M]!==B&&(i.bindFramebuffer(M,B),l[M]=B,M===i.DRAW_FRAMEBUFFER&&(l[i.FRAMEBUFFER]=B),M===i.FRAMEBUFFER&&(l[i.DRAW_FRAMEBUFFER]=B),!0)},drawBuffers:function(M,B){let U=u,A=!1;if(M){U=h.get(B),U===void 0&&(U=[],h.set(B,U));let W=M.textures;if(U.length!==W.length||U[0]!==i.COLOR_ATTACHMENT0){for(let q=0,J=W.length;q<J;q++)U[q]=i.COLOR_ATTACHMENT0+q;U.length=W.length,A=!0}}else U[0]!==i.BACK&&(U[0]=i.BACK,A=!0);A&&i.drawBuffers(U)},useProgram:function(M){return p!==M&&(i.useProgram(M),p=M,!0)},setBlending:I,setMaterial:function(M,B){M.side===kn?ve(i.CULL_FACE):ce(i.CULL_FACE);let U=M.side===Jt;B&&(U=!U),T(U),M.blending===zs&&M.transparent===!1?I(Vn):I(M.blending,M.blendEquation,M.blendSrc,M.blendDst,M.blendEquationAlpha,M.blendSrcAlpha,M.blendDstAlpha,M.blendColor,M.blendAlpha,M.premultipliedAlpha),n.setFunc(M.depthFunc),n.setTest(M.depthTest),n.setMask(M.depthWrite),t.setMask(M.colorWrite);let A=M.stencilWrite;r.setTest(A),A&&(r.setMask(M.stencilWriteMask),r.setFunc(M.stencilFunc,M.stencilRef,M.stencilFuncMask),r.setOp(M.stencilFail,M.stencilZFail,M.stencilZPass)),z(M.polygonOffset,M.polygonOffsetFactor,M.polygonOffsetUnits),M.alphaToCoverage===!0?ce(i.SAMPLE_ALPHA_TO_COVERAGE):ve(i.SAMPLE_ALPHA_TO_COVERAGE)},setFlipSided:T,setCullFace:R,setLineWidth:function(M){M!==D&&(X&&i.lineWidth(M),D=M)},setPolygonOffset:z,setScissorTest:function(M){M?ce(i.SCISSOR_TEST):ve(i.SCISSOR_TEST)},activeTexture:function(M){M===void 0&&(M=i.TEXTURE0+H-1),j!==M&&(i.activeTexture(M),j=M)},bindTexture:function(M,B,U){U===void 0&&(U=j===null?i.TEXTURE0+H-1:j);let A=te[U];A===void 0&&(A={type:void 0,texture:void 0},te[U]=A),A.type===M&&A.texture===B||(j!==U&&(i.activeTexture(U),j=U),i.bindTexture(M,B||de[M]),A.type=M,A.texture=B)},unbindTexture:function(){let M=te[j];M!==void 0&&M.type!==void 0&&(i.bindTexture(M.type,null),M.type=void 0,M.texture=void 0)},compressedTexImage2D:function(){try{i.compressedTexImage2D(...arguments)}catch(M){Re("WebGLState:",M)}},compressedTexImage3D:function(){try{i.compressedTexImage3D(...arguments)}catch(M){Re("WebGLState:",M)}},texImage2D:function(){try{i.texImage2D(...arguments)}catch(M){Re("WebGLState:",M)}},texImage3D:function(){try{i.texImage3D(...arguments)}catch(M){Re("WebGLState:",M)}},pixelStorei:function(M,B){c[M]!==B&&(i.pixelStorei(M,B),c[M]=B)},getParameter:function(M){return c[M]!==void 0?c[M]:i.getParameter(M)},updateUBOMapping:function(M,B){let U=a.get(B);U===void 0&&(U=new WeakMap,a.set(B,U));let A=U.get(M);A===void 0&&(A=i.getUniformBlockIndex(B,M.name),U.set(M,A))},uniformBlockBinding:function(M,B){let U=a.get(B).get(M);s.get(B)!==U&&(i.uniformBlockBinding(B,U,M.__bindingPointIndex),s.set(B,U))},texStorage2D:function(){try{i.texStorage2D(...arguments)}catch(M){Re("WebGLState:",M)}},texStorage3D:function(){try{i.texStorage3D(...arguments)}catch(M){Re("WebGLState:",M)}},texSubImage2D:function(){try{i.texSubImage2D(...arguments)}catch(M){Re("WebGLState:",M)}},texSubImage3D:function(){try{i.texSubImage3D(...arguments)}catch(M){Re("WebGLState:",M)}},compressedTexSubImage2D:function(){try{i.compressedTexSubImage2D(...arguments)}catch(M){Re("WebGLState:",M)}},compressedTexSubImage3D:function(){try{i.compressedTexSubImage3D(...arguments)}catch(M){Re("WebGLState:",M)}},scissor:function(M){ye.equals(M)===!1&&(i.scissor(M.x,M.y,M.z,M.w),ye.copy(M))},viewport:function(M){Me.equals(M)===!1&&(i.viewport(M.x,M.y,M.z,M.w),Me.copy(M))},reset:function(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),n.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),o={},c={},j=null,te={},l={},h=new WeakMap,u=[],p=null,d=!1,f=null,m=null,_=null,g=null,v=null,x=null,b=null,S=new xe(0,0,0),y=0,P=!1,F=null,L=null,D=null,O=null,N=null,ye.set(0,0,i.canvas.width,i.canvas.height),Me.set(0,0,i.canvas.width,i.canvas.height),t.reset(),n.reset(),r.reset()}}}function fg(i,e,t,n,r,s,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator<"u"&&/OculusBrowser/g.test(navigator.userAgent),l=new ie,h=new WeakMap,u=new Set,p,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(I,T){return f?new OffscreenCanvas(I,T):ms("canvas")}function _(I,T,R){let z=1,M=ee(I);if((M.width>R||M.height>R)&&(z=R/Math.max(M.width,M.height)),z<1){if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&I instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&I instanceof ImageBitmap||typeof VideoFrame<"u"&&I instanceof VideoFrame){let B=Math.floor(z*M.width),U=Math.floor(z*M.height);p===void 0&&(p=m(B,U));let A=T?m(B,U):p;return A.width=B,A.height=U,A.getContext("2d").drawImage(I,0,0,B,U),Ae("WebGLRenderer: Texture has been resized from ("+M.width+"x"+M.height+") to ("+B+"x"+U+")."),A}return"data"in I&&Ae("WebGLRenderer: Image in DataTexture is too big ("+M.width+"x"+M.height+")."),I}return I}function g(I){return I.generateMipmaps}function v(I){i.generateMipmap(I)}function x(I){return I.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:I.isWebGL3DRenderTarget?i.TEXTURE_3D:I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(I,T,R,z,M,B=!1){if(I!==null){if(i[I]!==void 0)return i[I];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let U;z&&(U=e.get("EXT_texture_norm16"),U||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let A=T;if(T===i.RED&&(R===i.FLOAT&&(A=i.R32F),R===i.HALF_FLOAT&&(A=i.R16F),R===i.UNSIGNED_BYTE&&(A=i.R8),R===i.UNSIGNED_SHORT&&U&&(A=U.R16_EXT),R===i.SHORT&&U&&(A=U.R16_SNORM_EXT)),T===i.RED_INTEGER&&(R===i.UNSIGNED_BYTE&&(A=i.R8UI),R===i.UNSIGNED_SHORT&&(A=i.R16UI),R===i.UNSIGNED_INT&&(A=i.R32UI),R===i.BYTE&&(A=i.R8I),R===i.SHORT&&(A=i.R16I),R===i.INT&&(A=i.R32I)),T===i.RG&&(R===i.FLOAT&&(A=i.RG32F),R===i.HALF_FLOAT&&(A=i.RG16F),R===i.UNSIGNED_BYTE&&(A=i.RG8),R===i.UNSIGNED_SHORT&&U&&(A=U.RG16_EXT),R===i.SHORT&&U&&(A=U.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(R===i.UNSIGNED_BYTE&&(A=i.RG8UI),R===i.UNSIGNED_SHORT&&(A=i.RG16UI),R===i.UNSIGNED_INT&&(A=i.RG32UI),R===i.BYTE&&(A=i.RG8I),R===i.SHORT&&(A=i.RG16I),R===i.INT&&(A=i.RG32I)),T===i.RGB_INTEGER&&(R===i.UNSIGNED_BYTE&&(A=i.RGB8UI),R===i.UNSIGNED_SHORT&&(A=i.RGB16UI),R===i.UNSIGNED_INT&&(A=i.RGB32UI),R===i.BYTE&&(A=i.RGB8I),R===i.SHORT&&(A=i.RGB16I),R===i.INT&&(A=i.RGB32I)),T===i.RGBA_INTEGER&&(R===i.UNSIGNED_BYTE&&(A=i.RGBA8UI),R===i.UNSIGNED_SHORT&&(A=i.RGBA16UI),R===i.UNSIGNED_INT&&(A=i.RGBA32UI),R===i.BYTE&&(A=i.RGBA8I),R===i.SHORT&&(A=i.RGBA16I),R===i.INT&&(A=i.RGBA32I)),T===i.RGB&&(R===i.UNSIGNED_SHORT&&U&&(A=U.RGB16_EXT),R===i.SHORT&&U&&(A=U.RGB16_SNORM_EXT),R===i.UNSIGNED_INT_5_9_9_9_REV&&(A=i.RGB9_E5),R===i.UNSIGNED_INT_10F_11F_11F_REV&&(A=i.R11F_G11F_B10F)),T===i.RGBA){let W=B?ps:je.getTransfer(M);R===i.FLOAT&&(A=i.RGBA32F),R===i.HALF_FLOAT&&(A=i.RGBA16F),R===i.UNSIGNED_BYTE&&(A=W===Qe?i.SRGB8_ALPHA8:i.RGBA8),R===i.UNSIGNED_SHORT&&U&&(A=U.RGBA16_EXT),R===i.SHORT&&U&&(A=U.RGBA16_SNORM_EXT),R===i.UNSIGNED_SHORT_4_4_4_4&&(A=i.RGBA4),R===i.UNSIGNED_SHORT_5_5_5_1&&(A=i.RGB5_A1)}return A!==i.R16F&&A!==i.R32F&&A!==i.RG16F&&A!==i.RG32F&&A!==i.RGBA16F&&A!==i.RGBA32F||e.get("EXT_color_buffer_float"),A}function S(I,T){let R;return I?T===null||T===ai||T===Hr?R=i.DEPTH24_STENCIL8:T===gn?R=i.DEPTH32F_STENCIL8:T===Vr&&(R=i.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===ai||T===Hr?R=i.DEPTH_COMPONENT24:T===gn?R=i.DEPTH_COMPONENT32F:T===Vr&&(R=i.DEPTH_COMPONENT16),R}function y(I,T){return g(I)===!0||I.isFramebufferTexture&&I.minFilter!==pn&&I.minFilter!==kt?Math.log2(Math.max(T.width,T.height))+1:I.mipmaps!==void 0&&I.mipmaps.length>0?I.mipmaps.length:I.isCompressedTexture&&Array.isArray(I.image)?T.mipmaps.length:1}function P(I){let T=I.target;T.removeEventListener("dispose",P),(function(R){let z=n.get(R);if(z.__webglInit===void 0)return;let M=R.source,B=d.get(M);if(B){let U=B[z.__cacheKey];U.usedTimes--,U.usedTimes===0&&L(R),Object.keys(B).length===0&&d.delete(M)}n.remove(R)})(T),T.isVideoTexture&&h.delete(T),T.isHTMLTexture&&u.delete(T)}function F(I){let T=I.target;T.removeEventListener("dispose",F),(function(R){let z=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let B=0;B<6;B++){if(Array.isArray(z.__webglFramebuffer[B]))for(let U=0;U<z.__webglFramebuffer[B].length;U++)i.deleteFramebuffer(z.__webglFramebuffer[B][U]);else i.deleteFramebuffer(z.__webglFramebuffer[B]);z.__webglDepthbuffer&&i.deleteRenderbuffer(z.__webglDepthbuffer[B])}else{if(Array.isArray(z.__webglFramebuffer))for(let B=0;B<z.__webglFramebuffer.length;B++)i.deleteFramebuffer(z.__webglFramebuffer[B]);else i.deleteFramebuffer(z.__webglFramebuffer);if(z.__webglDepthbuffer&&i.deleteRenderbuffer(z.__webglDepthbuffer),z.__webglMultisampledFramebuffer&&i.deleteFramebuffer(z.__webglMultisampledFramebuffer),z.__webglColorRenderbuffer)for(let B=0;B<z.__webglColorRenderbuffer.length;B++)z.__webglColorRenderbuffer[B]&&i.deleteRenderbuffer(z.__webglColorRenderbuffer[B]);z.__webglDepthRenderbuffer&&i.deleteRenderbuffer(z.__webglDepthRenderbuffer)}let M=R.textures;for(let B=0,U=M.length;B<U;B++){let A=n.get(M[B]);A.__webglTexture&&(i.deleteTexture(A.__webglTexture),a.memory.textures--),n.remove(M[B])}n.remove(R)})(T)}function L(I){let T=n.get(I);i.deleteTexture(T.__webglTexture);let R=I.source;delete d.get(R)[T.__cacheKey],a.memory.textures--}let D=0;function O(I,T){let R=n.get(I);if(I.isVideoTexture&&(function(z){let M=a.render.frame;h.get(z)!==M&&(h.set(z,M),z.update())})(I),I.isRenderTargetTexture===!1&&I.isExternalTexture!==!0&&I.version>0&&R.__version!==I.version){let z=I.image;if(z===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else{if(z.complete!==!1)return void te(R,I,T);Ae("WebGLRenderer: Texture marked for update but image is incomplete")}}else I.isExternalTexture&&(R.__webglTexture=I.sourceTexture?I.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,R.__webglTexture,i.TEXTURE0+T)}let N={[Wa]:i.REPEAT,[_i]:i.CLAMP_TO_EDGE,[Xa]:i.MIRRORED_REPEAT},H={[pn]:i.NEAREST,[Td]:i.NEAREST_MIPMAP_NEAREST,[ks]:i.NEAREST_MIPMAP_LINEAR,[kt]:i.LINEAR,[No]:i.LINEAR_MIPMAP_NEAREST,[Wi]:i.LINEAR_MIPMAP_LINEAR},X={[Cd]:i.NEVER,[Dd]:i.ALWAYS,[Rd]:i.LESS,[jo]:i.LEQUAL,[Pd]:i.EQUAL,[qo]:i.GEQUAL,[Id]:i.GREATER,[Ld]:i.NOTEQUAL};function k(I,T){if(T.type!==gn||e.has("OES_texture_float_linear")!==!1||T.magFilter!==kt&&T.magFilter!==No&&T.magFilter!==ks&&T.magFilter!==Wi&&T.minFilter!==kt&&T.minFilter!==No&&T.minFilter!==ks&&T.minFilter!==Wi||Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(I,i.TEXTURE_WRAP_S,N[T.wrapS]),i.texParameteri(I,i.TEXTURE_WRAP_T,N[T.wrapT]),I!==i.TEXTURE_3D&&I!==i.TEXTURE_2D_ARRAY||i.texParameteri(I,i.TEXTURE_WRAP_R,N[T.wrapR]),i.texParameteri(I,i.TEXTURE_MAG_FILTER,H[T.magFilter]),i.texParameteri(I,i.TEXTURE_MIN_FILTER,H[T.minFilter]),T.compareFunction&&(i.texParameteri(I,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(I,i.TEXTURE_COMPARE_FUNC,X[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===pn||T.minFilter!==ks&&T.minFilter!==Wi||T.type===gn&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){let R=e.get("EXT_texture_filter_anisotropic");i.texParameterf(I,R.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,r.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function Z(I,T){let R=!1;I.__webglInit===void 0&&(I.__webglInit=!0,T.addEventListener("dispose",P));let z=T.source,M=d.get(z);M===void 0&&(M={},d.set(z,M));let B=(function(U){let A=[];return A.push(U.wrapS),A.push(U.wrapT),A.push(U.wrapR||0),A.push(U.magFilter),A.push(U.minFilter),A.push(U.anisotropy),A.push(U.internalFormat),A.push(U.format),A.push(U.type),A.push(U.generateMipmaps),A.push(U.premultiplyAlpha),A.push(U.flipY),A.push(U.unpackAlignment),A.push(U.colorSpace),A.join()})(T);if(B!==I.__cacheKey){M[B]===void 0&&(M[B]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,R=!0),M[B].usedTimes++;let U=M[I.__cacheKey];U!==void 0&&(M[I.__cacheKey].usedTimes--,U.usedTimes===0&&L(T)),I.__cacheKey=B,I.__webglTexture=M[B].texture}return R}function j(I,T,R){return Math.floor(Math.floor(I/R)/T)}function te(I,T,R){let z=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(z=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(z=i.TEXTURE_3D);let M=Z(I,T),B=T.source;t.bindTexture(z,I.__webglTexture,i.TEXTURE0+R);let U=n.get(B);if(B.version!==U.__version||M===!0){if(t.activeTexture(i.TEXTURE0+R),!(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)){let oe=je.getPrimaries(je.workingColorSpace),se=T.colorSpace===qi?null:je.getPrimaries(T.colorSpace),ge=T.colorSpace===qi||oe===se?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ge)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let A=_(T.image,!1,r.maxTextureSize);A=ke(T,A);let W=s.convert(T.format,T.colorSpace),q=s.convert(T.type),J,ae=b(T.internalFormat,W,q,T.normalized,T.colorSpace,T.isVideoTexture);k(z,T);let Se=T.mipmaps,be=T.isVideoTexture!==!0,pe=U.__version===void 0||M===!0,Le=B.dataReady,ne=y(T,A);if(T.isDepthTexture)ae=S(T.format===Xi,T.type),pe&&(be?t.texStorage2D(i.TEXTURE_2D,1,ae,A.width,A.height):t.texImage2D(i.TEXTURE_2D,0,ae,A.width,A.height,0,W,q,null));else if(T.isDataTexture)if(Se.length>0){be&&pe&&t.texStorage2D(i.TEXTURE_2D,ne,ae,Se[0].width,Se[0].height);for(let oe=0,se=Se.length;oe<se;oe++)J=Se[oe],be?Le&&t.texSubImage2D(i.TEXTURE_2D,oe,0,0,J.width,J.height,W,q,J.data):t.texImage2D(i.TEXTURE_2D,oe,ae,J.width,J.height,0,W,q,J.data);T.generateMipmaps=!1}else be?(pe&&t.texStorage2D(i.TEXTURE_2D,ne,ae,A.width,A.height),Le&&(function(oe,se,ge,st){let Ke=oe.updateRanges;if(Ke.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,se.width,se.height,ge,st,se.data);else{Ke.sort((We,It)=>We.start-It.start);let gt=0;for(let We=1;We<Ke.length;We++){let It=Ke[gt],at=Ke[We],St=It.start+It.count,pt=j(at.start,se.width,4),hn=j(It.start,se.width,4);at.start<=St+1&&pt===hn&&j(at.start+at.count-1,se.width,4)===pt?It.count=Math.max(It.count,at.start+at.count-It.start):(++gt,Ke[gt]=at)}Ke.length=gt+1;let Wt=t.getParameter(i.UNPACK_ROW_LENGTH),Ee=t.getParameter(i.UNPACK_SKIP_PIXELS),tt=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,se.width);for(let We=0,It=Ke.length;We<It;We++){let at=Ke[We],St=Math.floor(at.start/4),pt=Math.ceil(at.count/4),hn=St%se.width,yn=Math.floor(St/se.width),Ri=pt;t.pixelStorei(i.UNPACK_SKIP_PIXELS,hn),t.pixelStorei(i.UNPACK_SKIP_ROWS,yn),t.texSubImage2D(i.TEXTURE_2D,0,hn,yn,Ri,1,ge,st,se.data)}oe.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,Wt),t.pixelStorei(i.UNPACK_SKIP_PIXELS,Ee),t.pixelStorei(i.UNPACK_SKIP_ROWS,tt)}})(T,A,W,q)):t.texImage2D(i.TEXTURE_2D,0,ae,A.width,A.height,0,W,q,A.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){be&&pe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ne,ae,Se[0].width,Se[0].height,A.depth);for(let oe=0,se=Se.length;oe<se;oe++)if(J=Se[oe],T.format!==Cn)if(W!==null)if(be){if(Le)if(T.layerUpdates.size>0){let ge=ph(J.width,J.height,T.format,T.type);for(let st of T.layerUpdates){let Ke=J.data.subarray(st*ge/J.data.BYTES_PER_ELEMENT,(st+1)*ge/J.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,oe,0,0,st,J.width,J.height,1,W,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,oe,0,0,0,J.width,J.height,A.depth,W,J.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,oe,ae,J.width,J.height,A.depth,0,J.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else be?Le&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,oe,0,0,0,J.width,J.height,A.depth,W,q,J.data):t.texImage3D(i.TEXTURE_2D_ARRAY,oe,ae,J.width,J.height,A.depth,0,W,q,J.data)}else{be&&pe&&t.texStorage2D(i.TEXTURE_2D,ne,ae,Se[0].width,Se[0].height);for(let oe=0,se=Se.length;oe<se;oe++)J=Se[oe],T.format!==Cn?W!==null?be?Le&&t.compressedTexSubImage2D(i.TEXTURE_2D,oe,0,0,J.width,J.height,W,J.data):t.compressedTexImage2D(i.TEXTURE_2D,oe,ae,J.width,J.height,0,J.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):be?Le&&t.texSubImage2D(i.TEXTURE_2D,oe,0,0,J.width,J.height,W,q,J.data):t.texImage2D(i.TEXTURE_2D,oe,ae,J.width,J.height,0,W,q,J.data)}else if(T.isDataArrayTexture)if(be){if(pe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ne,ae,A.width,A.height,A.depth),Le)if(T.layerUpdates.size>0){let oe=ph(A.width,A.height,T.format,T.type);for(let se of T.layerUpdates){let ge=A.data.subarray(se*oe/A.data.BYTES_PER_ELEMENT,(se+1)*oe/A.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,se,A.width,A.height,1,W,q,ge)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,A.width,A.height,A.depth,W,q,A.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ae,A.width,A.height,A.depth,0,W,q,A.data);else if(T.isData3DTexture)be?(pe&&t.texStorage3D(i.TEXTURE_3D,ne,ae,A.width,A.height,A.depth),Le&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,A.width,A.height,A.depth,W,q,A.data)):t.texImage3D(i.TEXTURE_3D,0,ae,A.width,A.height,A.depth,0,W,q,A.data);else if(T.isFramebufferTexture){if(pe)if(be)t.texStorage2D(i.TEXTURE_2D,ne,ae,A.width,A.height);else{let oe=A.width,se=A.height;for(let ge=0;ge<ne;ge++)t.texImage2D(i.TEXTURE_2D,ge,ae,oe,se,0,W,q,null),oe>>=1,se>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){let oe=i.canvas;if(oe.hasAttribute("layoutsubtree")||oe.setAttribute("layoutsubtree","true"),A.parentNode!==oe)return oe.appendChild(A),u.add(T),oe.onpaint=se=>{let ge=se.changedElements;for(let st of u)ge.includes(st.image)&&(st.needsUpdate=!0)},void oe.requestPaint();if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,A);else{let ge=i.RGBA,st=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,ge,st,Ke,A)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Se.length>0){if(be&&pe){let oe=ee(Se[0]);t.texStorage2D(i.TEXTURE_2D,ne,ae,oe.width,oe.height)}for(let oe=0,se=Se.length;oe<se;oe++)J=Se[oe],be?Le&&t.texSubImage2D(i.TEXTURE_2D,oe,0,0,W,q,J):t.texImage2D(i.TEXTURE_2D,oe,ae,W,q,J);T.generateMipmaps=!1}else if(be){if(pe){let oe=ee(A);t.texStorage2D(i.TEXTURE_2D,ne,ae,oe.width,oe.height)}Le&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,W,q,A)}else t.texImage2D(i.TEXTURE_2D,0,ae,W,q,A);g(T)&&v(z),U.__version=B.version,T.onUpdate&&T.onUpdate(T)}I.__version=T.version}function fe(I,T,R,z,M,B){let U=s.convert(R.format,R.colorSpace),A=s.convert(R.type),W=b(R.internalFormat,U,A,R.normalized,R.colorSpace),q=n.get(T),J=n.get(R);if(J.__renderTarget=T,!q.__hasExternalTextures){let ae=Math.max(1,T.width>>B),Se=Math.max(1,T.height>>B);M===i.TEXTURE_3D||M===i.TEXTURE_2D_ARRAY?t.texImage3D(M,B,W,ae,Se,T.depth,0,U,A,null):t.texImage2D(M,B,W,ae,Se,0,U,A,null)}t.bindFramebuffer(i.FRAMEBUFFER,I),ve(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,z,M,J.__webglTexture,0,ce(T)):(M===i.TEXTURE_2D||M>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&M<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,z,M,J.__webglTexture,B),t.bindFramebuffer(i.FRAMEBUFFER,null)}function we(I,T,R){if(i.bindRenderbuffer(i.RENDERBUFFER,I),T.depthBuffer){let z=T.depthTexture,M=z&&z.isDepthTexture?z.type:null,B=S(T.stencilBuffer,M),U=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;ve(T)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ce(T),B,T.width,T.height):R?i.renderbufferStorageMultisample(i.RENDERBUFFER,ce(T),B,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,B,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,U,i.RENDERBUFFER,I)}else{let z=T.textures;for(let M=0;M<z.length;M++){let B=z[M],U=s.convert(B.format,B.colorSpace),A=s.convert(B.type),W=b(B.internalFormat,U,A,B.normalized,B.colorSpace);ve(T)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ce(T),W,T.width,T.height):R?i.renderbufferStorageMultisample(i.RENDERBUFFER,ce(T),W,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,W,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ye(I,T,R){let z=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,I),!T.depthTexture||!T.depthTexture.isDepthTexture)throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let M=n.get(T.depthTexture);if(M.__renderTarget=T,M.__webglTexture&&T.depthTexture.image.width===T.width&&T.depthTexture.image.height===T.height||(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),z){if(M.__webglInit===void 0&&(M.__webglInit=!0,T.depthTexture.addEventListener("dispose",P)),M.__webglTexture===void 0){M.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,M.__webglTexture),k(i.TEXTURE_CUBE_MAP,T.depthTexture);let q=s.convert(T.depthTexture.format),J=s.convert(T.depthTexture.type),ae;T.depthTexture.format===Ti?ae=i.DEPTH_COMPONENT24:T.depthTexture.format===Xi&&(ae=i.DEPTH24_STENCIL8);for(let Se=0;Se<6;Se++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,ae,T.width,T.height,0,q,J,null)}}else O(T.depthTexture,0);let B=M.__webglTexture,U=ce(T),A=z?i.TEXTURE_CUBE_MAP_POSITIVE_X+R:i.TEXTURE_2D,W=T.depthTexture.format===Xi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Ti)ve(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,A,B,0,U):i.framebufferTexture2D(i.FRAMEBUFFER,W,A,B,0);else{if(T.depthTexture.format!==Xi)throw new Error("THREE.WebGLTextures: Unknown depthTexture format.");ve(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,A,B,0,U):i.framebufferTexture2D(i.FRAMEBUFFER,W,A,B,0)}}function Me(I){let T=n.get(I),R=I.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==I.depthTexture){let z=I.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),z){let M=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,z.removeEventListener("dispose",M)};z.addEventListener("dispose",M),T.__depthDisposeCallback=M}T.__boundDepthTexture=z}if(I.depthTexture&&!T.__autoAllocateDepthBuffer)if(R)for(let z=0;z<6;z++)ye(T.__webglFramebuffer[z],I,z);else{let z=I.texture.mipmaps;z&&z.length>0?ye(T.__webglFramebuffer[0],I,0):ye(T.__webglFramebuffer,I,0)}else if(R){T.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[z]),T.__webglDepthbuffer[z]===void 0)T.__webglDepthbuffer[z]=i.createRenderbuffer(),we(T.__webglDepthbuffer[z],I,!1);else{let M=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,B=T.__webglDepthbuffer[z];i.bindRenderbuffer(i.RENDERBUFFER,B),i.framebufferRenderbuffer(i.FRAMEBUFFER,M,i.RENDERBUFFER,B)}}else{let z=I.texture.mipmaps;if(z&&z.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),we(T.__webglDepthbuffer,I,!1);else{let M=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,B=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,B),i.framebufferRenderbuffer(i.FRAMEBUFFER,M,i.RENDERBUFFER,B)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}let re=[],de=[];function ce(I){return Math.min(r.maxSamples,I.samples)}function ve(I){let T=n.get(I);return I.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function ke(I,T){let R=I.colorSpace,z=I.format,M=I.type;return I.isCompressedTexture===!0||I.isVideoTexture===!0||R!==ds&&R!==qi&&(je.getTransfer(R)===Qe?z===Cn&&M===on||Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Re("WebGLTextures: Unsupported texture color space:",R)),T}function ee(I){return typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement?(l.width=I.naturalWidth||I.width,l.height=I.naturalHeight||I.height):typeof VideoFrame<"u"&&I instanceof VideoFrame?(l.width=I.displayWidth,l.height=I.displayHeight):(l.width=I.width,l.height=I.height),l}this.allocateTextureUnit=function(){let I=D;return I>=r.maxTextures&&Ae("WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+r.maxTextures),D+=1,I},this.resetTextureUnits=function(){D=0},this.getTextureUnits=function(){return D},this.setTextureUnits=function(I){D=I},this.setTexture2D=O,this.setTexture2DArray=function(I,T){let R=n.get(I);I.isRenderTargetTexture===!1&&I.version>0&&R.__version!==I.version?te(R,I,T):(I.isExternalTexture&&(R.__webglTexture=I.sourceTexture?I.sourceTexture:null),t.bindTexture(i.TEXTURE_2D_ARRAY,R.__webglTexture,i.TEXTURE0+T))},this.setTexture3D=function(I,T){let R=n.get(I);I.isRenderTargetTexture===!1&&I.version>0&&R.__version!==I.version?te(R,I,T):t.bindTexture(i.TEXTURE_3D,R.__webglTexture,i.TEXTURE0+T)},this.setTextureCube=function(I,T){let R=n.get(I);I.isCubeDepthTexture!==!0&&I.version>0&&R.__version!==I.version?(function(z,M,B){if(M.image.length!==6)return;let U=Z(z,M),A=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+B);let W=n.get(A);if(A.version!==W.__version||U===!0){t.activeTexture(i.TEXTURE0+B);let q=je.getPrimaries(je.workingColorSpace),J=M.colorSpace===qi?null:je.getPrimaries(M.colorSpace),ae=M.colorSpace===qi||q===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ae);let Se=M.isCompressedTexture||M.image[0].isCompressedTexture,be=M.image[0]&&M.image[0].isDataTexture,pe=[];for(let Ee=0;Ee<6;Ee++)pe[Ee]=Se||be?be?M.image[Ee].image:M.image[Ee]:_(M.image[Ee],!0,r.maxCubemapSize),pe[Ee]=ke(M,pe[Ee]);let Le=pe[0],ne=s.convert(M.format,M.colorSpace),oe=s.convert(M.type),se=b(M.internalFormat,ne,oe,M.normalized,M.colorSpace),ge=M.isVideoTexture!==!0,st=W.__version===void 0||U===!0,Ke=A.dataReady,gt,Wt=y(M,Le);if(k(i.TEXTURE_CUBE_MAP,M),Se){ge&&st&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Wt,se,Le.width,Le.height);for(let Ee=0;Ee<6;Ee++){gt=pe[Ee].mipmaps;for(let tt=0;tt<gt.length;tt++){let We=gt[tt];M.format!==Cn?ne!==null?ge?Ke&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt,0,0,We.width,We.height,ne,We.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt,se,We.width,We.height,0,We.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ge?Ke&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt,0,0,We.width,We.height,ne,oe,We.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt,se,We.width,We.height,0,ne,oe,We.data)}}}else{if(gt=M.mipmaps,ge&&st){gt.length>0&&Wt++;let Ee=ee(pe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Wt,se,Ee.width,Ee.height)}for(let Ee=0;Ee<6;Ee++)if(be){ge?Ke&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,pe[Ee].width,pe[Ee].height,ne,oe,pe[Ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,se,pe[Ee].width,pe[Ee].height,0,ne,oe,pe[Ee].data);for(let tt=0;tt<gt.length;tt++){let We=gt[tt].image[Ee].image;ge?Ke&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt+1,0,0,We.width,We.height,ne,oe,We.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt+1,se,We.width,We.height,0,ne,oe,We.data)}}else{ge?Ke&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,ne,oe,pe[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,se,ne,oe,pe[Ee]);for(let tt=0;tt<gt.length;tt++){let We=gt[tt];ge?Ke&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt+1,0,0,ne,oe,We.image[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,tt+1,se,ne,oe,We.image[Ee])}}}g(M)&&v(i.TEXTURE_CUBE_MAP),W.__version=A.version,M.onUpdate&&M.onUpdate(M)}z.__version=M.version})(R,I,T):t.bindTexture(i.TEXTURE_CUBE_MAP,R.__webglTexture,i.TEXTURE0+T)},this.rebindTextures=function(I,T,R){let z=n.get(I);T!==void 0&&fe(z.__webglFramebuffer,I,I.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),R!==void 0&&Me(I)},this.setupRenderTarget=function(I){let T=I.texture,R=n.get(I),z=n.get(T);I.addEventListener("dispose",F);let M=I.textures,B=I.isWebGLCubeRenderTarget===!0,U=M.length>1;if(U||(z.__webglTexture===void 0&&(z.__webglTexture=i.createTexture()),z.__version=T.version,a.memory.textures++),B){R.__webglFramebuffer=[];for(let A=0;A<6;A++)if(T.mipmaps&&T.mipmaps.length>0){R.__webglFramebuffer[A]=[];for(let W=0;W<T.mipmaps.length;W++)R.__webglFramebuffer[A][W]=i.createFramebuffer()}else R.__webglFramebuffer[A]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){R.__webglFramebuffer=[];for(let A=0;A<T.mipmaps.length;A++)R.__webglFramebuffer[A]=i.createFramebuffer()}else R.__webglFramebuffer=i.createFramebuffer();if(U)for(let A=0,W=M.length;A<W;A++){let q=n.get(M[A]);q.__webglTexture===void 0&&(q.__webglTexture=i.createTexture(),a.memory.textures++)}if(I.samples>0&&ve(I)===!1){R.__webglMultisampledFramebuffer=i.createFramebuffer(),R.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,R.__webglMultisampledFramebuffer);for(let A=0;A<M.length;A++){let W=M[A];R.__webglColorRenderbuffer[A]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,R.__webglColorRenderbuffer[A]);let q=s.convert(W.format,W.colorSpace),J=s.convert(W.type),ae=b(W.internalFormat,q,J,W.normalized,W.colorSpace,I.isXRRenderTarget===!0),Se=ce(I);i.renderbufferStorageMultisample(i.RENDERBUFFER,Se,ae,I.width,I.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+A,i.RENDERBUFFER,R.__webglColorRenderbuffer[A])}i.bindRenderbuffer(i.RENDERBUFFER,null),I.depthBuffer&&(R.__webglDepthRenderbuffer=i.createRenderbuffer(),we(R.__webglDepthRenderbuffer,I,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(B){t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture),k(i.TEXTURE_CUBE_MAP,T);for(let A=0;A<6;A++)if(T.mipmaps&&T.mipmaps.length>0)for(let W=0;W<T.mipmaps.length;W++)fe(R.__webglFramebuffer[A][W],I,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+A,W);else fe(R.__webglFramebuffer[A],I,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+A,0);g(T)&&v(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(U){for(let A=0,W=M.length;A<W;A++){let q=M[A],J=n.get(q),ae=i.TEXTURE_2D;(I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(ae=I.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ae,J.__webglTexture),k(ae,q),fe(R.__webglFramebuffer,I,q,i.COLOR_ATTACHMENT0+A,ae,0),g(q)&&v(ae)}t.unbindTexture()}else{let A=i.TEXTURE_2D;if((I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(A=I.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(A,z.__webglTexture),k(A,T),T.mipmaps&&T.mipmaps.length>0)for(let W=0;W<T.mipmaps.length;W++)fe(R.__webglFramebuffer[W],I,T,i.COLOR_ATTACHMENT0,A,W);else fe(R.__webglFramebuffer,I,T,i.COLOR_ATTACHMENT0,A,0);g(T)&&v(A),t.unbindTexture()}I.depthBuffer&&Me(I)},this.updateRenderTargetMipmap=function(I){let T=I.textures;for(let R=0,z=T.length;R<z;R++){let M=T[R];if(g(M)){let B=x(I),U=n.get(M).__webglTexture;t.bindTexture(B,U),v(B),t.unbindTexture()}}},this.updateMultisampleRenderTarget=function(I){if(I.samples>0){if(ve(I)===!1){let T=I.textures,R=I.width,z=I.height,M=i.COLOR_BUFFER_BIT,B=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,U=n.get(I),A=T.length>1;if(A)for(let q=0;q<T.length;q++)t.bindFramebuffer(i.FRAMEBUFFER,U.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+q,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,U.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+q,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,U.__webglMultisampledFramebuffer);let W=I.texture.mipmaps;W&&W.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,U.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,U.__webglFramebuffer);for(let q=0;q<T.length;q++){if(I.resolveDepthBuffer&&(I.depthBuffer&&(M|=i.DEPTH_BUFFER_BIT),I.stencilBuffer&&I.resolveStencilBuffer&&(M|=i.STENCIL_BUFFER_BIT)),A){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,U.__webglColorRenderbuffer[q]);let J=n.get(T[q]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,J,0)}i.blitFramebuffer(0,0,R,z,0,0,R,z,M,i.NEAREST),c===!0&&(re.length=0,de.length=0,re.push(i.COLOR_ATTACHMENT0+q),I.depthBuffer&&I.resolveDepthBuffer===!1&&(re.push(B),de.push(B),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,de)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,re))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),A)for(let q=0;q<T.length;q++){t.bindFramebuffer(i.FRAMEBUFFER,U.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+q,i.RENDERBUFFER,U.__webglColorRenderbuffer[q]);let J=n.get(T[q]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,U.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+q,i.TEXTURE_2D,J,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,U.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&c){let T=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}},this.setupDepthRenderbuffer=Me,this.setupFrameBufferTexture=fe,this.useMultisampledRTT=ve,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function gg(i,e){return{convert:function(t,n=qi){let r,s=je.getTransfer(n);if(t===on)return i.UNSIGNED_BYTE;if(t===Fo)return i.UNSIGNED_SHORT_4_4_4_4;if(t===Oo)return i.UNSIGNED_SHORT_5_5_5_1;if(t===Ec)return i.UNSIGNED_INT_5_9_9_9_REV;if(t===wc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(t===bc)return i.BYTE;if(t===Tc)return i.SHORT;if(t===Vr)return i.UNSIGNED_SHORT;if(t===Uo)return i.INT;if(t===ai)return i.UNSIGNED_INT;if(t===gn)return i.FLOAT;if(t===Hn)return i.HALF_FLOAT;if(t===Ed)return i.ALPHA;if(t===wd)return i.RGB;if(t===Cn)return i.RGBA;if(t===Ti)return i.DEPTH_COMPONENT;if(t===Xi)return i.DEPTH_STENCIL;if(t===Bo)return i.RED;if(t===zo)return i.RED_INTEGER;if(t===ji)return i.RG;if(t===Ac)return i.RG_INTEGER;if(t===Cc)return i.RGBA_INTEGER;if(t===Go||t===ko||t===Vo||t===Ho)if(s===Qe){if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r===null)return null;if(t===Go)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(t===ko)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(t===Vo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(t===Ho)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else{if(r=e.get("WEBGL_compressed_texture_s3tc"),r===null)return null;if(t===Go)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(t===ko)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(t===Vo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(t===Ho)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}if(t===Rc||t===Pc||t===Ic||t===Lc){if(r=e.get("WEBGL_compressed_texture_pvrtc"),r===null)return null;if(t===Rc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(t===Pc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(t===Ic)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(t===Lc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}if(t===Dc||t===Nc||t===Uc||t===Fc||t===Oc||t===Wo||t===Bc){if(r=e.get("WEBGL_compressed_texture_etc"),r===null)return null;if(t===Dc||t===Nc)return s===Qe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(t===Uc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(t===Fc)return r.COMPRESSED_R11_EAC;if(t===Oc)return r.COMPRESSED_SIGNED_R11_EAC;if(t===Wo)return r.COMPRESSED_RG11_EAC;if(t===Bc)return r.COMPRESSED_SIGNED_RG11_EAC}if(t===zc||t===Gc||t===kc||t===Vc||t===Hc||t===Wc||t===Xc||t===jc||t===qc||t===Yc||t===Zc||t===Jc||t===$c||t===Kc){if(r=e.get("WEBGL_compressed_texture_astc"),r===null)return null;if(t===zc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(t===Gc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(t===kc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(t===Vc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(t===Hc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(t===Wc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(t===Xc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(t===jc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(t===qc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(t===Yc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(t===Zc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(t===Jc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(t===$c)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(t===Kc)return s===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}if(t===Qc||t===eh||t===th){if(r=e.get("EXT_texture_compression_bptc"),r===null)return null;if(t===Qc)return s===Qe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(t===eh)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(t===th)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}if(t===nh||t===ih||t===Xo||t===rh){if(r=e.get("EXT_texture_compression_rgtc"),r===null)return null;if(t===nh)return r.COMPRESSED_RED_RGTC1_EXT;if(t===ih)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(t===Xo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(t===rh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}return t===Hr?i.UNSIGNED_INT_24_8:i[t]!==void 0?i[t]:null}}}var Lh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new bs(e.texture);e.depthNear===t.depthNear&&e.depthFar===t.depthFar||(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new an({vertexShader:`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,fragmentShader:`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Tt(new Si(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Dh=class extends zn{constructor(e,t){super();let n=this,r=null,s=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,p=null,d=null,f=null,m=typeof XRWebGLBinding<"u",_=new Lh,g={},v=t.getContextAttributes(),x=null,b=null,S=[],y=[],P=new ie,F=null,L=new Dt;L.viewport=new it;let D=new Dt;D.viewport=new it;let O=[L,D],N=new Co,H=null,X=null;function k(re){let de=y.indexOf(re.inputSource);if(de===-1)return;let ce=S[de];ce!==void 0&&(ce.update(re.inputSource,re.frame,l||a),ce.dispatchEvent({type:re.type,data:re.inputSource}))}function Z(){r.removeEventListener("select",k),r.removeEventListener("selectstart",k),r.removeEventListener("selectend",k),r.removeEventListener("squeeze",k),r.removeEventListener("squeezestart",k),r.removeEventListener("squeezeend",k),r.removeEventListener("end",Z),r.removeEventListener("inputsourceschange",j);for(let re=0;re<S.length;re++){let de=y[re];de!==null&&(y[re]=null,S[re].disconnect(de))}H=null,X=null,_.reset();for(let re in g)delete g[re];e.setRenderTarget(x),d=null,p=null,u=null,r=null,b=null,Me.stop(),n.isPresenting=!1,e.setPixelRatio(F),e.setSize(P.width,P.height,!1),n.dispatchEvent({type:"sessionend"})}function j(re){for(let de=0;de<re.removed.length;de++){let ce=re.removed[de],ve=y.indexOf(ce);ve>=0&&(y[ve]=null,S[ve].disconnect(ce))}for(let de=0;de<re.added.length;de++){let ce=re.added[de],ve=y.indexOf(ce);if(ve===-1){for(let ee=0;ee<S.length;ee++){if(ee>=y.length){y.push(ce),ve=ee;break}if(y[ee]===null){y[ee]=ce,ve=ee;break}}if(ve===-1)break}let ke=S[ve];ke&&ke.connect(ce)}}this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(re){let de=S[re];return de===void 0&&(de=new Er,S[re]=de),de.getTargetRaySpace()},this.getControllerGrip=function(re){let de=S[re];return de===void 0&&(de=new Er,S[re]=de),de.getGripSpace()},this.getHand=function(re){let de=S[re];return de===void 0&&(de=new Er,S[re]=de),de.getHandSpace()},this.setFramebufferScaleFactor=function(re){s=re,n.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(re){o=re,n.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(re){l=re},this.getBaseLayer=function(){return p!==null?p:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return f},this.getSession=function(){return r},this.setSession=async function(re){if(r=re,r!==null){if(x=e.getRenderTarget(),r.addEventListener("select",k),r.addEventListener("selectstart",k),r.addEventListener("selectend",k),r.addEventListener("squeeze",k),r.addEventListener("squeezestart",k),r.addEventListener("squeezeend",k),r.addEventListener("end",Z),r.addEventListener("inputsourceschange",j),v.xrCompatible!==!0&&await t.makeXRCompatible(),F=e.getPixelRatio(),e.getSize(P),m&&"createProjectionLayer"in XRWebGLBinding.prototype){let de=null,ce=null,ve=null;v.depth&&(ve=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,de=v.stencil?Xi:Ti,ce=v.stencil?Hr:ai);let ke={colorFormat:t.RGBA8,depthFormat:ve,scaleFactor:s};u=this.getBinding(),p=u.createProjectionLayer(ke),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),b=new tn(p.textureWidth,p.textureHeight,{format:Cn,type:on,depthTexture:new si(p.textureWidth,p.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,de),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}else{let de={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,t,de),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),b=new tn(d.framebufferWidth,d.framebufferHeight,{format:Cn,type:on,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Me.setContext(r),Me.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};let te=new C,fe=new C;function we(re,de){de===null?re.matrixWorld.copy(re.matrix):re.matrixWorld.multiplyMatrices(de.matrixWorld,re.matrix),re.matrixWorldInverse.copy(re.matrixWorld).invert()}this.updateCamera=function(re){if(r===null)return;let de=re.near,ce=re.far;_.texture!==null&&(_.depthNear>0&&(de=_.depthNear),_.depthFar>0&&(ce=_.depthFar)),N.near=D.near=L.near=de,N.far=D.far=L.far=ce,H===N.near&&X===N.far||(r.updateRenderState({depthNear:N.near,depthFar:N.far}),H=N.near,X=N.far),N.layers.mask=6|re.layers.mask,L.layers.mask=-5&N.layers.mask,D.layers.mask=-3&N.layers.mask;let ve=re.parent,ke=N.cameras;we(N,ve);for(let ee=0;ee<ke.length;ee++)we(ke[ee],ve);ke.length===2?(function(ee,I,T){te.setFromMatrixPosition(I.matrixWorld),fe.setFromMatrixPosition(T.matrixWorld);let R=te.distanceTo(fe),z=I.projectionMatrix.elements,M=T.projectionMatrix.elements,B=z[14]/(z[10]-1),U=z[14]/(z[10]+1),A=(z[9]+1)/z[5],W=(z[9]-1)/z[5],q=(z[8]-1)/z[0],J=(M[8]+1)/M[0],ae=B*q,Se=B*J,be=R/(-q+J),pe=be*-q;if(I.matrixWorld.decompose(ee.position,ee.quaternion,ee.scale),ee.translateX(pe),ee.translateZ(be),ee.matrixWorld.compose(ee.position,ee.quaternion,ee.scale),ee.matrixWorldInverse.copy(ee.matrixWorld).invert(),z[10]===-1)ee.projectionMatrix.copy(I.projectionMatrix),ee.projectionMatrixInverse.copy(I.projectionMatrixInverse);else{let Le=B+be,ne=U+be,oe=ae-pe,se=Se+(R-pe),ge=A*U/ne*Le,st=W*U/ne*Le;ee.projectionMatrix.makePerspective(oe,se,ge,st,Le,ne),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert()}})(N,L,D):N.projectionMatrix.copy(L.projectionMatrix),(function(ee,I,T){T===null?ee.matrix.copy(I.matrixWorld):(ee.matrix.copy(T.matrixWorld),ee.matrix.invert(),ee.matrix.multiply(I.matrixWorld)),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.updateMatrixWorld(!0),ee.projectionMatrix.copy(I.projectionMatrix),ee.projectionMatrixInverse.copy(I.projectionMatrixInverse),ee.isPerspectiveCamera&&(ee.fov=2*Sr*Math.atan(1/ee.projectionMatrix.elements[5]),ee.zoom=1)})(re,N,ve)},this.getCamera=function(){return N},this.getFoveation=function(){if(p!==null||d!==null)return c},this.setFoveation=function(re){c=re,p!==null&&(p.fixedFoveation=re),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=re)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(N)},this.getCameraTexture=function(re){return g[re]};let ye=null,Me=new dp;Me.setAnimationLoop(function(re,de){if(h=de.getViewerPose(l||a),f=de,h!==null){let ce=h.views;d!==null&&(e.setRenderTargetFramebuffer(b,d.framebuffer),e.setRenderTarget(b));let ve=!1;ce.length!==N.cameras.length&&(N.cameras.length=0,ve=!0);for(let ee=0;ee<ce.length;ee++){let I=ce[ee],T=null;if(d!==null)T=d.getViewport(I);else{let z=u.getViewSubImage(p,I);T=z.viewport,ee===0&&(e.setRenderTargetTextures(b,z.colorTexture,z.depthStencilTexture),e.setRenderTarget(b))}let R=O[ee];R===void 0&&(R=new Dt,R.layers.enable(ee),R.viewport=new it,O[ee]=R),R.matrix.fromArray(I.transform.matrix),R.matrix.decompose(R.position,R.quaternion,R.scale),R.projectionMatrix.fromArray(I.projectionMatrix),R.projectionMatrixInverse.copy(R.projectionMatrix).invert(),R.viewport.set(T.x,T.y,T.width,T.height),ee===0&&(N.matrix.copy(R.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),ve===!0&&N.cameras.push(R)}let ke=r.enabledFeatures;if(ke&&ke.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&m){u=n.getBinding();let ee=u.getDepthInformation(ce[0]);ee&&ee.isValid&&ee.texture&&_.init(ee,r.renderState)}if(ke&&ke.includes("camera-access")&&m){e.state.unbindTexture(),u=n.getBinding();for(let ee=0;ee<ce.length;ee++){let I=ce[ee].camera;if(I){let T=g[I];T||(T=new bs,g[I]=T);let R=u.getCameraImage(I);T.sourceTexture=R}}}}for(let ce=0;ce<S.length;ce++){let ve=y[ce],ke=S[ce];ve!==null&&ke!==void 0&&ke.update(ve,de,l||a)}ye&&ye(re,de),de.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:de}),f=null}),this.setAnimationLoop=function(re){ye=re},this.dispose=function(){}}},vg=new Oe,_p=new Be;function _g(i,e){function t(r,s){r.matrixAutoUpdate===!0&&r.updateMatrix(),s.value.copy(r.matrix)}function n(r,s){r.opacity.value=s.opacity,s.color&&r.diffuse.value.copy(s.color),s.emissive&&r.emissive.value.copy(s.emissive).multiplyScalar(s.emissiveIntensity),s.map&&(r.map.value=s.map,t(s.map,r.mapTransform)),s.alphaMap&&(r.alphaMap.value=s.alphaMap,t(s.alphaMap,r.alphaMapTransform)),s.bumpMap&&(r.bumpMap.value=s.bumpMap,t(s.bumpMap,r.bumpMapTransform),r.bumpScale.value=s.bumpScale,s.side===Jt&&(r.bumpScale.value*=-1)),s.normalMap&&(r.normalMap.value=s.normalMap,t(s.normalMap,r.normalMapTransform),r.normalScale.value.copy(s.normalScale),s.side===Jt&&r.normalScale.value.negate()),s.displacementMap&&(r.displacementMap.value=s.displacementMap,t(s.displacementMap,r.displacementMapTransform),r.displacementScale.value=s.displacementScale,r.displacementBias.value=s.displacementBias),s.emissiveMap&&(r.emissiveMap.value=s.emissiveMap,t(s.emissiveMap,r.emissiveMapTransform)),s.specularMap&&(r.specularMap.value=s.specularMap,t(s.specularMap,r.specularMapTransform)),s.alphaTest>0&&(r.alphaTest.value=s.alphaTest);let a=e.get(s),o=a.envMap,c=a.envMapRotation;o&&(r.envMap.value=o,r.envMapRotation.value.setFromMatrix4(vg.makeRotationFromEuler(c)).transpose(),o.isCubeTexture&&o.isRenderTargetTexture===!1&&r.envMapRotation.value.premultiply(_p),r.reflectivity.value=s.reflectivity,r.ior.value=s.ior,r.refractionRatio.value=s.refractionRatio),s.lightMap&&(r.lightMap.value=s.lightMap,r.lightMapIntensity.value=s.lightMapIntensity,t(s.lightMap,r.lightMapTransform)),s.aoMap&&(r.aoMap.value=s.aoMap,r.aoMapIntensity.value=s.aoMapIntensity,t(s.aoMap,r.aoMapTransform))}return{refreshFogUniforms:function(r,s){s.color.getRGB(r.fogColor.value,uh(i)),s.isFog?(r.fogNear.value=s.near,r.fogFar.value=s.far):s.isFogExp2&&(r.fogDensity.value=s.density)},refreshMaterialUniforms:function(r,s,a,o,c){s.isNodeMaterial?s.uniformsNeedUpdate=!1:s.isMeshBasicMaterial?n(r,s):s.isMeshLambertMaterial?(n(r,s),s.envMap&&(r.envMapIntensity.value=s.envMapIntensity)):s.isMeshToonMaterial?(n(r,s),(function(l,h){h.gradientMap&&(l.gradientMap.value=h.gradientMap)})(r,s)):s.isMeshPhongMaterial?(n(r,s),(function(l,h){l.specular.value.copy(h.specular),l.shininess.value=Math.max(h.shininess,1e-4)})(r,s),s.envMap&&(r.envMapIntensity.value=s.envMapIntensity)):s.isMeshStandardMaterial?(n(r,s),(function(l,h){l.metalness.value=h.metalness,h.metalnessMap&&(l.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,l.metalnessMapTransform)),l.roughness.value=h.roughness,h.roughnessMap&&(l.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,l.roughnessMapTransform)),h.envMap&&(l.envMapIntensity.value=h.envMapIntensity)})(r,s),s.isMeshPhysicalMaterial&&(function(l,h,u){l.ior.value=h.ior,h.sheen>0&&(l.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),l.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(l.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,l.sheenColorMapTransform)),h.sheenRoughnessMap&&(l.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,l.sheenRoughnessMapTransform))),h.clearcoat>0&&(l.clearcoat.value=h.clearcoat,l.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(l.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,l.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(l.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,l.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(l.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,l.clearcoatNormalMapTransform),l.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===Jt&&l.clearcoatNormalScale.value.negate())),h.dispersion>0&&(l.dispersion.value=h.dispersion),h.iridescence>0&&(l.iridescence.value=h.iridescence,l.iridescenceIOR.value=h.iridescenceIOR,l.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],l.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(l.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,l.iridescenceMapTransform)),h.iridescenceThicknessMap&&(l.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,l.iridescenceThicknessMapTransform))),h.transmission>0&&(l.transmission.value=h.transmission,l.transmissionSamplerMap.value=u.texture,l.transmissionSamplerSize.value.set(u.width,u.height),h.transmissionMap&&(l.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,l.transmissionMapTransform)),l.thickness.value=h.thickness,h.thicknessMap&&(l.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,l.thicknessMapTransform)),l.attenuationDistance.value=h.attenuationDistance,l.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(l.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(l.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,l.anisotropyMapTransform))),l.specularIntensity.value=h.specularIntensity,l.specularColor.value.copy(h.specularColor),h.specularColorMap&&(l.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,l.specularColorMapTransform)),h.specularIntensityMap&&(l.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,l.specularIntensityMapTransform))})(r,s,c)):s.isMeshMatcapMaterial?(n(r,s),(function(l,h){h.matcap&&(l.matcap.value=h.matcap)})(r,s)):s.isMeshDepthMaterial?n(r,s):s.isMeshDistanceMaterial?(n(r,s),(function(l,h){let u=e.get(h).light;l.referencePosition.value.setFromMatrixPosition(u.matrixWorld),l.nearDistance.value=u.shadow.camera.near,l.farDistance.value=u.shadow.camera.far})(r,s)):s.isMeshNormalMaterial?n(r,s):s.isLineBasicMaterial?((function(l,h){l.diffuse.value.copy(h.color),l.opacity.value=h.opacity,h.map&&(l.map.value=h.map,t(h.map,l.mapTransform))})(r,s),s.isLineDashedMaterial&&(function(l,h){l.dashSize.value=h.dashSize,l.totalSize.value=h.dashSize+h.gapSize,l.scale.value=h.scale})(r,s)):s.isPointsMaterial?(function(l,h,u,p){l.diffuse.value.copy(h.color),l.opacity.value=h.opacity,l.size.value=h.size*u,l.scale.value=.5*p,h.map&&(l.map.value=h.map,t(h.map,l.uvTransform)),h.alphaMap&&(l.alphaMap.value=h.alphaMap,t(h.alphaMap,l.alphaMapTransform)),h.alphaTest>0&&(l.alphaTest.value=h.alphaTest)})(r,s,a,o):s.isSpriteMaterial?(function(l,h){l.diffuse.value.copy(h.color),l.opacity.value=h.opacity,l.rotation.value=h.rotation,h.map&&(l.map.value=h.map,t(h.map,l.mapTransform)),h.alphaMap&&(l.alphaMap.value=h.alphaMap,t(h.alphaMap,l.alphaMapTransform)),h.alphaTest>0&&(l.alphaTest.value=h.alphaTest)})(r,s):s.isShadowMaterial?(r.color.value.copy(s.color),r.opacity.value=s.opacity):s.isShaderMaterial&&(s.uniformsNeedUpdate=!1)}}}function yg(i,e,t,n){let r={},s={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(p,d,f,m){if((function(_,g,v,x){let b=_.value,S=g+"_"+v;if(x[S]===void 0)return typeof b=="number"||typeof b=="boolean"?x[S]=b:ArrayBuffer.isView(b)?x[S]=b.slice():x[S]=b.clone(),!0;{let y=x[S];if(typeof b=="number"||typeof b=="boolean"){if(y!==b)return x[S]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(y.equals(b)===!1)return y.copy(b),!0}}return!1})(p,d,f,m)===!0){let _=p.__offset,g=p.value;if(Array.isArray(g)){let v=0;for(let x=0;x<g.length;x++){let b=g[x],S=h(b);l(b,p.__data,v),typeof b=="number"||typeof b=="boolean"||b.isMatrix3||ArrayBuffer.isView(b)||(v+=S.storage/Float32Array.BYTES_PER_ELEMENT)}}else l(g,p.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,_,p.__data)}}function l(p,d,f){typeof p=="number"||typeof p=="boolean"?d[0]=p:p.isMatrix3?(d[0]=p.elements[0],d[1]=p.elements[1],d[2]=p.elements[2],d[3]=0,d[4]=p.elements[3],d[5]=p.elements[4],d[6]=p.elements[5],d[7]=0,d[8]=p.elements[6],d[9]=p.elements[7],d[10]=p.elements[8],d[11]=0):ArrayBuffer.isView(p)?d.set(new p.constructor(p.buffer,p.byteOffset,d.length)):p.toArray(d,f)}function h(p){let d={boundary:0,storage:0};return typeof p=="number"||typeof p=="boolean"?(d.boundary=4,d.storage=4):p.isVector2?(d.boundary=8,d.storage=8):p.isVector3||p.isColor?(d.boundary=16,d.storage=12):p.isVector4?(d.boundary=16,d.storage=16):p.isMatrix3?(d.boundary=48,d.storage=48):p.isMatrix4?(d.boundary=64,d.storage=64):p.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(p)?(d.boundary=16,d.storage=p.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",p),d}function u(p){let d=p.target;d.removeEventListener("dispose",u);let f=a.indexOf(d.__bindingPointIndex);a.splice(f,1),i.deleteBuffer(r[d.id]),delete r[d.id],delete s[d.id]}return{bind:function(p,d){let f=d.program;n.uniformBlockBinding(p,f)},update:function(p,d){let f=r[p.id];f===void 0&&((function(g){let v=g.uniforms,x=0,b=16;for(let y=0,P=v.length;y<P;y++){let F=Array.isArray(v[y])?v[y]:[v[y]];for(let L=0,D=F.length;L<D;L++){let O=F[L],N=Array.isArray(O.value)?O.value:[O.value];for(let H=0,X=N.length;H<X;H++){let k=h(N[H]),Z=x%b,j=Z%k.boundary,te=Z+j;x+=j,te!==0&&b-te<k.storage&&(x+=b-te),O.__data=new Float32Array(k.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=x,x+=k.storage}}}let S=x%b;S>0&&(x+=b-S),g.__size=x,g.__cache={}})(p),f=(function(g){let v=(function(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return Re("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0})();g.__bindingPointIndex=v;let x=i.createBuffer(),b=g.__size,S=g.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,b,S),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,v,x),x})(p),r[p.id]=f,p.addEventListener("dispose",u));let m=d.program;n.updateUBOMapping(p,m);let _=e.render.frame;s[p.id]!==_&&((function(g){let v=r[g.id],x=g.uniforms,b=g.__cache;i.bindBuffer(i.UNIFORM_BUFFER,v);for(let S=0,y=x.length;S<y;S++){let P=x[S];if(Array.isArray(P))for(let F=0,L=P.length;F<L;F++)c(P[F],S,F,b);else c(P,S,0,b)}i.bindBuffer(i.UNIFORM_BUFFER,null)})(p),s[p.id]=_)},dispose:function(){for(let p in r)i.deleteBuffer(r[p]);a=[],r={},s={}}}}_p.set(-1,0,0,0,1,0,0,0,1);var xg=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Wn=null,js=class{constructor(e={}){let{canvas:t=Nd(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:p=!1,outputBufferType:d=on}=e,f;if(this.isWebGLRenderer=!0,n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;let m=d,_=new Set([Cc,Ac,zo]),g=new Set([on,ai,Vr,Hr,Fo,Oo]),v=new Uint32Array(4),x=new Int32Array(4),b=new C,S=null,y=null,P=[],F=[],L=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=An,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let D=this,O=!1,N=null,H=null,X=null,k=null;this._outputColorSpace=zt;let Z=0,j=0,te=null,fe=-1,we=null,ye=new it,Me=new it,re=null,de=new xe(0),ce=0,ve=t.width,ke=t.height,ee=1,I=null,T=null,R=new it(0,0,ve,ke),z=new it(0,0,ve,ke),M=!1,B=new ri,U=!1,A=!1,W=new Oe,q=new C,J=new it,ae={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Se=!1;function be(){return te===null?ee:1}let pe,Le,ne,oe,se,ge,st,Ke,gt,Wt,Ee,tt,We,It,at,St,pt,hn,yn,Ri,Ln,li,ua,G=n;function eu(w,V){return t.getContext(w,V)}try{let w={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"185"}`),t.addEventListener("webglcontextlost",nu,!1),t.addEventListener("webglcontextrestored",iu,!1),t.addEventListener("webglcontextcreationerror",ru,!1),G===null){let V="webgl2";if(G=eu(V,w),G===null)throw eu(V)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(w){throw Re("WebGLRenderer: "+w.message),w}function tu(){pe=new jm(G),pe.init(),Ln=new gg(G,pe),Le=new Vm(G,pe,e,Ln),ne=new mg(G,pe),Le.reversedDepthBuffer&&p&&ne.buffers.depth.setReversed(!0),H=G.createFramebuffer(),X=G.createFramebuffer(),k=G.createFramebuffer(),oe=new Zm(G),se=new ig,ge=new fg(G,pe,ne,se,Le,Ln,oe),st=new Xm(D),Ke=new Om(G),li=new Gm(G,Ke),gt=new qm(G,Ke,oe,li),Wt=new $m(G,gt,Ke,li,oe),hn=new Jm(G,Le,ge),at=new Hm(se),Ee=new ng(D,st,pe,Le,li,at),tt=new _g(D,se),We=new sg,It=new hg(pe),pt=new zm(D,st,ne,Wt,f,c),St=new pg(D,Wt,Le),ua=new yg(G,oe,Le,ne),yn=new km(G,pe,oe),Ri=new Ym(G,pe,oe),oe.programs=Ee.programs,D.capabilities=Le,D.extensions=pe,D.properties=se,D.renderLists=We,D.shadowMap=St,D.state=ne,D.info=oe}tu(),m!==on&&(L=new Qm(m,t.width,t.height,o,r,s));let vt=new Dh(D,G);function nu(w){w.preventDefault(),lh("WebGLRenderer: Context Lost."),O=!0}function iu(){lh("WebGLRenderer: Context Restored."),O=!1;let w=oe.autoReset,V=St.enabled,Y=St.autoUpdate,K=St.needsUpdate,$=St.type;tu(),oe.autoReset=w,St.enabled=V,St.autoUpdate=Y,St.needsUpdate=K,St.type=$}function ru(w){Re("WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function su(w){let V=w.target;V.removeEventListener("dispose",su),(function(Y){(function(K){let $=se.get(K).programs;$!==void 0&&($.forEach(function(le){Ee.releaseProgram(le)}),K.isShaderMaterial&&Ee.releaseShaderCache(K))})(Y),se.remove(Y)})(V)}function au(w,V,Y){w.transparent===!0&&w.side===kn&&w.forceSinglePass===!1?(w.side=Jt,w.needsUpdate=!0,pa(w,V,Y),w.side=Br,w.needsUpdate=!0,pa(w,V,Y),w.side=kn):pa(w,V,Y)}this.xr=vt,this.getContext=function(){return G},this.getContextAttributes=function(){return G.getContextAttributes()},this.forceContextLoss=function(){let w=pe.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){let w=pe.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return ee},this.setPixelRatio=function(w){w!==void 0&&(ee=w,this.setSize(ve,ke,!1))},this.getSize=function(w){return w.set(ve,ke)},this.setSize=function(w,V,Y=!0){vt.isPresenting?Ae("WebGLRenderer: Can't change size while VR device is presenting."):(ve=w,ke=V,t.width=Math.floor(w*ee),t.height=Math.floor(V*ee),Y===!0&&(t.style.width=w+"px",t.style.height=V+"px"),L!==null&&L.setSize(t.width,t.height),this.setViewport(0,0,w,V))},this.getDrawingBufferSize=function(w){return w.set(ve*ee,ke*ee).floor()},this.setDrawingBufferSize=function(w,V,Y){ve=w,ke=V,ee=Y,t.width=Math.floor(w*Y),t.height=Math.floor(V*Y),this.setViewport(0,0,w,V)},this.setEffects=function(w){if(m!==on){if(w){for(let V=0;V<w.length;V++)if(w[V].isOutputPass===!0){Ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}L.setEffects(w||[])}else Re("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.")},this.getCurrentViewport=function(w){return w.copy(ye)},this.getViewport=function(w){return w.copy(R)},this.setViewport=function(w,V,Y,K){w.isVector4?R.set(w.x,w.y,w.z,w.w):R.set(w,V,Y,K),ne.viewport(ye.copy(R).multiplyScalar(ee).round())},this.getScissor=function(w){return w.copy(z)},this.setScissor=function(w,V,Y,K){w.isVector4?z.set(w.x,w.y,w.z,w.w):z.set(w,V,Y,K),ne.scissor(Me.copy(z).multiplyScalar(ee).round())},this.getScissorTest=function(){return M},this.setScissorTest=function(w){ne.setScissorTest(M=w)},this.setOpaqueSort=function(w){I=w},this.setTransparentSort=function(w){T=w},this.getClearColor=function(w){return w.copy(pt.getClearColor())},this.setClearColor=function(){pt.setClearColor(...arguments)},this.getClearAlpha=function(){return pt.getClearAlpha()},this.setClearAlpha=function(){pt.setClearAlpha(...arguments)},this.clear=function(w=!0,V=!0,Y=!0){let K=0;if(w){let $=!1;if(te!==null){let le=te.texture.format;$=_.has(le)}if($){let le=te.texture.type,me=g.has(le),_e=pt.getClearColor(),Te=pt.getClearAlpha(),De=_e.r,qe=_e.g,Ze=_e.b;me?(v[0]=De,v[1]=qe,v[2]=Ze,v[3]=Te,G.clearBufferuiv(G.COLOR,0,v)):(x[0]=De,x[1]=qe,x[2]=Ze,x[3]=Te,G.clearBufferiv(G.COLOR,0,x))}else K|=G.COLOR_BUFFER_BIT}V&&(K|=G.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Y&&(K|=G.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),K!==0&&G.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(w){w.setRenderer(this),N=w},this.dispose=function(){t.removeEventListener("webglcontextlost",nu,!1),t.removeEventListener("webglcontextrestored",iu,!1),t.removeEventListener("webglcontextcreationerror",ru,!1),pt.dispose(),We.dispose(),It.dispose(),se.dispose(),st.dispose(),Wt.dispose(),li.dispose(),ua.dispose(),Ee.dispose(),vt.dispose(),vt.removeEventListener("sessionstart",ou),vt.removeEventListener("sessionend",lu),Pi.stop()},this.renderBufferDirect=function(w,V,Y,K,$,le){V===null&&(V=ae);let me=$.isMesh&&$.matrixWorld.determinantAffine()<0,_e=(function(Xe,ht,Lt,Ne,Ge){ht.isScene!==!0&&(ht=ae),ge.resetTextureUnits();let xn=ht.fog,ul=Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial||Ne.isMeshPhongMaterial?ht.environment:null,ma=te===null?D.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:je.workingColorSpace,es=Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial&&!Ne.envMap||Ne.isMeshPhongMaterial&&!Ne.envMap,Dn=st.get(Ne.envMap||ul,es),tr=Ne.vertexColors===!0&&!!Lt.attributes.color&&Lt.attributes.color.itemSize===4,Yn=!!Lt.attributes.tangent&&(!!Ne.normalMap||Ne.anisotropy>0),dl=!!Lt.morphAttributes.position,nr=!!Lt.morphAttributes.normal,Kp=!!Lt.morphAttributes.color,mu=An;Ne.toneMapped&&(te!==null&&te.isXRRenderTarget!==!0||(mu=D.toneMapping));let fu=Lt.morphAttributes.position||Lt.morphAttributes.normal||Lt.morphAttributes.color,Qp=fu!==void 0?fu.length:0,Fe=se.get(Ne),Ii=y.state.lights;if(U===!0&&(A===!0||Xe!==we)){let yt=Xe===we&&Ne.id===fe;at.setState(Ne,Xe,yt)}let Mn=!1;Ne.version===Fe.__version?Fe.needsLights&&Fe.lightsStateVersion!==Ii.state.version||Fe.outputColorSpace!==ma||Ge.isBatchedMesh&&Fe.batching===!1?Mn=!0:Ge.isBatchedMesh||Fe.batching!==!0?Ge.isBatchedMesh&&Fe.batchingColor===!0&&Ge.colorTexture===null||Ge.isBatchedMesh&&Fe.batchingColor===!1&&Ge.colorTexture!==null||Ge.isInstancedMesh&&Fe.instancing===!1?Mn=!0:Ge.isInstancedMesh||Fe.instancing!==!0?Ge.isSkinnedMesh&&Fe.skinning===!1?Mn=!0:Ge.isSkinnedMesh||Fe.skinning!==!0?Ge.isInstancedMesh&&Fe.instancingColor===!0&&Ge.instanceColor===null||Ge.isInstancedMesh&&Fe.instancingColor===!1&&Ge.instanceColor!==null||Ge.isInstancedMesh&&Fe.instancingMorph===!0&&Ge.morphTexture===null||Ge.isInstancedMesh&&Fe.instancingMorph===!1&&Ge.morphTexture!==null||Fe.envMap!==Dn||Ne.fog===!0&&Fe.fog!==xn?Mn=!0:Fe.numClippingPlanes===void 0||Fe.numClippingPlanes===at.numPlanes&&Fe.numIntersection===at.numIntersection?(Fe.vertexAlphas!==tr||Fe.vertexTangents!==Yn||Fe.morphTargets!==dl||Fe.morphNormals!==nr||Fe.morphColors!==Kp||Fe.toneMapping!==mu||Fe.morphTargetsCount!==Qp||!!Fe.lightProbeGrid!=y.state.lightProbeGridArray.length>0)&&(Mn=!0):Mn=!0:Mn=!0:Mn=!0:Mn=!0:(Mn=!0,Fe.__version=Ne.version);let ci=Fe.currentProgram;Mn===!0&&(ci=pa(Ne,ht,Ge),N&&Ne.isNodeMaterial&&N.onUpdateProgram(Ne,ci,Fe));let gu=!1,ir=!1,pl=!1,ut=ci.getUniforms(),un=Fe.uniforms;if(ne.useProgram(ci.program)&&(gu=!0,ir=!0,pl=!0),Ne.id!==fe&&(fe=Ne.id,ir=!0),Fe.needsLights){let yt=(function(Un,fl){if(Un.length===0)return null;if(Un.length===1)return Un[0].texture!==null?Un[0]:null;b.setFromMatrixPosition(fl.matrixWorld);for(let rr=0,em=Un.length;rr<em;rr++){let gl=Un[rr];if(gl.texture!==null&&gl.boundingBox.containsPoint(b))return gl}return null})(y.state.lightProbeGridArray,Ge);Fe.lightProbeGrid!==yt&&(Fe.lightProbeGrid=yt,ir=!0)}if(gu||we!==Xe){ne.buffers.depth.getReversed()&&Xe.reversedDepth!==!0&&(Xe._reversedDepth=!0,Xe.updateProjectionMatrix()),ut.setValue(G,"projectionMatrix",Xe.projectionMatrix),ut.setValue(G,"viewMatrix",Xe.matrixWorldInverse);let yt=ut.map.cameraPosition;yt!==void 0&&yt.setValue(G,q.setFromMatrixPosition(Xe.matrixWorld)),Le.logarithmicDepthBuffer&&ut.setValue(G,"logDepthBufFC",2/(Math.log(Xe.far+1)/Math.LN2)),(Ne.isMeshPhongMaterial||Ne.isMeshToonMaterial||Ne.isMeshLambertMaterial||Ne.isMeshBasicMaterial||Ne.isMeshStandardMaterial||Ne.isShaderMaterial)&&ut.setValue(G,"isOrthographic",Xe.isOrthographicCamera===!0),we!==Xe&&(we=Xe,ir=!0,pl=!0)}if(Fe.needsLights&&(Ii.state.directionalShadowMap.length>0&&ut.setValue(G,"directionalShadowMap",Ii.state.directionalShadowMap,ge),Ii.state.spotShadowMap.length>0&&ut.setValue(G,"spotShadowMap",Ii.state.spotShadowMap,ge),Ii.state.pointShadowMap.length>0&&ut.setValue(G,"pointShadowMap",Ii.state.pointShadowMap,ge)),Ge.isSkinnedMesh){ut.setOptional(G,Ge,"bindMatrix"),ut.setOptional(G,Ge,"bindMatrixInverse");let yt=Ge.skeleton;yt&&(yt.boneTexture===null&&yt.computeBoneTexture(),ut.setValue(G,"boneTexture",yt.boneTexture,ge))}Ge.isBatchedMesh&&(ut.setOptional(G,Ge,"batchingTexture"),ut.setValue(G,"batchingTexture",Ge._matricesTexture,ge),ut.setOptional(G,Ge,"batchingIdTexture"),ut.setValue(G,"batchingIdTexture",Ge._indirectTexture,ge),ut.setOptional(G,Ge,"batchingColorTexture"),Ge._colorsTexture!==null&&ut.setValue(G,"batchingColorTexture",Ge._colorsTexture,ge));let ml=Lt.morphAttributes;if(ml.position===void 0&&ml.normal===void 0&&ml.color===void 0||hn.update(Ge,Lt,ci),(ir||Fe.receiveShadow!==Ge.receiveShadow)&&(Fe.receiveShadow=Ge.receiveShadow,ut.setValue(G,"receiveShadow",Ge.receiveShadow)),(Ne.isMeshStandardMaterial||Ne.isMeshLambertMaterial||Ne.isMeshPhongMaterial)&&Ne.envMap===null&&ht.environment!==null&&(un.envMapIntensity.value=ht.environmentIntensity),un.dfgLUT!==void 0&&(un.dfgLUT.value=(Wn===null&&(Wn=new ys(xg,16,16,ji,Hn),Wn.name="DFG_LUT",Wn.minFilter=kt,Wn.magFilter=kt,Wn.wrapS=_i,Wn.wrapT=_i,Wn.generateMipmaps=!1,Wn.needsUpdate=!0),Wn)),ir){if(ut.setValue(G,"toneMappingExposure",D.toneMappingExposure),Fe.needsLights&&(Sn=pl,(Nn=un).ambientLightColor.needsUpdate=Sn,Nn.lightProbe.needsUpdate=Sn,Nn.directionalLights.needsUpdate=Sn,Nn.directionalLightShadows.needsUpdate=Sn,Nn.pointLights.needsUpdate=Sn,Nn.pointLightShadows.needsUpdate=Sn,Nn.spotLights.needsUpdate=Sn,Nn.spotLightShadows.needsUpdate=Sn,Nn.rectAreaLights.needsUpdate=Sn,Nn.hemisphereLights.needsUpdate=Sn),xn&&Ne.fog===!0&&tt.refreshFogUniforms(un,xn),tt.refreshMaterialUniforms(un,Ne,ee,ke,y.state.transmissionRenderTarget[Xe.id]),Fe.needsLights&&Fe.lightProbeGrid){let yt=Fe.lightProbeGrid;un.probesSH.value=yt.texture,un.probesMin.value.copy(yt.boundingBox.min),un.probesMax.value.copy(yt.boundingBox.max),un.probesResolution.value.copy(yt.resolution)}Xr.upload(G,du(Fe),un,ge)}var Nn,Sn;if(Ne.isShaderMaterial&&Ne.uniformsNeedUpdate===!0&&(Xr.upload(G,du(Fe),un,ge),Ne.uniformsNeedUpdate=!1),Ne.isSpriteMaterial&&ut.setValue(G,"center",Ge.center),ut.setValue(G,"modelViewMatrix",Ge.modelViewMatrix),ut.setValue(G,"normalMatrix",Ge.normalMatrix),ut.setValue(G,"modelMatrix",Ge.matrixWorld),Ne.uniformsGroups!==void 0){let yt=Ne.uniformsGroups;for(let Un=0,fl=yt.length;Un<fl;Un++){let rr=yt[Un];ua.update(rr,ci),ua.bind(rr,ci)}}return ci})(w,V,Y,K,$);ne.setMaterial(K,me);let Te=Y.index,De=1;if(K.wireframe===!0){if(Te=gt.getWireframeAttribute(Y),Te===void 0)return;De=2}let qe=Y.drawRange,Ze=Y.attributes.position,Ie=qe.start*De,Je=(qe.start+qe.count)*De;le!==null&&(Ie=Math.max(Ie,le.start*De),Je=Math.min(Je,(le.start+le.count)*De)),Te!==null?(Ie=Math.max(Ie,0),Je=Math.min(Je,Te.count)):Ze!=null&&(Ie=Math.max(Ie,0),Je=Math.min(Je,Ze.count));let bt=Je-Ie;if(bt<0||bt===1/0)return;let _t;li.setup($,K,_e,Y,Te);let ct=yn;if(Te!==null&&(_t=Ke.get(Te),ct=Ri,ct.setIndex(_t)),$.isMesh)K.wireframe===!0?(ne.setLineWidth(K.wireframeLinewidth*be()),ct.setMode(G.LINES)):ct.setMode(G.TRIANGLES);else if($.isLine){let Xe=K.linewidth;Xe===void 0&&(Xe=1),ne.setLineWidth(Xe*be()),$.isLineSegments?ct.setMode(G.LINES):$.isLineLoop?ct.setMode(G.LINE_LOOP):ct.setMode(G.LINE_STRIP)}else $.isPoints?ct.setMode(G.POINTS):$.isSprite&&ct.setMode(G.TRIANGLES);if($.isBatchedMesh)if(pe.get("WEBGL_multi_draw"))ct.renderMultiDraw($._multiDrawStarts,$._multiDrawCounts,$._multiDrawCount);else{let Xe=$._multiDrawStarts,ht=$._multiDrawCounts,Lt=$._multiDrawCount,Ne=Te?Ke.get(Te).bytesPerElement:1,Ge=se.get(K).currentProgram.getUniforms();for(let xn=0;xn<Lt;xn++)Ge.setValue(G,"_gl_DrawID",xn),ct.render(Xe[xn]/Ne,ht[xn])}else if($.isInstancedMesh)ct.renderInstances(Ie,bt,$.count);else if(Y.isInstancedBufferGeometry){let Xe=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,ht=Math.min(Y.instanceCount,Xe);ct.renderInstances(Ie,bt,ht)}else ct.render(Ie,bt)},this.compile=function(w,V,Y=null){Y===null&&(Y=w),y=It.get(Y),y.init(V),F.push(y),Y.traverseVisible(function($){$.isLight&&$.layers.test(V.layers)&&(y.pushLight($),$.castShadow&&y.pushShadow($))}),w!==Y&&w.traverseVisible(function($){$.isLight&&$.layers.test(V.layers)&&(y.pushLight($),$.castShadow&&y.pushShadow($))}),y.setupLights();let K=new Set;return w.traverse(function($){if(!($.isMesh||$.isPoints||$.isLine||$.isSprite))return;let le=$.material;if(le)if(Array.isArray(le))for(let me=0;me<le.length;me++){let _e=le[me];au(_e,Y,$),K.add(_e)}else au(le,Y,$),K.add(le)}),y=F.pop(),K},this.compileAsync=function(w,V,Y=null){let K=this.compile(w,V,Y);return new Promise($=>{function le(){K.forEach(function(me){se.get(me).currentProgram.isReady()&&K.delete(me)}),K.size!==0?setTimeout(le,10):$(w)}pe.get("KHR_parallel_shader_compile")!==null?le():setTimeout(le,10)})};let cl=null;function ou(){Pi.stop()}function lu(){Pi.start()}let Pi=new dp;function hl(w,V,Y,K){if(w.visible===!1)return;if(w.layers.test(V.layers)){if(w.isGroup)Y=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(V);else if(w.isLightProbeGrid)y.pushLightProbeGrid(w);else if(w.isLight)y.pushLight(w),w.castShadow&&y.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||B.intersectsSprite(w)){K&&J.setFromMatrixPosition(w.matrixWorld).applyMatrix4(W);let le=Wt.update(w),me=w.material;me.visible&&S.push(w,le,me,Y,J.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||B.intersectsObject(w))){let le=Wt.update(w),me=w.material;if(K&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),J.copy(w.boundingSphere.center)):(le.boundingSphere===null&&le.computeBoundingSphere(),J.copy(le.boundingSphere.center)),J.applyMatrix4(w.matrixWorld).applyMatrix4(W)),Array.isArray(me)){let _e=le.groups;for(let Te=0,De=_e.length;Te<De;Te++){let qe=_e[Te],Ze=me[qe.materialIndex];Ze&&Ze.visible&&S.push(w,le,Ze,Y,J.z,qe)}}else me.visible&&S.push(w,le,me,Y,J.z,null)}}let $=w.children;for(let le=0,me=$.length;le<me;le++)hl($[le],V,Y,K)}function cu(w,V,Y,K){let{opaque:$,transmissive:le,transparent:me}=w;y.setupLightsView(Y),U===!0&&at.setGlobalState(D.clippingPlanes,Y),K&&ne.viewport(ye.copy(K)),$.length>0&&da($,V,Y),le.length>0&&da(le,V,Y),me.length>0&&da(me,V,Y),ne.buffers.depth.setTest(!0),ne.buffers.depth.setMask(!0),ne.buffers.color.setMask(!0),ne.setPolygonOffset(!1)}function hu(w,V,Y,K){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;if(y.state.transmissionRenderTarget[K.id]===void 0){let Ze=pe.has("EXT_color_buffer_half_float")||pe.has("EXT_color_buffer_float");y.state.transmissionRenderTarget[K.id]=new tn(1,1,{generateMipmaps:!0,type:Ze?Hn:on,minFilter:Wi,samples:Math.max(4,Le.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:je.workingColorSpace})}let $=y.state.transmissionRenderTarget[K.id],le=K.viewport||ye;$.setSize(le.z*D.transmissionResolutionScale,le.w*D.transmissionResolutionScale);let me=D.getRenderTarget(),_e=D.getActiveCubeFace(),Te=D.getActiveMipmapLevel();D.setRenderTarget($),D.getClearColor(de),ce=D.getClearAlpha(),ce<1&&D.setClearColor(16777215,.5),D.clear(),Se&&pt.render(Y);let De=D.toneMapping;D.toneMapping=An;let qe=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),y.setupLightsView(K),U===!0&&at.setGlobalState(D.clippingPlanes,K),da(w,Y,K),ge.updateMultisampleRenderTarget($),ge.updateRenderTargetMipmap($),pe.has("WEBGL_multisampled_render_to_texture")===!1){let Ze=!1;for(let Ie=0,Je=V.length;Ie<Je;Ie++){let bt=V[Ie],{object:_t,geometry:ct,material:Xe,group:ht}=bt;if(Xe.side===kn&&_t.layers.test(K.layers)){let Lt=Xe.side;Xe.side=Jt,Xe.needsUpdate=!0,uu(_t,Y,K,ct,Xe,ht),Xe.side=Lt,Xe.needsUpdate=!0,Ze=!0}}Ze===!0&&(ge.updateMultisampleRenderTarget($),ge.updateRenderTargetMipmap($))}D.setRenderTarget(me,_e,Te),D.setClearColor(de,ce),qe!==void 0&&(K.viewport=qe),D.toneMapping=De}function da(w,V,Y){let K=V.isScene===!0?V.overrideMaterial:null;for(let $=0,le=w.length;$<le;$++){let me=w[$],{object:_e,geometry:Te,group:De}=me,qe=me.material;qe.allowOverride===!0&&K!==null&&(qe=K),_e.layers.test(Y.layers)&&uu(_e,V,Y,Te,qe,De)}}function uu(w,V,Y,K,$,le){w.onBeforeRender(D,V,Y,K,$,le),w.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),$.onBeforeRender(D,V,Y,K,w,le),$.transparent===!0&&$.side===kn&&$.forceSinglePass===!1?($.side=Jt,$.needsUpdate=!0,D.renderBufferDirect(Y,V,K,$,w,le),$.side=Br,$.needsUpdate=!0,D.renderBufferDirect(Y,V,K,$,w,le),$.side=kn):D.renderBufferDirect(Y,V,K,$,w,le),w.onAfterRender(D,V,Y,K,$,le)}function pa(w,V,Y){V.isScene!==!0&&(V=ae);let K=se.get(w),$=y.state.lights,le=y.state.shadowsArray,me=$.state.version,_e=Ee.getParameters(w,$.state,le,V,Y,y.state.lightProbeGridArray),Te=Ee.getProgramCacheKey(_e),De=K.programs;K.environment=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?V.environment:null,K.fog=V.fog;let qe=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap;K.envMap=st.get(w.envMap||K.environment,qe),K.envMapRotation=K.environment!==null&&w.envMap===null?V.environmentRotation:w.envMapRotation,De===void 0&&(w.addEventListener("dispose",su),De=new Map,K.programs=De);let Ze=De.get(Te);if(Ze!==void 0){if(K.currentProgram===Ze&&K.lightsStateVersion===me)return pu(w,_e),Ze}else _e.uniforms=Ee.getUniforms(w),N!==null&&w.isNodeMaterial&&N.build(w,Y,_e),w.onBeforeCompile(_e,D),Ze=Ee.acquireProgram(_e,Te),De.set(Te,Ze),K.uniforms=_e.uniforms;let Ie=K.uniforms;return(w.isShaderMaterial||w.isRawShaderMaterial)&&w.clipping!==!0||(Ie.clippingPlanes=at.uniform),pu(w,_e),K.needsLights=(function(Je){return Je.isMeshLambertMaterial||Je.isMeshToonMaterial||Je.isMeshPhongMaterial||Je.isMeshStandardMaterial||Je.isShadowMaterial||Je.isShaderMaterial&&Je.lights===!0})(w),K.lightsStateVersion=me,K.needsLights&&(Ie.ambientLightColor.value=$.state.ambient,Ie.lightProbe.value=$.state.probe,Ie.directionalLights.value=$.state.directional,Ie.directionalLightShadows.value=$.state.directionalShadow,Ie.spotLights.value=$.state.spot,Ie.spotLightShadows.value=$.state.spotShadow,Ie.rectAreaLights.value=$.state.rectArea,Ie.ltc_1.value=$.state.rectAreaLTC1,Ie.ltc_2.value=$.state.rectAreaLTC2,Ie.pointLights.value=$.state.point,Ie.pointLightShadows.value=$.state.pointShadow,Ie.hemisphereLights.value=$.state.hemi,Ie.directionalShadowMatrix.value=$.state.directionalShadowMatrix,Ie.spotLightMatrix.value=$.state.spotLightMatrix,Ie.spotLightMap.value=$.state.spotLightMap,Ie.pointShadowMatrix.value=$.state.pointShadowMatrix),K.lightProbeGrid=y.state.lightProbeGridArray.length>0,K.currentProgram=Ze,K.uniformsList=null,Ze}function du(w){if(w.uniformsList===null){let V=w.currentProgram.getUniforms();w.uniformsList=Xr.seqWithValue(V.seq,w.uniforms)}return w.uniformsList}function pu(w,V){let Y=se.get(w);Y.outputColorSpace=V.outputColorSpace,Y.batching=V.batching,Y.batchingColor=V.batchingColor,Y.instancing=V.instancing,Y.instancingColor=V.instancingColor,Y.instancingMorph=V.instancingMorph,Y.skinning=V.skinning,Y.morphTargets=V.morphTargets,Y.morphNormals=V.morphNormals,Y.morphColors=V.morphColors,Y.morphTargetsCount=V.morphTargetsCount,Y.numClippingPlanes=V.numClippingPlanes,Y.numIntersection=V.numClipIntersection,Y.vertexAlphas=V.vertexAlphas,Y.vertexTangents=V.vertexTangents,Y.toneMapping=V.toneMapping}Pi.setAnimationLoop(function(w){cl&&cl(w)}),typeof self<"u"&&Pi.setContext(self),this.setAnimationLoop=function(w){cl=w,vt.setAnimationLoop(w),w===null?Pi.stop():Pi.start()},vt.addEventListener("sessionstart",ou),vt.addEventListener("sessionend",lu),this.render=function(w,V){if(V!==void 0&&V.isCamera!==!0)return void Re("WebGLRenderer.render: camera is not an instance of THREE.Camera.");if(O===!0)return;N!==null&&N.renderStart(w,V);let Y=vt.enabled===!0&&vt.isPresenting===!0,K=L!==null&&(te===null||Y)&&L.begin(D,te);if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),V.parent===null&&V.matrixWorldAutoUpdate===!0&&V.updateMatrixWorld(),vt.enabled!==!0||vt.isPresenting!==!0||L!==null&&L.isCompositing()!==!1||(vt.cameraAutoUpdate===!0&&vt.updateCamera(V),V=vt.getCamera()),w.isScene===!0&&w.onBeforeRender(D,w,V,te),y=It.get(w,F.length),y.init(V),y.state.textureUnits=ge.getTextureUnits(),F.push(y),W.multiplyMatrices(V.projectionMatrix,V.matrixWorldInverse),B.setFromProjectionMatrix(W,ni,V.reversedDepth),A=this.localClippingEnabled,U=at.init(this.clippingPlanes,A),S=We.get(w,P.length),S.init(),P.push(S),vt.enabled===!0&&vt.isPresenting===!0){let le=D.xr.getDepthSensingMesh();le!==null&&hl(le,V,-1/0,D.sortObjects)}hl(w,V,0,D.sortObjects),S.finish(),D.sortObjects===!0&&S.sort(I,T,V.reversedDepth),Se=vt.enabled===!1||vt.isPresenting===!1||vt.hasDepthSensing()===!1,Se&&pt.addToRenderList(S,w),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),U===!0&&at.beginShadows();let $=y.state.shadowsArray;if(St.render($,w,V),U===!0&&at.endShadows(),(K&&L.hasRenderPass())===!1){let le=S.opaque,me=S.transmissive;if(y.setupLights(),V.isArrayCamera){let _e=V.cameras;if(me.length>0)for(let Te=0,De=_e.length;Te<De;Te++)hu(le,me,w,_e[Te]);Se&&pt.render(w);for(let Te=0,De=_e.length;Te<De;Te++){let qe=_e[Te];cu(S,w,qe,qe.viewport)}}else me.length>0&&hu(le,me,w,V),Se&&pt.render(w),cu(S,w,V)}te!==null&&j===0&&(ge.updateMultisampleRenderTarget(te),ge.updateRenderTargetMipmap(te)),K&&L.end(D),w.isScene===!0&&w.onAfterRender(D,w,V),li.resetDefaultState(),fe=-1,we=null,F.pop(),F.length>0?(y=F[F.length-1],ge.setTextureUnits(y.state.textureUnits),U===!0&&at.setGlobalState(D.clippingPlanes,y.state.camera)):y=null,P.pop(),S=P.length>0?P[P.length-1]:null,N!==null&&N.renderEnd()},this.getActiveCubeFace=function(){return Z},this.getActiveMipmapLevel=function(){return j},this.getRenderTarget=function(){return te},this.setRenderTargetTextures=function(w,V,Y){let K=se.get(w);K.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),se.get(w.texture).__webglTexture=V,se.get(w.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:Y,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,V){let Y=se.get(w);Y.__webglFramebuffer=V,Y.__useDefaultFramebuffer=V===void 0},this.setRenderTarget=function(w,V=0,Y=0){te=w,Z=V,j=Y;let K=null,$=!1,le=!1;if(w){let me=se.get(w);if(me.__useDefaultFramebuffer!==void 0)return ne.bindFramebuffer(G.FRAMEBUFFER,me.__webglFramebuffer),ye.copy(w.viewport),Me.copy(w.scissor),re=w.scissorTest,ne.viewport(ye),ne.scissor(Me),ne.setScissorTest(re),void(fe=-1);if(me.__webglFramebuffer===void 0)ge.setupRenderTarget(w);else if(me.__hasExternalTextures)ge.rebindTextures(w,se.get(w.texture).__webglTexture,se.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){let De=w.depthTexture;if(me.__boundDepthTexture!==De){if(De!==null&&se.has(De)&&(w.width!==De.image.width||w.height!==De.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(w)}}let _e=w.texture;(_e.isData3DTexture||_e.isDataArrayTexture||_e.isCompressedArrayTexture)&&(le=!0);let Te=se.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(K=Array.isArray(Te[V])?Te[V][Y]:Te[V],$=!0):K=w.samples>0&&ge.useMultisampledRTT(w)===!1?se.get(w).__webglMultisampledFramebuffer:Array.isArray(Te)?Te[Y]:Te,ye.copy(w.viewport),Me.copy(w.scissor),re=w.scissorTest}else ye.copy(R).multiplyScalar(ee).floor(),Me.copy(z).multiplyScalar(ee).floor(),re=M;if(Y!==0&&(K=H),ne.bindFramebuffer(G.FRAMEBUFFER,K)&&ne.drawBuffers(w,K),ne.viewport(ye),ne.scissor(Me),ne.setScissorTest(re),$){let me=se.get(w.texture);G.framebufferTexture2D(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_CUBE_MAP_POSITIVE_X+V,me.__webglTexture,Y)}else if(le){let me=V;for(let _e=0;_e<w.textures.length;_e++){let Te=se.get(w.textures[_e]);G.framebufferTextureLayer(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0+_e,Te.__webglTexture,Y,me)}}else if(w!==null&&Y!==0){let me=se.get(w.texture);G.framebufferTexture2D(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,me.__webglTexture,Y)}fe=-1},this.readRenderTargetPixels=function(w,V,Y,K,$,le,me,_e=0){if(!w||!w.isWebGLRenderTarget)return void Re("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Te=se.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&me!==void 0&&(Te=Te[me]),Te){ne.bindFramebuffer(G.FRAMEBUFFER,Te);try{let De=w.textures[_e],qe=De.format,Ze=De.type;if(w.textures.length>1&&G.readBuffer(G.COLOR_ATTACHMENT0+_e),!Le.textureFormatReadable(qe))return void Re("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");if(!Le.textureTypeReadable(Ze))return void Re("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");V>=0&&V<=w.width-K&&Y>=0&&Y<=w.height-$&&G.readPixels(V,Y,K,$,Ln.convert(qe),Ln.convert(Ze),le)}finally{let De=te!==null?se.get(te).__webglFramebuffer:null;ne.bindFramebuffer(G.FRAMEBUFFER,De)}}},this.readRenderTargetPixelsAsync=async function(w,V,Y,K,$,le,me,_e=0){if(!w||!w.isWebGLRenderTarget)throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Te=se.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&me!==void 0&&(Te=Te[me]),Te){if(V>=0&&V<=w.width-K&&Y>=0&&Y<=w.height-$){ne.bindFramebuffer(G.FRAMEBUFFER,Te);let De=w.textures[_e],qe=De.format,Ze=De.type;if(w.textures.length>1&&G.readBuffer(G.COLOR_ATTACHMENT0+_e),!Le.textureFormatReadable(qe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Le.textureTypeReadable(Ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ie=G.createBuffer();G.bindBuffer(G.PIXEL_PACK_BUFFER,Ie),G.bufferData(G.PIXEL_PACK_BUFFER,le.byteLength,G.STREAM_READ),G.readPixels(V,Y,K,$,Ln.convert(qe),Ln.convert(Ze),0);let Je=te!==null?se.get(te).__webglFramebuffer:null;ne.bindFramebuffer(G.FRAMEBUFFER,Je);let bt=G.fenceSync(G.SYNC_GPU_COMMANDS_COMPLETE,0);return G.flush(),await Fd(G,bt,4),G.bindBuffer(G.PIXEL_PACK_BUFFER,Ie),G.getBufferSubData(G.PIXEL_PACK_BUFFER,0,le),G.deleteBuffer(Ie),G.deleteSync(bt),le}throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(w,V=null,Y=0){let K=Math.pow(2,-Y),$=Math.floor(w.image.width*K),le=Math.floor(w.image.height*K),me=V!==null?V.x:0,_e=V!==null?V.y:0;ge.setTexture2D(w,0),G.copyTexSubImage2D(G.TEXTURE_2D,Y,0,0,me,_e,$,le),ne.unbindTexture()},this.copyTextureToTexture=function(w,V,Y=null,K=null,$=0,le=0){let me,_e,Te,De,qe,Ze,Ie,Je,bt,_t=w.isCompressedTexture?w.mipmaps[le]:w.image;if(Y!==null)me=Y.max.x-Y.min.x,_e=Y.max.y-Y.min.y,Te=Y.isBox3?Y.max.z-Y.min.z:1,De=Y.min.x,qe=Y.min.y,Ze=Y.isBox3?Y.min.z:0;else{let Dn=Math.pow(2,-$);me=Math.floor(_t.width*Dn),_e=Math.floor(_t.height*Dn),Te=w.isDataArrayTexture?_t.depth:w.isData3DTexture?Math.floor(_t.depth*Dn):1,De=0,qe=0,Ze=0}K!==null?(Ie=K.x,Je=K.y,bt=K.z):(Ie=0,Je=0,bt=0);let ct=Ln.convert(V.format),Xe=Ln.convert(V.type),ht;V.isData3DTexture?(ge.setTexture3D(V,0),ht=G.TEXTURE_3D):V.isDataArrayTexture||V.isCompressedArrayTexture?(ge.setTexture2DArray(V,0),ht=G.TEXTURE_2D_ARRAY):(ge.setTexture2D(V,0),ht=G.TEXTURE_2D),ne.activeTexture(G.TEXTURE0),ne.pixelStorei(G.UNPACK_FLIP_Y_WEBGL,V.flipY),ne.pixelStorei(G.UNPACK_PREMULTIPLY_ALPHA_WEBGL,V.premultiplyAlpha),ne.pixelStorei(G.UNPACK_ALIGNMENT,V.unpackAlignment);let Lt=ne.getParameter(G.UNPACK_ROW_LENGTH),Ne=ne.getParameter(G.UNPACK_IMAGE_HEIGHT),Ge=ne.getParameter(G.UNPACK_SKIP_PIXELS),xn=ne.getParameter(G.UNPACK_SKIP_ROWS),ul=ne.getParameter(G.UNPACK_SKIP_IMAGES);ne.pixelStorei(G.UNPACK_ROW_LENGTH,_t.width),ne.pixelStorei(G.UNPACK_IMAGE_HEIGHT,_t.height),ne.pixelStorei(G.UNPACK_SKIP_PIXELS,De),ne.pixelStorei(G.UNPACK_SKIP_ROWS,qe),ne.pixelStorei(G.UNPACK_SKIP_IMAGES,Ze);let ma=w.isDataArrayTexture||w.isData3DTexture,es=V.isDataArrayTexture||V.isData3DTexture;if(w.isDepthTexture){let Dn=se.get(w),tr=se.get(V),Yn=se.get(Dn.__renderTarget),dl=se.get(tr.__renderTarget);ne.bindFramebuffer(G.READ_FRAMEBUFFER,Yn.__webglFramebuffer),ne.bindFramebuffer(G.DRAW_FRAMEBUFFER,dl.__webglFramebuffer);for(let nr=0;nr<Te;nr++)ma&&(G.framebufferTextureLayer(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,se.get(w).__webglTexture,$,Ze+nr),G.framebufferTextureLayer(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,se.get(V).__webglTexture,le,bt+nr)),G.blitFramebuffer(De,qe,me,_e,Ie,Je,me,_e,G.DEPTH_BUFFER_BIT,G.NEAREST);ne.bindFramebuffer(G.READ_FRAMEBUFFER,null),ne.bindFramebuffer(G.DRAW_FRAMEBUFFER,null)}else if($!==0||w.isRenderTargetTexture||se.has(w)){let Dn=se.get(w),tr=se.get(V);ne.bindFramebuffer(G.READ_FRAMEBUFFER,X),ne.bindFramebuffer(G.DRAW_FRAMEBUFFER,k);for(let Yn=0;Yn<Te;Yn++)ma?G.framebufferTextureLayer(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,Dn.__webglTexture,$,Ze+Yn):G.framebufferTexture2D(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,Dn.__webglTexture,$),es?G.framebufferTextureLayer(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,tr.__webglTexture,le,bt+Yn):G.framebufferTexture2D(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,tr.__webglTexture,le),$!==0?G.blitFramebuffer(De,qe,me,_e,Ie,Je,me,_e,G.COLOR_BUFFER_BIT,G.NEAREST):es?G.copyTexSubImage3D(ht,le,Ie,Je,bt+Yn,De,qe,me,_e):G.copyTexSubImage2D(ht,le,Ie,Je,De,qe,me,_e);ne.bindFramebuffer(G.READ_FRAMEBUFFER,null),ne.bindFramebuffer(G.DRAW_FRAMEBUFFER,null)}else es?w.isDataTexture||w.isData3DTexture?G.texSubImage3D(ht,le,Ie,Je,bt,me,_e,Te,ct,Xe,_t.data):V.isCompressedArrayTexture?G.compressedTexSubImage3D(ht,le,Ie,Je,bt,me,_e,Te,ct,_t.data):G.texSubImage3D(ht,le,Ie,Je,bt,me,_e,Te,ct,Xe,_t):w.isDataTexture?G.texSubImage2D(G.TEXTURE_2D,le,Ie,Je,me,_e,ct,Xe,_t.data):w.isCompressedTexture?G.compressedTexSubImage2D(G.TEXTURE_2D,le,Ie,Je,_t.width,_t.height,ct,_t.data):G.texSubImage2D(G.TEXTURE_2D,le,Ie,Je,me,_e,ct,Xe,_t);ne.pixelStorei(G.UNPACK_ROW_LENGTH,Lt),ne.pixelStorei(G.UNPACK_IMAGE_HEIGHT,Ne),ne.pixelStorei(G.UNPACK_SKIP_PIXELS,Ge),ne.pixelStorei(G.UNPACK_SKIP_ROWS,xn),ne.pixelStorei(G.UNPACK_SKIP_IMAGES,ul),le===0&&V.generateMipmaps&&G.generateMipmap(ht),ne.unbindTexture()},this.initRenderTarget=function(w){se.get(w).__webglFramebuffer===void 0&&ge.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?ge.setTextureCube(w,0):w.isData3DTexture?ge.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?ge.setTexture2DArray(w,0):ge.setTexture2D(w,0),ne.unbindTexture()},this.resetState=function(){Z=0,j=0,te=null,ne.reset(),li.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ni}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=je._getDrawingBufferColorSpace(e),t.unpackColorSpace=je._getUnpackColorSpace()}};var Q=i=>document.querySelector(i),ln=i=>[...document.querySelectorAll(i)],{clamp:Rn,lerp:Js,smoothstep:Bh}=ch,nt=Math.PI*2,cn=[{name:"Verdara",biome:"Lush \xB7 Gentle",danger:1,color:"#68b976",blurb:"Rolling meadows and plenty of fruit. Most locals are curious, not hungry.",sky:10212810,nightSky:1518141,fog:12115408,nightFog:1782080,ground:5019740,accent:14217062,water:8378056,leaf:[6270549,7651426,5151306,8833371],trunk:6966580,rock:7373947,flowers:[16373102,16091805,13215231,16777215],tree:"round",predators:.12,hunger:1,dayLight:1},{name:"Emberune",biome:"Volcanic \xB7 Fierce",danger:3,color:"#e56d43",blurb:"Lava pools scorch the careless and predators hunt in the ash. Fortune favors the bold.",sky:9065033,nightSky:2363410,fog:9065546,nightFog:2757651,ground:7158051,accent:16753216,water:16734751,leaf:[12405049,13657146,10238512,14711356],trunk:3875616,rock:5718074,flowers:[16757575,16740419],tree:"spire",predators:.45,hunger:1.1,dayLight:.9,lava:!0},{name:"Lumora",biome:"Biolume \xB7 Strange",danger:2,color:"#5b70cf",blurb:"Endless twilight. Glowing fungi feed skittish, strange life that startles easily.",sky:2834552,nightSky:725040,fog:3296115,nightFog:1120826,ground:3229807,accent:7337168,water:7337168,leaf:[5494965,8052991,11635967,5494965],trunk:13620991,rock:4938374,flowers:[7337168,11635967,8052991],tree:"mushroom",glow:!0,predators:.28,hunger:1,dayLight:.55},{name:"Aridia",biome:"Desert \xB7 Sparse",danger:2,color:"#dcad5e",blurb:"Blazing dunes where hunger bites fast. The oasis is your lifeline.",sky:15253378,nightSky:2235706,fog:14068331,nightFog:2761792,ground:12158274,accent:14018920,water:6079446,leaf:[5737803,7052882,5210181],trunk:9071173,rock:10188104,flowers:[16748465,16765286],tree:"cactus",predators:.3,hunger:1.45,dayLight:1.05}],In={diet:[["Herbivore","\u{1F33F}",0],["Omnivore","\u{1F34E}",12],["Carnivore","\u{1F9B7}",18]],body:[["Cephalized","\u25CF",0],["Fusiform","\u2B2D",10],["Osteoderms","\u2B22",22]],mouth:[["Grinding","\u25E1",0],["Keratin Beak","\u25C7",8],["Carnassial","\u22C0",18]],legs:[["Plantigrade","\u2229",0],["Digitigrade","\u27CB",14],["Saltatorial","\u2301",18]]},qr={diet:["Herbivores digest plant tissue only, but social species are easier to befriend.","Omnivores eat anything, though each meal is a little less efficient.","Carnivores gain the most from meat and hit harder, but timid prey flee sooner."],body:["Cephalization concentrates sensory structures at the anterior end.","A fusiform profile reduces drag and supports efficient forward locomotion.","Osteoderms are dermal bone plates that trade flexibility and speed for protection."],mouth:["Broad grinding surfaces process fibrous plant tissue.","A keratinized beak shears food without mineralized teeth.","Carnassial-like edges concentrate force for slicing animal tissue."],legs:["Plantigrade feet contact the ground from heel to toe for stability.","Digitigrade posture elevates the heel and lengthens effective stride.","Saltatorial hindlimbs store and release elastic energy for jumping."]},$s=["#d8ef66","#ff8b62","#75ded1","#a993e9","#f2d7a0","#e95d72","#6fb2ff","#f5b84b"],Sg=["#d8ef66","#ff8b62","#75ded1","#a993e9","#f2d7a0","#e95d72","#8fd46b","#f5b84b","#6fb2ff","#c77dff","#ffd166","#4ecdc4"],el=[{id:"fleet",name:"Fleet Feet",icon:"\u26A1",text:"+18% move speed per rank. Longer, springier legs."},{id:"thorn",name:"Thorn Hide",icon:"\u2726",text:"Take 25% less damage per rank. Grows dorsal thorns."},{id:"kindred",name:"Kindred Call",icon:"\u266B",text:"Wider harmony window and +1 pack size per rank. Grows a crest."},{id:"fang",name:"Apex Jaw",icon:"\u2694",text:"+2 bite damage per rank for you and your pack. Grows tusks."},{id:"senses",name:"Keen Senses",icon:"\u25C9",text:"+40% radar range per rank. Grows glowing antennae."},{id:"gut",name:"Iron Gut",icon:"\u2668",text:"Hunger drains 25% slower per rank. Rank 2 digests anything."}],bg=3,Ks=5,Tg=100,Ys=84,Qs=7,ea=240,Xh="oddkin-wild-worlds-save-v2",Jr={curious:{label:"CURIOUS",mood:"Curious about you",window:1.35,hostile:!1},timid:{label:"TIMID",mood:"Skittish, ready to bolt",window:1,hostile:!1},territorial:{label:"TERRITORIAL",mood:"Guarding its ground",window:.85,hostile:!0},predator:{label:"PREDATOR",mood:"Sizing you up as prey",window:.62,hostile:!0}},jh=()=>({diet:0,body:0,mouth:0,legs:0,arms:0,legPairs:1,spine:1,width:1,color:$s[0],faceX:0,faceY:0}),il=()=>Object.fromEntries(el.map(i=>[i.id,0])),E={screen:"planet",planet:0,name:"Pip",genome:jh(),tier:0,adapt:il(),bones:0,boneGoal:5,health:100,hunger:100,clock:ea*.08,player:{x:0,z:0},entities:[],species:[],journal:new Set,stats:{friends:0,defeats:0,bones:0,time:0},paused:!1,creatorMode:"new",victory:!1,keepExploring:!1};function sa(i){return()=>((i=Math.imul(i,1664525)+1013904223|0)>>>0)/4294967296}var $i=(i,e)=>e[Math.floor(i()*e.length)],Eg=i=>typeof i=="string"?parseInt(i.slice(1),16):i,ft=(i,e,t,n)=>Math.hypot(i-t,e-n),ta=(i,e)=>Math.atan2(Math.sin(e-i),Math.cos(e-i));function Pt(i,e){return Math.sin(i*.045)*2+Math.cos(e*.052)*1.55+Math.sin((i+e)*.025)*1.2+Math.sin(Math.hypot(i,e)*.07)*.65}var yp=new Map;function ze(i,e){let t=yp.get(i);return t||(t=e(),yp.set(i,t)),t}var xp=new Map;function $e(i,e=.78,t=0,n={}){let r=[i,e,t,n.flat?1:0,n.opacity??1,n.glow??.6].join("|"),s=xp.get(r);return s||(s=new ki({color:i,roughness:e,metalness:0,emissive:t,emissiveIntensity:t?n.glow??.6:0,flatShading:!!n.flat,transparent:(n.opacity??1)<1,opacity:n.opacity??1}),xp.set(r,s)),s}function et(i,e,t=!0){let n=new Tt(i,e);return n.castShadow=t,n.receiveShadow=!0,n}var Fx=new Oe,wg=new Zt,Ag=new wn,Cg=new C,Rg=new C,zh=new xe;function Ut(i,e,t,n=0,r=0,s=0,a=1,o=a,c=a){return new Oe().compose(Cg.set(i,e,t),wg.setFromEuler(Ag.set(n,r,s)),Rg.set(a,o,c))}var Gh=class{constructor(){this.sets=new Map}add(e,t,n,r,s=16777215,a=!0){let o=this.sets.get(e);o||(o={geometry:t,material:n,cast:a,items:[]},this.sets.set(e,o)),o.items.push({matrix:r,color:s})}build(e){for(let t of this.sets.values()){let n=new Ar(t.geometry,t.material,t.items.length);t.items.forEach((r,s)=>{n.setMatrixAt(s,r.matrix),n.setColorAt(s,zh.set(r.color))}),n.instanceMatrix.needsUpdate=!0,n.instanceColor&&(n.instanceColor.needsUpdate=!0),n.castShadow=t.cast,n.receiveShadow=!0,n.computeBoundingSphere(),n.userData.dispose=!0,e.add(n)}}},Pn={ctx:null,muted:!1};try{Pn.muted=localStorage.getItem("oddkin-muted")==="1"}catch{}function vn(i,e=.12,t="sine",n=.12,r=0,s=0){if(!Pn.muted)try{Pn.ctx||(Pn.ctx=new(window.AudioContext||window.webkitAudioContext));let a=Pn.ctx,o=a.currentTime+r;a.state==="suspended"&&a.resume();let c=a.createOscillator(),l=a.createGain();c.type=t,c.frequency.setValueAtTime(i,o),s&&c.frequency.exponentialRampToValueAtTime(Math.max(40,i+s),o+e),l.gain.setValueAtTime(1e-4,o),l.gain.exponentialRampToValueAtTime(n,o+.012),l.gain.exponentialRampToValueAtTime(1e-4,o+e),c.connect(l).connect(a.destination),c.start(o),c.stop(o+e+.02)}catch{}}var jn={pickup:()=>{vn(660,.1,"triangle"),vn(990,.14,"triangle",.1,.07)},eat:()=>{vn(320,.08,"square",.05),vn(260,.1,"square",.05,.08)},bite:()=>vn(220,.12,"sawtooth",.07,0,-120),hurt:()=>vn(140,.25,"sawtooth",.09,0,-60),beat:i=>vn([523,659,784][i]||784,.18,"sine",.14),miss:()=>vn(160,.18,"square",.06,0,-40),friend:()=>[523,659,784,1046].forEach((i,e)=>vn(i,.18,"triangle",.1,e*.08)),evolve:()=>[392,494,587,784].forEach((i,e)=>vn(i,.6,"sine",.08,e*.05)),discover:()=>{vn(880,.1,"sine",.07),vn(1320,.18,"sine",.06,.09)}};function Ki(){return Tg+E.tier*10}function na(i=E.genome){return["diet","body","mouth","legs"].reduce((e,t)=>e+In[t][i[t]][2],0)+i.arms*10+(i.legPairs-1)*12}function aa(){let i=E.genome,e=E.adapt;return{speed:4+i.legs*2+e.fleet*2-(i.body===2?1:0),social:5+(i.mouth===0?2:0)+(i.diet===0?1:0)+i.arms+e.kindred*2,attack:2+i.mouth*2+i.body+(i.diet===2?1:0)+e.fang*2,health:5+i.body*2+(i.legPairs-1)}}var Ai=()=>60+aa().health*8,kh=()=>3+E.adapt.kindred,Pg=()=>34*(1+E.adapt.senses*.4),$r=()=>.85+E.tier*.07;function qh(i){let e=E.genome.diet;return e===1||E.adapt.gut>=2||e===0&&i==="plant"||e===2&&i==="meat"}function rl(i){return{...i}}function oa(i,{scale:e=1,mut:t=null,cheapShadows:n=!1}={}){let r=new Gt,s=new Gt;r.add(s);let a=Eg(i.color),o=$e(a,.62),c=$e(1522997,.6),l=$e(16776688,.3),h=$e(1059366,.25),u=$e(new xe(a).offsetHSL(.02,-.08,-.2).getHex(),.7),p=$e(15204208,.4,15204208,{glow:1.2}),d=1+(t?.fleet||0)*.12,f=(d-1)*1.05,m=O=>(O.castShadow=!n,O),_=i.body===1?ze("b1",()=>new nn(.72,1.25,10,18)):i.body===2?ze("b2",()=>new Rt(1.02,24,16)):ze("b0",()=>new Rt(1,24,18)),g=i.body===1?[1,.82,1.35]:[1.15,1,1.05],v=(i.body===1?.72:i.body===2?1.02:1)*g[2]*i.spine,x=et(_,o);x.scale.set(g[0]*i.width,g[1]*(.85+.15*i.spine),g[2]*i.spine),x.position.y=1.55,s.add(x);let b=et(ze("belly",()=>new Rt(.76,20,14)),$e(a,.8,0,{opacity:.4}),!1);b.scale.set(i.width,.72,.95),b.position.set(0,1.35,-v*.55),s.add(b);let S=[],y=i.legs===2?.72:.5,P=i.legs===0?.42:.66;for(let O=0;O<i.legPairs;O++)for(let N of[-1,1]){let H=new Gt,X=i.legPairs===1?0:(O/(i.legPairs-1)-.5)*1.15*i.spine;H.position.set(N*.48*i.width,.9*d+f*.1,X),H.scale.y=d;let k=m(et(ze(`up${y}`,()=>new nn(.16,y,8,12)),o));k.position.set(N*.1,-y*.45,0),k.rotation.z=N*(i.legs===2?.42:.12);let Z=m(et(ze("knee",()=>new Rt(.18,12,9)),o));Z.position.set(N*(i.legs===2?.3:.1),-.48,0);let j=m(et(ze(`lo${P}`,()=>new nn(.13,P,8,12)),o));j.position.set(N*(i.legs===1?.24:.13),-.7,0),j.rotation.z=N*(i.legs===1?-.35:i.legs===2?-.22:.04);let te=m(et(ze("foot",()=>new Rt(.25,16,10)),c));te.scale.set(i.legs===0?1.55:1.05,.38,i.legs===2?1.9:1.45),te.position.set(N*(i.legs===1?.36:.16),-1.05,-.12),H.add(k,Z,j,te),H.userData.phase=i.legs===2?O*.6:(N>0?0:Math.PI)+O*Math.PI,S.push(H),r.add(H)}let F=[];for(let O=0;O<i.arms;O++)for(let N of[-1,1]){let H=new Gt;H.position.set(N*.82*i.width,1.72+O*.26,-.1*i.spine+O*.3);let X=m(et(ze("arm",()=>new nn(.12,.72,8,12)),o));X.position.set(N*.2,-.25,0),X.rotation.z=N*(.75-O*.12);let k=m(et(ze("hand",()=>new Rt(.19,14,10)),c));k.position.set(N*.36,-.52,0),H.add(X,k),H.userData.phase=N>0?Math.PI:0,F.push(H),s.add(H)}let L=i.faceX/105,D=i.faceY/100;for(let O of[-1,1]){let N=et(ze("eye",()=>new Rt(.29,18,14)),l);N.position.set(L+O*.39,1.98-D,-v*.8);let H=et(ze("pupil",()=>new Rt(.12,14,10)),h);H.position.set(L+O*.41,1.98-D,-v*.8-.24),N.userData.editPart=H.userData.editPart="face",s.add(N,H)}if(i.mouth===1){let O=et(ze("beak",()=>new rn(.33,.8,8)),$e(16763989));O.rotation.x=-Math.PI/2,O.position.set(L,1.5-D,-v*1.02),O.userData.editPart="face",s.add(O)}else{let O=et(ze("mouth",()=>new Gi(.3,.055,8,18,Math.PI)),c);if(O.rotation.set(0,0,Math.PI),O.position.set(L,1.52-D,-v*.97),O.userData.editPart="face",s.add(O),i.mouth===2)for(let N of[-1,1]){let H=et(ze("tooth",()=>new rn(.06,.18,5)),l,!1);H.rotation.x=Math.PI,H.position.set(L+N*.14,1.5-D,-v*.99),H.userData.editPart="face",s.add(H)}}if(i.body===2)for(let O=-2;O<=2;O++){let N=m(et(ze("plate",()=>new rn(.13,.42,5)),c));N.position.set(0,2.5-Math.abs(O)*.05,O*.32*i.spine),s.add(N)}if(t){for(let O=0;O<t.thorn*3;O++){let N=(O+.5)/(t.thorn*3),H=et(ze("thorn",()=>new rn(.1,.55,5)),u),X=Js(-1.1,1.1,N);H.position.set(Math.sin(O*2.4)*.35*i.width,1.55+Math.cos(X)*.98,Math.sin(X)*v),H.rotation.x=X,s.add(H)}if(t.kindred)for(let O=0;O<2+t.kindred;O++){let N=et(ze("feather",()=>new rn(.07,.8,4)),$e(16747473,.5,5903424));N.position.set((O-(1+t.kindred)/2)*.18,2.62,-v*.25),N.rotation.set(-.35,0,(O-(1+t.kindred)/2)*.35),N.scale.y=.8+t.kindred*.2,s.add(N)}if(t.senses)for(let O of[-1,1]){let N=et(ze("stalk",()=>new Vt(.025,.035,.7,6)),c,!1);N.position.set(O*.3,2.65,-v*.55),N.rotation.set(-.5,0,O*-.4);let H=et(ze("bulb",()=>new Rt(.1+.02,10,8)),p,!1);H.position.set(O*.44,2.95,-v*.72),H.scale.setScalar(.8+t.senses*.25),s.add(N,H)}if(t.fang)for(let O of[-1,1]){let N=et(ze("tusk",()=>new rn(.08,.5,6)),l);N.position.set(L+O*.34,1.34-D,-v*.95),N.rotation.set(-.6,0,O*.3),N.scale.setScalar(.8+t.fang*.25),s.add(N)}}return s.position.y=f,r.scale.setScalar(e),r.userData={torso:s,body:x,limbs:S,arms:F,lift:f,hop:i.legs===2},r}function sl(i,e,t,n=0){let r=i.userData,s=e+n,a=7+t*5,o=r.hop?Math.abs(Math.sin(s*a*.5))*.28*t:Math.abs(Math.sin(s*a))*.07*t;r.torso.position.y=r.lift+o+Math.sin(s*2.1)*.025,r.torso.rotation.z=Math.sin(s*a*.5)*.03*t;for(let c of r.limbs)c.rotation.x=Math.sin(s*(r.hop?a*.5:a)+c.userData.phase)*(r.hop?.35:.55)*t;for(let c of r.arms)c.rotation.x=Math.sin(s*a+c.userData.phase)*.4*t+Math.sin(s*1.6)*.06}var Mp=["Moss","Nib","Brum","Zig","Tuff","Glim","Snor","Plum","Vex","Wob","Quill","Fen"],Sp=["whisk","ble","snout","kin","aroo","hopper","munch","ling","beak","tail","fang","drift"];function Ig(i){let e=cn[i],t=sa(1300+i*977),n=[];for(let r=0;r<6;r++){let s=r===0?"curious":r===1?"timid":r===5||t()<e.predators?"predator":$i(t,["curious","timid","territorial"]),a=s==="predator"?2:s==="timid"?0:Math.floor(t()*2),o={diet:a,body:s==="territorial"?2:Math.floor(t()*3),mouth:a===2?2:a===0?0:1,legs:s==="timid"?1+Math.floor(t()*2):Math.floor(t()*3),arms:t()<.3?1:0,legPairs:t()<.25?2:1,spine:.8+t()*.7,width:.8+t()*.45,color:$i(t,Sg),faceX:(t()-.5)*20,faceY:(t()-.5)*16},c=Mp[(r*7+i*3+Math.floor(t()*3))%Mp.length]+Sp[(r*5+i)%Sp.length];n.push({id:r,name:c,genome:o,temper:s,size:s==="predator"?.95+t()*.3:s==="territorial"?.85+t()*.2:.55+t()*.3,hp:{curious:7,timid:6,territorial:13,predator:16}[s],attack:{curious:3,timid:0,territorial:7,predator:10}[s],speed:{curious:3,timid:5.2,territorial:3.6,predator:4.6}[s],herds:s==="predator"?2:3,herdSize:s==="predator"?[1,2]:[2,4]})}return n}function Lg(i){let e=i.genome;return`A ${In.diet[e.diet][0].toLowerCase()} with ${In.body[e.body][0].toLowerCase()} build and ${In.legs[e.legs][0].toLowerCase()} legs. ${qr.legs[e.legs]}`}function Dg(){Q("#planet-list").innerHTML=cn.map((i,e)=>`
    <button class="planet-option" role="radio" aria-checked="${e===0}" data-i="${e}">
      <i class="planet-orb" style="background:${i.color}"></i>
      <span><strong>${i.name.toUpperCase()}</strong><small>${i.biome} \xB7 <span class="danger-pips" aria-label="Danger ${i.danger} of 3">${"\u25B2".repeat(i.danger)}</span></small><span class="blurb">${i.blurb}</span></span>
      <b>0${e+1}</b>
    </button>`).join(""),ln(".planet-option").forEach(i=>i.addEventListener("click",()=>Ng(+i.dataset.i)));for(let i of["diet","body","mouth","legs"])Q(`#${i}-options`).innerHTML=In[i].map((e,t)=>`<button class="trait-btn" data-type="${i}" data-i="${t}"><span aria-hidden="true">${e[1]}</span>${e[0]}<small>${e[2]?`${e[2]} genes`:"FREE"}</small></button>`).join("");Q("#color-options").innerHTML=$s.map((i,e)=>`<button class="swatch" data-i="${e}" style="background:${i}" aria-label="Color ${e+1}"></button>`).join(""),ln(".trait-btn").forEach(i=>i.addEventListener("click",()=>Ug(i.dataset.type,+i.dataset.i))),ln(".swatch").forEach(i=>i.addEventListener("click",()=>{E.genome.color=$s[+i.dataset.i],Yr()})),Q("#spine-slider").addEventListener("input",i=>{E.genome.spine=+i.target.value/100,Yr()}),Q("#width-slider").addEventListener("input",i=>{E.genome.width=+i.target.value/100,Yr()}),ln("[data-counter]").forEach(i=>i.addEventListener("click",()=>Fg(i.dataset.counter,+i.dataset.delta))),Q("#randomize-btn").addEventListener("click",Og),Q("#choose-planet").addEventListener("click",()=>Rp("new")),Q("#continue-btn").addEventListener("click",Yg),Q("#back-planets").addEventListener("click",()=>ol("planet")),Q("#begin-game").addEventListener("click",()=>E.creatorMode==="evolve"?qg():jg()),Q("#pause-btn").addEventListener("click",()=>nl(!0)),Q("#resume-btn").addEventListener("click",()=>nl(!1)),Q("#restart-btn").addEventListener("click",wp),Q("#evolve-btn").addEventListener("click",Zh),Q("#keep-exploring").addEventListener("click",()=>{E.keepExploring=!0,Q("#victory-modal").classList.add("hidden"),E.paused=!1,er()}),Q("#victory-new").addEventListener("click",wp),Q("#mute-btn").addEventListener("click",Xp),jp(),Yp(),al()}function Ng(i){E.planet=i,ln(".planet-option").forEach(e=>e.setAttribute("aria-checked",String(+e.dataset.i===i))),Q("#selected-name").textContent=cn[i].name.toUpperCase(),ha(!1)}function Ug(i,e){let t=E.genome[i];if(E.genome[i]=e,na()>Ki()){E.genome[i]=t,lt("That adaptation exceeds your gene budget","bad");return}Yr()}function Fg(i,e){let[t,n]=i==="arms"?[0,2]:[1,3],r=E.genome[i];if(E.genome[i]=Rn(r+e,t,n),na()>Ki()){E.genome[i]=r,lt("Not enough genes left for another limb set","bad");return}Yr()}function Og(){let i=Math.random,e=E.genome;for(let n=0;n<40&&(Object.assign(e,{diet:Math.floor(i()*3),body:Math.floor(i()*3),mouth:Math.floor(i()*3),legs:Math.floor(i()*3),arms:Math.floor(i()*3),legPairs:1+Math.floor(i()*3),spine:.7+i(),width:.7+i()*.75,color:$i(i,$s),faceX:(i()-.5)*30,faceY:(i()-.5)*24}),!(na()<=Ki()));n++);for(;na()>Ki();)e.arms?e.arms--:e.legPairs>1?e.legPairs--:e.body=0;let t=["Pip","Ziggle","Mox","Tuft","Bramble","Quibble","Nox","Jinx","Puddle","Snorkel","Wisp","Gumbo"];E.creatorMode==="new"&&(Q("#creature-name").value=$i(i,t)),Yr()}function Yr(){al(),ia(),ll()}function al(){let i=E.genome,e=Ki(),t=na();Q("#budget-value").textContent=e-t,Q(".budget").classList.toggle("low",e-t<15),ln(".trait-btn").forEach(r=>{let s=r.dataset.type,a=+r.dataset.i,o=t-In[s][i[s]][2]+In[s][a][2]<=e;r.classList.toggle("selected",a===i[s]),r.setAttribute("aria-pressed",String(a===i[s])),r.disabled=!o,r.title=qr[s][a]}),ln(".swatch").forEach(r=>r.classList.toggle("selected",$s[+r.dataset.i]===i.color)),ln("[data-counter]").forEach(r=>{let s=r.dataset.counter,a=+r.dataset.delta,[o,c]=s==="arms"?[0,2]:[1,3],l=Rn(i[s]+a,o,c);r.disabled=l===i[s]||t+(s==="arms"?10:12)*(l-i[s])>e}),Q("#arms-count").textContent=i.arms,Q("#leg-pairs-count").textContent=i.legPairs,Q("#spine-slider").value=Math.round(i.spine*100),Q("#width-slider").value=Math.round(i.width*100);let n=aa();Q("#stats").innerHTML=Object.entries(n).map(([r,s])=>`<div class="stat"><span>${r.toUpperCase()}</span><div><i style="width:${Math.min(s,12)/12*100}%"></i></div><b>${s}</b></div>`).join(""),Q("#anatomy-note").textContent=`${qr.diet[i.diet]} ${qr.body[i.body]} ${qr.mouth[i.mouth]} ${qr.legs[i.legs]}`}function Rp(i){E.creatorMode=i;let e=i==="evolve";Q("#creator-eyebrow").textContent=e?`EVOLUTION ${E.tier} \xB7 RESHAPE`:"THE BIRTH POOL",Q("#creator-heading").textContent=e?`Reshape ${E.name}`:"Build your first Oddkin",Q("#creator-sub").textContent=e?`You now have ${Ki()} genes to spend. Changes carry into the wild.`:"Every trait changes how you survive. Evolving later earns more genes to reshape with.",Q("#back-planets").classList.toggle("hidden",e),Q("#creature-name").disabled=e,Q("#begin-game").innerHTML=e?"RETURN TO THE WILD <b>\u2192</b>":"HATCH <b>\u2192</b>",e||(E.tier=0,E.adapt=il()),al(),ia(),ol("creator")}function ol(i){E.screen=i,ln(".screen").forEach(e=>e.classList.remove("active")),Q(`#${i}-screen`).classList.add("active"),Ye&&(Ye.visible=i!=="creator"),i==="planet"&&Yp()}var Mt=Q("#preview"),Ji={yaw:Math.PI+.35,pitch:.08,zoom:7},he={renderer:null,scene:null,camera:null,creature:null,yaw:Ji.yaw,pitch:Ji.pitch,zoom:Ji.zoom,zoomTarget:Ji.zoom,drag:!1,mode:"rotate",last:{x:0,y:0}},bp=new Os,Tp=new ie;function Bg(){he.renderer=new js({antialias:!0,alpha:!0}),he.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)),he.renderer.shadowMap.enabled=!0,he.renderer.outputColorSpace=zt,he.renderer.toneMapping=Gr,he.renderer.toneMappingExposure=1.15,Mt.appendChild(he.renderer.domElement),he.scene=new wr,he.camera=new Dt(34,1,.1,30),he.scene.add(new Nr(16775135,2376764,3));let i=new Vi(16773065,4);i.position.set(-4,7,-4),i.castShadow=!0,he.scene.add(i);let e=new Vi(8650711,2);e.position.set(5,3,4),he.scene.add(e);let t=et(new Vt(2.25,2.5,.28,48),$e(2444612,.72));t.position.y=-.15,he.scene.add(t),ia();let n=()=>bp.intersectObject(he.creature,!0).some(a=>a.object.userData.editPart==="face"),r=a=>{let o=Mt.getBoundingClientRect();Tp.set((a.clientX-o.left)/o.width*2-1,-((a.clientY-o.top)/o.height*2-1)),bp.setFromCamera(Tp,he.camera)},s=()=>{he.drag=!1,he.mode="rotate",delete Mt.dataset.mode,Mt.classList.remove("dragging")};Mt.addEventListener("pointerdown",a=>{r(a),he.mode=n()?"face":"rotate",he.drag=!0,he.last={x:a.clientX,y:a.clientY},Mt.dataset.mode=he.mode,Mt.classList.add("dragging"),Mt.setPointerCapture(a.pointerId)}),Mt.addEventListener("pointermove",a=>{if(!he.drag){r(a),Mt.dataset.hover=n()?"face":"body";return}let o=a.clientX-he.last.x,c=a.clientY-he.last.y;if(he.mode==="face"){let l=Math.cos(he.yaw)<0?1:-1;E.genome.faceX=Rn(E.genome.faceX-o*.55*l,-30,30),E.genome.faceY=Rn(E.genome.faceY+c*.45,-24,24),ia(),ll()}else he.yaw+=o*.009,he.pitch=Rn(he.pitch+c*.006,-.35,.45);he.last={x:a.clientX,y:a.clientY}}),Mt.addEventListener("pointerleave",()=>delete Mt.dataset.hover),Mt.addEventListener("pointerup",a=>{s(),Mt.hasPointerCapture(a.pointerId)&&Mt.releasePointerCapture(a.pointerId)}),Mt.addEventListener("pointercancel",s),Mt.addEventListener("wheel",a=>{let o=a.deltaMode===1?16:a.deltaMode===2?Mt.clientHeight:1;he.zoomTarget=Rn(he.zoomTarget+Rn(a.deltaY*o,-100,100)*.0035,5.6,9),a.preventDefault()},{passive:!1}),Mt.addEventListener("dblclick",()=>{he.yaw=Ji.yaw,he.pitch=Ji.pitch,he.zoomTarget=Ji.zoom})}function ia(){if(!he.scene)return;he.creature&&he.scene.remove(he.creature);let i=1.15*(E.creatorMode==="evolve"?1+E.tier*.03:1);he.creature=oa(E.genome,{scale:i,mut:rl(E.adapt)}),he.creature.position.y=.05,he.scene.add(he.creature)}function zg(i){if(!he.renderer||E.screen!=="creator")return;let e=Mt.getBoundingClientRect(),t=Math.max(1,e.width),n=Math.max(1,e.height),r=he.renderer.getPixelRatio();(he.renderer.domElement.width!==Math.floor(t*r)||he.renderer.domElement.height!==Math.floor(n*r))&&(he.renderer.setSize(t,n,!1),he.camera.aspect=t/n,he.camera.updateProjectionMatrix()),he.zoom=Js(he.zoom,he.zoomTarget,.16),he.creature&&(he.creature.rotation.y=he.yaw+(he.drag?0:Math.sin(i*.35)*.08),he.creature.rotation.x=he.pitch,sl(he.creature,i,0)),he.camera.position.set(0,2.1,he.zoom),he.camera.lookAt(0,1.35,0),he.renderer.render(he.scene,he.camera)}function Gg(){if(!he.renderer)return;let i={yaw:he.yaw,pitch:he.pitch};ia(),he.renderer.setSize(160,160,!1),he.camera.aspect=1,he.camera.updateProjectionMatrix(),he.creature.rotation.set(0,Math.PI+.45,0),he.camera.position.set(0,2.2,5.6),he.camera.lookAt(0,1.5,0),he.renderer.render(he.scene,he.camera);try{Q("#portrait").src=he.renderer.domElement.toDataURL("image/png")}catch{}he.renderer.domElement.width=0,Object.assign(he,i)}var _n=Q("#game"),qn;try{qn=new js({canvas:_n,antialias:!0,powerPreference:"high-performance"})}catch{throw Q("#webgl-error").classList.remove("hidden"),new Error("WebGL unavailable")}qn.setPixelRatio(Math.min(devicePixelRatio,1.75));qn.shadowMap.enabled=!0;qn.shadowMap.type=Po;qn.outputColorSpace=zt;qn.toneMapping=Gr;qn.toneMappingExposure=1.05;var Ci=new wr,Ei=new Dt(58,innerWidth/innerHeight,.1,500),At=new Gt;Ci.add(At);var Ft={hemi:null,sun:null,day:1,lastDay:1},Pp=!1,Ye=null,la=[],ca=[],wi=null,$t={},Ue={velocity:new C,yaw:Math.PI,pitch:.38,distance:10.5,dragging:!1,lastX:0,lastY:0,lunge:0,attackCd:0},kg=(()=>{let i=sa(42),e=[];for(let s=0;s<700;s++){let a=i()*nt,o=i()*.9+.08,c=260;e.push(Math.cos(a)*Math.cos(o*Math.PI/2)*c,Math.sin(o*Math.PI/2)*c,Math.sin(a)*Math.cos(o*Math.PI/2)*c)}let t=new rt;t.setAttribute("position",new Ce(e,3));let n=new Cr({color:16777215,size:1.6,sizeAttenuation:!1,transparent:!0,opacity:0,fog:!1,depthWrite:!1}),r=new Ms(t,n);return Ci.add(r),r})(),oi=(()=>{let e=new Ar(new Mi(.09,0),new Gn({color:16777215}),220);e.frustumCulled=!1,e.instanceMatrix.setUsage(ah);let t=Array.from({length:220},()=>({life:0,max:1,pos:new C,vel:new C,size:1}));for(let r=0;r<220;r++)e.setMatrixAt(r,Ut(0,-999,0,0,0,0,0)),e.setColorAt(r,zh.set(16777215));Ci.add(e);let n=0;return{burst(r,s,a,o,c=14,l=3,h=3){for(let u=0;u<c;u++){let p=t[n];p.life=p.max=.6+Math.random()*.5,p.pos.set(r,s,a),p.vel.set((Math.random()-.5)*l,Math.random()*h+1,(Math.random()-.5)*l),p.size=.7+Math.random()*1.1,e.setColorAt(n,zh.set(o)),n=(n+1)%220}e.instanceColor.needsUpdate=!0},update(r){for(let s=0;s<220;s++){let a=t[s];if(a.life<=0)continue;a.life-=r,a.vel.y-=7*r,a.pos.addScaledVector(a.vel,r);let o=Math.max(0,a.life/a.max)*a.size;e.setMatrixAt(s,a.life>0?Ut(a.pos.x,a.pos.y,a.pos.z,0,0,0,o):Ut(0,-999,0,0,0,0,0))}e.instanceMatrix.needsUpdate=!0}}})();function Vg(){for(At.traverse(i=>{i.userData.dispose&&(i.dispose?.(),i.userData.ownGeometry&&i.geometry.dispose(),i.userData.ownMaterial&&i.material.dispose())});At.children.length;)At.remove(At.children[0]);la=[],ca=[],E.entities=[],Ye=null}function Ep(i,e,t,n,r){let s=.7+t()*1.2,a=t()*nt,o=Pt(n,r),c=Ut(n,o,r,0,a,0,s),l=(u,p,d,f,m,_=!0)=>i.add(u,p,d,c.clone().multiply(f),m,_),h=()=>new xe($i(t,e.leaf)).offsetHSL((t()-.5)*.03,0,(t()-.5)*.08).getHex();if(e.tree==="round"){l("trunk",ze("trunk",()=>new Vt(.2,.42,2.8,7)),$e(16777215,.9,0,{flat:!0}),Ut(0,1.4,0,0,0,(t()-.5)*.12),e.trunk);let u=3+Math.floor(t()*3);for(let p=0;p<u;p++){let d=p/u*nt+t(),f=.9+t()*.5;l("crown",ze("crown",()=>new Mi(1,0)),$e(16777215,.88,0,{flat:!0}),Ut(Math.cos(d)*.65,3+t()*.7,Math.sin(d)*.55,t(),t(),0,f*1.1,f*.9,f),h())}}else if(e.tree==="spire"){l("trunk",ze("trunk",()=>new Vt(.2,.42,2.8,7)),$e(16777215,.9,0,{flat:!0}),Ut(0,1.4,0,0,0,(t()-.5)*.2),e.trunk);for(let u=0;u<2;u++)l("spire",ze("spire",()=>new rn(1,2.2,6)),$e(16777215,.7,5904384,{flat:!0,glow:.5}),Ut((t()-.5)*.3,2.9+u*1.1,0,0,t(),0,1-u*.3),h())}else if(e.tree==="mushroom")l("stalk",ze("stalk-m",()=>new Vt(.22,.34,2.4,8)),$e(16777215,.6,2241365,{glow:.4}),Ut(0,1.2,0,0,0,(t()-.5)*.2),e.trunk),l("cap",ze("cap",()=>new Rt(1.4,14,8,0,nt,0,Math.PI/2)),$e(16777215,.45,1735270,{flat:!0,glow:.9}),Ut(0,2.3,0,0,0,0,1,.6+t()*.3,1),h());else{let u=h();l("cactus",ze("cactus",()=>new nn(.34,2.1,6,10)),$e(16777215,.8,0,{flat:!0}),Ut(0,1.4,0),u);for(let p of[-1,1]){if(t()<.3)continue;let d=1.1+t()*.8;l("cactus-arm",ze("cactus-arm",()=>new nn(.2,.7,6,8)),$e(16777215,.8,0,{flat:!0}),Ut(p*.6,d+.35,0),u),l("cactus-arm",ze("cactus-arm",()=>new nn(.2,.7,6,8)),$e(16777215,.8,0,{flat:!0}),Ut(p*.35,d,0,0,0,Math.PI/2,.8),u)}}s>.9&&la.push({x:n,z:r,r:(e.tree==="cactus"?.6:1.1)*s})}function ha(i=!0){Vg(),Pp=i;let e=cn[E.planet],t=sa(800+E.planet*541);Ci.background=new xe(e.sky),Ci.fog=new gs(e.fog,.0095),Ft.hemi=new Nr(16774358,e.ground,2.2),Ft.sun=new Vi(16773314,3.2),Ft.sun.castShadow=!0,Ft.sun.shadow.mapSize.set(2048,2048),Object.assign(Ft.sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:160}),Ft.sun.shadow.bias=-6e-4,At.add(Ft.hemi,Ft.sun,Ft.sun.target);let n=new Si(190,190,110,110);n.rotateX(-Math.PI/2);let r=n.attributes.position,s=[],a=new xe(e.ground),o=a.clone().offsetHSL(.025,.03,.09),c=a.clone().offsetHSL(-.015,.02,-.08),l=new xe(2758162),h=new xe(e.ground).offsetHSL(0,-.05,.12),u=e.lava?[[27,-22,9],[-38,30,7],[44,34,6],[-20,-52,7]]:[];for(let S=0;S<r.count;S++){let y=r.getX(S),P=r.getZ(S);r.setY(S,Pt(y,P));let F=Math.sin(y*.19)*Math.cos(P*.17)*.5+.5,L=c.clone().lerp(o,F*.7+.15);for(let[D,O,N]of u){let H=ft(y,P,D,O);H<N+5&&L.lerp(l,(1-Bh(H,N,N+5))*.85)}ft(y,P,0,0)<9&&L.lerp(h,(1-Bh(ft(y,P,0,0),4,9))*.6),s.push(L.r,L.g,L.b)}n.setAttribute("color",new Ce(s,3)),n.computeVertexNormals();let p=et(n,new ki({vertexColors:!0,roughness:.95}),!1);p.userData.dispose=p.userData.ownGeometry=!0,At.add(p);let d=e.lava?u:[[27,-22,9]];for(let[S,y,P]of d){let F=e.lava?$e(16738858,.4,16726528,{glow:1.4}):new Ns({color:e.water,transparent:!0,opacity:.7,roughness:.12,emissive:e.glow?e.water:0,emissiveIntensity:e.glow?.35:0}),L=et(ze(`pool${P}`,()=>new Rr(P,40)),F,!1);L.rotation.x=-Math.PI/2,L.position.set(S,Pt(S,y)+.18,y),e.lava||(L.userData.dispose=L.userData.ownMaterial=!0),At.add(L),e.lava&&ca.push({x:S,z:y,r:P-.6})}let f=new Gt;for(let S=0;S<18;S++){let y=et(ze("stick",()=>new Vt(.06,.08,2.3,5)),$e(7622961));y.rotation.set(Math.PI/2,S%3*.2,S/18*nt),y.position.set(Math.cos(S/18*nt)*1.2,.1,Math.sin(S/18*nt)*1.2),f.add(y)}f.position.set(0,Pt(0,0)+.1,0),At.add(f),wi=new Tt(ze("nest-ring",()=>new Dr(Qs-.25,Qs,64)),new Gn({color:e.accent,transparent:!0,opacity:.35,depthWrite:!1})),wi.rotation.x=-Math.PI/2,wi.position.set(0,Pt(0,0)+.6,0),At.add(wi);let m=new Gh,_=(S,y)=>ft(S,y,0,0)>8&&!d.some(([P,F,L])=>ft(S,y,P,F)<L+2),g=e.tree==="cactus"?70:130;for(let S=0;S<g;S++){let y=t()*nt,P=10+Math.sqrt(t())*78,F=Math.cos(y)*P,L=Math.sin(y)*P;_(F,L)&&Ep(m,e,t,F,L)}for(let S=0;S<70;S++){let y=S/70*nt+t()*.05,P=Ys+4+t()*5;Ep(m,e,t,Math.cos(y)*P,Math.sin(y)*P)}for(let S=0;S<55;S++){let y=t()*nt,P=9+Math.sqrt(t())*80,F=Math.cos(y)*P,L=Math.sin(y)*P;if(!_(F,L))continue;let D=.6+t()*1.6;m.add("rock",ze("rock",()=>new Pr(1,0)),$e(16777215,.9,0,{flat:!0}),Ut(F,Pt(F,L)+D*.1,L,t(),t()*nt,t()*.3,D*1.15,D*(.45+t()*.45),D*.9),new xe(e.rock).offsetHSL(0,0,(t()-.5)*.08).getHex()),D>1.1&&la.push({x:F,z:L,r:D*.95})}let v=$e(16777215,.92,e.glow?e.accent:0,{glow:.35}),x=e.tree==="cactus"?700:1700,b=new xe(e.tree==="cactus"?13218666:e.accent);for(let S=0;S<x;S++){let y=t()*nt,P=3+Math.sqrt(t())*84,F=Math.cos(y)*P,L=Math.sin(y)*P,D=.5+t()*.9;m.add("grass",ze("grass",()=>new rn(.07,1,4)),v,Ut(F,Pt(F,L)+D*.45,L,(t()-.5)*.3,t()*nt,(t()-.5)*.3,.8,D,.5),b.clone().offsetHSL((t()-.5)*.04,0,(t()-.5)*.18).getHex(),!1)}for(let S=0;S<160;S++){let y=t()*nt,P=5+Math.sqrt(t())*80,F=Math.cos(y)*P,L=Math.sin(y)*P,D=Pt(F,L),O=.7+t()*.8;m.add("stem",ze("stem",()=>new Vt(.025,.035,.45,5)),$e(5216589),Ut(F,D+.22*O,L,0,0,0,O),16777215,!1),m.add("bloom",ze("bloom",()=>new Mi(.16,0)),$e(16777215,.6,e.glow||e.lava?4473924:0,{flat:!0,glow:.8}),Ut(F,D+.5*O,L,t(),t(),0,O,O*.7,O),$i(t,e.flowers),!1)}m.build(At),i?Xg():(Ye=oa(E.genome,{scale:2,mut:rl(E.adapt)}),Ye.position.set(0,Pt(0,0),0),At.add(Ye))}function ra(i,e,t,n=10){for(let r=0;r<30;r++){let s=i()*nt,a=e+Math.sqrt(i())*(t-e),o=Math.cos(s)*a,c=Math.sin(s)*a;if(!(ft(o,c,0,0)<n)&&!ca.some(l=>ft(o,c,l.x,l.z)<l.r+2)&&!la.some(l=>ft(o,c,l.x,l.z)<l.r+1))return{x:o,z:c}}return{x:e,z:0}}function Ip(i,e,t,n={}){let r=1+E.tier*.18,s=oa(i.genome,{scale:i.size,cheapShadows:!0});s.position.set(e,Pt(e,t),t),At.add(s);let a={type:"creature",sp:i,x:e,z:t,angle:Math.random()*nt,hp:Math.round(i.hp*r),maxHp:Math.round(i.hp*r),mode:"wander",mesh:s,homeX:n.homeX??e,homeZ:n.homeZ??t,cd:0,callCd:0,turnT:0,ally:!1,dead:!1,dying:0,provoked:0,stride:0,offset:Math.random()*10,pop:0};return E.entities.push(a),a}function tl(i,e,t=16){let n=ra(e,i.temper==="predator"?Math.max(28,t):t,78,i.temper==="predator"?24:12),r=i.herdSize[0]+Math.floor(e()*(i.herdSize[1]-i.herdSize[0]+1));for(let s=0;s<r;s++)Ip(i,n.x+(e()-.5)*5,n.z+(e()-.5)*5,{homeX:n.x,homeZ:n.z})}function Hg(){let i=new Gt,e=$e(16773309,.45,5850898),t=et(ze("bone-shaft",()=>new Vt(.14,.14,1.2,10)),e);t.rotation.z=Math.PI/2,i.add(t);for(let s of[-.64,.64])for(let a of[-.13,.13]){let o=et(ze("bone-end",()=>new Rt(.22,12,9)),e);o.position.set(s,0,a),i.add(o)}let n=et(ze("bone-ring",()=>new Gi(.9,.035,8,30)),new Gn({color:15204208,transparent:!0,opacity:.7}),!1);n.rotation.x=Math.PI/2,n.position.y=-.28,i.add(n);let r=new Tt(ze("beam",()=>new Vt(.12,.12,14,6,1,!0)),new Gn({color:15204208,transparent:!0,opacity:.16,depthWrite:!1,fog:!1}));return r.position.y=7,r.visible=!1,i.add(r),i.userData.beam=r,i.scale.setScalar(1.2),i}function Wg(i){let e=new Gt,t=cn[E.planet];if(i==="plant"){let n=et(ze("fruit",()=>new Rt(.32,16,12)),t.glow?$e(8052991,.4,1739424,{glow:.9}):$e(14965606,.55));n.scale.y=.82;let r=et(ze("fruit-leaf",()=>new Rt(.18,10,7)),$e(5217360),!1);r.scale.set(1.5,.25,.75),r.position.set(.12,.32,0),e.add(n,r)}else{let n=et(ze("meat",()=>new nn(.22,.55,8,12)),$e(14252136,.62));n.rotation.z=Math.PI/2;let r=et(ze("meat-bone",()=>new Vt(.07,.07,.95,7)),$e(15916983),!1);r.rotation.z=Math.PI/2,e.add(n,r)}return e}function Zr(i,e,t,n){let r=i==="bone"?Hg():Wg(n);r.position.set(e,Pt(e,t)+.5,t),At.add(r);let s={type:i,kind:n,x:e,z:t,taken:!1,mesh:r,phase:Math.random()*nt,age:0};return E.entities.push(s),s}function Xg(){let i=sa(4200+E.planet*131+E.tier*17);E.species=Ig(E.planet),Ue.velocity.set(0,0,0),Ye=oa(E.genome,{scale:$r(),mut:rl(E.adapt)}),Ye.position.set(E.player.x,Pt(E.player.x,E.player.z),E.player.z),At.add(Ye);for(let t of E.species)for(let n=0;n<t.herds;n++)tl(t,i);for(let t=0;t<Math.min(E.tier,3);t++)tl(E.species[5],i,30);Zr("bone",4,0);for(let t=0;t<20;t++){let n=ra(i,8,78,6);Zr("bone",n.x,n.z)}let e=cn[E.planet];for(let t=0;t<44;t++){let n=e.tree==="cactus"&&t<16?{x:27+Math.cos(t)*(10+i()*5),z:-22+Math.sin(t)*(10+i()*5)}:ra(i,5,78,4);Zr("food",n.x,n.z,i()>.68?"meat":"plant")}}function ll(){if(!Ye)return;let{x:i,z:e}=Ye.position,t=Ye.rotation.y;At.remove(Ye),Ye=oa(E.genome,{scale:Pp?$r():2,mut:rl(E.adapt)}),Ye.position.set(i,Pt(i,e),e),Ye.rotation.y=t,Ye.visible=E.screen!=="creator",At.add(Ye)}function Lp(){Object.assign(E,{tier:0,adapt:il(),bones:0,boneGoal:5,clock:ea*.08,victory:!1,keepExploring:!1}),E.stats={friends:0,defeats:0,bones:0,time:0},E.journal=new Set,E.player.x=E.player.z=0}function jg(){E.name=Q("#creature-name").value.trim()||"Pip",Lp(),E.health=Ai(),E.hunger=100,ha(!0),Yh(),lt(`Welcome to ${cn[E.planet].name}, ${E.name}! Your first bone glows near the nest.`,"good"),er()}function Yh(){E.paused=!1,Gg(),Ue.yaw=Math.PI,Ei.position.set(E.player.x,12,E.player.z+12),ol("play"),Qr()}function qg(){E.health=Math.min(E.health,Ai()),ll(),Yh(),lt(`${E.name} returns, reshaped.`,"good"),er()}function Yg(){let i=qp();if(i){Object.assign(E,{planet:i.planet,name:i.name,genome:{...jh(),...i.genome},tier:i.tier,adapt:{...il(),...i.adapt},bones:i.bones,boneGoal:i.boneGoal,health:i.health,hunger:i.hunger,clock:i.clock,stats:{...E.stats,...i.stats},journal:new Set(i.journal),victory:!!i.victory,keepExploring:!!i.keepExploring}),E.player.x=E.player.z=0,Q("#creature-name").value=E.name,E.creatorMode="new",ha(!0);for(let e of i.allies||[]){let t=E.species[e];if(!t)continue;let n=Ip(t,(Math.random()-.5)*6,(Math.random()-.5)*6);zp(n,!0)}Yh(),lt(`Welcome back, ${E.name}. Day ${Math.floor(E.clock/ea)+1} on ${cn[E.planet].name}.`,"good")}}function wp(){n0(),E.paused=!1,ln(".modal").forEach(i=>i.classList.add("hidden")),Qi(!1),Lp(),E.genome=jh(),Q("#creature-name").value="Pip",E.health=100,ha(!1),ol("planet"),al()}function nl(i){E.screen==="play"&&(!Q("#evolve-modal").classList.contains("hidden")||!Q("#victory-modal").classList.contains("hidden")||(E.paused=i,Qh(),i&&(Qi(!1),Zg()),Q("#pause-modal").classList.toggle("hidden",!i),i&&Q("#resume-btn").focus()))}function Zg(){let i=E.stats,e=[[`${E.tier}/${Ks}`,"EVOLUTIONS"],[E.journal.size+"/"+E.species.length,"SPECIES"],[i.friends,"BEFRIENDED"],[i.defeats,"DEFEATED"]];Q("#journal-summary").innerHTML=e.map(([t,n])=>`<div><b>${t}</b><small>${n}</small></div>`).join(""),Q("#journal-list").innerHTML=E.species.map(t=>E.journal.has(t.id)?`<div class="journal-entry"><i style="background:${t.genome.color}"></i><div><strong>${t.name.toUpperCase()}</strong><em class="${t.temper}">${Jr[t.temper].label}</em><p>${Lg(t)}</p></div></div>`:'<div class="journal-entry unknown"><i style="background:#bbb"></i><div><strong>UNKNOWN SPECIES</strong><p>Explore further to observe it.</p></div></div>').join("")}function Zh(){if(E.bones<E.boneGoal||E.screen!=="play"||E.paused)return;Qi(!1),E.paused=!0,Qh();let i=sa(77+E.tier*13+E.planet),e=el.filter(t=>E.adapt[t.id]<bg).sort(()=>i()-.5).slice(0,3);if(!e.length){E.paused=!1,lt("Every adaptation is maxed out. You are complete.","good");return}Q("#evolve-eyebrow").textContent=E.tier>=Ks?"BONUS EVOLUTION":`EVOLUTION ${E.tier+1} OF ${Ks}`,Q("#evolve-title").textContent="Choose an adaptation",Q("#evolve-sub").textContent="Your discoveries have unlocked a permanent trait.",Q("#evolution-options").innerHTML=e.map(t=>`<button class="evolution-option" data-id="${t.id}"><span aria-hidden="true">${t.icon}</span><strong>${t.name} \xB7 RANK ${E.adapt[t.id]+1}</strong><small>${t.text}</small></button>`).join(""),ln(".evolution-option").forEach(t=>t.addEventListener("click",()=>Dp(el.find(n=>n.id===t.dataset.id)))),Q("#evolve-modal").classList.remove("hidden"),Q(".evolution-option").focus()}function Dp(i){E.tier++,E.adapt[i.id]++,E.bones-=E.boneGoal,E.boneGoal+=2;let e=Ai();E.health=e,ll(),jn.evolve();let t=Ye.position;if(oi.burst(t.x,t.y+2,t.z,15204208,40,6,5),tl(E.species[5],Math.random,30),er(),E.tier>=Ks&&!E.victory){Q("#evolve-modal").classList.add("hidden"),Jg();return}Q("#evolve-eyebrow").textContent=`EVOLUTION ${E.tier} COMPLETE`,Q("#evolve-title").textContent=`${i.name} awakened`,Q("#evolve-sub").textContent=`You now have ${Ki()} genes (+10). Reshape your body in the Birth Pool, or head straight back out.`,Q("#evolution-options").innerHTML=`
    <button class="evolution-option" data-next="reshape"><span aria-hidden="true">\u{1F9EC}</span><strong>RESHAPE</strong><small>Spend your new genes on diet, body, and limbs.</small></button>
    <button class="evolution-option wide" data-next="wild"><span aria-hidden="true">\u{1F33F}</span><strong>BACK TO THE WILD</strong><small>Keep your current form. You can reshape at your next evolution.</small></button>`,ln("[data-next]").forEach(n=>n.addEventListener("click",()=>{Q("#evolve-modal").classList.add("hidden"),n.dataset.next==="reshape"?Rp("evolve"):(E.paused=!1,Qr(),lt(`Evolution ${E.tier}: ${i.name} rank ${E.adapt[i.id]}!`,"good"))})),Q(".evolution-option").focus(),Qr()}function Jg(){E.victory=!0,E.paused=!0;let i=E.stats,e=cn[E.planet];Q("#victory-title").textContent=`Apex of ${e.name}`;let t=E.entities.filter(n=>n.ally&&!n.dead).length;Q("#victory-sub").textContent=`${E.name} has evolved five times and now shapes life on ${e.name}. ${t?`A pack of ${t} runs at your side.`:"You made it alone \u2014 a true solitary apex."}`,Q("#victory-stats").innerHTML=[[Math.floor(i.time/60)+"m","EXPEDITION"],[i.friends,"BEFRIENDED"],[i.defeats,"DEFEATED"],[`${E.journal.size}/${E.species.length}`,"SPECIES"]].map(([n,r])=>`<div><b>${n}</b><small>${r}</small></div>`).join(""),Q("#victory-modal").classList.remove("hidden"),Q("#keep-exploring").focus(),er()}function Jh(i,e){let t=null,n=e;for(let r of E.entities){if(!i(r))continue;let s=ft(r.x,r.z,E.player.x,E.player.z);s<n&&(n=s,t=r)}return t}var $h=i=>i.type==="creature"&&!i.dead&&!i.ally,$g=i=>(i.type==="bone"||i.type==="food")&&!i.taken;function Zs(i){E.screen!=="play"||E.paused||(i==="collect"?Kg():i==="friend"?Pe.active?Bp():Fp():i==="attack"&&Qg())}function Kg(){let i=Jh($g,3.8);if(!i){lt("Move closer to food or a glowing bone");return}if(i.type==="bone"){i.taken=!0,i.mesh.visible=!1,Kh("Evolution bone collected!"),jn.pickup(),oi.burst(i.x,i.mesh.position.y,i.z,15204208,18);return}if(!qh(i.kind)){lt(`Your ${In.diet[E.genome.diet][0].toLowerCase()} gut can't digest that`,"bad");return}i.taken=!0,i.mesh.visible=!1;let e=E.genome.diet,t=e===1||E.adapt.gut>=2&&!(e===0&&i.kind==="plant"||e===2&&i.kind==="meat")?24:i.kind==="meat"?36:30;E.hunger=Math.min(100,E.hunger+t),E.health=Math.min(Ai(),E.health+8),jn.eat(),oi.burst(i.x,i.mesh.position.y,i.z,i.kind==="plant"?10216299:16751226,10,2,2),lt(i.kind==="plant"?`Fruit! +${t} hunger`:`Protein! +${t} hunger`)}function Kh(i){E.bones++,E.stats.bones++,i&&lt(E.bones===E.boneGoal?"Your DNA is ready \u2014 press V to evolve!":i,"good"),Qr()}function Qg(){if(Ue.attackCd>0)return;Ue.attackCd=.5,Ue.lunge=1;let i=Jh($h,3.4+$r());if(jn.bite(),!i)return;let e=aa().attack+Math.floor(Math.random()*3);Np(i,e,!0)}function Np(i,e,t){i.hp-=e,i.provoked=12,i.pop=1,oi.burst(i.x,i.mesh.position.y+1.5*i.sp.size,i.z,16777215,8,3,2);for(let n of E.entities)n!==i&&$h(n)&&n.sp===i.sp&&ft(n.x,n.z,i.x,i.z)<12&&(n.provoked=10);i.hp>0||(i.dead=!0,i.dying=.45,E.stats.defeats++,Zr("food",i.x,i.z,"meat"),Kh(`${i.sp.name} defeated. DNA gained.`),t&&E.target===i&&(E.target=null))}var Pe={active:!1,target:null,angle:0,speed:3.4,zone:0,width:1,hits:0,misses:0,flash:0,flashColor:""},Up=Q("#call-canvas"),e0=Up.getContext("2d");function Fp(){let i=Jh($h,5.5);if(!i){lt("Get closer to a wild creature to call to it");return}if(E.entities.filter(t=>t.ally&&!t.dead).length>=kh()){lt(`Your pack is full (${kh()}). Evolve Kindred Call for more room.`,"bad");return}if(i.callCd>0){lt(`${i.sp.name} is ignoring you for now`);return}if(i.mode==="chase"&&i.provoked>0){lt(`${i.sp.name} is too riled up to listen!`,"bad");return}let e=aa().social;Object.assign(Pe,{active:!0,target:i,angle:-Math.PI/2,hits:0,misses:0,flash:0,speed:3.2+(Jr[i.sp.temper].hostile?.8:0)+E.tier*.1,width:Rn(Jr[i.sp.temper].window+e*.045+E.adapt.kindred*.18,.45,2.2)}),Pe.zone=Pe.angle+1.6+Math.random()*2.4,i.mode="listen",Q("#call").classList.remove("hidden"),Q("#call-text").innerHTML=`Calling ${i.sp.name}: press <b>F</b> in the green`}function Op(){let i=ta(Pe.zone,Pe.angle);return Math.abs(i)<=Pe.width/2}function Bp(){if(Pe.active){if(Op()){if(jn.beat(Pe.hits),Pe.hits++,Pe.flash=1,Pe.flashColor="#d5f164",oi.burst(Pe.target.x,Pe.target.mesh.position.y+2.2,Pe.target.z,16747473,6,1.5,2),Pe.hits>=3){zp(Pe.target),Qi(!0);return}Pe.zone=Pe.angle+1.4+Math.random()*2.8}else if(jn.miss(),Pe.misses++,Pe.flash=1,Pe.flashColor="#ff7058",Pe.misses>=2){let i=Pe.target;Qi(!1),i.callCd=8,Jr[i.sp.temper].hostile?(i.provoked=8,lt(`${i.sp.name} took that as a threat!`,"bad")):(i.provoked=5,lt(`${i.sp.name} lost interest.`,"bad"))}}}function Qi(){Pe.target&&Pe.target.mode==="listen"&&(Pe.target.mode="wander"),Pe.active=!1,Pe.target=null,Q("#call").classList.add("hidden")}function t0(i){if(!Pe.active)return;Pe.angle+=Pe.speed*i,Pe.flash=Math.max(0,Pe.flash-i*3);let e=e0,t=Up.width,n=t/2,r=t*.36;e.clearRect(0,0,t,t),e.lineCap="round",e.lineWidth=22,e.strokeStyle="rgba(7,27,25,.6)",e.beginPath(),e.arc(n,n,r,0,nt),e.stroke(),e.strokeStyle="#7fffc4",e.beginPath(),e.arc(n,n,r,Pe.zone-Pe.width/2,Pe.zone+Pe.width/2),e.stroke(),e.fillStyle="#fff";let s=n+Math.cos(Pe.angle)*r,a=n+Math.sin(Pe.angle)*r;e.beginPath(),e.arc(s,a,16,0,nt),e.fill(),Pe.flash>0&&(e.globalAlpha=Pe.flash,e.fillStyle=Pe.flashColor,e.beginPath(),e.arc(n,n,r-26,0,nt),e.fill(),e.globalAlpha=1);for(let c=0;c<3;c++)e.fillStyle=c<Pe.hits?"#d5f164":"rgba(255,255,255,.3)",e.beginPath(),e.arc(n+(c-1)*34,n,11,0,nt),e.fill();e.fillStyle="#ff7058";for(let c=0;c<Pe.misses;c++)e.beginPath(),e.arc(n+(c-.5)*26,n+40,6,0,nt),e.fill();let o=Pe.target;(!o||o.dead||ft(o.x,o.z,E.player.x,E.player.z)>8)&&(Qi(),lt("The call faded."))}function zp(i,e=!1){i.ally=!0,i.mode="follow",i.provoked=0,!e&&(E.stats.friends++,jn.friend(),oi.burst(i.x,i.mesh.position.y+2,i.z,16747473,22,3,4),Kh(`${i.sp.name} joined your pack!`),er())}var jt={x:0,y:0,id:null,sprint:!1};addEventListener("keydown",i=>{if(!(i.target instanceof HTMLInputElement)){if(i.code==="Escape"&&E.screen==="play"){i.preventDefault(),nl(!E.paused);return}if(i.code==="KeyM"&&E.screen==="play"){Xp();return}E.screen!=="play"||E.paused||($t[i.code]=!0,["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(i.code)&&i.preventDefault(),!i.repeat&&(i.code==="KeyE"&&Zs("collect"),i.code==="KeyF"&&Zs("friend"),i.code==="Space"&&Zs("attack"),i.code==="KeyV"&&Zh()))}});addEventListener("keyup",i=>{$t[i.code]=!1});addEventListener("blur",Qh);document.addEventListener("visibilitychange",()=>{document.hidden&&E.screen==="play"&&!E.paused&&nl(!0)});_n.addEventListener("pointerdown",i=>{E.screen==="play"&&(Ue.dragging=!0,Ue.lastX=i.clientX,Ue.lastY=i.clientY,_n.setPointerCapture(i.pointerId),_n.classList.add("looking"))});_n.addEventListener("pointermove",i=>{if(!Ue.dragging)return;let e=i.clientX-Ue.lastX,t=i.clientY-Ue.lastY;Ue.lastX=i.clientX,Ue.lastY=i.clientY,Ue.yaw-=e*.006,Ue.pitch=Rn(Ue.pitch+t*.004,.12,.85)});var Gp=i=>{Ue.dragging=!1,_n.hasPointerCapture(i.pointerId)&&_n.releasePointerCapture(i.pointerId),_n.classList.remove("looking")};_n.addEventListener("pointerup",Gp);_n.addEventListener("pointercancel",Gp);_n.addEventListener("wheel",i=>{E.screen==="play"&&(Ue.distance=Rn(Ue.distance+Math.sign(i.deltaY),6.5,16),i.preventDefault())},{passive:!1});function Qh(){for(let i of Object.keys($t))$t[i]=!1;Ue.dragging=!1,jt.x=jt.y=0,_n.classList.remove("looking")}function kp(){document.body.classList.add("touch-mode")}matchMedia("(pointer: coarse)").matches&&kp();addEventListener("touchstart",kp,{once:!0,passive:!0});var Kr=Q("#stick"),Vp=Q("#stick-knob");Kr.addEventListener("pointerdown",i=>{jt.id=i.pointerId,Kr.setPointerCapture(i.pointerId),Wp(i)});Kr.addEventListener("pointermove",i=>{i.pointerId===jt.id&&Wp(i)});var Hp=()=>{jt.id=null,jt.x=jt.y=0,Vp.style.transform=""};Kr.addEventListener("pointerup",Hp);Kr.addEventListener("pointercancel",Hp);function Wp(i){let e=Kr.getBoundingClientRect(),t=e.width/2,n=i.clientX-(e.left+t),r=i.clientY-(e.top+t),s=Math.hypot(n,r);s>t&&(n*=t/s,r*=t/s),jt.x=n/t,jt.y=-r/t,Vp.style.transform=`translate(${n}px, ${r}px)`}ln(".touch-actions button").forEach(i=>i.addEventListener("pointerdown",e=>{e.preventDefault();let t=i.dataset.action;t==="sprint"?(jt.sprint=!jt.sprint,i.classList.toggle("on",jt.sprint)):Zs(t)}));function Xp(){Pn.muted=!Pn.muted;try{localStorage.setItem("oddkin-muted",Pn.muted?"1":"0")}catch{}jp()}function jp(){let i=Q("#mute-btn");i.setAttribute("aria-pressed",String(Pn.muted)),i.setAttribute("aria-label",Pn.muted?"Unmute sound":"Mute sound")}function er(){if(!(E.screen!=="play"&&E.creatorMode!=="evolve"))try{localStorage.setItem(Xh,JSON.stringify({v:2,planet:E.planet,name:E.name,genome:E.genome,tier:E.tier,adapt:E.adapt,bones:E.bones,boneGoal:E.boneGoal,health:Math.round(E.health),hunger:Math.round(E.hunger),clock:E.clock,stats:E.stats,journal:[...E.journal],victory:E.victory,keepExploring:E.keepExploring,allies:E.entities.filter(i=>i.ally&&!i.dead).map(i=>i.sp.id)}))}catch{}}function qp(){try{let i=JSON.parse(localStorage.getItem(Xh));return i&&i.v===2&&cn[i.planet]?i:null}catch{return null}}function n0(){try{localStorage.removeItem(Xh)}catch{}}function Yp(){let i=qp();Q("#continue-btn").classList.toggle("hidden",!i),i&&(Q("#continue-label").textContent=`${i.name.toUpperCase()} \xB7 ${cn[i.planet].name.toUpperCase()} \xB7 TIER ${i.tier}`)}function lt(i,e=""){let t=Q("#toast");t.textContent=i,t.className=`toast show ${e}`,clearTimeout(lt.t),lt.t=setTimeout(()=>t.classList.remove("show"),2600)}function Qr(){let i=Ai();Q("#hud-name").textContent=E.name.toUpperCase(),Q("#hud-diet").textContent=In.diet[E.genome.diet][0].toUpperCase(),Q("#hud-tier").textContent=E.victory?"APEX SPECIES":`EVOLUTION ${E.tier} OF ${Ks}`,Q("#pack-count").textContent=E.entities.filter(n=>n.ally&&!n.dead).length,Q("#pack-max").textContent=kh(),Q("#bone-count").textContent=E.bones,Q("#bone-goal").textContent=E.boneGoal;let e=Math.min(E.bones,E.boneGoal),t=e>=E.boneGoal;Q("#objective-progress").style.width=`${e/E.boneGoal*100}%`,Q("#objective-text").textContent=t?"Your DNA is ready \u2014 evolve!":E.victory?"Apex reached. The world is yours to explore.":e===0&&E.tier===0?"Find your first bone":`Gather ${E.boneGoal-e} more evolution bone${E.boneGoal-e===1?"":"s"}`,Q("#evolve-btn").classList.toggle("hidden",!t),Q(".bones").classList.toggle("ready",t),Q("#health-bar").style.width=`${E.health/i*100}%`,Q("#health-text").textContent=Math.ceil(E.health),Q("#hunger-bar").style.width=`${E.hunger}%`,Q("#hunger-text").textContent=Math.ceil(E.hunger),Q("#hunger-bar").style.background=E.hunger<25?"var(--coral)":""}var Nh="";function i0(){let i=E.target,e=Q("#target-card");if(!i){e.classList.add("hidden"),Nh="";return}e.classList.remove("hidden");let t=i.type==="creature",n=Q("#target-hp");n.classList.toggle("hidden",!t),t&&(n.firstElementChild.style.width=`${Math.max(0,i.hp/i.maxHp)*100}%`);let r=t?`${i.sp.id}:${i.mode}:${i.provoked>0}`:`${i.type}:${i.kind}`;if(r!==Nh)if(Nh=r,i.type==="bone")Q("#target-kind").textContent="ANCIENT REMAINS",Q("#target-name").textContent="EVOLUTION BONE",Q("#target-mood").textContent="Glowing with old DNA",Q("#target-actions").innerHTML="<b>E</b> Collect",e.classList.remove("hostile");else if(i.type==="food"){let s=qh(i.kind);Q("#target-kind").textContent="EDIBLE FIND",Q("#target-name").textContent=i.kind==="plant"?"WILD FRUIT":"FRESH MEAT",Q("#target-mood").textContent=s?"You can digest this":`Your ${In.diet[E.genome.diet][0].toLowerCase()} gut can't digest this`,Q("#target-actions").innerHTML=s?"<b>E</b> Eat":"",e.classList.toggle("hostile",!s)}else{let s=Jr[i.sp.temper],a=i.mode==="chase"||s.hostile&&i.provoked>0;Q("#target-kind").textContent=`${s.label} \xB7 ${In.diet[i.sp.genome.diet][0].toUpperCase()}`,Q("#target-name").textContent=i.sp.name.toUpperCase(),Q("#target-mood").textContent=a?"Hostile \u2014 it will attack!":i.mode==="flee"?"Fleeing":s.mood,Q("#target-actions").innerHTML="<b>F</b> Call <b>SPACE</b> Bite",e.classList.toggle("hostile",a)}}var Zp=Q("#radar"),mt=Zp.getContext("2d");function r0(){let i=Zp.width,e=i/2,t=Pg();mt.clearRect(0,0,i,i),mt.save(),mt.beginPath(),mt.arc(e,e,e-2,0,nt),mt.clip(),mt.strokeStyle="rgba(255,255,255,.12)",mt.lineWidth=2;for(let a of[.33,.66])mt.beginPath(),mt.arc(e,e,(e-2)*a,0,nt),mt.stroke();let n=Math.cos(Ue.yaw),r=Math.sin(Ue.yaw),s=(a,o,c,l)=>{let h=a-E.player.x,u=o-E.player.z,p=h*n-u*r,d=h*r+u*n,f=p/t*(e-10),m=d/t*(e-10),_=Math.hypot(f,m);if(_>e-10){if(c!=="#e7ff70")return;f*=(e-10)/_,m*=(e-10)/_,l*=.7}mt.fillStyle=c,mt.beginPath(),mt.arc(e+f,e+m,l,0,nt),mt.fill()};s(0,0,"rgba(213,241,100,.35)",Qs/t*(e-10));for(let a of E.entities)a.type==="bone"&&!a.taken?s(a.x,a.z,"#e7ff70",7):a.type==="food"&&!a.taken&&qh(a.kind)?s(a.x,a.z,"rgba(255,255,255,.55)",3.5):a.type==="creature"&&!a.dead&&s(a.x,a.z,a.ally?"#7fffc4":a.sp.temper==="predator"?"#ff7058":a.sp.temper==="territorial"?"#f1bd54":"#cfe7ff",6);mt.restore(),mt.fillStyle="#fff",mt.beginPath(),mt.moveTo(e,e-12),mt.lineTo(e-8,e+8),mt.lineTo(e+8,e+8),mt.closePath(),mt.fill()}function Vh(i,e,t=.5){return la.some(n=>Math.hypot(i-n.x,e-n.z)<n.r+t)}var Uh=0,Ap=0,qs=0,Fh=0,Oh=0;function Hh(i,e){let t=Math.max(1,i*Math.pow(.75,E.adapt.thorn));E.health=Math.max(0,E.health-t),Q("#vignette").classList.add("hurt"),clearTimeout(Ap),Ap=setTimeout(()=>Q("#vignette").classList.remove("hurt"),220),E.health<=0&&s0(e)}function s0(i){let e=Math.floor(E.bones/2);E.bones-=e,E.health=Ai()*.6,E.hunger=Math.max(E.hunger,55),E.player.x=E.player.z=0,Ue.velocity.set(0,0,0),Qi();for(let t of E.entities)t.type==="creature"&&t.mode==="chase"&&(t.mode="wander",t.provoked=0);jn.hurt(),lt(`${i} You woke at the nest${e?` and dropped ${e} bone${e>1?"s":""}`:""}.`,"bad"),Qr()}function Wh(i){let e=cn[E.planet];E.screen==="play"&&!E.paused&&(E.clock+=i);let t=E.clock/ea%1,n=Math.sin(t*nt),r=Bh(n+.3,-.1,.4)*e.dayLight;Ft.day=r;let s=new xe(e.nightSky),a=new xe(e.sky);if(Ci.background.copy(s).lerp(a,Math.min(1,r)),Ci.fog.color.copy(new xe(e.nightFog)).lerp(new xe(e.fog),Math.min(1,r)),Ft.hemi){Ft.hemi.intensity=Js(.75,2.2,Math.min(1,r)),Ft.sun.intensity=Js(.35,3.2,Math.min(1,r)),Ft.sun.color.set(r>.5?16773314:16762784).lerp(new xe(10466559),1-Math.min(1,r*1.6));let u=E.screen==="play"?E.player.x:0,p=E.screen==="play"?E.player.z:0,d=t*nt;Ft.sun.position.set(u+Math.cos(d)*45,Math.max(18,Math.abs(Math.sin(d))*60),p+28),Ft.sun.target.position.set(u,0,p)}kg.material.opacity=Rn(1-r*1.6,0,1),wi&&(wi.material.opacity=.2+(1-r)*.3);let o=Math.floor(E.clock/ea)+1,c=r>.8?"DAY":r<.2?"NIGHT":Math.cos(t*nt)>0?"DAWN":"DUSK",l=`DAY ${o} \xB7 ${c}${r<.2?" \xB7 PREDATORS PROWL":""}`;l!==Wh.last&&(Q("#clock-label").textContent=l,Wh.last=l);let h=r<.35||E.adapt.senses>0;for(let u of E.entities)u.type==="bone"&&u.mesh.userData.beam&&(u.mesh.userData.beam.visible=h&&!u.taken)}function a0(i,e){let t=Pe.active,n=t?0:($t.KeyD||$t.ArrowRight?1:0)-($t.KeyA||$t.ArrowLeft?1:0)+jt.x,r=t?0:($t.KeyW||$t.ArrowUp?1:0)-($t.KeyS||$t.ArrowDown?1:0)+jt.y,s=Math.min(1,Math.hypot(n,r)),a=new C(-Math.sin(Ue.yaw),0,-Math.cos(Ue.yaw)),o=new C(-a.z,0,a.x),c=new C().addScaledVector(a,r).addScaledVector(o,n);c.lengthSq()>0&&c.normalize().multiplyScalar(s);let l=($t.ShiftLeft||$t.ShiftRight||jt.sprint)&&s>.1,h=aa(),u=(l?9.2:5.4)*(1+E.adapt.fleet*.18)*(.84+h.speed*.03);Ue.velocity.lerp(c.multiplyScalar(u),1-Math.exp(-(s>0?11:8)*i)),Ue.velocity.length()<.035&&Ue.velocity.set(0,0,0);let p=.45*$r(),d=E.player.x+Ue.velocity.x*i,f=E.player.z+Ue.velocity.z*i;Math.hypot(d,E.player.z)<Ys&&!Vh(d,E.player.z,p)?E.player.x=d:Ue.velocity.x=0,Math.hypot(E.player.x,f)<Ys&&!Vh(E.player.x,f,p)?E.player.z=f:Ue.velocity.z=0,Math.hypot(d,f)>=Ys-.5&&s>0&&qs<=0&&(lt("The wilds end here \u2014 turn back."),qs=3);let m=Ue.velocity.length();if(m>.2){let S=Math.atan2(-Ue.velocity.x,-Ue.velocity.z);Ye.rotation.y+=ta(Ye.rotation.y,S)*(1-Math.exp(-13*i))}else if(t&&Pe.target){let S=Math.atan2(-(Pe.target.x-E.player.x),-(Pe.target.z-E.player.z));Ye.rotation.y+=ta(Ye.rotation.y,S)*(1-Math.exp(-8*i))}let _=Math.min(1.2,m/5.4);sl(Ye,e,_),Ue.lunge=Math.max(0,Ue.lunge-i*4),Ue.attackCd=Math.max(0,Ue.attackCd-i);let g=Math.sin(Ue.lunge*Math.PI)*.6;Ye.position.set(E.player.x-Math.sin(Ye.rotation.y)*g,Pt(E.player.x,E.player.z),E.player.z-Math.cos(Ye.rotation.y)*g);let v=cn[E.planet],x=(s>0?l?.72:.38:.19)*v.hunger*Math.pow(.75,E.adapt.gut);E.hunger=Math.max(0,E.hunger-i*x),E.hunger===0&&Hh(i*4,"Hunger got the better of you.");let b=Math.hypot(E.player.x,E.player.z)<Qs;b?E.health=Math.min(Ai(),E.health+i*8):E.hunger>60&&(E.health=Math.min(Ai(),E.health+i*.6)),qs-=i;for(let S of ca)ft(E.player.x,E.player.z,S.x,S.z)<S.r&&(Hh(i*16,"The lava was too much."),Math.random()<i*20&&oi.burst(E.player.x,Ye.position.y+.3,E.player.z,16753216,2,1.5,2),qs<=0&&(lt("Too hot! Get out of the lava!","bad"),qs=2.5));return{sprinting:l,atNest:b}}function o0(i,e,t){let n=E.player.x,r=E.player.z,s=Ft.day<.35,a=[],o=null,c=5.2,l=null,h=12;for(let u of E.entities){if(u.type==="bone"||u.type==="food"){if(u.taken)continue;u.mesh.rotation.y+=i*(u.type==="bone"?1:.55),u.mesh.position.y=Pt(u.x,u.z)+(u.type==="bone"?.6:.35)+Math.sin(e*2+u.phase)*(u.type==="bone"?.15:.06);let b=ft(u.x,u.z,n,r);b<c&&(c=b,o=u);continue}if(u.dead){u.dying>0&&(u.dying-=i,u.mesh.scale.setScalar(Math.max(.01,u.sp.size*(u.dying/.45))),u.dying<=0&&(u.mesh.visible=!1,At.remove(u.mesh)));continue}u.cd=Math.max(0,u.cd-i),u.callCd=Math.max(0,u.callCd-i),u.provoked=Math.max(0,u.provoked-i),u.pop=Math.max(0,u.pop-i*5);let p=n-u.x,d=r-u.z,f=Math.hypot(p,d),m=Math.atan2(p,d),_=u.sp,g=_.temper,v=null,x=0;if(!u.mesh.visible&&f<90&&(u.mesh.visible=!0),f>95){u.mesh.visible=!1;continue}if(u.ally){a.push(u);let b=u.foe&&!u.foe.dead&&ft(u.foe.x,u.foe.z,n,r)<16?u.foe:null;if(b){let S=ft(b.x,b.z,u.x,u.z);v=Math.atan2(b.x-u.x,b.z-u.z),x=S>1.8+b.sp.size?_.speed*1.5:0,S<2.2+b.sp.size&&u.cd<=0&&(u.cd=1.1,u.pop=1,Np(b,2+E.adapt.fang*2+Math.round(_.attack*.3),!1))}else{let S=a.length*1.3,y=n+Math.sin(Ye.rotation.y+2.4+S)*3.2,P=r+Math.cos(Ye.rotation.y+2.4+S)*3.2,F=ft(y,P,u.x,u.z);F>1&&(v=Math.atan2(y-u.x,P-u.z),x=Math.min(_.speed*1.8,F*1.6)),f>40&&(u.x=n+(Math.random()-.5)*4,u.z=r+(Math.random()-.5)*4)}}else if(u.mode==="listen")v=null,u.angle+=ta(u.angle,m)*(1-Math.exp(-6*i));else{let b="wander",S=ft(u.x,u.z,u.homeX,u.homeZ);if(g==="predator"){let y=(10+E.tier*1.5)*(s?1.5:1)*(t.sprinting?1.2:1);(f<y||u.provoked>0&&f<30)&&!t.atNest&&(b="chase")}else if(g==="territorial")(ft(n,r,u.homeX,u.homeZ)<7||u.provoked>0)&&!t.atNest&&f<20&&(b="chase");else if(g==="timid"){let y=(t.sprinting?10:6)+(E.genome.diet===2?3:0);(f<y||u.provoked>0)&&(b="flee")}else g==="curious"&&(u.provoked>0?b="flee":f<12&&f>3.4?b="approach":f<=3.4&&(b="idle"));b==="chase"&&ft(u.x,u.z,0,0)<Qs+1.5&&(b="wander"),u.mode=b,b==="chase"?(v=m,x=f>1.8+_.size?_.speed*(1+E.tier*.06)*(s?1.1:1):0,f<2.3+_.size*.8&&u.cd<=0&&(u.cd=1.25,u.pop=1,jn.hurt(),Hh(_.attack*(1+E.tier*.12),`${_.name} knocked you out!`),oi.burst(n,Ye.position.y+1.4,r,16740440,8,3,2)),(!l||f<h)&&(l=u,h=f)):b==="flee"?(v=m+Math.PI,x=_.speed):b==="approach"?(v=m,x=_.speed*.5):b==="wander"&&(u.turnT-=i,u.turnT<=0&&(u.turnT=2+Math.random()*4,u.wanderAngle=S>8?Math.atan2(u.homeX-u.x,u.homeZ-u.z):Math.random()*nt,u.resting=Math.random()<.35),v=u.wanderAngle,x=u.resting?0:_.speed*.3)}if(v!=null&&(u.angle+=ta(u.angle,v)*(1-Math.exp(-5*i))),x>0){let b=u.x+Math.sin(u.angle)*x*i,S=u.z+Math.cos(u.angle)*x*i;Vh(b,S,.4*_.size)||Math.hypot(b,S)>Ys-1||ca.some(P=>ft(b,S,P.x,P.z)<P.r+1)?(u.angle+=1.4,u.turnT=0):(u.x=b,u.z=S)}u.stride=Js(u.stride,Math.min(1.2,x/4),1-Math.exp(-8*i)),u.mesh.position.set(u.x,Pt(u.x,u.z),u.z),u.mesh.rotation.y=u.angle+Math.PI,u.mesh.scale.setScalar(_.size*(1+u.pop*.12)),sl(u.mesh,e,u.stride,u.offset),!u.ally&&f<c&&(c=f,o=u)}for(let u of a)(!u.foe||u.foe.dead)&&(u.foe=l||(E.target&&E.target.type==="creature"&&E.target.provoked>0&&!E.target.ally?E.target:null));E.target=o}function l0(){for(let i of E.entities)i.type!=="creature"||i.dead||E.journal.has(i.sp.id)||ft(i.x,i.z,E.player.x,E.player.z)<14&&(E.journal.add(i.sp.id),jn.discover(),lt(`New species logged: ${i.sp.name} (${Jr[i.sp.temper].label.toLowerCase()})`,i.sp.temper==="predator"?"bad":""))}function c0(i){if(Oh-=i,Oh>0)return;Oh=15;let e=Math.random;E.entities=E.entities.filter(s=>(s.type==="bone"||s.type==="food")&&s.taken?(At.remove(s.mesh),!1):!(s.type==="creature"&&s.dead&&s.dying<=0));let t=()=>{for(let s=0;s<20;s++){let a=ra(e,10,78,6);if(ft(a.x,a.z,E.player.x,E.player.z)>25)return a}return ra(e,10,78,6)},n=s=>E.entities.filter(a=>a.type===s&&!a.taken).length;for(;n("bone")<8;){let s=t();Zr("bone",s.x,s.z)}if(n("food")<30)for(let s=0;s<6;s++){let a=t();Zr("food",a.x,a.z,e()>.65?"meat":"plant")}E.entities.filter(s=>s.type==="creature"&&!s.dead&&!s.ally).length<22&&tl($i(e,E.species),e,30)}function h0(i,e){if(E.screen!=="play"||E.paused||!Ye)return;E.stats.time+=i;let t=a0(i,e);o0(i,e,t),l0(),c0(i),t0(i),i0(),Uh-=i,Uh<=0&&(Uh=.1,r0(),Qr()),Fh-=i,Fh<=0&&(Fh=10,er())}var Cp=performance.now(),Jp=0;function $p(i){requestAnimationFrame($p),Jp++;let e=Math.min((i-Cp)/1e3,.05);Cp=i;let t=i/1e3;if(Wh(e),h0(e,t),oi.update(e),wi&&(wi.rotation.z+=e*.1),E.screen==="play"&&Ye){let n=Pt(E.player.x,E.player.z)+1.45*$r()+.2,r=new C(E.player.x,n,E.player.z),s=Ue.distance*(.9+$r()*.12),a=Math.cos(Ue.pitch)*s,o=new C(r.x+Math.sin(Ue.yaw)*a,r.y+Math.sin(Ue.pitch)*s,r.z+Math.cos(Ue.yaw)*a);o.y=Math.max(o.y,Pt(o.x,o.z)+1.1),Ei.position.lerp(o,1-Math.exp(-7*e)),Ei.lookAt(r.add(Ue.velocity.clone().multiplyScalar(.22)))}else Ye&&E.screen==="planet"&&sl(Ye,t,0),Ei.position.set(Math.sin(t*.08)*18,10,Math.cos(t*.08)*18),Ei.lookAt(0,1.5,0);qn.render(Ci,Ei),zg(t)}addEventListener("resize",()=>{Ei.aspect=innerWidth/innerHeight,Ei.updateProjectionMatrix(),qn.setSize(innerWidth,innerHeight,!1)});qn.setSize(innerWidth,innerHeight,!1);location.hash==="#debug"&&(window.oddkin={state:E,call:Pe,interact:Zs,openEvolution:Zh,applyEvolution:Dp,startCall:Fp,callPress:Bp,inZone:Op,ADAPTATIONS:el,frames:()=>Jp});Bg();Dg();ha(!1);requestAnimationFrame($p);})();
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
