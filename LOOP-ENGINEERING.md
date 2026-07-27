# Loop Engineering — How We Build This

**Premise:** you supply reference apps/features to match 1:1. Each loop produces a slice that is verifiably right or wrong against a fixed target, on multiple independent checks.

---

## 1. The failure mode we're designing against

The bottleneck in agent-assisted development in 2026 is not generation speed — it's **drift**: confident, plausible code that quietly solves the wrong problem because nothing grounded the work in a real specification. Agents are excellent at writing code and bad at guessing intent.

The counter is **spec-driven development**: a precise spec is the source of truth, and code is treated as a generated, verifiable artifact. The spec declares intent; the code realizes it. Every loop is bounded by the spec rather than free-running.

Practically, for this project, that means: **a loop is not "done" because it looks done. It's done when it passes a check that was written before the code was.**

---

## 2. Repo layout

```
/spec
  /features        SPEC-001-contest-screen.md, ...  one per slice
  /references      screenshots + notes from the apps we're matching
  DECISIONS.md     architectural decisions, append-only, never rewritten
  GLOSSARY.md      contest / slate / entry / bankroll / cut line — one meaning each
/app               Swift package
/verify
  /golden          reference screenshots for visual comparison
  /fixtures        frozen price snapshots + expected scoring outputs
  /scripts         verification harness
/.github/workflows CI + the production cron jobs
```

`spec/` is the source of truth. If code and spec disagree, **the spec wins and the code is wrong** — including when the code looks better. Changing intent means changing the spec first, in its own commit.

---

## 3. Anatomy of a spec file

Every slice gets one, and it carries six elements:

```markdown
# SPEC-014 — Cut Line Display

## Outcome
User always knows their distance to the prize threshold.

## Scope
IN:  cut line calc, display, live update on price refresh
OUT: leaderboard list, prize table, notifications

## Constraints
- Never displays total field size (PLAN.md §4.2)
- Reads prices from CDN snapshot only, never a live API (ARCHITECTURE.md §3)
- Updates within 1s of snapshot refresh

## Prior decisions
- DECISIONS.md#0009 — provisional vs verified scores are visually distinct

## Reference
- references/robinhood-portfolio-header.png  (typography + number treatment)
- references/draftkings-cut-line.png          (layout + copy pattern)

## Tasks
1. CutLineCalculator — pure function, no I/O
2. CutLineView — SwiftUI
3. Wire to snapshot publisher

## Verification  (each item independently pass/fail)
- [ ] Given fixture `contest-mid-day.json`, calculator returns $340.00
- [ ] Given a user in the money, copy reads "You're in the money" not a negative
- [ ] Given field of 1, renders without divide-by-zero
- [ ] No string containing "of N" or field count appears in the view hierarchy
- [ ] Snapshot test matches golden/cut-line-*.png within 2% pixel delta
- [ ] Builds clean, zero warnings
```

Requirements get written in **EARS** form — *"When `<trigger>`, the system shall `<response>`"* — because that phrasing is directly translatable into both an implementation and the test that verifies it, without interpretation.

---

## 4. The loop

```
  SPEC ──► IMPLEMENT ──► VERIFY ──► [pass] ──► COMMIT ──► next slice
             ▲                        │
             └────── [fail] ──────────┘
                  bounded retry (max 3)
```

**Rules:**

1. **One slice per loop.** A slice is vertical — model + logic + view + test. Never "all the models" then "all the views"; that defers integration failure to the worst possible moment.
2. **Verification is written before implementation.** Fixtures and golden images are committed first, in their own commit. Otherwise the check gets quietly shaped to fit whatever the code already does.
3. **Max 3 retries, then stop and re-spec.** Three consecutive failures means the spec is ambiguous, not that the code is stubborn. Continuing to iterate against a bad spec is how a day disappears.
4. **Every loop ends green.** Builds clean, tests pass, committed. Never start a new slice on a broken tree.
5. **One decision per DECISIONS.md entry, append-only.** This is the memory across loops — it's what stops loop 40 from relitigating something settled in loop 6.

---

## 5. Verification layers

Each loop is checked on independent axes, so a pass means several different things had to be right at once:

| Layer | Checks | Tooling |
|---|---|---|
| **Build** | Compiles, zero warnings | `xcodebuild` |
| **Unit** | Pure logic vs. frozen fixtures | XCTest |
| **Golden scoring** | Known trade log + frozen prices → exact expected score | XCTest + `/verify/fixtures` |
| **Visual** | Snapshot vs. reference within tolerance | swift-snapshot-testing |
| **Constraint** | Forbidden patterns absent (no field-size string, no direct API call, no force-unwrap in scoring) | grep-based lint in CI |
| **Spec coverage** | Every `Verification` checkbox maps to a real test | script over `/spec` |

The **constraint layer** is the one people skip and it's the one that matters most here. Our hard rules — never show field size, never call a price API from the client, never mutate a trade log — are architectural properties that unit tests structurally cannot catch. They need to be enforced as grep-able invariants in CI, because they will otherwise be violated by a perfectly reasonable-looking change six weeks from now.

---

## 6. Working from 1:1 references

When you supply a reference app or feature:

1. **Capture it properly** — screenshots at multiple states (empty, loading, populated, error), not just the happy path. The empty and error states are where clones fall apart and where most of the real design work is.
2. **Annotate what's in scope.** "Match this layout and typography, ignore their color palette" — otherwise the loop optimizes for the wrong axis and you get a pixel-perfect clone of something you didn't want.
3. **Reference goes in the spec file**, so it's bound to the slice permanently rather than living in a chat message that scrolls away.
4. **Golden image is committed before implementation.**

**Important caveat on cloning:** match *interaction patterns, layout, and information hierarchy* — those are the parts that took the reference team years to get right and they're fair game. Do not copy proprietary visual assets, icon sets, or brand identity. Beyond the legal exposure, the goal in PLAN.md is something that feels genuinely exciting rather than derivative — a recognizable clone of a known app reads as cheap to exactly the audience we're targeting.

---

## 7. Slice order

Sequenced so the riskiest and least reversible things get verified first, and so there's something real to look at early.

| # | Slice | Why here |
|---|---|---|
| 1 | Scoring engine (pure, no UI) | The entire product is downstream of this. Fully testable with zero UI. Get it exactly right first. |
| 2 | Price snapshot fetch + CDN publish (GitHub Action) | Proves the zero-cost data pipeline before anything depends on it. |
| 3 | Trade log model, append-only | The integrity foundation (`ARCHITECTURE.md §2`). |
| 4 | Verification harness (replay a log → recompute score) | **Build the anti-cheat before the money.** |
| 5 | Game Center integration, recurring leaderboards | Biggest external unknown. Fail fast on it. |
| 6 | Contest screen | First real UI. Bankroll, holdings, P&L, countdown. |
| 7 | Cut line | The core retention mechanic. |
| 8 | Slate + trading UI | |
| 9 | Leaderboard + ghosts | |
| 10 | Season, streaks, badges | |
| 11 | Rules / winners / receipts screen | Required for review; highest-trust screen. |
| 12 | Rewarded ads + reset economy | Last — needs the free path wired correctly (`ECONOMICS.md §2`). |

Slices 1–4 have no UI at all. That's deliberate: they're where the real risk lives, they're fully verifiable without a simulator, and doing them first means the fun part is built on something already proven.

---

## 8. CI

Two workflow classes, both free on GitHub Actions:

**Per-commit:** build, unit, golden scoring, visual snapshot, constraint lint, spec coverage.

**Scheduled (production):** hourly price snapshot → publish to Pages; contest open/close; **winner verification**; results publish. These are the "backend" from `ARCHITECTURE.md` — the same infrastructure that runs CI runs production, which is a large part of why the infrastructure bill is zero.

---

## 9. Before loop 1 can start

- [ ] Reference apps chosen and captured (**blocking** — nothing starts without targets)
- [ ] `GLOSSARY.md` written — one meaning per term
- [ ] Scoring rules frozen in `SPEC-001` (position cap, monthly = sum of daily placements, tie-break)
- [ ] Fixture set built: 3 contests × known trade logs × known prices × hand-computed expected scores
- [ ] Apple Developer **organization** enrollment started (longest lead time — see `ARCHITECTURE.md §1.1`)
- [ ] Prize floor and runway decided (`ECONOMICS.md §6`)

The fixture set is the highest-value item on this list. Hand-compute three contests on paper. Every future loop checks itself against those numbers, and getting them right once removes an entire category of silent scoring bugs — the kind that only surface when someone is publicly owed money.

---

## Sources

- [Spec-driven development with AI coding agents (2026)](https://zeroshot.ghost.io/spec-driven-development-with-ai-coding-agents/)
- [Spec-driven development in 2026: what it is, the tooling, how teams use it](https://dev.to/krlz/spec-driven-development-in-2026-what-it-is-the-tooling-and-how-teams-actually-use-it-2fk2)
- [Spec-driven development: the definitive 2026 guide — BCMS](https://thebcms.com/blog/spec-driven-development)
- [What is spec-driven development — Augment Code](https://www.augmentcode.com/guides/what-is-spec-driven-development)
- [Spec-driven development with coding agents — DeepLearning.AI](https://www.deeplearning.ai/courses/spec-driven-development-with-coding-agents)
- [A process taxonomy and comparative assessment of frameworks supporting AI software development agents (arXiv)](https://arxiv.org/pdf/2606.04967)
