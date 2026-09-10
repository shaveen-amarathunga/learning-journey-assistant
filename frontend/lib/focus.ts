import type { FeedbackItem, LearningOutcome } from "./types";

export interface FocusOutcome {
  outcome: LearningOutcome;
  /** How many of the recent feedback items are tied to this outcome. */
  commentCount: number;
  /** The most recent feedback comment for this outcome, if any. */
  recentComment?: FeedbackItem;
  /** True when this really is the lowest-scoring tracked outcome. */
  isLowest: boolean;
}

/**
 * Picks the single learning outcome the student should focus on next.
 *
 * Heuristic (frontend-only for now): the lowest current mastery, with the
 * number of recent feedback comments as a tie-breaker so a gap the marker
 * has actually written about wins over one that's merely low.
 */
export function pickFocusOutcome(
  outcomes: LearningOutcome[],
  recentFeedback: FeedbackItem[],
): FocusOutcome | null {
  if (outcomes.length === 0) return null;

  const commentCountFor = (id: string) =>
    recentFeedback.filter((f) => f.outcomeId === id).length;

  const ranked = [...outcomes].sort((a, b) => {
    if (a.mastery !== b.mastery) return a.mastery - b.mastery;
    return commentCountFor(b.id) - commentCountFor(a.id);
  });

  const lowestMastery = Math.min(...outcomes.map((o) => o.mastery));
  const focus = ranked[0];

  return {
    outcome: focus,
    commentCount: commentCountFor(focus.id),
    recentComment: recentFeedback.find((f) => f.outcomeId === focus.id),
    isLowest: focus.mastery === lowestMastery,
  };
}
