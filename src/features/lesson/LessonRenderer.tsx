import { useCallback, useEffect, useRef, useState } from "react";
import type { Attempt, LessonProgress } from "../../domain/models";
import { resolveStudyDay } from "../../domain/planning";
import { Button, ErrorState, InlineAlert, ProgressBar } from "../../shared/components";
import {
  clampSectionIndex,
  collectLessonExerciseIds,
  normalizeLessonSections,
} from "./lessonModel";
import { LessonSectionView } from "./LessonSectionView";
import styles from "./Lesson.module.css";
import type {
  Exercise,
  Lesson,
  LessonExerciseResult,
  LessonRendererProps,
  LessonSessionIdentity,
  NormalizedLessonSection,
  TerminalLessonProgress,
} from "./types";

interface LoadedLesson {
  lesson: Lesson;
  sections: readonly NormalizedLessonSection[];
  progress?: LessonProgress;
  session: LessonSessionIdentity;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: LoadedLesson }
  | { status: "error"; error: Error };

const SYSTEM_LESSON_CLOCK = {
  now: () => new Date(),
};
const DEFAULT_STUDY_DAY_RESOLVER = (now: Date) => resolveStudyDay(now);

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function terminalStatus(
  progress: LessonProgress | undefined,
): LessonProgress["status"] | undefined {
  return progress?.status === "completed" || progress?.status === "skipped"
    ? progress.status
    : undefined;
}

function createLessonSessionIdentity(
  lessonId: string,
  startedAt: Date,
  studyDate: string,
): LessonSessionIdentity {
  const startedAtIso = startedAt.toISOString();
  return {
    id: `lesson-session:${lessonId}:${startedAtIso}`,
    startedAt: startedAtIso,
    studyDate,
  };
}

function findExercise(
  sections: readonly NormalizedLessonSection[],
  exerciseId: string,
): Exercise | undefined {
  for (const section of sections) {
    const exercise = section.exercises.find((candidate) => candidate.id === exerciseId);
    if (exercise !== undefined) {
      return exercise;
    }
  }
  return undefined;
}

function attemptItemKey(exercise: Exercise, lesson: Lesson): string {
  return (
    exercise.reviewItemKeys[0] ?? lesson.reviewItemKeys[0] ?? `lesson:${lesson.id}`
  );
}

export function LessonRenderer({
  lessonId,
  content,
  progressStore,
  clock = SYSTEM_LESSON_CLOCK,
  studyDayResolver = DEFAULT_STUDY_DAY_RESOLVER,
  planContext,
  onExerciseResult,
  onProgressSaved,
  onComplete,
  onSkip,
  onExit,
}: LessonRendererProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
  });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [completionMessage, setCompletionMessage] = useState<string>();
  const [planReviewCompleted, setPlanReviewCompleted] = useState(false);
  const [answeredExerciseIds, setAnsweredExerciseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [answerRequiredMessage, setAnswerRequiredMessage] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const attemptSequenceRef = useRef(0);
  const pendingAttemptIdsRef = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    const sessionStartedAt = clock.now();
    attemptSequenceRef.current = 0;
    pendingAttemptIdsRef.current.clear();
    setLoadState({ status: "loading" });
    setSaveError(undefined);
    setCompletionMessage(undefined);
    setPlanReviewCompleted(false);
    setAnsweredExerciseIds(new Set());
    setAnswerRequiredMessage(undefined);

    void Promise.all([
      content.getLesson(lessonId),
      progressStore.get(lessonId),
      Promise.resolve(studyDayResolver(sessionStartedAt)),
    ])
      .then(async ([lesson, progress, studyDay]) => {
        if (lesson === undefined) {
          throw new Error("指定されたレッスンが見つかりません。");
        }
        const exercises = await content.getExercises(collectLessonExerciseIds(lesson));
        const sections = normalizeLessonSections(lesson, exercises);
        if (active) {
          const reviewCheckpoint =
            planContext !== undefined &&
            progress?.reviewCheckpoint?.planDate === planContext.planDate &&
            progress.reviewCheckpoint.blockId === planContext.blockId
              ? progress.reviewCheckpoint
              : undefined;
          const resumeIndex =
            progress?.status === "inProgress"
              ? clampSectionIndex(progress.currentSectionIndex, sections.length)
              : reviewCheckpoint === undefined
                ? 0
                : clampSectionIndex(
                    reviewCheckpoint.currentSectionIndex,
                    sections.length,
                  );
          setSectionIndex(resumeIndex);
          setAnsweredExerciseIds(new Set(reviewCheckpoint?.answeredExerciseIds ?? []));
          setLoadState({
            status: "ready",
            data: {
              lesson,
              sections,
              progress,
              session: createLessonSessionIdentity(
                lesson.id,
                sessionStartedAt,
                studyDay.studyDate,
              ),
            },
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            error: toError(error, "レッスンを読み込めませんでした。"),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    clock,
    content,
    lessonId,
    planContext,
    progressStore,
    reloadKey,
    studyDayResolver,
  ]);

  useEffect(() => {
    if (loadState.status === "ready") {
      headingRef.current?.focus();
    }
  }, [loadState.status, sectionIndex]);

  const persistProgress = useCallback(
    async (
      data: LoadedLesson,
      targetSectionIndex: number,
    ): Promise<LessonProgress | undefined> => {
      setSaving(true);
      setSaveError(undefined);
      try {
        const now = clock.now().toISOString();
        const nextProgress: LessonProgress = {
          lessonId: data.lesson.id,
          status: "inProgress",
          currentSectionIndex: clampSectionIndex(
            targetSectionIndex,
            data.sections.length,
          ),
          updatedAt: now,
          ...(data.progress?.bestScore === undefined
            ? {}
            : { bestScore: data.progress.bestScore }),
        };
        await progressStore.save(nextProgress);
        setLoadState({
          status: "ready",
          data: { ...data, progress: nextProgress },
        });
        onProgressSaved?.(nextProgress);
        return nextProgress;
      } catch (error: unknown) {
        setSaveError(toError(error, "進捗を保存できませんでした。").message);
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [clock, onProgressSaved, progressStore],
  );

  const persistTerminal = useCallback(
    async (
      data: LoadedLesson,
      status: TerminalLessonProgress["status"],
      targetSectionIndex: number,
    ): Promise<TerminalLessonProgress | undefined> => {
      setSaving(true);
      setSaveError(undefined);
      try {
        const now = clock.now().toISOString();
        const nextProgress: TerminalLessonProgress = {
          lessonId: data.lesson.id,
          status,
          currentSectionIndex: clampSectionIndex(
            targetSectionIndex,
            data.sections.length,
          ),
          updatedAt: now,
          ...(data.progress?.bestScore === undefined
            ? {}
            : { bestScore: data.progress.bestScore }),
          ...(status === "completed"
            ? { completedAt: data.progress?.completedAt ?? now }
            : {}),
        };
        await progressStore.commitTerminal({
          lesson: data.lesson,
          progress: nextProgress,
          session: data.session,
          ...(planContext === undefined ? {} : { planContext }),
        });
        setLoadState({
          status: "ready",
          data: { ...data, progress: nextProgress },
        });
        onProgressSaved?.(nextProgress);
        return nextProgress;
      } catch (error: unknown) {
        setSaveError(toError(error, "進捗を保存できませんでした。").message);
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [clock, onProgressSaved, planContext, progressStore],
  );

  const persistReviewCheckpoint = useCallback(
    async (
      data: LoadedLesson,
      targetSectionIndex: number,
      answeredIds: ReadonlySet<string>,
    ): Promise<LessonProgress | undefined> => {
      if (planContext === undefined || terminalStatus(data.progress) === undefined) {
        return data.progress;
      }
      setSaving(true);
      setSaveError(undefined);
      try {
        const saved = await progressStore.saveReviewCheckpoint({
          lessonId: data.lesson.id,
          progress: data.progress!,
          planContext,
          currentSectionIndex: clampSectionIndex(
            targetSectionIndex,
            data.sections.length,
          ),
          answeredExerciseIds: [...answeredIds],
          updatedAt: clock.now().toISOString(),
        });
        setLoadState({
          status: "ready",
          data: { ...data, progress: saved },
        });
        return saved;
      } catch (error: unknown) {
        setSaveError(toError(error, "復習の再開位置を保存できませんでした。").message);
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [clock, planContext, progressStore],
  );

  const persistExerciseResult = useCallback(
    async (data: LoadedLesson, result: LessonExerciseResult): Promise<void> => {
      const exercise = findExercise(data.sections, result.exerciseId);
      if (exercise === undefined) {
        throw new Error("回答した問題をレッスン内で確認できませんでした。");
      }

      let attemptId = pendingAttemptIdsRef.current.get(result.exerciseId);
      if (attemptId === undefined) {
        attemptSequenceRef.current += 1;
        attemptId = `${data.session.id}:attempt:${attemptSequenceRef.current}`;
        pendingAttemptIdsRef.current.set(result.exerciseId, attemptId);
      }

      const createdAt = clock.now().toISOString();
      const attempt: Attempt = {
        id: attemptId,
        itemKey: attemptItemKey(exercise, data.lesson),
        exerciseId: exercise.id,
        sessionId: data.session.id,
        createdAt,
        studyDate: data.session.studyDate,
        mode: exercise.type,
        response: result.response,
        correct: result.correct,
        score: result.correct === true ? 1 : 0,
        responseTimeMs: 0,
        hintCount: result.hintCount,
      };

      await progressStore.recordAttempt({
        attempt,
        session: data.session,
      });
      const nextAnsweredExerciseIds = new Set(answeredExerciseIds);
      nextAnsweredExerciseIds.add(result.exerciseId);
      if (planContext !== undefined && terminalStatus(data.progress) !== undefined) {
        const saved = await persistReviewCheckpoint(
          data,
          sectionIndex,
          nextAnsweredExerciseIds,
        );
        if (saved === undefined) {
          throw new Error("復習の回答位置を保存できませんでした。");
        }
      }
      setAnsweredExerciseIds(nextAnsweredExerciseIds);
      setAnswerRequiredMessage(undefined);
      await onExerciseResult?.(result);
      pendingAttemptIdsRef.current.delete(result.exerciseId);
    },
    [
      answeredExerciseIds,
      clock,
      onExerciseResult,
      persistReviewCheckpoint,
      planContext,
      progressStore,
      sectionIndex,
    ],
  );

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>レッスンを準備しています</h1>
        <p role="status">レッスンを読み込んでいます。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="レッスンを開けませんでした"
          description={loadState.error.message}
          headingLevel={1}
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      </section>
    );
  }

  const { data } = loadState;
  const currentSection = data.sections[sectionIndex];
  if (currentSection === undefined) {
    return (
      <section className={styles.page}>
        <ErrorState
          title="レッスンの内容がありません"
          description="別のレッスンを選んでください。"
          headingLevel={1}
        />
      </section>
    );
  }
  const isLastSection = sectionIndex === data.sections.length - 1;
  const isPlanReview =
    planContext !== undefined && terminalStatus(data.progress) !== undefined;
  const isTerminal =
    terminalStatus(data.progress) !== undefined &&
    (!isPlanReview || planReviewCompleted);
  const currentSectionNeedsAnswers =
    (currentSection.kind === "exercise" || currentSection.kind === "recall") &&
    currentSection.exercises.length > 0;

  const hasAnsweredCurrentSection = currentSection.exercises.every((exercise) =>
    answeredExerciseIds.has(exercise.id),
  );

  const requireCurrentSectionAnswers = (): boolean => {
    if (!currentSectionNeedsAnswers || hasAnsweredCurrentSection) {
      setAnswerRequiredMessage(undefined);
      return true;
    }
    const unansweredCount = currentSection.exercises.filter(
      (exercise) => !answeredExerciseIds.has(exercise.id),
    ).length;
    setAnswerRequiredMessage(
      `このセクションの問題にすべて回答してから進んでください。未回答は${unansweredCount}問です。`,
    );
    return false;
  };

  const moveTo = async (targetIndex: number) => {
    if (targetIndex > sectionIndex && !requireCurrentSectionAnswers()) {
      return;
    }
    if (isTerminal) {
      setSectionIndex(clampSectionIndex(targetIndex, data.sections.length));
      setCompletionMessage(undefined);
      setAnswerRequiredMessage(undefined);
      return;
    }
    if (isPlanReview) {
      const saved = await persistReviewCheckpoint(
        data,
        targetIndex,
        answeredExerciseIds,
      );
      if (saved !== undefined) {
        setSectionIndex(clampSectionIndex(targetIndex, data.sections.length));
        setCompletionMessage(undefined);
        setAnswerRequiredMessage(undefined);
      }
      return;
    }
    const saved = await persistProgress(data, targetIndex);
    if (saved !== undefined) {
      setSectionIndex(clampSectionIndex(targetIndex, data.sections.length));
      setCompletionMessage(undefined);
      setAnswerRequiredMessage(undefined);
    }
  };

  const completeLesson = async () => {
    if (!requireCurrentSectionAnswers()) {
      return;
    }
    const saved = await persistTerminal(data, "completed", sectionIndex);
    if (saved === undefined) {
      return;
    }
    if (isPlanReview) {
      setPlanReviewCompleted(true);
    }
    try {
      await onComplete?.(data.lesson, saved);
      setCompletionMessage(
        "レッスンを完了しました。必要な項目は復習へ引き継がれます。",
      );
    } catch (error: unknown) {
      setSaveError(
        toError(
          error,
          "完了後の画面更新を終えられませんでした。もう一度お試しください。",
        ).message,
      );
    }
  };

  const skipLesson = async () => {
    const saved = await persistTerminal(data, "skipped", sectionIndex);
    if (saved === undefined) {
      return;
    }
    try {
      await onSkip?.(data.lesson, saved);
      setCompletionMessage(
        "学習済みとして記録しました。短い確認問題で必要なところだけ復習できます。",
      );
    } catch (error: unknown) {
      setSaveError(
        toError(
          error,
          "学習済み保存後の画面更新を終えられませんでした。もう一度お試しください。",
        ).message,
      );
    }
  };

  const interruptLesson = async () => {
    if (isTerminal) {
      onExit?.();
      return;
    }
    if (isPlanReview) {
      const saved = await persistReviewCheckpoint(
        data,
        sectionIndex,
        answeredExerciseIds,
      );
      if (saved !== undefined) {
        onExit?.();
      }
      return;
    }
    const saved = await persistProgress(data, sectionIndex);
    if (saved !== undefined) {
      onExit?.();
    }
  };

  return (
    <section className={styles.page} aria-labelledby="lesson-title">
      <header className={styles.lessonHeader}>
        <div>
          <p className={styles.eyebrow}>
            ステージ{data.lesson.stage}・{data.lesson.estimatedMinutes}分
          </p>
          <h1 id="lesson-title">{data.lesson.titleJa}</h1>
        </div>
        <Button
          variant="tertiary"
          onClick={() => {
            void interruptLesson();
          }}
          disabled={saving}
        >
          中断して戻る
        </Button>
      </header>

      <ProgressBar
        value={sectionIndex + 1}
        max={data.sections.length}
        label="レッスンの進み具合"
        valueText={`${sectionIndex + 1} / ${data.sections.length}`}
      />

      {data.progress?.status === "inProgress" ? (
        <InlineAlert tone="info">
          前回の続きから再開しました。いつでも前の説明へ戻れます。
        </InlineAlert>
      ) : null}
      {saveError !== undefined ? (
        <InlineAlert tone="danger" role="alert">
          {saveError}
        </InlineAlert>
      ) : null}
      {completionMessage !== undefined ? (
        <InlineAlert tone="success">{completionMessage}</InlineAlert>
      ) : null}

      <LessonSectionView
        section={currentSection}
        headingRef={headingRef}
        onExerciseResult={(result) => persistExerciseResult(data, result)}
      />

      {answerRequiredMessage !== undefined ? (
        <InlineAlert tone="warning" role="alert">
          {answerRequiredMessage}
        </InlineAlert>
      ) : null}

      <nav className={styles.navigation} aria-label="レッスン内の移動">
        <Button
          variant="secondary"
          disabled={saving || sectionIndex === 0}
          onClick={() => {
            void moveTo(sectionIndex - 1);
          }}
        >
          前へ
        </Button>
        {isTerminal ? (
          onExit !== undefined ? (
            <Button
              onClick={() => {
                void interruptLesson();
              }}
            >
              {planContext === undefined ? "コースへ戻る" : "今日の学習へ戻る"}
            </Button>
          ) : (
            <span className={styles.savedStatus} role="status">
              進捗を保存しました
            </span>
          )
        ) : isLastSection ? (
          <Button
            isLoading={saving}
            loadingLabel="保存中"
            onClick={() => {
              void completeLesson();
            }}
          >
            {isPlanReview ? "復習を完了" : "レッスンを完了"}
          </Button>
        ) : (
          <Button
            isLoading={saving}
            loadingLabel="保存中"
            onClick={() => {
              void moveTo(sectionIndex + 1);
            }}
          >
            次へ
          </Button>
        )}
      </nav>

      {!isTerminal && !isPlanReview ? (
        <div className={styles.skipArea}>
          <p>すでに知っている内容なら、学習済みとして記録できます。</p>
          <Button
            variant="tertiary"
            disabled={saving}
            onClick={() => {
              void skipLesson();
            }}
          >
            このレッスンを学習済みにする
          </Button>
        </div>
      ) : null}
    </section>
  );
}
