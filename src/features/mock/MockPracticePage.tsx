import { useEffect, useMemo, useRef, useState } from "react";
import { resolveStudyDay } from "../../domain/planning";
import type {
  AudioAvailability,
  AudioPlaybackRequest,
} from "../../infrastructure/audio";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import styles from "./MockPracticePage.module.css";
import type { MockClock, MockPracticeContent, MockPracticePageProps } from "./types";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      sets: readonly MockPracticeContent[];
      studyDayStartHour: number;
    }
  | { status: "error"; message: string };

type PracticePhase = "intro" | "taking" | "saving" | "result";

const SYSTEM_CLOCK: MockClock = { now: () => new Date() };
const EXIT_WARNING =
  "短縮模試はまだ終了していません。この画面を離れると、現在の回答は保存されません。";

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function skillLabel(skill: string) {
  const labels: Readonly<Record<string, string>> = {
    vocabulary: "語彙・文法",
    grammar: "文法",
    reading: "読解",
    listening: "リスニング",
    writing: "ライティング",
    speaking: "スピーキング",
  };
  return labels[skill] ?? skill;
}

function defaultConfirmExit(message: string) {
  return window.confirm(message);
}

export function MockPracticePage({
  store,
  audio,
  setId,
  planContext,
  clock = SYSTEM_CLOCK,
  timeZone = deviceTimeZone(),
  confirmExit = defaultConfirmExit,
  onExit,
  onOpenReview,
  onComplete,
  onActiveChange,
}: MockPracticePageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | undefined>(setId);
  const [phase, setPhase] = useState<PracticePhase>("intro");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scriptRevealed, setScriptRevealed] = useState(false);
  const [listeningPlayed, setListeningPlayed] = useState(false);
  const [audioMessage, setAudioMessage] = useState<string>();
  const [message, setMessage] = useState<string>();
  const startedAtRef = useRef(clock.now());
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    void store
      .load()
      .then((loaded) => {
        if (active) {
          setLoadState({ status: "ready", ...loaded });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "短縮模試を読み込めませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [store]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase, questionIndex, sectionIndex, selectedId]);

  useEffect(() => {
    if (phase !== "taking") {
      return;
    }
    const timer = globalThis.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => globalThis.clearInterval(timer);
  }, [phase, sectionIndex]);

  useEffect(() => {
    if (phase !== "taking") {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    globalThis.addEventListener?.("beforeunload", warnBeforeUnload);
    return () => globalThis.removeEventListener?.("beforeunload", warnBeforeUnload);
  }, [phase]);

  useEffect(() => {
    return () => audio?.stop();
  }, [audio, sectionIndex]);

  useEffect(() => {
    const active = phase === "taking" || phase === "saving";
    onActiveChange?.(active);
    return () => onActiveChange?.(false);
  }, [onActiveChange, phase]);

  const selected = useMemo(
    () =>
      loadState.status === "ready"
        ? loadState.sets.find((candidate) => candidate.set.id === selectedId)
        : undefined,
    [loadState, selectedId],
  );

  if (loadState.status === "loading") {
    return <p role="status">短縮模試を読み込んでいます。</p>;
  }
  if (loadState.status === "error") {
    return (
      <ErrorState title="短縮模試を開けませんでした" description={loadState.message} />
    );
  }
  if (loadState.sets.length === 0) {
    return (
      <EmptyState
        title="短縮模試がありません"
        description="教材を読み込んでから、もう一度お試しください。"
      />
    );
  }

  const selectSet = (id: string) => {
    setSelectedId(id);
    setPhase("intro");
    setSectionIndex(0);
    setQuestionIndex(0);
    setAnswers({});
    setScriptRevealed(false);
    setListeningPlayed(false);
    setAudioMessage(undefined);
    setMessage(undefined);
  };

  if (selected === undefined) {
    return (
      <article className={styles.page} aria-labelledby="mock-hub-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Original shortened mock</p>
          <h1 id="mock-hub-title" ref={headingRef} tabIndex={-1}>
            短縮模試
          </h1>
          <p>
            複数技能を短時間で確認します。結果は学習用の目安で、公式スコアではありません。
          </p>
        </header>
        <div className={styles.grid}>
          {loadState.sets.map((content) => (
            <Card key={content.set.id} as="section" className={styles.setCard}>
              <p className={styles.eyebrow}>
                ステージ{content.set.stage}・約
                {content.set.estimatedMinutes}分
              </p>
              <h2>{content.set.titleJa}</h2>
              <p>{content.set.descriptionJa}</p>
              <Button onClick={() => selectSet(content.set.id)}>内容を確認</Button>
            </Card>
          ))}
        </div>
        {onExit === undefined ? null : (
          <Button variant="secondary" onClick={onExit}>
            練習メニューへ戻る
          </Button>
        )}
      </article>
    );
  }

  const sections = selected.payload.sections;
  const currentSection = sections[sectionIndex];
  const currentQuestion = currentSection?.questions[questionIndex];
  const allQuestions = sections.flatMap((section) =>
    section.questions.map((question) => ({ section, question })),
  );
  const completedBeforeCurrent = sections
    .slice(0, sectionIndex)
    .reduce((total, section) => total + section.questions.length, 0);
  const globalQuestionNumber = completedBeforeCurrent + questionIndex + 1;

  const start = () => {
    const now = clock.now();
    startedAtRef.current = now;
    setSectionIndex(0);
    setQuestionIndex(0);
    setAnswers({});
    setScriptRevealed(false);
    setListeningPlayed(false);
    setAudioMessage(undefined);
    setRemainingSeconds(sections[0]?.timeLimitSeconds ?? 0);
    setMessage(undefined);
    setPhase("taking");
  };

  const finish = async () => {
    setPhase("saving");
    setMessage(undefined);
    const endedAt = clock.now();
    const studyDay = resolveStudyDay(startedAtRef.current, {
      timeZone,
      hour: loadState.studyDayStartHour,
    });
    const itemKey = `practice:${selected.set.id}`;
    const studyDate = planContext?.planDate ?? studyDay.studyDate;
    const sessionId = `mock-session:${selected.set.id}:${startedAtRef.current.toISOString()}`;
    const attempts = allQuestions.map(({ section, question }, index) => {
      const response = answers[question.id];
      const correct = response === question.correctChoiceIndex;
      return {
        id: `${sessionId}:attempt:${index + 1}`,
        itemKey,
        exerciseId: question.id,
        sessionId,
        createdAt: endedAt.toISOString(),
        studyDate,
        mode: `mock:${section.skill}`,
        response: response ?? null,
        correct,
        score: correct ? 1 : 0,
        responseTimeMs: Math.max(0, endedAt.getTime() - startedAtRef.current.getTime()),
        hintCount: 0,
      };
    });
    try {
      await store.complete({
        attempts,
        session: {
          id: sessionId,
          type: "mock",
          startedAt: startedAtRef.current.toISOString(),
          endedAt: endedAt.toISOString(),
          studyDate,
          itemKeys: [itemKey],
          completedItemKeys: [itemKey],
          interrupted: false,
        },
        ...(planContext === undefined ? {} : { planContext }),
      });
      setPhase("result");
      onComplete?.();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "短縮模試の結果を保存できませんでした。",
      );
      setPhase("taking");
    }
  };

  const moveNext = () => {
    if (currentSection === undefined || currentQuestion === undefined) {
      return;
    }
    const nextQuestionIndex = questionIndex + 1;
    if (nextQuestionIndex < currentSection.questions.length) {
      setQuestionIndex(nextQuestionIndex);
      return;
    }
    const nextSectionIndex = sectionIndex + 1;
    const nextSection = sections[nextSectionIndex];
    if (nextSection !== undefined) {
      setSectionIndex(nextSectionIndex);
      setQuestionIndex(0);
      setRemainingSeconds(nextSection.timeLimitSeconds);
      setScriptRevealed(false);
      setListeningPlayed(false);
      setAudioMessage(undefined);
      return;
    }
    void finish();
  };

  const requestExit = () => {
    if (phase === "taking" && !confirmExit(EXIT_WARNING)) {
      return;
    }
    onExit?.();
  };

  const playListeningOnce = async (request: AudioPlaybackRequest): Promise<void> => {
    if (audio === undefined || listeningPlayed) {
      return;
    }
    setListeningPlayed(true);
    setAudioMessage("会話を再生しています。端末の音量を確認してください。");
    try {
      await audio.play(request);
      setAudioMessage("会話の再生が終わりました。設問へ答えてください。");
    } catch (error: unknown) {
      setScriptRevealed(true);
      setAudioMessage(
        error instanceof Error
          ? `${error.message} スクリプト学習へ切り替えました。`
          : "音声を再生できないため、スクリプト学習へ切り替えました。",
      );
    }
  };

  if (phase === "result") {
    const correctCount = allQuestions.filter(
      ({ question }) => answers[question.id] === question.correctChoiceIndex,
    ).length;
    const weakSections = sections.filter((section) =>
      section.questions.some(
        (question) => answers[question.id] !== question.correctChoiceIndex,
      ),
    );
    return (
      <article className={styles.page} aria-labelledby="mock-result-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>学習用の結果</p>
          <h1 id="mock-result-title" ref={headingRef} tabIndex={-1}>
            短縮模試を終えました
          </h1>
        </header>
        <InlineAlert tone="info" title="公式スコアではありません">
          この結果は、次に練習する技能を見つけるための目安です。
        </InlineAlert>
        <Card as="section" padding="large" className={styles.resultSummary}>
          <h2>
            {correctCount} / {allQuestions.length}問
          </h2>
          <p>間違いは失敗ではなく、次に戻る場所の手がかりです。</p>
        </Card>
        <section aria-labelledby="mock-review-title">
          <h2 id="mock-review-title">問題ごとの確認</h2>
          <ol className={styles.reviewList}>
            {allQuestions.map(({ section, question }) => {
              const response = answers[question.id];
              const correct = response === question.correctChoiceIndex;
              return (
                <li key={question.id}>
                  <Card as="article">
                    <p className={styles.eyebrow}>{section.titleJa}</p>
                    <h3>{question.prompt}</h3>
                    <p>
                      {correct ? "正解です。" : "今回は見直し候補です。"}{" "}
                      {question.explanationJa}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
        {weakSections.length === 0 ? (
          <InlineAlert tone="success">
            全セクションで答えられました。間を空けてもう一度確認しましょう。
          </InlineAlert>
        ) : (
          <Card as="section">
            <h2>次に練習する候補</h2>
            <div className={styles.actions}>
              {weakSections.map((section) => {
                const path = section.questions.find(
                  (question) => answers[question.id] !== question.correctChoiceIndex,
                )?.reviewPath;
                return path === undefined || onOpenReview === undefined ? (
                  <p key={section.id}>{skillLabel(section.skill)}</p>
                ) : (
                  <Button
                    key={section.id}
                    variant="secondary"
                    onClick={() => onOpenReview(path)}
                  >
                    {skillLabel(section.skill)}を練習
                  </Button>
                );
              })}
            </div>
          </Card>
        )}
        <div className={styles.actions}>
          <Button onClick={() => selectSet(selected.set.id)}>もう一度確認</Button>
          {onExit === undefined ? null : (
            <Button variant="secondary" onClick={onExit}>
              練習メニューへ戻る
            </Button>
          )}
        </div>
      </article>
    );
  }

  if (phase === "intro") {
    return (
      <article className={styles.page} aria-labelledby="mock-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            ステージ{selected.set.stage}・約
            {selected.set.estimatedMinutes}分
          </p>
          <h1 id="mock-title" ref={headingRef} tabIndex={-1}>
            {selected.set.titleJa}
          </h1>
        </header>
        <InlineAlert tone="info" title="オリジナル短縮演習">
          {selected.payload.noticeJa}
        </InlineAlert>
        <InlineAlert tone="info" title="上位ステージの本番構成（参考）">
          現行構成では、リーディング・ライティング85分、リスニング約25分です。この画面は約
          {selected.set.estimatedMinutes}
          分に短縮した学習用セットで、本番時間を再現するものではありません。
        </InlineAlert>
        <Card as="section" padding="large">
          <h2>セクション</h2>
          <ol className={styles.sectionList}>
            {sections.map((section) => (
              <li key={section.id}>
                <strong>{section.titleJa}</strong>
                <span>
                  {section.questions.length}問・
                  {formatTime(section.timeLimitSeconds)}
                </span>
              </li>
            ))}
          </ol>
          <p>
            セクションごとにタイマーが動きます。途中で離れる場合は、未保存であることを確認します。
          </p>
          <div className={styles.actions}>
            <Button onClick={start}>短縮模試を始める</Button>
            {onExit === undefined ? null : (
              <Button variant="secondary" onClick={onExit}>
                練習メニューへ戻る
              </Button>
            )}
          </div>
        </Card>
      </article>
    );
  }

  if (currentSection === undefined || currentQuestion === undefined) {
    return (
      <ErrorState
        title="問題を表示できません"
        description="教材のセクションを確認してください。"
      />
    );
  }

  const selectedAnswer = answers[currentQuestion.id];
  const timeExpired = remainingSeconds === 0;
  const isLastQuestion =
    sectionIndex === sections.length - 1 &&
    questionIndex === currentSection.questions.length - 1;
  const listeningRequest: AudioPlaybackRequest | undefined =
    currentSection.stimulus?.kind === "script"
      ? {
          text: currentSection.stimulus.text,
          language: "en-US",
          rate: 1,
        }
      : undefined;
  const listeningAvailability: AudioAvailability | undefined =
    listeningRequest === undefined ? undefined : audio?.availability(listeningRequest);
  const canAnswer =
    listeningRequest === undefined ||
    (listeningAvailability?.available === true ? listeningPlayed : scriptRevealed);

  return (
    <article className={styles.page} aria-labelledby="mock-question-title">
      <header className={styles.exerciseHeader}>
        <div>
          <p className={styles.eyebrow}>
            {currentSection.titleJa}・問題
            {questionIndex + 1}/{currentSection.questions.length}
          </p>
          <h1 id="mock-question-title" ref={headingRef} tabIndex={-1}>
            {selected.set.titleJa}
          </h1>
        </div>
        <p
          className={timeExpired ? styles.timerExpired : styles.timer}
          role="timer"
          aria-live={remainingSeconds <= 10 ? "polite" : "off"}
        >
          残り {formatTime(remainingSeconds)}
        </p>
      </header>
      <ProgressBar
        label="短縮模試の進み具合"
        value={globalQuestionNumber}
        max={allQuestions.length}
        valueText={`${globalQuestionNumber} / ${allQuestions.length}問`}
      />
      <p role="status" aria-live="polite">
        {currentSection.titleJa}の問題{questionIndex + 1}を表示しました。
      </p>
      {message === undefined ? null : (
        <InlineAlert tone="danger">{message}</InlineAlert>
      )}
      {timeExpired ? (
        <InlineAlert tone="warning" title="このセクションの目安時間になりました">
          未回答のまま次へ進めます。結果では見直し候補として表示します。
        </InlineAlert>
      ) : null}
      <p>{currentSection.instructionsJa}</p>
      {currentSection.stimulus?.kind === "passage" ? (
        <Card as="section" className={styles.stimulus}>
          <h2 lang="en">{currentSection.stimulus.title}</h2>
          <p lang="en">{currentSection.stimulus.text}</p>
        </Card>
      ) : null}
      {currentSection.stimulus?.kind === "script" ? (
        <Card as="section" className={styles.stimulus}>
          <h2>{currentSection.stimulus.title}</h2>
          {scriptRevealed ? (
            <p lang="en">{currentSection.stimulus.text}</p>
          ) : listeningAvailability?.available === true &&
            listeningRequest !== undefined ? (
            <>
              <p>
                {listeningAvailability.messageJa}
                Web Speechは公式試験音声ではなく、品質は利用環境により異なります。
              </p>
              <Button
                variant="secondary"
                disabled={listeningPlayed}
                onClick={() => void playListeningOnce(listeningRequest)}
              >
                {listeningPlayed ? "会話は再生済みです" : "会話を一度再生"}
              </Button>
            </>
          ) : (
            <>
              <p>
                オフライン・音声非対応でも完了できるよう、スクリプトを一度開いて確認します。
              </p>
              <Button variant="secondary" onClick={() => setScriptRevealed(true)}>
                スクリプトを開く
              </Button>
            </>
          )}
          {audioMessage === undefined ? null : <p role="status">{audioMessage}</p>}
        </Card>
      ) : null}
      <Card as="section" padding="large">
        <h2>{currentQuestion.prompt}</h2>
        <fieldset className={styles.choices} disabled={!canAnswer}>
          <legend>答えを1つ選択</legend>
          {currentQuestion.choices.map((choice, index) => (
            <label key={choice}>
              <input
                type="radio"
                name={currentQuestion.id}
                value={index}
                checked={selectedAnswer === index}
                onChange={() =>
                  setAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: index,
                  }))
                }
              />
              <span lang="en">{choice}</span>
            </label>
          ))}
        </fieldset>
        <div className={styles.actions}>
          <Button
            isLoading={phase === "saving"}
            disabled={selectedAnswer === undefined && !timeExpired}
            onClick={moveNext}
          >
            {isLastQuestion ? "採点して保存" : "次の問題へ"}
          </Button>
          {onExit === undefined ? null : (
            <Button
              variant="tertiary"
              disabled={phase === "saving"}
              onClick={requestExit}
            >
              途中で終了
            </Button>
          )}
        </div>
      </Card>
    </article>
  );
}
