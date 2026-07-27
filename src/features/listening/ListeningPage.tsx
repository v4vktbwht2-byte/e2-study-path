import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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
} from "../../shared/components";
import {
  consumeExamPlayback,
  createFullPlaybackRequest,
  createListeningCompletionRecords,
  createSentencePlaybackRequest,
  findListeningSentence,
  isDictationMatch,
} from "./model";
import {
  parseListeningPracticeSets,
  type ListeningPlaybackRate,
  type ListeningPracticeSet,
} from "./schemas";
import type {
  ListeningCompletionCommitResult,
  ListeningMode,
  ListeningPageProps,
} from "./types";
import styles from "./ListeningPage.module.css";

const DEFAULT_CLOCK = {
  now: () => new Date(),
};

function defaultStudyDayResolver(now: Date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  return resolveStudyDay(now, { timeZone, hour: 4 });
}

function defaultIdFactory(prefix: "attempt" | "session"): string {
  const uniquePart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `listening-${prefix}-${uniquePart}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "リスニング教材を読み込めませんでした。";
}

function unavailableForContent(set: ListeningPracticeSet): AudioAvailability {
  return {
    available: false,
    strategy: "unsupported",
    messageJa:
      set.payload.audio.strategy === "none"
        ? "この教材には音声がありません。スクリプト学習を利用できます。"
        : "音声の利用状況を確認できませんでした。",
  };
}

interface LoadedState {
  kind: "loaded";
  sets: readonly ListeningPracticeSet[];
  historyCount: number;
}

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | LoadedState;

export function ListeningPage({
  content,
  store,
  audio,
  initialSetId,
  planContext,
  clock = DEFAULT_CLOCK,
  studyDayResolver = defaultStudyDayResolver,
  idFactory = defaultIdFactory,
  onComplete,
  onBack,
}: ListeningPageProps) {
  const [loadRevision, setLoadRevision] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [selectedSet, setSelectedSet] = useState<ListeningPracticeSet>();
  const [mode, setMode] = useState<ListeningMode>();
  const [rate, setRate] = useState<ListeningPlaybackRate>(1);
  const [examPlayback, setExamPlayback] = useState({ playCount: 0 });
  const [examPlaybackFinished, setExamPlaybackFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFailure, setAudioFailure] = useState<string>();
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const [dictation, setDictation] = useState("");
  const [dictationFeedback, setDictationFeedback] = useState<string>();
  const [startedAt, setStartedAt] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [completion, setCompletion] = useState<ListeningCompletionCommitResult>();

  useEffect(() => {
    let active = true;
    setLoadState({ kind: "loading" });
    void Promise.all([content.listListeningSets(), store.loadHistory()])
      .then(([rawSets, history]) => {
        if (!active) {
          return;
        }
        const sets = [...parseListeningPracticeSets(rawSets)].sort(
          (left, right) =>
            left.stage - right.stage || left.titleJa.localeCompare(right.titleJa, "ja"),
        );
        if (initialSetId && !sets.some((set) => set.id === initialSetId)) {
          throw new Error(
            `指定されたリスニング教材 ${initialSetId} が見つかりません。`,
          );
        }
        setLoadState({
          kind: "loaded",
          sets,
          historyCount: history.attempts.length,
        });
        if (initialSetId) {
          setSelectedSet(sets.find((set) => set.id === initialSetId));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({ kind: "error", message: errorMessage(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [content, initialSetId, loadRevision, store]);

  useEffect(() => {
    return () => audio.stop();
  }, [audio, mode, selectedSet?.id]);

  const fullRequest = useMemo(() => {
    if (!selectedSet || !mode) {
      return undefined;
    }
    return createFullPlaybackRequest(selectedSet, mode, rate);
  }, [mode, rate, selectedSet]);

  const availability = useMemo<AudioAvailability | undefined>(() => {
    if (!selectedSet || !fullRequest) {
      return undefined;
    }
    return selectedSet.payload.audio.strategy === "none"
      ? unavailableForContent(selectedSet)
      : audio.availability(fullRequest);
  }, [audio, fullRequest, selectedSet]);

  const fallbackActive =
    audioFailure !== undefined || availability?.available === false;

  function resetExerciseState(): void {
    audio.stop();
    setRate(1);
    setExamPlayback({ playCount: 0 });
    setExamPlaybackFinished(false);
    setIsPlaying(false);
    setAudioFailure(undefined);
    setSelectedChoiceId(undefined);
    setDictation("");
    setDictationFeedback(undefined);
    setSaveError(undefined);
    setCompletion(undefined);
    setStartedAt(clock.now().toISOString());
  }

  function openSet(set: ListeningPracticeSet): void {
    setSelectedSet(set);
    setMode(undefined);
    resetExerciseState();
  }

  function selectMode(nextMode: ListeningMode): void {
    setMode(nextMode);
    resetExerciseState();
  }

  function closeSet(): void {
    audio.stop();
    setSelectedSet(undefined);
    setMode(undefined);
    resetExerciseState();
  }

  async function play(request: AudioPlaybackRequest): Promise<boolean> {
    setIsPlaying(true);
    setAudioFailure(undefined);
    try {
      await audio.play(request);
      return true;
    } catch (error) {
      setAudioFailure(errorMessage(error));
      return false;
    } finally {
      setIsPlaying(false);
    }
  }

  async function playExamOnce(): Promise<void> {
    if (!fullRequest || examPlayback.playCount >= 1) {
      return;
    }
    setExamPlayback((current) => consumeExamPlayback(current));
    await play({ ...fullRequest, rate: 1 });
    setExamPlaybackFinished(true);
  }

  async function playReviewFull(): Promise<void> {
    if (fullRequest) {
      await play(fullRequest);
    }
  }

  async function playReviewSentence(sentenceId: string): Promise<void> {
    if (selectedSet) {
      await play(createSentencePlaybackRequest(selectedSet, sentenceId, rate));
    }
  }

  function checkDictation(): void {
    if (!selectedSet || dictation.trim() === "") {
      setDictationFeedback("聞こえた英文を入力してから確認してください。");
      return;
    }
    const target = findListeningSentence(
      selectedSet,
      selectedSet.payload.dictationSentenceId,
    ).text;
    setDictationFeedback(
      isDictationMatch(dictation, target)
        ? "語順とつづりを確認できました。"
        : `見比べてみましょう。確認文: ${target}`,
    );
  }

  async function complete(selfPractice: boolean): Promise<void> {
    if (!selectedSet || !mode || isSaving) {
      return;
    }
    if (!selfPractice && selectedChoiceId === undefined) {
      setSaveError("答えを1つ選んでください。");
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const completedAt = clock.now();
      const resolvedDay = await studyDayResolver(completedAt);
      const records = createListeningCompletionRecords({
        set: selectedSet,
        mode,
        ...(selectedChoiceId === undefined ? {} : { selectedChoiceId }),
        dictation,
        selfPractice,
        attemptId: idFactory("attempt"),
        sessionId: idFactory("session"),
        startedAt: new Date(startedAt ?? completedAt.toISOString()),
        completedAt,
        studyDate: planContext?.planDate ?? resolvedDay.studyDate,
      });
      const result = await store.commitCompletion({
        ...records,
        ...(planContext === undefined ? {} : { planContext }),
      });
      setCompletion(result);
      setLoadState((current) =>
        current.kind === "loaded"
          ? { ...current, historyCount: current.historyCount + 1 }
          : current,
      );
      await onComplete?.(selectedSet, result);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState.kind === "loading") {
    return (
      <main className={styles.page} aria-busy="true">
        <p className={styles.eyebrow}>Listening</p>
        <h1>リスニング教材を準備しています</h1>
        <p role="status">端末に保存された教材を読み込んでいます。</p>
      </main>
    );
  }

  if (loadState.kind === "error") {
    return (
      <main className={styles.page}>
        <ErrorState
          title="リスニング教材を開けませんでした"
          description={loadState.message}
          onRetry={() => setLoadRevision((revision) => revision + 1)}
        />
        {onBack ? (
          <Button variant="tertiary" onClick={onBack}>
            戻る
          </Button>
        ) : null}
      </main>
    );
  }

  if (loadState.sets.length === 0) {
    return (
      <main className={styles.page}>
        <EmptyState
          title="利用できるリスニング教材はまだありません"
          description="教材が追加されるまで、単語やレッスンを進められます。"
          actions={
            onBack ? (
              <Button variant="secondary" onClick={onBack}>
                戻る
              </Button>
            ) : undefined
          }
        />
      </main>
    );
  }

  if (!selectedSet) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Listening</p>
            <h1>リスニング練習</h1>
            <p>本番風で力を試すか、復習機能を使って音を確かめましょう。</p>
          </div>
          {onBack ? (
            <Button variant="tertiary" onClick={onBack}>
              戻る
            </Button>
          ) : null}
        </header>
        <InlineAlert title="このアプリ独自の練習教材です">
          公式問題・公式音声ではありません。Web
          Speechを使う場合、声や発音の品質は端末やブラウザーにより異なります。
        </InlineAlert>
        <p className={styles.history} role="status">
          この端末の完了履歴: {loadState.historyCount}件
        </p>
        <ul className={styles.setList}>
          {loadState.sets.map((set) => (
            <li key={set.id}>
              <Card as="article" className={styles.setCard}>
                <div>
                  <span className={styles.stage}>ステージ {set.stage}</span>
                  <h2>{set.titleJa}</h2>
                  <p>{set.descriptionJa}</p>
                  <small>目安 {set.estimatedMinutes}分</small>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openSet(set)}
                  aria-label={`「${set.titleJa}」を開く`}
                >
                  開く
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (!mode) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>ステージ {selectedSet.stage}</p>
            <h1>{selectedSet.titleJa}</h1>
            <p>{selectedSet.descriptionJa}</p>
          </div>
          <Button variant="tertiary" onClick={closeSet}>
            教材一覧へ
          </Button>
        </header>
        <InlineAlert title="音声の品質について">
          {selectedSet.payload.qualityNoticeJa}
        </InlineAlert>
        <div className={styles.modeGrid}>
          <Card as="section" className={styles.modeCard}>
            <h2>本番風</h2>
            <p>
              再生前に準備を確認し、速度を変えずに1回だけ聞きます。練習中はスクリプトを表示しません。
            </p>
            <Button onClick={() => selectMode("exam")}>本番風で始める</Button>
          </Card>
          <Card as="section" className={styles.modeCard}>
            <h2>復習</h2>
            <p>
              繰り返し・速度変更・一文再生・スクリプト・ディクテーションを使えます。
            </p>
            <Button variant="secondary" onClick={() => selectMode("review")}>
              復習で始める
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  if (completion) {
    const correct = completion.attempt.correct;
    return (
      <main className={styles.page}>
        <Card as="section" className={styles.resultCard} aria-live="polite">
          <span className={styles.completeMark} aria-hidden="true">
            ✓
          </span>
          <h1>リスニング練習を記録しました</h1>
          <p>
            {correct === null
              ? "音声を使わない自己練習として完了しました。"
              : correct
                ? "内容を正しく聞き取れました。"
                : "答えを確認して、復習モードで聞き直せます。"}
          </p>
          {correct !== null ? (
            <InlineAlert tone={correct ? "success" : "info"} title="設問の解説">
              {selectedSet.payload.question.explanationJa}
            </InlineAlert>
          ) : null}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => selectMode("review")}>
              復習モードで確認
            </Button>
            <Button onClick={closeSet}>別の教材を選ぶ</Button>
          </div>
        </Card>
      </main>
    );
  }

  const canAnswer = mode === "review" || examPlaybackFinished || fallbackActive;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {mode === "exam" ? "本番風モード" : "復習モード"}
          </p>
          <h1>{selectedSet.titleJa}</h1>
        </div>
        <Button variant="tertiary" onClick={() => setMode(undefined)}>
          モード選択へ
        </Button>
      </header>

      <InlineAlert title="公式音声ではありません">
        {selectedSet.payload.qualityNoticeJa}
        {availability ? ` ${availability.messageJa}` : ""}
      </InlineAlert>

      {fallbackActive ? (
        <InlineAlert tone="warning" title="音声を使わずに続けられます">
          {audioFailure ?? availability?.messageJa}
          スクリプトを読んで、音読または黙読の自己練習として完了できます。
        </InlineAlert>
      ) : null}

      {mode === "exam" ? (
        <Card as="section" className={styles.practiceCard}>
          <h2>再生前の確認</h2>
          <p>
            周囲の音と端末の音量を確認してください。再生を始めると、聞き直しや速度変更はできません。
          </p>
          <Button
            onClick={() => void playExamOnce()}
            disabled={isPlaying || examPlayback.playCount >= 1 || fallbackActive}
            isLoading={isPlaying}
            loadingLabel="再生中"
          >
            {examPlayback.playCount >= 1
              ? "音声は再生済みです"
              : "準備できました（1回だけ再生）"}
          </Button>
          {!fallbackActive ? (
            <p className={styles.hiddenScript} role="note">
              本番風モードではスクリプトを表示しません。再生速度は1.0倍です。
            </p>
          ) : null}
        </Card>
      ) : (
        <Card as="section" className={styles.practiceCard}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>聞き直して音を確認</h2>
              <p>何度でも再生できます。シャドーイングにも利用できます。</p>
            </div>
            <Button
              onClick={() => void playReviewFull()}
              disabled={isPlaying || fallbackActive}
              isLoading={isPlaying}
              loadingLabel="再生中"
            >
              全体を繰り返し再生
            </Button>
          </div>
          <fieldset className={styles.rateChoices}>
            <legend>再生速度</legend>
            {[0.75, 1, 1.25].map((candidate) => (
              <Button
                key={candidate}
                variant={rate === candidate ? "primary" : "secondary"}
                size="small"
                aria-pressed={rate === candidate}
                onClick={() => setRate(candidate as ListeningPlaybackRate)}
              >
                {candidate}倍
              </Button>
            ))}
          </fieldset>
        </Card>
      )}

      {mode === "review" || fallbackActive ? (
        <Card as="section" className={styles.scriptCard}>
          <h2>スクリプト</h2>
          <ol className={styles.script}>
            {selectedSet.payload.script.sentences.map((sentence, index) => (
              <li key={sentence.id}>
                <div>
                  <strong>{sentence.speaker}</strong>
                  <p>{sentence.text}</p>
                </div>
                {mode === "review" ? (
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={isPlaying || fallbackActive}
                    onClick={() => void playReviewSentence(sentence.id)}
                    aria-label={`文${index + 1}を再生`}
                  >
                    一文再生
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {mode === "review" ? (
        <Card as="section" className={styles.dictationCard}>
          <h2>ディクテーション</h2>
          <p>指定された一文を聞き、英語で入力してみましょう。</p>
          <label>
            聞こえた英文
            <textarea
              rows={3}
              value={dictation}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setDictation(event.target.value);
                setDictationFeedback(undefined);
              }}
            />
          </label>
          <Button variant="secondary" onClick={checkDictation}>
            ディクテーションを確認
          </Button>
          {dictationFeedback ? (
            <p className={styles.feedback} role="status">
              {dictationFeedback}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card as="section" className={styles.questionCard}>
        <fieldset disabled={!canAnswer || isSaving}>
          <legend>{selectedSet.payload.question.promptJa}</legend>
          <div className={styles.choiceList}>
            {selectedSet.payload.question.choices.map((choice) => (
              <label key={choice.id} className={styles.choice}>
                <input
                  type="radio"
                  name={`listening-${selectedSet.id}`}
                  value={choice.id}
                  checked={selectedChoiceId === choice.id}
                  onChange={() => setSelectedChoiceId(choice.id)}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.actions}>
          {fallbackActive ? (
            <Button
              variant="secondary"
              onClick={() => void complete(true)}
              isLoading={isSaving}
              loadingLabel="保存中"
            >
              スクリプト自己練習を完了
            </Button>
          ) : null}
          <Button
            onClick={() => void complete(false)}
            disabled={!canAnswer || selectedChoiceId === undefined}
            isLoading={isSaving}
            loadingLabel="保存中"
          >
            回答を確定
          </Button>
        </div>
        {saveError ? (
          <InlineAlert tone="danger" title="保存できませんでした">
            {saveError}
          </InlineAlert>
        ) : null}
      </Card>
    </main>
  );
}
