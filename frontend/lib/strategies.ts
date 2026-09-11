import type { FeedbackItem, StudyStrategy } from "./types";

// ---------------------------------------------------------------------------
// Evidence-based study-strategy recommendations.
//
// Rule-based for now: we look at the *pattern* in an outcome's rubric
// comments and map recurring themes to well-supported study techniques
// (retrieval practice, spaced practice, self-explanation, worked examples,
// etc. — cf. Dunlosky et al., 2013). The NLP version that reads the actual
// feedback text is LJAB22-49.
// ---------------------------------------------------------------------------

interface Theme {
  id: string;
  test: RegExp;
  strategies: StudyStrategy[];
}

const THEMES: Theme[] = [
  {
    id: "justification",
    test: /justif|explain|reasoning|\breasons?\b|argu|rationale|discuss|critical|evaluat/,
    strategies: [
      {
        id: "self-explanation",
        title: "Self-explanation",
        why: "Explaining in your own words why each step or decision is correct builds understanding that re-reading does not.",
        how: "Take one worked solution for this outcome and write a one-line reason for every step.",
      },
      {
        id: "rubric-led-revision",
        title: "Rubric-led revision",
        why: "Marks are lost where work does not visibly meet the stated criteria, so revising against the rubric targets that directly.",
        how: "List each rubric criterion for this outcome and note, in a sentence, how your last submission met or missed it.",
      },
    ],
  },
  {
    id: "recall",
    test: /identif|recogni|defin|recall|terminolog|name the|state the|concept|not mentioned/,
    strategies: [
      {
        id: "retrieval-practice",
        title: "Retrieval practice",
        why: "Recalling facts and definitions from memory strengthens them far more than reviewing notes.",
        how: "List the key terms for this outcome and write each definition from memory, then check.",
      },
      {
        id: "spaced-review",
        title: "Spaced review",
        why: "Short review sessions spread over several days beat one long session for lasting retention.",
        how: "Review those terms for ten minutes today, again in two days, and once more before the next assessment.",
      },
    ],
  },
  {
    id: "application",
    test: /appl(y|ied|ication)|implement|calculat|solve|method|technique|procedure|algorithm|query|schema|index|design and/,
    strategies: [
      {
        id: "worked-examples",
        title: "Worked-example study",
        why: "Studying fully solved problems before attempting your own lowers cognitive load and builds the correct procedure.",
        how: "Work through two solved examples for this outcome line by line before trying an unsolved one.",
      },
      {
        id: "faded-practice",
        title: "Faded practice",
        why: "Gradually removing support as you improve transfers the skill to exam conditions.",
        how: "Redo a similar problem with the solution covered, revealing only the steps you get stuck on.",
      },
    ],
  },
  {
    id: "communication",
    test: /structure|organis|clarity|present|communicat|format|document|written|report|concise|readab/,
    strategies: [
      {
        id: "outline-first",
        title: "Outline-first drafting",
        why: "Planning structure before writing improves organisation and coverage, which is where communication marks are won.",
        how: "Write a heading-level outline that maps each section to a rubric criterion before you draft.",
      },
      {
        id: "review-pass",
        title: "Dedicated review pass",
        why: "A single read purely against the criteria catches gaps that drafting alone misses.",
        how: "After drafting, read once against the rubric only, flagging anything a marker could not tick off.",
      },
    ],
  },
  {
    id: "depth",
    test: /detail|depth|thorough|incomplete|missing|superficial|brief|expand|lacks|shallow|more evidence/,
    strategies: [
      {
        id: "elaborative-interrogation",
        title: "Elaborative interrogation",
        why: 'Asking "why is this true, and how does it connect?" builds the depth markers look for.',
        how: "For each key claim in this outcome, write two follow-up sentences: why it holds and what it links to.",
      },
      {
        id: "coverage-checklist",
        title: "Coverage checklist",
        why: "A checklist against the outcome makes missing content visible before you submit.",
        how: "Turn this outcome's sub-topics into a checklist and tick each only when you can explain it unprompted.",
      },
    ],
  },
];

const GENERIC: StudyStrategy[] = [
  {
    id: "retrieval-practice",
    title: "Retrieval practice",
    why: "Recalling material from memory strengthens it far more than re-reading.",
    how: "Close your notes and write everything you can recall about this outcome, then fill the gaps.",
  },
  {
    id: "spaced-practice",
    title: "Spaced practice",
    why: "Spreading study over time produces much better long-term retention than one long block.",
    how: "Study this outcome in three short sessions across the week rather than one long block.",
  },
  {
    id: "interleaving",
    title: "Interleaving",
    why: "Mixing problem types while practising improves your ability to pick the right approach under pressure.",
    how: "Practise this outcome's problems shuffled together with related ones, not in a single set.",
  },
];

/**
 * Derive 2–3 study strategies from the pattern in an outcome's feedback.
 * Falls back to general evidence-based techniques when there is no feedback
 * or nothing recognisable in it.
 */
export function deriveStrategies(reasons: FeedbackItem[]): StudyStrategy[] {
  const text = reasons.map((r) => r.comment.toLowerCase()).join(" ");
  if (!text.trim()) return GENERIC.slice(0, 3);

  const picked: StudyStrategy[] = [];
  const seen = new Set<string>();

  for (const theme of THEMES) {
    if (!theme.test.test(text)) continue;
    for (const strategy of theme.strategies) {
      if (seen.has(strategy.id)) continue;
      seen.add(strategy.id);
      picked.push(strategy);
      if (picked.length >= 3) return picked;
    }
  }

  return picked.length > 0 ? picked : GENERIC.slice(0, 3);
}
