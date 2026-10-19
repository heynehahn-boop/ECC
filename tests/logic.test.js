// Tests for streaks, day levels, app time limits and maths questions. Run: npm test
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  store, defaults, dkey, todayKey, stats, level, complete, setVal, habitById, usage, startSession, endSession, makeQuestions, normalize,
} from '../src/state.js';
import PUZZLES from '../src/puzzles.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok  ${name}`); };
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dkey(d); };
function fresh(createdDaysAgo = 10) {
  store.state = defaults();
  store.state.habits.forEach((h) => { h.created = daysAgo(createdDaysAgo); });
}
const doAll = (k) => store.state.habits.forEach((h) => setVal(h, k, h.target || 1));

test('empty history has no streak', () => {
  fresh();
  const s = stats();
  assert.equal(s.cur, 0); assert.equal(s.total, 0); assert.equal(s.longest, 0);
});

test('three complete days in a row make a 3-day streak, today incomplete does not break it', () => {
  fresh();
  [1, 2, 3].forEach((n) => doAll(daysAgo(n)));
  setVal(habitById('teeth'), todayKey(), 1);
  const s = stats();
  assert.equal(s.cur, 3); assert.equal(s.longest, 3); assert.equal(s.total, 16); assert.equal(s.best, 5);
});

test('completing today extends the streak', () => {
  fresh();
  [1, 2].forEach((n) => doAll(daysAgo(n)));
  doAll(todayKey());
  assert.equal(stats().cur, 3);
  assert.ok(complete(todayKey()));
});

test('a missed day resets the current streak but keeps the longest', () => {
  fresh();
  [5, 4, 3].forEach((n) => doAll(daysAgo(n)));
  doAll(daysAgo(1));
  const s = stats();
  assert.equal(s.cur, 1); assert.equal(s.longest, 3);
});

test('count habits need the full target', () => {
  fresh();
  const read = habitById('read');
  setVal(read, todayKey(), 14);
  assert.equal(level(todayKey()), 0);
  setVal(read, todayKey(), 15);
  assert.equal(level(todayKey()), 1);
});

test('day level scales 1-4 with share of habits done', () => {
  fresh();
  const k = todayKey();
  doAll(k);
  assert.equal(level(k), 4);
});

test('app limit: locked before unlock time, open after, used up after the minutes', () => {
  fresh();
  const app = { id: 'tiktok', name: 'TikTok', minutes: 10, unlock: '20:00' };
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
  assert.equal(usage(app, at(19, 59)).status, 'locked');
  assert.equal(usage(app, at(20, 1)).status, 'open');
  store.state.sessions[todayKey()] = { tiktok: [{ start: at(20, 0), end: null }] };
  assert.equal(usage(app, at(20, 5)).status, 'active');
  assert.equal(Math.round(usage(app, at(20, 5)).left / 60000), 5);
  assert.equal(usage(app, at(20, 11)).status, 'used');
});

test('stopping early keeps the rest of the minutes', () => {
  fresh();
  const app = { id: 'tiktok', name: 'TikTok', minutes: 10, unlock: '00:00' };
  startSession(app);
  const s = store.state.sessions[todayKey()].tiktok[0];
  s.start -= 3 * 60000;
  endSession(app);
  assert.equal(Math.round(usage(app).left / 60000), 7);
});

test('maths: 10 unique questions with whole-number answers', () => {
  const qs = makeQuestions(10);
  assert.equal(new Set(qs.map((q) => q.q)).size, 10);
  qs.forEach((q) => { assert.ok(Number.isInteger(q.a) && q.a >= 0, q.q); });
});

test('normalize repairs missing fields from old saves', () => {
  const s = normalize({ habits: [], settings: { warmup: '06:00' } });
  assert.equal(s.settings.warmup, '06:00'); assert.equal(s.settings.reminder, '21:00'); assert.ok(Array.isArray(s.apps));
});

test(`all ${PUZZLES.length} chess puzzles have a mate in one for White`, () => {
  PUZZLES.forEach((fen) => {
    const c = new Chess(fen);
    assert.equal(c.turn(), 'w', fen);
    assert.ok(c.moves({ verbose: true }).some((m) => { c.move(m); const ok = c.in_checkmate(); c.undo(); return ok; }), fen);
  });
});

console.log(`\n${passed} tests passed`);
