/* Hypergeometric probability — powers the Consistency Lab (Section 6 of the
   main script). Extracted to its own file so it can be loaded as a plain
   global script on the page (unchanged behavior) AND required() directly
   from tests/codex-math.test.js without needing a DOM.
   Log-factorials keep C(99,k) finite for a 99-card deck. */
const LOGF = [0];
for (let i = 1; i <= 200; i++) LOGF[i] = LOGF[i - 1] + Math.log(i);

function logC(n, k) {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return LOGF[n] - LOGF[k] - LOGF[n - k];
}

/* P(drawing AT LEAST `need` successes) when drawing `draws` cards without
   replacement from a population of `N` cards containing `K` successes —
   e.g. "seeing at least 1 of your 18 sources of blue mana in the 9 cards
   you've seen by turn 3." Computed as 1 minus everything below the
   threshold, since summing "at least" directly would mean adding up every
   possibility from `need` to `draws` instead of the shorter list below it. */
function hyperAtLeast(need, K, draws, N) {
  K = Math.max(0, Math.min(K, N));
  draws = Math.max(0, Math.min(draws, N));
  const denom = logC(N, draws);
  let cum = 0; // P(0) + ... + P(need-1)
  for (let k = 0; k < need; k++) {
    const p = Math.exp(logC(K, k) + logC(N - K, draws - k) - denom);
    if (isFinite(p)) cum += p;
  }
  return Math.max(0, Math.min(1, 1 - cum));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOGF, logC, hyperAtLeast };
}
