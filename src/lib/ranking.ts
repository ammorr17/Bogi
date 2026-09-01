/**
 * Insertion-based ranking.
 *
 * Two approaches were on the table:
 *
 * 1. Insertion sort (chosen): a user's ranked list is an ordered sequence.
 *    Adding a course does a binary search against the existing sequence —
 *    O(log n) head-to-head comparisons pin it into the right slot. This is
 *    exactly the Beli-style "which was better?" flow, needs almost no data
 *    to feel accurate (even 1-2 comparisons produce a sensible order), and
 *    the "rank" is just a list position — nothing to store beyond the raw
 *    comparison results.
 *
 * 2. Elo-style rating: every course gets a numeric rating that shifts after
 *    each comparison, like chess ratings. It shines with many comparisons
 *    across many users/courses (ratings converge and stay comparable across
 *    people), but needs volume to be accurate, moves a course's rank
 *    gradually rather than immediately, and doesn't map as naturally onto
 *    "insert this new thing precisely against what I already have."
 *
 * At friends-test scale (a handful of users, a few dozen courses, a handful
 * of comparisons each), insertion sort wins: it's simpler, needs less data
 * to feel right, and each comparison the user makes immediately and visibly
 * places the new course. Elo would be worth revisiting if this grows into a
 * cross-user leaderboard with lots of comparison volume.
 *
 * Storage: `comparisons` is an append-only log of winner/loser pairs. A
 * user's ranked list is never stored directly — it's derived by topologically
 * sorting that log (see computeRankedOrder below). Because every insertion
 * only ever compares the new course against the *current* sorted list, the
 * edges recorded over time end up connecting every pair of courses that are
 * ultimately adjacent in the final order, so the topological sort has a
 * unique answer in the common case. The tie-break argument exists only to
 * handle a courses which has not yet been fully placed (e.g. the user
 * abandoned a comparison flow partway through).
 */

export interface ComparisonEdge {
  winnerId: string;
  loserId: string;
}

/**
 * Derive a user's ranked order (best first) from their raw comparison log.
 *
 * Uses Kahn's algorithm over the "winner beats loser" DAG. `tieBreakOrder`
 * (e.g. course IDs ordered by when the user played them) decides ordering
 * among courses that aren't yet distinguished by any comparison edge.
 */
export function computeRankedOrder(
  courseIds: string[],
  comparisons: ComparisonEdge[],
  tieBreakOrder: string[],
): string[] {
  const idSet = new Set(courseIds);
  const beats = new Map<string, Set<string>>(); // winner -> set of losers it directly beat
  const inDegree = new Map<string, number>();

  for (const id of courseIds) inDegree.set(id, 0);

  for (const { winnerId, loserId } of comparisons) {
    if (!idSet.has(winnerId) || !idSet.has(loserId)) continue;
    let losers = beats.get(winnerId);
    if (!losers) {
      losers = new Set();
      beats.set(winnerId, losers);
    }
    if (!losers.has(loserId)) {
      losers.add(loserId);
      inDegree.set(loserId, (inDegree.get(loserId) ?? 0) + 1);
    }
  }

  const tieBreakIndex = new Map<string, number>();
  tieBreakOrder.forEach((id, i) => tieBreakIndex.set(id, i));
  const byTieBreak = (a: string, b: string) =>
    (tieBreakIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
    (tieBreakIndex.get(b) ?? Number.MAX_SAFE_INTEGER);

  // Ready = in-degree 0 (nothing outstanding has beaten it "first").
  const ready = courseIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  ready.sort(byTieBreak);

  const ordered: string[] = [];
  const remainingInDegree = new Map(inDegree);

  while (ready.length > 0) {
    // Always take the earliest-by-tiebreak ready node so the order stays
    // deterministic and stable as new comparisons are added.
    ready.sort(byTieBreak);
    const next = ready.shift()!;
    ordered.push(next);

    for (const loser of beats.get(next) ?? []) {
      const remaining = (remainingInDegree.get(loser) ?? 0) - 1;
      remainingInDegree.set(loser, remaining);
      if (remaining === 0) ready.push(loser);
    }
  }

  // Should only happen if comparisons contain a cycle (shouldn't occur from
  // normal use); fall back to appending anything left over by tie-break so
  // the UI never just drops a course.
  if (ordered.length < courseIds.length) {
    const seen = new Set(ordered);
    const leftover = courseIds.filter((id) => !seen.has(id)).sort(byTieBreak);
    ordered.push(...leftover);
  }

  return ordered;
}

export interface OpponentStep {
  opponentId: string;
  /** Index of the opponent within the pre-existing ranked list. */
  mid: number;
}

/**
 * Binary search step: given the current [lo, hi) search bounds over an
 * existing ranked list (best-first), return who the new course should be
 * compared against next, or null if the search is complete (in which case
 * `lo` is the final insertion index).
 */
export function nextOpponent(
  existingRankedIds: string[],
  lo: number,
  hi: number,
): OpponentStep | null {
  if (lo >= hi) return null;
  const mid = Math.floor((lo + hi) / 2);
  return { opponentId: existingRankedIds[mid], mid };
}

/**
 * Narrow the [lo, hi) bounds after the user says whether the new course beat
 * the opponent at `mid`.
 */
export function narrowBounds(
  lo: number,
  hi: number,
  mid: number,
  newCourseWon: boolean,
): { lo: number; hi: number } {
  return newCourseWon ? { lo, hi: mid } : { lo: mid + 1, hi };
}
