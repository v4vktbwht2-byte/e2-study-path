import { describe, expect, it } from "vitest";
import { pilotReadingPracticeSets } from "../../content/pilot/practiceReading";
import {
  clampReadingFontScaleIndex,
  createReadingAttempts,
  createReadingSession,
  formatReadingDuration,
  readingItemKey,
  scoreReadingResponses,
} from "./model";
import { parseReadingPracticeSet } from "./schema";

const set = parseReadingPracticeSet(pilotReadingPracticeSets[0]);

describe("読解model", () => {
  it("時間表示と文字サイズindexを安全な範囲へ整える", () => {
    expect(formatReadingDuration(0)).toBe("00:00");
    expect(formatReadingDuration(65_999)).toBe("01:05");
    expect(formatReadingDuration(-1)).toBe("00:00");
    expect(clampReadingFontScaleIndex(-20)).toBe(0);
    expect(clampReadingFontScaleIndex(99)).toBe(3);
  });

  it("正答と根拠を別々に評価してAttemptへ残す", () => {
    const startedAt = new Date("2026-07-27T00:00:00.000Z");
    const session = createReadingSession({
      setId: set.id,
      startedAt,
      studyDate: "2026-07-27",
    });
    const responses = set.payload.questions.map((question, index) => ({
      questionId: question.id,
      choiceIndex: index === 0 ? question.correctChoiceIndex : 1,
      evidenceSentenceId: index === 0 ? question.evidenceSentenceIds[0]! : "erl-s1",
      responseTimeMs: 2_750 + index,
    }));

    const scored = scoreReadingResponses(set, responses);
    const attempts = createReadingAttempts({
      set,
      session,
      responses,
      createdAt: "2026-07-27T00:01:00.000Z",
    });

    expect(readingItemKey(set.id)).toBe(`practice:${set.id}`);
    expect(session).toMatchObject({
      type: "practice",
      studyDate: "2026-07-27",
      interrupted: true,
      itemKeys: [`practice:${set.id}`],
    });
    expect(scored[0]).toMatchObject({ correct: true, evidenceCorrect: true });
    expect(scored[1]).toMatchObject({ correct: false, evidenceCorrect: false });
    expect(attempts).toHaveLength(set.payload.questions.length);
    expect(attempts[0]).toMatchObject({
      itemKey: `practice:${set.id}`,
      mode: "readingQuestion",
      correct: true,
      responseTimeMs: 2750,
      response: {
        evidenceCorrect: true,
      },
    });
  });

  it("未回答の設問がある場合はAttemptを生成しない", () => {
    const session = createReadingSession({
      setId: set.id,
      startedAt: new Date("2026-07-27T00:00:00.000Z"),
      studyDate: "2026-07-27",
    });
    expect(() =>
      createReadingAttempts({
        set,
        session,
        responses: [],
        createdAt: "2026-07-27T00:01:00.000Z",
      }),
    ).toThrow(/回答がありません/);
  });
});
