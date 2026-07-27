# Screenshot Capture List

Exactly what to capture, from where, and what to name it. This is the current blocker on loop 1.

**Save everything to `spec/references/`.**
**Naming:** `<app>-<screen>-<state>.png` — e.g. `prizepicks-board-populated.png`

---

## Before you start — two shortcuts

1. **You don't need accounts for most of this.** App Store and Google Play listing pages show 5–10 screenshots of the key screens publicly. YouTube walkthroughs and reviews are a good second source — pause and screenshot. Only capture live if you already have the app.
2. **Some of these are geo-restricted** (PrizePicks, Underdog, DraftKings are unavailable in several states). App Store listing screenshots get you what you need regardless.

Don't spend more than ~45 minutes on this. Tier 1 is what actually blocks work.

---

# TIER 1 — Blocking. Need these before loop 1.

## 1. PrizePicks — the pick surface *(most important single reference)*

This is the primary model for our core interaction per `DECISIONS.md` 0010.

| Screen | Filename | What to look for |
|---|---|---|
| Board / player grid | `prizepicks-board-populated.png` | The squares grid. How many per row, card contents, tap affordance |
| A selected entry / lineup being built | `prizepicks-lineup-building.png` | How selection state is shown, running summary |
| Entry confirmation | `prizepicks-entry-confirm.png` | What's shown before committing |
| Result / settled entry | `prizepicks-result.png` | Win *and* loss states if you can get both |
| First launch / onboarding | `prizepicks-onboarding-*.png` | Every step, in order |

## 2. Underdog Fantasy — the faster pick surface

| Screen | Filename | What to look for |
|---|---|---|
| Pick selection | `underdog-picks-populated.png` | Credited with getting users to a wider selection faster — how? |
| Lineup / entry | `underdog-lineup.png` | Compare density vs PrizePicks |

## 3. Robinhood — portfolio and P&L surface

| Screen | Filename | What to look for |
|---|---|---|
| Portfolio home | `robinhood-portfolio-home.png` | Number hierarchy, where the big number sits, chart treatment |
| Single asset detail | `robinhood-asset-detail.png` | The card-expand pattern |
| Holdings list | `robinhood-holdings-list.png` | Row density, gain/loss colour treatment |

## 4. Duolingo — leaderboard and streak *(best-in-class for both)*

| Screen | Filename | What to look for |
|---|---|---|
| League / leaderboard | `duolingo-league.png` | Scoped comparison, movement indicators, promotion/demotion zones |
| Streak screen | `duolingo-streak.png` | How the number is celebrated |
| Streak freeze / repair | `duolingo-streak-freeze.png` | How the safety net is offered |
| Daily goal complete | `duolingo-goal-complete.png` | The celebration moment |

## 5. A crypto-native token list — for aesthetic register

Pick **one** you can access: **Moonshot**, **Axiom**, **Photon**, or **Vector**.

| Screen | Filename | What to look for |
|---|---|---|
| Token list / discovery | `<app>-token-list.png` | How crypto apps present tokens — icons, tickers, % change |
| Single token view | `<app>-token-detail.png` | Chart and stat treatment |

Purpose: our audience lives in these apps. We need to look native to that world, not like a sports app with tickers pasted in. Note these are dense *terminals* — treat as a **counter-reference** for density, a reference for visual language.

---

# TIER 2 — Important. Get these if you have time.

## 6. Leaderboard alternatives

| App | Filename | Why |
|---|---|---|
| Strava | `strava-segment-leaderboard.png` | Best-in-class delta/movement display |
| Sleeper | `sleeper-league-standings.png` | Excellent social/league fantasy UX |

## 7. Share cards — the growth channel

| Source | Filename | Why |
|---|---|---|
| Duolingo streak share | `duolingo-share-streak.png` | Status virality done well |
| Strava activity share | `strava-share-activity.png` | Stat card composition |
| **Real CT PnL flex posts** | `ct-pnl-card-*.png` | **Screenshot 3–5 actual PnL/bags cards people post on your timeline.** This is what our share card competes against, and it's the most valuable reference in Tier 2. |

## 8. Onboarding — fast, minimal

| App | Filename | Why |
|---|---|---|
| Cash App | `cashapp-onboarding-*.png` | Extremely low-friction first run |
| Any one of the crypto apps above | `<app>-onboarding-*.png` | How crypto apps handle first-run |

---

# TIER 3 — Nice to have.

| What | Filename |
|---|---|
| Any DFS contest lobby / prize table | `*-prize-table.png` |
| Any official sweepstakes rules page | `*-official-rules.png` |
| Any season-long standings screen | `*-season-standings.png` |

---

# For every screen — capture four states

This is the part people skip, and it's where clones fall apart. Where you can get them:

- **Empty** — new user, nothing yet. *Does it teach, or is it a dead end?*
- **Loading** — skeletons or spinners?
- **Populated** — the normal case
- **Error** — no connection, failed action

Suffix accordingly: `prizepicks-board-empty.png`, `-loading`, `-populated`, `-error`.

**Empty states are the highest-value capture in this entire list** and the one nobody has. Our app launches with a near-empty leaderboard by definition, so how good apps handle emptiness is directly load-bearing for us.

---

# Annotate as you go

For each app, drop a sibling `.md` — e.g. `prizepicks.md` — with a few lines:

```markdown
# PrizePicks

IN SCOPE:  the squares grid layout, selection state, entry summary bar
OUT:       their colour palette, brand, mascot, any "more picks = bigger payout" framing

NOTES:     the running entry summary is pinned to the bottom and always visible
ANTI-PATTERN SPOTTED:  payout not shown until submit — we do the opposite
```

That last line matters. Several of these apps use patterns documented as deceptive (see `DESIGN.md` §6). **We clone layout, never the dark patterns** — flag them where you see them so they don't get copied by accident.

---

# What I'll do with these

1. Score each against the seven criteria in `DESIGN.md` §7
2. Turn the winners into golden targets in `verify/golden/`
3. Write `spec/features/SPEC-001` onward with each reference bound to its slice
4. Start loop 1

---

# Quick checklist

**Tier 1 — blocking:**
- [ ] PrizePicks — board, lineup, confirm, result, onboarding
- [ ] Underdog — picks, lineup
- [ ] Robinhood — portfolio home, asset detail, holdings
- [ ] Duolingo — league, streak, freeze, goal complete
- [ ] One crypto app — token list, token detail

**Tier 2:**
- [ ] Strava / Sleeper leaderboards
- [ ] Share cards, incl. 3–5 real CT PnL posts
- [ ] Cash App onboarding

**Every screen:** empty / loading / populated / error where obtainable
**Every app:** a sibling `.md` with in-scope, out-of-scope, and anti-patterns spotted
