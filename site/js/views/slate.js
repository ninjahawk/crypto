import { el, clear, fmtPct, fmtCompact, toneOf, tokenAvatar, fmtCountdown, toast } from '../ui.js';
import { lockEntry } from '../state.js';
import { openTokenSheet } from './token.js';

/**
 * The pick surface. This is the screen that decides whether anyone stays:
 * activation roughly doubles when onboarding drives one meaningful action
 * before the full interface, and the target is first action inside 60 seconds
 * (DECISIONS 0010). So it loads straight into a tappable slate — no wall,
 * no tour, no account.
 */
export function renderSlate(ctx, mount, go, onDraft) {
  const { slate, snapshot, entry, now } = ctx;
  clear(mount);

  const locked = Boolean(entry);
  const need = slate.picksRequired;
  const selected = new Set(locked ? entry.picks : ctx.draft ?? []);
  const closesIn = Date.parse(slate.closesAt) - now;
  const urgent = closesIn < 60 * 60 * 1000;

  mount.append(
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'eyebrow', text: locked ? 'Your picks' : "Today's slate" }),
        el('h2', { text: locked ? 'Locked in' : `Pick ${need}` }),
      ]),
      el('span', {
        class: `countdown-pill num ${urgent ? 'is-urgent' : ''}`,
        'data-countdown': slate.closesAt,
        text: closesIn > 0 ? `⏱ ${fmtCountdown(closesIn)}` : 'Closed',
      }),
    ]),
  );

  if (!locked) {
    mount.append(
      el('p', {
        class: 'prose',
        style: 'margin:-4px 0 14px',
        text: `You get $10,000. These five open at ${(100 / need).toFixed(0)}% each — then you trade them however you like.`,
      }),
    );
  }

  const grid = el('div', { class: 'pickgrid' });
  mount.append(grid);

  /**
   * Repaint only the grid on each toggle. A full view re-render would drop
   * taps mid-selection, which is the one interaction we cannot afford to lose.
   */
  function paintGrid() {
    clear(grid);
    for (const id of slate.tokens) {
      const token = snapshot.tokens[id];
      if (!token) continue;

      // The hero number is prior-24h form, not movement since open.
      // Form is what you actually pick on, and at contest open every
      // since-open figure is 0.00% — a dead board at the exact moment
      // someone is deciding whether this thing is alive.
      const form = token.ch24 ?? 0;
      const isOn = selected.has(id);
      const atLimit = selected.size >= need && !isOn;

      grid.append(
        el('button', {
          class: 'pick',
          type: 'button',
          'aria-pressed': isOn ? 'true' : 'false',
          'aria-label': `${token.name ?? id}, ${fmtPct(form)} in 24 hours${isOn ? ', selected' : ''}`,
          disabled: locked || atLimit,
          onClick: () => {
            if (locked) return;
            if (isOn) selected.delete(id);
            else if (selected.size < need) selected.add(id);
            paintGrid();
            onDraft?.([...selected]);
          },
        }, [
          el('div', { class: 'pick-top' }, [
            tokenAvatar(token, 30),
            el('div', { style: 'min-width:0;flex:1' }, [
              el('div', { class: 'pick-sym', text: token.sym?.toUpperCase() ?? id }),
              el('div', { class: 'pick-name', text: token.name ?? '' }),
            ]),
            // Real crowd data, not a fabricated count. Makes the board feel
            // busy without ever revealing our field size (DECISIONS 0004).
            token.picks != null ? el('span', { class: 'pick-heat', text: `🔥 ${fmtCompact(token.picks)}` }) : null,
          ]),
          el('div', { class: `pick-move num ${toneOf(form)}`, text: fmtPct(form) }),
          el('div', { class: 'pick-meta num' }, [
            el('span', { text: '24h' }),
            token.mc ? el('span', { text: ` · $${fmtCompact(token.mc)} mc` }) : null,
          ]),
          el('span', { class: 'pick-check', text: '✓' }),
          el('span', {
            class: 'pick-info',
            role: 'button',
            'aria-label': `${token.name ?? id} details`,
            text: 'ⓘ',
            onClick: (e) => { e.stopPropagation(); openTokenSheet(ctx, id); },
          }),
        ]),
      );
    }
  }

  paintGrid();

  if (locked) {
    mount.append(
      el('div', { class: 'notice', style: 'margin-top:16px' }, [
        el('span', { class: 'notice-icon', text: '🔒' }),
        el('div', { html: 'Your picks are locked for this contest. New slate at <b>00:00 UTC</b>.' }),
      ]),
    );
  }

  function dock() {
    if (locked) {
      return el('button', { class: 'btn is-quiet', text: 'View my contest →', onClick: () => go('contest') });
    }
    const count = selected.size;
    const ready = count === need;
    return el('button', {
      class: `btn ${ready ? 'is-lime' : ''}`,
      disabled: !ready,
      text: ready ? `Deploy $10,000` : `Pick ${need - count} more`,
      onClick: () => {
        if (!ready) return;
        try {
          lockEntry(slate.contestId, [...selected], new Date(now).toISOString(), slate.openPrices);
          toast('$10,000 deployed. Good luck.');
          go('contest');
        } catch (err) {
          toast(err.message);
        }
      },
    });
  }

  return { dock };
}
