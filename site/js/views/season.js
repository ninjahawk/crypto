import { el, clear, ordinal, fmtScore, toneOf } from '../ui.js';
import { getState, playedCount, bestFinish } from '../state.js';

/**
 * Season and streak.
 *
 * The biggest drop anywhere in a daily product is day 1 → day 2, and most
 * streak design exists purely to carry someone across it. The freeze is not
 * generosity — letting people keep a streak through a missed day measurably
 * raises daily actives, because a streak that can only be lost stops
 * motivating the moment it breaks.
 *
 * Copy leans on identity ("you've shown up N days") rather than threat
 * ("don't lose your streak") — identity outlasts loss aversion.
 */
export function renderSeason(ctx, mount, go) {
  const state = getState();
  clear(mount);

  const { count, freezesUsed } = state.streak;
  const played = playedCount();
  const best = bestFinish();

  mount.append(
    el('div', { class: 'streak-hero' }, [
      el('div', { class: 'streak-flame', text: count > 0 ? '🔥' : '🕯️' }),
      el('div', { class: 'streak-count num', text: String(count) }),
      el('div', { class: 'streak-label', text: count === 1 ? 'day streak' : 'day streak' }),
      count >= 3
        ? el('div', {
            class: 'prose',
            style: 'margin-top:10px;font-size:13.5px',
            text: `You've shown up ${count} days running.`,
          })
        : null,
    ]),
  );

  mount.append(
    el('div', { class: 'stat-grid' }, [
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value num', text: String(played) }),
        el('div', { class: 'stat-label', text: 'Contests entered' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value num', text: best ? ordinal(best) : '—' }),
        el('div', { class: 'stat-label', text: 'Best finish' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value num', text: `${1 - freezesUsed}` }),
        el('div', { class: 'stat-label', text: 'Streak freezes left' }),
      ]),
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat-value', text: state.foundingNumber ? `#${state.foundingNumber}` : '—' }),
        el('div', { class: 'stat-label', text: 'Founding trader' }),
      ]),
    ]),
  );

  mount.append(
    el('div', { class: 'notice', style: 'margin-top:12px' }, [
      el('span', { class: 'notice-icon', text: '🧊' }),
      el('div', {
        html: 'Miss a day and one <b>streak freeze</b> a month keeps your run alive. Nobody plays every single day.',
      }),
    ]),
  );

  // ---- history ------------------------------------------------------------
  const results = Object.entries(getState().results).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  mount.append(el('div', { class: 'section-head' }, [el('h2', { text: 'Your record' })]));

  if (results.length === 0) {
    mount.append(
      el('div', { class: 'card empty' }, [
        el('div', { class: 'empty-title', text: 'No settled contests yet' }),
        el('div', { text: 'Your first result lands when today\'s contest closes at 00:00 UTC.' }),
      ]),
    );
  } else {
    const list = el('div', { class: 'card' });
    for (const [contestId, r] of results) {
      list.append(
        el('div', { class: 'row' }, [
          el('div', { class: 'row-main' }, [
            el('div', { class: 'row-name', text: contestId }),
            el('div', { class: 'row-sub', text: r.fieldNote ?? 'vs algorithms' }),
          ]),
          el('div', { class: 'row-right' }, [
            el('div', { class: 'row-value', text: ordinal(r.rank) }),
            el('div', { class: `row-delta num ${toneOf(r.score)}`, text: fmtScore(r.score) }),
          ]),
        ]),
      );
    }
    mount.append(list);
  }

  return {
    dock: () => el('button', { class: 'btn is-quiet', text: 'Back to contest', onClick: () => go('contest') }),
  };
}
