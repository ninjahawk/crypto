/**
 * SPEC-001 verification.
 * Every assertion maps to a checkbox in spec/features/SPEC-001-scoring.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { pct, roundTo, scoreEntry, rankEntries, scoreContest, cutLine, seasonScore } from '../site/js/scoring.js';
import { buildGhosts, ghostPicks } from '../site/js/ghosts.js';

const here = dirname(fileURLToPath(import.meta.url));
const loadFixture = (n) => JSON.parse(readFileSync(join(here, 'fixtures', `contest-${n}.json`), 'utf8'));
const FIXTURES = ['01', '02', '03'].map(loadFixture);

test('pct: basic changes', () => {
  assert.equal(pct(100, 110), 10);
  assert.equal(pct(100, 90), -10);
  assert.equal(pct(100, 100), 0);
  assert.equal(pct(100, 0), -100);
});

test('pct: invalid open price throws rather than scoring zero', () => {
  assert.throws(() => pct(0, 10), RangeError);
  assert.throws(() => pct(-5, 10), RangeError);
  assert.throws(() => pct(NaN, 10), RangeError);
  assert.throws(() => pct(Infinity, 10), RangeError);
  assert.throws(() => pct(100, -1), RangeError);
});

test('roundTo: half away from zero, symmetric', () => {
  assert.equal(roundTo(2.5, 0), 3);
  assert.equal(roundTo(-2.5, 0), -3);
  assert.equal(roundTo(1.5, 0), 2);
  assert.equal(roundTo(-1.5, 0), -2);
  assert.equal(roundTo(1.23456789, 4), 1.2346);
  assert.equal(roundTo(-1.23456789, 4), -1.2346);
  assert.equal(roundTo(0, 4), 0);
});

test('roundTo: survives binary float representation', () => {
  assert.equal(roundTo(0.1 + 0.2, 4), 0.3);
  assert.equal(roundTo(2.675, 2), 2.68);
});

test('roundTo: rejects non-finite', () => {
  assert.throws(() => roundTo(NaN), TypeError);
  assert.throws(() => roundTo(Infinity), TypeError);
});

test('scoreEntry: mean of percent change', () => {
  const open = { a: 100, b: 100 };
  const close = { a: 110, b: 130 };
  assert.equal(scoreEntry(['a', 'b'], open, close), 20);
});

test('scoreEntry: input validation', () => {
  const open = { a: 100, b: 100 };
  const close = { a: 110, b: 130 };
  assert.throws(() => scoreEntry([], open, close), RangeError);
  assert.throws(() => scoreEntry(['a', 'a'], open, close), RangeError);
  assert.throws(() => scoreEntry(['a', 'zzz'], open, close), RangeError);
  assert.throws(() => scoreEntry(['a'], open, close, { picksRequired: 2 }), RangeError);
  assert.throws(() => scoreEntry('a', open, close), TypeError);
});

test('scoreEntry: does not mutate its arguments', () => {
  const picks = ['a', 'b'];
  const open = { a: 100, b: 100 };
  const close = { a: 110, b: 130 };
  const snapshot = JSON.stringify({ picks, open, close });
  scoreEntry(picks, open, close);
  assert.equal(JSON.stringify({ picks, open, close }), snapshot);
});

test('rankEntries: descending by score', () => {
  const ranked = rankEntries([
    { entryId: 'low', score: 1 },
    { entryId: 'high', score: 9 },
    { entryId: 'mid', score: 5 },
  ]);
  assert.deepEqual(ranked.map((e) => e.entryId), ['high', 'mid', 'low']);
  assert.deepEqual(ranked.map((e) => e.rank), [1, 2, 3]);
});

test('rankEntries: equal scores break by earlier lock', () => {
  const ranked = rankEntries([
    { entryId: 'late', score: 5, lockedAt: '2026-01-01T00:10:00Z' },
    { entryId: 'early', score: 5, lockedAt: '2026-01-01T00:01:00Z' },
  ]);
  assert.deepEqual(ranked.map((e) => e.entryId), ['early', 'late']);
});

test('rankEntries: equal score and lock break by entryId', () => {
  const ranked = rankEntries([
    { entryId: 'zulu', score: 5, lockedAt: 'T' },
    { entryId: 'alpha', score: 5, lockedAt: 'T' },
  ]);
  assert.deepEqual(ranked.map((e) => e.entryId), ['alpha', 'zulu']);
});

test('rankEntries: does not mutate the input array', () => {
  const input = [{ entryId: 'a', score: 1 }, { entryId: 'b', score: 2 }];
  const before = input.map((e) => e.entryId).join();
  rankEntries(input);
  assert.equal(input.map((e) => e.entryId).join(), before);
});

test('seasonScore: sums placements, missed days cost one worse than last', () => {
  assert.equal(seasonScore([1, 2, 3], 3, 50), 6);
  assert.equal(seasonScore([1, undefined, 3], 3, 50), 55);
  assert.equal(seasonScore([], 2, 10), 22);
});

// ---------------------------------------------------------------------------
// Golden fixtures — the hand-computed contests
// ---------------------------------------------------------------------------

for (const fx of FIXTURES) {
  test(`${fx.contestId}: percent change per token`, () => {
    for (const [id, expected] of Object.entries(fx.expectedPct)) {
      assert.equal(roundTo(pct(fx.openPrices[id], fx.closePrices[id])), expected, `token ${id}`);
    }
  });

  test(`${fx.contestId}: ghost selection`, () => {
    for (const [ghostId, expected] of Object.entries(fx.expectedGhostPicks)) {
      const picks = ghostPicks(ghostId, fx.slate, fx.meta, fx.picksRequired, fx.prevWinnerPicks);
      assert.deepEqual(picks, expected, `ghost ${ghostId}`);
    }
    for (const ghostId of fx.absentGhosts) {
      const picks = ghostPicks(ghostId, fx.slate, fx.meta, fx.picksRequired, fx.prevWinnerPicks);
      assert.equal(picks, null, `ghost ${ghostId} should not run on this slate`);
    }
  });

  test(`${fx.contestId}: diamond and paper hands disagree`, () => {
    const diamond = ghostPicks('diamond-hands', fx.slate, fx.meta, fx.picksRequired);
    const paper = ghostPicks('paper-hands', fx.slate, fx.meta, fx.picksRequired);
    assert.notDeepEqual(diamond, paper);
  });

  test(`${fx.contestId}: scores match hand computation`, () => {
    const ranked = runFixture(fx);
    for (const [entryId, expected] of Object.entries(fx.expectedScores)) {
      const entry = ranked.find((e) => e.entryId === entryId);
      assert.ok(entry, `missing entry ${entryId}`);
      assert.equal(entry.score, expected, `score for ${entryId}`);
    }
  });

  test(`${fx.contestId}: finishing order matches hand computation`, () => {
    const ranked = runFixture(fx);
    assert.deepEqual(ranked.map((e) => e.entryId), fx.expectedOrder);
  });

  test(`${fx.contestId}: cut line`, () => {
    const ranked = runFixture(fx);
    for (const [entryId, expected] of Object.entries(fx.expectedCutLine)) {
      const actual = cutLine(ranked, entryId, fx.payingPositions);
      assert.equal(actual.inTheMoney, expected.inTheMoney, `inTheMoney for ${entryId}`);
      assert.equal(actual.distance, expected.distance, `distance for ${entryId}`);
      assert.equal(actual.threshold, expected.threshold, `threshold for ${entryId}`);
    }
  });

  test(`${fx.contestId}: deterministic across 100 runs`, () => {
    const first = JSON.stringify(runFixture(fx));
    for (let i = 0; i < 100; i += 1) {
      assert.equal(JSON.stringify(runFixture(fx)), first);
    }
  });
}

function runFixture(fx) {
  const ghosts = buildGhosts(fx.slate, fx.meta, fx.picksRequired, {
    prevWinnerPicks: fx.prevWinnerPicks,
    opensAt: fx.opensAt,
  });
  return scoreContest([...fx.entries, ...ghosts], fx.openPrices, fx.closePrices, {
    picksRequired: fx.picksRequired,
  });
}
