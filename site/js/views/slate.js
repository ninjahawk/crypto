import { el, clear, fmtPct, fmtCompact, toneOf, tokenAvatar, fmtCountdown, toast } from '../ui.js';
import { lockEntry } from '../state.js';

/**
 * The pick surface. This is the screen that decides whether anyone stays:
 * activation roughly doubles when onboarding drives one meaningful action
 * before the full interface, and the target is first action inside 60 seconds
 * (DECISIONS 0010). So it loads straight into a tappable slate — no wall,
 * no tour, no account.
 */
export function renderSlate(ctx, mount, onChange) {
  const { slate, snapshot, entry, now } = ctx;
  clear(mount);

  const locked = Boolean(entry);
  const selected = new Set(entry?.picks ?? ctx.draft ?? []);
  const need = slate.picksRequired;
  const closesIn = Date.parse(slate.closesAt) - now;
  const urgent = closesIn < 60 * 60 * 1000;

  const head = el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('div', { class: 'eyebrow', text: locked ? 'Your picks' : "Today's slate" }),
      el('h2', { text: locked ? 'Locked in' : `Pick ${need}` }),
    ]),
    el('span', {
      class: `countdown-pill num ${urgent ? 'is-urgent' : ''}`,
      text: closesIn > 0 ? `⏱ ${fmtCountdown(closesIn)}` : 'Closed',
    }),
  ]);
  mount.append(head);

  if (!locked) {
    mount.append(
      el('p', {
        class: 'prose',
        style: 'margin:-4px 0 14px',
        text: `Equal weight, ${(100 / need).toFixed(0)}% each. Scored on real price movement when the contest closes.`,
      }),
    );
  }

  const grid = el('div', { class: 'pickgrid' });

  for (const id of slate.tokens) {
    const token = snapshot.tokens[id];
    if (!token) continue;

    const openPrice = slate.openPrices[id];
    const livePrice = token.price;
    const move = openPrice > 0 ? ((livePrice - openPrice) / openPrice) * 100 : 0;
    const isOn = selected.has(id);
    const atLimit = selected.size >= need && !isOn;

    const card = el(
      'button',
      {
        class: 'pick',
        type: 'button',
        'aria-pressed': isOn ? 'true' : 'false',
        disabled: locked || (atLimit && !isOn),
        onClick: () => {
          if (locked) return;
          if (isOn) selected.delete(id);
          else if (selected.size < need) selected.add(id);
          onChange([...selected]);
        },
      },
      [
        el('div', { class: 'pick-top' }, [
          tokenAvatar(token, 34),
          // Real crowd data, not a fabricated count. Makes the board feel
          // busy without ever revealing our field size (DECISIONS 0004).
          token.picks != null
            ? el('span', { class: 'pick-heat', text: `🔥 ${fmtCompact(token.picks)}` })
            : null,
        ]),
        el('div', { class: 'pick-sym', text: token.sym?.toUpperCase() ?? id }),
        el('div', { class: 'pick-name', text: token.name ?? '' }),
        el('div', { class: `pick-move num ${toneOf(move)}`, text: fmtPct(move) }),
        el('div', { class: 'pick-meta num', text: token.mc ? `$${fmtCompact(token.mc)} mc` : '' }),
        el('span', { class: 'pick-check', text: '✓' }),
      ],
    );
    grid.append(card);
  }

  mount.append(grid);

  if (locked) {
    mount.append(
      el('div', { class: 'notice', style: 'margin-top:16px' }, [
        el('span', { class: 'notice-icon', text: '🔒' }),
        el('div', {
          html: 'Your picks are locked for this contest. New slate at <b>00:00 UTC</b>.',
        }),
      ]),
    );
  }

  return {
    dock(selectedIds, refresh) {
      if (locked) {
        return el('button', {
          class: 'btn is-quiet',
          text: 'View my contest →',
          onClick: () => refresh('contest'),
        });
      }
      const count = selectedIds.length;
      const ready = count === need;
      return el('button', {
        class: `btn ${ready ? 'is-lime' : ''}`,
        disabled: !ready,
        text: ready ? `Lock in ${need} picks` : `Pick ${need - count} more`,
        onClick: () => {
          if (!ready) return;
          try {
            lockEntry(slate.contestId, selectedIds, new Date(now).toISOString());
            toast('Locked in. Good luck.');
            refresh('contest');
          } catch (err) {
            toast(err.message);
          }
        },
      });
    },
  };
}
