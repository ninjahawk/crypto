# CUTLINE

A free-to-enter daily crypto pick'em contest. Pick five tokens from a curated slate, scored on real price movement, ranked against algorithmic opponents. Free entry, real prizes, no wallet and no token.

**Status:** Web v1 built and passing. 51 verification tests, 4 architectural invariants, $0/month infrastructure. No backend — no accounts or human leagues yet, and the copy says so plainly.

---

## Run it

```bash
node tools/snapshot.mjs                  # fetch prices, roll today's slate
python3 -m http.server -d site 8080      # open http://localhost:8080
node --test "verify/*.test.mjs"          # 51 tests
node verify/lint-constraints.mjs         # architectural invariants
```

## Deploy

1. **Settings → Pages → Source: GitHub Actions.** `deploy.yml` publishes `site/` on every push.
2. **Settings → Actions → General → Workflow permissions: Read and write.** `snapshot.yml` commits published data hourly.
3. **Actions → Price snapshot → Run workflow** once to seed `site/data/`.

Custom domain later: add it under Pages, drop a `CNAME` file into `site/`.

**Cost:** $0/month. The only spend is prize money.

## How the backend works without a server

`tools/snapshot.mjs` runs hourly in GitHub Actions. One keyless CoinGecko call fetches the whole token universe, publishes `site/data/snapshot.json`, rolls a new daily slate at the UTC date boundary, and settles the previous contest into `site/data/archive/`. Clients read only those static files — they never call a price API themselves, which is what keeps data cost flat no matter how many people play.

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
| [`KICKOFF.md`](KICKOFF.md) | Step-by-step setup, Phase 0 plan, guardrails. |
| [`CLAUDE.md`](CLAUDE.md) | Agent context. Hard rules, conventions, commands. |
| [`spec/references/ANALYSIS.md`](spec/references/ANALYSIS.md) | What the 29 reference screenshots told us, and what we took from each. |
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
