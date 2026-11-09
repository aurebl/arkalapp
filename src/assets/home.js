// Page d'accueil : orbe WebGL (même shader que le splash screen de l'app).
// L'apparition en fondu (orbe, logo, puis texte) est gérée en CSS via la classe `is-ready`.
(() => {
  const root = document.documentElement;
  const canvas = document.querySelector('.orb-canvas');
  const stage = document.querySelector('.stage');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = matchMedia('(max-width: 767px)');

  const BASE_R = 187; // rayon de base de l'orbe sur desktop (170 + 10 %)
  const MOBILE_R = 0.561; // rayon max sur mobile, en part de la largeur d'écran (34 % + 10 %, puis + 50 %)
  const MOBILE_MAX_R = 280;
  const DESKTOP_GAP = 50; // espace entre le bas de l'orbe et le titre sur desktop
  const MOBILE_GAP = 40; // espace entre le bas de l'orbe et le titre sur mobile
  const P = { speed: 1.75, morph: 7, amp: 2, glow: 2, period: 4.375, rings: 1 }; // un battement toutes les period / speed = 2,5 s
  const COL = { fond: '#000000', bleu: '#1F4BFF', cyan: '#7CC8FF', violet: '#7A36D0', rose: '#C768FD', orange: '#FF8A3D', creme: '#FFF4C8' };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  // Rend :active fonctionnel sur iOS (effet d'appui des boutons).
  document.addEventListener('touchstart', () => {}, { passive: true });

  // ---------- Mise en page : position et taille de l'orbe (px CSS, repère du canvas, qui couvre toute la page) ----------

  const L = { w: 0, h: 0, cx: 0, cy: 0, R: BASE_R };

  function layout() {
    L.w = canvas.clientWidth || innerWidth;
    L.h = canvas.clientHeight || innerHeight;
    const cr = canvas.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const bottom = sr.bottom - cr.top;
    if (!mqMobile.matches) {
      // Desktop : l'orbe est réduite si la hauteur d'écran manque.
      const s = Math.min(1, Math.max(0.55, (sr.height - DESKTOP_GAP - 24) / (2 * BASE_R)));
      L.R = BASE_R * s;
      L.cy = bottom - DESKTOP_GAP - L.R;
    } else {
      // Mobile : l'orbe occupe la place laissée au-dessus du texte (le pied de page peut passer sous la ligne de flottaison).
      L.R = Math.min(MOBILE_MAX_R, MOBILE_R * L.w, Math.max(80, (sr.height - MOBILE_GAP) / 2));
      // Descendue si besoin pour ne pas être coupée par le haut de l'écran (forme ondulée ≈ 1,15 × R),
      // quitte à chevaucher légèrement le titre.
      L.cy = Math.max(bottom - MOBILE_GAP - L.R, sr.top - cr.top + 1.15 * L.R + 12);
    }
    L.cx = sr.left + sr.width / 2 - cr.left;
    stage.style.setProperty('--orb-b', `${(bottom - L.cy).toFixed(1)}px`);
    root.style.setProperty('--orb-x', `${L.cx}px`);
    root.style.setProperty('--orb-y', `${L.cy}px`);
    root.style.setProperty('--orb-r', `${L.R}px`);
  }

  // ---------- WebGL ----------

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 uRes,uCenter;uniform float uUnit;
uniform float uT,uAmp,uIntro,uGlow,uRings,uP,uTm,uScale,uFade;
uniform float uTr,uBeat,uRot,uGlowK,uBloom,uSat,uRimW,uWave,uHitA,uHitT,uOmni,uShockT,uShockD,uPt,uPush,uAlpha;
uniform vec3 cBg,cBleu,cCyan,cViolet,cRose,cOrange,cCreme;
const float PI=3.14159265;
float aw(float a,float c,float s){float d=abs(mod(a-c+PI,2.*PI)-PI);return exp(-d*d/(s*s));}
vec3 hue(float a){
  float w1=aw(a,PI,.55),w2=aw(a,2.45,.35),w3=aw(a,1.85,.3),w4=aw(a,1.3,.3),w5=aw(a,.75,.35),w6=aw(a,.15,.4),w7=aw(a,-.6,.35),w8=aw(a,-1.5,.5),w9=aw(a,-2.4,.45);
  vec3 c=cBleu*w1+mix(cBleu,cViolet,.45)*w2+cViolet*w3+mix(cRose,cOrange,.35)*w4+cCreme*w5+cOrange*w6+mix(cRose,cViolet,.2)*w7+cBleu*w8+mix(cBleu,cCyan,.55)*w9;
  return c/(w1+w2+w3+w4+w5+w6+w7+w8+w9);
}
float shape(float a,float t){
  a-=.1*sin(t*.07);
  float r=1.+.0134*cos(a)-.0027*sin(a)+.0294*cos(2.*a)-.0102*sin(2.*a)-.0032*cos(3.*a)+.0039*sin(3.*a)+.0415*cos(4.*a)-.0209*sin(4.*a)-.0153*cos(5.*a)+.0215*sin(5.*a)+.0007*cos(6.*a)+.0032*sin(6.*a)-.0017*cos(7.*a)+.0033*sin(7.*a)-.0046*cos(8.*a)+.0064*sin(8.*a);
  float m=.018*sin(t*.31)*cos(3.*a+t*.07)+.016*sin(t*.23+1.)*cos(2.*a-1.+t*.05)+.013*sin(t*.37+2.)*cos(5.*a+t*.11)+.01*sin(t*.29+4.)*cos(4.*a-t*.09)+.006*cos(7.*a-t*.19);
  return r+m*uAmp;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// pow(x, 2.) n'est pas défini pour x < 0 en GLSL (NaN sur les GPU Apple) : on calcule x * x.
float sq(float x){return x*x;}
void main(){
  vec2 uv=(gl_FragCoord.xy-uCenter)/uUnit;
  float t=uT;
  float age=fract(uTr/uP)*uP;
  float swell=exp(-age*1.6)*(1.-exp(-age*9.))*uBeat;
  float R0=.2635*uScale*mix(.82,1.,uIntro)*(1.+.035*swell*uAmp);
  float L=length(uv),a=atan(uv.y,uv.x);
  float Rs=R0*shape(a,uTm);
  if(uWave>0.){
    float tr=max(uHitT,0.),env=exp(-tr*2.2)*(1.-exp(-tr*30.)),sp=PI/.9,w=mix(.55,.9,clamp(tr,0.,1.));
    float d1=abs(mod(a-uHitA-sp*tr+PI,2.*PI)-PI),d2=abs(mod(a-uHitA+sp*tr+PI,2.*PI)-PI);
    float lobe=.5*(exp(-d1*d1/(w*w))+exp(-d2*d2/(w*w)));
    Rs*=1.+uWave*env*mix(lobe,.6,uOmni);
  }
  float d=L-Rs;
  vec3 hc=hue(a+uRot);
  float lu=dot(hc,vec3(.299,.587,.114));hc=max(mix(vec3(lu),hc,uSat),0.);
  float depth=clamp(-d/R0,0.,1.);
  vec3 core=mix(cBg,cBleu,.03);
  vec2 kc=(uv/R0-vec2(.08,-.06))/vec2(.62,.58);
  float dark=exp(-dot(kc,kc)*1.4);
  float f=exp(-depth*2.4)*(1.-.55*dark);
  vec3 col=mix(core,hc,f);
  col=mix(col,mix(cBleu,core,.35),smoothstep(.5,.0,depth)*aw(a,PI,.9)*.35*(1.-f));
  float sw=.05*sin(uTm*.21);
  vec2 cd=vec2(cos(.62+sw),sin(.62+sw));
  vec2 qc=uv/R0-vec2(.12,-.08);
  float along=dot(qc,cd),perp=dot(qc,vec2(-cd.y,cd.x))-.08*along*along;
  float crease=exp(-sq(perp/(.05+.12*max(along,0.))))*smoothstep(.05,.45,along)*smoothstep(1.,.6,along);
  col+=mix(cRose,cViolet,.35)*crease*.38;
  col=mix(col,mix(cOrange,cCreme,.45),smoothstep(.0,.25,-perp)*smoothstep(.25,.8,along)*smoothstep(.55,.0,depth)*.35);
  vec2 sc=uv/R0-vec2(.15,.2);
  float sh=exp(-sq((length(sc)-1.)/.07))*aw(atan(sc.y,sc.x),-2.25,.45);
  col=mix(col,mix(cCyan,vec3(1.),.6),sh*.5*step(0.,-d));
  float rr=L/Rs;
  float fin=age*.42;
  float inr=exp(-sq((rr-fin)/.07))*exp(-age*.7)*smoothstep(1.05,.6,rr);
  col+=mix(hc,cCyan,.3)*inr*.12*uRings;
  col+=mix(hc,vec3(1.),uRimW)*exp(-abs(d)/.0035)*.55;
  float px=1.5/uUnit;
  float alpha=smoothstep(px,-px,d)*uIntro;
  float od=max(d,0.);
  float gs=uScale,bs=pow(gs,.6)*uBloom;
  vec3 glow=mix(hc,cCreme,.1)*(exp(-od/(.011*bs))*.55+exp(-od/(.05*bs))*.22+exp(-od/(.16*bs))*.06)*uGlow*uGlowK;
  vec3 rip=vec3(0.);
  for(int k=0;k<3;k++){
    float ag=age+float(k)*uP;
    float front=ag*.085*gs+uPush*gs;
    float env=exp(-sq((od-front)/(.045*gs)))*exp(-ag*.5)*smoothstep(0.,.6,ag);
    float crest=pow(max(.5+.5*cos((od-front)*PI*2./(.05*gs)),0.),8.);
    rip+=hc*crest*env;
  }
  rip*=.3*uRings*step(0.,d); // (site) ondes à pleine intensité aussi sous l'orbe : l'app les atténuait à 30 % vers le bas
  vec3 shock=vec3(0.);
  for(int k=0;k<2;k++){
    float st=uShockT-float(k)*.15;
    if(st>0.&&st<1.4){
      float p=st/1.4,e=1.-pow(1.-p,3.),r=e*uShockD,w=mix(3.,1.,p)*uPt;
      shock+=mix(hc,vec3(1.),.35)*exp(-sq((od-r)/(w*.6)))*.9*(1.-p)*(k==0?1.:.45);
    }
  }
  vec2 q=gl_FragCoord.xy/uRes;
  float ef=mix(1.,smoothstep(0.,.2,min(min(q.x,1.-q.x),min(q.y,1.-q.y))),uFade);
  vec3 hl=(glow+rip+shock)*uIntro*ef;
  vec3 fc=mix(cBg+hl,col,alpha);
  fc+=(hash(gl_FragCoord.xy+fract(t)*91.)-.5)*.01;
  if(uAlpha>.5){float ha=clamp(max(hl.r,max(hl.g,hl.b)),0.,1.);float A=mix(ha,1.,alpha);vec3 pm=mix(min(hl,vec3(ha)),clamp(col,0.,1.),alpha);gl_FragColor=vec4(pm/max(A,.001),A);}
  else gl_FragColor=vec4(fc,1.);
}`;

  function initGL() {
    let gl;
    try {
      // Canvas opaque (mode uAlpha = 0 du shader) : rien n'est derrière l'orbe depuis le retrait du mockup,
      // et Safari iOS affiche mal un canvas transparent non prémultiplié (halo délavé sur tout l'écran).
      gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    } catch (e) {
      return null;
    }
    if (!gl) return null;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    'uRes uCenter uUnit uT uAmp uIntro uGlow uRings uP uTm uScale uFade uTr uBeat uRot uGlowK uBloom uSat uRimW uWave uHitA uHitT uOmni uShockT uShockD uPt uPush uAlpha'
      .split(' ')
      .forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    const colors = { cBg: COL.fond, cBleu: COL.bleu, cCyan: COL.cyan, cViolet: COL.violet, cRose: COL.rose, cOrange: COL.orange, cCreme: COL.creme };
    for (const [n, c] of Object.entries(colors)) gl.uniform3fv(gl.getUniformLocation(prog, n), hex(c));

    // Valeurs fixes
    gl.uniform1f(u.uP, P.period);
    gl.uniform1f(u.uAmp, P.amp);
    gl.uniform1f(u.uGlow, P.glow);
    gl.uniform1f(u.uRings, P.rings);
    gl.uniform1f(u.uBeat, 1);
    gl.uniform1f(u.uFade, 0);
    gl.uniform1f(u.uRot, 0);
    gl.uniform1f(u.uShockD, 1.6);
    gl.uniform1f(u.uAlpha, 0);
    return { gl, u };
  }

  // ---------- Animation ----------

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  const ctx = initGL();
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let ot = 0;
  let otm = 0;
  let otr = 0;
  let last = 0;
  let started = false;
  let raf = 0;
  let hitT0 = null;
  let hitA = 0;
  let omni = false;

  function draw(now) {
    const { gl, u } = ctx;
    const ch = canvas.clientHeight;
    const unit = (L.R * dpr) / 0.2635;

    let glowK = 1, bloom = 1, sat = 1, rimW = 0.45, wave = 0, hitT = 0, shockT = -1, push = 0, press = 1;
    if (hitT0 !== null && !reducedMotion) {
      const ht = now - hitT0;
      const I = 1;
      if (ht >= 0 && ht < 3) {
        const pulse = ht < 0.35 ? 1 - Math.pow(1 - ht / 0.35, 2) : Math.exp(-(ht - 0.35) / 0.6);
        glowK = 1 + 1.2 * pulse * I;
        bloom = 1 + 0.6 * pulse * I;
        sat = 1 + 0.5 * pulse * I;
        rimW = 0.45 + 0.45 * pulse * I;
        if (ht < 2.5) wave = (0.1 * I) / 0.6;
        hitT = ht;
        if (ht < 2) shockT = ht;
        push = 0.035 * I * Math.exp(-ht * 1.8) * (1 - Math.exp(-ht * 10));
        press = ht < 0.12 ? 1 - 0.03 * I * easeOut(ht / 0.12) : 1 - 0.03 * I * (1 - easeOut(clamp01((ht - 0.12) / 0.5)));
      } else if (ht >= 3) {
        hitT0 = null;
      }
    }

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uCenter, L.cx * dpr, (ch - L.cy) * dpr);
    gl.uniform1f(u.uUnit, unit);
    gl.uniform1f(u.uPt, dpr / unit);
    gl.uniform1f(u.uT, reducedMotion ? 3 * 0.35 : ot);
    gl.uniform1f(u.uTm, reducedMotion ? 0 : otm);
    gl.uniform1f(u.uTr, reducedMotion ? 3 * 0.35 : otr);
    gl.uniform1f(u.uIntro, 1); // l'apparition se fait en fondu CSS sur le canvas
    gl.uniform1f(u.uScale, press);
    gl.uniform1f(u.uGlowK, glowK);
    gl.uniform1f(u.uBloom, bloom);
    gl.uniform1f(u.uSat, sat);
    gl.uniform1f(u.uRimW, rimW);
    gl.uniform1f(u.uWave, wave);
    gl.uniform1f(u.uHitA, hitA);
    gl.uniform1f(u.uHitT, hitT);
    gl.uniform1f(u.uOmni, omni ? 1 : 0);
    gl.uniform1f(u.uShockT, shockT);
    gl.uniform1f(u.uPush, push);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(ms) {
    const now = ms / 1000;
    const dt = last ? Math.min(0.05, Math.max(0, now - last)) : 0;
    last = now;
    ot += dt * P.speed;
    otm += dt * P.morph;
    otr += dt * P.speed;
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    layout();
    if (!ctx) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    ctx.gl.viewport(0, 0, W, H);
    if (started && reducedMotion) draw(performance.now() / 1000);
  }

  function loop(on) {
    if (on && !raf && started && !reducedMotion && ctx) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function start() {
    if (started) return;
    started = true;
    resize();
    root.classList.add('is-ready');
    if (!ctx) return;
    if (reducedMotion) {
      draw(performance.now() / 1000);
      return;
    }
    // Même réaction qu'un toucher au centre de l'orbe, en même temps que son apparition en fondu.
    hitT0 = performance.now() / 1000;
    omni = true;
    hitA = 0;
    loop(!document.hidden);
  }

  // ---------- Interaction ----------

  const inOrb = (e) => {
    const r = canvas.getBoundingClientRect();
    return Math.hypot(e.clientX - r.left - L.cx, e.clientY - r.top - L.cy) < 1.05 * L.R;
  };
  const interactive = () => ctx && started && !reducedMotion;

  canvas.addEventListener('pointermove', (e) => {
    canvas.style.cursor = interactive() && inOrb(e) ? 'pointer' : '';
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!interactive() || !inOrb(e)) return;
    const r = canvas.getBoundingClientRect();
    const dx = e.clientX - r.left - L.cx;
    const dy = L.cy - (e.clientY - r.top);
    hitT0 = performance.now() / 1000;
    omni = Math.hypot(dx, dy) < 0.35 * L.R;
    hitA = omni ? 0 : Math.atan2(dy, dx);
  });

  // ---------- Démarrage ----------

  if (!ctx) {
    root.classList.add('no-webgl');
  } else {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      loop(false);
      root.classList.add('no-webgl');
    });
  }

  let pending = 0;
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; resize(); });
  };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    ro.observe(canvas);
  }
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => loop(!document.hidden));

  resize();
  const fonts = document.fonts
    ? Promise.all([document.fonts.load('600 48px Geist'), document.fonts.load('400 16px Geist')])
    : Promise.resolve();
  Promise.race([fonts.catch(() => {}), new Promise((r) => setTimeout(r, 1500))]).then(start);
})();
