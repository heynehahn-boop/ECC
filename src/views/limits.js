// Limits screen. On iPhone it drives real Screen Time blocking; in a browser it falls back to the gate page.
import { S, usage, toMin, nowMin } from '../state.js';
import { ico, esc, fmtLeft, fmtClock } from '../ui.js';
import { screenTimeAvailable } from '../native.js';

export const st = { status: null }; // last answer from the native Screen Time plugin
export const WEB_URL = 'https://claude.ai/artifact/82dA4Wr5JHJN9LArqvQCrN';

function ruleRows(app) {
  return `
    <div class="kv"><label for="m-${app.id}">Minutes per day</label><input id="m-${app.id}" type="number" inputmode="numeric" min="1" max="240" value="${app.minutes}" data-change="app-min" data-app="${app.id}"></div>
    <div class="kv"><label for="u-${app.id}">Unlocks at</label><input id="u-${app.id}" type="time" value="${app.unlock}" data-change="app-unlock" data-app="${app.id}"></div>`;
}

function nativeCard() {
  const s = S(), app = s.apps[0], status = st.status || {};
  const authorized = !!status.authorized, count = status.selectedCount || 0, on = !!s.screenTime.enabled && authorized && count > 0;
  const before = nowMin() < toMin(app.unlock);
  const pill = !on ? '<span class="pill wait">Off</span>' : before ? `<span class="pill lock">${ico('lock')}Blocked</span>` : `<span class="pill ok">${ico('clock')}${app.minutes} min window</span>`;
  return `
  <section class="section">
    <div class="card pad" style="display:flex;flex-direction:column;gap:14px">
      <div class="app-head"><span class="tile danger" style="width:44px;height:44px;border-radius:12px">${ico('shield')}</span><div style="flex:1;min-width:0"><div class="title" style="font-weight:700;font-size:17px">Screen Time limit</div><div class="sub muted" style="font-size:14px">${on ? (before ? `Blocked until ${app.unlock}, then ${app.minutes} minutes` : `Open from ${app.unlock} for ${app.minutes} minutes`) : 'Block apps until a set time, then allow a few minutes'}</div></div>${pill}</div>
      ${!authorized ? '<button class="btn block" data-act="st-auth">Allow Screen Time access</button>' : `<button class="btn quiet block" data-act="st-pick">${ico('apps')}${count ? `${count} ${count === 1 ? 'app' : 'apps'} selected · Change` : 'Choose apps to limit'}</button>`}
    </div>
  </section>
  <section class="section">
    <div class="section-label"><h2>Rule</h2></div>
    <div class="card list">
      ${ruleRows(app)}
      <div class="kv"><label>Block with Screen Time</label><button class="switch" role="switch" aria-checked="${on}" data-act="st-toggle" ${authorized && count ? '' : 'disabled'} aria-label="Block with Screen Time"></button></div>
    </div>
    <p class="foot-note">iPhone shows its own “Time limit” screen on the blocked apps. Your choice of apps stays on this phone.</p>
  </section>`;
}

function webCards() {
  const s = S();
  return s.apps.map((app) => {
    const u = usage(app);
    const pill = u.status === 'locked' ? `<span class="pill lock">${ico('lock')}Locked</span>` : u.status === 'used' ? '<span class="pill lock">Used up</span>' : u.status === 'active' ? '<span class="pill wait">Running</span>' : '<span class="pill ok">Open</span>';
    return `
    <section class="section">
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">
        <div class="app-head"><span class="app-icon">${esc(app.name[0] || '?')}</span><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(app.name)}</div><div class="muted" style="font-size:14px">${fmtLeft(u.used / 60000)} used · ${fmtLeft(u.left / 60000)} left</div></div>${pill}</div>
        <div class="meter"><i style="width:${(u.used / u.allow) * 100}%"></i></div>
        <button class="btn quiet block" data-act="gate" data-app="${app.id}">Open the gate</button>
      </div>
      <div class="card list">${ruleRows(app)}</div>
    </section>`;
  }).join('') + `
  <section class="section">
    <div class="section-label"><h2>Send TikTok here first</h2></div>
    <div class="card pad" style="display:flex;flex-direction:column;gap:12px">
      <p class="muted" style="font-size:15px">A website can’t block apps. In the iPhone app this is real Screen Time blocking. Until then, a Shortcuts automation opens this gate whenever you open TikTok.</p>
      <ol class="steps">
        <li><span>In <b>Shortcuts</b>, tap <b>Automation</b> → <b>+</b> → <b>App</b>.</span></li>
        <li><span>Pick <b>TikTok</b>, tick <b>Is Opened</b>, choose <b>Run Immediately</b>.</span></li>
        <li><span>Add <b>Open URLs</b> with this link:</span></li>
      </ol>
      <code class="code">${WEB_URL}#gate</code>
      <button class="btn quiet sm" data-act="copy" data-text="${WEB_URL}#gate">Copy link</button>
    </div>
  </section>`;
}

export function renderLimits() {
  return `
  <header class="head"><div class="grow"><div class="eyebrow">Screen time</div><h1>Limits</h1></div></header>
  ${screenTimeAvailable ? nativeCard() : webCards()}`;
}

export function gateClock(app) {
  const u = usage(app);
  return u.status === 'locked' ? fmtClock((toMin(app.unlock) - nowMin()) * 60000) : fmtClock(u.left);
}

export function gateHTML(app) {
  const u = usage(app);
  let h = `<div class="gate"><span class="app-icon">${esc(app.name[0])}</span>`;
  if (u.status === 'locked') {
    h += `<span class="pill lock">${ico('lock')}Not yet</span><h1>${esc(app.name)} opens at ${app.unlock}</h1><div class="clock" id="gate-clock">${fmtClock((toMin(app.unlock) - nowMin()) * 60000)}</div><p class="muted">Use the time for one of today’s habits.</p><button class="btn block" data-act="close-ov">Back to my habits</button>`;
  } else if (u.status === 'used') {
    h += `<span class="pill lock">Time’s up</span><h1>That’s your ${app.minutes} minutes for today</h1><p class="muted">Back tomorrow at ${app.unlock}.</p><button class="btn block" data-act="close-ov">OK</button>`;
  } else if (u.status === 'active') {
    h += `<span class="pill wait">Timer running</span><div class="clock" id="gate-clock">${fmtClock(u.left)}</div><p class="muted">left today</p><a class="btn block" href="https://www.tiktok.com/" target="_blank" rel="noopener" style="text-decoration:none">Go to ${esc(app.name)}</a><button class="btn quiet block" data-act="gate-stop">I’m done for now</button>`;
  } else {
    h += `<span class="pill ok">Open</span><h1>You have ${fmtLeft(u.left / 60000)} of ${esc(app.name)}</h1><p class="muted">The timer starts when you tap the button.</p><button class="btn block" data-act="gate-start">Start ${fmtLeft(u.left / 60000)}</button>`;
  }
  return { html: h + '</div>', status: u.status };
}
