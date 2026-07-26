import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import type {
  DiagnosticPlacement,
  DiagnosticResponse,
  DiagnosticStage,
} from "../../domain/diagnostic";
import type { UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import { getAppDb } from "../../infrastructure/db/appDb";
import { DexieProfileRepository } from "../../infrastructure/db/repositories";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import {
  createDiagnosticPlacement,
  createDiagnosticRun,
  finalizeAndSaveDiagnosticRun,
  getFirstDiagnosticLessons,
  getNextDiagnosticQuestion,
  isCorrectDiagnosticAnswer,
  loadOrCreateDiagnosticRun,
  recordAndSaveDiagnosticResponse,
  saveDiagnosticPlacement,
  saveSelectedDiagnosticStage,
  validateDiagnosticQuestions,
} from "./service";
import { AppDbDiagnosticSessionStore } from "./storage";
import type {
  DiagnosticCompletion,
  DiagnosticLessonSummary,
  DiagnosticMode,
  DiagnosticQuestionContent,
  DiagnosticSessionStore,
  SavedDiagnosticRun,
} from "./types";
import styles from "./DiagnosticPage.module.css";

type DiagnosticView = "loading" | "question" | "result" | "empty" | "error";

const EMPTY_QUESTIONS: readonly DiagnosticQuestionContent[] = [];
const EMPTY_LESSONS: readonly DiagnosticLessonSummary[] = [];
const DEFAULT_NOW = () => new Date();

const STAGE_TITLES: Readonly<Record<DiagnosticStage, string>> = {
  0: "文字と音に慣れる",
  1: "英語の1文を作る",
  2: "時制と比べ方を広げる",
  3: "文をつなげて詳しく伝える",
  4: "まとまりのある英文を読む",
  5: "複数技能を組み合わせる",
  6: "英検2級相当の総合練習",
};

export interface DiagnosticPageProps {
  questions?: readonly DiagnosticQuestionContent[];
  lessons?: readonly DiagnosticLessonSummary[];
  profileRepository?: ProfileRepository;
  sessionStore?: DiagnosticSessionStore;
  mode?: DiagnosticMode;
  now?: () => Date;
  onComplete?: (
    completion: DiagnosticCompletion,
    profile: UserProfile,
  ) => void | Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "診断を保存できませんでした。もう一度お試しください。";
}

function toDiagnosticStage(value: number): DiagnosticStage {
  return Math.min(6, Math.max(0, Math.round(value))) as DiagnosticStage;
}

export function DiagnosticPage({
  questions = EMPTY_QUESTIONS,
  lessons = EMPTY_LESSONS,
  profileRepository,
  sessionStore,
  mode = "initial",
  now = DEFAULT_NOW,
  onComplete,
}: DiagnosticPageProps) {
  const navigate = useNavigate();
  const defaultRepository = useMemo(() => new DexieProfileRepository(getAppDb()), []);
  const defaultStore = useMemo(() => new AppDbDiagnosticSessionStore(), []);
  const repository = profileRepository ?? defaultRepository;
  const store = sessionStore ?? defaultStore;
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const speechQuestionIdRef = useRef<string | undefined>(undefined);
  const [view, setView] = useState<DiagnosticView>("loading");
  const [run, setRun] = useState<SavedDiagnosticRun>();
  const [placement, setPlacement] = useState<DiagnosticPlacement>();
  const [selectedStage, setSelectedStage] = useState<DiagnosticStage>(0);
  const [answer, setAnswer] = useState("");
  const [audioFailed, setAudioFailed] = useState(false);
  const [speechFailed, setSpeechFailed] = useState(false);
  const [speechSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined",
  );
  const [resumed, setResumed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const currentQuestion =
    run && !run.session.isComplete ? getNextDiagnosticQuestion(run, questions) : null;

  const completeRun = useCallback(
    async (completedRun: SavedDiagnosticRun) => {
      const result = createDiagnosticPlacement(completedRun);
      await saveDiagnosticPlacement(repository, result, mode, completedRun.updatedAt);
      setPlacement(result);
      setSelectedStage(result.recommendedStage);
      setRun(completedRun);
      setAnswer("");
      setView("result");
    },
    [mode, repository],
  );

  const showRun = useCallback(
    async (candidate: SavedDiagnosticRun) => {
      let nextRun = candidate;
      if (
        !nextRun.session.isComplete &&
        getNextDiagnosticQuestion(nextRun, questions) === null
      ) {
        nextRun = await finalizeAndSaveDiagnosticRun(
          store,
          nextRun,
          now().toISOString(),
        );
      }

      if (nextRun.session.isComplete) {
        setRun(nextRun);
        try {
          await completeRun(nextRun);
        } catch (error) {
          setView("error");
          throw error;
        }
        return;
      }

      setRun(nextRun);
      setAnswer("");
      setView("question");
    },
    [completeRun, now, questions, store],
  );

  const initialize = useCallback(async () => {
    setView("loading");
    setErrorMessage(undefined);
    setPlacement(undefined);

    if (questions.length === 0) {
      setView("empty");
      return;
    }

    const validationErrors = validateDiagnosticQuestions(questions);
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join("\n"));
      setView("error");
      return;
    }

    try {
      const loaded = await loadOrCreateDiagnosticRun(store, mode, now().toISOString());
      setResumed(loaded.resumed);
      await showRun(loaded.run);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setView("error");
    }
  }, [mode, now, questions, showRun, store]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (view === "question") {
      questionHeadingRef.current?.focus();
    } else if (view === "result" || view === "empty" || view === "error") {
      pageHeadingRef.current?.focus();
    }
  }, [currentQuestion?.id, view]);

  useEffect(() => {
    setAudioFailed(false);
    setSpeechFailed(false);
    return () => {
      if (speechSupported) {
        speechQuestionIdRef.current = undefined;
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion?.id, speechSupported]);

  const recordResponse = async (response: DiagnosticResponse) => {
    if (!run || !currentQuestion || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);
    try {
      const updated = await recordAndSaveDiagnosticResponse(
        store,
        run,
        currentQuestion,
        response,
        now().toISOString(),
      );
      setResumed(false);
      await showRun(updated);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!currentQuestion) {
      return;
    }
    if (answer.trim() === "") {
      setErrorMessage(
        "答えを選ぶか入力してください。分からない場合は専用ボタンを使えます。",
      );
      return;
    }

    void recordResponse(
      isCorrectDiagnosticAnswer(currentQuestion, answer) ? "correct" : "incorrect",
    );
  };

  const restart = async () => {
    setIsSaving(true);
    setErrorMessage(undefined);
    try {
      await store.clear(mode);
      const fresh = createDiagnosticRun(mode, now().toISOString());
      await store.save(fresh);
      setResumed(false);
      await showRun(fresh);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setView("error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStage = async () => {
    if (!placement || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);
    try {
      const profile = await saveSelectedDiagnosticStage(
        repository,
        selectedStage,
        now().toISOString(),
      );
      await store.clear(mode);
      const completion: DiagnosticCompletion = {
        selectedStage,
        recommendedStage: placement.recommendedStage,
      };
      if (onComplete) {
        await onComplete(completion, profile);
      } else {
        await navigate("/");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (view === "loading") {
    return (
      <section className={styles.page} aria-busy="true" aria-live="polite">
        <Card as="section" className={styles.centered}>
          <p role="status">診断の続きがあるか確認しています…</p>
        </Card>
      </section>
    );
  }

  if (view === "empty") {
    return (
      <section className={styles.page}>
        <h1 ref={pageHeadingRef} className={styles.pageTitle} tabIndex={-1}>
          初期診断
        </h1>
        <EmptyState
          title="診断問題を読み込めませんでした"
          description="教材の準備が完了していません。学習データは変更されていません。少し待ってから、もう一度開いてください。"
        />
      </section>
    );
  }

  if (view === "error") {
    const canDiscardSavedRun = errorMessage?.includes("保存されている診断");
    return (
      <section className={styles.page}>
        <h1 ref={pageHeadingRef} className={styles.pageTitle} tabIndex={-1}>
          初期診断
        </h1>
        <ErrorState
          title="診断を開けませんでした"
          description={errorMessage}
          onRetry={() => void initialize()}
          actions={
            canDiscardSavedRun ? (
              <Button
                variant="tertiary"
                disabled={isSaving}
                onClick={() => void restart()}
              >
                途中状態を破棄して最初から
              </Button>
            ) : undefined
          }
        />
      </section>
    );
  }

  if (view === "result" && placement) {
    const firstLessons = getFirstDiagnosticLessons(lessons, selectedStage);

    return (
      <article className={styles.page} aria-labelledby="diagnostic-result-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>診断が終わりました</p>
          <h1
            ref={pageHeadingRef}
            id="diagnostic-result-title"
            className={styles.pageTitle}
            tabIndex={-1}
          >
            おすすめの開始地点
          </h1>
          <p className={styles.recommendation}>
            ステージ{placement.recommendedStage}：
            {STAGE_TITLES[placement.recommendedStage]}
          </p>
          <p className={styles.supportive}>
            これは合否や公式スコアではなく、最初に学ぶ場所の提案です。
          </p>
        </header>

        {errorMessage ? (
          <InlineAlert tone="danger" title="保存できませんでした">
            {errorMessage}
          </InlineAlert>
        ) : null}

        <div className={styles.resultGrid}>
          <Card as="section" padding="large">
            <h2 className={styles.sectionTitle}>すでにできていること</h2>
            {placement.strengths.length > 0 ? (
              <ul className={styles.list}>
                {placement.strengths.map((insight) => (
                  <li key={insight.area}>{insight.label}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>
                ここから一緒に確認できます。できていないという意味ではありません。
              </p>
            )}
          </Card>

          <Card as="section" padding="large">
            <h2 className={styles.sectionTitle}>最初に確認すること</h2>
            {placement.gaps.length > 0 ? (
              <ul className={styles.list}>
                {placement.gaps.map((insight) => (
                  <li key={insight.area}>{insight.label}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>
                大きな苦手は見つかりませんでした。おすすめ地点から進めましょう。
              </p>
            )}
          </Card>
        </div>

        <Card as="section" padding="large">
          <h2 className={styles.sectionTitle}>最初の3レッスン</h2>
          {firstLessons.length > 0 ? (
            <ol className={styles.lessonList}>
              {firstLessons.map((lesson) => (
                <li key={lesson.id}>
                  <strong>{lesson.titleJa}</strong>
                  {lesson.descriptionJa ? <span>{lesson.descriptionJa}</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="このステージのレッスンを準備しています"
              description="開始地点は保存できます。教材を読み込んだあと、コース画面にレッスンが表示されます。"
            />
          )}
          {firstLessons.length > 0 && firstLessons.length < 3 ? (
            <InlineAlert title="表示できるレッスンが3件未満です" tone="warning">
              残りの教材を読み込むと、続きのレッスンが表示されます。
            </InlineAlert>
          ) : null}
        </Card>

        <Card as="section" padding="large" tone="muted">
          <label className={styles.stageField}>
            <span>開始ステージを手動で変更</span>
            <select
              value={selectedStage}
              onChange={(event) =>
                setSelectedStage(toDiagnosticStage(Number(event.currentTarget.value)))
              }
            >
              {Array.from({ length: 7 }, (_, stage) => (
                <option key={stage} value={stage}>
                  ステージ{stage}：{STAGE_TITLES[toDiagnosticStage(stage)]}
                </option>
              ))}
            </select>
            <small>おすすめに固定されません。いつでも設定から変更できます。</small>
          </label>
        </Card>

        <p className={styles.summary}>
          回答 {placement.answeredCount}問・分からない／スキップ{" "}
          {placement.skippedCount}問
        </p>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="tertiary"
            disabled={isSaving}
            onClick={() => void restart()}
          >
            もう一度診断する
          </Button>
          <Button
            type="button"
            size="large"
            isLoading={isSaving}
            onClick={() => void confirmStage()}
          >
            このステージから始める
          </Button>
        </div>
      </article>
    );
  }

  if (!run || !currentQuestion) {
    return null;
  }

  const questionNumber = Math.min(
    run.session.answers.length + 1,
    run.session.maxQuestions,
  );
  const instructionsId = `diagnostic-instructions-${currentQuestion.id}`;
  const canUseSpeech =
    Boolean(currentQuestion.audioTranscript) && speechSupported && !speechFailed;
  const listeningUnavailable =
    currentQuestion.kind === "listeningChoice" &&
    (!currentQuestion.audioSrc || audioFailed) &&
    !canUseSpeech;

  const playSpeech = () => {
    if (!currentQuestion.audioTranscript || !canUseSpeech) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.audioTranscript);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      speechQuestionIdRef.current = currentQuestion.id;
      utterance.onerror = () => {
        if (speechQuestionIdRef.current === currentQuestion.id) {
          setSpeechFailed(true);
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeechFailed(true);
    }
  };

  return (
    <article className={styles.page} aria-labelledby="diagnostic-page-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          問題 {questionNumber} / 最大{run.session.maxQuestions}
        </p>
        <ProgressBar
          label="診断の進み具合"
          value={run.session.answers.length}
          max={run.session.maxQuestions}
          valueText={`${run.session.answers.length}問回答済み`}
        />
        <h1 id="diagnostic-page-title" className={styles.pageTitle}>
          初期診断
        </h1>
        <p className={styles.supportive}>
          分からなくても大丈夫です。難しい問題が続かないように調整します。
        </p>
      </header>

      {resumed ? (
        <InlineAlert title="前回の続きから再開しました">
          {run.session.answers.length}問目までの回答を、この端末に保存しています。
        </InlineAlert>
      ) : null}

      {errorMessage ? (
        <InlineAlert tone="danger" title="回答を保存できませんでした">
          {errorMessage}
        </InlineAlert>
      ) : null}

      <Card as="section" padding="large" className={styles.questionCard}>
        <h2 ref={questionHeadingRef} className={styles.questionTitle} tabIndex={-1}>
          {currentQuestion.prompt}
        </h2>
        {currentQuestion.instructionsJa ? (
          <p id={instructionsId} className={styles.instructions}>
            {currentQuestion.instructionsJa}
          </p>
        ) : null}

        {currentQuestion.kind === "listeningChoice" ? (
          currentQuestion.audioSrc && !audioFailed ? (
            <audio
              className={styles.audio}
              controls
              preload="none"
              src={currentQuestion.audioSrc}
              aria-label="診断問題の音声を再生"
              onError={() => setAudioFailed(true)}
            />
          ) : canUseSpeech ? (
            <Button
              type="button"
              variant="secondary"
              onClick={playSpeech}
              disabled={isSaving}
            >
              音声を再生
            </Button>
          ) : currentQuestion.audioTranscript ? (
            <InlineAlert title="音声の代わりに文章を表示します" role="note">
              <span lang="en">{currentQuestion.audioTranscript}</span>
              <br />
              聞き取り結果には数えないため、「この問題を飛ばす」で先へ進んでください。
            </InlineAlert>
          ) : (
            <InlineAlert title="音声を再生できませんでした" tone="warning" role="note">
              この問題は「この問題を飛ばす」で先へ進めます。
            </InlineAlert>
          )
        ) : null}

        <form className={styles.answerForm} onSubmit={submitAnswer}>
          {currentQuestion.kind === "textInput" ? (
            <label className={styles.textField}>
              <span>答えを入力</span>
              <input
                type="text"
                value={answer}
                autoComplete="off"
                aria-describedby={
                  currentQuestion.instructionsJa ? instructionsId : undefined
                }
                onChange={(event) => {
                  setAnswer(event.currentTarget.value);
                  setErrorMessage(undefined);
                }}
              />
            </label>
          ) : (
            <fieldset
              className={styles.choiceFieldset}
              aria-describedby={
                currentQuestion.instructionsJa ? instructionsId : undefined
              }
            >
              <legend className={styles.srOnly}>答えを1つ選択</legend>
              <div className={styles.choiceList}>
                {currentQuestion.choices?.map((choice) => (
                  <label key={choice.value} className={styles.choice}>
                    <input
                      type="radio"
                      name={`answer-${currentQuestion.id}`}
                      value={choice.value}
                      checked={answer === choice.value}
                      disabled={listeningUnavailable}
                      onChange={(event) => {
                        setAnswer(event.currentTarget.value);
                        setErrorMessage(undefined);
                      }}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className={styles.questionActions}>
            <Button
              type="button"
              variant="tertiary"
              disabled={isSaving}
              onClick={() => void recordResponse("skipped")}
            >
              この問題を飛ばす
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => void recordResponse("unknown")}
            >
              分からない
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={listeningUnavailable}>
              回答して次へ
            </Button>
          </div>
        </form>
      </Card>
    </article>
  );
}
