# Loop Register

```yaml
last_updated: 2026-07-28
purpose: the stopping conditions for every build loop
runner: node --test "verify/*.test.mjs" && node verify/ui.mjs
```

## Why this file exists

The first build of this site was a **single pass**, not a loop. I wrote one spec, built everything else in one shot, self-assessed it as done, and shipped it. Half the agreed decisions never got implemented — leagues, deltas, rivals, token detail, email capture, and the virtual bankroll, which is the entire premise of the product.

That is textbook **silent failure**: confident output, zero progress against the actual goal. A properly engineered loop cannot fail that way, because the loop does not terminate on the agent's opinion. It terminates on a machine-checkable condition.

## The rules

1. **Verifiable goal per loop.** Every loop below has acceptance criteria that a script can evaluate. "Looks good" is not a stopping condition.
2. **Decisions are executable.** Every accepted entry in `DECISIONS.md` that implies user-visible behaviour has a matching assertion in `verify/acceptance.test.mjs`. If it is not built, the suite is red. A decision cannot be quietly skipped.
3. **No-progress detection.** Three consecutive failed attempts on one loop means the spec is ambiguous, not the code stubborn. Stop and re-spec.
4. **Loops end green.** Build clean, all suites pass, committed. Never start a loop on a broken tree.
5. **Bounded.** Each loop is one vertical slice. If it cannot be verified in isolation, it is too big — split it.
6. **The register is the memory.** Status here is the truth across loops, so nothing agreed can fall out of context and get forgotten.

## Status

| # | Loop | Verifiable goal | Status |
|---|---|---|---|
| 1 | Scoring engine | 3 hand-computed fixtures reproduce exactly, 100× deterministic | ✅ done |
| 2 | Price pipeline | Snapshot publishes, slate rolls at UTC boundary, prior contest settles | ✅ done |
| 3 | Streak | Freeze spend, month rollover, double-miss break all covered | ✅ done |
| 4 | **Bankroll & trading** | **$10k virtual capital, buy/sell at live prices, positions, cash, P&L in dollars; equity reconciles to cash + holdings on every op** | 🔴 **not built — this is the premise** |
| 5 | Trade UI | Can open a position, close it, and see equity change, driven in a real browser | 🔴 not built |
| 6 | Email capture | Address captured at contest lock, persisted, posts to a configured endpoint | 🔴 not built |
| 7 | Token detail | Tap a token → sheet with last-7d bars against a threshold line | 🔴 not built |
| 8 | Leaderboard deltas | Every row shows movement since last settle | 🔴 not built (DECISIONS 0011) |
| 9 | Leagues | Capped cohorts of ~30, promotion/demotion, per-league cut line | 🔴 not built (DECISIONS 0013) |
| 10 | Rivals | Pick up to 3 opponents, scoped board | 🔴 not built (DECISIONS 0011) |
| 11 | Result moment | Contest close → result screen → share card, auto | 🟡 partial |
| 12 | Founding number | Assigned at first entry, shown, permanent | 🔴 not built |

## Loop 4 — Bankroll & trading (current)

**Why it is first:** it is the product. A pick'em with no money is a poll. The premise is that you are running a portfolio, and every retention mechanic downstream — position sizing, rebalancing, watching equity move, the flex of a big call — depends on it existing.

**Design.** Locking picks allocates the full bankroll equally across them, so pick'em stays a sub-60-second onboarding path and instantly becomes a real portfolio. From there the player can sell, rebalance, and redeploy cash for the rest of the contest. This is the progression path `DECISIONS.md` 0010 promised and never delivered.

**Invariant that must always hold:**

```
equity == cash + Σ(qty × price)
```

Checked after every single operation. If it ever drifts, the money is wrong and the loop is not done.

**Acceptance criteria**
- [ ] Opening a position moves exactly `cost` from cash to holdings
- [ ] Closing returns exactly `qty × price` to cash
- [ ] Cannot spend cash that is not there
- [ ] Cannot sell a quantity not held
- [ ] Position cap of 40% enforced on open (DECISIONS 0008)
- [ ] Equity reconciles after every operation, including partial sells
- [ ] Return % from the bankroll equals the pick'em score when nothing has been traded
- [ ] Trade log stays append-only (DECISIONS 0006)
- [ ] Float drift stays under 1e-6 across a 200-operation random walk
