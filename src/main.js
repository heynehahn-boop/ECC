// App entry: loads saved data, renders the current tab and handles every tap.
import './styles.css';
import {
  S, store, replaceState, defaults, normalize, todayKey, habitById, isDone, val, setVal, complete, stats,
  startSession, endSession,
} from './state.js';
import {
  $, toast, openSheet, closeSheetDom, sheetOpen, showOverlay, closeOverlayDom, overlayOpen, confetti, ico,
} from './ui.js';
import * as native from './native.js';
import { renderToday, dayDetail, dayList, view as todayView } from './views/today.js';
import { renderHabits, habitSheet, draft, clearDraft } from './views/habits.js';
import { renderBrain } from './views/brain.js';
import { renderLimits, gateHTML, gateClock, st as stView } from './views/limits.js';
import { settingsSheet, shareSheet, drawShareCard } from './views/settings.js';
import { startMath, mathKey, mathActive, stopMath } from './games/math.js';
import { startChess, chessNext, stopChess } from './games/chess.js';
import PUZZLES from './puzzles.js';

let tab = 'today';
let daySheetKey = null;
let confirm = null; // which destructive button is waiting for a second tap
let shareUrl = null;
let gate = null;

/* ---------- saving ---------- */
let syncRef = null, pushTimer = null, pushing = false, pushAgain = false;
function save() {
  S().updatedAt = Date.now();
  native.saveRaw(S());
  if (syncRef) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 700); }
}
async function push() {
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  try { await syncRef.set(JSON.parse(JSON.stringify(S()))); } catch (e) { console.warn('[Routine] sync failed'); }
  pushing = false;
  if (pushAgain) { pushAgain = false; push(); }
}
// On claude.ai the web preview keeps a private copy in the viewer's account.
async function initWebSync() {
  try {
    const claude = window.claude;
    if (native.isNative || !claude || !claude.use) return;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    const ref = db.collection(`data/users/${id}`).doc('state');
    const snap = await ref.get();
    syncRef = ref;
    if (snap.exists) {
      const remote = snap.data();
      if ((remote.updatedAt || 0) > (S().updatedAt || 0)) { replaceState(remote); native.saveRaw(S()); render(); }
      else if ((S().updatedAt || 0) > (remote.updatedAt || 0)) push();
    } else if (S().updatedAt) push();
  } catch (e) { /* preview without sync */ }
}

/* ---------- rendering ---------- */
function renderTabs() {
  const tabs = [['today', 'Today', 'today'], ['habits', 'Habits', 'list'], ['brain', 'Brain', 'brain'], ['limits', 'Limits', 'hourglass']];
  $('#tabs').innerHTML = tabs.map(([id, label, icon]) => `<button class="tab${tab === id ? ' on' : ''}" data-act="tab" data-tab="${id}" aria-current="${tab === id ? 'page' : 'false'}">${ico(icon)}${label}</button>`).join('');
}
function render() {
  renderTabs();
  const m = $('#main');
  m.className = 'screen enter';
  m.innerHTML = tab === 'today' ? renderToday() : tab === 'habits' ? renderHabits() : tab === 'brain' ? renderBrain() : renderLimits();
  if (tab === 'today') bindSwipe();
}
function rerenderKeepMotion() {
  const m = $('#main');
  render();
  m.className = 'screen';
}
function bindSwipe() {
  const cal = $('#cal');
  if (!cal) return;
  let x0 = null, y0 = null;
  cal.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  cal.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) changeMonth(dx < 0 ? 1 : -1);
  });
}
function changeMonth(dir) {
  const n = new Date(todayView.month.getFullYear(), todayView.month.getMonth() + dir, 1);
  const now = new Date();
  if (n > new Date(now.getFullYear(), now.getMonth(), 1)) return;
  todayView.month = n;
  rerenderKeepMotion();
}

/* ---------- habit changes ---------- */
function celebrate() {
  todayView.popToday = true;
  confetti();
  native.success();
  const s = stats();
  toast(`Perfect day · ${s.cur} day streak`);
  setTimeout(() => { todayView.popToday = false; }, 600);
}
function changeHabit(h, k, v) {
  const was = complete(todayKey());
  setVal(h, k, v);
  save();
  if (k === todayKey() && !was && complete(k)) celebrate();
  if (daySheetKey && $('#day-list')) $('#day-list').innerHTML = dayList(daySheetKey);
  rerenderKeepMotion();
}

/* ---------- games ---------- */
function finishBrain(rec) {
  const k = todayKey(), was = complete(k);
  S().brain[k] = rec;
  S().log[k] = S().log[k] || {};
  S().log[k].brain = 1;
  save();
  if (!was && complete(k)) celebrate();
}
function startGame(mode) {
  closeSheet();
  if (mode === 'chess' && PUZZLES.length) startChess(finishBrain, save);
  else startMath(finishBrain);
}
function startWarmup() {
  let mode = S().settings.mode;
  if (mode === 'random') mode = new Date().getDate() % 2 ? 'chess' : 'math';
  startGame(mode);
}
function closeOverlay() {
  closeOverlayDom();
  stopMath(); stopChess();
  clearInterval(gate && gate.timer); gate = null;
  if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
  render();
}

/* ---------- web gate ---------- */
function openGate(appId) {
  const app = S().apps.find((a) => a.id === appId) || S().apps[0];
  if (!app) return;
  showOverlay();
  gate = { app, status: null, timer: setInterval(paintGate, 1000) };
  paintGate();
}
function paintGate() {
  const body = $('#ov-body');
  if (!gate || !body) return;
  const { html, status } = gateHTML(gate.app);
  if (status !== gate.status) { body.innerHTML = html; gate.status = status; return; }
  const clock = $('#gate-clock');
  if (clock) clock.textContent = gateClock(gate.app);
}

/* ---------- Screen Time (iPhone) ---------- */
async function refreshScreenTime() {
  if (!native.screenTimeAvailable) return;
  stView.status = await native.stStatus();
  if (tab === 'limits') rerenderKeepMotion();
}
async function applyScreenTime() {
  if (!native.screenTimeAvailable) return;
  try { await native.stApply(S().apps[0], S().screenTime.enabled); } catch (e) { toast('Screen Time could not be updated'); }
}

/* ---------- sheets ---------- */
function closeSheet() { closeSheetDom(); clearDraft(); daySheetKey = null; confirm = null; }

/* ---------- events ---------- */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, k = el.dataset.k;
  switch (a) {
    case 'tab': closeSheet(); tab = el.dataset.tab; window.scrollTo(0, 0); render(); native.tap(); if (tab === 'limits') refreshScreenTime(); break;
    case 'month': changeMonth(Number(el.dataset.dir)); break;
    case 'day': daySheetKey = k; openSheet(dayDetail(k)); break;
    case 'toggle': { const h = habitById(el.dataset.id); if (!h) break; native.tap(); changeHabit(h, k, isDone(h, k) ? 0 : (h.target || 1)); break; }
    case 'step': { const h = habitById(el.dataset.id); if (!h) break; native.tap(); changeHabit(h, k, Math.max(0, Math.min(999, val(h, k) + Number(el.dataset.n)))); break; }
    case 'warmup': startWarmup(); break;
    case 'play': startGame(el.dataset.mode); break;
    case 'key': mathKey(k); break;
    case 'chess-next': chessNext(); break;
    case 'close-ov': closeOverlay(); break;
    case 'gate': openGate(el.dataset.app); break;
    case 'gate-start': if (gate) { startSession(gate.app); save(); native.tap(); gate.status = null; paintGate(); } break;
    case 'gate-stop': if (gate) { endSession(gate.app); save(); gate.status = null; paintGate(); toast('Timer stopped. The rest is saved for later.'); } break;
    case 'settings': confirm = null; openSheet(settingsSheet(false)); break;
    case 'toggle-switch': el.setAttribute('aria-checked', el.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); native.tap(); break;
    case 'pick-mode': el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); break;
    case 'settings-save': {
      const s = S();
      s.profile.name = $('#s-name').value.trim();
      s.profile.handle = $('#s-handle').value.trim().replace(/^@/, '');
      s.settings.warmup = $('#s-warm').value || '07:30';
      s.settings.reminder = $('#s-rem').value || '21:00';
      const mode = $('#s-mode .on'); if (mode) s.settings.mode = mode.dataset.mode;
      const notif = $('#s-notif'); if (notif) s.settings.notifications = notif.getAttribute('aria-checked') === 'true';
      save(); closeSheet(); render(); toast('Settings saved');
      const r = await native.scheduleReminders(s.settings);
      if (r.reason === 'denied') toast('Turn on notifications for Routine in iPhone Settings');
      break;
    }
    case 'share': {
      try { await (document.fonts && document.fonts.ready); } catch (err) { /* ignore */ }
      shareUrl = drawShareCard(todayView.month);
      openSheet(shareSheet(shareUrl));
      break;
    }
    case 'share-card':
      try { const r = await native.shareImage(shareUrl, 'routine-month.png'); if (r === 'saved') toast('Image saved'); }
      catch (err) { if (!err || (err.code !== 'declined' && !/cancel/i.test(err.message || ''))) toast('Press and hold the image to save it'); }
      break;
    case 'export':
      try { const r = await native.shareText('routine-backup.json', JSON.stringify(S(), null, 2)); if (r === 'saved') toast('Backup saved'); }
      catch (err) { if (!err || (err.code !== 'declined' && !/cancel/i.test(err.message || ''))) toast('Could not save the backup'); }
      break;
    case 'erase':
      if (confirm !== 'erase') { confirm = 'erase'; el.querySelector('.title').textContent = 'Tap again to erase everything'; break; }
      replaceState(defaults()); save(); closeSheet(); render(); toast('All data erased'); break;
    case 'close-sheet': closeSheet(); break;
    case 'sheet-bg': if (e.target === el) closeSheet(); break;
    case 'habit-new': openSheet(habitSheet(null)); break;
    case 'habit-edit': openSheet(habitSheet(habitById(el.dataset.id))); break;
    case 'pick-icon': draft.icon = el.dataset.icon; el.parentElement.querySelectorAll('.pick').forEach((p) => p.classList.toggle('on', p === el)); native.tap(); break;
    case 'pick-day': { const d = Number(el.dataset.day); draft.days = draft.days.includes(d) ? draft.days.filter((x) => x !== d) : draft.days.concat(d); el.classList.toggle('on'); native.tap(); break; }
    case 'habit-save': {
      const name = $('#h-name').value.trim();
      if (!name) { $('#h-name').focus(); toast('Give the habit a name'); break; }
      const next = { ...draft, name };
      if ($('#h-target')) { next.target = Math.max(0, Math.min(999, parseInt($('#h-target').value, 10) || 0)); next.unit = $('#h-unit').value.trim(); }
      const isNew = next._new; delete next._new;
      const s = S();
      if (isNew) s.habits.push(next); else s.habits = s.habits.map((h) => (h.id === next.id ? next : h));
      save(); closeSheet(); render(); toast(isNew ? 'Habit added' : 'Saved');
      break;
    }
    case 'habit-del':
      if (confirm !== 'del') { confirm = 'del'; el.textContent = 'Tap again to delete'; break; }
      S().habits = S().habits.filter((h) => h.id !== draft.id); save(); closeSheet(); render(); toast('Habit deleted'); break;
    case 'copy':
      navigator.clipboard.writeText(el.dataset.text).then(() => toast('Link copied'), () => toast('Press and hold the link to copy it'));
      break;
    case 'st-auth':
      try { await native.stAuthorize(); } catch (err) { toast('Screen Time access was not allowed'); }
      await refreshScreenTime();
      break;
    case 'st-pick':
      try { const r = await native.stPickApps(); S().screenTime.selected = r.selectedCount || 0; save(); await applyScreenTime(); } catch (err) { /* cancelled */ }
      await refreshScreenTime();
      break;
    case 'st-toggle':
      S().screenTime.enabled = !S().screenTime.enabled; save(); native.tap();
      await applyScreenTime(); await refreshScreenTime();
      toast(S().screenTime.enabled ? 'Screen Time limit on' : 'Screen Time limit off');
      break;
    default: break;
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.id === 's-import' && el.files && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try { const data = JSON.parse(r.result); if (!Array.isArray(data.habits)) throw new Error('bad'); replaceState(data); save(); closeSheet(); render(); toast('Data restored'); }
      catch (err) { toast('That file is not a Routine backup'); }
    };
    r.readAsText(el.files[0]);
    return;
  }
  const act = el.dataset.change;
  if (!act) return;
  const app = S().apps.find((x) => x.id === el.dataset.app);
  if (!app) return;
  if (act === 'app-min') app.minutes = Math.max(1, Math.min(240, parseInt(el.value, 10) || app.minutes));
  if (act === 'app-unlock' && el.value) app.unlock = el.value;
  save();
  await applyScreenTime();
  rerenderKeepMotion();
});

document.addEventListener('keydown', (e) => {
  if (mathActive()) { if (/^\d$/.test(e.key)) mathKey(e.key); else if (e.key === 'Backspace') mathKey('b'); }
  if (e.key === 'Escape') { if (sheetOpen()) closeSheet(); else if (overlayOpen()) closeOverlay(); }
});

/* ---------- routes (notification taps, Shortcuts links) ---------- */
function route(name) {
  if (!name) return;
  if (name === 'gate') openGate(S().apps[0] && S().apps[0].id);
  else if (name === 'warmup') startWarmup();
  else if (['habits', 'brain', 'limits'].includes(name)) { tab = name; render(); }
  else if (name === 'today') { tab = 'today'; render(); }
}
window.addEventListener('hashchange', () => route(location.hash.slice(1)));

/* ---------- boot ---------- */
async function boot() {
  const saved = await native.loadRaw();
  if (saved) store.state = normalize(saved);
  render();
  route(location.hash.slice(1));
  native.onNotificationOpen(route);
  if (native.isNative) native.scheduleReminders(S().settings);
  refreshScreenTime();
  setTimeout(initWebSync, 0);
  // Keep times and countdowns fresh while the app stays open.
  setInterval(() => { if (!overlayOpen() && !sheetOpen() && !(document.activeElement && document.activeElement.matches('input'))) rerenderKeepMotion(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !overlayOpen() && !sheetOpen()) { rerenderKeepMotion(); refreshScreenTime(); } });
}
boot();
