# Crypto Fantasy Trading Contest

A free-to-enter crypto trading competition. Virtual bankroll, real live prices, real cash prizes, daily / weekly / monthly leaderboards. Built for an existing crypto-Twitter audience.

**Status:** Planning complete. No code yet. Blocked on reference screenshots + three decisions (see [`KICKOFF.md`](KICKOFF.md)).

---

## Read in this order

| Doc | What's in it |
|---|---|
| [`RESEARCH.md`](RESEARCH.md) | Market + legal research. Why this concept and not the eight others. The hard constraints. |
| [`PLAN.md`](PLAN.md) | Product design. Contest structure, cold start, retention mechanics, scope. |
| [`DESIGN.md`](DESIGN.md) | Layout and interaction, derived from published benchmarks. Onboarding, leaderboards, streaks, sharing, anti-patterns. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | The $0/month stack. Anti-cheat design. Scaling path. |
| [`ECONOMICS.md`](ECONOMICS.md) | Revenue, prize funding, the legal correction to paid resets. |
| [`LOOP-ENGINEERING.md`](LOOP-ENGINEERING.md) | How we build. Spec-driven loops, verification layers, slice order. |
| [`KICKOFF.md`](KICKOFF.md) | **Start here to actually begin.** Step by step. |
| [`spec/references/CAPTURE-LIST.md`](spec/references/CAPTURE-LIST.md) | Exactly which apps and screens to screenshot. **Current blocker.** |
| [`spec/DECISIONS.md`](spec/DECISIONS.md) | Append-only decision log. The memory across build loops. |
| [`spec/GLOSSARY.md`](spec/GLOSSARY.md) | One meaning per term. Read before writing any spec. |

---

## The concept in six lines

- Free entry. No deposits, no wallets, no custody, no token.
- Virtual portfolio, real token prices, curated daily slate.
- Daily / weekly / monthly leaderboards. Real cash prizes, paid deep.
- Free entry removes *consideration* → not gambling → no license, no geo-fence, 50 states.
- Prize pool is a **percentage of revenue**, so payouts can never exceed income.
- Infrastructure cost: **$0/month.**

## The three things that make it work

1. **Game Center recurring leaderboards** (mobile) — free, Apple-hosted, resets on our exact cadence, infinite scale.
2. **Trade log as source of truth** — the score is only a claim; only winners get audited. Cheat-resistant at `O(winners)` cost.
3. **Prize pool = % of revenue** — structurally cannot lose money.

## Current platform decision

**Web first, mobile second.** See [`spec/DECISIONS.md`](spec/DECISIONS.md) → 0001 for the full reasoning.

---

## Repo layout

```
/spec
  DECISIONS.md      append-only decision log
  GLOSSARY.md       canonical terms
  /features         one spec file per build slice
  /references       reference app screenshots + annotations
/verify
  /fixtures         frozen prices + trade logs + hand-computed expected scores
  /golden           reference screenshots for visual regression
/app                application code
/.github/workflows  CI + production cron
```

`spec/` is the source of truth. If code and spec disagree, the spec wins.
