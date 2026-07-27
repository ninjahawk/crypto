# Master Plan — Crypto Fantasy Trading Contest App

**Date:** 2026-07-27
**Status:** Planning. No code yet.

Companion docs:
- [`RESEARCH.md`](RESEARCH.md) — market/legal research that produced the concept
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the zero-cost stack and anti-cheat design
- [`ECONOMICS.md`](ECONOMICS.md) — unit economics, monetization, prize funding
- [`LOOP-ENGINEERING.md`](LOOP-ENGINEERING.md) — how we actually build it

---

## 1. What the product is

A free-to-enter crypto trading competition. Users get a virtual bankroll, trade real tokens at real live prices, and climb daily / weekly / monthly leaderboards. Top finishers win real money. The creator sponsors the prizes and is the face of it.

**Three non-negotiables that define every decision below:**

1. **Zero infrastructure spend.** No servers at launch. Not "cheap servers" — zero.
2. **Cannot lose money by default.** Prize pools are a function of revenue, never a fixed promise made ahead of income.
3. **It has to feel like it's been running for years.** The empty-room problem is the #1 killer.

---

## 2. Constraint carried forward from RESEARCH.md

Free entry is the legal foundation. A lottery requires **consideration + chance + prize**. No entry fee = no consideration = not gambling, in any state, no license, no geo-fence.

Everything in this plan is designed to *not break that*. See [`ECONOMICS.md §2`](ECONOMICS.md) — the paid-reset mechanic has a legal trap in it that changes the design, and it is the single most important thing in this document.

---

## 3. Contest structure

Layered cadence. The monthly prize is the headline; the shorter contests are what make people open the app.

| Contest | Resets | Prize | Purpose |
|---|---|---|---|
| **Daily** | 00:00 UTC | Small | Nobody is ever out of it. One payout screenshot per day = daily content. |
| **Weekly** | Monday | Mid | Reachable for mid-tier players. Weekend drama. |
| **Monthly Season** | 1st | **Headline** | The number in the tweet. Scored on consistency, not one lucky candle. |

**Scoring:** portfolio % return over the period. Monthly season scores on *sum of daily placements* rather than raw month-end P&L — this is deliberate and it's what stops the degen equilibrium (see §5).

**Pay deep, not winner-take-all.** Top 10–20% of the field gets something. Deep payouts are what make consistency beat recklessness, and they do it without heavy-handed rules.

---

## 4. The cold start problem — how we fill the room honestly

This is the part that needs the most care, because in this app **rank determines who receives real money.**

Fabricated human users on a prize leaderboard is where this goes wrong: they either occupy paying slots that belong to real players, or they misrepresent the size of the field a user is competing against. Apple 5.3.2 requires Official Rules in the app, which have to describe the contest truthfully. And the entire relationship this account has with its audience is "the guy who actually pays." That's the asset. It doesn't survive being caught.

The good news: **the empty-room feeling is solvable without inventing people**, and the honest solutions are better product. Four mechanisms, in order of impact:

### 4.1 Seed with real humans before the app exists — *do this first*

Run Contest #1 manually on Twitter. Post a slate, people reply with picks, track it in a spreadsheet, pay the winner publicly, post the receipt. Repeat weekly.

With 7,000 followers and ~20k views/day, two to four weeks of this produces **200–500 real, warm, pre-committed users on day one** — plus a public track record of paying out, which is the single most valuable marketing asset this thing can have. It costs nothing but time and small prize money that was going to be spent anyway.

A real 300-person leaderboard on launch day beats a fake 10,000-person one, permanently, and it removes the problem instead of deferring it.

### 4.2 Hide the field size, show the cut line

This is the highest-leverage UI decision in the app.

Do **not** lead with "Rank 47 of 312." Lead with:

> **You're $340 from the money.** — 4h 12m left — Prize pool $250

Tournament poker and golf leaderboards feel tense with tiny fields because they show *distance to the cut*, not headcount. The cut line generates the entire competitive emotion by itself, it's honest, and it works identically at 50 users or 50,000. It also happens to be the "near-miss" effect from the casino research (§5), used in its legitimate form — it's genuinely informative.

### 4.3 Benchmark ghosts — clearly non-human, actually fun

Populate the board with algorithmic entrants that are openly what they are and **ineligible for prizes**:

- **Buy & Hold BTC** — the benchmark. Beating it is a real flex.
- **The Index** — equal weight across the whole slate.
- **Last Month's Champion** — a real historical run, replayed against current prices.
- **Diamond Hands / Paper Hands** — simple mechanical strategies (never sell / sell at +10%).

These fill the board, give every user someone to beat from minute one, and nobody is misled. "I beat Buy & Hold BTC this week" is a better screenshot than "I'm 47th." Marked with a distinct badge and excluded from payouts in the Official Rules.

### 4.4 Make small numbers the pitch

"**Founding Trader #143**" — permanent badge, first 500 only. Early scarcity reframed as status. This is what actually works for cold-start consumer apps, and it converts the weakness into a reason to install *right now*.

---

## 5. Retention design — what transfers from casino/mobile-game research

The ask was to learn from how casinos hook players. The honest answer: about half of it transfers cleanly and is just good game design, and the other half is what gets apps pulled from the App Store and creators sued. Below is the split, and the line matters commercially — the exploitative half also has the worst LTV, because it burns the audience.

### 5.1 Mechanics that transfer — use these

| Mechanic | How it works | Applied here |
|---|---|---|
| **Near-miss** | Finishing just outside a reward drives return rate harder than a clean loss | The cut line, permanently on screen. "You finished #12. Top 10 paid." |
| **Loss aversion via streaks** | People protect a streak harder than they chase a gain | Daily entry streak. **With a streak freeze** — one free miss per month. The safety net is the difference between motivating and predatory. |
| **Variable ratio reinforcement** | Unpredictable reward timing sustains engagement | Already inherent to markets. **Do not add slot machines on top.** Markets supply this for free; bolting on loot boxes is what triggers regulator attention. |
| **Social comparison** | Rank vs. peers beats rank vs. field | Rivals (pick 3 people to track), friend leagues, "you passed @user" push. |
| **Session boundaries** | Natural stopping points increase session count | Daily contest reset at 00:00 UTC. Clean beginning and end every day. |
| **Progression / sunk cost** | Accumulated status raises switching cost | Season standings, tiers, badges, all-time record. |
| **Endowed progress** | People finish what looks already started | New user opens with streak day 1 already lit and slate pre-loaded. |

### 5.2 Lines we don't cross — and why they're also bad business

- **Never make the paid path better odds.** This is illegal, not just unkind (see `ECONOMICS.md §2`). It's also the thing that collapses the free-entry legal foundation the whole app stands on.
- **Never hide field size or odds while implying scale.** §4.2 avoids showing headcount, which is fine; *claiming* a false headcount is not.
- **No escalating whale-targeted spend prompts.** Hard daily spend cap for everyone, no exceptions, no targeting.
- **No losses disguised as wins.** If someone placed 400th, the app says so.
- **No dark-pattern cancellation.** One tap to cancel anything.

This audience is broke and highly suspicious of being farmed. They will detect and publicly destroy anything that feels like it's extracting from them — on the same timeline the app is trying to grow on. Restraint here is a growth strategy, not a tax on one.

### 5.3 The degen equilibrium — the real product risk

In any virtual-portfolio contest with a top-heavy prize, the optimal strategy is maximum variance: dump everything into the most volatile microcap and pray. Everyone works this out fast. The leaderboard stops measuring skill, good traders stop playing, and it becomes a lottery with extra steps.

Four fixes, all shipping in v1:

1. **Pay deep** (top 10–20%) — consistency beats recklessness mathematically.
2. **Monthly = sum of daily placements**, not raw month-end return. One lucky day can't win a season.
3. **Position size cap** — max 40% of bankroll in any single token.
4. **Curated slate** — a fixed, vetted list of tokens per contest, not the entire long tail. Slate curation *is* the product; it's what keeps this skill-predominant and what makes the daily contest feel designed rather than random.

---

## 6. Product surface — v1 scope

Deliberately small. Everything here has to survive review and work at 50 users and 50,000.

**Screens:**
1. **Contest** — bankroll, holdings, P&L, countdown, cut line. The home screen.
2. **Slate** — today's tradeable tokens, live prices, buy/sell.
3. **Leaderboard** — top N + your position + your rivals + ghosts.
4. **Season** — monthly standings, streak, badges, all-time record.
5. **Rules** — Official Rules, prize table, eligibility, "Apple is not a sponsor," past winners + payout receipts.

Screen 5 is not boilerplate. **Past winners with public payout receipts is the single highest-converting screen in the app** for this audience — it's the proof that answers "is this real."

**Explicitly out of v1:** real wallets, real trading, crypto custody, tokens, chat, social feed, Android.

---

## 7. Sequencing

| Phase | What | Gate to next phase |
|---|---|---|
| **0. Manual** | Twitter-run contests, spreadsheet, public payouts | 200+ repeat participants |
| **1. Launch** | v1 app, free entry only, nationwide, Game Center leaderboards, ads live | Positive contribution margin (`ECONOMICS.md §4`) |
| **2. Retention** | Rivals, friend leagues, streaks, season depth, share cards | 1,000+ DAU, 30-day retention baseline established |
| **3. Revenue scale** | Sponsored contests, subscription tier, real backend | Sponsor revenue > prize spend |
| **4. Paid entry** | Lawyer-gated. Geo-fence, KYC, state exclusions | Only with counsel. Not before. |

Phase 0 is not optional and it is not a warm-up. It de-risks the cold start, produces the payout receipts, validates the scoring rules against real behavior, and costs nothing.

---

## 8. Open decisions

1. Monthly prize floor, and months of runway before sponsors?
2. Slate composition — Solana memecoins only, or majors + memecoins for lower variance?
3. Branded to the personal account, or standalone brand the account promotes? (Affects sponsor sales and personal liability surface.)
4. Which reference apps are we cloning 1:1 for the loop targets? (Needed before `LOOP-ENGINEERING.md` Phase 1 can start.)

---

## Sources

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 3.1.5, 5.3
- [The psychology of hot streak game design](https://uxmag.medium.com/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame-3dde153f239c)
- [Gamification & retention: navigating the risk of over-playing](https://abstractmediaverse.com/gamification-retention-risk/)
- [Casino game design psychology and player engagement](https://www.casinorotator.com/casino-game-design-psychology-and-player-engagement/)
- [Gamification in mobile apps: streaks, rewards & retention](https://www.digia.tech/post/gamification-mobile-apps-streaks-rewards-retention/)
- [Overcoming the cold start problem](https://oyelabs.com/overcoming-the-cold-start-issue-in-dating-marketplaces/)
