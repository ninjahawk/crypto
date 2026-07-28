# Decision Log

Append-only. Never rewrite or delete an entry — supersede it with a new one and mark the old entry `Superseded by NNNN`.

This file is the memory across build loops. Its purpose is to stop loop 40 from relitigating something settled in loop 6.

Format: `NNNN — Title` / Date / Status / Decision / Why / Consequences.

---

## 0001 — Web first, mobile second

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Build and launch the web version first, hosted on GitHub Pages. iOS follows after web validates retention.

**Why:**
- Distribution: the audience is on a timeline that shares links. A link converts far better than an App Store install, and cold start is the primary risk.
- Speed: the open questions are product questions (does the format retain? is slate curation good? does the cut line work?). Web answers them in weeks; mobile costs months plus a Guideline 5.3 review that Apple warns runs long.
- Sunk cost is low: build slices 1–4 (scoring engine, price pipeline, trade log, verification harness) are platform-agnostic. Rules and fixtures transfer to Swift; the GitHub Actions backend is identical.
- Web is already in the architecture — GitHub Pages is the results CDN regardless.

**Consequences:**
- Lose Game Center → need own identity + leaderboard store on web. Supabase free tier (50k MAU, 500MB) covers it at $0.
- Lose rewarded video, which is the primary revenue stream. **Web is for validation and audience capture, not monetization.** Do not attempt to monetize web beyond a possible sponsor banner.
- Retention will be worse on web (no home-screen icon, weak push). Do not read web retention as a ceiling for mobile — treat it as a floor.
- Front end gets built twice. Accepted cost; the backend and rules are built once.
- Prize/contest legal requirements are identical on web. Official Rules, no-purchase-necessary, 1099s all still apply.

---

## 0002 — Free entry only at launch

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** No paid entry to any prize contest. Ever, until counsel says otherwise (Phase 4).

**Why:** A lottery requires consideration + chance + prize. Free entry removes consideration, which means not gambling in any state — no license, no geo-fence, all 50 states. This is the foundation the entire product stands on.

**Consequences:** Every monetization idea must be checked against it. Anything where money improves a user's standing in a prize contest is forbidden — see 0003.

---

## 0003 — Resets are free via rewarded ad; payment only skips the ad

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** 3 resets/day for every user. Obtained free by watching a rewarded video, or by paying ~$0.49 to skip the ad. Identical daily cap for everyone.

**Why:** US promotion law enforces the "equal dignity" rule — a purchase must not improve odds of winning. Paid resets that grant extra attempts at a cash-prize leaderboard reintroduce consideration and collapse 0002. Selling *ad-skips* rather than *opportunity* keeps odds identical while monetizing both free and paying users.

**Consequences:**
- The free path must ship in the same release as the paid path. Never paid-only, not even briefly.
- Requires explicit disclosure at point of purchase and in Official Rules: no purchase necessary; purchase does not improve chance of winning.
- Reset count must be enforced server-side; a client-controlled cap is trivially bypassed and here that's a legal exposure, not just an exploit.

---

## 0004 — No fabricated users on any prize leaderboard

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** No invented human users. Cold start is solved with: real pre-launch seeding, hiding field size while showing the cut line, clearly-labelled algorithmic ghosts, and founding-member scarcity framing.

**Why:** Rank determines who receives real money. Fabricated competitors either occupy paying slots belonging to real players or misrepresent the field a user is competing against. Official Rules must describe the contest truthfully. Separately, the creator's entire relationship with this audience is "the guy who actually pays" — that asset does not survive being caught.

**Consequences:**
- Algorithmic ghosts (Buy & Hold BTC, The Index, Last Month's Champion, Diamond/Paper Hands) are permitted, must be visually badged as non-human, and are prize-ineligible in the Official Rules.
- Phase 0 (manual Twitter contests) is not optional — it is how the launch-day leaderboard gets real people on it.
- UI must never display total field size. Enforced as a CI constraint lint.

---

## 0005 — Prize pool is a percentage of realised revenue

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Prize pool = small fixed floor + 40% of the *previous* period's net revenue. Never announce a prize that is not already funded and in the account.

**Why:** Makes "cannot lose money by default" structural rather than aspirational. Downside is bounded at the floor; no viral spike can bankrupt the pool because the pool is denominated in money that already arrived.

**Consequences:**
- Prize amounts are announced one period in arrears.
- Marketing line is "the pool grows with the community" — true, and gives users a real reason to recruit.
- Operator margin is non-zero from month one (15%). Deliberate: it makes this a business rather than a hobby.

---

## 0006 — Trade log is the source of truth; scores are provisional claims

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Clients store an append-only timestamped trade log. Live leaderboard scores are explicitly provisional. At contest close, the top ~30 are re-computed from their logs against archived price snapshots, and prizes pay only from the verified list.

**Why:** In a serverless design the device computes the score, and client-submitted scores are trivially spoofed. With real cash prizes that gets drained immediately. Verification cost is `O(winners)` not `O(users)`, so it costs the same at 500 users as at 500,000 — which is what makes zero-infrastructure viable for a real-money product.

**Consequences:**
- Trade records are append-only and never mutated. Enforced as a CI constraint lint.
- Price snapshots must be archived by us, hourly, and verification replays against our archive rather than a live API.
- Trade timestamps anchor to the price feed timestamp, never the device clock.
- Official Rules must reserve the right to verify and disqualify.
- Winners' trade logs are published after payout — the anti-cheat becomes a trust asset.

---

## 0007 — Clients never call a third-party price API directly

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** All clients read prices from our published static CDN snapshot. Only our scheduled job talks to DexScreener/CoinGecko.

**Why:** Makes price-data cost flat and independent of user count — one fetch serves every user. Without this, per-user API calls hit free-tier ceilings somewhere around 25k users and the bill starts.

**Consequences:** Looks like unnecessary indirection at 200 users. Build it this way from the first commit anyway. Enforced as a CI constraint lint.

---

## 0008 — Monthly season scores on sum of daily placements

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** The monthly leaderboard ranks on the sum of daily placements, not raw month-end portfolio return. Plus: pay deep (top 10–20%), 40% max position size in any one token, curated slate.

**Why:** In any virtual-portfolio contest with a top-heavy prize, the optimal strategy is maximum variance — all-in on the most volatile microcap. Everyone works this out fast, the leaderboard stops measuring skill, and good players leave. These four measures together make consistency beat recklessness.

**Consequences:** Slate curation becomes a core product responsibility, not a data-loading detail. It is what keeps the contest skill-predominant.

---

## 0009 — Provisional and verified scores are visually distinct

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Any score not yet verified renders in a visually distinct provisional state. Verified/final scores render differently and only after audit.

**Why:** Users will screenshot a leading position and post it. If a provisional score later fails verification, the app must have been unambiguous that it was not final. This is both a fairness matter and a dispute-prevention one.

---

## 0010 — Pick'em is the entry format; trading depth is progression

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** The core interaction at launch is tapping N tokens from a curated slate (PrizePicks-style), not a full buy/sell trading terminal. Position sizing and full trading unlock later as progression.

**Why:**
- Published onboarding benchmarks: activation rates *double* when onboarding drives one meaningful action before exposing the full interface, and the target for time-to-first-core-action is under 60 seconds. Tapping five tokens hits both; an order-entry flow does not.
- PrizePicks became the dominant US pick'em operator with this interface, and it is repeatedly credited to the clean squares grid. Underdog's competing advantage is described identically — speed to a completed pick.
- 77% of DAU quit within three days, so first-session conversion dominates every other design consideration.

**Consequences:**
- Equal-weight picks naturally satisfy the 40% position cap in 0008 without a rule the user must learn.
- Narrows the degen strategy space — fewer degrees of freedom for all-in variance plays.
- Scoring becomes trivially explainable, and clarity is itself a measurable retention lever.
- Reference apps must be chosen accordingly: PrizePicks/Underdog for the pick surface, Robinhood for the portfolio/P&L surface.

---

## 0011 — Leaderboards reward movement and scope comparison locally

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Leaderboards display deltas (movement) prominently, and scope comparison to the user's neighbourhood (±3), self-selected rivals, and ghosts — plus top 3 for aspiration. No global ranked list.

**Why:** Leaderboard research is direct on this: rewarding movement motivates everyone while status motivates only leaders, and scoping comparison "converts a discouraging metric into a motivating one for 100% of users instead of 1%." A global list actively de-motivates ~99% of the field.

**Consequences:**
- Independently reinforces 0004 (never display field size) on effectiveness grounds, not only honesty.
- Requires storing per-period rank history to compute deltas.
- "Passing the person above you" becomes the core daily engagement goal.

---

## 0012 — No signup wall; identity requested after first picks

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Users land directly on the current slate and can make picks with no account. Identity is requested only when locking in an entry.

**Why:** Every field or screen before activation increases abandonment; only 19.2% of users complete onboarding industry-wide. Requesting identity after the user has picks worth saving puts sunk cost on their side. Matters doubly for a link-shared web app — someone tapping a link in a tweet should be picking within seconds.

**Consequences:**
- Needs anonymous session state that survives account creation without losing picks.
- Abuse surface: anonymous entries must not be prize-eligible until identity exists.
- New users open with streak day 1 lit and slate pre-loaded (endowed progress).

---

## 0013 — Capped league cohorts, not one global leaderboard

**Date:** 2026-07-27 · **Status:** Accepted · **Supersedes the global-list portion of 0011**

**Decision:** Players are placed in capped cohorts ("leagues") of roughly 30. Each league has its own ranked board, its own cut line, and weekly promotion/demotion between tiers. There is no global ranked list.

**Why:** Duolingo's league screens solve our cold-start problem structurally rather than cosmetically. A capped cohort means 200 real users produce seven *completely full* leagues of 30 — every board genuinely populated by real people, every user always within a few places of a cut line, and no global field size that could be displayed or misrepresented. It removes the need for fabricated users entirely (0004) instead of merely working around it. It also delivers the leaderboard research directly: comparison is scoped by construction, and promotion/demotion is movement rather than status.

**Consequences:**
- Need a league assignment and promotion/demotion algorithm; new users seed into the lowest tier.
- Prize table is defined per league tier, so total payout scales with league count — reinforcing 0005.
- Deltas and neighbourhood highlighting from 0011 still apply *within* a league.
- Rank numbers render green inside the promotion zone — the cut line expressed as colour rather than a separate element.
- Weekly close produces two celebration moments: result ("You finished #11") and promotion ("You moved up to Silver").

---

## 0014 — Phantom is the visual register

**Date:** 2026-07-27 · **Status:** Accepted

**Decision:** Adopt Phantom's design language — pure black background, single lavender accent, pill-chip top navigation, large rounded cards, generous spacing, token rows with avatar + market cap + right-aligned price with coloured % beneath.

**Why:** It is the register this audience already lives in, so the product reads as native to crypto rather than as a sports app with tickers pasted in. It is also clean and restrained enough to build a system on, unlike the dense trading terminals.

**Consequences:**
- Provisional design tokens recorded in `spec/references/ANALYSIS.md` §9.
- **Shift the accent hue before launch.** Referencing the register is fine; shipping Phantom's exact brand lavender is impersonation.
- Phantom's empty-state approach is adopted with it: when a user has no data, fill the screen with live market content rather than a placeholder. This is how launch day avoids feeling empty.

---

## 0015 — Deferred signup confirmed by category precedent

**Date:** 2026-07-27 · **Status:** Accepted · **Reinforces 0012**

**Decision:** Keep the no-signup-wall approach from 0012.

**Why:** Both PrizePicks and Underdog are fully browsable logged out, with only a persistent Sign Up chip in the corner; PrizePicks offers an explicit "View board" escape on its very first screen. Deferred signup is standard practice in this category, not a risk. Robinhood's hard wall is the outlier and rests on brand permission we do not have.

**Consequences:** Onboarding follows Phantom's pattern — a short skippable interest picker with large tappable cards and progress dots — placed *after* first picks, not before.

---

## 0016 — Founding season runs against algorithms only, and says so

**Date:** 2026-07-28 · **Status:** Accepted

**Decision:** Web v1 ships with no accounts and no human opponents. The board carries the five algorithmic ghosts and the local player. Copy on the board states plainly that every opponent is a bot, that bots cannot win prizes, and that human leagues open when accounts launch.

**Why:** A static site has no shared state, so human leagues are not possible until Supabase is wired (0001). The alternative — implying humans are present — is exactly what 0004 forbids. Racing the algorithms is a real product on its own: beating Buy & Hold BTC is a genuine result and a better screenshot than a rank.

**Consequences:**
- No prize contests run until the pool is funded; the rules screen carries a visible founding-season banner saying so (0005).
- `token.picks` (the 🔥 crowd count) stays absent from published data until real pick counts exist. The UI renders it only when present, so nothing is fabricated.
- Local results accumulate as a founding record and migrate to an account later.

---

## 0017 — Prior-24h form is the hero number on a pick card

**Date:** 2026-07-28 · **Status:** Accepted

**Decision:** Pick cards lead with the token's prior-24h change, not its movement since contest open. Movement since open leads on the contest screen instead.

**Why:** Form is the decision-relevant number when choosing — it is what the reference pick'em apps put in the hero slot. Movement-since-open is also exactly 0.00% for every token at contest open, which is the precise moment a new arrival is deciding whether the product is alive.

**Consequences:** The two screens answer different questions — the slate answers "what should I pick", the contest answers "how am I doing" — and neither ever renders a dead board.

---

## 0018 — Live trading is the product; pick'em is only the on-ramp

**Date:** 2026-07-28 · **Status:** Accepted · **Supersedes the framing in 0010**

**Decision:** The product is a continuous fake-money trading account. Every player gets $10,000 at season start and trades the full token universe freely for the whole season. Competition is decided purely on account value: whoever is up the most over an interval wins that interval. Pick-5 remains as a sub-60-second on-ramp that seeds a first set of positions, and nothing more.

**Why:** 0010 read the reference apps too literally and treated pick'em as the game. It is not. The premise is "run a portfolio on real markets with fake money" — the picking is onboarding. Building pick'em as the product produced a daily poll with trading bolted inside it: gated behind five taps, restricted to eleven curated tokens, and wiped every 24 hours.

**Consequences:**
- One persistent book per season (calendar month), not one per contest.
- Everyone resets to $10,000 at season start, so each season is a fair race and early joiners cannot compound an advantage.
- Daily, weekly and season leaderboards all measure **percent return over that window** from the same continuous account. Equity is marked at each interval open.
- Trading is available immediately. Picking five is optional.
- The tradeable universe is everything in the published snapshot, not the daily slate. The slate now only drives the pick-5 hook.
- Ghost strategies stay comparable because they are also scored on percent return over the interval.

---

## 0019 — No position cap

**Date:** 2026-07-28 · **Status:** Accepted · **Supersedes the 40% cap in 0008**

**Decision:** A player may hold any share of their account in any token, up to 100%.

**Why:** A hard cap is the single thing that most makes this stop feeling like a real trading account, and going all-in on a conviction call is the point of the genre. The anti-degen argument in 0008 is still valid but the cap was the wrong instrument for it.

**Consequences:**
- Variance control moves entirely to season scoring: the season ranks on consistency across daily placements, so one lucky all-in cannot win a month.
- Daily prizes stay small relative to the season prize for the same reason.
- `MAX_POSITION_PCT` is retired. `maxSpendOn` now returns available cash.
