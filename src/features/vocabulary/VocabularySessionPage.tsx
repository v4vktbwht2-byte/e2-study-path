import { useEffect, useMemo, useRef, useState } from "react";
import type { StudySession } from "../../domain/models";
import type { ReviewConfidence, ReviewRating, ReviewState } from "../../domain/review";
import {
  rankQuickSortNewQueue,
  type QuickSortAnswer,
  type QuickSortResult,
} from "../../domain/vocabulary";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import {
  buildVocabularyCollections,
  buildVocabularyQuestion,
  formatPartOfSpeechJa,
  gradeVocabularyQuestion,
  prepareVocabularyCommit,
  primaryMeaning,
  reinsertAgainWithMinimumSpacing,
  reinsertNewConfirmationWithMinimumSpacing,
  selectRecordsForMode,
  selectVocabularyConfusionComparisons,
  selectVocabularyQuestionLevel,
  suggestVocabularyRating,
  summarizeVocabularySession,
} from "./model";
import { PronunciationButton } from "./PronunciationButton";
import styles from "./Vocabulary.module.css";
import type {
  VocabularyAnswerObservation,
  VocabularyQuestion,
  VocabularyQueueEntry,
  VocabularySessionPageProps,
  VocabularySessionSummary,
  VocabularyStudyRecord,
} from "./types";
import { supportsWebSpeech } from "./webSpeech";

const SYSTEM_CLOCK = { now: () => new Date() };

const MODE_TITLE = {
  new: "新しい単語",
  due: "期限の復習",
  weak: "苦手単語",
  quickSort: "5分高速チェック",
  listening: "聞き取り",
  spelling: "スペル",
  context: "文脈",
} as const;

const RATING_LABEL: Readonly<Record<ReviewRating, string>> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const CONFIDENCE_OPTIONS: readonly {
  value: ReviewConfidence;
  label: string;
}[] = [
  { value: "none", label: "自信なし" },
  { value: "low", label: "少し不安" },
  { value: "medium", label: "だいたい分かる" },
  { value: "high", label: "自信あり" },
];

interface SessionData {
  records: readonly VocabularyStudyRecord[];
  questionPool: readonly VocabularyStudyRecord[];
  session: StudySession;
  initialReviewStates: readonly ReviewState[];
}

interface DraftAnswer {
  response: unknown;
  correct: boolean;
  responseTimeMs: number;
  suggestedRating: ReviewRating;
}

interface PendingFinish {
  data: SessionData;
  observations: readonly VocabularyAnswerObservation[];
  reviewStates: readonly ReviewState[];
}

type LoadState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; data: SessionData }
  | { status: "error"; error: Error };

type SessionPhase =
  | "browse"
  | "quickSortClassification"
  | "question"
  | "feedback"
  | "finishing"
  | "summary";

function createSession(
  mode: VocabularySessionPageProps["mode"],
  records: readonly VocabularyStudyRecord[],
  now: Date,
): StudySession {
  const startedAt = now.toISOString();
  return {
    id: `vocabulary-session:${mode}:${startedAt}`,
    type: mode === "due" || mode === "weak" ? "review" : "vocabulary",
    startedAt,
    studyDate: startedAt.slice(0, 10),
    itemKeys: records.map((record) => record.itemKey),
    completedItemKeys: [],
    interrupted: false,
  };
}

function responseForQuestion(
  question: VocabularyQuestion,
  selectedChoice: number | undefined,
  textResponse: string,
): unknown {
  if (question.kind === "recognitionChoice" || question.kind === "recallChoice") {
    return selectedChoice;
  }
  return textResponse;
}

function questionPromptLanguage(question: VocabularyQuestion): "en" | undefined {
  return question.kind === "recognitionChoice" ||
    question.kind === "selfRecall" ||
    question.kind === "cloze"
    ? "en"
    : undefined;
}

function questionAnswerLanguage(question: VocabularyQuestion): "en" | undefined {
  return question.kind === "recognitionChoice" ? undefined : "en";
}

export function VocabularySessionPage({
  mode,
  content,
  store,
  clock = SYSTEM_CLOCK,
  limit = 5,
  level,
  onStart,
  onBack,
}: VocabularySessionPageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [queue, setQueue] = useState<VocabularyQueueEntry[]>([]);
  const [completedEntries, setCompletedEntries] = useState<VocabularyQueueEntry[]>([]);
  const [observations, setObservations] = useState<VocabularyAnswerObservation[]>([]);
  const [reviewStates, setReviewStates] = useState<ReviewState[]>([]);
  const [phase, setPhase] = useState<SessionPhase>("question");
  const [summary, setSummary] = useState<VocabularySessionSummary>();
  const [pendingFinish, setPendingFinish] = useState<PendingFinish>();
  const [browsedItemKeys, setBrowsedItemKeys] = useState<Set<string>>(() => new Set());
  const [selectedChoice, setSelectedChoice] = useState<number>();
  const [textResponse, setTextResponse] = useState("");
  const [confidence, setConfidence] = useState<ReviewConfidence>("medium");
  const [hintCount, setHintCount] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [selfRecallRevealed, setSelfRecallRevealed] = useState(false);
  const [quickSortAnswers, setQuickSortAnswers] = useState<QuickSortAnswer[]>([]);
  const [draftAnswer, setDraftAnswer] = useState<DraftAnswer>();
  const [validationMessage, setValidationMessage] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const questionStartedAtRef = useRef(0);
  const attemptSequenceRef = useRef(0);

  useEffect(() => {
    let active = true;
    const startedAt = clock.now();
    setLoadState({ status: "loading" });
    setQueue([]);
    setCompletedEntries([]);
    setObservations([]);
    setSummary(undefined);
    setPendingFinish(undefined);
    setBrowsedItemKeys(new Set());
    setQuickSortAnswers([]);
    setSaveError(undefined);
    attemptSequenceRef.current = 0;

    void Promise.all([content.listVocabulary(), store.loadSnapshot()])
      .then(async ([items, snapshot]) => {
        const collections = buildVocabularyCollections(items, snapshot, startedAt);
        const records = selectRecordsForMode(collections, mode, limit);
        if (!active) {
          return;
        }
        if (records.length === 0) {
          setLoadState({ status: "empty" });
          return;
        }
        const session = createSession(mode, records, startedAt);
        await store.startSession(session);
        if (!active) {
          return;
        }
        const entries = records.map((record): VocabularyQueueEntry => ({
          itemKey: record.itemKey,
          record,
          level: selectVocabularyQuestionLevel(record, mode, startedAt, level),
          repeated: false,
        }));
        setQueue(entries);
        setReviewStates([...snapshot.reviewStates]);
        setPhase(
          mode === "new"
            ? "browse"
            : mode === "quickSort"
              ? "quickSortClassification"
              : "question",
        );
        questionStartedAtRef.current = clock.now().getTime();
        setLoadState({
          status: "ready",
          data: {
            records,
            questionPool: collections.all,
            session,
            initialReviewStates: snapshot.reviewStates,
          },
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            error:
              error instanceof Error
                ? error
                : new Error("単語セッションを開始できませんでした。"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [clock, content, level, limit, mode, reloadKey, store]);

  const currentEntry = queue[0];
  const currentQuestion = useMemo(() => {
    if (currentEntry === undefined || loadState.status !== "ready") {
      return undefined;
    }
    return buildVocabularyQuestion(
      currentEntry.record,
      loadState.data.questionPool,
      currentEntry.level === 7 && !supportsWebSpeech() ? 5 : currentEntry.level,
    );
  }, [currentEntry, loadState]);

  const confusionComparisons = useMemo(() => {
    if (
      loadState.status !== "ready" ||
      currentEntry === undefined ||
      currentQuestion === undefined ||
      draftAnswer?.correct !== false
    ) {
      return [];
    }
    const confusedWithItemKey =
      typeof draftAnswer.response === "number"
        ? currentQuestion.choiceItemKeys?.[draftAnswer.response]
        : undefined;
    return selectVocabularyConfusionComparisons(
      currentEntry.record,
      loadState.data.questionPool,
      confusedWithItemKey,
    );
  }, [currentEntry, currentQuestion, draftAnswer, loadState]);

  useEffect(() => {
    if (currentEntry === undefined) {
      return;
    }
    setSelectedChoice(undefined);
    setTextResponse("");
    setConfidence("medium");
    setHintCount(0);
    setHintVisible(false);
    setSelfRecallRevealed(false);
    setDraftAnswer(undefined);
    setValidationMessage(undefined);
    setSaveError(undefined);
    questionStartedAtRef.current = clock.now().getTime();
  }, [clock, currentEntry]);

  const resetQuestionState = () => {
    setSelectedChoice(undefined);
    setTextResponse("");
    setConfidence("medium");
    setHintCount(0);
    setHintVisible(false);
    setSelfRecallRevealed(false);
    setDraftAnswer(undefined);
    setValidationMessage(undefined);
    setSaveError(undefined);
    questionStartedAtRef.current = clock.now().getTime();
  };

  const classifyQuickSort = (result: QuickSortResult) => {
    if (
      currentEntry === undefined ||
      loadState.status !== "ready" ||
      phase !== "quickSortClassification"
    ) {
      return;
    }
    const nextAnswers = [
      ...quickSortAnswers,
      { itemKey: currentEntry.itemKey, result },
    ];
    const remaining = queue.slice(1);
    setQuickSortAnswers(nextAnswers);
    if (remaining.length > 0) {
      setQueue(remaining);
      return;
    }

    const recordsByItemKey = new Map(
      loadState.data.records.map((record) => [record.itemKey, record] as const),
    );
    const verificationQueue = rankQuickSortNewQueue(nextAnswers).flatMap((ranked) => {
      const record = recordsByItemKey.get(ranked.itemKey);
      return record === undefined
        ? []
        : [
            {
              itemKey: record.itemKey,
              record,
              level: ranked.recommendedLevel,
              repeated: false,
            } satisfies VocabularyQueueEntry,
          ];
    });
    setQueue(verificationQueue);
    resetQuestionState();
    setPhase("question");
    questionStartedAtRef.current = clock.now().getTime();
  };

  const beginQuestion = () => {
    if (currentEntry === undefined) return;
    setBrowsedItemKeys((current) => {
      const next = new Set(current);
      next.add(currentEntry.itemKey);
      return next;
    });
    setPhase("question");
    questionStartedAtRef.current = clock.now().getTime();
  };

  const evaluate = (response: unknown, correctOverride?: boolean) => {
    if (currentQuestion === undefined) {
      return;
    }
    const isMissing =
      response === undefined ||
      (typeof response === "string" && response.trim().length === 0);
    if (isMissing) {
      setValidationMessage("答えを選ぶか入力してから確認してください。");
      return;
    }
    const responseTimeMs = Math.max(
      0,
      clock.now().getTime() - questionStartedAtRef.current,
    );
    const correct =
      correctOverride ?? gradeVocabularyQuestion(currentQuestion, response);
    const suggestedRating = suggestVocabularyRating({
      question: currentQuestion,
      correct,
      confidence,
      hintCount,
      responseTimeMs,
    });
    setDraftAnswer({
      response,
      correct,
      responseTimeMs,
      suggestedRating,
    });
    setValidationMessage(undefined);
    setPhase("feedback");
  };

  const finishAndSummarize = async (pending: PendingFinish) => {
    setSaving(true);
    setSaveError(undefined);
    try {
      const endedAt = clock.now();
      await store.finishSession(pending.data.session.id, endedAt.toISOString());
      setSummary(
        summarizeVocabularySession(
          pending.observations,
          pending.reviewStates.filter((state) =>
            pending.data.session.itemKeys.includes(state.itemKey),
          ),
          endedAt,
        ),
      );
      setPendingFinish(undefined);
      setPhase("summary");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "セッションの終了処理を完了できませんでした。",
      );
      setPendingFinish(pending);
      setPhase("finishing");
    } finally {
      setSaving(false);
    }
  };

  const commitRating = async (finalRating: ReviewRating) => {
    if (
      loadState.status !== "ready" ||
      currentEntry === undefined ||
      currentQuestion === undefined ||
      draftAnswer === undefined
    ) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    const now = clock.now();
    const nextAttemptSequence = attemptSequenceRef.current + 1;
    const attemptId = `${loadState.data.session.id}:attempt:${nextAttemptSequence}`;
    const observation: VocabularyAnswerObservation = {
      question: currentQuestion,
      response: draftAnswer.response,
      correct: draftAnswer.correct,
      confidence,
      hintCount,
      responseTimeMs: draftAnswer.responseTimeMs,
      suggestedRating: draftAnswer.suggestedRating,
      finalRating,
    };
    const hadEarlierAgain = observations.some(
      (value) =>
        value.question.itemKey === currentEntry.itemKey &&
        value.finalRating === "again",
    );

    try {
      const result = await store.commitAnswer(
        prepareVocabularyCommit({
          record: currentEntry.record,
          question: currentQuestion,
          response: draftAnswer.response,
          correct: draftAnswer.correct,
          confidence,
          hintCount,
          responseTimeMs: draftAnswer.responseTimeMs,
          suggestedRating: draftAnswer.suggestedRating,
          finalRating,
          sessionId: loadState.data.session.id,
          attemptId,
          studyDate: loadState.data.session.studyDate,
          now,
          correctAfterAgain: hadEarlierAgain && draftAnswer.correct,
          confusedWithItemKey: confusionComparisons.find(
            (comparison) => comparison.isRecordedConfusion,
          )?.itemKey,
        }),
      );
      attemptSequenceRef.current = nextAttemptSequence;
      const updatedRecord: VocabularyStudyRecord = {
        ...currentEntry.record,
        reviewState: result.reviewState,
        mastery: result.mastery,
        recentAttempts: [result.attempt, ...currentEntry.record.recentAttempts].slice(
          0,
          20,
        ),
      };
      const updatedEntry: VocabularyQueueEntry = {
        ...currentEntry,
        record: updatedRecord,
      };
      const remaining = queue
        .slice(1)
        .map((entry) =>
          entry.itemKey === updatedEntry.itemKey
            ? { ...entry, record: updatedRecord }
            : entry,
        );
      const needsNewConfirmation =
        mode === "new" &&
        ((!currentEntry.repeated && finalRating !== "easy") ||
          (currentEntry.repeated && finalRating === "again"));
      const nextQueue = needsNewConfirmation
        ? reinsertNewConfirmationWithMinimumSpacing(
            remaining,
            updatedEntry,
            completedEntries,
          )
        : finalRating === "again"
          ? reinsertAgainWithMinimumSpacing(remaining, updatedEntry, completedEntries)
          : remaining;
      const nextCompleted = [...completedEntries, updatedEntry];
      const nextObservations = [...observations, observation];
      const nextReviewStates = [
        ...reviewStates.filter((state) => state.itemKey !== result.reviewState.itemKey),
        result.reviewState,
      ];
      setCompletedEntries(nextCompleted);
      setObservations(nextObservations);
      setReviewStates(nextReviewStates);
      setQueue(nextQueue);

      if (nextQueue.length === 0) {
        const pending = {
          data: loadState.data,
          observations: nextObservations,
          reviewStates: nextReviewStates,
        };
        setPendingFinish(pending);
        setPhase("finishing");
        await finishAndSummarize(pending);
      } else {
        const nextEntry = nextQueue[0];
        const shouldBrowse =
          mode === "new" &&
          nextEntry !== undefined &&
          !nextEntry.repeated &&
          !browsedItemKeys.has(nextEntry.itemKey);
        resetQuestionState();
        setPhase(shouldBrowse ? "browse" : "question");
      }
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "回答を保存できませんでした。もう一度お試しください。",
      );
    } finally {
      setSaving(false);
    }
  };

  const endSessionEarly = async () => {
    if (loadState.status !== "ready") return;
    const pending = {
      data: loadState.data,
      observations,
      reviewStates,
    };
    setPendingFinish(pending);
    setPhase("finishing");
    await finishAndSummarize(pending);
  };

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <p role="status">単語セッションを準備しています。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="単語セッションを開始できませんでした"
          description={loadState.error.message}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </section>
    );
  }
  if (loadState.status === "empty") {
    return (
      <section className={styles.page}>
        <h1>{MODE_TITLE[mode]}</h1>
        <EmptyState
          title="今取り組む単語はありません"
          description="別の単語メニューを選んでください。"
          actions={
            onBack !== undefined ? (
              <Button onClick={onBack}>単語ハブへ戻る</Button>
            ) : undefined
          }
        />
      </section>
    );
  }

  if (phase === "finishing" && pendingFinish !== undefined) {
    return (
      <section className={styles.page} aria-labelledby="vocabulary-finishing-title">
        <header>
          <p className={styles.eyebrow}>{MODE_TITLE[mode]}</p>
          <h1 id="vocabulary-finishing-title">セッションを終了しています</h1>
        </header>
        {saveError !== undefined ? (
          <InlineAlert
            tone="danger"
            title="終了処理を完了できませんでした"
            role="alert"
          >
            {saveError}
          </InlineAlert>
        ) : (
          <p role="status">回答は保存済みです。終了処理を進めています。</p>
        )}
        {saveError !== undefined ? (
          <Button
            onClick={() => {
              void finishAndSummarize(pendingFinish);
            }}
            disabled={saving}
          >
            終了処理だけ再試行
          </Button>
        ) : null}
      </section>
    );
  }

  if (phase === "summary" && summary !== undefined) {
    return (
      <section className={styles.page} aria-labelledby="vocabulary-summary-title">
        <header>
          <p className={styles.eyebrow}>{MODE_TITLE[mode]}</p>
          <h1 id="vocabulary-summary-title">セッションを終えました</h1>
          <p>曖昧な項目は次回の復習へ引き継がれます。</p>
        </header>
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <span>学習語数</span>
            <strong>{summary.studiedCount}語</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>回答数</span>
            <strong>{summary.answerCount}回</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>初回成功</span>
            <strong>{summary.firstTrySuccessCount}語</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>再学習で確認</span>
            <strong>{summary.relearnedCount}語</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>まだ曖昧</span>
            <strong>{summary.uncertainCount}語</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>本日中の次回復習</span>
            <strong>{summary.nextDueTodayCount}語</strong>
          </Card>
          <Card className={styles.summaryCard}>
            <span>翌日以降</span>
            <strong>{summary.nextDueLaterCount}語</strong>
          </Card>
        </div>
        <div className={styles.actionRow}>
          <Button onClick={() => onStart?.(mode)}>追加で5分続ける</Button>
          {onBack !== undefined ? (
            <Button variant="secondary" onClick={onBack}>
              単語ハブへ戻る
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (currentEntry === undefined || currentQuestion === undefined) {
    return (
      <section className={styles.page}>
        <ErrorState
          title="次の問題を準備できませんでした"
          description="単語ハブへ戻って、もう一度お試しください。"
          actions={
            onBack !== undefined ? (
              <Button onClick={onBack}>単語ハブへ戻る</Button>
            ) : undefined
          }
        />
      </section>
    );
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (clock.now().getTime() - new Date(loadState.data.session.startedAt).getTime()) /
        60_000,
    ),
  );
  const answeredUnique = new Set(
    observations.map((observation) => observation.question.itemKey),
  ).size;
  const total = loadState.data.records.length;
  const item = currentEntry.record.item;

  return (
    <section className={styles.page} aria-labelledby="vocabulary-session-title">
      <header className={styles.sessionHeader}>
        <div>
          <p className={styles.eyebrow}>{MODE_TITLE[mode]}</p>
          <h1 id="vocabulary-session-title">
            残り{queue.length}問・経過約{elapsedMinutes}分
          </h1>
        </div>
        <Button
          variant="tertiary"
          onClick={() => {
            void endSessionEarly();
          }}
          disabled={saving}
        >
          セッションを終了
        </Button>
      </header>

      <ProgressBar
        value={answeredUnique}
        max={total}
        label="学習した単語"
        valueText={`${answeredUnique} / ${total}`}
      />
      {saveError !== undefined ? (
        <InlineAlert tone="danger" role="alert">
          {saveError}
        </InlineAlert>
      ) : null}

      {phase === "quickSortClassification" ? (
        <Card as="article" className={styles.questionCard}>
          <p className={styles.eyebrow}>
            自己分類 {quickSortAnswers.length + 1} / {total}
          </p>
          <h2 className={styles.questionPrompt} lang="en">
            {item.headword}
          </h2>
          <p>今の感覚に近いものを選んでください。</p>
          <InlineAlert tone="info">
            この自己申告は保存せず、全件分類後の確認問題だけを学習記録にします。
          </InlineAlert>
          <div className={styles.actionRow}>
            <Button onClick={() => classifyQuickSort("known")}>知っている</Button>
            <Button variant="secondary" onClick={() => classifyQuickSort("unsure")}>
              あやしい
            </Button>
            <Button variant="tertiary" onClick={() => classifyQuickSort("unknown")}>
              知らない
            </Button>
          </div>
        </Card>
      ) : phase === "browse" ? (
        <Card as="article" className={styles.browseCard}>
          <p className={styles.eyebrow}>閲覧カード・まだ採点しません</p>
          <h2 className={styles.browseWord} lang="en">
            {item.headword}
          </h2>
          <p>
            {formatPartOfSpeechJa(item.partOfSpeech)}・{primaryMeaning(item)}
          </p>
          <PronunciationButton text={item.headword} />
          {item.exampleSentences[0] !== undefined ? (
            <div className={styles.example}>
              <p lang="en">{item.exampleSentences[0].en}</p>
              <p>{item.exampleSentences[0].ja}</p>
            </div>
          ) : null}
          <Button onClick={beginQuestion}>答えを隠して想起問題へ</Button>
        </Card>
      ) : (
        <Card as="article" className={styles.questionCard}>
          <p className={styles.eyebrow}>
            想起問題 Level {currentQuestion.level}
            {currentEntry.repeated ? "・再確認" : ""}
          </p>
          <h2
            className={styles.questionPrompt}
            lang={questionPromptLanguage(currentQuestion)}
          >
            {currentQuestion.prompt}
          </h2>
          <p>{currentQuestion.instructionsJa}</p>

          {currentEntry.level === 7 && currentQuestion.level !== 7 ? (
            <InlineAlert
              tone="warning"
              title="音声を使えないためスペル練習へ切り替えました"
            >
              正答は表示せずに回答できます。この問題では聞き取り習熟度を更新しません。
            </InlineAlert>
          ) : null}
          {currentQuestion.kind === "dictation" &&
          currentQuestion.speechText !== undefined ? (
            <PronunciationButton text={currentQuestion.speechText} />
          ) : null}
          {currentQuestion.passage !== undefined ? (
            <p className={styles.example}>{currentQuestion.passage}</p>
          ) : null}

          {currentQuestion.kind === "recognitionChoice" ||
          currentQuestion.kind === "recallChoice" ? (
            <fieldset className={styles.choiceList} disabled={phase === "feedback"}>
              <legend className={styles.srOnly}>答えを1つ選んでください</legend>
              {currentQuestion.choices.map((choice, index) => (
                <label key={`${choice}-${index}`} className={styles.choice}>
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={selectedChoice === index}
                    onChange={() => {
                      setSelectedChoice(index);
                      setValidationMessage(undefined);
                    }}
                  />
                  <span
                    lang={currentQuestion.kind === "recallChoice" ? "en" : undefined}
                  >
                    {choice}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : currentQuestion.kind === "selfRecall" ? (
            selfRecallRevealed ? (
              <div className={styles.detailSection}>
                <InlineAlert tone="info" title="答え">
                  {primaryMeaning(item)}
                </InlineAlert>
                {phase === "question" ? (
                  <div className={styles.actionRow}>
                    <Button onClick={() => evaluate(true)}>思い出せた</Button>
                    <Button variant="secondary" onClick={() => evaluate(false)}>
                      まだ曖昧
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Button onClick={() => setSelfRecallRevealed(true)}>
                思い出してから答えを表示
              </Button>
            )
          ) : (
            <label className={styles.field}>
              <span>英語で回答</span>
              <input
                className={styles.answerInput}
                value={textResponse}
                disabled={phase === "feedback"}
                autoComplete="off"
                lang="en"
                onChange={(event) => {
                  setTextResponse(event.target.value);
                  setValidationMessage(undefined);
                }}
              />
            </label>
          )}

          {mode === "quickSort" ? (
            <InlineAlert tone="info">
              自己申告だけでは習得扱いにしません。この確認問題への回答だけを保存します。
            </InlineAlert>
          ) : null}

          <label className={styles.field}>
            <span>今の自信度</span>
            <select
              value={confidence}
              disabled={phase === "feedback"}
              onChange={(event) =>
                setConfidence(event.target.value as ReviewConfidence)
              }
            >
              {CONFIDENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {hintVisible && currentQuestion.hintJa !== undefined ? (
            <InlineAlert tone="info" title="ヒント">
              {currentQuestion.hintJa}
            </InlineAlert>
          ) : null}
          {validationMessage !== undefined ? (
            <InlineAlert tone="warning" role="alert">
              {validationMessage}
            </InlineAlert>
          ) : null}

          {phase === "question" && currentQuestion.kind !== "selfRecall" ? (
            <div className={styles.actionRow}>
              {currentQuestion.hintJa !== undefined && !hintVisible ? (
                <Button
                  variant="tertiary"
                  onClick={() => {
                    setHintVisible(true);
                    setHintCount((value) => value + 1);
                  }}
                >
                  ヒントを見る
                </Button>
              ) : null}
              <Button
                onClick={() =>
                  evaluate(
                    responseForQuestion(currentQuestion, selectedChoice, textResponse),
                  )
                }
              >
                答えを確認
              </Button>
            </div>
          ) : null}

          {phase === "feedback" && draftAnswer !== undefined ? (
            <div className={styles.detailSection}>
              <InlineAlert
                tone={draftAnswer.correct ? "success" : "warning"}
                title={
                  draftAnswer.correct
                    ? "確認できました"
                    : "ここをもう一度見てみましょう"
                }
              >
                正答:{" "}
                <strong lang={questionAnswerLanguage(currentQuestion)}>
                  {typeof currentQuestion.answer === "number"
                    ? currentQuestion.choices[currentQuestion.answer]
                    : item.headword}
                </strong>
                <br />
                {primaryMeaning(item)}
              </InlineAlert>
              {confusionComparisons.length > 0 ? (
                <section
                  className={styles.confusionPanel}
                  aria-labelledby="confusion-comparison-title"
                >
                  <h3 id="confusion-comparison-title">混同語を比べる</h3>
                  <p className={styles.muted}>
                    似た語を並べて、意味と使い方の違いを確認しましょう。
                  </p>
                  <div className={styles.confusionGrid}>
                    <div className={styles.confusionItem}>
                      <span className={styles.eyebrow}>今回の単語</span>
                      <strong lang="en">{item.headword}</strong>
                      <span>{primaryMeaning(item)}</span>
                      {item.exampleSentences[0] !== undefined ? (
                        <div className={styles.example}>
                          <p lang="en">{item.exampleSentences[0].en}</p>
                          <p>{item.exampleSentences[0].ja}</p>
                        </div>
                      ) : null}
                    </div>
                    {confusionComparisons.map((comparison) => (
                      <div className={styles.confusionItem} key={comparison.itemKey}>
                        <span className={styles.eyebrow}>
                          {comparison.isRecordedConfusion
                            ? "今回選んだ語"
                            : "比較する語"}
                        </span>
                        <strong lang="en">{comparison.headword}</strong>
                        <span>{comparison.meaningJa}</span>
                        {comparison.exampleEn !== undefined ? (
                          <div className={styles.example}>
                            <p lang="en">{comparison.exampleEn}</p>
                            {comparison.exampleJa !== undefined ? (
                              <p>{comparison.exampleJa}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <p>
                推奨評価: <strong>{RATING_LABEL[draftAnswer.suggestedRating]}</strong>
                。必要なら変更できます。
              </p>
              <div className={styles.ratingRow} aria-label="最終評価を選択">
                {(["again", "hard", "good", "easy"] as const).map((rating) => (
                  <Button
                    key={rating}
                    variant={
                      rating === draftAnswer.suggestedRating ? "primary" : "secondary"
                    }
                    className={
                      rating === draftAnswer.suggestedRating
                        ? styles.selectedRating
                        : undefined
                    }
                    onClick={() => {
                      void commitRating(rating);
                    }}
                    disabled={saving}
                    aria-label={`${RATING_LABEL[rating]}${
                      rating === draftAnswer.suggestedRating ? "、推奨" : ""
                    }`}
                  >
                    {RATING_LABEL[rating]}
                  </Button>
                ))}
              </div>
              {saving ? <p role="status">回答を保存しています。</p> : null}
            </div>
          ) : null}
        </Card>
      )}
    </section>
  );
}
