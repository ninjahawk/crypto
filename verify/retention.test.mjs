/**
 * Streak and share-headline behaviour.
 *
 * These two carry most of the retention and growth weight in the product, and
 * both are easy to get subtly wrong in ways nobody notices until the numbers
 * are already bad. state.js touches localStorage, so the streak transition is
 * exported as a pure function purely so it can be checked here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { nextStreak, FREEZES_PER_MONTH } from '../site/js/state.js';
import { headlineFor } from '../site/js/share.js';

const fresh = { count: 0, lastPlayed: null, freezesUsed: 0, freezeMonth: null };

test('streak: first ever play starts at 1', () => {
  const s = nextStreak(fresh, '2026-03-10');
  assert.equal(s.count, 1);
  assert.equal(s.lastPlayed, '2026-03-10');
  assert.equal(s.freezeMonth, '2026-03');
});

test('streak: consecutive days increment', () => {
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-11');
  s = nextStreak(s, '2026-03-12');
  assert.equal(s.count, 3);
  assert.equal(s.freezesUsed, 0);
});

test('streak: playing twice in one day does not double count', () => {
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-10');
  assert.equal(s.count, 1);
});

test('streak: one missed day is covered by a freeze', () => {
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-11');
  s = nextStreak(s, '2026-03-13'); // 12th missed
  assert.equal(s.count, 3);
  assert.equal(s.freezesUsed, 1);
});

test('streak: a second miss in the same month breaks the run', () => {
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-12'); // freeze spent
  assert.equal(s.freezesUsed, FREEZES_PER_MONTH);
  s = nextStreak(s, '2026-03-14'); // no freeze left
  assert.equal(s.count, 1);
});

test('streak: two or more consecutive missed days always break it', () => {
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-14');
  assert.equal(s.count, 1);
  assert.equal(s.freezesUsed, 0, 'a freeze must not be burned on an unsalvageable gap');
});

test('streak: counts days actually played, not calendar days', () => {
  // A frozen day protects the run but is not credited as a day played, so the
  // number always matches the copy: "you've shown up N days running".
  let s = nextStreak(fresh, '2026-03-10');
  s = nextStreak(s, '2026-03-12'); // 11th missed, frozen
  assert.equal(s.count, 2, 'two plays, not three calendar days');
});

test('streak: freezes replenish at the month boundary', () => {
  let s = nextStreak(fresh, '2026-03-28');
  s = nextStreak(s, '2026-03-30'); // freeze spent in March
  assert.equal(s.freezesUsed, 1);
  s = nextStreak(s, '2026-03-31');
  s = nextStreak(s, '2026-04-02'); // April, fresh freeze available again
  assert.equal(s.freezeMonth, '2026-04');
  assert.equal(s.freezesUsed, 1);
  assert.equal(s.count, 4, 'the run survives into the new month');
});

test('streak: crossing a month boundary on consecutive days is unbroken', () => {
  let s = nextStreak(fresh, '2026-03-31');
  s = nextStreak(s, '2026-04-01');
  assert.equal(s.count, 2);
});

test('streak: is pure', () => {
  const input = { ...fresh };
  const snapshot = JSON.stringify(input);
  nextStreak(input, '2026-03-10');
  assert.equal(JSON.stringify(input), snapshot);
});

// ---------------------------------------------------------------------------
// Share headlines. Winning covers ~10% of players, so most sessions must still
// end with something worth posting — otherwise the growth loop only runs for
// people who were already winning.
// ---------------------------------------------------------------------------

const base = { rank: 5, score: 1, ghostsBeaten: 0, ghostTotal: 4, beatBtc: false, bestPick: null, streak: 0 };

test('headline: first place outranks everything', () => {
  const h = headlineFor({ ...base, rank: 1, beatBtc: true, streak: 40 });
  assert.match(h.line, /1st/);
});

test('headline: beating BTC is the next best flex', () => {
  const h = headlineFor({ ...base, beatBtc: true, score: 3 });
  assert.match(h.line, /Buy & Hold BTC/);
});

test('headline: beating BTC on a losing day is not claimed as a win', () => {
  const h = headlineFor({ ...base, beatBtc: true, score: -2 });
  assert.doesNotMatch(h.line, /Buy & Hold BTC/);
});

test('headline: a clean sweep of the algorithms', () => {
  const h = headlineFor({ ...base, ghostsBeaten: 4, ghostTotal: 4 });
  assert.match(h.line, /every algorithm/i);
});

test('headline: falls back to the best pick', () => {
  const h = headlineFor({ ...base, bestPick: { sym: 'BONK', change: 42.4 } });
  assert.match(h.line, /BONK/);
  assert.match(h.line, /42\.4/);
});

test('headline: a streak is postable even on a bad day', () => {
  const h = headlineFor({ ...base, score: -8, bestPick: { sym: 'ETH', change: -3 }, streak: 12 });
  assert.match(h.line, /12 days/);
});

test('headline: always returns something postable', () => {
  const h = headlineFor({ ...base, score: -14, bestPick: { sym: 'ETH', change: -9 } });
  assert.ok(h.line.length > 0);
  assert.ok(h.kicker.length > 0);
});
