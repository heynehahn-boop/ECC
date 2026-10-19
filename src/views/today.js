// Today screen: month heatmap with stats, today's progress and the habit list.
import { S, todayKey, parseKey, pad, scheduled, isDone, val, dayStat, level, stats, usage, toMin, nowMin, habitById } from '../state.js';
import { ico, esc, flame, ring, MONTHS, fmtClock, fmtLeft } from '../ui.js';

export const view = { month: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(), popToday: false };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function calendar(month) {
  const y = month.getFullYear(), mo = month.getMonth();
  const days = new Date(y, mo + 1, 0).getDate();
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7;
  const today = todayKey();
  let h = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) h += '<div class="cell blank"></div>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(mo + 1)}-${pad(d)}`;
    if (k > today) { h += '<div class="cell future" aria-hidden="true"></div>'; continue; }
    const st = dayStat(k);
    const cls = `cell h${level(k)}${k === today ? ' today' : ''}${k === today && view.popToday ? ' pop' : ''}`;
    h += `<button class="${cls}" data-act="day" data-k="${k}" aria-label="${MONTHS[mo]} ${d}: ${st.d} of ${st.s} done"></button>`;
  }
  return `<div class="cal" id="cal">${h}</div>`;
}

export function habitRow(h, k) {
  const done = isDone(h, k), v = val(h, k);
  let sub;
  if (h.auto) sub = done ? `Done${brainSummary(k)}` : `At ${S().settings.warmup} · about 1 minute`;
  else if (h.target) sub = `${Math.min(v, 999)} of ${h.target} ${esc(h.unit)}`;
  else sub = done ? 'Done' : '';
  const bar = h.target && !h.auto ? `<div class="bar"><i style="width:${Math.min(100, (v / h.target) * 100)}%"></i></div>` : '';
  const stepper = h.target && !h.auto && !done
    ? `<div class="stepper"><button data-act="step" data-id="${h.id}" data-k="${k}" data-n="-1" aria-label="One less">−</button><button data-act="step" data-id="${h.id}" data-k="${k}" data-n="1" aria-label="One more">+</button></div>` : '';
  const check = h.auto && !done && k === todayKey()
    ? `<button class="check play" data-act="warmup" aria-label="Start warm-up">${ico('play')}</button>`
    : `<button class="check" data-act="toggle" data-id="${h.id}" data-k="${k}" aria-pressed="${done}" aria-label="${done ? 'Undo' : 'Complete'} ${esc(h.name)}">${ico('check')}</button>`;
  return `<div class="row habit${done ? ' done' : ''}"><span class="tile${h.auto ? ' brain' : ''}">${ico(h.icon)}</span><div class="main"><div class="title">${esc(h.name)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${bar}</div>${stepper}${check}</div>`;
}

export function brainSummary(k) {
  const b = S().brain[k];
  if (!b) return '';
  return b.mode === 'math' ? ` · ${b.score}/10 in ${fmtClock(b.ms)}` : ` · ${b.score} of ${b.of} puzzles`;
}

// The one most useful next step, shown under the progress ring.
function nextStep() {
  const s = S(), today = todayKey(), n = nowMin();
  const brain = habitById('brain');
  if (brain && brain.days.includes(new Date().getDay()) && !isDone(brain, today)) {
    if (n >= toMin(s.settings.warmup)) return `<div class="next"><span class="tile brain">${ico('bolt')}</span><div class="main"><b>Warm-up is ready</b><br><span>Quick sums or a chess puzzle</span></div><button class="btn brain sm" data-act="warmup">Start</button></div>`;
  }
  const app = s.apps[0];
  if (app) {
    const u = usage(app);
    const line = u.status === 'locked'
      ? `<b>${esc(app.name)} unlocks at ${app.unlock}</b><br><span>In ${fmtLeft(toMin(app.unlock) - n)}</span>`
      : u.status === 'used' ? `<b>${esc(app.name)} time used up</b><br><span>Back tomorrow at ${app.unlock}</span>`
        : `<b>${fmtLeft(u.left / 60000)} of ${esc(app.name)} left</b><br><span>${u.status === 'active' ? 'Timer running' : 'Unlocked now'}</span>`;
    return `<button class="next" data-act="tab" data-tab="limits" style="width:100%;text-align:left"><span class="tile ${u.status === 'locked' || u.status === 'used' ? 'danger' : 'streak'}">${ico(u.status === 'locked' ? 'lock' : 'hourglass')}</span><div class="main">${line}</div>${ico('right', 'chev')}</button>`;
  }
  return '';
}

export function renderToday() {
  const s = S(), st = stats(), today = todayKey();
  const sched = scheduled(today), done = sched.filter((h) => isDone(h, today)).length;
  const left = sched.length - done;
  const now = new Date();
  const isCurMonth = view.month.getFullYear() === now.getFullYear() && view.month.getMonth() === now.getMonth();
  const late = nowMin() >= toMin(s.settings.reminder);
  const summaryTitle = !sched.length ? 'Nothing scheduled today' : left === 0 ? 'Perfect day' : `${left} ${left === 1 ? 'habit' : 'habits'} to go`;
  const summarySub = !sched.length ? 'Add habits in the Habits tab' : left === 0 ? `Streak: ${st.cur} ${st.cur === 1 ? 'day' : 'days'}` : late ? 'Finish them before bed to keep your streak' : `${done} of ${sched.length} done so far`;
  const name = s.profile.name;
  return `
  <header class="head">
    <div class="grow"><div class="eyebrow">${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greeting()}${name ? `, ${esc(name)}` : ''}</h1></div>
    <span class="chip${st.cur ? '' : ' off'}" aria-label="Current streak ${st.cur} days">${flame()}<span class="num">${st.cur}</span></span>
    <button class="avatar-btn" data-act="settings" aria-label="Profile and settings">${esc((name || 'Me')[0].toUpperCase())}</button>
  </header>

  <section class="card month" aria-label="Monthly activity">
    <div class="month-head">
      <h2>${MONTHS[view.month.getMonth()]}${view.month.getFullYear() !== now.getFullYear() ? ' ' + view.month.getFullYear() : ''}</h2>
      <button class="icon-btn" data-act="share" aria-label="Share this month">${ico('share')}</button>
      <button class="icon-btn" data-act="month" data-dir="-1" aria-label="Previous month">${ico('left')}</button>
      <button class="icon-btn" data-act="month" data-dir="1" aria-label="Next month"${isCurMonth ? ' disabled' : ''}>${ico('right')}</button>
    </div>
    ${calendar(view.month)}
    <div class="legend">Less <i style="background:var(--h0)"></i><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i> More</div>
    <div class="stats">
      <div class="stat"><b class="num">${st.total}</b><span>total done</span></div>
      <div class="stat"><b class="num">${st.best}</b><span>best day</span></div>
      <div class="stat"><b class="num">${st.cur}<small> d</small></b><span>current streak</span></div>
      <div class="stat"><b class="num">${st.longest}<small> d</small></b><span>longest streak</span></div>
    </div>
  </section>

  <section class="section" aria-label="Today">
    <div class="card">
      <div class="summary">${ring(done, sched.length)}<div><div class="title">${summaryTitle}</div><div class="sub">${summarySub}</div></div></div>
      ${nextStep()}
    </div>
  </section>

  <section class="section" aria-label="Today's habits">
    <div class="section-label"><h2>Habits</h2><button class="text-btn" data-act="tab" data-tab="habits">Edit</button></div>
    <div class="card list">${sched.map((h) => habitRow(h, today)).join('') || '<div class="row"><div class="main sub">No habits today.</div></div>'}</div>
  </section>`;
}

export function dayList(k) {
  const sched = scheduled(k);
  return sched.map((h) => habitRow(h, k)).join('') || '<div class="row"><div class="main sub">Nothing was scheduled.</div></div>';
}

export function dayDetail(k) {
  const d = parseKey(k), st = dayStat(k);
  return `<div class="sheet-head"><h2>${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><button class="close" data-act="close-sheet" aria-label="Close">${ico('x')}</button></div>
    <p class="muted">${st.d} of ${st.s} done${brainSummary(k)}</p>
    <div class="card list" id="day-list">${dayList(k)}</div>`;
}
