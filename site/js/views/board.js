import { el, clear, fmtScore, toneOf, ordinal } from '../ui.js';
import { GHOST_DEFS } from '../ghosts.js';

/**
 * The board.
 *
 * Movement is rewarded over status, and comparison is scoped — a global ranked
 * list de-motivates roughly 99% of any field, while scoping it "converts a
 * discouraging metric into a motivating one for 100% of users instead of 1%"
 * (DECISIONS 0011/0013).
 *
 * Right now the only opponents are algorithms, and the copy says exactly that.
 * Human leagues arrive with accounts and must not be implied before they exist.
 */
export function renderBoard(ctx, mount, go) {
  const { ranked, slate, entry } = ctx;
  clear(mount);

  mount.append(
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'eyebrow', text: 'Founding season' }),
        el('h2', { text: 'The board' }),
      ]),
      el('span', { class: 'hint', text: `top ${slate.payingPositions} paid` }),
    ]),
  );

  const paying = slate.payingPositions;
  const board = el('div', { class: 'card' });

  let cutDrawn = false;
  ranked.forEach((row, index) => {
    const isMe = row.entryId === 'me';
    const def = GHOST_DEFS.find((g) => g.id === row.entryId);

    // The cut line drawn where it actually falls in the list.
    if (!cutDrawn && index >= paying) {
      board.append(el('div', { class: 'cut-divider', text: 'cut line' }));
      cutDrawn = true;
    }

    board.append(
      el('div', { class: `board-row ${isMe ? 'is-me' : ''}` }, [
        el('div', {
          class: `board-rank num ${index < paying && !row.isGhost ? 'is-paying' : ''}`,
          text: String(row.rank),
        }),
        el('div', { class: 'board-glyph', text: isMe ? '★' : def?.glyph ?? '•' }),
        el('div', { style: 'min-width:0' }, [
          el('div', { class: 'board-name' }, [
            isMe ? 'You' : row.name ?? row.entryId,
            row.isGhost ? el('span', { class: 'ghost-tag', text: 'BOT' }) : null,
          ]),
          el('div', { class: 'board-sub', text: row.isGhost ? def?.blurb ?? '' : `${row.picks.length} picks` }),
        ]),
        el('div', { class: `board-score num ${toneOf(row.score)}`, text: fmtScore(row.score) }),
      ]),
    );
  });

  mount.append(board);

  const me = ranked.find((r) => r.entryId === 'me');
  const ghostsBeaten = me ? ranked.filter((r) => r.isGhost && r.score < me.score).length : 0;
  const ghostTotal = ranked.filter((r) => r.isGhost).length;

  if (me) {
    mount.append(
      el('div', { class: 'stat-grid' }, [
        el('div', { class: 'stat' }, [
          el('div', { class: 'stat-value num', text: ordinal(me.rank) }),
          el('div', { class: 'stat-label', text: 'Standing' }),
        ]),
        el('div', { class: 'stat' }, [
          el('div', { class: 'stat-value num', text: `${ghostsBeaten}/${ghostTotal}` }),
          el('div', { class: 'stat-label', text: 'Algorithms beaten' }),
        ]),
      ]),
    );
  }

  mount.append(
    el('div', { class: 'notice', style: 'margin-top:12px' }, [
      el('span', { class: 'notice-icon', text: '🤖' }),
      el('div', {
        html:
          'Every opponent here is an <b>algorithm</b>, marked BOT, and none of them can win a prize. ' +
          'Human leagues open when accounts launch — until then your results build your founding record.',
      }),
    ]),
  );

  return {
    dock: () =>
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn is-quiet', text: 'My contest', onClick: () => go('contest') }),
        el('button', { class: 'btn', text: 'Share', onClick: () => go('#share'), disabled: !entry }),
      ]),
  };
}
