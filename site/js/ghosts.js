/**
 * Ghost entrants — SPEC-001.
 *
 * Deterministic algorithmic opponents. They are openly non-human, badged as
 * such, and permanently prize-ineligible (DECISIONS 0004). They exist so the
 * board is genuinely populated from day one without inventing a single person,
 * and because "I beat Buy & Hold BTC" is a better thing to post than a rank.
 *
 * Pure. Selection uses only information available at contest open.
 */

export const GHOST_DEFS = [
  {
    id: 'hodl-btc',
    label: 'Buy & Hold BTC',
    blurb: 'Buys bitcoin. Does nothing else. The number to beat.',
    glyph: '₿',
  },
  {
    id: 'the-index',
    label: 'The Index',
    blurb: 'Holds every token on the slate, equally. The market itself.',
    glyph: '◎',
  },
  {
    id: 'diamond-hands',
    label: 'Diamond Hands',
    blurb: 'Buys whatever fell hardest yesterday. Never flinches.',
    glyph: '◆',
  },
  {
    id: 'paper-hands',
    label: 'Paper Hands',
    blurb: 'Chases whatever ran yesterday. Always late.',
    glyph: '✋',
  },
  {
    id: 'last-champion',
    label: 'Last Champion',
    blurb: "Replays yesterday's winning picks.",
    glyph: '♛',
  },
];

const BTC_ID = 'bitcoin';

/**
 * Sort token ids by prior-24h change, with an explicit id tie-break.
 *
 * Two tokens can post identical prior changes, and without the id tie-break
 * the ghost's picks could differ between our board and the verifier — which
 * is the one thing this whole design exists to prevent.
 */
function byPriorChange(ids, meta, direction) {
  return [...ids].sort((a, b) => {
    const changeA = meta[a]?.ch24 ?? 0;
    const changeB = meta[b]?.ch24 ?? 0;
    if (changeA !== changeB) {
      return direction === 'asc' ? changeA - changeB : changeB - changeA;
    }
    return a < b ? -1 : 1;
  });
}

/**
 * Picks for one ghost, or `null` when the strategy cannot run on this slate
 * (no bitcoin listed, or no previous champion on day one).
 */
export function ghostPicks(ghostId, slateTokens, meta, picksRequired, prevWinnerPicks = null) {
  switch (ghostId) {
    case 'hodl-btc':
      return slateTokens.includes(BTC_ID) ? [BTC_ID] : null;

    case 'the-index':
      return [...slateTokens];

    case 'diamond-hands':
      return byPriorChange(slateTokens, meta, 'asc').slice(0, picksRequired);

    case 'paper-hands':
      return byPriorChange(slateTokens, meta, 'desc').slice(0, picksRequired);

    case 'last-champion': {
      if (!Array.isArray(prevWinnerPicks) || prevWinnerPicks.length === 0) return null;
      // Yesterday's winner may have held something not on today's slate.
      const carried = prevWinnerPicks.filter((id) => slateTokens.includes(id));
      return carried.length > 0 ? carried : null;
    }

    default:
      return null;
  }
}

/**
 * Build every runnable ghost as a scoreable entry.
 * `lockedAt` is the contest open so ghosts always lose a tie to a human who
 * locked at the same score — the tie-break should favour the person.
 */
export function buildGhosts(slateTokens, meta, picksRequired, opts = {}) {
  const { prevWinnerPicks = null, opensAt = '' } = opts;

  return GHOST_DEFS.map((def) => {
    const picks = ghostPicks(def.id, slateTokens, meta, picksRequired, prevWinnerPicks);
    if (!picks) return null;
    return {
      entryId: def.id,
      name: def.label,
      blurb: def.blurb,
      glyph: def.glyph,
      picks,
      isGhost: true,
      lockedAt: opensAt,
    };
  }).filter(Boolean);
}
