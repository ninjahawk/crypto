# Design — What the Research Says Actually Works

Prescriptive layout and interaction guidance, derived from published benchmarks rather than taste. Use this to evaluate reference screenshots before committing them as loop targets.

---

## 1. The benchmarks we're designing against

Sobering, and they set the priorities:

- **77% of daily active users stop using an app within three days of install.**
- iOS Day-1 retention averages **25.6%**. Top performers hit **40–60%**.
- Only **19.2% of users complete onboarding.** Top performers reach **40–50%**.
- **Activation rates double** when onboarding guides users to complete **one meaningful action before showing the full interface.**
- Target **time to first core action: under 60 seconds.**

Read together, these say the same thing four times: **almost everything that determines success happens in the first 60 seconds and the first 48 hours.** Design effort should be allocated accordingly — the first-run experience deserves more attention than every other screen combined.

---

## 2. The biggest recommended change: pick'em, not a trading terminal

Two possible core interactions:

| | Trading sim (Robinhood-like) | **Pick'em (PrizePicks-like)** |
|---|---|---|
| Action | Buy/sell with quantities, sizing, order entry | Tap N tokens from a slate. Done. |
| Time to first value | Minutes | **Seconds** |
| Skill ceiling | Higher | Lower initially |
| Onboarding conversion | Poor | **Strong** |

**Recommendation: pick'em is the entry format; trading depth is progression.**

The evidence: PrizePicks has been the dominant DFS pick'em operator in the US for years, and its interface is repeatedly credited for it — the squares grid "lends itself naturally to a really nice and clean look." Underdog's competing strength is described the same way: it "gets you quicker to a wider selection of picks." In this category, *speed to a completed pick* is the axis that wins.

This also lines up exactly with the activation finding — one meaningful action before the full interface. Tapping five tokens **is** that action.

Three further benefits that fall out for free:

1. **Equal-weight picks naturally cap position size.** Five picks = 20% each, which satisfies the 40% cap from `DECISIONS.md` 0008 without needing a rule the user has to understand.
2. **It simplifies the degen problem.** Fewer degrees of freedom, less room for all-in variance strategies.
3. **It makes scoring trivial to explain**, and clarity is itself a retention lever (§5).

Progression path: Day 1 taps five tokens. Week 3 unlocks position sizing. Month 2 unlocks full trading. Depth is earned, never in the way.

**This should be reflected in which reference apps we choose.** Look at PrizePicks/Underdog for the pick surface, Robinhood for the portfolio/P&L surface — not Robinhood for everything.

---

## 3. Onboarding — the highest-leverage screen in the product

**No signup wall.** Delay identity collection; every extra field or screen before activation increases abandonment. This matters doubly for a link-shared web app: someone taps a link in a tweet and should be picking within seconds, not typing an email.

```
Land ──► Today's slate, already loaded ──► Tap 5 tokens ──► "Lock in your picks"
                                                                    │
                                                    ──► identity, only now ◄──
```

**Rules:**
- First pick possible in **under 60 seconds**, ideally under 15.
- Identity is requested **after** the user has picks they don't want to lose. Sunk cost works in the user's favour here — they've built something worth saving.
- **Endowed progress:** new user's streak shows day 1 already lit, slate pre-loaded. People finish what looks already started.
- 2–3 preference questions maximum (favourite chain? risk appetite?) — this measurably improves long-term engagement, but only 2–3.
- **Explain the mechanic in one sentence, visibly.** Duolingo found that clarifying how streaks worked added tens of thousands of daily actives. Clarity is a retention lever, not decoration.

---

## 4. Screen-by-screen layout

### 4.1 Contest screen (home)

Fintech dashboard research says a dashboard must answer three questions **instantly, without reading**. Ours are:

1. **Where do I stand?** → cut line
2. **What's my position doing?** → P&L
3. **How long do I have?** → countdown

Order, top to bottom:

```
┌─────────────────────────────────────┐
│  ⏱ 4h 12m left      Prize pool $250 │  ← stakes + urgency, compact
├─────────────────────────────────────┤
│                                     │
│   YOU'RE $340 FROM THE MONEY        │  ← HERO. The most important
│   ▲ up 12 places today              │     pixels in the entire app.
│                                     │
├─────────────────────────────────────┤
│   $10,340        ▲ +3.4%            │  ← portfolio + P&L, big, colour-coded
├─────────────────────────────────────┤
│   [ token card ]  [ token card ]    │  ← holdings as cards, tap to expand
│   [ token card ]  [ token card ]    │
├─────────────────────────────────────┤
│         ▸  MAKE YOUR PICKS  ◂       │  ← single primary CTA above fold
└─────────────────────────────────────┘
```

- **One** primary CTA above the fold. Not three.
- Card-based blocks, detail one tap away — the Robinhood pattern that won an Apple Design Award: minimal surface, everything one tap deep, one decision at a time.
- Green/red for gains/losses, high contrast.
- The cut line is the hero. It is the single retention mechanic that works at any field size, and it is what a user should see before anything else.

### 4.2 Leaderboard — reward movement, not status

This is the most counterintuitive finding in the research and it's worth taking literally:

> The design choice is whether to reward **movement** or **status**. Movement motivates everyone; status only motivates leaders. Tracking deltas converts the leaderboard from a judgment into a journey.

And on scoping:

> Show users their rank among people like them… Scoping the comparison converts a discouraging metric into a motivating one for **100% of users instead of 1%**.

A global rank list actively de-motivates ~99% of the field. Three-zone structure instead:

```
┌─────────────────────────────────────┐
│  TOP 3          (aspirational)      │  ← by name, celebrated
├─────────────────────────────────────┤
│  ─── CUT LINE — $340 away ───       │  ← urgency
├─────────────────────────────────────┤
│  YOUR NEIGHBOURHOOD  (actionable)   │  ← ±3 positions around you,
│   #46  user     ▲2                  │    with deltas. Passing the
│  ►#47  YOU      ▲12                 │    person above you is a
│   #48  user     ▼1                  │    reachable, concrete goal.
├─────────────────────────────────────┤
│  RIVALS / FRIENDS   (personal)      │  ← self-selected, scoped
├─────────────────────────────────────┤
│  GHOSTS                             │  ← Buy & Hold BTC ▲, The Index ▼
└─────────────────────────────────────┘
```

- **Delta arrows on everything.** Movement is the motivator, and it works for the person in 612th exactly as well as the person in 2nd.
- Top 3 by name — aspirational, and cheap to show.
- Neighbourhood ±3 — this is where the actual daily engagement lives.
- Rivals: user picks 3 people to track. Self-scoped comparison beats global.
- Ghosts sit here too, badged. "I beat Buy & Hold BTC" is a genuine achievement and a better screenshot than a rank number.
- Never show total field size (`DECISIONS.md` 0004) — which the leaderboard research independently supports on pure effectiveness grounds, not just honesty.

### 4.3 Streaks

Duolingo's numbers are the reference implementation:

- **The biggest drop is day 1 → day 2.** Most streak design exists purely to carry a user across that gap. Push notification timing on day 2 matters more than any other notification in the product.
- **Streak freezes increase engagement** — allowing two equipped raised daily actives by +0.38%. The safety net is not a concession, it's a gain. Ship one free miss per month.
- Streak wagers produced **+14% day-14 retention**.
- The durable version is **identity, not loss aversion**: "I'm someone who plays every day" outlasts "I don't want to lose my streak." Copy should reinforce identity — *"Day 47. You've shown up more than 94% of traders."*

---

## 5. Sharing — build for the moment of peak emotion

> The satisfaction peak at first success is the highest-probability moment for a share; most apps miss this by surfacing the referral prompt only in a settings menu or days after first use.

**Auto-generate a share card at contest close, immediately, on the result screen.** Not in settings. Not the next day.

Critically, the peak is *not only winning* — that's 10% of users. Generate a card for every one of these:

- Final placement and delta ("▲ 47 places today")
- **Beat a ghost** — "I beat Buy & Hold BTC this week"
- Biggest single-day gain
- Streak milestones
- Best pick of the day

This is **status virality** — the Spotify Wrapped / streak-badge pattern, where product usage generates a visible artifact people want to post. On crypto Twitter that artifact *is* the growth channel, which is why the share card deserves real design effort rather than being a v2 item.

**Infrastructure note:** deferred deep linking must exist *before* the share incentives are designed. Retrofitting attribution is painful and you lose the data from the period you most need it.

---

## 6. Anti-patterns — specific, and taken from this exact category

Research on sports betting/DFS apps identified these concrete deceptive patterns. Several are things we'd otherwise drift into by accident, so they're written as hard rules:

| Pattern found in the wild | Our rule |
|---|---|
| **Payout/odds hidden until you commit** | Prize table is visible **before** entry, always. |
| **Cumulative winnings shown without net** — "$400 earned" when actually −$200 | Show net performance honestly. All-time record shows real numbers, including losses. |
| **Inverted cancellation copy** — "Cancel" confirms, "Ok" cancels | One tap to leave anything. Copy says exactly what the button does. |
| **Behavioural targeting of struggling users** with timed offers | No spend targeting. Ever. Same caps and prompts for everyone. |
| **Promo funds separate from real, must be spent before withdrawal** | No prize with strings. A prize is paid, in full, no conditions. |
| Mandatory multi-leg structures that force higher risk | Minimum viable entry is genuinely minimal. |

Beyond ethics, this is commercial. This audience is broke and highly alert to being farmed, and they will publicly dismantle anything that feels extractive — on the exact timeline the product is trying to grow on. Restraint here is the growth strategy.

---

## 7. Evaluating the reference screenshots

When the references arrive, score each against:

1. **Time to first meaningful action** — can you tell what to do in under 3 seconds?
2. **Single primary CTA above the fold?**
3. **Does it show movement/deltas or only status?**
4. **Is comparison scoped** (neighbourhood/friends) or global?
5. **Card-based with detail one tap deep?**
6. **Does the empty state teach**, or is it a dead end?
7. **Any of the §6 anti-patterns present?** Note them explicitly — we clone layout, not the dark patterns.

Capture empty, loading, populated, and error states for each. The empty and error states are where clones fall apart and where most of the real design work is.

---

## 8. Priority order for design effort

Allocate against where the benchmarks say outcomes are decided:

1. **First 60 seconds** — slate → picks → locked in. Highest leverage in the product by a wide margin.
2. **Day 2 return** — notification timing and copy. The biggest single drop-off in the funnel.
3. **Cut line** — the retention mechanic that works at every field size.
4. **Share card** — the growth channel, generated at peak emotion.
5. **Leaderboard neighbourhood** — daily engagement surface.
6. Everything else.

---

## Sources

- [App onboarding rates (2026) — Business of Apps](https://www.businessofapps.com/data/app-onboarding-rates/)
- [Mobile app onboarding best practices 2026](https://www.lowcode.agency/blog/mobile-onboarding-best-practices)
- [The ultimate mobile app onboarding guide (2026) — VWO](https://vwo.com/blog/mobile-app-onboarding-guide/)
- [100+ user onboarding statistics — UserGuiding](https://userguiding.com/blog/user-onboarding-statistics)
- [Gamification leaderboards that motivate the other 90% — Yu-kai Chou](https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/)
- [Increase competitiveness in users with leaderboards — IxDF](https://www.interaction-design.org/literature/article/increase-competitiveness-in-users-with-leader-boards)
- [Best practices for designing leaderboards](https://www.sportfitnessapps.com/blog/best-practices-for-designing-leaderboards)
- [Robinhood UI secrets — Itexus](https://itexus.com/robinhood-ui-secrets-how-to-design-a-sky-rocket-trading-app/)
- [5 ways Robinhood is winning with great UX](https://medium.com/@jvh_544/5-ways-that-robinhood-is-winning-with-great-ux-cb3a9844b8f7)
- [Fintech UX design: best practices for financial dashboards 2026](https://www.wildnetedge.com/blogs/fintech-ux-design-best-practices-for-financial-dashboards)
- [10 best fintech UX practices for mobile apps 2026 — ProCreator](https://procreator.design/blog/best-fintech-ux-practices-for-mobile-apps/)
- [PrizePicks vs Underdog vs DraftKings Pick6 (2026) — XCLSV](https://xclsvmedia.com/prizepicks-vs-underdog-vs-draftkings-pick6-2026/)
- ["Winning" by design: deceptive UX patterns and sports betting apps — UX Collective](https://uxdesign.cc/winning-by-design-deceptive-ux-patterns-and-sports-betting-apps-1a9f0e1deaad)
- [Duolingo streaks: how the mechanic drives 2x daily retention](https://duolingo.deconstructoroffun.com/mechanics/streaks)
- [Why Duolingo streaks work, in four questions](https://medium.com/@paul.levchuk/why-duolingo-streaks-work-in-four-questions-36703246d279)
- [Duolingo's habit-forming reminders: a UX breakdown](https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/)
- [Social and UGC viral loops for mobile app growth — Tapp](https://www.tapp.so/blog/social-viral-loops-for-apps/)
- [Viral loop design — Scalarly](https://scalarly.com/blog/viral-loop-design/)
