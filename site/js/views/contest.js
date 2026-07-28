import {
  el, clear, fmtPct, fmtPrice, fmtScore, toneOf, tokenAvatar,
  fmtCountdown, animateNumber, ordinal,
} from '../ui.js';
import { pct } from '../scoring.js';

/**
 * The contest home. Answers three questions without the user reading anything:
 * where do I stand (cut line), what is my position doing (score), how long is
 * left (countdown). Cut line leads — it is the only standing display that works
 * the same at 30 players and 30,000.
 */
export function renderContest(ctx, mount, go) {
  const { slate, snapshot, entry, ranked, cut, now } = ctx;
  clear(mount);

  if (!entry) {
    mount.append(
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-title', text: 'No picks yet today' }),
        el('div', { text: `Pick ${slate.picksRequired} from the slate to enter. Free, always.` }),
      ]),
    );
    return { dock: () => el('button', { class: 'btn', text: "Open today's slate", onClick: () => go('slate') }) };
  }

  const me = ranked.find((r) => r.entryId === 'me');
  const closesIn = Date.parse(slate.closesAt) - now;
  const isClosed = closesIn <= 0;
  const urgent = closesIn < 60 * 60 * 1000 && !isClosed;

  // ---- cut line, the hero -------------------------------------------------
  const inMoney = cut?.inTheMoney ?? false;
  const cutCard = el('div', { class: `cutline ${inMoney ? 'is-in' : 'is-out'}` }, [
    el('div', { class: 'eyebrow', text: isClosed ? 'Final' : 'Prize line' }),
  ]);

  const cutValue = el('div', { class: 'cutline-value num' });
  cutCard.append(cutValue);

  if (inMoney) {
    cutValue.textContent = "You're in the money";
    cutValue.style.fontSize = 'clamp(24px, 7vw, 32px)';
    cutCard.append(
      el('div', {
        class: 'cutline-sub',
        text: cut.threshold == null
          ? 'Everyone still standing is paid at this field size.'
          : `${fmtScore(Math.abs(cut.distance))} clear of the cut.`,
      }),
    );
  } else {
    animateNumber(cutValue, cut?.distance ?? 0, (v) => v.toFixed(2));
    cutValue.append(el('span', { class: 'unit', text: 'pts from the money' }));
    cutCard.append(el('div', { class: 'cutline-sub', text: 'Close the gap before the contest ends.' }));
  }

  cutCard.append(
    el('div', { class: 'cutline-meta' }, [
      el('div', {}, [
        'Prize pool ',
        el('b', { class: 'num', text: slate.prizePool ? `$${slate.prizePool}` : '—' }),
      ]),
      el('div', {}, [
        'Paying ',
        el('b', { text: `top ${slate.payingPositions}` }),
      ]),
      el('div', { style: 'margin-left:auto' }, [
        el('span', {
          class: `countdown-pill num ${urgent ? 'is-urgent' : ''}`,
          text: isClosed ? 'Settled' : `⏱ ${fmtCountdown(closesIn)}`,
        }),
      ]),
    ]),
  );
  mount.append(cutCard);

  // ---- score --------------------------------------------------------------
  const scoreValue = el('div', { class: `value-main num ${toneOf(me?.score)}` });
  const valueCard = el('div', { class: 'card value-block', style: 'margin-top:12px' }, [
    el('div', { class: 'eyebrow', text: 'Your score' }),
    scoreValue,
    el('div', { class: 'value-deltas' }, [
      el('div', {}, [
        el('span', { text: 'Standing ' }),
        el('b', { text: me ? ordinal(me.rank) : '—' }),
        el('span', { text: '  ·  ' }),
        el('span', { text: `${slate.picksRequired} picks, equal weight` }),
      ]),
    ]),
  ]);
  mount.append(valueCard);
  animateNumber(scoreValue, me?.score ?? 0, (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`);

  // ---- holdings -----------------------------------------------------------
  mount.append(
    el('div', { class: 'section-head' }, [
      el('h2', { text: 'Your picks' }),
      el('span', { class: 'hint', text: 'since open' }),
    ]),
  );

  const rows = el('div', { class: 'card' });
  const closes = ctx.closePrices;

  const holdings = entry.picks
    .map((id) => {
      const token = snapshot.tokens[id] ?? { sym: id, name: id };
      const open = slate.openPrices[id];
      const close = closes[id];
      let change = 0;
      try {
        change = pct(open, close);
      } catch {
        change = 0;
      }
      return { id, token, open, close, change };
    })
    .sort((a, b) => b.change - a.change);

  for (const h of holdings) {
    rows.append(
      el('div', { class: 'row' }, [
        tokenAvatar(h.token, 38),
        el('div', { class: 'row-main' }, [
          el('div', { class: 'row-name', text: h.token.sym?.toUpperCase() ?? h.id }),
          el('div', { class: 'row-sub num', text: `open ${fmtPrice(h.open)}` }),
        ]),
        el('div', { class: 'row-right' }, [
          el('div', { class: 'row-value num', text: fmtPrice(h.close) }),
          el('div', { class: `row-delta num ${toneOf(h.change)}`, text: fmtPct(h.change) }),
        ]),
      ]),
    );
  }
  mount.append(rows);

  if (holdings.length) {
    const best = holdings[0];
    const worst = holdings[holdings.length - 1];
    mount.append(
      el('div', { class: 'stat-grid' }, [
        el('div', { class: 'stat' }, [
          el('div', { class: `stat-value num ${toneOf(best.change)}`, text: fmtPct(best.change) }),
          el('div', { class: 'stat-label', text: `Best — ${best.token.sym?.toUpperCase() ?? best.id}` }),
        ]),
        el('div', { class: 'stat' }, [
          el('div', { class: `stat-value num ${toneOf(worst.change)}`, text: fmtPct(worst.change) }),
          el('div', { class: 'stat-label', text: `Worst — ${worst.token.sym?.toUpperCase() ?? worst.id}` }),
        ]),
      ]),
    );
  }

  mount.append(
    el('div', { class: 'notice', style: 'margin-top:12px' }, [
      el('span', { class: 'notice-icon', text: 'ⓘ' }),
      el('div', {
        html: 'Scores shown live are <b>provisional</b>. Every result is recomputed from the picks against archived prices before any prize is paid.',
      }),
    ]),
  );

  return {
    dock: () =>
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn is-quiet', text: 'Board', onClick: () => go('board') }),
        el('button', { class: 'btn', text: 'Share', onClick: () => go('#share') }),
      ]),
  };
}
