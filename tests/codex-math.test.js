'use strict';
/* Unit tests for the Mana Base Codex's hypergeometric probability math
   (table-talk/mana-base-codex/hypergeometric.js). This is the one piece of
   real computational logic on the site, so it gets a real oracle: a naive,
   obviously-correct direct nCr calculation (safe for the small N used here)
   that the optimized log-space implementation is cross-checked against,
   plus known boundary cases reasoned out by hand. */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { logC, hyperAtLeast, LOGF } = require(
  path.join(__dirname, '..', 'table-talk', 'mana-base-codex', 'hypergeometric.js')
);

// --- Independent oracle: naive direct nCr + direct hypergeometric sum ----
function nCr(n, k) {
  if (k < 0 || k > n || n < 0) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return result;
}

function hyperAtLeastDirect(need, K, draws, N) {
  const total = nCr(N, draws);
  let cum = 0;
  for (let k = 0; k < need; k++) cum += (nCr(K, k) * nCr(N - K, draws - k)) / total;
  return Math.max(0, Math.min(1, 1 - cum));
}

test('logC matches log(n choose k) for known small values', () => {
  assert.equal(logC(5, 0), 0); // C(5,0) = 1, log(1) = 0
  assert.equal(logC(5, 5), 0); // C(5,5) = 1
  assert.ok(Math.abs(logC(5, 2) - Math.log(10)) < 1e-9); // C(5,2) = 10
  assert.ok(Math.abs(logC(10, 3) - Math.log(120)) < 1e-9); // C(10,3) = 120
});

test('logC returns -Infinity for out-of-range k', () => {
  assert.equal(logC(5, -1), -Infinity);
  assert.equal(logC(5, 6), -Infinity);
  assert.equal(logC(-1, 0), -Infinity);
});

test('LOGF[0] is 0 and LOGF is non-decreasing (strictly increasing from i=2 on)', () => {
  assert.equal(LOGF[0], 0);
  assert.equal(LOGF[1], 0); // log(0!) = log(1!) = log(1) = 0, by convention
  for (let i = 2; i < 50; i++) assert.ok(LOGF[i] > LOGF[i - 1], `LOGF[${i}] should exceed LOGF[${i - 1}]`);
});

test('hyperAtLeast matches a direct (non-log-space) calculation across a spread of cases', () => {
  const cases = [
    // [need, K, draws, N]
    [1, 17, 7, 40], // classic "at least 1 land in opener" shape
    [2, 17, 7, 40],
    [3, 37, 9, 99], // Commander-scale: 37 lands in a 99-card deck, 9 cards seen
    [1, 10, 5, 30],
    [4, 20, 10, 60],
    [0, 5, 5, 20],
    [2, 2, 2, 10],
  ];
  for (const [need, K, draws, N] of cases) {
    const got = hyperAtLeast(need, K, draws, N);
    const want = hyperAtLeastDirect(need, K, draws, N);
    assert.ok(
      Math.abs(got - want) < 1e-9,
      `hyperAtLeast(${need},${K},${draws},${N}) = ${got}, direct oracle = ${want}`
    );
  }
});

test('hyperAtLeast(0, ...) is always 1 — "at least zero" is guaranteed', () => {
  assert.equal(hyperAtLeast(0, 17, 7, 40), 1);
  assert.equal(hyperAtLeast(0, 0, 0, 0), 1);
});

test('hyperAtLeast is 0 when there are no successes in the population', () => {
  assert.equal(hyperAtLeast(1, 0, 7, 40), 0);
});

test('hyperAtLeast is 1 when every card in the population is a success', () => {
  // K = N: every draw is a success, so "at least draws" is certain.
  assert.ok(Math.abs(hyperAtLeast(7, 40, 7, 40) - 1) < 1e-9);
});

test('hyperAtLeast clamps out-of-range K and draws instead of throwing', () => {
  assert.doesNotThrow(() => hyperAtLeast(1, 999, 7, 40)); // K > N
  assert.doesNotThrow(() => hyperAtLeast(1, 17, 999, 40)); // draws > N
  const clamped = hyperAtLeast(1, 999, 7, 40);
  const expected = hyperAtLeast(1, 40, 7, 40); // K should behave as if clamped to N
  assert.ok(Math.abs(clamped - expected) < 1e-9);
});

test('hyperAtLeast always returns a value in [0, 1]', () => {
  const cases = [
    [5, 37, 9, 99],
    [1, 1, 1, 1],
    [10, 50, 20, 99],
    [0, 0, 0, 1],
  ];
  for (const [need, K, draws, N] of cases) {
    const p = hyperAtLeast(need, K, draws, N);
    assert.ok(p >= 0 && p <= 1, `hyperAtLeast(${need},${K},${draws},${N}) = ${p} out of [0,1]`);
  }
});
