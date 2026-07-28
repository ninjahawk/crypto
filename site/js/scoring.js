/**
 * Scoring engine — SPEC-001.
 *
 * Pure. No I/O, no clock, no randomness. Every input arrives as an argument.
 * Real money is paid on these numbers, so determinism outranks everything:
 * an independent verifier must reproduce any score exactly, on any machine.
 */

export const SCORE_DP = 4;

/**
 * Round half away from zero, at a fixed decimal place.
 *
 * Math.round() breaks ties toward +Infinity, so -2.5 rounds to -2 while 2.5
 * rounds to 3 — asymmetric, and on a leaderboard that asymmetry is a wrong
 * payout. We scale to an integer first to keep the usual binary-float error
 * (0.1 + 0.2) out of the boundary comparison.
 */
export function roundTo(value, dp = SCORE_DP) {
  if (!Number.isFinite(value)) throw new TypeError(`roundTo: not finite: ${value}`);
  const factor = 10 ** dp;
  const scaled = value * factor;
  // Nudge by one ulp-ish epsilon so values that are mathematically exact but
  // stored slightly under (e.g. 2.675 → 2.67499...) land on the right side.
  const nudged = scaled + (scaled >= 0 ? 1e-9 : -1e-9);
  const rounded = scaled >= 0 ? Math.floor(nudged + 0.5) : Math.ceil(nudged - 0.5);
  return rounded / factor;
}

/** Percent change from open to close. */
export function pct(open, close) {
  if (!Number.isFinite(open) || open <= 0) {
    throw new RangeError(`pct: open price must be finite and > 0, got ${open}`);
  }
  if (!Number.isFinite(close) || close < 0) {
    throw new RangeError(`pct: close price must be finite and >= 0, got ${close}`);
  }
  return ((close - open) / open) * 100;
}

/**
 * Score one entry: the arithmetic mean of percent change across its picks.
 *
 * Equal weights are deliberate. Five equal picks is 20% each, which satisfies
 * the 40% position cap (DECISIONS 0008) without a rule the player has to learn.
 */
export function scoreEntry(picks, openPrices, closePrices, opts = {}) {
  const { picksRequired = null } = opts;

  if (!Array.isArray(picks)) throw new TypeError('scoreEntry: picks must be an array');
  if (picks.length === 0) throw new RangeError('scoreEntry: picks must not be empty');
  if (picksRequired !== null && picks.length !== picksRequired) {
    throw new RangeError(`scoreEntry: expected ${picksRequired} picks, got ${picks.length}`);
  }
  if (new Set(picks).size !== picks.length) {
    throw new RangeError('scoreEntry: duplicate pick');
  }

  let total = 0;
  for (const id of picks) {
    if (!(id in openPrices)) throw new RangeError(`scoreEntry: no open price for "${id}"`);
    if (!(id in closePrices)) throw new RangeError(`scoreEntry: no close price for "${id}"`);
    total += pct(openPrices[id], closePrices[id]);
  }

  return roundTo(total / picks.length);
}

/**
 * Rank entries, best first.
 *
 * Ordering is total and stable: score desc, then earliest lock, then entryId.
 * Two players can tie on score to four decimals, so without the further
 * tie-breaks the finishing order could differ between our board and the
 * verifier — which is exactly the dispute we cannot afford.
 */
export function rankEntries(entries) {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const lockA = a.lockedAt ?? '';
    const lockB = b.lockedAt ?? '';
    if (lockA !== lockB) return lockA < lockB ? -1 : 1;
    return String(a.entryId) < String(b.entryId) ? -1 : 1;
  });
  return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Score and rank a whole contest in one pass.
 * Entries are `{ entryId, picks, lockedAt, ...rest }`; extra fields survive.
 */
export function scoreContest(entries, openPrices, closePrices, opts = {}) {
  const scored = entries.map((entry) => ({
    ...entry,
    score: scoreEntry(entry.picks, openPrices, closePrices, {
      // Ghosts legitimately hold a different number of positions to players.
      picksRequired: entry.isGhost ? null : opts.picksRequired ?? null,
    }),
  }));
  return rankEntries(scored);
}

/**
 * The cut line: how far the entry is from the last paying position, in score
 * points. Positive means already in the money.
 *
 * This is the number the whole product is built around, and it is the one
 * display that works identically at 30 players or 30,000 — which is why we
 * show it instead of a rank out of a field size (DECISIONS 0004).
 */
export function cutLine(ranked, entryId, payingPositions) {
  const me = ranked.find((e) => e.entryId === entryId);
  if (!me) return null;

  const eligible = ranked.filter((e) => !e.isGhost);
  const lastPaying = eligible[payingPositions - 1];

  // Field smaller than the prize table — everyone still standing is paid.
  if (!lastPaying) {
    return { inTheMoney: true, distance: 0, threshold: null, rank: me.rank };
  }

  const inTheMoney = me.score >= lastPaying.score && !me.isGhost;
  return {
    inTheMoney,
    distance: roundTo(Math.abs(me.score - lastPaying.score), 2),
    threshold: lastPaying.score,
    rank: me.rank,
  };
}

/**
 * Season score: sum of daily placements, lower is better (DECISIONS 0008).
 * A day not played counts as one worse than last place, so showing up is
 * always better than sitting out — but one lucky day cannot win a month.
 */
export function seasonScore(placements, daysInSeason, fieldSize) {
  let total = 0;
  for (let day = 0; day < daysInSeason; day += 1) {
    const place = placements[day];
    total += Number.isFinite(place) ? place : fieldSize + 1;
  }
  return total;
}
