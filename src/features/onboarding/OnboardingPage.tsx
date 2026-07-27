import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import type { Goal, UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import { getAppDb } from "../../infrastructure/db/appDb";
import { DexieProfileRepository } from "../../infrastructure/db/repositories";
import {
  Button,
  Card,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import {
  completeOnboardingWithoutDiagnostic,
  DAILY_MINUTE_PRESETS,
  GOAL_OPTIONS,
  saveOnboardingDraft,
} from "./service";
import styles from "./OnboardingPage.module.css";

type OnboardingStep = "welcome" | "profile" | "diagnostic";
type LoadingState = "loading" | "ready" | "saving" | "error";

const STEP_METADATA: Readonly<
  Record<OnboardingStep, { number: number; title: string; progress: number }>
> = {
  welcome: { number: 1, title: "英語を、基礎から少しずつ", progress: 1 },
  profile: { number: 2, title: "続けやすい学び方を決めましょう", progress: 2 },
  diagnostic: { number: 3, title: "最初の学習地点を選びます", progress: 3 },
};

export interface OnboardingPageProps {
  profileRepository?: ProfileRepository;
  now?: () => Date;
  onStartDiagnostic?: (profile: UserProfile) => void | Promise<void>;
  onComplete?: (profile: UserProfile) => void | Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "保存中に問題が起きました。もう一度お試しください。";
}

export function OnboardingPage({
  profileRepository,
  now = () => new Date(),
  onStartDiagnostic,
  onComplete,
}: OnboardingPageProps) {
  const navigate = useNavigate();
  const defaultRepository = useMemo(() => new DexieProfileRepository(getAppDb()), []);
  const repository = profileRepository ?? defaultRepository;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [goals, setGoals] = useState<Goal[]>(["relearn"]);
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [minutesMode, setMinutesMode] = useState<"preset" | "custom">("preset");
  const [customMinutes, setCustomMinutes] = useState("20");
  const [targetExamDate, setTargetExamDate] = useState("");
  const [skipStage, setSkipStage] = useState(0);

  const loadProfile = useCallback(async () => {
    setLoadingState("loading");
    setErrorMessage(undefined);
    try {
      const profile = await repository.get();
      if (profile) {
        setGoals(profile.goals.length > 0 ? profile.goals : ["relearn"]);
        setDailyMinutes(profile.dailyMinutes);
        if (
          DAILY_MINUTE_PRESETS.includes(
            profile.dailyMinutes as (typeof DAILY_MINUTE_PRESETS)[number],
          )
        ) {
          setMinutesMode("preset");
        } else {
          setMinutesMode("custom");
          setCustomMinutes(String(profile.dailyMinutes));
        }
        setTargetExamDate(profile.targetExamDate ?? "");
        setSkipStage(profile.selectedStage);
      }
      setLoadingState("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setLoadingState("error");
    }
  }, [repository]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (loadingState === "ready") {
      headingRef.current?.focus();
    }
  }, [loadingState, step]);

  const resolvedMinutes =
    minutesMode === "custom" ? Number(customMinutes) : dailyMinutes;
  const input = {
    goals,
    dailyMinutes: resolvedMinutes,
    ...(targetExamDate === "" ? {} : { targetExamDate }),
  };

  const toggleGoal = (goal: Goal) => {
    setGoals((current) =>
      current.includes(goal)
        ? current.filter((candidate) => candidate !== goal)
        : [...current, goal],
    );
    setErrorMessage(undefined);
  };

  const saveProfileStep = async (event: FormEvent) => {
    event.preventDefault();
    setLoadingState("saving");
    setErrorMessage(undefined);
    try {
      await saveOnboardingDraft(repository, input, now().toISOString());
      setStep("diagnostic");
      setLoadingState("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setLoadingState("ready");
    }
  };

  const startDiagnostic = async () => {
    setLoadingState("saving");
    setErrorMessage(undefined);
    try {
      const profile = await saveOnboardingDraft(repository, input, now().toISOString());
      if (onStartDiagnostic) {
        await onStartDiagnostic(profile);
      } else {
        await navigate("/diagnostic");
      }
      setLoadingState("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setLoadingState("ready");
    }
  };

  const skipDiagnostic = async () => {
    setLoadingState("saving");
    setErrorMessage(undefined);
    try {
      const profile = await completeOnboardingWithoutDiagnostic(
        repository,
        { ...input, selectedStage: skipStage },
        now().toISOString(),
      );
      if (onComplete) {
        await onComplete(profile);
      } else {
        await navigate("/");
      }
      setLoadingState("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setLoadingState("ready");
    }
  };

  if (loadingState === "loading") {
    return (
      <section className={styles.page} aria-busy="true" aria-live="polite">
        <h1 className={styles.heading} tabIndex={-1}>
          初回設定を準備しています
        </h1>
        <Card as="section" className={styles.centered}>
          <p role="status">初回設定を読み込んでいます…</p>
        </Card>
      </section>
    );
  }

  if (loadingState === "error") {
    return (
      <section className={styles.page}>
        <h1 className={styles.heading}>初回設定</h1>
        <ErrorState
          title="初回設定を読み込めませんでした"
          description={errorMessage}
          onRetry={() => void loadProfile()}
        />
      </section>
    );
  }

  const metadata = STEP_METADATA[step];
  const isSaving = loadingState === "saving";

  return (
    <article className={styles.page} aria-labelledby="onboarding-title">
      <header className={styles.header}>
        <p className={styles.step}>ステップ {metadata.number} / 3</p>
        <ProgressBar
          label="初回設定の進み具合"
          value={metadata.progress}
          max={3}
          valueText={`${metadata.number} / 3`}
        />
        <h1
          ref={headingRef}
          id="onboarding-title"
          className={styles.heading}
          tabIndex={-1}
        >
          {metadata.title}
        </h1>
      </header>

      {errorMessage ? (
        <InlineAlert tone="danger" title="保存できませんでした">
          {errorMessage}
        </InlineAlert>
      ) : null}

      {step === "welcome" ? (
        <>
          <Card as="section" padding="large" className={styles.hero}>
            <p className={styles.lead}>
              E2 Study
              Pathは、英語をほぼ初めて学ぶ方も、短い学習を積み重ねられる自己学習アプリです。
            </p>
            <ul className={styles.points}>
              <li>アルファベットや短い文から始められます。</li>
              <li>学習データは、この端末の中に保存します。</li>
              <li>休んだ日があっても、戻ったところから続けられます。</li>
            </ul>
          </Card>
          <InlineAlert title="大切なお知らせ" role="note">
            このアプリは英検公式または日本英語検定協会公認の製品ではありません。学習データは、バックアップしない限り別の端末へ自動では移りません。
          </InlineAlert>
          <div className={styles.actions}>
            <Button size="large" onClick={() => setStep("profile")}>
              設定を始める
            </Button>
          </div>
        </>
      ) : null}

      {step === "profile" ? (
        <form className={styles.form} onSubmit={(event) => void saveProfileStep(event)}>
          <Card as="section" padding="large">
            <fieldset className={styles.fieldset}>
              <legend>学習目標（1つ以上）</legend>
              <div className={styles.choiceGrid}>
                {GOAL_OPTIONS.map((option) => (
                  <label key={option.value} className={styles.choice}>
                    <input
                      type="checkbox"
                      checked={goals.includes(option.value)}
                      onChange={() => toggleGoal(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>

          <Card as="section" padding="large">
            <fieldset className={styles.fieldset}>
              <legend>1日の学習時間</legend>
              <p className={styles.help}>5分からでも十分です。あとから変更できます。</p>
              <div className={styles.minutesGrid}>
                {DAILY_MINUTE_PRESETS.map((minutes) => (
                  <label key={minutes} className={styles.compactChoice}>
                    <input
                      type="radio"
                      name="dailyMinutes"
                      checked={minutesMode === "preset" && dailyMinutes === minutes}
                      onChange={() => {
                        setMinutesMode("preset");
                        setDailyMinutes(minutes);
                        setErrorMessage(undefined);
                      }}
                    />
                    <span>{minutes}分</span>
                  </label>
                ))}
                <label className={styles.compactChoice}>
                  <input
                    type="radio"
                    name="dailyMinutes"
                    checked={minutesMode === "custom"}
                    onChange={() => setMinutesMode("custom")}
                  />
                  <span>カスタム</span>
                </label>
              </div>
              <label className={styles.field}>
                <span>カスタム時間（5〜180分）</span>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={customMinutes}
                  disabled={minutesMode !== "custom"}
                  onFocus={() => setMinutesMode("custom")}
                  onChange={(event) => {
                    setCustomMinutes(event.currentTarget.value);
                    setErrorMessage(undefined);
                  }}
                />
              </label>
            </fieldset>
          </Card>

          <Card as="section" padding="large">
            <label className={styles.field}>
              <span>英検の受験予定日（任意）</span>
              <input
                type="date"
                value={targetExamDate}
                onChange={(event) => setTargetExamDate(event.currentTarget.value)}
              />
              <small>未設定でも、すべての学習機能を使えます。</small>
            </label>
          </Card>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="tertiary"
              disabled={isSaving}
              onClick={() => setStep("welcome")}
            >
              戻る
            </Button>
            <Button type="submit" size="large" isLoading={isSaving}>
              次へ
            </Button>
          </div>
        </form>
      ) : null}

      {step === "diagnostic" ? (
        <>
          <Card as="section" padding="large">
            <h2 className={styles.sectionTitle}>短い診断で開始地点を提案します</h2>
            <ul className={styles.points}>
              <li>目安は約10分、最大24問です。</li>
              <li>分からない問題は「分からない」またはスキップを選べます。</li>
              <li>点数で評価せず、次に学ぶとよい場所をご案内します。</li>
              <li>途中で閉じても、回答したところから再開できます。</li>
            </ul>
          </Card>
          <Card as="section" padding="large" tone="muted">
            <label className={styles.field}>
              <span>診断をあとにする場合の開始ステージ</span>
              <select
                value={skipStage}
                onChange={(event) => setSkipStage(Number(event.currentTarget.value))}
              >
                {Array.from({ length: 7 }, (_, stage) => (
                  <option key={stage} value={stage}>
                    ステージ{stage}
                  </option>
                ))}
              </select>
              <small>迷う場合はステージ0から始めるのがおすすめです。</small>
            </label>
          </Card>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="tertiary"
              disabled={isSaving}
              onClick={() => setStep("profile")}
            >
              戻る
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => void skipDiagnostic()}
            >
              診断はあとで
            </Button>
            <Button
              type="button"
              size="large"
              isLoading={isSaving}
              onClick={() => void startDiagnostic()}
            >
              診断を始める
            </Button>
          </div>
        </>
      ) : null}
    </article>
  );
}
