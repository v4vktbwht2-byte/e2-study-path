import { useEffect, useState } from "react";
import { resolveStudyDay } from "../../domain/planning";
import { EmptyState, ErrorState } from "../../shared/components";
import {
  clampReadingFontScaleIndex,
  createReadingAttempts,
  createReadingSession,
} from "./model";
import { ReadingQuestions, type ReadingQuestionStep } from "./ReadingQuestions";
import { ReadingReader } from "./ReadingReader";
import { ReadingResult } from "./ReadingResult";
import styles from "./Reading.module.css";
import type { ReadingPracticeSet, ReadingVocabulary } from "./schema";
import type {
  CompleteReadingResult,
  ReadingPracticePageProps,
  ReadingQuestionResponse,
} from "./types";

const SYSTEM_READING_CLOCK = {
  now: () => new Date(),
};
const DEFAULT_STUDY_DAY_RESOLVER = (now: Date) => resolveStudyDay(now);

interface LoadedPractice {
  set: ReadingPracticeSet;
  session: ReturnType<typeof createReadingSession>;
}

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; data: LoadedPractice }
  | { status: "error"; error: Error };

type PracticePhase = "reader" | "questions" | "result";

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

export function ReadingPracticePage({
  setId,
  content,
  store,
  clock = SYSTEM_READING_CLOCK,
  studyDayResolver = DEFAULT_STUDY_DAY_RESOLVER,
  planContext,
  onComplete,
  onExit,
}: ReadingPracticePageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [phase, setPhase] = useState<PracticePhase>("reader");
  const [fontScaleIndex, setFontScaleIndex] = useState(1);
  const [tickMs, setTickMs] = useState(0);
  const [readingTimeMs, setReadingTimeMs] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionStep, setQuestionStep] = useState<ReadingQuestionStep>("answer");
  const [questionStartedAtMs, setQuestionStartedAtMs] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [answerTimeMs, setAnswerTimeMs] = useState(0);
  const [responses, setResponses] = useState<ReadingQuestionResponse[]>([]);
  const [completedResult, setCompletedResult] = useState<CompleteReadingResult>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [completionNotice, setCompletionNotice] = useState<string>();
  const [favoriteVocabularyItemIds, setFavoriteVocabularyItemIds] = useState(
    () => new Set<string>(),
  );
  const [favoriteSavingId, setFavoriteSavingId] = useState<string>();
  const [favoriteError, setFavoriteError] = useState<string>();

  useEffect(() => {
    let active = true;
    const startedAt = clock.now();
    setLoadState({ status: "loading" });
    setPhase("reader");
    setFontScaleIndex(1);
    setTickMs(startedAt.getTime());
    setReadingTimeMs(0);
    setQuestionIndex(0);
    setQuestionStep("answer");
    setQuestionStartedAtMs(0);
    setSelectedChoice(null);
    setSelectedEvidenceId("");
    setAnswerTimeMs(0);
    setResponses([]);
    setCompletedResult(undefined);
    setSaving(false);
    setSaveError(undefined);
    setCompletionNotice(undefined);
    setFavoriteVocabularyItemIds(new Set());
    setFavoriteSavingId(undefined);
    setFavoriteError(undefined);

    void Promise.all([
      content.getReadingSet(setId),
      Promise.resolve(studyDayResolver(startedAt)),
    ])
      .then(async ([set, studyDay]) => {
        if (set === undefined) {
          if (active) {
            setLoadState({ status: "missing" });
          }
          return;
        }
        const favoriteStates = await Promise.all(
          set.payload.keyVocabulary.map((vocabulary) =>
            store.getVocabularyUserState(`vocab:${vocabulary.vocabularyItemId}`),
          ),
        );
        if (active) {
          setFavoriteVocabularyItemIds(
            new Set(
              set.payload.keyVocabulary.flatMap((vocabulary, index) =>
                favoriteStates[index]?.favorite === true
                  ? [vocabulary.vocabularyItemId]
                  : [],
              ),
            ),
          );
          setLoadState({
            status: "ready",
            data: {
              set,
              session: createReadingSession({
                setId: set.id,
                startedAt,
                studyDate: studyDay.studyDate,
              }),
            },
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            error: toError(error, "読解教材を読み込めませんでした。"),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [clock, content, reloadKey, setId, store, studyDayResolver]);

  useEffect(() => {
    if (loadState.status !== "ready" || phase === "result") {
      return;
    }
    const timer = globalThis.setInterval(() => {
      setTickMs(clock.now().getTime());
    }, 1_000);
    return () => {
      globalThis.clearInterval(timer);
    };
  }, [clock, loadState.status, phase]);

  if (loadState.status === "loading") {
    return (
      <main className={styles.studyPage} aria-busy="true">
        <p role="status">読解教材を読み込んでいます。</p>
      </main>
    );
  }
  if (loadState.status === "error") {
    return (
      <main className={styles.studyPage}>
        <ErrorState
          title="読解教材を開けませんでした"
          description={loadState.error.message}
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      </main>
    );
  }
  if (loadState.status === "missing") {
    return (
      <main className={styles.studyPage}>
        <EmptyState
          title="指定された読解教材が見つかりません"
          description="読解一覧から別の教材を選んでください。"
        />
      </main>
    );
  }

  const { set, session } = loadState.data;
  const startedAtMs = new Date(session.startedAt).getTime();
  const elapsedMs = Math.max(0, tickMs - startedAtMs);

  const addFavorite = async (vocabulary: ReadingVocabulary) => {
    setFavoriteSavingId(vocabulary.vocabularyItemId);
    setFavoriteError(undefined);
    try {
      await store.addVocabularyFavorite(
        vocabulary.vocabularyItemId,
        clock.now().toISOString(),
      );
      setFavoriteVocabularyItemIds((current) => {
        const next = new Set(current);
        next.add(vocabulary.vocabularyItemId);
        return next;
      });
    } catch (error: unknown) {
      setFavoriteError(
        toError(error, "単語をお気に入りへ追加できませんでした。").message,
      );
    } finally {
      setFavoriteSavingId(undefined);
    }
  };

  if (phase === "reader") {
    return (
      <ReadingReader
        set={set}
        elapsedMs={elapsedMs}
        fontScaleIndex={fontScaleIndex}
        onFontScaleIndexChange={(index) => {
          setFontScaleIndex(clampReadingFontScaleIndex(index));
        }}
        onStartQuestions={() => {
          const nowMs = clock.now().getTime();
          setTickMs(nowMs);
          setReadingTimeMs(Math.max(0, nowMs - startedAtMs));
          setQuestionStartedAtMs(nowMs);
          setPhase("questions");
        }}
        onExit={onExit}
      />
    );
  }

  if (phase === "result" && completedResult !== undefined) {
    return (
      <ReadingResult
        set={set}
        attempts={completedResult.attempts}
        readingTimeMs={readingTimeMs}
        favoriteVocabularyItemIds={favoriteVocabularyItemIds}
        favoriteSavingId={favoriteSavingId}
        favoriteError={favoriteError}
        completionNotice={completionNotice}
        onAddFavorite={(vocabulary) => {
          void addFavorite(vocabulary);
        }}
        onExit={onExit}
      />
    );
  }

  const question = set.payload.questions[questionIndex];
  if (question === undefined) {
    return (
      <main className={styles.studyPage}>
        <ErrorState
          title="設問を表示できませんでした"
          description="読解教材を読み直してください。"
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      </main>
    );
  }

  const completePractice = async () => {
    setSaving(true);
    setSaveError(undefined);
    const completedAt = clock.now().toISOString();
    try {
      const attempts = createReadingAttempts({
        set,
        session,
        responses,
        createdAt: completedAt,
      });
      const result = await store.completePractice({
        setId: set.id,
        session,
        attempts,
        completedAt,
        ...(planContext === undefined ? {} : { planContext }),
      });
      setCompletedResult(result);
      setPhase("result");
      try {
        await onComplete?.(result);
      } catch (error: unknown) {
        setCompletionNotice(
          toError(
            error,
            "完了後の画面更新を終えられませんでした。学習記録は保存されています。",
          ).message,
        );
      }
    } catch (error: unknown) {
      setSaveError(toError(error, "読解結果を保存できませんでした。").message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReadingQuestions
      set={set}
      question={question}
      questionIndex={questionIndex}
      step={questionStep}
      selectedChoice={selectedChoice}
      selectedEvidenceId={selectedEvidenceId}
      answerTimeMs={answerTimeMs}
      elapsedMs={elapsedMs}
      favoriteVocabularyItemIds={favoriteVocabularyItemIds}
      favoriteSavingId={favoriteSavingId}
      favoriteError={favoriteError}
      saveError={saveError}
      saving={saving}
      onChoiceChange={(index) => {
        setSelectedChoice(index);
      }}
      onConfirmAnswer={() => {
        if (selectedChoice === null) {
          return;
        }
        const nowMs = clock.now().getTime();
        setTickMs(nowMs);
        setAnswerTimeMs(Math.max(0, nowMs - questionStartedAtMs));
        setQuestionStep("evidence");
      }}
      onEvidenceChange={setSelectedEvidenceId}
      onConfirmEvidence={() => {
        if (selectedChoice === null || selectedEvidenceId === "") {
          return;
        }
        const response: ReadingQuestionResponse = {
          questionId: question.id,
          choiceIndex: selectedChoice,
          evidenceSentenceId: selectedEvidenceId,
          responseTimeMs: answerTimeMs,
        };
        setResponses((current) => [
          ...current.filter(
            (candidate) => candidate.questionId !== response.questionId,
          ),
          response,
        ]);
        setQuestionStep("feedback");
      }}
      onNext={() => {
        if (questionIndex === set.payload.questions.length - 1) {
          void completePractice();
          return;
        }
        const nowMs = clock.now().getTime();
        setTickMs(nowMs);
        setQuestionIndex((current) => current + 1);
        setQuestionStep("answer");
        setQuestionStartedAtMs(nowMs);
        setSelectedChoice(null);
        setSelectedEvidenceId("");
        setAnswerTimeMs(0);
        setSaveError(undefined);
      }}
      onAddFavorite={(vocabulary) => {
        void addFavorite(vocabulary);
      }}
      onExit={onExit}
    />
  );
}
