# Kickoff — Starting This On Your Machine

Everything needed to go from an empty editor to loop 1. Work top to bottom.

---

## 1. Get the repo

```bash
git clone <repo-url>
cd crypto
git checkout claude/crypto-twitter-app-research-wt7sg0
```

Read in this order: `README.md` → `RESEARCH.md` → `PLAN.md` → `ARCHITECTURE.md` → `ECONOMICS.md` → `LOOP-ENGINEERING.md` → `spec/DECISIONS.md` → `spec/GLOSSARY.md`.

---

## 2. Blocking items — nothing starts until these are done

### 2.1 Reference screenshots — **hard blocker**

Loop 1 has no target without these. For each app or feature being matched:

- Capture **multiple states**, not just the happy path: empty, loading, populated, error. The empty and error states are where clones fall apart and where most of the real design work is.
- Drop them in `spec/references/` with descriptive names — `robinhood-portfolio-header.png`, `draftkings-cut-line.png`.
- Add a sibling `.md` per screenshot noting **what is in scope**: "match layout and typography, ignore their palette." Without this the loop optimizes the wrong axis and you get a pixel-perfect clone of something you didn't want.

Match interaction patterns, layout, and information hierarchy — that's the part the reference team spent years getting right. Don't copy proprietary icons, assets, or brand identity.

### 2.2 Three decisions

| Decision | Why it blocks | Where it lands |
|---|---|---|
| **Prize floor/month + months of runway** | Every number in the economics derives from it | `ECONOMICS.md §6` |
| **Slate scope** — Solana memecoins only, or majors mixed in? | Determines variance, data sources, and curation workload | `spec/DECISIONS.md` 0010 |
| **Branding** — personal account or standalone brand? | Affects sponsor sales and personal liability surface | `spec/DECISIONS.md` 0011 |

### 2.3 Start the long-lead items now

- **Apple Developer organization enrollment** — needs a legal entity and D-U-N-S number. Weeks, sometimes longer. Start it even though web ships first; it's the longest pole in the project and it blocks the iOS phase entirely.
- **Official Rules drafted by counsel** — needed before the *first* prize is awarded, including on web and including Phase 0. Not expensive. Do not skip.

---

## 3. Phase 0 — start this week, in parallel with everything else

Phase 0 is not a warm-up. It de-risks the cold start, produces the payout receipts that are the single highest-converting asset the product will have, and validates the scoring rules against real behaviour before a line of code exists.

1. Post a slate on Twitter. 8–12 tokens.
2. People reply with picks by a stated cutoff.
3. Track in a spreadsheet against real prices.
4. Pay the winner. **Publicly. With the receipt.**
5. Repeat weekly. Keep every participant's handle.

Target before web launch: **200+ repeat participants.** At ~20k views/day that's two to four weeks.

This also produces the fixture data for §4.2 — real contests with real picks and known outcomes.

---

## 4. Repo setup for loop 1

### 4.1 Toolchain (web first, per DECISIONS 0001)

- Node LTS + pnpm
- TypeScript, strict mode
- Vite + React (or your preference — record it as DECISIONS 0012)
- Vitest for unit + golden scoring tests
- Playwright for visual regression
- Supabase free tier for identity + leaderboard store
- GitHub Actions for cron + CI, GitHub Pages for hosting and the price CDN

### 4.2 Build the fixture set — highest-value item on this list

Hand-compute **three complete contests** on paper. For each: a frozen price snapshot set, 5–10 trade logs, and the exact expected score and finishing order.

Commit to `verify/fixtures/`. Every future loop checks itself against these numbers. Getting them right once, by hand, removes an entire category of silent scoring bugs — the kind that only surface when someone is publicly owed money.

Do not generate these with code. The point is that they were derived independently of the implementation.

### 4.3 Freeze the scoring rules in `spec/features/SPEC-001-scoring.md`

Must pin down, unambiguously:
- Position size cap (40% max per token — DECISIONS 0008)
- Fee/slippage model (recommend: none at launch, simplest and hardest to dispute)
- Tie-break order
- Monthly = sum of daily placements (DECISIONS 0008)
- Rounding and precision rules — decide once, write it down, never revisit
- What happens to an entry with zero trades

### 4.4 Wire the CI constraint lints before writing app code

These enforce architectural invariants that unit tests structurally cannot catch. They *will* be violated by a reasonable-looking change six weeks from now if they aren't mechanized:

- No UI string matching field-size patterns (`of N`, `N players`, `N entrants`) — DECISIONS 0004
- No direct third-party price API call outside the scheduled job — DECISIONS 0007
- No mutation or deletion of trade records — DECISIONS 0006
- No forbidden vocabulary from `GLOSSARY.md` ("bet", "wager", "deposit", "odds", "earn") in any user-facing string

---

## 5. Slice order

From `LOOP-ENGINEERING.md §7`. Slices 1–4 have no UI at all — that's deliberate. It's where the real risk lives, it's fully verifiable without a browser, and it means the anti-cheat exists before the money does.

| # | Slice | Ships when |
|---|---|---|
| 1 | Scoring engine (pure functions) | Passes all three hand-computed fixtures exactly |
| 2 | Price snapshot job → CDN publish | Snapshot lands on Pages on schedule |
| 3 | Trade log model, append-only | Mutation attempts rejected; lint passes |
| 4 | Verification harness (replay log → recompute) | Detects a deliberately tampered log |
| 5 | Identity + leaderboard store | Two devices, one account, consistent standing |
| 6 | Contest screen | Matches reference within tolerance |
| 7 | Cut line | Correct against fixtures incl. field-of-1 |
| 8 | Slate + trading UI | |
| 9 | Leaderboard + ghosts | Ghosts badged, prize-ineligible |
| 10 | Season, streaks, badges | Streak freeze works |
| 11 | Rules / winners / receipts | Official Rules complete |
| 12 | Sponsor slot | Last. No rewarded video on web. |

---

## 6. The loop, operationally

```
SPEC ──► IMPLEMENT ──► VERIFY ──► [pass] ──► COMMIT ──► next slice
          ▲                        │
          └────── [fail] ──────────┘   max 3 retries, then re-spec
```

1. Write `spec/features/SPEC-NNN-<name>.md` with all six elements (template in `LOOP-ENGINEERING.md §3`).
2. Commit fixtures and golden images **first**, in their own commit, before implementation.
3. Implement one vertical slice — model + logic + view + test. Never all-models-then-all-views.
4. Run all six verification layers.
5. Three consecutive failures means the spec is ambiguous, not the code stubborn. Stop and re-spec.
6. Every loop ends green. Never start a slice on a broken tree.
7. Any decision made mid-loop gets appended to `spec/DECISIONS.md` immediately.

---

## 7. Definition of done for the web launch

- [ ] Three fixture contests pass exactly
- [ ] Verification harness catches a tampered log
- [ ] Price snapshots publishing on schedule, archived
- [ ] Daily contest opens and closes automatically
- [ ] Cut line correct at every field size including 1
- [ ] Ghosts visible, badged, prize-ineligible
- [ ] Official Rules published and linked
- [ ] Public payout receipts page live with Phase 0 history
- [ ] All CI constraint lints green
- [ ] 200+ Phase 0 participants invited

---

## 8. Guardrails — check any new idea against these

Four rules that the whole structure rests on. If something conflicts, the idea loses.

1. **Nothing a user pays for may improve their standing in a prize contest.** (DECISIONS 0002, 0003)
2. **No fabricated humans on a prize leaderboard, ever.** (DECISIONS 0004)
3. **Never announce a prize that isn't already funded.** (DECISIONS 0005)
4. **Never display total field size.** (DECISIONS 0004)
