/**
 * Arkal — son de la landing page (identique au splash screen de l'app).
 *
 * Tout le son est généré en direct avec la Web Audio API : aucun fichier audio n'est nécessaire.
 *  - Ambiance : souffle doux (bruit filtré qui « respire » lentement) + petites notes de cloche
 *    aléatoires dans une réverbération.
 *  - Battement binaural (au clic sur l'orbe) : 200 Hz dans l'oreille gauche, 206 Hz dans l'oreille
 *    droite (battement de 6 Hz), qui monte en 0,6 s puis s'estompe lentement.
 *
 * Utilisation :
 *   import { ArkalSound } from './arkal-sound.js';
 *   const sound = new ArkalSound({ muted: false });
 *   // dans un gestionnaire de clic / toucher (obligatoire pour que les navigateurs autorisent le son) :
 *   sound.unlock();          // démarre l'ambiance
 *   sound.triggerBeat();     // lance le battement binaural (clic sur l'orbe)
 *   sound.setMuted(true);    // coupe / rétablit le son, en fondu
 */

const SETTINGS = {
  ambientVol: 0.25,   // volume de l'ambiance
  ambientFadeIn: 2.5, // montée de l'ambiance au démarrage (s)
  carrier: 200,       // fréquence porteuse (Hz), oreille gauche
  beat: 6,            // écart entre les deux oreilles (Hz) → oreille droite à 206 Hz
  beatPeak: 0.05,     // volume max du battement
  beatFadeIn: 0.6,    // montée du battement (s)
  beatRest: 0.01,     // volume du battement après décroissance
  beatDecay: 21.6,    // durée de la décroissance de beatPeak à beatRest (s)
  beatFadeOut: 2.5,   // extinction finale du battement (s)
  muteFade: 0.25,     // fondu pour couper / rétablir le son (s)
};

// Notes douces en intonation juste sur La 110 Hz (aucune fréquence voisine → aucun battement parasite).
const BELL_NOTES = [220, 330, 440, 495, 550, 660, 825];

export class ArkalSound {
  constructor({ muted = false, settings = {} } = {}) {
    this.S = { ...SETTINGS, ...settings };
    this.muted = muted;
    this.ctx = null;
    this.beatNodes = null;
  }

  /** À appeler dans un gestionnaire d'interaction utilisateur (clic, toucher, touche). */
  unlock() {
    this._init();
    const c = this.ctx;
    if (c && !this.muted && c.state !== 'running') c.resume().catch(() => {});
  }

  /** Coupe ou rétablit tout le son, en fondu. */
  setMuted(m) {
    this.muted = !!m;
    this._init();
    const c = this.ctx; if (!c) return;
    const g = this.muteGain.gain;
    clearTimeout(this._suspT);
    const ramp = () => { const t = c.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(this.muted ? 0 : 1, t + this.S.muteFade); };
    if (this.muted) {
      if (c.state === 'running') { ramp(); this._suspT = setTimeout(() => { if (this.muted) c.suspend().catch(() => {}); }, this.S.muteFade * 1000 + 70); }
      else { g.cancelScheduledValues(0); g.value = 0; c.suspend().catch(() => {}); }
    } else {
      g.cancelScheduledValues(0); g.value = 0;
      c.resume().then(ramp).catch(() => {});
    }
  }

  /** Met le son en pause (ex. onglet masqué) sans changer la préférence de l'utilisateur. */
  pause() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && !this.muted && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  /** Lance (ou relance) le battement binaural. */
  triggerBeat() {
    this.unlock();
    const c = this.ctx; if (!c) return;
    const S = this.S, t0 = c.currentTime;
    if (!this.beatNodes) {
      const mk = (f, ch) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(this.merger, 0, ch); o.start(); return o; };
      this.beatNodes = { L: mk(S.carrier, 0), R: mk(S.carrier + S.beat, 1) };
    }
    clearTimeout(this._beatStopT);
    const g = this.beatBus.gain;
    const from = Math.max(g.value, 0.0001);
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t0); else { g.cancelScheduledValues(t0); g.setValueAtTime(from, t0); }
    // montée en « ease-out » sur beatFadeIn
    const n = 32, curve = new Float32Array(n), tStart = t0 + 0.01;
    for (let i = 0; i < n; i++) { const x = i / (n - 1); curve[i] = from + (S.beatPeak - from) * (1 - Math.pow(1 - x, 3)); }
    g.setValueCurveAtTime(curve, tStart, S.beatFadeIn);
    // décroissance exponentielle lente, puis extinction
    const tDecayEnd = tStart + S.beatFadeIn + S.beatDecay;
    g.exponentialRampToValueAtTime(S.beatRest, tDecayEnd);
    g.linearRampToValueAtTime(0, tDecayEnd + S.beatFadeOut);
    this._beatStopT = setTimeout(() => this._stopBeat(), (S.beatFadeIn + S.beatDecay + S.beatFadeOut + 0.2) * 1000);
  }

  dispose() {
    clearInterval(this._bellTimer); clearTimeout(this._beatStopT); clearTimeout(this._suspT);
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null; this.beatNodes = null;
  }

  // ---------------------------------------------------------------------------

  _init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(), S = this.S;

    // limiteur de sortie
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.2;
    lim.connect(c.destination);

    this.muteGain = c.createGain(); this.muteGain.gain.value = this.muted ? 0 : 1; this.muteGain.connect(lim);
    this.out = c.createGain(); this.out.connect(this.muteGain);

    // --- ambiance
    this.amb = c.createGain(); this.amb.gain.value = 0; this.amb.connect(this.out);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.5;
    const mod = c.createGain(); mod.gain.value = 1; lp.connect(mod); mod.connect(this.amb);
    // « respiration » lente du souffle : un cycle toutes les 18 s
    const lfo = c.createOscillator(); lfo.frequency.value = 1 / 18;
    const lg = c.createGain(); lg.gain.value = 0.15; lfo.connect(lg); lg.connect(mod.gain); lfo.start();

    // souffle : bruit brun normalisé, bouclé sans couture (fondu enchaîné de 0,5 s)
    {
      const nl = c.sampleRate * 6, nb = c.createBuffer(1, nl, c.sampleRate), nd = nb.getChannelData(0);
      let lv = 0, ss = 0;
      for (let i = 0; i < nl; i++) { lv = (lv + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = lv; ss += lv * lv; }
      const nk = 1 / Math.sqrt(ss / nl), fl = Math.floor(c.sampleRate * 0.5);
      for (let i = 0; i < nl; i++) nd[i] *= nk;
      for (let i = 0; i < fl; i++) { const m = i / fl; nd[nl - fl + i] = nd[nl - fl + i] * (1 - m) + nd[i] * m; }
      const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true; ns.loopStart = fl / c.sampleRate; ns.loopEnd = nl / c.sampleRate;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60;
      const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 700; nf.Q.value = 0.5;
      const ng = c.createGain(); ng.gain.value = 0.015;
      ns.connect(hp); hp.connect(nf); nf.connect(ng); ng.connect(this.amb);
      ns.start(0, fl / c.sampleRate);
    }

    // réverbération générée (5 s)
    const irLen = Math.floor(c.sampleRate * 5), ir = c.createBuffer(2, irLen, c.sampleRate);
    const ir0 = ir.getChannelData(0), ir1 = ir.getChannelData(1);
    for (let i = 0; i < irLen; i++) { const v = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); ir0[i] = v; ir1[i] = v; }
    const rev = c.createConvolver(); rev.buffer = ir;
    const rg = c.createGain(); rg.gain.value = 0.55; rev.connect(rg); rg.connect(this.amb);

    // cloches
    this.bells = c.createGain(); this.bells.gain.value = 1; this.bells.connect(this.amb); this.bells.connect(rev);
    this._nextBell = c.currentTime + 1.5;
    this._bellTimer = setInterval(() => this._scheduleBells(), 400);

    // --- battement binaural : oscillateurs gauche / droite → fusion stéréo
    this.beatBus = c.createGain(); this.beatBus.gain.value = 0; this.beatBus.connect(this.out);
    this.merger = c.createChannelMerger(2); this.merger.connect(this.beatBus);

    // montée de l'ambiance
    const t = c.currentTime;
    this.amb.gain.setValueAtTime(0, t);
    this.amb.gain.linearRampToValueAtTime(S.ambientVol, t + S.ambientFadeIn);
  }

  _scheduleBells() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || this.muted) { if (c) this._nextBell = Math.max(this._nextBell, c.currentTime + 1); return; }
    while (this._nextBell < c.currentTime + 1.2) {
      const t = Math.max(this._nextBell, c.currentTime + 0.05);
      const f = BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)], g = 0.05 + Math.random() * 0.04;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
      const g2 = c.createGain(); g2.gain.value = 0.18;
      const env = c.createGain();
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + 1.6); env.gain.exponentialRampToValueAtTime(0.0001, t + 7.5);
      o.connect(env); o2.connect(g2); g2.connect(env); env.connect(this.bells);
      o.start(t); o2.start(t); o.stop(t + 7.6); o2.stop(t + 7.6);
      this._nextBell = t + 3.5 + Math.random() * 4.5; // une note toutes les 3,5 à 8 s
    }
  }

  _stopBeat() {
    if (!this.beatNodes) return;
    try { this.beatNodes.L.stop(); this.beatNodes.R.stop(); } catch (e) {}
    this.beatNodes.L.disconnect(); this.beatNodes.R.disconnect();
    this.beatNodes = null;
  }
}
