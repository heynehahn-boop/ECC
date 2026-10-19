// Settings sheet and the shareable month card.
import { S, todayKey, pad, level, stats } from '../state.js';
import { ico, esc, MONTHS } from '../ui.js';
import { isNative } from '../native.js';

export function settingsSheet(confirmErase) {
  const s = S(), st = s.settings;
  return `
    <div class="sheet-head"><h2>Settings</h2><button class="close" data-act="close-sheet" aria-label="Close">${ico('x')}</button></div>
    <div class="section"><div class="section-label"><span class="eyebrow">Profile</span></div>
      <div class="card list field-card">
        <div class="kv"><label for="s-name">Name</label><input id="s-name" type="text" maxlength="30" value="${esc(s.profile.name)}" placeholder="Your name"></div>
        <div class="kv"><label for="s-handle">Handle</label><input id="s-handle" type="text" maxlength="30" value="${esc(s.profile.handle)}" placeholder="@you"></div>
      </div></div>
    <div class="section"><div class="section-label"><span class="eyebrow">Daily times</span></div>
      <div class="card list">
        <div class="kv"><label for="s-warm">Morning warm-up</label><input id="s-warm" type="time" value="${st.warmup}"></div>
        <div class="kv"><label for="s-rem">Evening check</label><input id="s-rem" type="time" value="${st.reminder}"></div>
        ${isNative ? `<div class="kv"><label>Notifications</label><button class="switch" role="switch" id="s-notif" aria-checked="${!!st.notifications}" data-act="toggle-switch" aria-label="Notifications"></button></div>` : ''}
      </div>
      ${isNative ? '' : '<p class="foot-note">Reminders arrive as notifications in the iPhone app.</p>'}</div>
    <div class="section"><div class="section-label"><span class="eyebrow">Warm-up game</span></div>
      <div class="seg" id="s-mode">${[['math', 'Maths'], ['chess', 'Chess'], ['random', 'Random']].map(([v, l]) => `<button class="${st.mode === v ? 'on' : ''}" data-act="pick-mode" data-mode="${v}">${l}</button>`).join('')}</div></div>
    <button class="btn block" data-act="settings-save">Save</button>
    <div class="section"><div class="section-label"><span class="eyebrow">Your data</span></div>
      <div class="card list">
        <button class="row tap" data-act="export"><span class="tile neutral">${ico('share')}</span><span class="main title">Back up data</span>${ico('right', 'chev')}</button>
        <label class="row tap" for="s-import" style="cursor:pointer"><span class="tile neutral">${ico('back')}</span><span class="main title">Restore from backup</span>${ico('right', 'chev')}</label>
        <button class="row tap" data-act="erase"><span class="tile danger">${ico('x')}</span><span class="main title" style="color:var(--danger)">${confirmErase ? 'Tap again to erase everything' : 'Erase all data'}</span></button>
      </div>
      <input id="s-import" type="file" accept="application/json,.json" hidden></div>`;
}

export function shareSheet(url) {
  return `
    <div class="sheet-head"><h2>Share your month</h2><button class="close" data-act="close-sheet" aria-label="Close">${ico('x')}</button></div>
    <img class="share-img" src="${url}" alt="Your monthly activity card">
    <button class="btn block" data-act="share-card">${ico('share')}${isNative ? 'Share' : 'Save image'}</button>
    ${isNative ? '' : '<p class="foot-note">You can also press and hold the image to save it.</p>'}`;
}

// Draws the month card (1080×1080) with the current theme colours.
export function drawShareCard(month) {
  const W = 1080, H = 1080, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d'), cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  const ui = '-apple-system, "SF Pro Rounded", Nunito, system-ui, sans-serif';
  const rr = (X, Y, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); };
  const s = S(), name = s.profile.name || 'My month', handle = s.profile.handle ? '@' + s.profile.handle.replace(/^@/, '') : '';
  x.fillStyle = v('--bg'); x.fillRect(0, 0, W, H);
  x.fillStyle = v('--card'); rr(48, 48, W - 96, H - 96, 56); x.fill();
  x.fillStyle = v('--brand-soft'); x.beginPath(); x.arc(156, 160, 52, 0, Math.PI * 2); x.fill();
  x.fillStyle = v('--brand'); x.font = `800 48px ${ui}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((name[0] || 'R').toUpperCase(), 156, 162);
  x.textAlign = 'left'; x.fillStyle = v('--ink'); x.font = `800 44px ${ui}`; x.fillText(name, 230, handle ? 142 : 160);
  if (handle) { x.fillStyle = v('--ink-2'); x.font = `600 30px ${ui}`; x.fillText(handle, 230, 188); }
  x.textAlign = 'right'; x.fillStyle = v('--brand'); x.font = `800 40px ${ui}`; x.fillText('Routine', W - 108, 160);
  x.textAlign = 'left'; x.fillStyle = v('--ink-2'); x.font = `700 28px ${ui}`; x.fillText(`${MONTHS[month.getMonth()]} ${month.getFullYear()}`.toUpperCase(), 108, 270);
  const gap = 14, cell = 74, gx = (W - (cell * 7 + gap * 6)) / 2, y0 = 310;
  const yr = month.getFullYear(), mo = month.getMonth(), days = new Date(yr, mo + 1, 0).getDate(), off = (new Date(yr, mo, 1).getDay() + 6) % 7, today = todayKey();
  for (let d = 1; d <= days; d++) {
    const i = off + d - 1, cx = gx + (i % 7) * (cell + gap), cy = y0 + Math.floor(i / 7) * (cell + gap), k = `${yr}-${pad(mo + 1)}-${pad(d)}`;
    if (k > today) { x.strokeStyle = v('--sep'); x.lineWidth = 3; rr(cx + 2, cy + 2, cell - 4, cell - 4, 16); x.stroke(); continue; }
    x.fillStyle = v('--h' + level(k)); rr(cx, cy, cell, cell, 16); x.fill();
  }
  const st = stats(), cols = [[st.total, 'total done'], [st.best, 'best day'], [`${st.cur}d`, 'current streak'], [`${st.longest}d`, 'longest streak']];
  const sy = 905, cw = (W - 216) / 4;
  x.strokeStyle = v('--sep'); x.lineWidth = 3; x.beginPath(); x.moveTo(108, sy - 78); x.lineTo(W - 108, sy - 78); x.stroke();
  cols.forEach(([n, l], i) => {
    const cx = 108 + cw * i + cw / 2; x.textAlign = 'center';
    x.fillStyle = v('--ink'); x.font = `800 56px ${ui}`; x.fillText(String(n), cx, sy - 12);
    x.fillStyle = v('--ink-2'); x.font = `600 26px ${ui}`; x.fillText(l, cx, sy + 40);
    if (i) { x.beginPath(); x.moveTo(108 + cw * i, sy - 50); x.lineTo(108 + cw * i, sy + 50); x.stroke(); }
  });
  return c.toDataURL('image/png');
}
