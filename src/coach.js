// Bong bóng chỉ dẫn cho người mới: trỏ vào một nút trên giao diện hoặc một điểm trong cảnh 3D.
// Không chặn thao tác: người chơi vẫn chạm được mọi thứ, và luôn có nút Bỏ qua.
const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };

export const Coach = {
  spot: null,

  // target: phần tử DOM, hoặc hàm trả về { x, y } trên màn hình (điểm 3D đã chiếu).
  // Cùng `key` thì chỉ dời chỗ và đổi chữ, không dựng lại, nên không nhấp nháy khi màn hình vẽ lại.
  show(target, html, opts = {}) {
    if (!target) { this.clear(opts.key); return; }
    const s = this.spot;
    if (s && s.key === opts.key && s.bub.isConnected) {
      if (s.target !== target) { this._unglow(); s.target = target; this._glow(); }
      if (s.html !== html) {
        s.html = html;
        s.body.innerHTML = html;
        s.bub.classList.remove('swap');
        void s.bub.offsetWidth;
        s.bub.classList.add('swap');
      }
      s.place = opts.place || 'above';
      this.position();
      return;
    }
    this.clear();
    const bub = el('coach-bubble', `<div class="cb-body">${html}</div>${opts.onSkip ? '<button class="cb-skip" data-quiet>Bỏ qua hướng dẫn</button>' : ''}<span class="cb-tail"></span>`);
    document.body.appendChild(bub);
    if (opts.onSkip) bub.querySelector('.cb-skip').onclick = e => { e.stopPropagation(); opts.onSkip(); };
    this.spot = { target, bub, body: bub.querySelector('.cb-body'), key: opts.key || null, html, place: opts.place || 'above' };
    this._glow();
    this.position();
  },
  // Có key thì chỉ xoá khi đúng bong bóng của key đó, để hai hướng dẫn không xoá nhầm của nhau.
  clear(key) {
    const s = this.spot;
    if (!s || (key && s.key !== key)) return;
    this._unglow();
    s.bub.remove();
    this.spot = null;
  },
  _glow() { const t = this.spot && this.spot.target; if (t instanceof Element) t.classList.add('coach-glow'); },
  _unglow() { const t = this.spot && this.spot.target; if (t instanceof Element) t.classList.remove('coach-glow'); },

  // Gọi mỗi khung hình: mục tiêu 3D đi theo máy quay, mục tiêu DOM có thể trượt vào.
  position() {
    const s = this.spot;
    if (!s) return;
    let r;
    if (typeof s.target === 'function') {
      const p = s.target();
      if (!p) { s.bub.style.visibility = 'hidden'; return; }
      r = { left: p.x, right: p.x, top: p.y, bottom: p.y, width: 0 };
    } else {
      if (!s.target.isConnected) { this.clear(); return; }
      r = s.target.getBoundingClientRect();
    }
    s.bub.style.visibility = '';
    const bw = s.bub.offsetWidth, bh = s.bub.offsetHeight, W = innerWidth, H = innerHeight, gap = 14;
    const cx = r.left + r.width / 2;
    const x = Math.max(8, Math.min(W - bw - 8, cx - bw / 2));
    let above = s.place !== 'below';
    let y = above ? r.top - bh - gap : r.bottom + gap;
    if (above && y < 70) { y = r.bottom + gap; above = false; }
    else if (!above && y + bh > H - 8) { y = r.top - bh - gap; above = true; }
    s.bub.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    s.bub.classList.toggle('below', !above);
    s.bub.style.setProperty('--tail-x', Math.max(16, Math.min(bw - 16, cx - x)) + 'px');
  },
};
