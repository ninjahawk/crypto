/**
 * Bankroll — SPEC-004. The actual game.
 *
 * A pick'em with no money is a poll. This is the part that makes it a contest:
 * real virtual capital, positions you size yourself, cash you can redeploy, and
 * a P&L in dollars rather than an abstract score.
 *
 * Pure. Every function returns a new book and never mutates its input, because
 * the log is append-only (DECISIONS 0006) and a mutated book cannot be replayed
 * by a verifier.
 *
 * The invariant that must hold after every single operation:
 *
 *     equity(book, prices) === cash + Σ(qty × price)
 *
 * If that ever drifts, the money is wrong. Everything else is downstream.
 */

import { roundTo } from './scoring.js';

/** Money is rounded to 8dp everywhere so float error cannot accumulate. */
const MONEY_DP = 8;
const money = (v) => roundTo(v, MONEY_DP);

export const STARTING_CAPITAL = 10000;

/** Max share of equity in any one token (DECISIONS 0008 — anti-degen). */
export const MAX_POSITION_PCT = 40;

export function newBook(startingCapital = STARTING_CAPITAL) {
  if (!Number.isFinite(startingCapital) || startingCapital <= 0) {
    throw new RangeError(`newBook: capital must be > 0, got ${startingCapital}`);
  }
  return {
    startingCapital,
    cash: startingCapital,
    positions: {},
    log: [],
  };
}

function assertPrice(price, tokenId) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError(`no usable price for "${tokenId}"`);
  }
}

export function positionValue(book, tokenId, prices) {
  const pos = book.positions[tokenId];
  if (!pos) return 0;
  const price = prices[tokenId];
  if (!Number.isFinite(price) || price <= 0) return 0;
  return money(pos.qty * price);
}

export function holdingsValue(book, prices) {
  let total = 0;
  for (const tokenId of Object.keys(book.positions)) {
    total += positionValue(book, tokenId, prices);
  }
  return money(total);
}

export function equity(book, prices) {
  return money(book.cash + holdingsValue(book, prices));
}

export function returnPct(book, prices) {
  return roundTo(((equity(book, prices) - book.startingCapital) / book.startingCapital) * 100);
}

/** Largest amount that may be put into one token without breaching the cap. */
export function maxSpendOn(book, tokenId, prices) {
  const cap = (equity(book, prices) * MAX_POSITION_PCT) / 100;
  const held = positionValue(book, tokenId, prices);
  return money(Math.max(0, Math.min(book.cash, cap - held)));
}

/**
 * Buy `usdAmount` worth of a token.
 *
 * Sized in dollars rather than quantity on purpose: nobody thinks in
 * "0.00043 BTC", they think in "a grand on bitcoin".
 */
export function openPosition(book, tokenId, usdAmount, prices, ts) {
  const price = prices[tokenId];
  assertPrice(price, tokenId);

  const amount = money(usdAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`openPosition: amount must be > 0, got ${usdAmount}`);
  }
  if (amount > book.cash + 1e-8) {
    throw new RangeError(`openPosition: insufficient cash (have ${book.cash}, need ${amount})`);
  }

  const allowed = maxSpendOn(book, tokenId, prices);
  if (amount > allowed + 1e-8) {
    throw new RangeError(
      `openPosition: ${MAX_POSITION_PCT}% position cap — max ${allowed} into ${tokenId}`,
    );
  }

  const qty = amount / price;
  const existing = book.positions[tokenId];
  const nextQty = money((existing?.qty ?? 0) + qty);
  const nextCost = money((existing?.cost ?? 0) + amount);

  return {
    ...book,
    cash: money(book.cash - amount),
    positions: { ...book.positions, [tokenId]: { qty: nextQty, cost: nextCost } },
    log: [...book.log, { seq: book.log.length, side: 'buy', tokenId, qty: money(qty), price, usd: amount, ts }],
  };
}

/** Sell `qty`, or the whole position when qty is null. */
export function closePosition(book, tokenId, qty, prices, ts) {
  const pos = book.positions[tokenId];
  if (!pos) throw new RangeError(`closePosition: no position in "${tokenId}"`);

  const price = prices[tokenId];
  assertPrice(price, tokenId);

  const sellQty = qty == null ? pos.qty : money(qty);
  if (!Number.isFinite(sellQty) || sellQty <= 0) {
    throw new RangeError(`closePosition: qty must be > 0, got ${qty}`);
  }
  if (sellQty > pos.qty + 1e-8) {
    throw new RangeError(`closePosition: holding ${pos.qty} ${tokenId}, cannot sell ${sellQty}`);
  }

  const proceeds = money(sellQty * price);
  const remaining = money(pos.qty - sellQty);
  const positions = { ...book.positions };

  if (remaining <= 1e-8) {
    delete positions[tokenId];
  } else {
    // Cost basis reduces proportionally so avg entry stays meaningful.
    positions[tokenId] = { qty: remaining, cost: money(pos.cost * (remaining / pos.qty)) };
  }

  return {
    ...book,
    cash: money(book.cash + proceeds),
    positions,
    log: [...book.log, { seq: book.log.length, side: 'sell', tokenId, qty: sellQty, price, usd: proceeds, ts }],
  };
}

/**
 * Spread the whole bankroll evenly across the picks.
 *
 * This is the bridge from pick'em to portfolio: five taps become a real
 * position book, so onboarding stays under a minute and the player lands
 * holding something they can then actually trade (DECISIONS 0010).
 */
export function allocateEqually(book, tokenIds, prices, ts) {
  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    throw new RangeError('allocateEqually: need at least one token');
  }
  const each = money(book.cash / tokenIds.length);
  let next = book;
  for (const tokenId of tokenIds) {
    // Last leg sweeps the remaining cash so no dust is stranded.
    const isLast = tokenId === tokenIds[tokenIds.length - 1];
    const amount = isLast ? money(next.cash) : each;
    if (amount > 0) next = openPosition(next, tokenId, amount, prices, ts);
  }
  return next;
}

/** Per-position rows for the UI, richest first. */
export function positionRows(book, prices) {
  return Object.entries(book.positions)
    .map(([tokenId, pos]) => {
      const value = positionValue(book, tokenId, prices);
      const pnl = money(value - pos.cost);
      return {
        tokenId,
        qty: pos.qty,
        cost: pos.cost,
        value,
        pnl,
        pnlPct: pos.cost > 0 ? roundTo((pnl / pos.cost) * 100, 2) : 0,
        avgPrice: pos.qty > 0 ? money(pos.cost / pos.qty) : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Reconciliation check — used by tests and available for a runtime assert. */
export function reconciles(book, prices, tolerance = 1e-6) {
  const direct = book.cash + Object.keys(book.positions).reduce(
    (sum, id) => sum + book.positions[id].qty * (prices[id] ?? 0),
    0,
  );
  return Math.abs(direct - equity(book, prices)) <= tolerance;
}
