import { useEffect, useRef } from 'react';
import authImage from '../../assets/auth/login-aurora.png';
import dashboardImage from '../../assets/reference/dashboard-reference.jpg';
import './ArtworkMotion.css';

const vertex = `attribute vec2 p; varying vec2 uv; void main(){ uv=vec2(p.x*.5+.5,.5-p.y*.5); gl_Position=vec4(p,0.,1.); }`;
const fragment = `precision highp float; varying vec2 uv; uniform sampler2D image; uniform vec4 crop; uniform float time, motion, aspect, height, bubbleCount, bubbleSpeed, hover; uniform vec2 face, pointer; uniform float radius; uniform vec3 jelly1, jelly2, accent, glowTint, bubbleTint; uniform vec3 taps[4];
void main(){
 vec2 pos=crop.xy+uv*crop.zw;
 float safe=smoothstep(radius,radius*2.,distance(pos,face));
 // Keep hair and fabric almost still; broad warping makes the portrait stretch.
 vec2 drift=vec2(sin(pos.y*18.+time*.6),cos(pos.x*15.+time*.5))*.0012*safe;
 vec2 a=pos-jelly1.xy,b=pos-jelly2.xy;
 // Confine displacement to each jellyfish instead of pulling adjacent hair.
 float g1=exp(-dot(a,a)/(jelly1.z*jelly1.z))* (1.-smoothstep(jelly1.z,jelly1.z*1.6,length(a)));
 float g2=exp(-dot(b,b)/(jelly2.z*jelly2.z))* (1.-smoothstep(jelly2.z,jelly2.z*1.6,length(b)));
 float p1=sin(time*1.5),p2=sin(time*1.2+2.);
 drift+=(a*g1*p1+b*g2*p2)*.16*safe;
 vec2 mouseDelta=(uv-pointer)*vec2(aspect,1.);
 float mouseGlow=exp(-dot(mouseDelta,mouseDelta)/.0144)*hover;
 drift+=(pointer-uv)*crop.zw*.05*mouseGlow*safe;
 float rippleLight=0.;
 for(int i=0;i<4;i++){
   float age=time-taps[i].z;
   if(age>=0. && age<3.){
     vec2 delta=(uv-taps[i].xy)*vec2(aspect,1.);
     float distance=length(delta), wave=distance-age*.22;
     float envelope=exp(-wave*wave*196.)*(1.-age/3.);
     vec2 direction=delta/max(distance,.001);
     drift+=direction/vec2(aspect,1.)*crop.zw*sin(wave*60.)*.012*envelope*mix(.15,1.,safe);
     rippleLight+=envelope*.3;
   }
 }
 vec3 col=texture2D(image,clamp(pos+drift*motion,0.,1.)).rgb;
 col+=(1.-col)*accent*.22*(g1*(p1+1.)+g2*(p2+1.))*motion;
 // Match the reference's luminous blue-violet wave rather than a flat cyan ring.
 float glow=rippleLight+mouseGlow*(.15+.5*(g1+g2));
 float luminance=dot(col,vec3(.33));
 col+=glow*glowTint*(.25+luminance*2.5);
 // Irregular bubbles spread out from the touch, as in the reference demo.
 for(int i=0;i<4;i++){
   float age=time-taps[i].z;
   if(age>=0. && age<3.){
     for(int j=0;j<14;j++){
       float id=float(j), seed=fract(sin(id*7.13+float(i)*3.7)*437.58);
       float spread=fract(id*.618)*2.-1.;
       vec2 center=taps[i].xy+vec2((spread*(8.+age*9.)+sin(time*1.2+id)*age*3.)/(height*aspect),-age*(.035+seed*.065)+(seed-.5)*20./height);
       float r=(1.5+seed*6.)/height;
       float d=length((uv-center)*vec2(aspect,1.));
       float ring=1.-smoothstep(.4/height,1.3/height,abs(d-r));
       float glint=1.-smoothstep(.3/height,1.2/height,length((uv-center)*vec2(aspect,1.)-vec2(-r*.35,-r*.35)));
       col=mix(col,bubbleTint,(ring*.5+glint*.55)*(1.-age/3.));
     }
   }
 }
 // Staggered bubbles rise through the illustration in screen space. Draw thin
 // rings and an offset glint rather than filling the artwork with solid dots.
 for(int i=0;i<40;i++){
   float id=float(i);
   if(id< bubbleCount){
     float seed=fract(sin(id*12.9898+4.)*437.58);
     float progress=fract(time*bubbleSpeed*(.035+seed*.035)+id*.173);
     vec2 center=vec2(.05+fract(id*.618+seed*.2)*.9+sin(time*.7+id*2.)*.022,1.08-progress*1.16);
     float r=(3.+seed*6.)/height;
     vec2 delta=(uv-center)*vec2(aspect,1.);
     float dist=length(delta);
     float ring=1.-smoothstep(.5/height,1.5/height,abs(dist-r));
     float glint=1.-smoothstep(.4/height,1.4/height,length(delta-vec2(-r*.35,-r*.45)));
     float fade=smoothstep(0.,.12,progress)*(1.-smoothstep(.82,1.,progress));
     float strength=(ring*.42+glint*.55)*fade*mix(.3,1.,safe);
     col=mix(col,bubbleTint,strength);
   }
 }
 gl_FragColor=vec4(col,1.);
}`;

export default function ArtworkMotion({ variant }: { variant: 'auth' | 'dashboard' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, parent = canvas?.parentElement, target = canvas?.previousElementSibling as HTMLElement | null;
    if (!canvas || !parent || !target) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type); if (!s) return null;
      gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; } return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment), program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const color = getComputedStyle(parent).getPropertyValue('--artwork-accent').trim();
    const rgb = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
    if (rgb) gl.uniform3f(u('accent'), parseInt(rgb.slice(0,2),16)/255, parseInt(rgb.slice(2,4),16)/255, parseInt(rgb.slice(4,6),16)/255);
    const tokenRgb = (name: string): [number,number,number] => {
      const token = getComputedStyle(parent).getPropertyValue(name).trim().replace('#','');
      return [0,2,4].map(offset => parseInt(token.slice(offset,offset+2),16)/255) as [number,number,number];
    };
    const blue = tokenRgb('--artwork-blue'), violet = tokenRgb('--artwork-violet'), text = tokenRgb('--artwork-text');
    gl.uniform3f(u('glowTint'), ...blue.map((v,i)=>v*.75+violet[i]*.25) as [number,number,number]);
    gl.uniform3f(u('bubbleTint'), ...text.map((v,i)=>v*.65+blue[i]*.35) as [number,number,number]);
    const spec = variant === 'auth'
      ? { src: authImage, width: 1024, height: 1536, region: [0,0,1024,1536], face: [.60,.32], radius: .10, j1: [.78,.08,.13], j2: [.90,.48,.08] }
      : { src: dashboardImage, width: 1536, height: 1024, region: [788,72,391,250], face: [.594,.167], radius: .055, j1: [.735,.16,.035], j2: [.545,.235,.03] };
    gl.uniform2f(u('face'), spec.face[0], spec.face[1]); gl.uniform1f(u('radius'), spec.radius);
    gl.uniform3f(u('jelly1'), spec.j1[0], spec.j1[1], spec.j1[2]); gl.uniform3f(u('jelly2'), spec.j2[0], spec.j2[1], spec.j2[2]);
    let frame = 0, ready = false, visible = true, disposed = false, bubbleCapacity = 16;
    const taps = new Float32Array([0,0,-100, 0,0,-100, 0,0,-100, 0,0,-100]);
    const tapsUniform = u('taps[0]');
    let tapIndex = 0;
    let pointerX = .5, pointerY = .5, hoverTarget = 0, hoverValue = 0;
    const pointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointerX = (event.clientX-box.left)/box.width; pointerY = (event.clientY-box.top)/box.height;
      const interactive = event.target instanceof Element && event.target.closest('a,button,input,textarea,select');
      hoverTarget = !interactive && pointerX>=0 && pointerX<=1 && pointerY>=0 && pointerY<=1 ? 1 : 0;
    };
    const pointerLeave = () => { hoverTarget = 0; };
    const clickArtwork = (event: MouseEvent) => {
      // Browsers generate click for taps, but suppress it for touch scrolling.
      if (event.button !== 0 || event.detail === 0 || (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"]'))) return;
      const box = canvas.getBoundingClientRect();
      const x = (event.clientX-box.left)/box.width, y = (event.clientY-box.top)/box.height;
      if (!ready || x<0 || x>1 || y<0 || y>1) return;
      taps.set([x,y,performance.now()/1000],tapIndex*3); tapIndex = (tapIndex+1)%4;
      canvas.dataset.rippleSlot = String(tapIndex);
    };
    // Listen on the artwork container; the decorative canvas never intercepts controls.
    parent.addEventListener('click',clickArtwork);
    parent.addEventListener('pointermove',pointerMove);
    parent.addEventListener('pointerleave',pointerLeave);
    parent.addEventListener('pointercancel',pointerLeave);
    parent.addEventListener('pointerup',pointerLeave);
    const layout = () => {
      const box = target.getBoundingClientRect(), host = parent.getBoundingClientRect(); if (!box.width || !box.height) return;
      // Keep the compact mobile banner and dashboard crop from becoming crowded.
      const limit = variant === 'auth' ? 40 : 24;
      bubbleCapacity = Math.min(limit, Math.max(16, Math.round(box.width*box.height/14000)));
      canvas.style.left = `${box.left-host.left-parent.clientLeft}px`; canvas.style.top = `${box.top-host.top-parent.clientTop}px`;
      canvas.style.width = `${box.width}px`; canvas.style.height = `${box.height}px`;
      const dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.round(box.width*dpr); canvas.height = Math.round(box.height*dpr); gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform1f(u('aspect'), box.width/box.height); gl.uniform1f(u('height'), box.height);
      const [x,y,w,h] = spec.region, scale = Math.max(box.width/w, box.height/h), sw = box.width/(w*scale), sh = box.height/(h*scale);
      const positions = target instanceof HTMLImageElement ? getComputedStyle(target).objectPosition.match(/-?[\d.]+%/g) : null;
      const px = positions ? parseFloat(positions[0])/100 : .5, py = positions?.[1] ? parseFloat(positions[1])/100 : .5;
      gl.uniform4f(u('crop'),(x+(1-sw)*px*w)/spec.width,(y+(1-sh)*py*h)/spec.height,sw*w/spec.width,sh*h/spec.height);
    };
    const draw = (now: number) => {
      frame = 0; if (!ready || !visible || document.hidden || disposed) { canvas.style.opacity = '0'; return; }
      // Project owner requested automatic motion on all OS settings; reduce its
      // amplitude and light variation for users who prefer reduced motion.
      gl.uniform1f(u('motion'), reduced.matches ? .4 : 1);
      gl.uniform1f(u('bubbleCount'), reduced.matches ? Math.round(bubbleCapacity*.75) : bubbleCapacity);
      gl.uniform1f(u('bubbleSpeed'), reduced.matches ? .75 : 1);
      gl.uniform3fv(tapsUniform,taps);
      hoverValue += (hoverTarget-hoverValue)*.08;
      gl.uniform2f(u('pointer'),pointerX,pointerY); gl.uniform1f(u('hover'),hoverValue);
      gl.uniform1f(u('time'), now/1000); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); canvas.style.opacity = '1'; frame = requestAnimationFrame(draw);
    };
    const refresh = () => { cancelAnimationFrame(frame); layout(); frame = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(refresh); resize.observe(target); resize.observe(parent);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); }); observer.observe(target);
    reduced.addEventListener('change', refresh); document.addEventListener('visibilitychange', refresh);
    const image = new Image(); image.onload = () => { if (disposed) return; gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image); ready = true; refresh(); }; image.src = spec.src;
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); reduced.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh); parent.removeEventListener('click',clickArtwork); parent.removeEventListener('pointermove',pointerMove); parent.removeEventListener('pointerleave',pointerLeave); parent.removeEventListener('pointercancel',pointerLeave); parent.removeEventListener('pointerup',pointerLeave); image.onload = null; gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); };
  }, [variant]);
  return <canvas ref={ref} className="artwork-motion" aria-hidden="true" />;
}
