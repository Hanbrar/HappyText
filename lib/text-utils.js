/**
 * Text utilities — word-level diff and helpers.
 */

/**
 * Compute a word-level diff between two strings.
 * Returns an array of segments: { type: 'equal'|'removed'|'added', text: string }
 *
 * Uses a simple LCS-based approach on word arrays.
 */
export function diffWords(original, corrected) {
  if (original === corrected) {
    return [{ type: 'equal', text: original }];
  }

  const origWords = tokenize(original);
  const corrWords = tokenize(corrected);
  const lcs = longestCommonSubsequence(origWords, corrWords);

  const result = [];
  let oi = 0, ci = 0, li = 0;

  while (oi < origWords.length || ci < corrWords.length) {
    if (li < lcs.length) {
      // Add removed words (in original but not in LCS match)
      while (oi < origWords.length && origWords[oi] !== lcs[li]) {
        result.push({ type: 'removed', text: origWords[oi] });
        oi++;
      }
      // Add inserted words (in corrected but not in LCS match)
      while (ci < corrWords.length && corrWords[ci] !== lcs[li]) {
        result.push({ type: 'added', text: corrWords[ci] });
        ci++;
      }
      // Equal word
      if (li < lcs.length) {
        result.push({ type: 'equal', text: lcs[li] });
        oi++;
        ci++;
        li++;
      }
    } else {
      // Remaining words after LCS is exhausted
      while (oi < origWords.length) {
        result.push({ type: 'removed', text: origWords[oi] });
        oi++;
      }
      while (ci < corrWords.length) {
        result.push({ type: 'added', text: corrWords[ci] });
        ci++;
      }
    }
  }

  return result;
}

/**
 * Tokenize text into words, preserving whitespace as separate tokens.
 */
function tokenize(text) {
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Compute the longest common subsequence of two arrays.
 */
function longestCommonSubsequence(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the actual subsequence
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
export function truncate(text, maxLen = 120) {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1) + '\u2026';
}
