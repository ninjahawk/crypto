import { el, clear, fmtPrice, fmtPct, toneOf, tokenAvatar, toast, animateNumber } from '../ui.js';
import { bookFor, saveBook } from '../state.js';
import {
  equity, returnPct, positionRows, maxSpendOn, openPosition, closePosition,
} from '../bankroll.js';

const usd = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The trading desk.
 *
 * This is the game. Picks open the position; from here the player actually runs
 * money — sells into strength, redeploys cash, sizes up on a call. Everything
 * downstream (the flex, the rivalry, the reason to open the app at 3am) needs
 * this screen to exist.
 */
export function renderTrade(ctx, mount, go) {
  const { slate, snapshot, entry, closePrices: prices, now } = ctx;
  clear(mount);

  if (!entry) {
    mount.append(
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-title', text: 'No bankroll yet' }),
        el('div', { text: `Pick ${slate.picksRequired} to put your $10,000 to work.` }),
      ]),
    );
    return { dock: () => el('button', { class: 'btn', text: 'Open the slate', onClick: () => go('slate') }) };
  }

  let book = bookFor(slate.contestId);
  if (!book) {
    mount.append(el('div', { class: 'empty' }, [el('div', { class: 'empty-title', text: 'Bankroll unavailable' })]));
    return { dock: () => null };
  }

  const isClosed = Date.parse(slate.closesAt) <= now;

  function repaint() {
    clear(mount);
    paint();
  }

  function paint() {
    const eq = equity(book, prices);
    const ret = returnPct(book, prices);
    const pnl = eq - book.startingCapital;

    // ---- equity header --------------------------------------------------
    const eqNode = el('div', { class: `value-main num ${toneOf(ret)}` });
    mount.append(
      el('div', { class: 'card value-block' }, [
        el('div', { class: 'eyebrow', text: 'Bankroll' }),
        eqNode,
        el('div', { class: 'value-deltas' }, [
          el('div', { class: toneOf(pnl) }, [
            `${toneOf(pnl) === 'flat' ? '' : pnl > 0 ? '+' : '-'}${usd(Math.abs(pnl))}`,
            el('span', { text: `  (${fmtPct(ret)})` }),
          ]),
          el('div', {}, [
            el('span', { text: 'Cash ' }),
            el('b', { class: 'num', text: usd(book.cash) }),
            el('span', { text: '  ·  ' }),
            el('span', { text: `${book.log.length} trade${book.log.length === 1 ? '' : 's'}` }),
          ]),
        ]),
      ]),
    );
    animateNumber(eqNode, eq, (v) => usd(v));

    // ---- positions ------------------------------------------------------
    const rows = positionRows(book, prices);
    mount.append(
      el('div', { class: 'section-head' }, [
        el('h2', { text: 'Positions' }),
        el('span', { class: 'hint', text: isClosed ? 'settled' : 'tap to sell' }),
      ]),
    );

    if (rows.length === 0) {
      mount.append(
        el('div', { class: 'card empty' }, [
          el('div', { class: 'empty-title', text: 'All cash' }),
          el('div', { text: 'Put it to work below — you have the whole contest left.' }),
        ]),
      );
    } else {
      const list = el('div', { class: 'card' });
      for (const row of rows) {
        const token = snapshot.tokens[row.tokenId] ?? { sym: row.tokenId };
        list.append(
          el('button', {
            class: 'row row-tap',
            type: 'button',
            disabled: isClosed,
            onClick: () => openTicket('sell', row.tokenId),
          }, [
            tokenAvatar(token, 38),
            el('div', { class: 'row-main' }, [
              el('div', { class: 'row-name', text: token.sym?.toUpperCase() ?? row.tokenId }),
              el('div', { class: 'row-sub num', text: `${usd(row.value)} · avg ${fmtPrice(row.avgPrice)}` }),
            ]),
            el('div', { class: 'row-right' }, [
              el('div', { class: `row-value num ${toneOf(row.pnl)}`, text: `${toneOf(row.pnl) === 'flat' ? '' : row.pnl > 0 ? '+' : '-'}${usd(Math.abs(row.pnl))}` }),
              el('div', { class: `row-delta num ${toneOf(row.pnl)}`, text: fmtPct(row.pnlPct) }),
            ]),
          ]),
        );
      }
      mount.append(list);
    }

    // ---- buy ------------------------------------------------------------
    if (!isClosed) {
      mount.append(
        el('div', { class: 'section-head' }, [
          el('h2', { text: 'Buy' }),
          el('span', { class: 'hint num', text: `${usd(book.cash)} available` }),
        ]),
      );

      const buys = el('div', { class: 'card' });
      for (const tokenId of slate.tokens) {
        const token = snapshot.tokens[tokenId];
        if (!token) continue;
        const room = maxSpendOn(book, tokenId, prices);
        const openPrice = slate.openPrices[tokenId];
        const move = openPrice > 0 ? ((prices[tokenId] - openPrice) / openPrice) * 100 : 0;

        buys.append(
          el('button', {
            class: 'row row-tap',
            type: 'button',
            disabled: room < 0.01,
            onClick: () => openTicket('buy', tokenId),
          }, [
            tokenAvatar(token, 38),
            el('div', { class: 'row-main' }, [
              el('div', { class: 'row-name', text: token.sym?.toUpperCase() ?? tokenId }),
              el('div', {
                class: 'row-sub num',
                text: room < 0.01 ? 'at position cap' : `up to ${usd(room)}`,
              }),
            ]),
            el('div', { class: 'row-right' }, [
              el('div', { class: 'row-value num', text: fmtPrice(prices[tokenId]) }),
              el('div', { class: `row-delta num ${toneOf(move)}`, text: fmtPct(move) }),
            ]),
          ]),
        );
      }
      mount.append(buys);
    }

    mount.append(
      el('div', { class: 'notice', style: 'margin-top:12px' }, [
        el('span', { class: 'notice-icon', text: 'ⓘ' }),
        el('div', {
          html: 'Virtual money at real prices. Nothing is bought, sold or held for real — and no single token can exceed <b>40%</b> of your bankroll.',
        }),
      ]),
    );
  }

  /** Buy/sell ticket. Amounts in dollars, because nobody thinks in 0.00043 BTC. */
  function openTicket(side, tokenId) {
    const token = snapshot.tokens[tokenId] ?? { sym: tokenId };
    const price = prices[tokenId];
    const sym = token.sym?.toUpperCase() ?? tokenId;

    const row = positionRows(book, prices).find((r) => r.tokenId === tokenId);
    const ceiling = side === 'buy' ? maxSpendOn(book, tokenId, prices) : row?.value ?? 0;

    let amount = 0;
    const amountNode = el('div', { class: 'ticket-amount num', text: usd(0) });
    const hint = el('div', { class: 'ticket-hint num' });

    function setAmount(next) {
      amount = Math.max(0, Math.min(ceiling, next));
      amountNode.textContent = usd(amount);
      const qty = price > 0 ? amount / price : 0;
      hint.textContent = `${qty.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${sym} @ ${fmtPrice(price)}`;
    }
    setAmount(0);

    const chips = el('div', { class: 'ticket-chips' },
      [
        ['25%', 0.25], ['50%', 0.5], ['75%', 0.75], ['Max', 1],
      ].map(([label, frac]) =>
        el('button', {
          class: 'ticket-chip',
          type: 'button',
          text: label,
          onClick: () => setAmount(ceiling * frac),
        }),
      ),
    );

    const confirm = el('button', {
      class: `btn ${side === 'sell' ? 'is-quiet' : 'is-lime'}`,
      text: side === 'buy' ? `Buy ${sym}` : `Sell ${sym}`,
      onClick: () => {
        if (amount < 0.01) return toast('Pick an amount first');
        try {
          const ts = new Date(now).toISOString();
          book = side === 'buy'
            ? openPosition(book, tokenId, amount, prices, ts)
            : closePosition(book, tokenId, Math.min(amount / price, book.positions[tokenId].qty), prices, ts);
          saveBook(slate.contestId, book);
          closeTicket();
          repaint();
          toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${usd(amount)} of ${sym}`);
        } catch (err) {
          toast(err.message);
        }
      },
    });

    const panel = el('div', { class: 'sheet-panel' }, [
      el('div', { class: 'sheet-grab' }),
      el('div', { class: 'eyebrow', text: side === 'buy' ? 'Buy' : 'Sell' }),
      el('h2', { style: 'margin:6px 0 2px;font-size:24px;letter-spacing:-0.03em', text: sym }),
      el('div', { class: 'ticket-hint', text: side === 'buy' ? `${usd(ceiling)} available` : `${usd(ceiling)} position` }),
      amountNode,
      hint,
      chips,
      confirm,
      el('div', { style: 'text-align:center;margin-top:12px' }, [
        el('button', { class: 'linkbtn', text: 'Cancel', onClick: () => closeTicket() }),
      ]),
    ]);

    const sheet = el('div', {
      class: 'sheet',
      role: 'dialog',
      'aria-modal': 'true',
      onClick: (e) => { if (e.target === sheet) closeTicket(); },
    }, [panel]);

    document.body.append(sheet);
    function closeTicket() { sheet.remove(); }
  }

  paint();

  return {
    dock: () =>
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn is-quiet', text: 'Board', onClick: () => go('board') }),
        el('button', { class: 'btn', text: 'Share', onClick: () => go('#share') }),
      ]),
  };
}
