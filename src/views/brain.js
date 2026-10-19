// Brain screen: pick a game, see today's warm-up and personal bests.
import { S, todayKey } from '../state.js';
import { ico, fmtClock } from '../ui.js';
import PUZZLES from '../puzzles.js';

const MODE = { math: 'Quick maths', chess: 'Mate in 1', random: 'Random each day' };

export function renderBrain() {
  const s = S(), b = s.brain[todayKey()];
  return `
  <header class="head"><div class="grow"><div class="eyebrow">Wake your brain up</div><h1>Brain</h1></div>
    ${b ? `<span class="pill ok">${ico('check')}Done today</span>` : `<span class="pill brain">${ico('clock')}${s.settings.warmup}</span>`}</header>
  <div class="games">
    <button class="game" data-act="play" data-mode="math"><span class="art">4×2</span><span class="gt">Quick maths</span><span class="gs">10 easy sums</span></button>
    <button class="game chess" data-act="play" data-mode="chess"><span class="art">&#x265E;&#xFE0E;</span><span class="gt">Mate in 1</span><span class="gs">3 puzzles, one move each</span></button>
  </div>
  <section class="section">
    <div class="section-label"><h2>Morning warm-up</h2></div>
    <div class="card list">
      <div class="row"><span class="tile brain">${ico('clock')}</span><div class="main"><div class="title">Starts at ${s.settings.warmup}</div><div class="sub">${MODE[s.settings.mode]}</div></div><button class="text-btn" data-act="settings">Change</button></div>
      <div class="row"><span class="tile brain">${ico('bolt')}</span><div class="main"><div class="title">${b ? (b.mode === 'math' ? `${b.score}/10 in ${fmtClock(b.ms)}` : `${b.score} of ${b.of} puzzles solved`) : 'Not done yet'}</div><div class="sub">Today</div></div>${b ? '' : '<button class="btn brain sm" data-act="warmup">Start</button>'}</div>
    </div>
  </section>
  <section class="section">
    <div class="section-label"><h2>Records</h2></div>
    <div class="card list">
      <div class="row"><span class="tile streak">${ico('star')}</span><div class="main"><div class="title">Fastest perfect maths run</div></div><span class="num">${s.best.math ? fmtClock(s.best.math) : '—'}</span></div>
      <div class="row"><span class="tile">${ico('check')}</span><div class="main"><div class="title">Chess puzzles solved</div><div class="sub">${PUZZLES.length} in the library</div></div><span class="num">${s.chessSolved}</span></div>
    </div>
  </section>`;
}
