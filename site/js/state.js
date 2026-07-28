/**
 * Local player state.
 *
 * The pick record is append-only and never mutated (DECISIONS 0006) — a locked
 * entry is a claim we may later have to verify, so rewriting history is not
 * available even to us.
 *
 * v1 is local-only. Nothing here implies accounts or human opponents exist yet.
 */

const KEY = 'cutline.v1';

const EMPTY = {
  playerId: null,
  displayName: null,
  interests: [],
  foundingNumber: null,
  entries: {}, // contestId -> { picks, lockedAt, contestId }
  results: {}, // contestId -> { rank, score, fieldNote }
  streak: { count: 0, lastPlayed: null, freezesUsed: 0, freezeMonth: null },
  seenIntro: false,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    return { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode, quota — the contest still plays, it just won't persist */
  }
}

let cache = read();

export function getState() {
  return cache;
}

function update(fn) {
  const next = structuredClone(cache);
  fn(next);
  cache = next;
  write(cache);
  return cache;
}

export function ensurePlayer() {
  if (cache.playerId) return cache;
  return update((s) => {
    s.playerId = `p-${crypto.randomUUID().slice(0, 8)}`;
    // Founding number is local and cosmetic until accounts exist. It is not a
    // claim about how many people are playing.
    s.foundingNumber = null;
  });
}

export function setDisplayName(name) {
  return update((s) => {
    s.displayName = String(name).trim().slice(0, 24) || null;
  });
}

export function setInterests(interests) {
  return update((s) => {
    s.interests = [...interests];
    s.seenIntro = true;
  });
}

export function dismissIntro() {
  return update((s) => {
    s.seenIntro = true;
  });
}

export function entryFor(contestId) {
  return cache.entries[contestId] ?? null;
}

/** Lock picks for a contest. Refuses to overwrite an existing entry. */
export function lockEntry(contestId, picks, nowISO) {
  if (cache.entries[contestId]) {
    throw new Error('Entry already locked for this contest');
  }
  return update((s) => {
    s.entries[contestId] = {
      contestId,
      picks: [...picks],
      lockedAt: nowISO,
    };
    bumpStreak(s, contestId);
  });
}

export const FREEZES_PER_MONTH = 1;

/**
 * Streak transition — pure, so it can be tested without a browser.
 *
 * The freeze is not generosity. Letting people carry a streak through one
 * missed day measurably raises daily actives, because a streak that can only
 * ever be lost stops motivating the moment it breaks. Nobody plays every day.
 *
 * `streak` is `{ count, lastPlayed, freezesUsed, freezeMonth }`.
 * `todayId` is a contest id, which is a YYYY-MM-DD date.
 */
export function nextStreak(streak, todayId) {
  if (streak.lastPlayed === todayId) return { ...streak };

  const month = todayId.slice(0, 7);
  const rolledOver = streak.freezeMonth !== month;
  const freezesUsed = rolledOver ? 0 : streak.freezesUsed;

  let count;
  let spent = freezesUsed;

  if (!streak.lastPlayed) {
    count = 1;
  } else {
    const gap = dayGap(streak.lastPlayed, todayId);
    if (gap === 1) {
      count = streak.count + 1;
    } else if (gap === 2 && freezesUsed < FREEZES_PER_MONTH) {
      // Exactly one day missed and a freeze available — the run survives.
      count = streak.count + 1;
      spent = freezesUsed + 1;
    } else {
      count = 1;
    }
  }

  return { count, lastPlayed: todayId, freezesUsed: spent, freezeMonth: month };
}

function bumpStreak(s, contestId) {
  s.streak = nextStreak(s.streak, contestId);
}

function dayGap(fromISODate, toISODate) {
  const a = Date.parse(`${fromISODate}T00:00:00Z`);
  const b = Date.parse(`${toISODate}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function recordResult(contestId, result) {
  return update((s) => {
    s.results[contestId] = { ...result };
  });
}

export function playedCount() {
  return Object.keys(cache.entries).length;
}

export function bestFinish() {
  const ranks = Object.values(cache.results).map((r) => r.rank).filter(Number.isFinite);
  return ranks.length ? Math.min(...ranks) : null;
}

export function resetAll() {
  localStorage.removeItem(KEY);
  cache = read();
  return cache;
}
