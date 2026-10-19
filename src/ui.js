// Small UI helpers shared by every screen: icons, formatting, sheets, toasts, confetti.
import { pad } from './state.js';

export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtClock(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
export function fmtLeft(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

const PATHS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M8 7h7"/>',
  tooth: '<path d="M7.5 3C5 3 3.5 4.8 3.5 7.3c0 3 1.6 4.4 2.1 8 .4 3 1.2 5.7 2.6 5.7 1.5 0 1.6-4.2 3.8-4.2s2.3 4.2 3.8 4.2c1.4 0 2.2-2.7 2.6-5.7.5-3.6 2.1-5 2.1-8C20.5 4.8 19 3 16.5 3 14.6 3 13.8 4 12 4S9.4 3 7.5 3z"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  phoneoff: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M3 3l18 18"/>',
  water: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  leaf: '<path d="M5 19C5 10 11 5 20 5c0 9-5 15-14 15"/><path d="M5 19l7-7"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  today: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17.5" r="1"/>',
  brain: '<path d="M9 4.5a3 3 0 0 0-3 3v.2A3 3 0 0 0 4 10.5a3 3 0 0 0 1 2.3A3 3 0 0 0 6.5 18 3 3 0 0 0 12 19V5.5A2.5 2.5 0 0 0 9 4.5z"/><path d="M15 4.5a3 3 0 0 1 3 3v.2a3 3 0 0 1 2 2.8 3 3 0 0 1-1 2.3 3 3 0 0 1-1.5 5.2A3 3 0 0 1 12 19"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 9 5 9 9s-9 4-9 9M16.5 3c0 5-9 5-9 9s9 4 9 9"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  back: '<path d="M10 6l-6 6 6 6M4 12h16"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/>',
  apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
};
export const HABIT_ICONS = ['book', 'tooth', 'dumbbell', 'phoneoff', 'water', 'moon', 'sun', 'leaf', 'heart', 'pen', 'star', 'bolt'];
export const ico = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.star}</svg>`;
export const flame = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2c.8 3.8 5.3 5.6 5.3 11.3A5.5 5.5 0 0 1 6.5 13.6c0-2.6 1.3-4.3 2.4-5.6.2 1.9 1 3 2.2 3.1-.3-3.4.2-6.6 1.1-9.1z"/></svg>';

export function ring(done, total) {
  const r = 27, c = 2 * Math.PI * r, f = total ? done / total : 0;
  return `<div class="ring" role="img" aria-label="${done} of ${total} done"><svg viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="${r}"/><circle class="val" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - f)).toFixed(1)}"/></svg><b class="num">${done}/${total}</b></div>`;
}

/* ---------- sheets, overlays, toast ---------- */
export function openSheet(html) {
  $('#sheet-root').innerHTML = `<div class="backdrop" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
}
export function closeSheetDom() { $('#sheet-root').innerHTML = ''; }
export const sheetOpen = () => !!$('#sheet-root').innerHTML;

export function showOverlay({ progress = null, tone = '' } = {}) {
  $('#overlay-root').innerHTML = `<div class="overlay" role="dialog" aria-modal="true"><div class="ov-in"><div class="ov-top"><button class="close" data-act="close-ov" aria-label="Close">${ico('x')}</button>${progress != null ? `<div class="track ${tone}"><i id="ov-prog" style="width:${progress}%"></i></div>` : ''}</div><div id="ov-body" class="ov-body"></div></div></div>`;
  document.body.style.overflow = 'hidden';
}
export function setProgress(p) { const el = $('#ov-prog'); if (el) el.style.width = `${p}%`; }
export function closeOverlayDom() { $('#overlay-root').innerHTML = ''; document.body.style.overflow = ''; }
export const overlayOpen = () => !!$('#overlay-root').innerHTML;

let toastTimer;
export function toast(msg) {
  $('#toast-root').innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast-root').innerHTML = ''; }, 2400);
}

export function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti');
  c.hidden = false;
  const dpr = window.devicePixelRatio || 1;
  const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr);
  const ctx = c.getContext('2d');
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--brand', '--streak', '--brain', '--h2', '--danger'].map((v) => cs.getPropertyValue(v).trim());
  const P = Array.from({ length: 130 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.6,
    vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 20 - 9) * dpr,
    r: (3 + Math.random() * 5) * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    P.forEach((p) => {
      p.vy += 0.65 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    });
    if (t - t0 < 2000) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); c.hidden = true; }
  })(t0);
}
