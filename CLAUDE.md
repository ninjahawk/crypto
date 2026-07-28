# CUTLINE — Agent Context

```yaml
last_updated: 2026-07-28
scope: whole repo
stack: vanilla ES modules + CSS, no build step, GitHub Pages
gate: node verify/e2e.mjs   # exit 0 = shippable
```

## What this is

A free fake-money crypto trading game. You get **$10,000**, you trade the **top 100 trending memecoins** at real live prices, and whoever's account is up the most over an interval wins real money. No wallet, no deposit, nothing at risk.

The appeal is getting in on new launches without risking your own money — and getting paid if you call it right. **The volatility is the product.**

---

## Read this before changing anything

**This is the owner's project, not yours.** Build what is asked. Do not add
disclaimers, legal pages, warning banners, or "responsible use" copy that
nobody requested. It has been a recurring failure mode here and it kills the
thing that makes the product fun.

**One screen.** Everything important is on the first screen: bankroll →
holdings → market. This replaced a six-tab layout that was effectively five
apps with the good parts buried on page four. Do not add tabs. Secondary
detail goes in a sheet, not a page.

**No invented opponents.** An earlier build put algorithmic "BOT" entrants on
the leaderboard to solve cold start. It was corny and it is gone. If a
leaderboard has nobody on it, it shows nobody.

---

## Loop engineering — how work happens here

> A loop is a task with a check. A task without a check is just hope.

The failure mode that cost this project the most: I assessed my own work as
done, shipped it, and the owner found the bugs. The fix is that **the stopping
condition is mechanical, never an opinion.**

1. **`verify/e2e.mjs` is the gate.** It drives a real browser and asserts every
   user-facing claim. Exit code is the verdict.
2. **Write the check first.** Change the check to describe the new target, watch
   it fail, then build until it passes. That is the loop.
3. **Never weaken a check to go green.** Moving the benchmark is how a loop
   talks itself into success. If an assertion is wrong, fix the *assertion's
   subject* — e.g. asserting a real price moves within 14s measures the market,
   not the product; assert that real values reach app state instead.
4. **One bounded change per pass.** Then re-run the check.
5. **Three failed passes on one thing means the spec is ambiguous**, not the
   code stubborn. Stop and re-spec.
6. **Observe before acting.** Read fresh state, re-run the same diagnostics.
   Do not fix from memory.

### Traps this environment has already sprung

- **Chromium here has no outbound HTTPS. Node does.** Playwright route handlers
  run in Node, so relay API calls through the handler to test the live path with
  real data. Skipping the check instead is how live-price bugs shipped repeatedly.
- **The browser cache will serve stale JS** and make a shipped fix look like it
  never applied. The harness disables it; keep it that way.
- **Silent catches hide rate limits.** `catch(() => [])` around a 429 looks
  identical to "no results" — that collapsed the token board from 100 to 4 and
  went unnoticed for hours. Log failures; refuse to publish an empty board.

---

## Hard rules — enforced by `verify/lint-constraints.mjs`

- **Never call a third-party price API from anything except the feed module or
  the snapshot job.** Views read published data.
- **Never mutate or delete a trade record.** Append only — a book must replay.
- **Never fabricate a user, a holding, or a price.**
- **Never display a total field size.**

---

## Layout

```
site/
  index.html
  css/app.css
  js/
    app.js          boot, live feed wiring, one-screen render
    views/home.js   the entire UI: bankroll, holdings, market, trade ticket
    views/token.js  token detail sheet (7-day bars vs contest open)
    bankroll.js     the money. pure. equity == cash + Σ(qty × price)
    prices.js       live feed, two sources with failover
    scoring.js      deterministic percent-change maths
    state.js        localStorage: book per season, streak, email
    data.js         reads published JSON only
    email.js        capture, posts to configured endpoint
  data/             published by GitHub Actions — never hand-edit
tools/
  snapshot.mjs      the backend: publishes prices + board every 10 min
  fresh.mjs         top-100 trending builder, GeckoTerminal, curated
verify/
  e2e.mjs           THE GATE — real browser, real prices
  *.test.mjs        unit + acceptance
```

## Commands

```bash
node verify/e2e.mjs                  # the gate
node --test "verify/*.test.mjs"      # unit + acceptance
node verify/lint-constraints.mjs     # architectural invariants
node tools/snapshot.mjs              # rebuild the board
python3 -m http.server -d site 8099  # local preview
```

## Notable design decisions

- **Top 100 by trending score**, not a fixed slate — volume + transaction count
  + liquidity + momentum. Volume alone is trivially wash-traded.
- **No position cap.** All-in is allowed; it's what makes it feel real.
- **One account per season** (calendar month), everyone starts at $10,000.
  Daily/weekly/season returns all measured off the same continuous account via
  write-once interval marks.
- **Sub-cent price precision matters.** A memecoin at `$0.000228` rendered at 3
  significant figures makes a real move produce an identical string — the screen
  looks frozen while fully live. Rows also flash on price change.
