// Quick maths: 10 easy sums, answers auto-check as you type.
import { S, makeQuestions } from '../state.js';
import { $, ico, fmtClock, showOverlay, setProgress } from '../ui.js';
import { tap, success, error } from '../native.js';

let g = null;
let finish = () => {};

export function startMath(onFinish) {
  finish = onFinish;
  g = { qs: makeQuestions(10), i: 0, input: '', correct: 0, start: Date.now(), lock: false, state: '', fb: '' };
  showOverlay({ progress: 0 });
  paint();
}
export const mathActive = () => !!g && !!$('#ov-body');
export function stopMath() { g = null; }

function paint() {
  const body = $('#ov-body');
  if (!g || !body) return;
  setProgress((g.i / 10) * 100);
  if (g.i >= 10) {
    const ms = g.end - g.start, best = S().best.math;
    body.innerHTML = `<div class="result"><span class="pill brain">Quick maths</span><div class="big num">${g.correct}/10</div><h2>${g.correct === 10 ? 'Perfect run' : g.correct >= 7 ? 'Nice work' : 'Brain is awake'}</h2>
      <div class="tiles3"><div><b class="num">${fmtClock(ms)}</b><span>time</span></div><div><b class="num">${(ms / 10000).toFixed(1)}s</b><span>per sum</span></div><div><b class="num">${best ? fmtClock(best) : '—'}</b><span>${g.newBest ? 'new best' : 'best'}</span></div></div></div>
      <button class="btn brain block" style="margin-top:auto" data-act="close-ov">Continue</button>`;
    return;
  }
  const q = g.qs[g.i];
  body.innerHTML = `<p class="muted center">Question ${g.i + 1} of 10</p><div class="q">${q.q}</div>
    <div class="answer ${g.state}" id="ans">${g.input || '&nbsp;'}</div><div class="feedback ${g.state}">${g.fb}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-act="key" data-k="${n}">${n}</button>`).join('')}<button class="key fn" data-act="key" data-k="c">Clear</button><button class="key" data-act="key" data-k="0">0</button><button class="key fn" data-act="key" data-k="b" aria-label="Delete">${ico('back')}</button></div>`;
}

export function mathKey(k) {
  if (!g || g.lock || g.i >= 10) return;
  tap();
  if (k === 'b') g.input = g.input.slice(0, -1);
  else if (k === 'c') g.input = '';
  else if (g.input.length < 3) g.input += k;
  const q = g.qs[g.i];
  if (/\d/.test(k) && g.input.length >= String(q.a).length) {
    g.lock = true;
    if (Number(g.input) === q.a) { g.correct++; g.state = 'ok'; g.fb = 'Correct'; paint(); setTimeout(next, 260); }
    else { g.state = 'bad'; g.fb = `It’s ${q.a}`; error(); paint(); const a = $('#ans'); if (a) a.classList.add('shake'); setTimeout(next, 900); }
    return;
  }
  paint();
}

function next() {
  if (!g) return;
  g.i++; g.input = ''; g.state = ''; g.fb = ''; g.lock = false;
  if (g.i >= 10) {
    g.end = Date.now();
    const ms = g.end - g.start, s = S();
    if (g.correct === 10 && (!s.best.math || ms < s.best.math)) { s.best.math = ms; g.newBest = true; }
    success();
    paint();
    finish({ mode: 'math', score: g.correct, ms });
    return;
  }
  paint();
}
