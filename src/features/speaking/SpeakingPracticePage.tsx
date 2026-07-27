import { useEffect, useMemo, useRef, useState } from "react";
import { resolveStudyDay } from "../../domain/planning";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import { BrowserSpeakingRecorder } from "./browserRecorder";
import styles from "./SpeakingPracticePage.module.css";
import type { SpeakingPracticeContent, SpeakingPracticePageProps } from "./types";

type SpeakingStep =
  | "intro"
  | "silentReading"
  | "readAloud"
  | "no1"
  | "narrationPreparation"
  | "narration"
  | "no3"
  | "no4"
  | "review"
  | "complete";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      sets: readonly SpeakingPracticeContent[];
      studyDayStartHour: number;
    }
  | { status: "error"; message: string };

const STEPS: readonly SpeakingStep[] = [
  "intro",
  "silentReading",
  "readAloud",
  "no1",
  "narrationPreparation",
  "narration",
  "no3",
  "no4",
  "review",
  "complete",
];

const SYSTEM_CLOCK = { now: () => new Date() };

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function stepNumber(step: SpeakingStep) {
  return Math.max(1, STEPS.indexOf(step) + 1);
}

function stepLabel(step: SpeakingStep) {
  const labels: Readonly<Record<SpeakingStep, string>> = {
    intro: "練習の流れ",
    silentReading: "20秒黙読",
    readAloud: "本文の音読",
    no1: "No. 1 本文質問",
    narrationPreparation: "3場面の説明準備",
    narration: "3場面の説明",
    no3: "No. 3 意見質問",
    no4: "No. 4 身近な話題",
    review: "自己評価",
    complete: "練習完了",
  };
  return labels[step];
}

export function SpeakingPracticePage({
  store,
  recorder: injectedRecorder,
  clock = SYSTEM_CLOCK,
  setId,
  planContext,
  timeZone = deviceTimeZone(),
  onBack,
  onComplete,
}: SpeakingPracticePageProps) {
  const recorder = useMemo(
    () => injectedRecorder ?? new BrowserSpeakingRecorder(),
    [injectedRecorder],
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | undefined>(setId);
  const [step, setStep] = useState<SpeakingStep>("intro");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [rubric, setRubric] = useState({
    content: 2,
    clarity: 2,
    pace: 2,
    pronunciation: 2,
  });
  const [recordingStatus, setRecordingStatus] = useState<
    "unsupported" | "idle" | "requesting" | "recording" | "saved" | "denied"
  >(recorder.isSupported() ? "idle" : "unsupported");
  const [recordingId, setRecordingId] = useState<string>();
  const [recordingUrl, setRecordingUrl] = useState<string>();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
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
                : "スピーキング教材を読み込めませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [store]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [selectedId, step]);

  useEffect(() => {
    if (loadState.status !== "ready" || selectedId === undefined) {
      return;
    }
    const selected = loadState.sets.find(
      (candidate) => candidate.set.id === selectedId,
    );
    const seconds =
      step === "silentReading"
        ? selected?.payload.silentReadingSeconds
        : step === "narrationPreparation"
          ? selected?.payload.narrationPreparationSeconds
          : undefined;
    if (seconds === undefined) {
      setRemainingSeconds(0);
      return;
    }
    setRemainingSeconds(seconds);
    setTimerPaused(false);
  }, [loadState, selectedId, step]);

  useEffect(() => {
    if (
      timerPaused ||
      remainingSeconds <= 0 ||
      (step !== "silentReading" && step !== "narrationPreparation")
    ) {
      return;
    }
    const timer = globalThis.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => globalThis.clearInterval(timer);
  }, [remainingSeconds, step, timerPaused]);

  useEffect(() => () => recorder.dispose(), [recorder]);

  useEffect(
    () => () => {
      if (recordingUrl !== undefined && URL.revokeObjectURL !== undefined) {
        URL.revokeObjectURL(recordingUrl);
      }
    },
    [recordingUrl],
  );

  const selectSet = (id: string) => {
    recorder.dispose();
    startedAtRef.current = clock.now();
    setSelectedId(id);
    setStep("intro");
    setResponses({});
    setMessage(undefined);
    setRecordingStatus(recorder.isSupported() ? "idle" : "unsupported");
    setRecordingId(undefined);
    setRecordingUrl(undefined);
    setTimerPaused(false);
  };

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>スピーキング練習を準備しています</h1>
        <p role="status">スピーキング教材を読み込んでいます。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <ErrorState
        title="スピーキングを開けませんでした"
        description={loadState.message}
        headingLevel={1}
      />
    );
  }
  if (loadState.sets.length === 0) {
    return (
      <EmptyState
        title="スピーキング教材がありません"
        description="教材を読み込んでから、もう一度お試しください。"
        headingLevel={1}
      />
    );
  }

  const selected = loadState.sets.find((candidate) => candidate.set.id === selectedId);
  if (selected === undefined) {
    return (
      <article className={styles.page} aria-labelledby="speaking-hub-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Speaking practice</p>
          <h1 ref={headingRef} id="speaking-hub-title" tabIndex={-1}>
            スピーキング練習
          </h1>
          <p>録音を使わなくても、テキスト回答と自己確認だけで最後まで練習できます。</p>
        </header>
        <div className={styles.setGrid}>
          {loadState.sets.map((content) => (
            <Card key={content.set.id} as="section" className={styles.setCard}>
              <p className={styles.eyebrow}>ステージ{content.set.stage}</p>
              <h2>{content.set.titleJa}</h2>
              <p>{content.set.descriptionJa}</p>
              <Button onClick={() => selectSet(content.set.id)}>
                このセットを始める
              </Button>
            </Card>
          ))}
        </div>
        {onBack === undefined ? null : (
          <Button variant="secondary" onClick={onBack}>
            練習メニューへ戻る
          </Button>
        )}
      </article>
    );
  }

  const updateResponse = (key: string, value: string) => {
    setResponses((current) => ({ ...current, [key]: value }));
  };
  const nextStep = () => {
    const index = STEPS.indexOf(step);
    const next = STEPS[Math.min(STEPS.length - 1, index + 1)];
    if (next !== undefined) {
      setTimerPaused(false);
      setStep(next);
    }
  };

  const startRecording = async () => {
    setMessage(undefined);
    setRecordingStatus("requesting");
    try {
      await recorder.start();
      setRecordingStatus("recording");
      setMessage("録音中です。終了ボタンを押すまで端末内で記録します。");
    } catch (error: unknown) {
      setRecordingStatus("denied");
      setMessage(
        error instanceof Error
          ? `録音を開始できませんでした。${error.message} テキスト練習は続けられます。`
          : "録音を開始できませんでした。テキスト練習は続けられます。",
      );
    }
  };

  const stopRecording = async () => {
    setSaving(true);
    setMessage(undefined);
    try {
      const captured = await recorder.stop();
      const id = `speaking-recording:${selected.set.id}:${startedAtRef.current.toISOString()}`;
      await store.saveRecording({
        id,
        promptId: selected.set.id,
        createdAt: clock.now().toISOString(),
        durationMs: captured.durationMs,
        mimeType: captured.mimeType,
        blob: captured.blob,
        selfAssessment: {},
      });
      if (recordingUrl !== undefined && URL.revokeObjectURL !== undefined) {
        URL.revokeObjectURL(recordingUrl);
      }
      const nextUrl =
        URL.createObjectURL === undefined
          ? undefined
          : URL.createObjectURL(captured.blob);
      setRecordingId(id);
      setRecordingUrl(nextUrl);
      setRecordingStatus("saved");
      setMessage("録音を端末内に保存しました。提出前に聞き直せます。");
    } catch (error: unknown) {
      recorder.dispose();
      setRecordingStatus(recorder.isSupported() ? "idle" : "unsupported");
      setRecordingId(undefined);
      setMessage(
        error instanceof Error
          ? `${error.message} 録音は保存されていません。もう一度録音できます。`
          : "録音を保存できませんでした。もう一度録音できます。",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteRecording = async () => {
    if (recordingId === undefined) {
      return;
    }
    setDeleteConfirmationOpen(false);
    setSaving(true);
    try {
      await store.deleteRecording(recordingId);
      if (recordingUrl !== undefined && URL.revokeObjectURL !== undefined) {
        URL.revokeObjectURL(recordingUrl);
      }
      setRecordingId(undefined);
      setRecordingUrl(undefined);
      setRecordingStatus(recorder.isSupported() ? "idle" : "unsupported");
      setMessage("録音を端末から削除しました。");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "録音を削除できませんでした。もう一度お試しください。",
      );
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (recordingStatus === "recording" || recordingStatus === "requesting") {
      setMessage("マイク確認または録音を終えてから、自己評価を完了してください。");
      return;
    }
    setSaving(true);
    setMessage(undefined);
    const endedAt = clock.now();
    const studyDay = resolveStudyDay(startedAtRef.current, {
      timeZone,
      hour: loadState.studyDayStartHour,
    });
    const itemKey = `practice:${selected.set.id}`;
    const studyDate = planContext?.planDate ?? studyDay.studyDate;
    const sessionId = `speaking-session:${selected.set.id}:${startedAtRef.current.toISOString()}`;
    const score =
      Object.values(rubric).reduce((total, value) => total + value, 0) /
      (Object.keys(rubric).length * 3);
    try {
      await store.complete({
        attempt: {
          id: `${sessionId}:attempt:1`,
          itemKey,
          exerciseId: selected.set.id,
          sessionId,
          createdAt: endedAt.toISOString(),
          studyDate,
          mode: "speakingPractice",
          response: {
            responses,
            rubric,
            ...(recordingId === undefined ? {} : { recordingId }),
          },
          correct: null,
          score,
          responseTimeMs: Math.max(
            0,
            endedAt.getTime() - startedAtRef.current.getTime(),
          ),
          hintCount: 0,
        },
        session: {
          id: sessionId,
          type: "practice",
          startedAt: startedAtRef.current.toISOString(),
          endedAt: endedAt.toISOString(),
          studyDate,
          itemKeys: [itemKey],
          completedItemKeys: [itemKey],
          interrupted: false,
        },
        ...(planContext === undefined ? {} : { planContext }),
      });
      recorder.dispose();
      setStep("complete");
      onComplete?.();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "スピーキング結果を保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={styles.page} aria-labelledby="speaking-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          ステージ{selected.set.stage}・約{selected.set.estimatedMinutes}分
        </p>
        <h1 ref={headingRef} id="speaking-title" tabIndex={-1}>
          {selected.set.titleJa}
        </h1>
      </header>
      <ProgressBar
        label="面接練習の進み具合"
        value={stepNumber(step)}
        max={STEPS.length}
        valueText={`${stepNumber(step)} / ${STEPS.length}`}
      />
      <p role="status" aria-live="polite">
        {stepLabel(step)}を表示しました。
      </p>
      {message === undefined ? null : (
        <InlineAlert
          tone={recordingStatus === "denied" ? "warning" : "info"}
          role="status"
        >
          {message}
        </InlineAlert>
      )}

      {step !== "intro" && step !== "complete" ? (
        <Card as="section" className={styles.recorder}>
          <h2>録音（任意）</h2>
          {recordingStatus === "unsupported" ? (
            <p>
              この環境は録音に対応していません。テキスト欄へ要点を書き、声に出して練習してください。
            </p>
          ) : recordingStatus === "recording" ? (
            <Button isLoading={saving} onClick={() => void stopRecording()}>
              録音を停止して保存
            </Button>
          ) : recordingStatus === "requesting" ? (
            <Button isLoading loadingLabel="マイクを確認中">
              マイクを確認中
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void startRecording()}
            >
              {recordingStatus === "denied"
                ? "もう一度マイクを確認"
                : "マイクを確認して録音開始"}
            </Button>
          )}
          {recordingUrl === undefined ? null : (
            <div className={styles.playback}>
              <audio controls src={recordingUrl} aria-label="保存した録音を再生">
                録音を再生できない場合は、テキスト回答を確認してください。
              </audio>
              <Button
                variant="tertiary"
                disabled={saving}
                onClick={() => setDeleteConfirmationOpen(true)}
              >
                録音を削除
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      <Dialog
        open={deleteConfirmationOpen}
        title="録音を削除しますか"
        description="この録音は端末から削除され、元に戻せません。テキスト回答と学習履歴は残ります。"
        onClose={() => setDeleteConfirmationOpen(false)}
        actions={
          <>
            <Button
              variant="tertiary"
              disabled={saving}
              onClick={() => setDeleteConfirmationOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              isLoading={saving}
              loadingLabel="削除中"
              onClick={() => void deleteRecording()}
            >
              録音を削除
            </Button>
          </>
        }
      />

      {step === "intro" ? (
        <Card as="section" padding="large">
          <h2>練習の流れ</h2>
          <ol>
            <li>20秒黙読し、本文を音読します。</li>
            <li>本文の質問に答えます。</li>
            <li>20秒準備し、3場面を順番に説明します。</li>
            <li>意見質問2問へ答え、最後に自己評価します。</li>
          </ol>
          <InlineAlert tone="info">
            録音権限は画面を開いただけでは要求しません。「録音開始」を押したときだけ確認します。
          </InlineAlert>
          <Button onClick={nextStep}>練習を始める</Button>
        </Card>
      ) : null}

      {step === "silentReading" ? (
        <Card as="section" padding="large">
          <p className={styles.timer} role="timer">
            黙読の残り目安 {remainingSeconds}秒
          </p>
          <Button
            size="small"
            variant="tertiary"
            aria-pressed={timerPaused}
            onClick={() => setTimerPaused((current) => !current)}
          >
            {timerPaused ? "タイマーを再開" : "タイマーを一時停止"}
          </Button>
          <h2 lang="en">{selected.payload.passageTitle}</h2>
          <p lang="en" className={styles.passage}>
            {selected.payload.passage}
          </p>
          <Button onClick={nextStep}>黙読できたので次へ</Button>
        </Card>
      ) : null}

      {step === "readAloud" ? (
        <Card as="section" padding="large">
          <h2>本文を音読</h2>
          <p lang="en" className={styles.passage}>
            {selected.payload.passage}
          </p>
          <ResponseField
            label="音読で気になった語や区切り（任意）"
            value={responses.readAloud ?? ""}
            onChange={(value) => updateResponse("readAloud", value)}
          />
          <Button onClick={nextStep}>音読を終えた</Button>
        </Card>
      ) : null}

      {step === "no1" ? (
        <QuestionStep
          title="No. 1 本文について答える"
          question={selected.payload.no1Question}
          guide={selected.payload.no1GuideJa}
          value={responses.no1 ?? ""}
          onChange={(value) => updateResponse("no1", value)}
          onNext={nextStep}
        />
      ) : null}

      {step === "narrationPreparation" ? (
        <Card as="section" padding="large">
          <p className={styles.timer} role="timer">
            説明準備の残り目安 {remainingSeconds}秒
          </p>
          <Button
            size="small"
            variant="tertiary"
            aria-pressed={timerPaused}
            onClick={() => setTimerPaused((current) => !current)}
          >
            {timerPaused ? "タイマーを再開" : "タイマーを一時停止"}
          </Button>
          <h2>3場面を確認</h2>
          <SceneCards scenes={selected.payload.scenes} />
          <Button onClick={nextStep}>説明を始める</Button>
        </Card>
      ) : null}

      {step === "narration" ? (
        <Card as="section" padding="large">
          <h2>3場面を順番に説明</h2>
          <SceneCards scenes={selected.payload.scenes} />
          <ResponseField
            label="説明のメモまたはテキスト回答"
            value={responses.narration ?? ""}
            onChange={(value) => updateResponse("narration", value)}
          />
          <Button onClick={nextStep}>説明を終えた</Button>
        </Card>
      ) : null}

      {step === "no3" ? (
        <QuestionStep
          title="No. 3 自分の意見"
          question={selected.payload.no3Question}
          value={responses.no3 ?? ""}
          onChange={(value) => updateResponse("no3", value)}
          onNext={nextStep}
        />
      ) : null}

      {step === "no4" ? (
        <QuestionStep
          title="No. 4 身近な話題"
          question={selected.payload.no4Question}
          value={responses.no4 ?? ""}
          onChange={(value) => updateResponse("no4", value)}
          onNext={nextStep}
        />
      ) : null}

      {step === "review" ? (
        <Card as="section" padding="large">
          <h2>自分の回答を振り返る</h2>
          <p>
            自動採点ではありません。録音やメモを見て、今の感触を1〜3で記録してください。
          </p>
          <div className={styles.rubric}>
            {(
              [
                ["content", "質問に合う内容"],
                ["clarity", "文の分かりやすさ"],
                ["pace", "話す速さと間"],
                ["pronunciation", "音の伝わりやすさ"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  value={rubric[key]}
                  onChange={(event) =>
                    setRubric((current) => ({
                      ...current,
                      [key]: Number(event.currentTarget.value),
                    }))
                  }
                >
                  <option value={1}>1・次に練習したい</option>
                  <option value={2}>2・だいたいできた</option>
                  <option value={3}>3・落ち着いてできた</option>
                </select>
              </label>
            ))}
          </div>
          <h3>答えを組み立てるヒント</h3>
          <p>回答は一つではありません。次は自分の考えを整理するための一例です。</p>
          <ul>
            {selected.payload.sampleStructureJa.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
          <h3>No. 1の本文根拠</h3>
          <p lang="en">{selected.payload.no1EvidenceQuote}</p>
          <Button
            isLoading={saving}
            disabled={
              recordingStatus === "recording" || recordingStatus === "requesting"
            }
            loadingLabel="保存中"
            onClick={() => void finish()}
          >
            自己評価を保存して完了
          </Button>
        </Card>
      ) : null}

      {step === "complete" ? (
        <Card as="section" padding="large">
          <h2>スピーキング練習を完了しました</h2>
          <p>
            今日できたところを残しました。短い回答でも、声に出した経験が次の練習につながります。
          </p>
          <div className={styles.actions}>
            <Button onClick={() => selectSet(selected.set.id)}>
              同じセットをもう一度
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedId(undefined);
                setStep("intro");
              }}
            >
              セット一覧へ
            </Button>
          </div>
        </Card>
      ) : null}
    </article>
  );
}

function ResponseField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.responseField}>
      <span>{label}</span>
      <textarea
        lang="en"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function QuestionStep({
  title,
  question,
  guide,
  value,
  onChange,
  onNext,
}: {
  title: string;
  question: string;
  guide?: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <Card as="section" padding="large">
      <h2>{title}</h2>
      <p lang="en" className={styles.question}>
        {question}
      </p>
      {guide === undefined ? null : <p>{guide}</p>}
      <ResponseField
        label="テキスト回答（録音する場合は要点だけでも可）"
        value={value}
        onChange={onChange}
      />
      <Button onClick={onNext}>この回答で次へ</Button>
    </Card>
  );
}

function SceneCards({
  scenes,
}: {
  scenes: SpeakingPracticeContent["payload"]["scenes"];
}) {
  return (
    <ol className={styles.scenes}>
      {scenes.map((scene) => (
        <li key={scene.id}>
          <strong>{scene.titleJa}</strong>
          <span lang="en">{scene.description}</span>
        </li>
      ))}
    </ol>
  );
}
