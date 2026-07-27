import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link } from "react-router-dom";
import type { AppSettings, ReviewIntensity, Theme } from "../../domain/models";
import { trackPendingUpdateWrite } from "../../infrastructure/pwa";
import { Button, Card, ErrorState, InlineAlert } from "../../shared/components";
import { PwaInstallPanel } from "../pwa";
import { applyAppearanceSettings } from "./appearance";
import { createDexieSettingsPort } from "./dexieSettingsPort";
import type {
  SettingsAppInformation,
  SettingsPort,
  SettingsPreferences,
} from "./types";
import styles from "./SettingsPage.module.css";

type PageState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      readonly profileAvailable: boolean;
      readonly appInformation: SettingsAppInformation;
    };

interface FieldErrors {
  readonly dailyMinutes?: string;
  readonly dailyNewVocabularyLimit?: string;
}

const REVIEW_OPTIONS: readonly {
  readonly value: ReviewIntensity;
  readonly label: string;
}[] = [
  { value: "gentle", label: "軽め（復習量を抑える）" },
  { value: "standard", label: "標準（おすすめ）" },
  { value: "strong", label: "しっかり（定着を優先）" },
];

const SPEECH_RATE_OPTIONS = [
  { value: 0.75, label: "ゆっくり（0.75倍）" },
  { value: 1, label: "標準（1.0倍）" },
  { value: 1.25, label: "少し速い（1.25倍）" },
] as const;

const THEME_OPTIONS: readonly {
  readonly value: Theme;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    value: "system",
    label: "端末に合わせる",
    description: "端末のライト・ダーク設定に合わせます。",
  },
  {
    value: "light",
    label: "ライト",
    description: "明るい背景で表示します。",
  },
  {
    value: "dark",
    label: "ダーク",
    description: "暗い背景で表示します。",
  },
];

const FONT_SCALE_OPTIONS = [
  { value: 0.9, label: "小さめ（90%）" },
  { value: 1, label: "標準（100%）" },
  { value: 1.15, label: "大きめ（115%）" },
  { value: 1.3, label: "さらに大きく（130%）" },
] as const;

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}

function parseInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (!/^\d+$/u.test(value)) {
    return undefined;
  }
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum
    ? number
    : undefined;
}

function withAppSettings(
  preferences: SettingsPreferences,
  appSettings: AppSettings,
): SettingsPreferences {
  return {
    ...preferences,
    appSettings,
  };
}

export interface SettingsPageProps {
  readonly port?: SettingsPort;
}

export function SettingsPage({ port }: SettingsPageProps) {
  const resolvedPort = useMemo(() => port ?? createDexieSettingsPort(), [port]);
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [preferences, setPreferences] = useState<SettingsPreferences>();
  const preferencesRef = useRef<SettingsPreferences | undefined>(undefined);
  const [dailyMinutesInput, setDailyMinutesInput] = useState("15");
  const [newLimitInput, setNewLimitInput] = useState("10");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveRevisionRef = useRef(0);
  const mountedRef = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasFocusedHeadingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setPageState({ status: "loading" });
    setSaveError(undefined);

    void resolvedPort
      .load()
      .then((snapshot) => {
        if (!active) {
          return;
        }
        preferencesRef.current = snapshot.preferences;
        setPreferences(snapshot.preferences);
        setDailyMinutesInput(String(snapshot.preferences.dailyMinutes));
        setNewLimitInput(
          String(snapshot.preferences.appSettings.dailyNewVocabularyLimit),
        );
        applyAppearanceSettings(snapshot.preferences.appSettings);
        setPageState({
          status: "ready",
          profileAvailable: snapshot.profileAvailable,
          appInformation: snapshot.appInformation,
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setPageState({
            status: "error",
            message: toMessage(
              error,
              "設定を読み込めませんでした。端末の保存領域を確認してください。",
            ),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, resolvedPort]);

  useEffect(() => {
    if (pageState.status === "ready" && !hasFocusedHeadingRef.current) {
      hasFocusedHeadingRef.current = true;
      headingRef.current?.focus();
    }
  }, [pageState.status]);

  const savePreferences = useCallback(
    (nextPreferences: SettingsPreferences) => {
      preferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);
      applyAppearanceSettings(nextPreferences.appSettings);
      setSaveError(undefined);
      setHasSaved(false);
      setPendingSaveCount((current) => current + 1);
      latestSaveRevisionRef.current += 1;
      const revision = latestSaveRevisionRef.current;
      const queuedSave = saveQueueRef.current
        .catch(() => undefined)
        .then(() => resolvedPort.save(nextPreferences));
      saveQueueRef.current = queuedSave;
      const trackedSave = trackPendingUpdateWrite(
        "settings-preferences",
        () => queuedSave,
      );

      void trackedSave.then(
        () => {
          if (!mountedRef.current) {
            return;
          }
          setPendingSaveCount((current) => Math.max(0, current - 1));
          if (revision === latestSaveRevisionRef.current) {
            setHasSaved(true);
            setSaveError(undefined);
          }
        },
        (error: unknown) => {
          if (!mountedRef.current) {
            return;
          }
          setPendingSaveCount((current) => Math.max(0, current - 1));
          if (revision === latestSaveRevisionRef.current) {
            setSaveError(
              toMessage(
                error,
                "設定を保存できませんでした。端末の空き容量を確認して、もう一度お試しください。",
              ),
            );
          }
        },
      );
    },
    [resolvedPort],
  );

  const updateAppSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      const current = preferencesRef.current;
      if (current === undefined) {
        return;
      }
      savePreferences(
        withAppSettings(current, {
          ...current.appSettings,
          ...updates,
        }),
      );
    },
    [savePreferences],
  );

  const handleDailyMinutesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setDailyMinutesInput(value);
    const dailyMinutes = parseInteger(value, 5, 180);
    if (dailyMinutes === undefined) {
      setFieldErrors((current) => ({
        ...current,
        dailyMinutes: "5〜180分の整数で入力してください。",
      }));
      return;
    }
    setFieldErrors((current) => ({ ...current, dailyMinutes: undefined }));
    const current = preferencesRef.current;
    if (current !== undefined && current.dailyMinutes !== dailyMinutes) {
      savePreferences({ ...current, dailyMinutes });
    }
  };

  const handleNewLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setNewLimitInput(value);
    const limit = parseInteger(value, 0, 100);
    if (limit === undefined) {
      setFieldErrors((current) => ({
        ...current,
        dailyNewVocabularyLimit: "0〜100語の整数で入力してください。",
      }));
      return;
    }
    setFieldErrors((current) => ({
      ...current,
      dailyNewVocabularyLimit: undefined,
    }));
    if (
      preferencesRef.current !== undefined &&
      preferencesRef.current.appSettings.dailyNewVocabularyLimit !== limit
    ) {
      updateAppSettings({ dailyNewVocabularyLimit: limit });
    }
  };

  const retrySave = () => {
    const current = preferencesRef.current;
    if (current !== undefined) {
      savePreferences(current);
    }
  };

  if (pageState.status === "error") {
    return (
      <article className={styles.page} aria-labelledby="settings-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>学習・表示・アプリ情報</p>
          <h1 id="settings-title" tabIndex={-1}>
            設定
          </h1>
        </header>
        <ErrorState
          title="設定を読み込めませんでした"
          description={pageState.message}
          onRetry={() => setLoadAttempt((current) => current + 1)}
        />
      </article>
    );
  }

  if (pageState.status === "loading" || preferences === undefined) {
    return (
      <article className={styles.page} aria-labelledby="settings-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>学習・表示・アプリ情報</p>
          <h1 id="settings-title" tabIndex={-1}>
            設定
          </h1>
        </header>
        <Card as="section" padding="large" aria-busy="true">
          <p role="status">保存済みの設定を読み込んでいます…</p>
        </Card>
      </article>
    );
  }

  const { appSettings } = preferences;
  const speechRateOptions: readonly {
    readonly value: number;
    readonly label: string;
  }[] = SPEECH_RATE_OPTIONS.some((option) => option.value === appSettings.speechRate)
    ? SPEECH_RATE_OPTIONS
    : [
        {
          value: appSettings.speechRate,
          label: `現在の設定（${appSettings.speechRate}倍）`,
        },
        ...SPEECH_RATE_OPTIONS,
      ];
  const fontScaleOptions: readonly {
    readonly value: number;
    readonly label: string;
  }[] = FONT_SCALE_OPTIONS.some((option) => option.value === appSettings.fontScale)
    ? FONT_SCALE_OPTIONS
    : [
        {
          value: appSettings.fontScale,
          label: `現在の設定（${Math.round(appSettings.fontScale * 100)}%）`,
        },
        ...FONT_SCALE_OPTIONS,
      ];

  return (
    <article className={styles.page} aria-labelledby="settings-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>学習・表示・アプリ情報</p>
        <h1 ref={headingRef} id="settings-title" tabIndex={-1}>
          設定
        </h1>
        <p>
          変更はすぐにこの端末へ保存されます。学習記録が外部へ送信されることはありません。
        </p>
      </header>

      {saveError !== undefined ? (
        <InlineAlert
          tone="danger"
          title="設定を保存できませんでした"
          actions={
            <Button variant="secondary" size="small" onClick={retrySave}>
              保存を再試行
            </Button>
          }
        >
          {saveError}
        </InlineAlert>
      ) : null}

      <p
        className={styles.saveStatus}
        role="status"
        aria-label="設定の保存状態"
        aria-live="polite"
        aria-atomic="true"
      >
        {pendingSaveCount > 0
          ? "設定を保存しています…"
          : hasSaved
            ? "設定をこの端末に保存しました。"
            : "項目を変更すると自動で保存します。"}
      </p>

      <Card
        as="section"
        className={styles.settingsCard}
        padding="large"
        aria-labelledby="study-settings-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>毎日の量を無理なく調整</p>
          <h2 id="study-settings-title">学習設定</h2>
        </div>

        {!pageState.profileAvailable ? (
          <InlineAlert tone="info" title="1日の学習時間は初回設定後に変更できます">
            先に初回設定で学習目標を保存してください。ほかの設定は変更できます。
          </InlineAlert>
        ) : null}

        <div className={styles.fieldGrid}>
          <label className={styles.field} htmlFor="daily-minutes">
            <span>1日の学習時間</span>
            <span className={styles.fieldControl}>
              <input
                id="daily-minutes"
                aria-label="1日の学習時間"
                type="number"
                min={5}
                max={180}
                step={1}
                inputMode="numeric"
                value={dailyMinutesInput}
                disabled={!pageState.profileAvailable}
                aria-describedby="daily-minutes-help daily-minutes-error"
                aria-invalid={fieldErrors.dailyMinutes !== undefined}
                onChange={handleDailyMinutesChange}
              />
              <span aria-hidden="true">分</span>
            </span>
            <small id="daily-minutes-help">
              5〜180分。今日のおすすめ量を作るときに使います。
            </small>
            <span
              id="daily-minutes-error"
              className={styles.fieldError}
              role={fieldErrors.dailyMinutes === undefined ? undefined : "alert"}
            >
              {fieldErrors.dailyMinutes}
            </span>
          </label>

          <label className={styles.field} htmlFor="daily-new-limit">
            <span>1日の新しい単語の上限</span>
            <span className={styles.fieldControl}>
              <input
                id="daily-new-limit"
                aria-label="1日の新しい単語の上限"
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={newLimitInput}
                aria-describedby="daily-new-limit-help daily-new-limit-error"
                aria-invalid={fieldErrors.dailyNewVocabularyLimit !== undefined}
                onChange={handleNewLimitChange}
              />
              <span aria-hidden="true">語</span>
            </span>
            <small id="daily-new-limit-help">
              0〜100語。復習が多い日は、この値より少なく調整されます。
            </small>
            <span
              id="daily-new-limit-error"
              className={styles.fieldError}
              role={
                fieldErrors.dailyNewVocabularyLimit === undefined ? undefined : "alert"
              }
            >
              {fieldErrors.dailyNewVocabularyLimit}
            </span>
          </label>

          <label className={styles.field} htmlFor="review-intensity">
            <span>復習の強さ</span>
            <select
              id="review-intensity"
              aria-label="復習の強さ"
              value={appSettings.reviewIntensity}
              aria-describedby="review-intensity-help"
              onChange={(event) =>
                updateAppSettings({
                  reviewIntensity: event.currentTarget.value as ReviewIntensity,
                })
              }
            >
              {REVIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small id="review-intensity-help">
              復習を多めにするか、負担を抑えるかの目安です。
            </small>
          </label>

          <label className={styles.field} htmlFor="speech-rate">
            <span>英語音声の速さ</span>
            <select
              id="speech-rate"
              aria-label="英語音声の速さ"
              value={appSettings.speechRate}
              aria-describedby="speech-rate-help"
              onChange={(event) =>
                updateAppSettings({ speechRate: Number(event.currentTarget.value) })
              }
            >
              {speechRateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small id="speech-rate-help">
              単語の発音など、速度を変えられる音声へ使います。
            </small>
          </label>
        </div>
      </Card>

      <Card
        as="section"
        className={styles.settingsCard}
        padding="large"
        aria-labelledby="appearance-settings-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>読みやすさをその場で確認</p>
          <h2 id="appearance-settings-title">表示設定</h2>
        </div>

        <fieldset className={styles.choiceFieldset}>
          <legend>テーマ</legend>
          <div className={styles.choiceGrid}>
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className={styles.choice}>
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={appSettings.theme === option.value}
                  onChange={() => updateAppSettings({ theme: option.value })}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.choiceFieldset}>
          <legend>文字サイズ</legend>
          <div className={styles.choiceGrid}>
            {fontScaleOptions.map((option) => (
              <label key={option.value} className={styles.choice}>
                <input
                  type="radio"
                  name="font-scale"
                  value={option.value}
                  checked={appSettings.fontScale === option.value}
                  onChange={() => updateAppSettings({ fontScale: option.value })}
                />
                <span>
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={appSettings.reducedMotion}
            onChange={(event) =>
              updateAppSettings({ reducedMotion: event.currentTarget.checked })
            }
          />
          <span>
            <strong>画面の動きを減らす</strong>
            <small>画面切替や読み込み表示のアニメーションをほぼ停止します。</small>
          </span>
        </label>
      </Card>

      <PwaInstallPanel />

      <Card as="section" className={styles.linksCard} padding="large">
        <h2>保存容量・データ・使い方</h2>
        <p>
          保存容量の確認、永続保存、バックアップ、復元、録音だけの削除、アプリキャッシュの再構築はデータ管理にまとめています。
        </p>
        <nav className={styles.links} aria-label="設定の関連画面">
          <Link className={styles.link} to="/settings/data">
            保存容量とデータ管理を開く
          </Link>
          <Link className={styles.link} to="/help">
            インストール・オフラインのヘルプ
          </Link>
        </nav>
      </Card>

      <Card
        as="section"
        className={styles.settingsCard}
        padding="large"
        aria-labelledby="app-information-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>この端末で動作中</p>
          <h2 id="app-information-title">アプリ情報</h2>
        </div>
        <dl className={styles.appInformation}>
          <div>
            <dt>アプリversion</dt>
            <dd>{pageState.appInformation.appVersion}</dd>
          </div>
          <div>
            <dt>教材version</dt>
            <dd>{pageState.appInformation.contentVersion}</dd>
          </div>
          <div>
            <dt>データベースversion</dt>
            <dd>{pageState.appInformation.databaseVersion}</dd>
          </div>
        </dl>
        <InlineAlert tone="info" title="非公式の自己学習アプリです">
          本アプリは英検の公式サービスではなく、公式スコアや合否を保証するものではありません。
        </InlineAlert>
      </Card>
    </article>
  );
}
