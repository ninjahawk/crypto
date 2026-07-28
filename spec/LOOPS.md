# Loop Register

```yaml
last_updated: 2026-07-28
gate: node verify/e2e.mjs      # exit 0 = shippable
unit: node --test "verify/*.test.mjs"
lint: node verify/lint-constraints.mjs
```

## The rule

> A loop is a task with a check. A task without a check is just hope.

Write the check first. Watch it fail. Build until it passes. Never weaken a
check to go green — that is moving the benchmark, and it is how a loop talks
itself into success.

## Done

| Loop | Gate |
|---|---|
| Scoring engine | 3 hand-computed fixtures, 100× deterministic |
| Bankroll | `equity == cash + Σ(qty × price)` after every op, 200-op walk |
| Price feed | Two sources, failover, dedupe, parse real payloads |
| Streak | Freeze spend, month rollover, double-miss break |
| Top-100 board | 100 tokens, 91 with artwork, ranked by trending score |
| Live prices | Real data reaches app state; DOM repaints; rows flash |
| Typed sizing | Exact dollar amounts, percentage chips as shortcuts |
| **One screen** | No tab bar; bankroll + holdings + market on first paint |
| **No bots** | No BOT badge or ghost module anywhere in the client |
| **No unrequested legal** | No rules page, disclaimers or sponsor copy |

Current: **25/25 e2e · 80 unit · 4 invariants.**

## Open

| Loop | Gate it needs |
|---|---|
| Human leaderboard | Real accounts (Supabase free tier). Until then the board shows nobody rather than inventing anyone. |
| Result moment | Contest close → result → share card, automatically |
| Share card | Generated at peak emotion; currently functional but plain |
| Prizes | Only when funded. Never announce one that is not already paid for. |

## Traps

- Chromium here has no outbound HTTPS; Node does. Relay through Playwright
  route handlers to test the live path with real data.
- The browser cache serves stale JS and makes shipped fixes look unapplied.
- `catch(() => [])` around a 429 reads as "no results" — it silently collapsed
  the board from 100 tokens to 4.
