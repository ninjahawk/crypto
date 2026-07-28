# CUTLINE — Agent Context

```yaml
last_updated: 2026-07-27
scope: whole repo
source_of_truth: spec/
stack: vanilla ES modules + CSS, no build step, GitHub Pages
```

Read `spec/DECISIONS.md` before changing anything. If code and spec disagree, **the spec wins and the code is wrong** — including when the code looks better.

---

## What this is

A free-to-enter daily crypto pick'em contest. Users pick 5 tokens from a curated slate, scored on real 24h price movement, ranked against algorithmic opponents and (later) other humans. Real cash prizes, free entry.

---

## Hard rules — enforced by CI lint

These are architectural invariants. Unit tests structurally cannot catch them.

- **Never display total field size.** No "of N", "N players", "N entrants". Show the cut line instead. (DECISIONS 0004)
- **Never call a third-party price API from the client.** Clients read `data/*.json` only. Only `.github/workflows/snapshot.yml` talks to CoinGecko. (DECISIONS 0007)
- **Never mutate or delete a trade/pick record.** Append only. (DECISIONS 0006)
- **Never use these words in user-facing copy:** bet, wager, stake, odds, deposit, earn, investment advice. (spec/GLOSSARY.md)
- **Never let a payment improve someone's standing.** Paid paths buy convenience only. (DECISIONS 0003)
- **Never invent a human user.** Ghosts are algorithms, badged as such, prize-ineligible. (DECISIONS 0004)

---

## Conventions

Terms come from `spec/GLOSSARY.md`. One meaning each: *contest, slate, bankroll, entry, pick, cut line, ghost, streak, season*.

```js
// Preferred — pure, testable, no I/O
export function scoreEntry(picks, openPrices, closePrices) { ... }

// Avoid — mixes fetch with logic, untestable
async function scoreEntry(picks) { const p = await fetch(...) }
```

```js
// Preferred — read published snapshot
const snap = await loadSnapshot();

// Avoid — client hitting an API directly (breaks DECISIONS 0007)
const r = await fetch('https://api.coingecko.com/...');
```

Money and percentages use `Intl.NumberFormat`. Scores round via `roundTo` in `scoring.js` — never raw float compare, because verification must reproduce a score exactly.

---

## Layout

```
site/            the deployed static site
  js/            ES modules, no bundler
  css/
  data/          published by GitHub Actions — never hand-edit
spec/            source of truth
verify/          fixtures + tests (node --test)
.github/workflows/
  snapshot.yml   hourly price snapshot → site/data
  deploy.yml     Pages deploy
  ci.yml         tests + constraint lints
```

## Commands

```bash
node --test verify/            # unit + golden scoring tests
node verify/lint-constraints.mjs   # architectural invariants
python3 -m http.server -d site 8080  # local preview
```

## Current state

Web v1. No backend yet — no accounts, no human leagues. The board runs the user against algorithmic ghosts, and the copy says so plainly. Human leagues arrive with Supabase (DECISIONS 0001) and must not be implied before they exist.
