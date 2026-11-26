/* Progress, badges, streaks (localStorage) and the drawing gallery (IndexedDB). */
(function (DA) {
  'use strict';
  const U = DA.util;
  const KEY = 'sketchquest.v1';

  const BADGES = [
    { id: 'first', emoji: '🌱', name: 'First Steps', desc: 'Finish your first lesson' },
    { id: 'first-animal', emoji: '🐾', name: 'Animal Friend', desc: 'Draw your first animal' },
    { id: 'zoo5', emoji: '🦒', name: 'Zookeeper', desc: 'Draw 5 different animals' },
    { id: 'zoo-all', emoji: '🌍', name: 'Wildlife Artist', desc: 'Draw every animal' },
    { id: 'circle90', emoji: '🌕', name: 'Circle Master', desc: 'Score 90+ on Round Circles' },
    { id: 'perfect', emoji: '💯', name: 'Bullseye', desc: 'Score 95 or more in any lesson' },
    { id: 'stars10', emoji: '⭐', name: 'Star Collector', desc: 'Get 3 stars on 10 lessons' },
    { id: 'streak3', emoji: '🔥', name: 'On Fire', desc: '3-day practice streak' },
    { id: 'streak7', emoji: '☄️', name: 'Week Warrior', desc: '7-day practice streak' },
    { id: 'streak30', emoji: '🌋', name: 'Unstoppable', desc: '30-day practice streak' },
    { id: 'daily', emoji: '☀️', name: 'Warmed Up', desc: 'Finish a daily warm-up' },
    { id: 'daily10', emoji: '🏋️', name: 'Daily Grinder', desc: 'Finish 10 daily warm-ups' },
    { id: 'gesture', emoji: '💨', name: 'Speedy Sketcher', desc: 'Finish a gesture session' },
    { id: 'w-all', emoji: '👑', name: 'Grand Master', desc: 'Pass every lesson in every world' },
    { id: 'boss', emoji: '👑', name: 'Boss Slayer', desc: 'Defeat a Boss Mode challenge' },
    { id: 'boss-all', emoji: '🐘', name: 'Realism Royalty', desc: 'Defeat every boss' },
    { id: 'drawings50', emoji: '📚', name: 'Sketchbook Filled', desc: 'Make 50 drawings' },
  ];

  function fresh() {
    return {
      v: 1, created: Date.now(), xp: 0, lessons: {}, history: [],
      streak: { count: 0, best: 0, last: null }, days: {},
      daily: { day: null, items: [], done: [] }, dailyCount: 0,
      badges: {}, drawings: 0,
      settings: { sound: true, fingerDraw: false, unlockAll: false, theme: 'auto', penSeen: false, name: '' },
    };
  }

  let S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
    const f = fresh();
    for (const k in f) if (S[k] == null) S[k] = f[k];
    S.settings = Object.assign(f.settings, S.settings);
    return S;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }
  load();

  const settings = () => S.settings;
  function setSetting(k, v) { S.settings[k] = v; save(); }

  function rankFor(xp) {
    const R = DA.course.RANKS;
    let i = 0;
    while (i + 1 < R.length && xp >= R[i + 1].xp) i++;
    const cur = R[i], next = R[i + 1];
    return { i, cur, next, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
  }

  const starsFor = (score) => (score >= 90 ? 3 : score >= 75 ? 2 : score >= 60 ? 1 : 0);
  const lesson = (id) => S.lessons[id] || { best: 0, stars: 0, attempts: 0, passed: false, last: null };

  function worldUnlocked(wi) {
    if (wi === 0 || S.settings.unlockAll) return true;
    const prev = DA.course.WORLDS[wi - 1];
    const passed = prev.lessons.filter((l) => lesson(l.id).passed).length;
    return passed >= Math.ceil(prev.lessons.length * 0.75);
  }

  function nextLesson() {
    for (let wi = 0; wi < DA.course.WORLDS.length; wi++) {
      if (!worldUnlocked(wi)) break;
      const l = DA.course.WORLDS[wi].lessons.find((x) => !lesson(x.id).passed);
      if (l) return l;
    }
    return null;
  }

  function touchStreak() {
    const t = U.today();
    S.days[t] = (S.days[t] || 0) + 1;
    if (S.streak.last === t) return false;
    const gap = S.streak.last ? U.dayDiff(S.streak.last, t) : 99;
    S.streak.count = gap === 1 ? S.streak.count + 1 : 1;
    S.streak.best = Math.max(S.streak.best, S.streak.count);
    S.streak.last = t;
    return true;
  }

  function currentStreak() {
    if (!S.streak.last) return 0;
    return U.dayDiff(S.streak.last, U.today()) <= 1 ? S.streak.count : 0;
  }

  function award(id, list) { if (!S.badges[id]) { S.badges[id] = Date.now(); list.push(BADGES.find((b) => b.id === id)); } }

  function checkBadges(ctx) {
    const nb = [];
    const L = S.lessons, ids = Object.keys(L);
    if (ids.some((i) => L[i].passed)) award('first', nb);
    const animals = DA.course.WORLDS.flatMap((w) => w.lessons).filter((l) => l.animal);
    const drawnAnimals = animals.filter((l) => lesson(l.id).passed).length;
    if (drawnAnimals >= 1) award('first-animal', nb);
    if (drawnAnimals >= 5) award('zoo5', nb);
    if (drawnAnimals >= animals.length) award('zoo-all', nb);
    if (lesson('w1-circles').best >= 90) award('circle90', nb);
    if (ids.some((i) => L[i].best >= 95)) award('perfect', nb);
    if (ids.filter((i) => L[i].stars >= 3).length >= 10) award('stars10', nb);
    const st = currentStreak();
    if (st >= 3) award('streak3', nb);
    if (st >= 7) award('streak7', nb);
    if (st >= 30) award('streak30', nb);
    if (S.dailyCount >= 1) award('daily', nb);
    if (S.dailyCount >= 10) award('daily10', nb);
    if (ctx && ctx.gesture) award('gesture', nb);
    if (DA.course.WORLDS.every((w) => w.lessons.every((l) => lesson(l.id).passed))) award('w-all', nb);
    if (S.drawings >= 50) award('drawings50', nb);
    const bosses = DA.course.WORLDS.flatMap((w) => w.lessons).filter((l) => l.ex.mode === 'boss');
    if (bosses.some((l) => lesson(l.id).passed)) award('boss', nb);
    if (bosses.length && bosses.every((l) => lesson(l.id).passed)) award('boss-all', nb);
    return nb;
  }

  /* Record a finished lesson or practice attempt. */
  function record(o) {
    const before = rankFor(S.xp);
    const res = { xp: 0, firstPass: false, stars: 0, newBest: false, badges: [], rankUp: null };
    const l = o.lessonId ? DA.course.byId[o.lessonId] : null;
    if (l && !o.practice) {
      const st = Object.assign({}, lesson(l.id));
      const stars = starsFor(o.score);
      res.newBest = o.score > st.best;
      res.prevStars = st.stars;
      st.attempts++; st.last = Date.now();
      st.best = Math.max(st.best, o.score);
      st.stars = Math.max(st.stars, stars);
      if (!st.passed && stars >= 1) { st.passed = true; res.firstPass = true; }
      S.lessons[l.id] = st;
      res.stars = stars;
      let mult = res.firstPass ? 1.5 : (st.stars >= 3 && !res.newBest ? 0.35 : 0.7);
      res.xp = Math.round(l.xp * (o.score / 100) * mult) + 10;
    } else {
      res.xp = Math.round((o.baseXp || 40) * (o.score / 100)) + 5;
      res.stars = starsFor(o.score);
    }
    S.xp += res.xp;
    S.drawings += o.drawings || 1;
    S.history.push({ t: Date.now(), id: o.lessonId || o.kind, score: o.noScore ? null : o.score, skill: o.skill || (l && l.skill), secs: Math.round(o.secs || 0) });
    if (S.history.length > 1500) S.history.splice(0, S.history.length - 1500);
    touchStreak();
    res.badges = checkBadges(o);
    const after = rankFor(S.xp);
    if (after.i > before.i) res.rankUp = after.cur;
    save();
    return res;
  }

  /* ---------- daily warm-up ---------- */
  const DRILLABLE = ['trace', 'ghost', 'construct', 'flash', 'copy', 'circles', 'value', 'shade'];
  function dailyPlan() {
    const t = U.today();
    if (S.daily.day === t) return S.daily;
    const pool = [];
    DA.course.WORLDS.forEach((w, wi) => {
      if (!worldUnlocked(wi)) return;
      w.lessons.forEach((l) => {
        if (!DRILLABLE.includes(l.ex.mode)) return;
        const st = lesson(l.id);
        if (!st.passed && pool.length >= 3) return;
        const stale = st.last ? Math.min(14, (Date.now() - st.last) / 86400000) : 7;
        const weak = 100 - st.best;
        pool.push({ id: l.id, w: 1 + weak / 20 + stale / 3 + Math.random() * 2 });
      });
    });
    pool.sort((a, b) => b.w - a.w);
    const items = pool.slice(0, 3).map((p) => p.id);
    while (items.length < 3) items.push(['w1-lines', 'w1-ghost', 'w1-circles'][items.length]);
    S.daily = { day: t, items, done: [] };
    save();
    return S.daily;
  }
  function dailyDone(id) {
    const d = dailyPlan();
    if (!d.done.includes(id)) d.done.push(id);
    let finished = false;
    if (d.done.length === d.items.length && !d.complete) { d.complete = true; S.dailyCount++; finished = true; }
    save();
    return finished;
  }

  /* ---------- skills ---------- */
  function skillLevels() {
    const out = {};
    Object.keys(DA.course.SKILLS).forEach((k) => {
      const ls = DA.course.WORLDS.flatMap((w) => w.lessons).filter((l) => l.skill === k);
      const tot = ls.reduce((a, l) => a + lesson(l.id).best, 0);
      out[k] = ls.length ? tot / ls.length : 0;
    });
    return out;
  }

  /* ---------- gallery (IndexedDB) ---------- */
  let dbp;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('sketchquest', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('drawings')) d.createObjectStore('drawings', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function addDrawing(d) {
    try {
      const x = await db();
      d.id = d.id || Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      d.t = d.t || Date.now();
      await new Promise((res, rej) => { const tx = x.transaction('drawings', 'readwrite'); tx.objectStore('drawings').put(d); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      return d;
    } catch (e) { return null; }
  }
  async function listDrawings() {
    try {
      const x = await db();
      return await new Promise((res, rej) => { const r = x.transaction('drawings').objectStore('drawings').getAll(); r.onsuccess = () => res(r.result.sort((a, b) => b.t - a.t)); r.onerror = () => rej(r.error); });
    } catch (e) { return []; }
  }
  async function deleteDrawing(id) {
    const x = await db();
    await new Promise((res) => { const tx = x.transaction('drawings', 'readwrite'); tx.objectStore('drawings').delete(id); tx.oncomplete = res; });
  }

  /* ---------- saved boss projects (long drawings you can resume) ---------- */
  async function saveProject(p) {
    try { const x = await db(); await new Promise((res, rej) => { const tx = x.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { return false; }
  }
  async function loadProject(id) {
    try { const x = await db(); return await new Promise((res) => { const r = x.transaction('projects').objectStore('projects').get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch (e) { return null; }
  }
  async function deleteProject(id) {
    try { const x = await db(); await new Promise((res) => { const tx = x.transaction('projects', 'readwrite'); tx.objectStore('projects').delete(id); tx.oncomplete = res; }); } catch (e) { /* ignore */ }
  }

  function exportData() { return JSON.stringify(S); }
  function importData(txt) { const d = JSON.parse(txt); if (!d || d.v !== 1) throw new Error('Not a Sketch Quest save file'); localStorage.setItem(KEY, JSON.stringify(d)); load(); }
  function reset() { S = fresh(); save(); }

  DA.store = {
    get state() { return S; }, BADGES, settings, setSetting, rankFor, starsFor, lesson, worldUnlocked, nextLesson,
    record, currentStreak, dailyPlan, dailyDone, skillLevels, addDrawing, listDrawings, deleteDrawing,
    exportData, importData, reset, save, saveProject, loadProject, deleteProject,
  };
})(window.DA);
