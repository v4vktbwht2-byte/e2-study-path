import { describe, expect, it } from "vitest";
import type { MasteryProfile } from "../mastery";
import type { ReviewState } from "../review";
import {
  extractWeakWords,
  rankQuickSortNewQueue,
  selectConfusionComparisonCandidates,
} from "./index";
import type {
  VocabularyAttemptSnapshot,
  WeakWordCandidate,
  WeakWordReason,
} from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function state(itemKey: string, lapseCount = 0): ReviewState {
  return {
    itemKey,
    status: "review",
    learningStep: 0,
    intervalDays: 7,
    easeBias: 0,
    dueAt: "2026-07-27T00:00:00.000Z",
    reviewCount: 4,
    lapseCount,
    consecutiveSuccesses: 1,
    updatedAt: "2026-07-26T00:00:00.000Z",
  };
}

function mastery(
  itemKey: string,
  overrides: Partial<MasteryProfile> = {},
): MasteryProfile {
  return {
    itemKey,
    recognition: 60,
    recall: 60,
    listening: 60,
    spelling: 60,
    context: 60,
    lastUpdatedAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

function attempt(
  attemptedAt: string,
  overrides: Partial<VocabularyAttemptSnapshot> = {},
): VocabularyAttemptSnapshot {
  return {
    attemptedAt,
    correct: true,
    responseSpeed: "normal",
    confidence: "high",
    ...overrides,
  };
}

function candidate(
  itemKey: string,
  options: {
    lapseCount?: number;
    mastery?: Partial<MasteryProfile>;
    attempts?: readonly VocabularyAttemptSnapshot[];
  } = {},
): WeakWordCandidate {
  return {
    itemKey,
    reviewState: state(itemKey, options.lapseCount),
    mastery: mastery(itemKey, options.mastery),
    recentAttempts: options.attempts ?? [],
  };
}

describe("Weak Words抽出", () => {
  const conditionCases: readonly [WeakWordReason, WeakWordCandidate][] = [
    ["repeatedLapses", candidate("vocab:lapse", { lapseCount: 3 })],
    [
      "recentErrors",
      candidate("vocab:errors", {
        attempts: [
          attempt("2026-07-26T03:00:00.000Z", { correct: false }),
          attempt("2026-07-26T02:00:00.000Z", { correct: false }),
          attempt("2026-07-26T01:00:00.000Z"),
        ],
      }),
    ],
    [
      "slowResponse",
      candidate("vocab:slow", {
        attempts: [attempt("2026-07-26T03:00:00.000Z", { responseSpeed: "slow" })],
      }),
    ],
    [
      "lowConfidence",
      candidate("vocab:confidence", {
        attempts: [attempt("2026-07-26T03:00:00.000Z", { confidence: "low" })],
      }),
    ],
    [
      "recognitionRecallGap",
      candidate("vocab:gap", {
        mastery: { recognition: 80, recall: 55 },
      }),
    ],
    [
      "confusionError",
      candidate("vocab:confusion", {
        attempts: [
          attempt("2026-07-26T03:00:00.000Z", {
            confusedWithItemKey: "vocab:other",
          }),
        ],
      }),
    ],
  ];

  it.each(conditionCases)("%sを弱点条件として抽出する", (reason, input) => {
    expect(extractWeakWords([input], NOW)).toEqual([
      expect.objectContaining({ itemKey: input.itemKey, reasons: [reason] }),
    ]);
  });

  it("条件を満たさない単語を除外する", () => {
    expect(extractWeakWords([candidate("vocab:stable")], NOW)).toEqual([]);
  });

  it("未来時刻を安全に扱い、候補の入力順に依存しない", () => {
    const futureLowConfidence = candidate("vocab:b", {
      attempts: [attempt("2026-08-01T00:00:00.000Z", { confidence: "low" })],
    });
    const lapse = candidate("vocab:a", { lapseCount: 3 });
    const first = extractWeakWords([futureLowConfidence, lapse], NOW);
    const second = extractWeakWords([lapse, futureLowConfidence], NOW);

    expect(first).toEqual(second);
    expect(first.map(({ itemKey }) => itemKey)).toEqual(["vocab:a", "vocab:b"]);
  });
});

describe("Quick Sortと混同語候補", () => {
  it("unknown、unsure、knownの順に並べ、決して定着済みにしない", () => {
    const answers = [
      { itemKey: "vocab:known", result: "known" },
      { itemKey: "vocab:unknown", result: "unknown" },
      { itemKey: "vocab:unsure", result: "unsure" },
    ] as const;
    const ranked = rankQuickSortNewQueue(answers);

    expect(ranked.map(({ itemKey }) => itemKey)).toEqual([
      "vocab:unknown",
      "vocab:unsure",
      "vocab:known",
    ]);
    expect(ranked.every(({ marksMastered }) => marksMastered === false)).toBe(true);
    expect(rankQuickSortNewQueue([...answers].reverse())).toEqual(ranked);
  });

  it("共有confusionGroupを持つ候補だけを決定的に返す", () => {
    const target = {
      itemKey: "vocab:quiet",
      headword: "quiet",
      confusionGroupIds: ["quiet-quite", "sound"],
    };
    const candidates = [
      {
        itemKey: "vocab:silent",
        headword: "silent",
        confusionGroupIds: ["sound"],
      },
      {
        itemKey: "vocab:quite",
        headword: "quite",
        confusionGroupIds: ["quiet-quite"],
      },
      {
        itemKey: "vocab:other",
        headword: "other",
        confusionGroupIds: ["unrelated"],
      },
    ];
    const input = {
      target,
      candidates,
      confusedWithItemKey: "vocab:quite",
    };

    expect(selectConfusionComparisonCandidates(input)).toEqual([
      {
        itemKey: "vocab:quite",
        headword: "quite",
        sharedGroupIds: ["quiet-quite"],
        isRecordedConfusion: true,
      },
      {
        itemKey: "vocab:silent",
        headword: "silent",
        sharedGroupIds: ["sound"],
        isRecordedConfusion: false,
      },
    ]);
    expect(
      selectConfusionComparisonCandidates({
        ...input,
        candidates: [...candidates].reverse(),
      }),
    ).toEqual(selectConfusionComparisonCandidates(input));
  });
});
