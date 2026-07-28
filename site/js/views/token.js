import { el, fmtPrice, fmtPct, toneOf, tokenAvatar, fmtCompact } from '../ui.js';

/**
 * Token detail sheet.
 *
 * Seven daily bars against the contest open, drawn as a threshold line. This is
 * the single strongest pattern in the reference apps — PrizePicks and Underdog
 * both put a small bar chart with a dashed line right under the pick, because it
 * answers "is this thing running or fading" in about half a second, without
 * anyone reading a number.
 *
 * Here the threshold is the price your contest opened at, so the bars read as
 * "would this pick have been green" rather than as an abstract chart.
 */
export function openTokenSheet(ctx, tokenId, onPick) {
  const { slate, snapshot, closePrices } = ctx;
  const token = snapshot.tokens[tokenId];
  if (!token) return;

  const sym = token.sym?.toUpperCase() ?? tokenId;
  const openPrice = slate.openPrices[tokenId];
  const live = closePrices[tokenId] ?? token.price;
  const sinceOpen = openPrice > 0 ? ((live - openPrice) / openPrice) * 100 : 0;
  const series = slate.history?.[tokenId] ?? null;

  const panel = el('div', { class: 'sheet-panel' }, [
    el('div', { class: 'sheet-grab' }),

    el('div', { class: 'token-head' }, [
      tokenAvatar(token, 52),
      el('div', { style: 'min-width:0' }, [
        el('div', { class: 'token-sym', text: sym }),
        el('div', { class: 'token-name', text: token.name ?? tokenId }),
      ]),
      el('div', { style: 'margin-left:auto;text-align:right' }, [
        el('div', { class: 'token-price num', text: fmtPrice(live) }),
        el('div', { class: `token-move num ${toneOf(sinceOpen)}`, text: `${fmtPct(sinceOpen)} today` }),
      ]),
    ]),

    series ? buildChart(series, openPrice, sym) : el('div', {
      class: 'notice',
      style: 'margin-top:16px',
      text: 'No price history published for this token yet.',
    }),

    el('div', { class: 'token-stats' }, [
      stat('24h', fmtPct(token.ch24 ?? 0), toneOf(token.ch24 ?? 0)),
      stat('Contest open', fmtPrice(openPrice), ''),
      stat('Market cap', token.mc ? `$${fmtCompact(token.mc)}` : '—', ''),
    ]),

    onPick
      ? el('button', { class: 'btn is-lime', style: 'margin-top:18px', text: `Add ${sym}`, onClick: () => { close(); onPick(tokenId); } })
      : null,

    el('div', { style: 'text-align:center;margin-top:12px' }, [
      el('button', { class: 'linkbtn', text: 'Close', onClick: () => close() }),
    ]),
  ]);

  const sheet = el('div', {
    class: 'sheet',
    role: 'dialog',
    'aria-modal': 'true',
    onClick: (e) => { if (e.target === sheet) close(); },
  }, [panel]);

  document.body.append(sheet);
  function close() { sheet.remove(); }
}

function stat(label, value, tone) {
  return el('div', { class: 'stat' }, [
    el('div', { class: `stat-value num ${tone}`, style: 'font-size:17px', text: value }),
    el('div', { class: 'stat-label', text: label }),
  ]);
}

/**
 * Bars scaled against the full range of the series, with the contest open
 * drawn as a dashed threshold. Bars at or above the line are green.
 */
function buildChart(series, threshold, sym) {
  const values = [...series, threshold].filter((v) => Number.isFinite(v) && v > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;

  // Headroom so the tallest bar doesn't touch the top edge.
  const pos = (v) => ((v - min) / span) * 82 + 6;

  const bars = series.map((v, i) => {
    const height = pos(v);
    const above = v >= threshold;
    return el('div', { class: 'bar-col' }, [
      el('div', { class: 'bar-track' }, [
        el('div', {
          class: `bar ${above ? 'is-up' : 'is-down'}`,
          style: `height:${height}%`,
          title: fmtPrice(v),
        }),
      ]),
      el('div', { class: 'bar-label', text: i === series.length - 1 ? 'now' : `${series.length - 1 - i}d` }),
    ]);
  });

  return el('div', { class: 'chart' }, [
    el('div', { class: 'chart-head' }, [
      el('span', { class: 'eyebrow', text: `${sym} · last 7 days` }),
      el('span', { class: 'chart-threshold num', text: `open ${fmtPrice(threshold)}` }),
    ]),
    el('div', { class: 'chart-body' }, [
      el('div', { class: 'chart-line', style: `bottom:${pos(threshold)}%` }),
      ...bars,
    ]),
  ]);
}
