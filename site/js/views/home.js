import {
  el, clear, fmtPrice, fmtPct, fmtCompact, fmtAge, toneOf, tokenAvatar, toast, animateNumber,
} from '../ui.js';
import { ensureBook, saveBook, getState } from '../state.js';
import { equity, returnPct, positionRows, maxSpendOn, openPosition, closePosition } from '../bankroll.js';
import { openTokenSheet } from './token.js';

const usd = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The whole app, on one screen.
 *
 * This replaced a six-tab layout that was effectively five separate apps.
 * Nobody was reaching page four, so everything that matters now lives on the
 * first screen in the order you actually care about it: what you're worth,
 * what you're holding, what you can buy.
 */
export function renderHome(ctx, mount) {
  const { snapshot, closePrices: prices, slate, now } = ctx;
  clear(mount);

  let book = ensureBook(slate.contestId, prices);
  let filter = ctx.filter ?? 'hot';

  const universe = Object.keys(snapshot.tokens).filter((id) => snapshot.tokens[id]?.fresh);

  function sorted() {
    const list = [...universe];
    if (filter === 'gainers') return list.sort((a, b) => (snapshot.tokens[b].ch24 ?? 0) - (snapshot.tokens[a].ch24 ?? 0));
    if (filter === 'losers') return list.sort((a, b) => (snapshot.tokens[a].ch24 ?? 0) - (snapshot.tokens[b].ch24 ?? 0));
    if (filter === 'new') return list.sort((a, b) => (snapshot.tokens[a].ageHours ?? 1e9) - (snapshot.tokens[b].ageHours ?? 1e9));
    return list.sort((a, b) => (snapshot.tokens[b].score ?? 0) - (snapshot.tokens[a].score ?? 0));
  }

  const body = el('div');
  mount.append(body);

  function paint() {
    clear(body);

    const eq = equity(book, prices);
    const ret = returnPct(book, prices);
    const pnl = eq - book.startingCapital;
    const rows = positionRows(book, prices);

    // ---- what you're worth ----------------------------------------------
    const eqNode = el('div', { class: `value-main num ${toneOf(ret)}` });
    body.append(
      el('div', { class: 'hero' }, [
        el('div', { class: 'eyebrow', text: 'Your bankroll' }),
        eqNode,
        el('div', { class: 'hero-sub' }, [
          el('span', { class: toneOf(pnl), text: `${toneOf(pnl) === 'flat' ? '' : pnl > 0 ? '+' : '-'}${usd(Math.abs(pnl))} (${fmtPct(ret)})` }),
          el('span', { class: 'dim', text: `  ·  ${usd(book.cash)} cash` }),
        ]),
        el('div', { class: 'standing' }, [
          el('span', { text: rows.length ? `${rows.length} open ${rows.length === 1 ? 'position' : 'positions'}` : 'All cash — nothing open' }),
          el('span', { class: 'dim', text: `  ·  ${book.log.length} trade${book.log.length === 1 ? '' : 's'}` }),
        ]),
      ]),
    );
    animateNumber(eqNode, eq, usd);

    // ---- what you're holding --------------------------------------------
    if (rows.length) {
      body.append(el('div', { class: 'section-head' }, [
        el('h2', { text: 'Holding' }),
        el('span', { class: 'hint', text: 'tap to sell' }),
      ]));

      const list = el('div', { class: 'card' });
      for (const row of rows) {
        const token = snapshot.tokens[row.tokenId] ?? { sym: row.tokenId };
        list.append(
          el('button', {
            class: 'row row-tap',
            type: 'button',
            'data-token': row.tokenId,
            onClick: () => ticket('sell', row.tokenId),
          }, [
            tokenAvatar(token, 40),
            el('div', { class: 'row-main' }, [
              el('div', { class: 'row-name', text: token.sym?.toUpperCase() ?? row.tokenId }),
              el('div', { class: 'row-sub num', text: `${usd(row.value)} · ${fmtPrice(prices[row.tokenId])}` }),
            ]),
            el('div', { class: 'row-right' }, [
              el('div', {
                class: `row-value num ${toneOf(row.pnl)}`,
                text: `${toneOf(row.pnl) === 'flat' ? '' : row.pnl > 0 ? '+' : '-'}${usd(Math.abs(row.pnl))}`,
              }),
              el('div', { class: `row-delta num ${toneOf(row.pnlPct)}`, text: fmtPct(row.pnlPct) }),
            ]),
          ]),
        );
      }
      body.append(list);
    }

    // ---- what you can buy -------------------------------------------------
    body.append(el('div', { class: 'section-head' }, [
      el('h2', { text: 'Market' }),
      el('span', { class: 'hint num', text: `${usd(book.cash)} to spend` }),
    ]));

    const filters = el('div', { class: 'filterbar' });
    for (const [id, label] of [['hot', '🔥 Hot'], ['gainers', 'Gainers'], ['losers', 'Losers'], ['new', 'Newest']]) {
      filters.append(el('button', {
        class: 'filter-chip',
        type: 'button',
        'aria-selected': String(filter === id),
        text: label,
        onClick: () => { filter = id; paint(); },
      }));
    }
    body.append(filters);

    const market = el('div', { class: 'card' });
    for (const tokenId of sorted()) {
      const token = snapshot.tokens[tokenId];
      const move = token.ch24 ?? 0;
      market.append(
        el('div', { class: 'row', 'data-token': tokenId }, [
          el('button', {
            class: 'row-open',
            type: 'button',
            'aria-label': `${token.name ?? tokenId} details`,
            onClick: () => openTokenSheet(ctx, tokenId),
          }, [tokenAvatar(token, 40)]),
          el('div', { class: 'row-main' }, [
            el('div', { class: 'row-name', text: token.sym?.toUpperCase() ?? tokenId }),
            el('div', { class: 'row-sub num' }, [
              token.ageHours != null ? fmtAge(token.ageHours) : '',
              token.liq ? ` · $${fmtCompact(token.liq)} liq` : '',
            ]),
          ]),
          el('div', { class: 'row-right' }, [
            el('div', { class: 'row-value num', text: fmtPrice(prices[tokenId] ?? token.price) }),
            el('div', { class: `row-delta num ${toneOf(move)}`, text: fmtPct(move) }),
          ]),
          el('button', {
            class: 'row-buy row-tap',
            type: 'button',
            'data-token': tokenId,
            disabled: book.cash < 0.01,
            text: 'Buy',
            onClick: () => ticket('buy', tokenId),
          }),
        ]),
      );
    }
    body.append(market);
  }

  /** Buy/sell ticket. Dollar amounts, because nobody sizes in 0.00043 tokens. */
  function ticket(side, tokenId) {
    const token = snapshot.tokens[tokenId] ?? { sym: tokenId };
    const price = prices[tokenId];
    const sym = token.sym?.toUpperCase() ?? tokenId;
    const held = positionRows(book, prices).find((r) => r.tokenId === tokenId);
    const ceiling = side === 'buy' ? maxSpendOn(book, tokenId, prices) : held?.value ?? 0;

    let amount = 0;
    const hint = el('div', { class: 'ticket-hint num' });
    const input = el('input', {
      class: 'ticket-input num',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      value: '0.00',
      'aria-label': `Amount to ${side}`,
      onInput: (e) => setAmount(Number(e.currentTarget.value.replace(/[^0-9.]/g, '')) || 0, true),
      onFocus: (e) => e.currentTarget.select(),
    });

    function setAmount(next, typing = false) {
      amount = Math.max(0, Math.min(ceiling, next));
      if (!typing || next > ceiling) input.value = amount.toFixed(2);
      const qty = price > 0 ? amount / price : 0;
      hint.textContent = `${qty.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${sym} @ ${fmtPrice(price)}`;
    }
    setAmount(0);

    const sheet = el('div', {
      class: 'sheet',
      role: 'dialog',
      'aria-modal': 'true',
      onClick: (e) => { if (e.target === sheet) sheet.remove(); },
    }, [
      el('div', { class: 'sheet-panel' }, [
        el('div', { class: 'sheet-grab' }),
        el('div', { class: 'eyebrow', text: side === 'buy' ? 'Buy' : 'Sell' }),
        el('h2', { style: 'margin:6px 0 2px;font-size:26px;letter-spacing:-0.03em', text: sym }),
        el('div', { class: 'ticket-hint', text: `${usd(ceiling)} available` }),
        el('div', { class: 'ticket-field' }, [
          el('span', { class: 'ticket-currency', text: '$' }),
          input,
        ]),
        hint,
        el('div', { class: 'ticket-chips' }, [['25%', 0.25], ['50%', 0.5], ['75%', 0.75], ['Max', 1]].map(
          ([label, frac]) => el('button', {
            class: 'ticket-chip', type: 'button', text: label, onClick: () => setAmount(ceiling * frac),
          }),
        )),
        el('button', {
          class: `btn ${side === 'buy' ? 'is-lime' : 'is-quiet'}`,
          text: side === 'buy' ? `Buy ${sym}` : `Sell ${sym}`,
          onClick: () => {
            if (amount < 0.01) return toast('Pick an amount');
            try {
              const ts = new Date(now).toISOString();
              book = side === 'buy'
                ? openPosition(book, tokenId, amount, prices, ts)
                : closePosition(book, tokenId, Math.min(amount / price, book.positions[tokenId].qty), prices, ts);
              saveBook(slate.contestId, book);
              sheet.remove();
              paint();
              toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${usd(amount)} of ${sym}`);
            } catch (err) {
              toast(err.message);
            }
          },
        }),
        el('div', { style: 'text-align:center;margin-top:12px' }, [
          el('button', { class: 'linkbtn', text: 'Cancel', onClick: () => sheet.remove() }),
        ]),
      ]),
    ]);
    document.body.append(sheet);
  }

  paint();
  return { dock: () => null };
}

/** Streak and record, behind the header button — not a whole tab. */
export function openStats(ctx) {
  const state = getState();
  const { count, freezesUsed } = state.streak;
  const book = ensureBook(ctx.slate.contestId, ctx.closePrices);

  const sheet = el('div', {
    class: 'sheet',
    role: 'dialog',
    'aria-modal': 'true',
    onClick: (e) => { if (e.target === sheet) sheet.remove(); },
  }, [
    el('div', { class: 'sheet-panel' }, [
      el('div', { class: 'sheet-grab' }),
      el('div', { class: 'streak-hero' }, [
        el('div', { class: 'streak-flame', text: count > 0 ? '🔥' : '🕯️' }),
        el('div', { class: 'streak-count num', text: String(count) }),
        el('div', { class: 'streak-label', text: 'day streak' }),
      ]),
      el('div', { class: 'stat-grid' }, [
        stat(usd(equity(book, ctx.closePrices)), 'Bankroll'),
        stat(fmtPct(returnPct(book, ctx.closePrices)), 'All time'),
        stat(String(book.log.length), 'Trades'),
        stat(String(1 - freezesUsed), 'Streak freezes'),
      ]),
      el('div', { style: 'margin-top:18px' }, [
        el('button', { class: 'btn is-quiet', text: 'Close', onClick: () => sheet.remove() }),
      ]),
    ]),
  ]);
  document.body.append(sheet);
}

function stat(value, label) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'stat-value num', text: value }),
    el('div', { class: 'stat-label', text: label }),
  ]);
}
