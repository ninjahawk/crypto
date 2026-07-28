# Reference Analysis

21 screenshots captured 2026-07-27: PrizePicks, Underdog, Robinhood, Duolingo, Phantom.
Scored against the seven criteria in `DESIGN.md` §7. This drives the golden targets and SPEC files.

---

## 1. Scoring summary

| App | Time to action | Single CTA | Movement/deltas | Scoped compare | Card + tap-deep | Empty state teaches | Anti-patterns |
|---|---|---|---|---|---|---|---|
| **PrizePicks** | Fast — browsable logged out | ✅ | ❌ none | ❌ | ✅ | — | ⚠️ several |
| **Underdog** | Fast — browsable logged out | ✅ | ❌ none | ❌ | ✅ | ❌ dead space | ⚠️ several |
| **Robinhood** | Slow — hard signup wall | ✅ | ✅ excellent | ❌ | ✅ | — | none seen |
| **Duolingo** | n/a | ✅ | ✅ **best in set** | ✅ **best in set** | ✅ | ✅ | none seen |
| **Phantom** | Fast — 3-step, skippable | ✅ | ✅ | ❌ | ✅ | ✅ **best in set** | none seen |

**Verdict:** Duolingo wins the competitive surface. Phantom wins the visual system and the empty state. PrizePicks/Underdog win the pick card. Robinhood wins the P&L header.

---

## 2. The biggest finding: leagues, not one big leaderboard

Duolingo's league screens (`duolingo-silver-league`) are the most valuable references in the set, and they solve a problem I'd previously only patched.

**What they do:** users are placed in a capped cohort (~30 people) called a league. Title, a **countdown ("⏱ 6 DAYS")**, a trophy tier carousel showing earned / current / locked, then the ranked rows. Top ranks get medal chips; **the user's own row is a highlighted band with green text**, sitting mid-list. Weekly close produces "Congratulations! You finished #11 last week" and, on promotion, a full celebration screen: "You moved up to the Silver League!"

**Why this matters for us — it fixes cold start honestly.** A capped cohort means that with only 200 real users you have seven *completely full* leagues of 30. Every league is genuinely populated by real people, every user is always within a few places of a cut line, and there is no global field size to display or misrepresent. No invented users required — the structure removes the need for them.

It also delivers the leaderboard research directly: comparison is scoped by construction, and promotion/demotion is movement rather than status.

This supersedes the neighbourhood-within-a-global-list model. See `DECISIONS.md` 0013.

**Additional details worth copying:**
- Rank numbers coloured green inside the promotion zone — the cut line rendered as colour, not a separate element
- Green dot on avatars = recently active. Cheap, honest liveness signal
- Result screen frames a mid-table finish as congratulations, not failure

---

## 3. Pick card anatomy — PrizePicks vs Underdog

Both are browsable fully logged out, with a persistent Sign Up in the top right. PrizePicks even offers **"View board"** on the very first screen. That settles it: deferred signup is standard practice in this category, not a risk.

**PrizePicks card** — 2-column grid, info-dense:
```
[photo, team-colour gradient]        🔥 40.3k   ← popularity count
[TEAM · POS pill overlapping photo]
Player Name                                       ← bold
@ OPP  9:38pm            (or "Starts in 28:55")   ← yellow when close to lock
[icon] 1.5  TB                                    ← the line: big number + label
─────────────────────────────
   ↓ Less    |    ↑ More                          ← split action row
```

**Underdog card** — bolder, fewer elements:
- Full-bleed team-colour header, **LAST NAME in huge condensed caps**, ghosted team wordmark behind
- The number is enormous (`5.5`), label beneath (`Strikeouts`)
- **Higher / Lower** buttons, with multipliers shown (`0.94x` / `1.03x`)

Research said Underdog "gets you quicker to a wider selection." The screenshots show why: bigger tap targets, one hero number, less reading. **Take Underdog's boldness and PrizePicks' density discipline.**

**Two details to steal outright:**
- **🔥 popularity count** ("40.3k") — real social proof that makes the board feel alive using a genuine number, without ever displaying our field size. Perfect fit for our constraints.
- **Yellow "Starts in 28:55"** — urgency treatment as lock approaches. Directly transferable to contest close.

### Detail sheets

Both use the same pattern and it's excellent. PrizePicks: alt-lines as a three-chip row (green/neutral/red), a **bar chart of the last 5 games with the line as a dashed threshold**, "18 avg last 5", then collapsed accordion rows for other stat types. Underdog adds a **5-bar green "form" glyph** per stat and labels values directly on the bars.

For us: last-N-day token performance vs the slate median, same dashed-threshold chart. The form glyph becomes a momentum indicator.

---

## 4. Robinhood — the P&L header

Hard signup wall (4-page carousel, Log in / Sign up, no browse). We can't copy that — Robinhood has brand permission we don't. But the portfolio header is the reference for our value display:

- **Huge unlabelled balance** (`$5.31`)
- Two delta rows beneath: `▲ $0.00 (0.00%) Today` / `▲ $5.30 (52,986.91%) Overnight` — both absolute and percentage, green
- Full-bleed line chart, **no axes at all**
- Range chips: `1D 1W 1M 3M YTD 1Y ALL`
- Holdings rows: ticker + share count + **inline sparkline** + price in a colour-filled chip
- Unlabelled 4-icon tab bar

The **row-with-sparkline-plus-coloured-price-chip** is the most efficient token row pattern in the whole set.

---

## 5. Phantom — the visual system

Confirmed as our aesthetic register. It's the register our audience already lives in, and it's clean enough to build on.

**Design language:**
- Pure black background (`#000000`)
- Lavender accent, roughly `#AB9FF2` — pill CTAs with **black** text on lavender
- **Top nav is a row of pill chips** (avatar · Home · Trade · Predict · Explore), selected chip = filled lavender
- Large rounded cards, subtle dark fill (`~#141414`), generous spacing
- Token row: circular avatar with chain badge · name + verified tick · `$6.4M MC` beneath · price right-aligned · **% change green/red under the price**
- Rank 1/2/3 as small medal chips, then plain numerals
- Filter chips with chevrons: `Rank ⌄` `Solana ⌄` `24h ⌄`
- Floating search pill + lavender `+` FAB, bottom
- Onboarding: **"What brings you to Phantom? / Select one or more interests"** — five large tappable cards, progress dots, **Skip** available. Exactly the 2–3 preference question pattern, done right.

**Phantom's empty state is the best in the set and directly solves our launch problem.** With zero balance it shows an illustration, "Welcome to Phantom / Add cash or crypto to start trading", one CTA — **and then keeps going with live Trending and Majors lists.** The app feels fully alive with no user data at all, because live market content fills the space.

That's our answer for day one: a new user with no picks still sees today's slate, live prices, movers, and the ghosts. Nothing empty, nothing fabricated.

**Also noted:** Phantom has "Predict" as a top-level tab, and its **"Up or Down"** card is remarkably close to what we need — asset, live price, target price, dashed threshold line, **countdown `3m18s`**, live chart, and split `▲ Up · 30%` / `▼ Down · 70%` buttons with real crowd percentages. Effectively a crypto pick card that already exists. Strong reference for slice 8.

---

## 6. Anti-patterns spotted — do not clone

Confirmed live in these apps, matching the research in `DESIGN.md` §6:

| Seen in | Pattern | Our rule |
|---|---|---|
| PrizePicks | `Play $5, get $150 in Bonus Lineups if you win` — bonus funds tracked separately from real | No prize with strings. Prizes pay in full, no conditions. |
| Underdog | `29:48 · Your welcome offer is waiting!` — countdown pressure on a signup promo | Countdowns only on real contest deadlines. Never on offers. |
| Underdog | `Pick at least 2 players from different teams` — mandatory multi-leg | Minimum entry is genuinely minimal. |
| PrizePicks | Payout not shown until submit | Prize table visible **before** entry, always. |
| Both | Green/red demon icons framing risk levels | Show real numbers. No cartoon risk laundering. |
| Underdog | Entry slip is a large dead void with one row in it | Empty states must teach or show live content (Phantom's approach). |

---

## 7. Mapping to build slices

| Slice | Primary reference | Secondary |
|---|---|---|
| 6 Contest screen | Robinhood portfolio header | Phantom card/spacing |
| 7 Cut line | Duolingo promotion zone (green rank numbers) | — |
| 8 Slate + pick UI | Underdog card boldness | PrizePicks density, Phantom "Up or Down" |
| — Token detail | PrizePicks/Underdog bar chart w/ dashed threshold | Phantom token row |
| 9 Leaderboard | **Duolingo Silver League** | — |
| 10 Season/streaks | **Duolingo streak screen** | — |
| Onboarding | Phantom interest picker + PrizePicks "View board" | — |
| Empty states | **Phantom home** | — |
| Share card | Duolingo streak share icon placement | — |

---

## 8. Still missing

Not blocking, but would sharpen things:

- **3–5 real CT PnL/bags flex posts** — what our share card competes against. Highest value of the remaining gaps.
- **Error states** — none captured from any app.
- **Loading/skeleton states** — none captured.
- **A settled/result entry** with a loss, not just a win.

---

## 9. Design tokens (provisional, from Phantom)

```
bg              #000000
surface         #141414   cards
surface-raised  #1F1F1F   chips, inputs
accent          #AB9FF2   lavender — CTAs, selected chips
on-accent       #000000   text on lavender
text-primary    #FFFFFF
text-secondary  #8A8A8E
positive        #32D74B
negative        #FF453A
warning         #FFD60A   lock-approaching countdown (PrizePicks yellow)

radius-card     16
radius-pill     999
```

Lavender is Phantom's brand. Shift hue before launch so we're referencing the register, not impersonating the wallet.
