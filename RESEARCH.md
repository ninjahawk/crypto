# Crypto Twitter App — Research & Game Plan

**Date:** 2026-07-27
**Status:** Research phase. No build decisions locked.

---

## 1. The asset we're monetizing

| Channel | Followers | Reach | Audience | In scope? |
|---|---|---|---|---|
| Twitter/X | ~7,000 | ~20k views/day | 20s–30s, ~70/30 M/F, crypto-native | **Yes — this doc** |
| Instagram | ~23,000 | ~200k views/mo | 50+ men, AI model persona | No |
| YouTube | ~2,000 | ramping | 13–17, streamer clips | No |
| TikTok | — | — | 13–17, streamer clips | No |

**Twitter audience segment we're actually targeting:** the reply-guy cohort that believes the account is rich and follows in hope of giveaways/free money. This is the highest-intent, lowest-trust segment. They will install *anything* that credibly implies money. They will **not** pay for a subscription.

That last sentence drives the entire monetization design.

---

## 2. Hard constraints found (this is the most important section)

These are the walls. Most versions of "crypto app for my Twitter audience" die on one of them. Verified against primary sources.

### 2.1 Apple Guideline 3.1.5(v) — the crypto-for-tasks ban

> "Cryptocurrency apps may not offer currency for completing tasks, such as downloading other apps, encouraging other users to download, posting to social networks, etc."

**Kills outright:** tap-to-earn, quest-to-earn, learn-to-earn paid in crypto, referral-for-tokens, "share this post → get $X of our coin." This is the single most common App Store rejection for exactly the app category our instinct points at.

Related 3.1.5 sub-rules:
- **(i) Wallets** — allowed, but the developer must be enrolled as an **organization**, not an individual.
- **(ii) Mining** — banned on-device.
- **(iii) Exchanges** — requires actual exchange licensing in every region offered.
- **(iv) ICOs / futures / crypto-securities** — must come from a licensed bank, broker-dealer, or FCM. Not us.

**Implication:** any app that touches custody, swaps, or token distribution takes on licensing weight a solo Swift build cannot carry. The winning design should touch **zero** of 3.1.5 except possibly (i).

### 2.2 X/Twitter developer policy change — 15 January 2026

X's head of product announced X would **permanently revoke API access for all applications that financially reward users for posting**, explicitly naming the "InfoFi" category.

Fallout: Kaito shut down Yaps and its incentivized Yapper Leaderboards. KAITO fell ~20% in hours, COOKIE ~15%, the InfoFi sector lost ~$40M in market cap (~11.5%). Kaito survived only by pivoting to Kaito Studio (curated brand↔creator matchmaking across X/YouTube/TikTok/IG); its token remains ~87.5% off ATH.

**Implication (two-part, both critical):**
1. No "post about the app → earn" growth loop. Dead as a mechanic.
2. **Do not architect anything that depends on the X API** to score, verify, or rank user engagement. That dependency can be revoked overnight, and in this category it already has been.

### 2.3 Apple Guideline 5.3 — contests, sweepstakes, gambling

- **5.3.1** Sweepstakes and contests **must be sponsored by the developer of the app.** ✅ We are the sponsor. This is workable.
- **5.3.2** Official rules must be presented **in the app** and state clearly that Apple is not a sponsor or involved in any manner.
- **5.3.3** May not use IAP to buy credit/currency for real-money gaming.
- **5.3.4** Real-money gaming (sports betting, poker, casino, horse racing) or lotteries need licensing + geo-restriction + the app must be free. Note Apple's own framing: *"Lottery apps must have consideration, chance, and a prize."*

That last line is the loophole and the blueprint. A lottery needs **all three**. Remove **consideration** (make entry free) or remove **chance** (make it skill-predominant) and it is not a lottery.

### 2.4 Securities / adviser exposure

- Personalized advice on tokens that are securities can trigger **Investment Advisers Act** registration.
- Promoting a token without disclosing compensation violates **Securities Act §17(b)** (touting).
- Enforcement stack is multi-agency: SEC, FTC (undisclosed material connection), FINRA, state regulators. SEC hit Fundrise Advisers $250k for paying 200+ influencers to solicit without disclosure.
- **Kills:** copy-trading, paid signals, "mirror my portfolio," any "we tell you what to buy" feature.

### 2.5 Launching a token / memecoin

- SEC staff (Feb 2025) said memecoins are generally **not** securities — speculative collectibles, no pooled investment. A federal judge dismissed the Caitlyn Jenner class action on those grounds.
- **But** the Hawk Tuah suits are live: investors suing promoters over an unregistered, US-marketed memecoin after a ~90% crash. Iggy Azalea and Jenner tokens tied to pump-and-dump allegations.
- The fact pattern "creator with an audience that believes he is rich and hands out money launches a coin to them" is the *exact* profile plaintiffs' firms are hunting.

**Verdict: do not launch a token. Do not launch points that "may convert to a token later"** — an implied future distribution is the same exposure with extra steps.

### 2.6 Competitive reality on trading apps

Moonshot: 2M+ users, majority stake taken by Jupiter, hit **#1 US finance app / #7 overall free** in Jan 2025 off the $TRUMP launch (it was the recommended buy link on the official $TRUMP site) — ~$400M volume and 200k+ new users in 12 hours. Axiom, Photon, Vector are all well-funded and entrenched. BullX shut down trading 1 June 2026.

**Implication:** do not build a trading terminal or on-ramp. That race is over and we'd be entering it with a solo Swift build. Note also *how* Moonshot won: not app-store marketing — it won a **distribution placement** on the thing everyone already wanted. Distribution beat product.

---

## 3. What the constraints leave standing

Filter every idea through five gates:

1. Hook is *genuinely* "I could make money" — with no deception required
2. Survives Apple review (3.1.5, 5.3)
3. Buildable solo in Swift, no licenses, no custody
4. No X API dependency
5. Trendable on CT — inherently screenshot-able / quote-tweetable

### Ideas evaluated and rejected

| Idea | Why it dies |
|---|---|
| Tap-to-earn / quest-to-earn | 3.1.5(v). Also the Hamster Kombat category already collapsed. |
| Yap-to-earn / InfoFi leaderboard | X API ban, Jan 2026. Category deleted. |
| Airdrop farming aggregator | 2026 airdrops now reward genuine multi-chain on-chain history, not task farming. Weak hook, heavy data lift, 3.1.5(v) risk if it pays out. |
| Copy-trading / signals | Advisers Act + §17(b) + FTC. |
| Our own memecoin / NFT | §2.5. NFTs additionally can't unlock app features under Apple's rules. |
| Trading terminal / on-ramp | §2.6. Cannot win. |
| Prediction market (Polymarket-style) | CFTC-licensed derivatives exchange required. Kalshi ~$1B/yr, Polymarket ~$2B/yr, Robinhood integrated Kalshi. Not a solo build. |
| Bitcoin-back rewards (Fold/Lolli model) | Needs merchant deals + working capital. Wrong shape for us. |

---

## 4. Recommendation — "Fantasy for Crypto Twitter"

**A free-to-enter, skill-based crypto trading contest app.** Virtual portfolios, live real market prices, real cash prizes, creator-sponsored, memecoin/CT-native.

Core loop: user gets a virtual bankroll (or drafts a slate of tokens), competes in a daily/weekly contest scored on real price movement, climbs a public leaderboard, top finishers win real money. Free to enter.

### Why this one clears all five gates

**Gate 1 — the hook is literally true.** "Free to play. Win real money." No deception, which is what was asked for. This is precisely the MrBeast mechanic: the *possibility* of money is the install driver, and here it's a real possibility, honestly stated.

**Gate 2 — Apple precedent exists.** 5.3.1 explicitly permits developer-sponsored contests. Live comparables on iOS today:
- **SwapRoyale** — iOS 16+ public beta, fixed entry fee, virtual $100k portfolio across stocks/crypto/commodities/forex at live prices, top finishers split a prize pool, daily and weekly contests. Live in 43 states; excludes CT, DE, LA, MI, MT, SC, SD, DC. Self-describes as *"a skill-based fantasy contest… no money is actually invested in the market."*
- **GameStock** — fantasy stock & crypto tournaments, free entry or paid from $1, prize pools to $100k.
- **TradingView "The Leap"** — free paper-trading competition, real rewards.

**Gate 3 — no licensing, no custody, no securities.** Nobody deposits. Nobody trades a real asset. We give no advice. We never hold a user's crypto. We barely touch 3.1.5 at all.

**Gate 4 — no X API.** Scoring comes from price feeds (CoinGecko/Birdeye/Jupiter/DEX aggregators), which are public and stable.

**Gate 5 — CT-native virality.** Leaderboards are the most quote-tweetable object on crypto Twitter. "Who's actually the best trader on CT" is a permanent, unresolved argument on that timeline. The app resolves it with receipts. Every contest ends in a screenshot.

### Legal posture (why free entry matters so much)

Apple's own definition: a lottery requires **consideration + chance + prize**. Free entry removes consideration. Skill-predominant scoring removes chance — and 30+ states (CA, GA, IL, MI, NC, OH, PA…) apply a "predominance" test asking whether skill drives >50% of the outcome. Picking tokens on research is defensibly skill-predominant, same argument DFS used to reach 40+ states under UIGEA plus state skill-game law.

Launching **free-entry only** means:
- No entry fee → no consideration → not gambling in any state
- Nationwide launch, no geo-fence needed on day one
- No gaming licence, no state-by-state exclusion list
- Still needs: real written **Official Rules** in-app (5.3.2), eligibility terms, void-where-prohibited, an explicit "Apple is not a sponsor" line, and **1099-MISC for any winner paid $600+/yr**

Paid-entry contests (the SwapRoyale model, 43 states) are a **Phase 3** decision requiring an actual gaming attorney, geo-fencing, and KYC on payouts. Do not attempt at launch.

### The wedge — why not just "another paper trading app"

Generic paper trading is boring and taken. The differentiation is that this one is **about memecoins and the timeline**, not the S&P 500. SwapRoyale and GameStock are stocks-first; TradingView is for chart nerds. Nobody has built the credible fantasy-contest product for Solana/Base memecoin markets, which is exactly where this audience lives.

Format to explore first: **daily slate draft.** Pick 5 tokens from a curated slate at contest open, score on 24h % change, highest total wins. PrizePicks/DFS mechanics applied to CT. Fast, legible, one screenshot per day, and skill-predominant (curation of the slate is what keeps it skill rather than a coin flip).

### Monetization — how this actually pays

Ranked by realism for *this* audience. Remember: they are broke and will not subscribe.

1. **The owned audience itself.** Push notifications + email, off-platform, un-deplatformable. Converting 20k daily Twitter views into an owned push channel is the strategic win regardless of revenue. This was the stated goal and this delivers it directly.
2. **Rewarded video ads.** Watch an ad → extra contest entry. High eCPM in finance. Note carefully: the reward is a *contest entry*, never crypto — keeps us clear of 3.1.5(v).
3. **Sponsored contests.** The real revenue. Token projects, launchpads, and exchanges already spend on CT marketing; "presented by" a daily contest with a named prize pool is a normal, easy sell in the $5–25k/week range once DAU is real. Scales with usage, not with user willingness to pay.
4. **IAP subscription** (advanced stats, private leagues, extra entries). Include it, but forecast low. Wrong audience.
5. **Paid-entry rake** — Phase 3 only, lawyer-gated.

Prize funding at launch is out of pocket. It does not need to be large: $50–100/day in prizes is credible for this audience size and is the entire marketing budget, replacing ad spend.

### Growth plan

- **Top of funnel:** a free *web* tool (no install friction) that produces a shareable card — e.g. "CT Wrapped" / wallet PnL card / "rate my bags." Web tools spread on CT far better than App Store links. Funnel it into the app.
- **Seeding:** the account runs contests itself, publicly, daily. The creator posts the leaderboard every day. That is the content — it feeds the timeline *and* the product simultaneously.
- **The MrBeast lesson applied honestly:** the reason to install is a real shot at real money. Don't manufacture an implication we can't back. Fund the prizes, pay the winners publicly, post the receipts. Public payouts are the single best growth asset this will have.

### Honest risks

- **Retention is the killer.** Fantasy contest apps have brutal D30 without social hooks. Private leagues, rivalries, and streaks are not nice-to-haves, they're the retention mechanic. Budget real design time here.
- **Prize funding is a real, recurring cash cost** before sponsors arrive. Plan 60–90 days of runway on it.
- **Sponsor conflict risk.** If a token project sponsors a contest *and* appears on the slate, that's a §17(b)/FTC disclosure issue. Rule: sponsors never appear on slates, or disclosure is loud and unmissable.
- **Apple review will be slow.** 5.3 explicitly warns to expect extra review time. Have Official Rules written before first submission, not after rejection.
- **Slate curation is the product.** Get it wrong and it's a coin flip — which weakens both the skill defence and the reason for a good trader to come back.

---

## 5. Phasing

**Phase 1 — Launch (free entry only, nationwide)**
Daily memecoin slate draft. Real price scoring. Public leaderboard. Creator-funded prizes. Official Rules in-app. Push notifications from day one. Rewarded ads.

**Phase 2 — Retention & revenue**
Private leagues, rivalries, streaks, season-long standings. Sponsored contests. Subscription tier. Web share-card funnel.

**Phase 3 — Paid entry (lawyer-gated)**
Only after real traction, and only with a gaming attorney, geo-fencing, KYC, and a state exclusion list modeled on SwapRoyale's.

---

## 6. Open questions before build

1. Prize budget per day, and for how many months of runway?
2. Slate scope — Solana memecoins only, or majors + memecoins for lower variance?
3. Contest cadence — daily only, or daily + weekly season?
4. Is the app branded to the personal account, or a standalone brand the account promotes? (Affects sponsor sales and the creator's personal liability surface.)
5. Which template/codebase is the starting point for the Swift build?

---

## Sources

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 3.1.5, 4.7, 5.3
- [Apple revises App Store guidelines for crypto and NFTs](https://www.crowdfundinsider.com/2025/05/239239-apple-revises-app-store-guidelines-for-crypto-and-nfts-following-court-ruling/)
- [Kaito after YAPS: how X killed crypto's first attention economy](https://blockeden.xyz/blog/2026/04/18/kaito-yaps-attention-economy-infofi-meritocratic-influence/)
- [The rise and fall of InfoFi](https://blockeden.xyz/blog/2026/03/16/infofi-collapse-kaito-studio-pivot-tokenized-attention-x-api-ban-web3-creator-economy/)
- [What is Kaito? 2026 guide — CoinGecko](https://www.coingecko.com/learn/what-is-kaito-earn-yap-points)
- [SwapRoyale — fantasy trading contests](https://swaproyale.com/)
- [GameStock — fantasy stock & crypto tournaments](https://gamestock.com/)
- [TradingView "The Leap" paper trading competition](https://www.tradingview.com/the-leap/)
- [Skill gaming legal guide — Walters Law Group](https://www.firstamendment.com/skill-gaming-legal-guide/)
- [Fantasy sports state legislation — FSGA](https://thefsga.org/state-legislation/)
- [Online free methods of entry — Thompson Coburn LLP](https://www.thompsoncoburn.com/insights/online-free-methods-of-entry-what-sponsors-need-to-know/)
- [Hawk Tuah memecoin investors sue promoters — Bloomberg Law](https://news.bloomberglaw.com/securities-law/memecoin-suits-test-trumps-sec-on-pivot-in-crypto-enforcement)
- [SEC staff statement on meme coins — WilmerHale](https://www.wilmerhale.com/en/insights/client-alerts/20250313-the-state-of-meme-coin-regulation-sec-staffs-statement-and-other-considerations)
- [Court sides with Caitlyn Jenner in memecoin lawsuit](https://finance.yahoo.com/markets/crypto/articles/court-sides-caitlyn-jenner-memecoin-170743622.html)
- [Regulation of financial influencers — SEC enforcement](https://www.securitieslawyer101.com/2025/regulation-of-financial-influencers/)
- [SEC touting charges — White & Case](https://www.whitecase.com/insight-alert/sec-continues-prove-it-most-powerful-influencer-how-avoid-touting-charges)
- [Trump memecoin propels Moonshot into top 10 US App Store — The Block](https://www.theblock.co/post/335580/trump-memecoin-launch-propels-moonshot-into-top-10-on-us-apple-app-store)
- [Jupiter takes majority stake in Moonshot — Blockworks](https://blockworks.com/news/jupiter-majority-stake-moonshot)
- [Axiom Trade review 2026 — Coin Bureau](https://coinbureau.com/review/axiom-trade-review)
- [Best prediction market apps 2026](https://www.covers.com/betting/prediction-sites)
- [Top crypto narratives 2026 — CoinGecko](https://www.coingecko.com/learn/crypto-narratives)
