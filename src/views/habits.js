// Habits screen: the full list plus the add/edit sheet.
import { S, ALL_DAYS, todayKey, uid } from '../state.js';
import { ico, esc, HABIT_ICONS, DAY_NAMES } from '../ui.js';

function daysLabel(days) {
  if (days.length === 7) return 'Every day';
  if (!days.length) return 'Paused';
  const s = days.slice().sort();
  if (s.join() === '1,2,3,4,5') return 'Weekdays';
  if (s.join() === '0,6') return 'Weekends';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => s.includes(d)).map((d) => DAY_NAMES[d]).join(', ');
}

export function renderHabits() {
  const s = S();
  return `
  <header class="head"><div class="grow"><div class="eyebrow">Your routine</div><h1>Habits</h1></div><button class="text-btn" data-act="habit-new">${ico('plus')}New</button></header>
  <section class="section">
    <div class="card list">${s.habits.map((h) => `
      <button class="row tap" data-act="habit-edit" data-id="${h.id}">
        <span class="tile${h.auto ? ' brain' : ''}">${ico(h.icon)}</span>
        <span class="main"><span class="title" style="display:block">${esc(h.name)}</span><span class="sub" style="display:block">${daysLabel(h.days)}${h.target ? ` · ${h.target} ${esc(h.unit)}` : ''}${h.auto ? ' · ticks itself' : ''}</span></span>
        ${ico('right', 'chev')}
      </button>`).join('')}
    </div>
    <p class="foot-note">A habit with a goal, like 15 pages, gets a counter. The warm-up ticks itself when you finish a game.</p>
  </section>`;
}

export let draft = null;
export function habitSheet(h) {
  const isNew = !h;
  h = h || { id: uid(), name: '', icon: 'star', target: 0, unit: '', days: ALL_DAYS.slice(), created: todayKey() };
  draft = { ...JSON.parse(JSON.stringify(h)), _new: isNew };
  return `
    <div class="sheet-head"><h2>${isNew ? 'New habit' : 'Edit habit'}</h2><button class="close" data-act="close-sheet" aria-label="Close">${ico('x')}</button></div>
    <div class="card list field-card">
      <div class="kv"><label for="h-name">Name</label><input id="h-name" type="text" maxlength="40" value="${esc(h.name)}" placeholder="Read, Stretch…"></div>
      ${h.auto ? '' : `
      <div class="kv"><label for="h-target">Daily goal</label><input id="h-target" type="number" inputmode="numeric" min="0" max="999" value="${h.target || 0}"></div>
      <div class="kv"><label for="h-unit">Unit</label><input id="h-unit" type="text" maxlength="16" value="${esc(h.unit)}" placeholder="pages, min"></div>`}
    </div>
    ${h.auto ? '' : '<p class="foot-note">Leave the goal at 0 for a simple tick-off habit.</p>'}
    <div class="section"><div class="section-label"><span class="eyebrow">Icon</span></div>
      <div class="card picks">${HABIT_ICONS.map((i) => `<button class="pick${h.icon === i ? ' on' : ''}" data-act="pick-icon" data-icon="${i}" aria-label="${i}">${ico(i)}</button>`).join('')}</div></div>
    <div class="section"><div class="section-label"><span class="eyebrow">Days</span></div>
      <div class="card picks days">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button class="pick${h.days.includes(d) ? ' on' : ''}" data-act="pick-day" data-day="${d}" aria-label="${DAY_NAMES[d]}">${DAY_NAMES[d][0]}</button>`).join('')}</div></div>
    <button class="btn block" data-act="habit-save">${isNew ? 'Add habit' : 'Save'}</button>
    ${!isNew && !h.auto ? '<button class="btn danger block" data-act="habit-del">Delete habit</button>' : ''}`;
}
export function clearDraft() { draft = null; }
