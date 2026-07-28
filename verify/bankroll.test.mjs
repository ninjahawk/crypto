/**
 * SPEC-004 verification — Loop 4 stopping condition.
 * Each assertion maps to an acceptance criterion in spec/LOOPS.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newBook, openPosition, closePosition, equity, returnPct, holdingsValue,
  positionValue, positionRows, maxSpendOn, allocateEqually, reconciles,
  STARTING_CAPITAL, MAX_POSITION_PCT,
} from '../site/js/bankroll.js';

const P = { btc: 100, eth: 50, doge: 0.1 };
const TS = '2026-01-01T00:00:00Z';

test('new book is all cash', () => {
  const b = newBook();
  assert.equal(b.cash, STARTING_CAPITAL);
  assert.equal(equity(b, P), STARTING_CAPITAL);
  assert.equal(returnPct(b, P), 0);
  assert.deepEqual(b.positions, {});
  assert.equal(b.log.length, 0);
});

test('newBook rejects nonsense capital', () => {
  assert.throws(() => newBook(0), RangeError);
  assert.throws(() => newBook(-5), RangeError);
  assert.throws(() => newBook(NaN), RangeError);
});

test('opening moves exactly cost from cash into holdings', () => {
  const b = openPosition(newBook(), 'btc', 1000, P, TS);
  assert.equal(b.cash, 9000);
  assert.equal(positionValue(b, 'btc', P), 1000);
  assert.equal(b.positions.btc.qty, 10);
  assert.equal(equity(b, P), STARTING_CAPITAL, 'equity is unchanged at the same price');
});

test('closing returns exactly qty x price to cash', () => {
  let b = openPosition(newBook(), 'btc', 1000, P, TS);
  b = closePosition(b, 'btc', null, P, TS);
  assert.equal(b.cash, STARTING_CAPITAL);
  assert.equal(b.positions.btc, undefined);
});

test('a partial sell leaves a proportional cost basis', () => {
  let b = openPosition(newBook(), 'btc', 1000, P, TS);
  b = closePosition(b, 'btc', 4, P, TS); // 4 of 10 units
  assert.equal(b.positions.btc.qty, 6);
  assert.equal(b.positions.btc.cost, 600);
  assert.equal(b.cash, 9400);
  assert.ok(reconciles(b, P));
});

test('cannot spend cash that is not there', () => {
  assert.throws(() => openPosition(newBook(), 'btc', 20000, P, TS), RangeError);
});

test('cannot sell what is not held', () => {
  assert.throws(() => closePosition(newBook(), 'btc', 1, P, TS), RangeError);
  const b = openPosition(newBook(), 'btc', 1000, P, TS);
  assert.throws(() => closePosition(b, 'btc', 999, P, TS), RangeError);
});

test('position cap is enforced on open (DECISIONS 0008)', () => {
  const b = newBook();
  const cap = (STARTING_CAPITAL * MAX_POSITION_PCT) / 100;
  assert.equal(maxSpendOn(b, 'btc', P), cap);
  assert.throws(() => openPosition(b, 'btc', cap + 1, P, TS), RangeError);
  assert.doesNotThrow(() => openPosition(b, 'btc', cap, P, TS));
});

test('the cap counts what is already held, so it cannot be split around', () => {
  let b = openPosition(newBook(), 'btc', 3000, P, TS);
  assert.equal(maxSpendOn(b, 'btc', P), 1000);
  assert.throws(() => openPosition(b, 'btc', 1500, P, TS), RangeError);
});

test('a missing or zero price is refused, never silently treated as free', () => {
  const b = newBook();
  assert.throws(() => openPosition(b, 'nope', 100, P, TS), RangeError);
  assert.throws(() => openPosition(b, 'btc', 100, { btc: 0 }, TS), RangeError);
});

test('operations never mutate the book they were given', () => {
  const b = newBook();
  const before = JSON.stringify(b);
  openPosition(b, 'btc', 1000, P, TS);
  assert.equal(JSON.stringify(b), before);
});

test('the trade log is append-only and ordered (DECISIONS 0006)', () => {
  let b = openPosition(newBook(), 'btc', 1000, P, TS);
  b = openPosition(b, 'eth', 500, P, TS);
  b = closePosition(b, 'btc', 2, P, TS);
  assert.equal(b.log.length, 3);
  assert.deepEqual(b.log.map((e) => e.seq), [0, 1, 2]);
  assert.deepEqual(b.log.map((e) => e.side), ['buy', 'buy', 'sell']);
});

test('price moves show up as return', () => {
  const b = openPosition(newBook(), 'btc', 1000, P, TS);
  assert.equal(returnPct(b, { ...P, btc: 200 }), 10, 'doubling a 10% position is +10% overall');
  assert.equal(returnPct(b, { ...P, btc: 50 }), -5);
});

test('equal allocation deploys the whole bankroll with no dust', () => {
  const b = allocateEqually(newBook(), ['btc', 'eth', 'doge'], P, TS);
  assert.equal(b.cash, 0, 'no cash stranded');
  assert.ok(Math.abs(holdingsValue(b, P) - STARTING_CAPITAL) < 1e-6);
  assert.equal(Object.keys(b.positions).length, 3);
});

test('an untouched equal allocation matches the pick-em score exactly', () => {
  // The bridge from pick'em to portfolio must not change the answer, or the
  // two halves of the product would disagree about who is winning.
  const picks = ['a', 'b', 'c', 'd', 'e'];
  const open = { a: 100, b: 50, c: 20, d: 8, e: 2 };
  const close = { a: 110, b: 40, c: 20, d: 12, e: 2.5 };

  const b = allocateEqually(newBook(), picks, open, TS);
  const bankrollReturn = returnPct(b, close);

  const pickEmScore = picks.reduce((sum, id) => sum + ((close[id] - open[id]) / open[id]) * 100, 0) / picks.length;
  assert.ok(Math.abs(bankrollReturn - pickEmScore) < 1e-4, `bankroll ${bankrollReturn} vs pick-em ${pickEmScore}`);
});

test('equal allocation respects the position cap', () => {
  // Two picks would be 50% each. The cap and the five-pick slate are
  // consistent by design (20% each); anything under three picks is not.
  assert.throws(() => allocateEqually(newBook(), ['btc', 'eth'], P, TS), RangeError);
});

test('position rows report P&L per holding', () => {
  const b = openPosition(newBook(), 'btc', 1000, P, TS);
  const [row] = positionRows(b, { ...P, btc: 150 });
  assert.equal(row.tokenId, 'btc');
  assert.equal(row.value, 1500);
  assert.equal(row.pnl, 500);
  assert.equal(row.pnlPct, 50);
  assert.equal(row.avgPrice, 100);
});

test('equity reconciles across a 200-operation random walk', () => {
  // Deterministic pseudo-random so a failure is reproducible.
  // Math.imul returns a *signed* 32-bit int, so the naive version of this can
  // go negative, wrap through >>>0 into a huge value, and yield rand() > 1.
  let seed = 12345;
  const rand = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  let book = newBook();
  const tokens = ['btc', 'eth', 'doge'];
  let prices = { ...P };

  for (let i = 0; i < 200; i += 1) {
    const tokenId = tokens[Math.floor(rand() * tokens.length)];
    prices = { ...prices, [tokenId]: prices[tokenId] * (0.9 + rand() * 0.2) };

    if (rand() < 0.5) {
      const room = maxSpendOn(book, tokenId, prices);
      const amount = Math.min(room, book.cash) * rand();
      if (amount > 0.01) book = openPosition(book, tokenId, amount, prices, TS);
    } else if (book.positions[tokenId]) {
      const qty = book.positions[tokenId].qty * rand();
      if (qty > 1e-6) book = closePosition(book, tokenId, qty, prices, TS);
    }

    assert.ok(reconciles(book, prices), `equity drifted at operation ${i}`);
    assert.ok(book.cash >= -1e-8, `cash went negative at operation ${i}`);
  }

  assert.equal(book.log.length, book.log.filter((e, idx) => e.seq === idx).length, 'log stayed ordered');
});
