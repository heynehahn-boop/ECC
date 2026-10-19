// Everything that touches the phone: storage, haptics, notifications, Screen Time, sharing.
// In a normal browser each function falls back to a web version or does nothing.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
const ScreenTime = registerPlugin('ScreenTime');
const KEY = 'routine.v1';

/* ---------- storage ---------- */
export async function loadRaw() {
  try {
    if (isNative) { const { value } = await Preferences.get({ key: KEY }); return value ? JSON.parse(value) : null; }
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export async function saveRaw(state) {
  const json = JSON.stringify(state);
  try {
    if (isNative) await Preferences.set({ key: KEY, value: json });
    else localStorage.setItem(KEY, json);
  } catch (e) { console.warn('[Routine] save failed', e); }
}

/* ---------- haptics ---------- */
export function tap() { if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); }
export function success() { if (isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => {}); }
export function error() { if (isNative) Haptics.notification({ type: NotificationType.Error }).catch(() => {}); }

/* ---------- notifications ---------- */
const N_WARMUP = 1, N_REMINDER = 2;
const hm = (t) => { const [hour, minute] = String(t).split(':').map(Number); return { hour: hour || 0, minute: minute || 0 }; };

export async function scheduleReminders(settings) {
  if (!isNative) return { ok: false, reason: 'web' };
  try {
    await LocalNotifications.cancel({ notifications: [{ id: N_WARMUP }, { id: N_REMINDER }] }).catch(() => {});
    if (!settings.notifications) return { ok: true };
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, reason: 'denied' };
    await LocalNotifications.schedule({
      notifications: [
        { id: N_WARMUP, title: 'Morning warm-up', body: '10 quick sums or a mate in 1. Takes about a minute.', schedule: { on: hm(settings.warmup), allowWhileIdle: true }, extra: { route: 'warmup' } },
        { id: N_REMINDER, title: 'Evening check', body: 'Tick off today’s habits before bed to keep your streak.', schedule: { on: hm(settings.reminder), allowWhileIdle: true }, extra: { route: 'today' } },
      ],
    });
    return { ok: true };
  } catch (e) { console.warn('[Routine] notifications', e); return { ok: false, reason: 'error' }; }
}
export function onNotificationOpen(fn) {
  if (!isNative) return;
  LocalNotifications.addListener('localNotificationActionPerformed', (a) => fn(a && a.notification && a.notification.extra && a.notification.extra.route));
}

/* ---------- Screen Time (iOS only, see ios/App/App/ScreenTimePlugin.swift) ---------- */
export const screenTimeAvailable = isNative && platform === 'ios';
export async function stStatus() {
  if (!screenTimeAvailable) return null;
  try { return await ScreenTime.getStatus(); } catch (e) { return null; }
}
export async function stAuthorize() { return ScreenTime.requestAuthorization(); }
export async function stPickApps() { return ScreenTime.pickApps(); }
export async function stApply(rule, enabled) {
  if (!screenTimeAvailable) return null;
  return ScreenTime.applySchedule({ unlock: rule.unlock, minutes: Number(rule.minutes), enabled: !!enabled });
}

/* ---------- share / save an image ---------- */
export async function shareImage(dataUrl, filename) {
  if (isNative) {
    const base64 = dataUrl.split(',')[1];
    const file = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'My Routine month', files: [file.uri] });
    return 'shared';
  }
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return saveFileWeb(filename, new Blob([bytes], { type: 'image/png' }));
}
export async function shareText(filename, text) {
  if (isNative) {
    const file = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: 'utf8' });
    await Share.share({ title: 'Routine backup', files: [file.uri] });
    return 'shared';
  }
  return saveFileWeb(filename, text);
}
// Web preview on claude.ai: files are offered through the viewer's download capability.
async function saveFileWeb(filename, data) {
  const claude = window.claude;
  const dl = claude && claude.use ? await claude.use('downloads') : null;
  if (!dl) throw new Error('unavailable');
  await dl.save({ filename, data });
  return 'saved';
}
