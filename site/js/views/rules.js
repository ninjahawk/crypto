import { el, clear } from '../ui.js';

/**
 * Rules, prize table and payout receipts.
 *
 * Not boilerplate. For an audience deciding whether this is real, past winners
 * with public receipts is the highest-converting screen in the product — it is
 * the thing that answers "does he actually pay". Apple 5.3.2 also requires
 * official rules in-app, which is why this ships in v1 rather than later.
 */
export function renderRules(ctx, mount, go) {
  const { slate, history } = ctx;
  clear(mount);

  mount.append(
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'eyebrow', text: 'How this works' }),
        el('h2', { text: 'Rules & prizes' }),
      ]),
    ]),
  );

  // Honest banner while prizes are not yet funded. Never announce a prize that
  // is not already in the account (DECISIONS 0005).
  if (!slate.prizePool) {
    mount.append(
      el('div', { class: 'notice', style: 'margin-bottom:12px' }, [
        el('span', { class: 'notice-icon', text: '⚠️' }),
        el('div', {
          html:
            '<b>Founding season — no cash prizes are running yet.</b> Contests are live and scored for real, ' +
            'and results build your founding record. Prize contests begin when the pool is funded and the ' +
            'official rules below are finalised.',
        }),
      ]),
    );
  }

  mount.append(
    el('div', { class: 'card prose' }, [
      el('h3', { text: 'The contest' }),
      el('ul', {}, [
        el('li', { html: `Pick <strong>${slate.picksRequired}</strong> tokens from the daily slate before it closes.` }),
        el('li', { text: 'Every pick carries equal weight. No position sizing, no leverage, no real trading.' }),
        el('li', { text: 'Your score is the average percent change of your picks between contest open and close.' }),
        el('li', { text: 'Contests open and close at 00:00 UTC. One entry per person per contest.' }),
        el('li', { html: 'Entry is <strong>free</strong>. It always will be.' }),
      ]),

      el('h3', { text: 'Nothing here is real trading' }),
      el('ul', {}, [
        el('li', { text: 'Nothing is ever paid in. There is no wallet, no custody, and no token.' }),
        el('li', { text: 'Portfolios are virtual. Prices are real, positions are not.' }),
        el('li', { text: 'Nothing in this app is financial advice or a recommendation to buy anything.' }),
      ]),

      el('h3', { text: 'Scoring and verification' }),
      el('ul', {}, [
        el('li', { html: 'Live scores are <strong>provisional</strong>.' }),
        el('li', { text: 'Before any prize is paid, results are recomputed from the picks against archived price snapshots.' }),
        el('li', { text: 'Any entry that does not reconstruct exactly is disqualified and the next entry moves up.' }),
        el('li', { text: 'Winning picks are published after payout so anyone can check the maths.' }),
      ]),

      el('h3', { text: 'Bots on the board' }),
      el('ul', {}, [
        el('li', { text: 'Entrants marked BOT are algorithms, not people.' }),
        el('li', { text: 'They exist so there is always someone to race. They can never win a prize.' }),
        el('li', { html: 'Every non-bot entry on the board is a <strong>real person</strong>. We do not invent players.' }),
      ]),
    ]),
  );

  // ---- prize table --------------------------------------------------------
  mount.append(el('div', { class: 'section-head' }, [el('h2', { text: 'Prize table' })]));

  const table = el('table', { class: 'prize' });
  if (slate.prizeTable?.length) {
    for (const tier of slate.prizeTable) {
      table.append(el('tr', {}, [el('td', { text: tier.label }), el('td', { class: 'num', text: `$${tier.amount}` })]));
    }
  } else {
    table.append(
      el('tr', {}, [el('td', { text: 'Not yet funded' }), el('td', { text: '—' })]),
    );
  }
  mount.append(el('div', { class: 'card' }, [table]));

  mount.append(
    el('div', { class: 'notice', style: 'margin-top:12px' }, [
      el('span', { class: 'notice-icon', text: '💸' }),
      el('div', {
        html:
          'The pool is a share of what the app earns, so it grows with the community — and we never announce ' +
          'a prize that is not already funded.',
      }),
    ]),
  );

  // ---- receipts -----------------------------------------------------------
  mount.append(el('div', { class: 'section-head' }, [el('h2', { text: 'Payout receipts' })]));

  const settled = (history.contests ?? []).filter((c) => c.winner);
  if (settled.length === 0) {
    mount.append(
      el('div', { class: 'card empty' }, [
        el('div', { class: 'empty-title', text: 'No payouts yet' }),
        el('div', { text: 'Every winner will be listed here with their picks and a public receipt.' }),
      ]),
    );
  } else {
    const list = el('div', { class: 'card' });
    for (const c of settled) {
      list.append(
        el('div', { class: 'row' }, [
          el('div', { class: 'row-main' }, [
            el('div', { class: 'row-name', text: c.winner.name }),
            el('div', { class: 'row-sub', text: `${c.contestId} · ${c.winner.picks?.join(', ') ?? ''}` }),
          ]),
          el('div', { class: 'row-right' }, [
            el('div', { class: 'row-value num', text: c.winner.prize ? `$${c.winner.prize}` : '—' }),
            c.winner.receipt
              ? el('a', { class: 'row-delta', href: c.winner.receipt, target: '_blank', rel: 'noopener', text: 'receipt ↗' })
              : null,
          ]),
        ]),
      );
    }
    mount.append(list);
  }

  // ---- legal --------------------------------------------------------------
  mount.append(el('div', { class: 'section-head' }, [el('h2', { text: 'Official rules' })]));
  mount.append(
    el('div', { class: 'card prose' }, [
      el('p', {
        html:
          '<strong>Draft — to be finalised with counsel before the first prize is awarded.</strong> ' +
          'The summary below states our intent and is not yet the operative document.',
      }),
      el('ul', {}, [
        el('li', { html: '<strong>No purchase necessary.</strong> Entry is free and always will be.' }),
        el('li', { html: 'Nothing you can pay for will ever improve your chance of winning.' }),
        el('li', { text: 'Open to legal residents of the United States, 18 or older. Void where prohibited.' }),
        el('li', { text: 'The operator is the sponsor of these contests.' }),
        el('li', { text: 'Winners of $600 or more in a year must supply a W-9 before payout, and will receive a 1099-MISC.' }),
        el('li', { text: 'The operator may verify any entry and disqualify entries that cannot be verified.' }),
        el('li', { text: 'Bot entrants are not eligible for prizes.' }),
        el('li', { html: 'Apple is <strong>not</strong> a sponsor of, and is not involved in, these contests in any manner.' }),
      ]),
      el('p', { style: 'color:var(--text-3);font-size:13px', text: 'Questions about a result? Every settled contest publishes the winning picks and the price snapshot used to score it.' }),
    ]),
  );

  return {
    dock: () => el('button', { class: 'btn is-quiet', text: 'Back', onClick: () => go('contest') }),
  };
}
