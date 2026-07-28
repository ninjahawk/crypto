/**
 * Local player state.
 *
 * The pick record is append-only and never mutated (DECISIONS 0006) — a locked
 * entry is a claim we may later have to verify, so rewriting history is not
 * available even to us.
 *
 * v1 is local-only. Nothing here implies accounts or human opponents exist yet.
 */

import { newBook, allocateEqually } from './bankroll.js';

const KEY = 'cutline.v1';

const EMPTY = {
  playerId: null,
  displayName: null,
  interests: [],
  foundingNumber: null,
  entries: {}, // contestId -> { picks, lockedAt, contestId }
  books: {},   // contestId -> bankroll book (see bankroll.js)
  rivals: [],  // self-selected opponents (DECISIONS 0011)
  lastRanks: {}, // contestId -> { entryId: rank } for movement deltas
  email: null,
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

/**
 * Lock picks for a contest and deploy the bankroll across them.
 *
 * The picks are the opening position, not the whole game — from here the
 * player can sell, rebalance and redeploy cash for the rest of the contest.
 * That is the pick'em → portfolio bridge (DECISIONS 0010).
 */
export function lockEntry(contestId, picks, nowISO, openPrices) {
  if (cache.entries[contestId]) {
    throw new Error('Entry already locked for this contest');
  }
  const book = allocateEqually(newBook(), picks, openPrices, nowISO);
  return update((s) => {
    s.entries[contestId] = { contestId, picks: [...picks], lockedAt: nowISO };
    s.books[contestId] = book;
    if (s.foundingNumber == null) s.foundingNumber = nextFoundingNumber();
    bumpStreak(s, contestId);
  });
}

export function bookFor(contestId) {
  return cache.books[contestId] ?? null;
}

/** Persist a book after a trade. The log inside it is append-only. */
export function saveBook(contestId, book) {
  return update((s) => {
    s.books[contestId] = book;
  });
}

/**
 * Founding number.
 *
 * Local and cosmetic until accounts exist, and deliberately *not* presented as
 * a count of how many people are playing — that would be a fabricated field
 * size (DECISIONS 0004). It is a join-order badge, nothing more.
 */
function nextFoundingNumber() {
  return Math.max(1, Object.keys(cache.entries).length + 1);
}

/** Rivals: self-selected opponents to scope the board to (DECISIONS 0011). */
export function toggleRival(rivalId) {
  return update((s) => {
    const i = s.rivals.indexOf(rivalId);
    if (i >= 0) s.rivals.splice(i, 1);
    else if (s.rivals.length < 3) s.rivals.push(rivalId);
  });
}

/**
 * Rank movement since the previous look.
 *
 * Movement motivates everyone; status only motivates whoever is already on
 * top (DECISIONS 0011). Positive means climbed.
 */
export function rankDeltas(contestId, ranked) {
  const previous = cache.lastRanks[contestId] ?? {};
  const deltas = {};
  for (const row of ranked) {
    const before = previous[row.entryId];
    deltas[row.entryId] = Number.isFinite(before) ? before - row.rank : 0;
  }
  return deltas;
}

/** Snapshot current ranks so the next visit can diff against them. */
export function rememberRanks(contestId, ranked) {
  return update((s) => {
    s.lastRanks[contestId] = Object.fromEntries(ranked.map((r) => [r.entryId, r.rank]));
  });
}

export function setEmail(address) {
  return update((s) => {
    s.email = String(address).trim().toLowerCase() || null;
  });
}

export function getRivals() {
  return [...cache.rivals];
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
