// Tạo icon game: mặt Gấu Trắng ôm ly cà phê đá, phong cách flat-comic (viền mực đậm, màu phẳng) giống bộ icon SVG
// trong game. Vẽ bằng SVG (nguồn duy nhất), rồi dùng Chrome headless chụp ra PNG các cỡ cho iPhone/Android.
// Chạy: node tools/icons.mjs   (cần Chrome; đặt CHROME=đường_dẫn nếu Chrome không ở chỗ mặc định)
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..'), OUT = join(ROOT, 'icons');
const INK = '#3a2317';

// scale < 1 thu nhỏ hình vào giữa (bản "maskable" cho Android phải nằm trong vùng an toàn 80%).
export function iconSVG(scale = 1) {
  const s = 512, c = s / 2, k = scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" fill="#ffb3c1"/>
  <circle cx="${c}" cy="${c}" r="232" fill="#ffd3dc"/>
  <g stroke="#ffffff" stroke-opacity=".5" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M60 110 l28 -28M430 70 l24 24M452 420 l26 -18M58 400 l-22 22"/>
  </g>
  <g transform="translate(${c} ${c}) scale(${k}) translate(${-c} ${-c})" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
    <!-- bóng dưới chân -->
    <ellipse cx="262" cy="470" rx="170" ry="22" fill="${INK}" opacity=".18" stroke="none"/>
    <g transform="translate(-14 0)">
    <!-- tai -->
    <circle cx="128" cy="112" r="54" fill="#f6f8fb" stroke-width="12"/>
    <circle cx="336" cy="112" r="54" fill="#f6f8fb" stroke-width="12"/>
    <circle cx="128" cy="116" r="26" fill="#f4c6cf" stroke="none"/>
    <circle cx="336" cy="116" r="26" fill="#f4c6cf" stroke="none"/>
    <!-- thân và khăn quàng xanh -->
    <path d="M92 470 C92 360 150 318 232 318 C314 318 372 360 372 470 Z" fill="#f6f8fb" stroke-width="12"/>
    <path d="M128 330 C180 360 284 360 336 330 L346 362 C290 396 174 396 118 362 Z" fill="#5aa9e6" stroke-width="10"/>
    <!-- đầu -->
    <ellipse cx="232" cy="222" rx="152" ry="134" fill="#f6f8fb" stroke-width="12"/>
    <ellipse cx="148" cy="262" rx="26" ry="15" fill="#ff8fa3" opacity=".8" stroke="none"/>
    <ellipse cx="316" cy="262" rx="26" ry="15" fill="#ff8fa3" opacity=".8" stroke="none"/>
    <circle cx="180" cy="212" r="19" fill="${INK}" stroke="none"/>
    <circle cx="284" cy="212" r="19" fill="${INK}" stroke="none"/>
    <circle cx="187" cy="205" r="7" fill="#fff" stroke="none"/>
    <circle cx="291" cy="205" r="7" fill="#fff" stroke="none"/>
    <ellipse cx="232" cy="270" rx="60" ry="44" fill="#ffffff" stroke-width="8"/>
    <ellipse cx="232" cy="252" rx="23" ry="16" fill="${INK}" stroke="none"/>
    <path d="M232 266 v10 M210 280 q11 14 22 0 q11 14 22 0" fill="none" stroke-width="7"/>
    </g>
    <g transform="translate(10 0)">
    <!-- ly cà phê đá: thân trong, cà phê, đá, nắp, ống hút đỏ, đai giấy có tim -->
    <path d="M404 150 L438 58" stroke="${INK}" stroke-width="30"/>
    <path d="M404 150 L438 58" stroke="#e25b4a" stroke-width="16"/>
    <path d="M300 214 H468 L448 452 Q446 470 428 470 H340 Q322 470 320 452 Z" fill="#eef8fc" stroke-width="12"/>
    <path d="M309 262 H459 L446 448 Q444 460 430 460 H338 Q324 460 322 448 Z" fill="#8a5a3b" stroke="none"/>
    <path d="M309 262 H459 L457 290 Q384 306 311 290 Z" fill="#c8a27a" stroke="none"/>
    <rect x="336" y="300" width="42" height="42" rx="9" fill="#ffffff" opacity=".75" stroke="none" transform="rotate(14 357 321)"/>
    <rect x="392" y="318" width="40" height="40" rx="9" fill="#ffffff" opacity=".6" stroke="none" transform="rotate(-10 412 338)"/>
    <path d="M324 360 H444 L440 412 H328 Z" fill="#e8b57e" stroke-width="8"/>
    <path d="M384 398 c-14 -10 -22 -16 -22 -24 a10 10 0 0 1 22 -3 a10 10 0 0 1 22 3 c0 8 -8 14 -22 24z" fill="#ff6b8b" stroke-width="5"/>
    <rect x="288" y="196" width="192" height="28" rx="14" fill="#ffffff" stroke-width="12"/>
    <!-- tay gấu ôm ly -->
    <ellipse cx="318" cy="388" rx="36" ry="40" fill="#f6f8fb" stroke-width="12"/>
    <path d="M306 372 q8 -6 16 0" fill="none" stroke-width="5"/>
    </g>
  </g>
</svg>`;
}

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
// Chụp SVG ra PNG vuông cỡ size bằng Chrome headless (không cần thư viện ảnh).
function png(svg, size, file) {
  const dir = join(tmpdir(), 'cafe-icon-' + process.pid);
  mkdirSync(dir, { recursive: true });
  const html = join(dir, 'i.html');
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#ffb3c1">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${size},${size}`, `--screenshot=${file}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
}

if (process.argv[1] && process.argv[1].endsWith('icons.mjs')) {
  if (!CHROME) { console.error('Không tìm thấy Chrome. Đặt biến CHROME=đường_dẫn_tới_chrome'); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'icon.svg'), iconSVG());
  png(iconSVG(), 180, join(OUT, 'apple-touch-icon.png'));     // iPhone/iPad: màn hình chính (iOS tự bo góc)
  png(iconSVG(), 192, join(OUT, 'icon-192.png'));
  png(iconSVG(), 512, join(OUT, 'icon-512.png'));
  png(iconSVG(0.78), 512, join(OUT, 'icon-maskable-512.png'));  // Android: hình nằm trong vùng an toàn
  png(iconSVG(), 48, join(OUT, 'favicon-48.png'));
  console.log('Đã tạo icon trong', OUT);
}
