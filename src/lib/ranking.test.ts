import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRankedOrder,
  computeTieredRankedOrder,
  nextOpponent,
  narrowBounds,
  type ComparisonEdge,
  type Sentiment,
} from "./ranking";

/** Simulate inserting `newId` into `sortedIds` (best-first) via binary
 * search against the "true" order given by `truth`, recording comparisons
 * exactly the way the compare API does. Returns the edges recorded. */
function simulateInsertion(
  sortedIds: string[],
  newId: string,
  truth: Record<string, number>, // lower number = better
  edges: ComparisonEdge[],
) {
  let lo = 0;
  let hi = sortedIds.length;
  while (true) {
    const step = nextOpponent(sortedIds, lo, hi);
    if (!step) break;
    const newCourseWon = truth[newId] < truth[step.opponentId];
    edges.push(
      newCourseWon
        ? { winnerId: newId, loserId: step.opponentId }
        : { winnerId: step.opponentId, loserId: newId },
    );
    ({ lo, hi } = narrowBounds(lo, hi, step.mid, newCourseWon));
  }
  return lo; // insertion index
}

test("computeRankedOrder: single course has no comparisons needed", () => {
  const order = computeRankedOrder(["a"], [], ["a"]);
  assert.deepEqual(order, ["a"]);
});

test("computeRankedOrder: simple chain reconstructs correctly", () => {
  // a beats b, b beats c -> a, b, c
  const edges: ComparisonEdge[] = [
    { winnerId: "a", loserId: "b" },
    { winnerId: "b", loserId: "c" },
  ];
  const order = computeRankedOrder(["a", "b", "c"], edges, ["a", "b", "c"]);
  assert.deepEqual(order, ["a", "b", "c"]);
});

test("computeRankedOrder: course with no comparisons yet falls back to tie-break", () => {
  const edges: ComparisonEdge[] = [{ winnerId: "a", loserId: "b" }];
  const order = computeRankedOrder(
    ["a", "b", "c"],
    edges,
    ["a", "b", "c"], // c was played most recently, no comparisons recorded
  );
  // c has no recorded comparisons, so its position is undetermined beyond
  // the tie-break -- but a's win over b must still be respected.
  assert.deepEqual([...order].sort(), ["a", "b", "c"]);
  assert.ok(order.indexOf("a") < order.indexOf("b"));
});

test("full insertion simulation reconstructs the true order for many courses", () => {
  // Insert 12 courses one at a time, in a shuffled arrival order, each via
  // real binary-search insertion against the current (correctly derived)
  // ranked list -- exactly like the app's compare flow.
  const truth: Record<string, number> = {};
  const allIds = Array.from({ length: 12 }, (_, i) => `course-${i}`);
  allIds.forEach((id, i) => (truth[id] = i)); // course-0 is best

  const arrivalOrder = [...allIds].sort(() => Math.random() - 0.5);
  const edges: ComparisonEdge[] = [];
  const tieBreakOrder: string[] = [];

  for (const id of arrivalOrder) {
    const currentSorted = computeRankedOrder(
      tieBreakOrder, // course ids played so far, in play order
      edges,
      tieBreakOrder,
    );
    simulateInsertion(currentSorted, id, truth, edges);
    tieBreakOrder.push(id);
  }

  const finalOrder = computeRankedOrder(tieBreakOrder, edges, tieBreakOrder);
  const expected = [...allIds].sort((a, b) => truth[a] - truth[b]);
  assert.deepEqual(finalOrder, expected);
});

test("computeTieredRankedOrder: every Positive ranks above Neutral above Negative", () => {
  const sentimentByCourseId = new Map<string, Sentiment>([
    ["p1", "positive"],
    ["p2", "positive"],
    ["n1", "neutral"],
    ["neg1", "negative"],
  ]);
  // Within-tier comparisons only (mirrors how the compare flow works).
  const edges: ComparisonEdge[] = [{ winnerId: "p2", loserId: "p1" }];
  const order = computeTieredRankedOrder(
    ["p1", "n1", "neg1", "p2"],
    edges,
    ["p1", "n1", "neg1", "p2"],
    sentimentByCourseId,
  );
  assert.deepEqual(order, ["p2", "p1", "n1", "neg1"]);
});

test("computeTieredRankedOrder: ignores a stray cross-tier comparison edge", () => {
  // Shouldn't happen via the app's UI, but the derivation should still be
  // safe against it rather than corrupting tier order.
  const sentimentByCourseId = new Map<string, Sentiment>([
    ["a", "positive"],
    ["b", "negative"],
  ]);
  const edges: ComparisonEdge[] = [{ winnerId: "b", loserId: "a" }];
  const order = computeTieredRankedOrder(
    ["a", "b"],
    edges,
    ["a", "b"],
    sentimentByCourseId,
  );
  assert.deepEqual(order, ["a", "b"]);
});

test("computeTieredRankedOrder: full per-tier insertion simulation", () => {
  const tiers: Sentiment[] = ["positive", "neutral", "negative"];
  const sentimentByCourseId = new Map<string, Sentiment>();
  const truthByTier: Record<Sentiment, Record<string, number>> = {
    positive: {},
    neutral: {},
    negative: {},
  };

  const allIds: string[] = [];
  for (const tier of tiers) {
    const ids = Array.from({ length: 5 }, (_, i) => `${tier}-${i}`);
    ids.forEach((id, i) => {
      sentimentByCourseId.set(id, tier);
      truthByTier[tier][id] = i;
    });
    allIds.push(...ids);
  }

  const arrivalOrder = [...allIds].sort(() => Math.random() - 0.5);
  const edges: ComparisonEdge[] = [];
  const tieBreakOrder: string[] = [];

  for (const id of arrivalOrder) {
    const tier = sentimentByCourseId.get(id)!;
    // Only search within courses already added in the same tier -- exactly
    // what the compare page does by filtering on sentiment.
    const currentTierIds = tieBreakOrder.filter(
      (existingId) => sentimentByCourseId.get(existingId) === tier,
    );
    const currentTierSorted = computeRankedOrder(
      currentTierIds,
      edges,
      currentTierIds,
    );

    let lo = 0;
    let hi = currentTierSorted.length;
    while (true) {
      const step = nextOpponent(currentTierSorted, lo, hi);
      if (!step) break;
      const newCourseWon =
        truthByTier[tier][id] < truthByTier[tier][step.opponentId];
      edges.push(
        newCourseWon
          ? { winnerId: id, loserId: step.opponentId }
          : { winnerId: step.opponentId, loserId: id },
      );
      ({ lo, hi } = narrowBounds(lo, hi, step.mid, newCourseWon));
    }
    tieBreakOrder.push(id);
  }

  const finalOrder = computeTieredRankedOrder(
    tieBreakOrder,
    edges,
    tieBreakOrder,
    sentimentByCourseId,
  );

  const expected = tiers.flatMap((tier) =>
    Object.keys(truthByTier[tier]).sort(
      (a, b) => truthByTier[tier][a] - truthByTier[tier][b],
    ),
  );
  assert.deepEqual(finalOrder, expected);
});

test("nextOpponent + narrowBounds converge to a single insertion index", () => {
  const sorted = ["a", "b", "c", "d", "e"];
  let lo = 0;
  let hi = sorted.length;
  let steps = 0;
  while (true) {
    const step = nextOpponent(sorted, lo, hi);
    if (!step) break;
    steps++;
    // pretend the new course always loses (belongs at the very end)
    ({ lo, hi } = narrowBounds(lo, hi, step.mid, false));
    assert.ok(steps <= Math.ceil(Math.log2(sorted.length + 1)) + 1);
  }
  assert.equal(lo, sorted.length);
});
