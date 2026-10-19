// Mate in 1: three puzzles, tap or drag a piece. After two misses the piece to move is highlighted.
import { Chess } from 'chess.js';
import PUZZLES from '../puzzles.js';
import { S } from '../state.js';
import { $, showOverlay, setProgress } from '../ui.js';
import { tap, success, error } from '../native.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';
let g = null;
let finish = () => {};
let onSave = () => {};

export function startChess(onFinish, save) {
  finish = onFinish; onSave = save;
  const s = S();
  const list = [0, 1, 2].map((i) => PUZZLES[(s.chessIdx + i) % PUZZLES.length]);
  g = { list, i: 0, solved: 0, mistakes: 0 };
  showOverlay({ progress: 0, tone: 'green' });
  load();
}
export function stopChess() { g = null; }

function load() {
  g.c = new Chess(g.list[g.i]);
  g.sel = null; g.last = null; g.done = false; g.tries = 0;
  g.msg = 'White to move · find checkmate'; g.cls = '';
  g.mate = g.c.moves({ verbose: true }).find((m) => { g.c.move(m); const ok = g.c.in_checkmate(); g.c.undo(); return ok; });
  $('#ov-body').innerHTML = '';
  paint();
}

function boardHTML() {
  const targets = g.sel ? g.c.moves({ square: g.sel, verbose: true }).map((m) => m.to) : [];
  const hint = g.tries >= 2 && g.mate && !g.done ? g.mate.from : null;
  let h = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = FILES[f] + (8 - r), p = g.c.get(sq);
      const cls = ['sq', (r + f) % 2 ? 'd' : '', g.sel === sq ? 'sel' : '', g.last && (g.last.from === sq || g.last.to === sq) ? 'last' : '', targets.includes(sq) ? `tgt${p ? ' cap' : ''}` : '', hint === sq ? 'hint' : ''].join(' ');
      h += `<div class="${cls}" data-sq="${sq}">${f === 0 ? `<span class="cr">${8 - r}</span>` : ''}${r === 7 ? `<span class="cf">${FILES[f]}</span>` : ''}${p ? `<span class="pc ${p.color}">${GLYPH[p.type]}︎</span>` : ''}</div>`;
    }
  }
  return h;
}

function paint() {
  const body = $('#ov-body');
  if (!g || !body) return;
  setProgress(((g.i + (g.done ? 1 : 0)) / g.list.length) * 100);
  if (g.i >= g.list.length) {
    body.innerHTML = `<div class="result"><span class="pill ok">Mate in 1</span><div class="big num">${g.solved}/${g.list.length}</div><h2>${g.mistakes === 0 ? 'Clean sweep' : 'All solved'}</h2>
      <div class="tiles3"><div><b class="num">${g.solved}</b><span>solved</span></div><div><b class="num">${g.mistakes}</b><span>${g.mistakes === 1 ? 'miss' : 'misses'}</span></div><div><b class="num">${S().chessSolved}</b><span>all time</span></div></div></div>
      <button class="btn block" style="margin-top:auto" data-act="close-ov">Continue</button>`;
    return;
  }
  const foot = g.done
    ? `<button class="btn block" data-act="chess-next">${g.i + 1 < g.list.length ? 'Next puzzle' : 'See result'}</button>`
    : `<p class="muted center" style="font-size:14px">Tap a piece, then its square, or drag it.${g.tries >= 2 ? ' The outlined piece is the one to move.' : ''}</p>`;
  const board = $('#board');
  if (board) {
    board.innerHTML = boardHTML();
    board.classList.toggle('win', g.done);
    $('#cmsg').className = `chess-msg ${g.cls}`; $('#cmsg').textContent = g.msg;
    $('#cfoot').innerHTML = foot;
    return;
  }
  body.innerHTML = `<p class="muted center">Puzzle ${g.i + 1} of ${g.list.length}</p><div class="chess-msg ${g.cls}" id="cmsg">${g.msg}</div>
    <div class="board${g.done ? ' win' : ''}" id="board" aria-label="Chess board">${boardHTML()}</div>
    <div id="cfoot" style="margin-top:auto;display:flex;flex-direction:column;gap:10px">${foot}</div>`;
  bind($('#board'));
}

function tryMove(from, to) {
  if (g.done) return;
  const m = g.c.move({ from, to, promotion: 'q' });
  if (!m) { g.sel = null; paint(); return; }
  if (g.c.in_checkmate()) {
    g.done = true; g.solved++; g.last = m; g.sel = null; g.msg = 'Checkmate!'; g.cls = 'ok';
    S().chessSolved = (S().chessSolved || 0) + 1;
    success(); paint(); onSave();
  } else {
    g.c.undo(); g.tries++; g.mistakes++; g.sel = null; g.msg = 'Not mate. Try again.'; g.cls = 'bad';
    error(); paint();
    const b = $('#board'); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  }
}

export function chessNext() {
  if (!g) return;
  g.i++;
  if (g.i >= g.list.length) {
    const s = S();
    s.chessIdx = (s.chessIdx + g.list.length) % PUZZLES.length;
    $('#ov-body').innerHTML = '';
    paint();
    finish({ mode: 'chess', score: g.solved, of: g.list.length, mistakes: g.mistakes });
    return;
  }
  load();
}

function bind(board) {
  let start = null, ghost = null;
  const sqAt = (x, y) => { const el = document.elementFromPoint(x, y); const s = el && el.closest('[data-sq]'); return s ? s.dataset.sq : null; };
  board.addEventListener('pointerdown', (e) => {
    if (!g || g.done) return;
    const sq = sqAt(e.clientX, e.clientY);
    if (!sq) return;
    start = { sq, x: e.clientX, y: e.clientY, dragging: false };
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  board.addEventListener('pointermove', (e) => {
    if (!start || !g) return;
    const p = g.c.get(start.sq);
    if (!start.dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 && p && p.color === 'w') {
      start.dragging = true; g.sel = start.sq; paint();
      ghost = document.createElement('span'); ghost.className = 'pc w drag-ghost'; ghost.textContent = GLYPH[p.type] + '︎';
      document.body.appendChild(ghost);
    }
    if (ghost) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
  });
  board.addEventListener('pointerup', (e) => {
    if (!start || !g) return;
    const s0 = start; start = null;
    if (ghost) { ghost.remove(); ghost = null; }
    if (g.done) return;
    const target = sqAt(e.clientX, e.clientY);
    if (s0.dragging) { if (target && target !== s0.sq) tryMove(s0.sq, target); else paint(); return; }
    const p = g.c.get(s0.sq);
    if (g.sel && g.sel !== s0.sq && g.c.moves({ square: g.sel, verbose: true }).some((m) => m.to === s0.sq)) tryMove(g.sel, s0.sq);
    else if (p && p.color === 'w') { g.sel = g.sel === s0.sq ? null : s0.sq; tap(); paint(); }
    else { g.sel = null; paint(); }
  });
  board.addEventListener('pointercancel', () => { start = null; if (ghost) { ghost.remove(); ghost = null; } });
}
