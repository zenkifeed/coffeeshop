// Lớp cảm giác dùng chung: tuỳ chọn người chơi, rung, mức giảm chuyển động.
const OPT_KEY = 'cafe3d_opts';

export const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Giảm chuyển động thì thu nhỏ biên độ chứ không tắt hẳn phản hồi.
export const motionScale = reducedMotion ? 0.45 : 1;

export const opts = (() => {
  try { return { sound: true, haptic: true, ...JSON.parse(localStorage.getItem(OPT_KEY)) }; } catch (e) { return { sound: true, haptic: true }; }
})();
export function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* bị chặn lưu */ } }

// Từ vựng rung theo loại thao tác, dùng lại khắp game để tay quen "ngôn ngữ".
const HAPTIC = { tap: 6, select: 10, primary: 16, pour: 4, reward: [18, 40, 26], perfect: [12, 30, 12, 30, 24], error: [35, 45, 35], heavy: [30, 30, 60] };
export function haptic(kind) {
  if (!opts.haptic || typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate(HAPTIC[kind] ?? 8); } catch (e) { /* trình duyệt không hỗ trợ */ }
}
