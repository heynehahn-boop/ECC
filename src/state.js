// App state and all the date/streak/usage math. No DOM in here, so it can be unit tested.

export const pad = (n) => String(n).padStart(2, '0');
export const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => dkey(new Date());
export const uid = () => Math.random().toString(36).slice(2, 9);
export const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function defaults() {
  const t = todayKey();
  const every = () => ALL_DAYS.slice();
  return {
    v: 2,
    updatedAt: 0,
    profile: { name: '', handle: '' },
    habits: [
      { id: 'brain', name: 'Morning warm-up', icon: 'bolt', target: 0, unit: '', days: every(), auto: true, created: t },
      { id: 'read', name: 'Read', icon: 'book', target: 15, unit: 'pages', days: every(), created: t },
      { id: 'teeth', name: 'Brush teeth', icon: 'tooth', target: 0, unit: '', days: every(), created: t },
      { id: 'sport', name: 'Sports', icon: 'dumbbell', target: 0, unit: '', days: every(), created: t },
      { id: 'notiktok', name: 'No TikTok', icon: 'phoneoff', target: 0, unit: '', days: every(), created: t },
    ],
    log: {},
    brain: {},
    best: { math: null },
    chessIdx: 0,
    chessSolved: 0,
    settings: { warmup: '07:30', reminder: '21:00', mode: 'random', notifications: true },
    apps: [{ id: 'tiktok', name: 'TikTok', minutes: 10, unlock: '20:00' }],
    screenTime: { enabled: false, selected: 0 },
    sessions: {},
  };
}

export function normalize(s) {
  const d = defaults();
  if (!s || typeof s !== 'object' || !Array.isArray(s.habits)) return d;
  return {
    ...d,
    ...s,
    profile: { ...d.profile, ...(s.profile || {}) },
    settings: { ...d.settings, ...(s.settings || {}) },
    best: { ...d.best, ...(s.best || {}) },
    screenTime: { ...d.screenTime, ...(s.screenTime || {}) },
    log: s.log || {},
    brain: s.brain || {},
    sessions: s.sessions || {},
    apps: Array.isArray(s.apps) && s.apps.length ? s.apps : d.apps,
  };
}

// The single live state object. Replace its contents with `replaceState`.
export const store = { state: defaults() };
export const S = () => store.state;
export function replaceState(next) { store.state = normalize(next); }

/* ---------- habits ---------- */
export const habitById = (id) => S().habits.find((h) => h.id === id);
export function scheduled(k) {
  const dow = parseKey(k).getDay();
  return S().habits.filter((h) => h.days.includes(dow) && (h.created || '0') <= k);
}
export const val = (h, k) => (S().log[k] || {})[h.id] || 0;
export const isDone = (h, k) => (h.target ? val(h, k) >= h.target : !!val(h, k));
export function dayStat(k) { const s = scheduled(k); return { s: s.length, d: s.filter((h) => isDone(h, k)).length }; }
export function level(k) {
  const { s, d } = dayStat(k);
  if (!s || !d) return 0;
  return Math.max(1, Math.ceil((d / s) * 4));
}
export const complete = (k) => { const { s, d } = dayStat(k); return s > 0 && d === s; };

export function earliest() {
  let e = todayKey();
  S().habits.forEach((h) => { if (h.created && h.created < e) e = h.created; });
  Object.keys(S().log).forEach((k) => { if (k < e) e = k; });
  return e;
}

// A day counts toward the streak when every habit scheduled for it is done.
// Days with nothing scheduled are skipped. Today only counts once it is complete.
export function stats() {
  const start = earliest();
  const today = todayKey();
  let total = 0, best = 0, bestKey = null, longest = 0, run = 0;
  for (let d = parseKey(start); dkey(d) <= today; d.setDate(d.getDate() + 1)) {
    const k = dkey(d);
    const st = dayStat(k);
    total += st.d;
    if (st.d > best) { best = st.d; bestKey = k; }
    if (st.s === 0) continue;
    if (st.d === st.s) { run++; longest = Math.max(longest, run); } else if (k !== today) run = 0;
  }
  let cur = 0;
  const d = new Date();
  if (!complete(today)) d.setDate(d.getDate() - 1);
  while (dkey(d) >= start) {
    const st = dayStat(dkey(d));
    if (st.s > 0) { if (st.d === st.s) cur++; else break; }
    d.setDate(d.getDate() - 1);
  }
  return { total, best, bestKey, cur, longest: Math.max(longest, cur) };
}

export function setVal(h, k, v) {
  const log = S().log;
  log[k] = log[k] || {};
  if (v) log[k][h.id] = v; else delete log[k][h.id];
  if (!Object.keys(log[k]).length) delete log[k];
}

/* ---------- app time limits (web gate) ---------- */
export function usage(app, now = Date.now()) {
  const list = ((S().sessions[todayKey()] || {})[app.id]) || [];
  const allow = app.minutes * 60000;
  let used = 0, active = null;
  list.forEach((s) => {
    const end = s.end || Math.min(now, s.start + allow);
    used += Math.max(0, end - s.start);
    if (!s.end && now < s.start + allow) active = s;
  });
  used = Math.min(used, allow);
  const left = allow - used;
  let status;
  if (nowMin(new Date(now)) < toMin(app.unlock)) status = 'locked';
  else if (active && left > 0) status = 'active';
  else if (left <= 0) status = 'used';
  else status = 'open';
  return { status, left, used, allow, active };
}
export function startSession(app) {
  const k = todayKey();
  const sessions = S().sessions;
  sessions[k] = sessions[k] || {};
  const list = (sessions[k][app.id] = sessions[k][app.id] || []);
  list.forEach((s) => { if (!s.end) s.end = Math.min(Date.now(), s.start + app.minutes * 60000); });
  list.push({ start: Date.now(), end: null });
}
export function endSession(app) {
  const list = ((S().sessions[todayKey()] || {})[app.id]) || [];
  list.forEach((s) => { if (!s.end) s.end = Date.now(); });
}

/* ---------- maths questions ---------- */
export function makeQuestion(rand = Math.random) {
  const r = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const t = r(0, 3);
  if (t === 0) { const a = r(2, 20), b = r(2, 20); return { q: `${a} + ${b}`, a: a + b }; }
  if (t === 1) { const a = r(6, 25), b = r(2, a - 1); return { q: `${a} − ${b}`, a: a - b }; }
  if (t === 2) { const a = r(2, 9), b = r(2, 9); return { q: `${a} × ${b}`, a: a * b }; }
  const b = r(2, 9), x = r(2, 9);
  return { q: `${b * x} ÷ ${b}`, a: x };
}
export function makeQuestions(n = 10, rand = Math.random) {
  const qs = [];
  while (qs.length < n) { const q = makeQuestion(rand); if (!qs.some((o) => o.q === q.q)) qs.push(q); }
  return qs;
}
