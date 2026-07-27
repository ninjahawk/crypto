# Glossary

One meaning per term. These are the exact names used in code, specs, UI copy, and Official Rules. If a term isn't here, it doesn't get used in a spec until it is.

---

**Contest** — A single competition with a defined open time, close time, slate, and prize table. Types: `daily`, `weekly`, `monthly`. Not "game," not "round," not "tournament."

**Season** — A calendar month of daily contests, scored on the sum of a player's daily placements. The monthly headline prize belongs to the season.

**Slate** — The curated, fixed set of tokens tradeable in a given contest. Published as a snapshot with a hash before the contest opens. Never changes mid-contest.

**Bankroll** — The virtual starting capital every entrant receives. Same for everyone. Not "balance," not "portfolio value."

**Entry** — One player's participation in one contest. Holds their bankroll, holdings, and trade log.

**Trade** — A single buy or sell, appended to the trade log with a token, side, quantity, and the price snapshot timestamp it executed against. Immutable once written.

**Trade log** — The append-only ordered sequence of trades for an entry. The source of truth for scoring. Never mutated, never reordered.

**Price snapshot** — A timestamped set of token prices fetched by our scheduled job, published to the CDN, and archived permanently. Verification replays against archived snapshots, never a live API.

**Provisional score** — A client-computed score shown on the live leaderboard before verification. Always visually marked as provisional.

**Verified score** — A score recomputed from the trade log against archived snapshots by the verification job. Prizes pay only from verified scores.

**Cut line** — The score threshold separating paying positions from non-paying ones. Displayed to the user as distance-to-the-money in dollars. The core retention surface.

**In the money** — A position at or above the cut line.

**Ghost** — A clearly-labelled algorithmic entrant (Buy & Hold BTC, The Index, Last Month's Champion, Diamond Hands, Paper Hands). Visible on leaderboards, badged as non-human, permanently prize-ineligible.

**Reset** — Returning an entry's bankroll to its starting value, discarding current holdings. Limit 3 per day per player. Free via rewarded video; payment only skips the ad. Never grants extra opportunity.

**Streak** — Consecutive days a player has entered a daily contest. One free miss per month (a *streak freeze*) before it breaks.

**Founding Trader** — Permanent badge for the first 500 registered players. Cosmetic only, no competitive advantage.

**Prize pool** — Total cash paid out for a contest. Equals a fixed floor plus 40% of the previous period's net revenue. Always funded before announcement.

**Prize table** — The published mapping of finishing position to payout for a contest. Fixed and visible before the contest opens.

**Official Rules** — The in-app legal document required by Apple Guideline 5.3.2. Covers eligibility, prize table, no-purchase-necessary, verification and disqualification rights, ghost ineligibility, and the statement that Apple is not a sponsor.

**Phase 0** — The pre-launch period of manually-run Twitter contests, used to seed real players and establish a public payout record.

---

## Terms we deliberately do not use

| Never say | Say instead | Why |
|---|---|---|
| bet, wager, stake | entry, pick | We are not gambling and must not describe ourselves as such |
| odds | prize table, cut line | "Odds" invites a gambling reading |
| deposit | — | Nothing is ever deposited; there is no user money in the system |
| earn, payout *(for users)* | prize, win | "Earn" implies compensation for tasks — Apple 3.1.5(v) territory |
| investment, returns *(as advice)* | score, performance | We give no financial advice, ever |
| rank N of M | cut line, distance to the money | Field size is never displayed (DECISIONS 0004) |
