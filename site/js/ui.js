/** DOM and formatting helpers. */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
  return node;
}

/**
 * Prices span nine orders of magnitude here — BTC at $63,000 and a memecoin at
 * $0.0000068 in the same list. Fixed decimals would render one of them useless,
 * so precision scales with size.
 */
export function fmtPrice(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  if (abs >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toPrecision(3)}`;
}

export function fmtPct(value, { sign = true } = {}) {
  if (!Number.isFinite(value)) return '—';
  const s = sign && value > 0 ? '+' : '';
  return `${s}${value.toFixed(2)}%`;
}

export function fmtScore(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function fmtCompact(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/**
 * Colour for a signed value.
 *
 * The epsilon matters: a P&L of -0.000001 is displayed as "-$0.00" and must not
 * render red. Rounding to two decimals for display while colouring off the raw
 * float is how you end up shipping a red zero.
 */
export function toneOf(value, epsilon = 0.005) {
  if (!Number.isFinite(value) || Math.abs(value) < epsilon) return 'flat';
  return value > 0 ? 'pos' : 'neg';
}

/** How old a launch is. Minutes matter when a token is hours old. */
export function fmtAge(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m old`;
  if (hours < 48) return `${Math.round(hours)}h old`;
  return `${Math.round(hours / 24)}d old`;
}

export function fmtCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function ordinal(n) {
  if (!Number.isFinite(n)) return '—';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** Count a number up on first paint. Small touch, disproportionate effect. */
export function animateNumber(node, to, render, duration = 700) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    node.textContent = render(to);
    return;
  }
  const start = performance.now();
  const from = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    node.textContent = render(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * Token avatar with a bulletproof fallback: the ticker is always rendered
 * underneath and the image layers on top. A failed remote image then degrades
 * to readable text with no error handler needing to fire — which matters,
 * because a grid of blank circles reads as broken.
 */
export function tokenAvatar(token, size = 40) {
  const wrap = el('span', { class: 'avatar', style: `--size:${size}px` }, [
    el('span', { class: 'avatar-fallback', text: (token?.sym ?? '?').slice(0, 4).toUpperCase() }),
  ]);
  if (token?.img) {
    const img = el('img', { src: token.img, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.remove());
    wrap.append(img);
  }
  return wrap;
}

export function toast(message) {
  const existing = $('.toast');
  if (existing) existing.remove();
  const node = el('div', { class: 'toast', role: 'status', text: message });
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add('is-in'));
  setTimeout(() => {
    node.classList.remove('is-in');
    setTimeout(() => node.remove(), 300);
  }, 2600);
}
