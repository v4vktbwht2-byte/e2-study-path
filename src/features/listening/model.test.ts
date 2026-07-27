import { describe, expect, it } from "vitest";
import { pilotListeningPracticeSets } from "../../content/pilot/practiceListening";
import {
  consumeExamPlayback,
  createFullPlaybackRequest,
  createListeningCompletionRecords,
  createSentencePlaybackRequest,
  isDictationMatch,
  normalizeDictation,
} from "./model";
import { parseListeningPracticeSet, parseListeningPracticeSets } from "./schemas";

const NOW = new Date("2026-07-27T03:00:00.000Z");
const set = parseListeningPracticeSet(pilotListeningPracticeSets[0]);

describe("リスニング教材契約", () => {
  it("オリジナル教材6セットをfeature-local schemaで検証する", () => {
    const parsed = parseListeningPracticeSets(pilotListeningPracticeSets);

    expect(parsed).toHaveLength(6);
    expect(new Set(parsed.map((candidate) => candidate.id)).size).toBe(6);
    for (const candidate of parsed) {
      expect(candidate.source.type).toBe("original");
      expect(candidate.tags).toContain("original");
      expect(candidate.payload.repeatPolicy).toEqual({
        examMaxPlays: 1,
        reviewUnlimited: true,
        reviewRates: [0.75, 1, 1.25],
      });
      expect(candidate.payload.qualityNoticeJa).toContain("公式");
      expect(candidate.payload.qualityNoticeJa).toContain("ありません");
    }
  });

  it("存在しない正答・dictation文・asset URL欠落を拒否する", () => {
    const invalidAnswer = structuredClone(pilotListeningPracticeSets[0]!);
    invalidAnswer.payload.question = {
      ...(invalidAnswer.payload.question as Record<string, unknown>),
      correctChoiceId: "missing",
    };
    expect(() => parseListeningPracticeSet(invalidAnswer)).toThrow(
      "正答IDが選択肢に含まれていません",
    );

    const invalidDictation = structuredClone(pilotListeningPracticeSets[0]!);
    invalidDictation.payload.dictationSentenceId = "missing";
    expect(() => parseListeningPracticeSet(invalidDictation)).toThrow(
      "ディクテーション対象の文がscript内にありません",
    );

    const invalidAsset = structuredClone(pilotListeningPracticeSets[0]!);
    invalidAsset.payload.audio = {
      strategy: "asset",
      language: "en-US",
    };
    expect(() => parseListeningPracticeSet(invalidAsset)).toThrow(
      "asset音声を使う教材にはassetUrlが必要です",
    );
  });
});

describe("リスニング学習モデル", () => {
  it("本番風では指定値にかかわらず1.0倍に固定する", () => {
    expect(createFullPlaybackRequest(set, "exam", 0.75).rate).toBe(1);
    expect(createFullPlaybackRequest(set, "review", 0.75).rate).toBe(0.75);
  });

  it("本番風の再生を1回だけ許可する", () => {
    const consumed = consumeExamPlayback({ playCount: 0 });
    expect(consumed).toEqual({ playCount: 1 });
    expect(() => consumeExamPlayback(consumed)).toThrow("本番風モードの音声は1回だけ");
  });

  it("一文再生では文ごとのscriptとassetを使う", () => {
    const firstSentence = set.payload.script.sentences[0]!;
    const request = createSentencePlaybackRequest(set, firstSentence.id, 1.25);

    expect(request.text).toBe(firstSentence.text);
    expect(request.rate).toBe(1.25);
  });

  it("Unicode・大文字小文字・空白・末尾句読点をそろえてdictationを比較する", () => {
    expect(normalizeDictation("  I’m   READY！ ")).toBe("i'm ready");
    expect(isDictationMatch("I’m ready.", "I'm ready!")).toBe(true);
    expect(isDictationMatch("I am ready", "I'm ready")).toBe(false);
  });

  it("回答とpractice sessionを同じitem keyで作る", () => {
    const records = createListeningCompletionRecords({
      set,
      mode: "exam",
      selectedChoiceId: set.payload.question.correctChoiceId,
      dictation: "",
      selfPractice: false,
      attemptId: "attempt-listening-1",
      sessionId: "session-listening-1",
      startedAt: new Date(NOW.getTime() - 10_000),
      completedAt: NOW,
      studyDate: "2026-07-27",
    });

    expect(records.attempt).toEqual(
      expect.objectContaining({
        itemKey: `practice:${set.id}`,
        sessionId: records.session.id,
        correct: true,
        score: 1,
        responseTimeMs: 10_000,
      }),
    );
    expect(records.session).toEqual(
      expect.objectContaining({
        type: "practice",
        endedAt: NOW.toISOString(),
        completedItemKeys: [`practice:${set.id}`],
      }),
    );
  });

  it("音声非対応の自己練習は自動採点せず完了記録にする", () => {
    const records = createListeningCompletionRecords({
      set,
      mode: "review",
      dictation: "",
      selfPractice: true,
      attemptId: "attempt-self-practice",
      sessionId: "session-self-practice",
      startedAt: NOW,
      completedAt: NOW,
      studyDate: "2026-07-27",
    });

    expect(records.attempt.correct).toBeNull();
    expect(records.attempt.score).toBe(0);
    expect(records.attempt.response).toEqual(
      expect.objectContaining({ selfPractice: true, selectedChoiceId: null }),
    );
  });
});
