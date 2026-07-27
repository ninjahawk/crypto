# Architecture — Zero-Infrastructure Build

**Constraint:** $0/month infrastructure at launch. Not cheap. Zero. And it has to keep working when 50,000 people show up.

---

## 1. The stack

Everything below is free at our scale, and the free tiers are structural (Apple absorbs the cost / static files on a CDN), not promotional trials that expire.

| Layer | Choice | Cost | Why |
|---|---|---|---|
| **Leaderboards** | **Game Center (GameKit)** | $0, Apple-hosted | **Recurring leaderboards that reset on an interval you define** — exactly our daily/weekly/monthly cadence, built in. Scales infinitely, Apple's problem not ours. |
| **Identity / auth** | **Game Center player ID** | $0 | Skips the entire login/signup build. Real identity, no password reset flow, no PII to store, no breach surface. |
| **User state** | **CloudKit private DB** | $0 | Private-DB storage bills against **the user's** iCloud quota, not the developer's. Portfolio, trade log, settings. Genuinely free at any user count. |
| **Shared config** | **CloudKit public DB** | $0 | 10GB public storage on the free tier. Slate definitions, contest metadata, results. |
| **Compute / cron** | **GitHub Actions** | $0 | Scheduled jobs: snapshot slates, pull prices, verify winners, publish results. Free minutes cover this by orders of magnitude. |
| **Result CDN** | **GitHub Pages** | $0 | Static JSON. Infinitely cacheable, effectively free at any traffic level. |
| **Price data** | **DexScreener** (primary) + **CoinGecko Demo** (fallback) | $0 | DexScreener: free, **keyless**, 300 req/min, auto-indexes new pairs — built for exactly this. CoinGecko Demo: 10k calls/month, 100/min, for majors and historical. |
| **Ads** | AdMob rewarded video | Revenue | See `ECONOMICS.md`. |

**Total: $0/month.** The only recurring cost in the entire business at launch is the $99/yr Apple Developer Program membership and the prize money itself.

### 1.1 Note on Apple Developer enrollment

Guideline 3.1.5(i) requires **organization** enrollment (not individual) for apps that facilitate virtual currency storage. We don't store crypto, so this shouldn't apply — but organization enrollment is the safer posture for anything crypto-adjacent handling real prize money, and it separates personal liability. Worth doing before submission; it requires a legal entity and a D-U-N-S number, which takes time. **Start this early — it's the longest lead-time item in the whole project.**

---

## 2. The critical flaw in any zero-server design — and the fix

**The problem:** with no backend, the device computes the score. Game Center leaderboards are trivially spoofed — this is a well-known, widely-exploited weakness in shipped games. Normally it costs you a meaningless high score. Here it costs you **real cash paid to a cheater**, plus every honest user watching it happen on a public leaderboard.

A naive zero-server build of this app gets drained in week one. This is the single biggest technical risk in the project.

**The fix: the trade log is the source of truth. The score is only a claim.**

1. The client stores an append-only, timestamped **trade log** — every buy/sell with the price and timestamp it executed at. Not the score. The log.
2. The client computes a score locally for instant UI feedback and submits it to Game Center for the live leaderboard.
3. That leaderboard is explicitly **provisional** — the Official Rules say so in plain language.
4. At contest close, a **GitHub Action** pulls the trade logs of the **top ~30 only**, re-computes each score from scratch against archived historical price data, and compares.
5. Any score that doesn't reconstruct exactly → disqualified, removed, next player promoted.
6. **Prizes are paid only from the verified list.**

**Why this works economically:** verification cost is `O(winners)`, not `O(users)`. Auditing 30 trade logs once a day is a few seconds of compute. It costs the same at 500 users as at 500,000. That's what makes zero-infrastructure viable for a real-money product.

### 2.1 Supporting integrity measures

- **Price snapshots are archived by us**, hourly, into the GitHub Pages repo. Verification replays against *our* archived prices, not a live API — so a cheater can't exploit API drift, and the archive is a public audit trail.
- **Trade timestamps anchor to the price feed's timestamp**, not device clock. Device clocks are user-controlled.
- **Trades are only valid against the current published slate snapshot**, which has a known hash. Trading a token that wasn't on the slate = invalid log.
- **Official Rules reserve the right to verify and disqualify.** Standard, necessary contest language.
- **Publish the verification.** Winners' trade logs go public after payout. Full transparency turns the anti-cheat system into a trust asset — it's the receipt that proves the game is real.

---

## 3. Scaling path

The architecture is designed so that scale pressure hits in a known order, and each fix is bought with revenue that already exists by the time it's needed.

| Users | What breaks first | Fix | Cost |
|---|---|---|---|
| 0 – 5k | Nothing | — | $0 |
| 5k – 25k | CoinGecko Demo call ceiling | Widen DexScreener use; cache price snapshots to Pages and have clients read the CDN, not the API | $0 |
| 25k – 100k | Clients hammering price APIs directly | **All clients read prices from our static CDN snapshot only.** One fetch per period serves everyone. | $0 |
| 100k+ | CloudKit public DB limits; need real-time | Migrate to a real backend (Supabase/Firebase), keep Game Center | Paid — but revenue at 100k DAU covers it many times over |

**Design rule that makes this work: clients never call a third-party price API directly.** They read our published snapshot from the CDN. That single decision means our price-data cost is flat and independent of user count — one GitHub Action fetch serves every user on the planet. Build it that way from commit one, even though at 200 users it looks like unnecessary indirection. It is the thing that lets this scale without a funding round.

---

## 4. Data model sketch

```
Contest          id, type(daily|weekly|monthly), opensAt, closesAt,
                 slateHash, prizeTable, status
Slate            contestId, [tokenId], snapshotUrl, hash
PriceSnapshot    timestamp, [tokenId: price], published to CDN, archived
Entry            playerId(GameCenter), contestId, startingBankroll
Trade            entryId, tokenId, side, qty, priceRef(snapshotTs), seq
                 -- append-only, never mutated
Standing         entryId, provisionalScore, verifiedScore, rank, paid
Ghost            id, strategy(buyHoldBTC|index|lastChamp|diamond|paper),
                 prizeEligible: false
```

`Trade` being append-only and never mutated is what makes verification possible. Nothing else in the model may be trusted from the client.

---

## 5. Client stack

- **SwiftUI**, iOS 17+. iOS only for v1 — Game Center and CloudKit are the free infrastructure, and both are Apple-only. That lock-in *is* the business case.
- **GameKit** for leaderboards and identity.
- **CloudKit** for state sync across the user's devices.
- No third-party backend SDK. No Firebase. Nothing that introduces a bill.

---

## 6. Known risks

- **Game Center dependency.** If Apple changes recurring-leaderboard behaviour we lose the free leaderboard. Mitigation: the trade log in CloudKit is the real record — leaderboards are a display layer and can be rebuilt on any backend.
- **DexScreener has no SLA.** It's free and keyless with no guarantee. Mitigation: CoinGecko fallback, and the CDN snapshot means a brief outage doesn't affect users mid-contest.
- **Offline trading.** Users will trade with stale local prices on bad connections. Mitigation: trades validate against snapshot timestamp on sync; reject anything outside a tolerance window. Design the rejection UX up front — it will happen constantly and it's a rage-quit trigger if handled badly.
- **Apple review timing.** Guideline 5.3 explicitly warns to expect extended review for contest apps. Have Official Rules finished before first submission, not after rejection. Budget 2–3 weeks.

---

## Sources

- [Game Center overview](https://developer.apple.com/game-center/) · [Manage leaderboards — App Store Connect](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-leaderboards/) · [GKLeaderboard](https://developer.apple.com/documentation/gamekit/gkleaderboard)
- [CloudKit](https://developer.apple.com/icloud/cloudkit/) · [Limits of CloudKit public database](https://developer.apple.com/forums/thread/732433)
- [DexScreener API endpoints & limits (2026)](https://uwuu.ai/blog/dexscreener-api)
- [Best free crypto APIs 2026 — CoinGecko](https://www.coingecko.com/learn/best-free-crypto-api)
- [Best free crypto API 2026 comparison — altFINS](https://altfins.com/knowledge-base/best-free-crypto-api-in-2026-9-no-cost-options-compared/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
