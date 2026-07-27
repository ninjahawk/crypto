# Economics — Monetization, Prize Funding, and Not Losing Money

**Stated goal:** never lose money by default, be net positive, pour the surplus back into prizes / infrastructure / ad spend.

That goal is achievable, but it requires one structural decision (§3) and one legal correction (§2) to be made *before* any code exists. Both are cheap now and expensive later.

---

## 1. Revenue streams, ranked by realism

The target audience is broke. They will watch ads. They will not subscribe. Model accordingly.

| Stream | Realism | Notes |
|---|---|---|
| **Rewarded video ads** | **Primary** | US iOS rewarded video clears **$16–20 eCPM**; finance is among the two highest-paying categories. This is the engine. |
| **Reset skips (IAP)** | Secondary | The $0.48 idea — see §2, it needs restructuring to be legal. |
| **Sponsored contests** | **Biggest upside** | Token projects/launchpads/exchanges already spend on CT marketing. "Presented by" a contest week: $5–25k range once DAU is real. Scales with usage, not user willingness to pay. |
| **Subscription** | Low | Ship it, forecast near-zero. Wrong audience. |
| **Paid entry rake** | Phase 4 | Lawyer-gated. Not before. |

---

## 2. ⚠️ The reset mechanic has a legal trap — and the fix keeps the revenue

**The proposal:** $0.48 to reset your balance to base, limit 3/day. Artificial scarcity, money funds prizes.

**The problem:** US promotion law enforces what's called the **"equal dignity" rule** — *a participant's odds of winning must not improve if they make a purchase.* Any promotion combining prize + chance + purchase is an illegal lottery.

If paying $0.48 gives you another shot at a leaderboard that pays real cash, then purchase improves your odds of winning. That reintroduces **consideration** — and consideration is precisely the element that free entry was removing. It collapses the legal foundation the entire app stands on, and it does it in the one place that generates revenue, which is exactly where regulators look.

This is not a small compliance detail. It converts "free skill contest, legal in 50 states, no license" into "unlicensed lottery."

**The fix — and it monetizes as well or better:**

> **Every reset is available free.** 3 resets per day for everyone. Get them by watching a rewarded video, or pay $0.49 to skip the ad.

Money buys **time and convenience, never opportunity**. Everyone has identical access to all 3 resets and therefore identical odds. This is the standard mobile-game pattern, it satisfies the equal dignity rule cleanly, and revenue-wise it's *better* than the original:

- Free users generate ad revenue (~$0.05/user/day at 3 rewarded views, $16 eCPM)
- Impatient users pay $0.49 to skip
- We capture value from both populations instead of one

**Required disclosures**, in the Official Rules and at point of purchase, in plain readable language:
- No purchase necessary
- A purchase does not improve your chance of winning
- Free method: watch a rewarded video, same daily limit
- Apple is not a sponsor of, or involved in, this contest (Guideline 5.3.2)

**Also flag for review risk:** Apple 5.3.3 bars IAP for "credit or currency for use in conjunction with real money gaming." We are not real-money gaming (free entry, skill contest, no wagering, no deposits), so this shouldn't bite — but the free-path structure above is what makes that argument obviously correct to a reviewer rather than a judgment call.

---

## 3. The structural rule: prize pool is a *function of revenue*

This is the single decision that makes "cannot lose money by default" true rather than aspirational.

> **Prize pool = fixed floor + X% of the previous period's net revenue.**

- The **floor** is small, funded personally, and is the entire marketing budget. It is the only money genuinely at risk.
- The **variable portion** is paid out of money already collected, one period in arrears.
- **Never announce a prize that isn't already funded and sitting in the account.**

Announce it honestly as *"the prize pool grows with the community."* That is true, it's a genuine reason for users to recruit other users, and structurally it means the payout can never exceed income. The downside case is bounded at the floor. There is no scenario where a viral spike bankrupts the prize pool, because the pool is denominated in money that already arrived.

**Recommended split of net revenue:**

| Bucket | % | Purpose |
|---|---|---|
| Prize pool | 40% | The product. Visible, growing, the reason people are here. |
| Infrastructure reserve | 20% | Banked for the Phase 3 backend migration before it's needed. |
| Growth / ad spend | 25% | Reinvested acquisition once payback is proven. |
| Operator margin | 15% | Actual profit. Non-zero from day one — deliberately. |

Taking margin from month one, even trivially small, is what makes this a business rather than a hobby that eventually gets abandoned. Do not set it to 0% "until we're bigger."

---

## 4. Unit economics — conservative model

Benchmarks say US iOS rewarded video runs $16–20 eCPM. **Small new apps do not get benchmark rates** — fill rates are lower and demand is thinner until volume exists. Model at **$8–12 eCPM** for year one and treat anything above as upside.

**Assumptions:** 2.5 rewarded views/DAU/day, $10 eCPM → **ARPDAU ≈ $0.025**, plus IAP skips at maybe $0.005/DAU → **~$0.03 ARPDAU**.

| DAU | Monthly net rev | Prize pool (40%) | Margin (15%) |
|---|---|---|---|
| 500 | ~$450 | ~$180 | ~$68 |
| 1,000 | ~$900 | ~$360 | ~$135 |
| 5,000 | ~$4,500 | ~$1,800 | ~$675 |
| 10,000 | ~$9,000 | ~$3,600 | ~$1,350 |
| 25,000 | ~$22,500 | ~$9,000 | ~$3,375 |

Sanity check against published guidance: industry sources put "$1,000+/month" at 10,000+ DAU, which is *more pessimistic* than this model. Treat the table as an optimistic-but-defensible band, and the published guidance as the floor. Either way the shape holds — **contribution margin is positive at every level**, because prizes are a percentage of revenue rather than a fixed cost.

**A $360/month prize pool at 1,000 DAU is genuinely credible** for this audience. That's ~$12/day in daily prizes plus a real monthly headline number. This works at small scale, which is the point.

### 4.1 What actually costs money

| Item | Cost |
|---|---|
| Infrastructure | **$0** (see `ARCHITECTURE.md`) |
| Apple Developer Program | $99/yr |
| Prize floor | Your call — recommend $300–600/mo for 3 months |
| Legal (Official Rules drafted properly) | One-time, few hundred to low four figures. **Do not skip.** |
| Entity formation (for org enrollment) | A few hundred |

Realistic worst case for a 3-month launch window: **under $2,500 all-in**, and most of it is prize money that doubles as marketing.

### 4.2 Tax

Winners paid **$600+/yr** require a 1099-MISC and a W-9 collected before payout. Build the payout flow assuming this from the start — retrofitting identity collection onto a payout system after you've already promised someone money is genuinely painful.

---

## 5. Sponsorship — the actual scale path

Ads pay the bills; sponsors are the business. Once DAU is real, a sponsored contest is an easy sell into budgets that already exist on crypto Twitter.

**Rule, non-negotiable:** a sponsor's token never appears on a slate its sponsorship funds. That's a §17(b) touting problem and an FTC material-connection problem, and it's also just obviously corrupt to users who will notice immediately. Sponsors get branding, named prize pools, and prize-pool funding — never slate placement.

---

## 6. Decisions needed

1. **Prize floor per month, and runway in months?** Everything else is derived from this.
2. Revenue split — accept 40/20/25/15 or adjust?
3. Reset skip price — $0.49 is the natural Apple tier.
4. Daily reset cap — 3 confirmed?

---

## Sources

- [The alternate method of entry and the equal dignity rule — Fasthoff Law Firm](https://fasthofflawfirm.com/blog/sweepstakes-alternate-method-of-entry-equal-dignity)
- [No purchase necessary laws and AMOE for sweepstakes — Snipp](https://www.snipp.com/blog/no-purchase-necessary-laws-and-amoe-for-sweepstakes)
- [What is alternative method of entry in sweepstakes — LegalClarity](https://legalclarity.org/what-is-alternative-method-of-entry-in-sweepstakes/)
- [Online free methods of entry — Thompson Coburn LLP](https://www.thompsoncoburn.com/insights/online-free-methods-of-entry-what-sponsors-need-to-know/)
- [App ad revenue benchmarks 2026 — RevenueFlex](https://revenueflex.com/blog/app-ad-revenue-benchmarks-2026/)
- [Rewarded video ads: how they work & 2026 eCPMs](https://coinis.com/glossary/rewarded-video)
- [How much ad revenue can apps really make in 2026 — MonetizeMore](https://www.monetizemore.com/blog/how-much-ad-revenue-can-apps-generate/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 5.3.2, 5.3.3
- [SEC touting charges — White & Case](https://www.whitecase.com/insight-alert/sec-continues-prove-it-most-powerful-influencer-how-avoid-touting-charges)
