/* Sound effects made on the fly with Web Audio (no sound files to download). */
(function (root) {
  'use strict';
  let ctx = null;
  let master = null;
  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(sec) {
    const c = ac();
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(freq, t, dur, type, vol, glideTo) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env(g, t, 0.01, vol || 0.3, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function burst(t, dur, vol, filterType, freq, q) {
    const c = ac();
    const n = noise(dur + 0.1);
    const f = c.createBiquadFilter();
    f.type = filterType || 'lowpass';
    f.frequency.value = freq || 1000;
    f.Q.value = q || 1;
    const g = c.createGain();
    env(g, t, 0.005, vol || 0.5, dur);
    n.connect(f).connect(g).connect(master);
    n.start(t);
    n.stop(t + dur + 0.1);
  }

  const FX = {
    crash() {
      const t = ac().currentTime;
      burst(t, 1.4, 0.9, 'lowpass', 900);
      tone(70, t, 1.2, 'sine', 0.8, 35);
      burst(t + 0.05, 0.6, 0.4, 'highpass', 3000);
      [0.15, 0.32, 0.5].forEach((d, i) => tone(900 + i * 370, t + d, 0.5, 'triangle', 0.08));
    },
    chime() {
      const t = ac().currentTime;
      [523, 659, 784, 1046].forEach((f, i) => { tone(f, t + i * 0.22, 1.6, 'sine', 0.18); tone(f * 2.01, t + i * 0.22, 0.8, 'sine', 0.04); });
    },
    bell() {
      const t = ac().currentTime;
      [0, 1.1, 2.2].forEach((d) => { tone(196, t + d, 2.2, 'sine', 0.35); tone(392.5, t + d, 1.4, 'sine', 0.12); tone(588, t + d, 0.9, 'sine', 0.06); });
    },
    ding() {
      const t = ac().currentTime;
      [0, 0.28].forEach((d) => { tone(1568, t + d, 0.7, 'sine', 0.2); tone(3136, t + d, 0.3, 'sine', 0.05); });
    },
    knock() {
      const t = ac().currentTime;
      [0, 0.22, 0.44].forEach((d) => { tone(110, t + d, 0.15, 'sine', 0.8, 60); burst(t + d, 0.06, 0.4, 'lowpass', 600); });
    },
    sting() {
      const t = ac().currentTime;
      [[110, 0.5], [155.6, 0.3], [207.7, 0.25], [220, 0.2]].forEach(([f, v]) => tone(f, t, 2.2, 'sawtooth', v * 0.25));
      burst(t, 0.4, 0.3, 'lowpass', 400);
    },
    gasp() {
      const t = ac().currentTime;
      burst(t, 0.35, 0.25, 'bandpass', 1800, 2);
    },
    whoosh() {
      const t = ac().currentTime;
      const c = ac();
      const n = noise(1);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 3;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(3000, t + 0.6);
      const g = c.createGain();
      env(g, t, 0.2, 0.35, 0.5);
      n.connect(f).connect(g).connect(master);
      n.start(t);
      n.stop(t + 1);
    },
    sparkle() {
      const t = ac().currentTime;
      [1318, 1568, 1976, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.07, 0.4, 'sine', 0.08));
    },
    tick() {
      const t = ac().currentTime;
      [0, 0.5, 1, 1.5].forEach((d, i) => burst(t + d, 0.03, 0.4, 'highpass', i % 2 ? 2500 : 3500));
    },
    wind() {
      const t = ac().currentTime;
      const c = ac();
      const n = noise(4);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(400, t);
      f.frequency.linearRampToValueAtTime(900, t + 1.5);
      f.frequency.linearRampToValueAtTime(350, t + 3.8);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.25, t + 1.2);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.9);
      n.connect(f).connect(g).connect(master);
      n.start(t);
      n.stop(t + 4);
    },
    siren() {
      const t = ac().currentTime;
      for (let i = 0; i < 3; i++) { tone(660, t + i * 0.8, 0.4, 'square', 0.05); tone(880, t + i * 0.8 + 0.4, 0.4, 'square', 0.05); }
    },
    ouch() {
      const t = ac().currentTime;
      tone(1200, t, 0.15, 'triangle', 0.15, 700);
    },
  };

  root.Sfx = {
    unlock() { ac(); },
    play(name) { try { if (FX[name] && ac()) FX[name](); } catch (e) { /* audio not available */ } },
    names: Object.keys(FX),
  };
})(window);
