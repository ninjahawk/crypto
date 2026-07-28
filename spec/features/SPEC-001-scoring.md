# SPEC-001 — Scoring Engine

```yaml
status: implemented
slice: 1
depends_on: []
implements: site/js/scoring.js, site/js/ghosts.js
verified_by: verify/scoring.test.mjs, verify/fixtures/
```

## Outcome

Given a set of picks, an open price snapshot and a close price snapshot, produce a score that is **exactly reproducible** by an independent verifier. The score is the basis on which real money is paid, so determinism is the primary requirement — ahead of performance, ahead of elegance.

## Scope

**IN:** percent-change maths, entry scoring, ranking, tie-breaking, ghost strategies, rounding.
**OUT:** UI, persistence, price fetching, league assignment, prize calculation.

## Constraints

- Pure functions. No I/O, no `Date.now()`, no randomness — every input arrives as an argument.
- Must produce identical output on any machine, any JS engine, any day.
- Never mutates its inputs.
- No floating-point equality comparisons anywhere in ranking.

## Prior decisions

- `DECISIONS.md` 0006 — the pick record is the source of truth; scores are provisional claims until verified.
- `DECISIONS.md` 0008 — season ranks on sum of daily placements, not raw return.
- `DECISIONS.md` 0010 — pick'em with equal weights. Five equal picks = 20% each, which satisfies the 40% position cap without a user-facing rule.

## Rules

**Percent change**

```
pct(open, close) = ((close - open) / open) * 100
```

Open price must be finite and `> 0`. Anything else is invalid input and throws — it must never silently score as zero, because a silent zero on a real contest is a wrong payout.

**Entry score**

Arithmetic mean of `pct()` across exactly `picksRequired` picks. Equal weight, no position sizing in v1.

**Rounding**

All scores round to **4 decimal places, half away from zero**, applied to the scaled integer. Display truncates to 2dp, but ranking and verification always use the 4dp value. Rounding happens once, at the end — never on intermediate values.

**Ranking**

Descending by rounded score. Ties break by earliest `lockedAt` (ISO string compare). If still tied, by `entryId` ascending, so ordering is total and stable.

**Season score** (DECISIONS 0008)

Sum of daily placements. Lower is better. A missing day scores as `fieldSize + 1` for that day.

## Ghost strategies

Deterministic algorithmic entrants. Prize-ineligible, badged non-human (DECISIONS 0004). Each selects picks from the slate using only data available at contest open.

| id | Label | Selection rule |
|---|---|---|
| `hodl-btc` | Buy & Hold BTC | Bitcoin only, single position |
| `the-index` | The Index | Every token on the slate, equal weight |
| `diamond-hands` | Diamond Hands | The `n` tokens with the **lowest** prior-24h change at open |
| `paper-hands` | Paper Hands | The `n` tokens with the **highest** prior-24h change at open |
| `last-champion` | Last Champion | Replays the previous contest's winning picks; absent on day one |

Ghost selection sorts with an explicit `id` tie-break so two tokens with identical prior change always order the same way.

## Verification

Each item independently pass/fail.

- [ ] `pct(100, 110)` → `10`
- [ ] `pct(100, 90)` → `-10`
- [ ] `pct(0, 10)` throws
- [ ] `pct(-5, 10)` throws
- [ ] `pct(100, 100)` → `0`
- [ ] `scoreEntry` with 5 picks returns the arithmetic mean, rounded to 4dp
- [ ] `scoreEntry` throws when pick count ≠ `picksRequired`
- [ ] `scoreEntry` throws on a duplicate pick
- [ ] `scoreEntry` throws when a pick is absent from the slate
- [ ] `scoreEntry` does not mutate its arguments
- [ ] `roundTo(2.5, 0)` → `3` and `roundTo(-2.5, 0)` → `-3` (half away from zero)
- [ ] Ranking is descending by score
- [ ] Equal scores break by earlier `lockedAt`
- [ ] Equal score and equal `lockedAt` break by `entryId`
- [ ] `diamond-hands` and `paper-hands` select disjoint sets on the reference fixture
- [ ] All three fixture contests reproduce their hand-computed expected scores and finishing order exactly
- [ ] Re-running any fixture 100× produces byte-identical output

## Fixtures

`verify/fixtures/contest-{01,02,03}.json` — hand-computed, committed before implementation. Each holds a slate, open and close prices, entries with picks, and the expected score plus finishing order for every entry including ghosts.

These were derived by hand, independently of the implementation. Do not regenerate them from code.
