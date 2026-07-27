import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import type {
  BackupDataCategory,
  BackupPreview,
  DataManagementOverview,
  DataManagementPageProps,
  DataOperationResult,
  RestoreMode,
} from "./types";
import styles from "./DataManagementPage.module.css";

type OverviewState =
  | { status: "loading" }
  | { status: "ready"; overview: DataManagementOverview }
  | { status: "error"; message: string };

type InspectionState =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "ready"; file: File; preview: BackupPreview }
  | { status: "error"; fileName: string; message: string };

type ConfirmAction =
  | "restore"
  | "delete-recordings"
  | "clear-audio-cache"
  | "rebuild-app-cache"
  | "delete-all";

type BusyAction = ConfirmAction | "request-persistence" | "export-backup" | undefined;

interface NoticeState {
  readonly tone: "success" | "warning" | "danger";
  readonly title: string;
  readonly message: string;
}

const BACKUP_CATEGORY_PRESENTATION: readonly {
  readonly key: BackupDataCategory;
  readonly label: string;
}[] = [
  { key: "profiles", label: "利用者プロフィール" },
  { key: "settings", label: "設定" },
  { key: "reviewStates", label: "復習予定" },
  { key: "mastery", label: "習熟度" },
  { key: "vocabularyUserStates", label: "単語のお気に入り・メモ" },
  { key: "lessonProgress", label: "レッスン進捗" },
  { key: "attempts", label: "回答履歴" },
  { key: "sessions", label: "学習セッション" },
  { key: "dailyPlans", label: "今日のプラン" },
  { key: "writingSubmissions", label: "作文・下書き" },
  { key: "speakingRecordings", label: "スピーキング録音" },
];

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}

function formatDataSize(bytes: number): string {
  const normalized = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let value = normalized;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const maximumFractionDigits = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits,
  }).format(value)} ${units[unitIndex]}`;
}

function formatBackupDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function operationSummary(result: DataOperationResult, fallback: string): string {
  const parts: string[] = [];
  if (result.affectedCount !== undefined) {
    parts.push(`${result.affectedCount}件`);
  }
  if (result.freedBytes !== undefined) {
    parts.push(`${formatDataSize(result.freedBytes)}`);
  }
  return parts.length === 0 ? fallback : `${parts.join("・")}を処理しました。`;
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    globalThis.addEventListener?.("online", handleOnline);
    globalThis.addEventListener?.("offline", handleOffline);
    return () => {
      globalThis.removeEventListener?.("online", handleOnline);
      globalThis.removeEventListener?.("offline", handleOffline);
    };
  }, []);

  return online;
}

export function DataManagementPage({
  port,
  onAllUserDataDeleted,
}: DataManagementPageProps) {
  const [overviewState, setOverviewState] = useState<OverviewState>({
    status: "loading",
  });
  const [includeRecordings, setIncludeRecordings] = useState(false);
  const [inspectionState, setInspectionState] = useState<InspectionState>({
    status: "idle",
  });
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [notice, setNotice] = useState<NoticeState>();
  const [dialogError, setDialogError] = useState<string>();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const inspectionSequenceRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasFocusedHeadingRef = useRef(false);
  const deleteConfirmationRef = useRef<HTMLInputElement>(null);
  const online = useOnlineStatus();

  const loadOverview = useCallback(() => {
    let active = true;
    setOverviewState({ status: "loading" });
    void port
      .loadOverview()
      .then((overview) => {
        if (active) {
          setOverviewState({ status: "ready", overview });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setOverviewState({
            status: "error",
            message: toMessage(error, "保存容量とデータの状態を読み込めませんでした。"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [port]);

  useEffect(loadOverview, [loadOverview]);

  useEffect(() => {
    if (overviewState.status === "ready" && !hasFocusedHeadingRef.current) {
      hasFocusedHeadingRef.current = true;
      headingRef.current?.focus();
    }
  }, [overviewState.status]);

  const refreshOverview = useCallback(async () => {
    try {
      const overview = await port.loadOverview();
      setOverviewState({ status: "ready", overview });
    } catch {
      setNotice((current) => ({
        tone: "warning",
        title: current?.title ?? "処理は完了しました",
        message: `${current?.message ?? "処理は完了しました。"} 最新の容量表示は再読み込み後に確認してください。`,
      }));
    }
  }, [port]);

  const handlePersistenceRequest = async () => {
    setBusyAction("request-persistence");
    setNotice(undefined);
    try {
      const result = await port.requestPersistentStorage();
      if (result.status === "granted") {
        setNotice({
          tone: "success",
          title: "端末へ保存しやすい設定になりました",
          message: "ブラウザーが対応している範囲で、学習データを自動削除から守ります。",
        });
      } else if (result.status === "denied") {
        setNotice({
          tone: "warning",
          title: "永続保存は許可されませんでした",
          message:
            result.message ??
            "通常どおり学習できます。大切な記録はバックアップしてください。",
        });
      } else {
        setNotice({
          tone: "warning",
          title: "永続保存の要求に対応していません",
          message: result.message,
        });
      }
      await refreshOverview();
    } catch (error: unknown) {
      setNotice({
        tone: "danger",
        title: "永続保存を確認できませんでした",
        message: toMessage(error, "時間をおいて、もう一度お試しください。"),
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleExport = async () => {
    setBusyAction("export-backup");
    setNotice(undefined);
    try {
      const result = await port.exportBackup({ includeRecordings });
      setNotice({
        tone: "success",
        title: "バックアップを書き出しました",
        message: `${result.fileName}（${result.recordCount}件・${formatDataSize(
          result.sizeBytes,
        )}）を保存しました。録音は${result.recordingCount}件含まれます。`,
      });
    } catch (error: unknown) {
      setNotice({
        tone: "danger",
        title: "バックアップを書き出せませんでした",
        message: toMessage(
          error,
          "端末の空き容量とダウンロード設定を確認してください。",
        ),
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleBackupSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    inspectionSequenceRef.current += 1;
    const sequence = inspectionSequenceRef.current;
    setNotice(undefined);
    setDialogError(undefined);
    setRestoreMode("merge");
    setCreateSafetyBackup(true);

    if (file === undefined) {
      setInspectionState({ status: "idle" });
      return;
    }

    setInspectionState({ status: "loading", fileName: file.name });
    void port
      .inspectBackup(file)
      .then((preview) => {
        if (inspectionSequenceRef.current === sequence) {
          setInspectionState({ status: "ready", file, preview });
        }
      })
      .catch((error: unknown) => {
        if (inspectionSequenceRef.current === sequence) {
          setInspectionState({
            status: "error",
            fileName: file.name,
            message: toMessage(error, "バックアップの内容を確認できませんでした。"),
          });
        }
      });
  };

  const openConfirmation = (action: ConfirmAction) => {
    setDialogError(undefined);
    setDeleteConfirmation("");
    setConfirmAction(action);
  };

  const closeConfirmation = () => {
    if (busyAction === undefined) {
      setConfirmAction(undefined);
      setDialogError(undefined);
      setDeleteConfirmation("");
    }
  };

  const completeConfirmedAction = async () => {
    if (confirmAction === undefined) {
      return;
    }
    if (confirmAction === "delete-all" && deleteConfirmation !== "削除") {
      setDialogError("確認欄へ「削除」と入力してください。");
      return;
    }
    if (confirmAction === "rebuild-app-cache" && !online) {
      setDialogError(
        "オフライン中は再構築できません。接続が戻ってからお試しください。",
      );
      return;
    }

    setBusyAction(confirmAction);
    setDialogError(undefined);
    setNotice(undefined);

    try {
      if (confirmAction === "restore") {
        if (inspectionState.status !== "ready") {
          throw new Error("検証済みのバックアップを選択してから復元してください。");
        }
        const result = await port.restoreBackup({
          file: inspectionState.file,
          mode: restoreMode,
          createSafetyBackup: restoreMode === "replace" ? createSafetyBackup : false,
        });
        const safetyText =
          result.safetyBackupFileName === undefined
            ? ""
            : ` 安全バックアップ「${result.safetyBackupFileName}」も保存しました。`;
        setNotice({
          tone: "success",
          title:
            result.mode === "replace"
              ? "バックアップで置き換えました"
              : "バックアップを統合しました",
          message: `${result.restoredRecordCount}件を復元しました。${safetyText}`,
        });
        setInspectionState({ status: "idle" });
        setFileInputKey((current) => current + 1);
      } else if (confirmAction === "delete-recordings") {
        const result = await port.deleteRecordings();
        setNotice({
          tone: "success",
          title: "録音を削除しました",
          message: operationSummary(result, "保存されていた録音を削除しました。"),
        });
      } else if (confirmAction === "clear-audio-cache") {
        const result = await port.clearAudioCache();
        setNotice({
          tone: "success",
          title: "音声キャッシュを削除しました",
          message: operationSummary(result, "再取得できる音声を端末から削除しました。"),
        });
      } else if (confirmAction === "rebuild-app-cache") {
        const result = await port.rebuildAppCache();
        setNotice({
          tone: "success",
          title: "アプリキャッシュを再構築しました",
          message: operationSummary(
            result,
            "学習データを残したまま、アプリのファイルを再取得しました。",
          ),
        });
      } else {
        const result = await port.deleteAllUserData();
        setNotice({
          tone: "success",
          title: "利用者データを削除しました",
          message: operationSummary(
            result,
            "プロフィール、設定、学習履歴、下書き、録音を削除しました。",
          ),
        });
        onAllUserDataDeleted?.();
      }

      setConfirmAction(undefined);
      setDeleteConfirmation("");
      await refreshOverview();
    } catch (error: unknown) {
      setDialogError(
        toMessage(
          error,
          confirmAction === "restore"
            ? "復元できませんでした。元のデータは変更されていません。"
            : "処理を完了できませんでした。データの状態を確認してください。",
        ),
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  const previewTotal = useMemo(() => {
    if (inspectionState.status !== "ready") {
      return 0;
    }
    return BACKUP_CATEGORY_PRESENTATION.reduce(
      (total, category) => total + (inspectionState.preview.counts[category.key] ?? 0),
      0,
    );
  }, [inspectionState]);

  if (overviewState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <Card as="section" padding="large">
          <p role="status">保存容量とデータの状態を確認しています…</p>
        </Card>
      </section>
    );
  }

  if (overviewState.status === "error") {
    return (
      <section className={styles.page}>
        <h1>データ管理</h1>
        <ErrorState
          title="データ管理を開けませんでした"
          description={overviewState.message}
          onRetry={loadOverview}
        />
      </section>
    );
  }

  const { overview } = overviewState;
  const storagePercent =
    overview.storageEstimate.status === "available" &&
    overview.storageEstimate.quotaBytes > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (overview.storageEstimate.usageBytes /
              overview.storageEstimate.quotaBytes) *
              100,
          ),
        )
      : 0;

  return (
    <article className={styles.page} aria-labelledby="data-management-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>設定・端末内データ</p>
        <h1 ref={headingRef} id="data-management-title" tabIndex={-1}>
          データ管理
        </h1>
        <p>
          学習記録はこの端末に保存されます。大切な記録は定期的にバックアップしてください。
        </p>
      </header>

      {notice !== undefined ? (
        <InlineAlert tone={notice.tone} title={notice.title}>
          {notice.message}
        </InlineAlert>
      ) : null}

      <Card as="section" padding="large" aria-labelledby="storage-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>端末の状態</p>
            <h2 id="storage-title">保存容量</h2>
          </div>
          {overview.storageEstimate.status === "available" ? (
            <strong>{formatDataSize(overview.storageEstimate.usageBytes)}</strong>
          ) : null}
        </div>

        {overview.storageEstimate.status === "available" ? (
          <>
            <ProgressBar
              label="このサイトが利用している保存容量の目安"
              value={storagePercent}
              max={100}
              valueText={`${formatDataSize(
                overview.storageEstimate.usageBytes,
              )} / 利用可能な目安 ${formatDataSize(
                overview.storageEstimate.quotaBytes,
              )}`}
            />
            <p className={styles.helpText}>
              ブラウザーが返す推定値です。端末全体の空き容量とは異なる場合があります。
            </p>
          </>
        ) : (
          <InlineAlert tone="info" title="容量の推定に対応していません">
            {overview.storageEstimate.message}
          </InlineAlert>
        )}

        <div className={styles.persistence}>
          <div>
            <h3>学習データの永続保存</h3>
            {overview.persistentStorage.status === "unsupported" ? (
              <p>{overview.persistentStorage.message}</p>
            ) : overview.persistentStorage.persisted ? (
              <p>
                <strong>永続保存されています。</strong>
                ブラウザーが対応する範囲で、自動削除されにくい状態です。
              </p>
            ) : (
              <p>
                永続保存をブラウザーへ依頼できます。許可されなくても通常どおり学習できます。
              </p>
            )}
          </div>
          {overview.persistentStorage.status === "available" &&
          !overview.persistentStorage.persisted ? (
            <Button
              variant="secondary"
              isLoading={busyAction === "request-persistence"}
              loadingLabel="確認中"
              onClick={() => void handlePersistenceRequest()}
            >
              永続保存を依頼
            </Button>
          ) : null}
        </div>
      </Card>

      <Card as="section" padding="large" aria-labelledby="export-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>端末の外へ保管</p>
            <h2 id="export-title">バックアップを書き出す</h2>
          </div>
        </div>
        <p>
          プロフィール、設定、復習予定、習熟度、進捗、回答履歴、作文などを、バージョン付きJSONで保存します。教材本体とキャッシュは含みません。
        </p>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={includeRecordings}
            onChange={(event) => setIncludeRecordings(event.currentTarget.checked)}
          />
          <span>
            <strong>スピーキング録音も含める</strong>
            <small>
              既定では含みません。現在は{overview.recordings.count}件・
              {formatDataSize(overview.recordings.bytes)}です。
            </small>
          </span>
        </label>
        <Button
          isLoading={busyAction === "export-backup"}
          loadingLabel="バックアップを作成中"
          onClick={() => void handleExport()}
        >
          JSONを書き出す
        </Button>
      </Card>

      <Card as="section" padding="large" aria-labelledby="restore-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>内容を確認してから反映</p>
            <h2 id="restore-title">バックアップから復元する</h2>
          </div>
        </div>
        <p id="backup-file-help">
          JSONのサイズ、形式、バージョンを検証し、反映前に件数を表示します。検証に失敗しても現在のデータは変更しません。
        </p>
        <label className={styles.fileField}>
          <span>バックアップJSON</span>
          <input
            key={fileInputKey}
            type="file"
            accept=".json,application/json"
            aria-describedby="backup-file-help"
            onChange={handleBackupSelection}
          />
        </label>

        {inspectionState.status === "loading" ? (
          <InlineAlert tone="info" title="バックアップを検証しています">
            {inspectionState.fileName}
          </InlineAlert>
        ) : null}

        {inspectionState.status === "error" ? (
          <InlineAlert tone="danger" title="このバックアップは復元できません">
            {inspectionState.fileName}: {inspectionState.message}
          </InlineAlert>
        ) : null}

        {inspectionState.status === "ready" ? (
          <BackupPreviewPanel
            preview={inspectionState.preview}
            previewTotal={previewTotal}
            restoreMode={restoreMode}
            createSafetyBackup={createSafetyBackup}
            onRestoreModeChange={setRestoreMode}
            onSafetyBackupChange={setCreateSafetyBackup}
            onConfirm={() => openConfirmation("restore")}
          />
        ) : null}
      </Card>

      <Card as="section" padding="large" aria-labelledby="space-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>学習履歴を残して整理</p>
            <h2 id="space-title">容量を空ける</h2>
          </div>
        </div>
        <div className={styles.operationList}>
          <OperationRow
            title="保存した録音"
            description={`${overview.recordings.count}件・${formatDataSize(
              overview.recordings.bytes,
            )}。削除すると聞き直せません。テキスト回答や学習履歴は残ります。`}
            action={
              <Button
                variant="danger"
                disabled={overview.recordings.count === 0}
                onClick={() => openConfirmation("delete-recordings")}
              >
                録音だけ削除
              </Button>
            }
          />
          <OperationRow
            title="音声キャッシュ"
            description={
              overview.audioCache.status === "available"
                ? `${overview.audioCache.entryCount}件・${formatDataSize(
                    overview.audioCache.bytes,
                  )}。必要になった音声は接続時に再取得できます。`
                : overview.audioCache.message
            }
            action={
              <Button
                variant="secondary"
                disabled={
                  overview.audioCache.status === "unsupported" ||
                  overview.audioCache.entryCount === 0
                }
                onClick={() => openConfirmation("clear-audio-cache")}
              >
                音声キャッシュを削除
              </Button>
            }
          />
          <OperationRow
            title="アプリキャッシュ"
            description={
              overview.appCache.status === "available"
                ? `${overview.appCache.entryCount}件・${formatDataSize(
                    overview.appCache.bytes,
                  )}。画面が正しく開かないときに、学習データを残して再取得します。`
                : overview.appCache.message
            }
            extra={
              !online ? (
                <span className={styles.offlineNote}>
                  オフライン中は再構築できません。
                </span>
              ) : undefined
            }
            action={
              <Button
                variant="secondary"
                disabled={!online || overview.appCache.status === "unsupported"}
                onClick={() => openConfirmation("rebuild-app-cache")}
              >
                アプリキャッシュを再構築
              </Button>
            }
          />
        </div>
      </Card>

      <Card
        as="section"
        padding="large"
        className={styles.dangerZone}
        aria-labelledby="delete-all-title"
      >
        <p className={styles.eyebrow}>元に戻せない操作</p>
        <h2 id="delete-all-title">すべての利用者データを削除</h2>
        <p>
          プロフィール、設定、復習予定、習熟度、レッスン進捗、回答履歴、今日のプラン、作文、録音を削除します。アプリ本体のキャッシュは別に管理されます。
        </p>
        <InlineAlert tone="warning" title="先にバックアップを確認してください">
          削除後は、バックアップがない限り元に戻せません。
        </InlineAlert>
        <Button variant="danger" onClick={() => openConfirmation("delete-all")}>
          全利用者データの削除へ進む
        </Button>
      </Card>

      <ConfirmationDialog
        action={confirmAction}
        busy={busyAction !== undefined}
        overview={overview}
        inspectionState={inspectionState}
        restoreMode={restoreMode}
        createSafetyBackup={createSafetyBackup}
        dialogError={dialogError}
        deleteConfirmation={deleteConfirmation}
        deleteConfirmationRef={deleteConfirmationRef as RefObject<HTMLElement>}
        onDeleteConfirmationChange={setDeleteConfirmation}
        onClose={closeConfirmation}
        onConfirm={() => void completeConfirmedAction()}
      />
    </article>
  );
}

function BackupPreviewPanel({
  preview,
  previewTotal,
  restoreMode,
  createSafetyBackup,
  onRestoreModeChange,
  onSafetyBackupChange,
  onConfirm,
}: {
  readonly preview: BackupPreview;
  readonly previewTotal: number;
  readonly restoreMode: RestoreMode;
  readonly createSafetyBackup: boolean;
  readonly onRestoreModeChange: (mode: RestoreMode) => void;
  readonly onSafetyBackupChange: (enabled: boolean) => void;
  readonly onConfirm: () => void;
}) {
  const contentVersionEntries = Object.entries(preview.contentVersions);
  return (
    <section className={styles.preview} aria-labelledby="backup-preview-title">
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.eyebrow}>検証済み</p>
          <h3 id="backup-preview-title">復元する内容</h3>
        </div>
        <strong>{previewTotal}件</strong>
      </div>

      <dl className={styles.metadata}>
        <div>
          <dt>作成日</dt>
          <dd>{formatBackupDate(preview.exportedAt)}</dd>
        </div>
        <div>
          <dt>schema version</dt>
          <dd>{preview.schemaVersion}</dd>
        </div>
        <div>
          <dt>アプリversion</dt>
          <dd>{preview.appVersion}</dd>
        </div>
        <div>
          <dt>教材version</dt>
          <dd>
            {contentVersionEntries.length === 0
              ? "記録なし"
              : contentVersionEntries
                  .map(([id, version]) => `${id}: ${version}`)
                  .join("、")}
          </dd>
        </div>
      </dl>

      <dl className={styles.countGrid} aria-label="バックアップのデータ件数">
        {BACKUP_CATEGORY_PRESENTATION.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{preview.counts[key] ?? 0}件</dd>
          </div>
        ))}
      </dl>

      <p className={styles.recordingSize}>
        録音容量: <strong>{formatDataSize(preview.recordingBytes)}</strong>
      </p>

      {preview.warnings.length > 0 ? (
        <InlineAlert tone="warning" title="復元前に確認してください">
          <ul className={styles.warningList}>
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}

      <fieldset className={styles.restoreModes}>
        <legend>復元方法</legend>
        <label>
          <input
            type="radio"
            name="restore-mode"
            value="merge"
            checked={restoreMode === "merge"}
            onChange={() => onRestoreModeChange("merge")}
          />
          <span>
            <strong>現在のデータへ統合</strong>
            <small>現在の記録を残し、バックアップの記録を加えます。</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="restore-mode"
            value="replace"
            checked={restoreMode === "replace"}
            onChange={() => onRestoreModeChange("replace")}
          />
          <span>
            <strong>現在のデータを置換</strong>
            <small>現在の利用者データを消してから復元します。</small>
          </span>
        </label>
      </fieldset>

      {restoreMode === "replace" ? (
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={createSafetyBackup}
            onChange={(event) => onSafetyBackupChange(event.currentTarget.checked)}
          />
          <span>
            <strong>置換前に現在の安全バックアップを書き出す</strong>
            <small>既定で有効です。録音の扱いは書き出し時の仕様に従います。</small>
          </span>
        </label>
      ) : null}

      <Button onClick={onConfirm}>復元内容を最終確認</Button>
    </section>
  );
}

function OperationRow({
  title,
  description,
  extra,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly extra?: React.ReactNode;
  readonly action: React.ReactNode;
}) {
  return (
    <section className={styles.operationRow}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {extra}
      </div>
      {action}
    </section>
  );
}

function ConfirmationDialog({
  action,
  busy,
  overview,
  inspectionState,
  restoreMode,
  createSafetyBackup,
  dialogError,
  deleteConfirmation,
  deleteConfirmationRef,
  onDeleteConfirmationChange,
  onClose,
  onConfirm,
}: {
  readonly action: ConfirmAction | undefined;
  readonly busy: boolean;
  readonly overview: DataManagementOverview;
  readonly inspectionState: InspectionState;
  readonly restoreMode: RestoreMode;
  readonly createSafetyBackup: boolean;
  readonly dialogError: string | undefined;
  readonly deleteConfirmation: string;
  readonly deleteConfirmationRef: RefObject<HTMLElement>;
  readonly onDeleteConfirmationChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const metadata = confirmationMetadata(action, restoreMode);
  const confirmDisabled =
    action === "delete-all" ? deleteConfirmation !== "削除" : false;

  return (
    <Dialog
      open={action !== undefined}
      title={metadata.title}
      description={metadata.description}
      onClose={onClose}
      initialFocusRef={action === "delete-all" ? deleteConfirmationRef : undefined}
      actions={
        <>
          <Button variant="tertiary" disabled={busy} onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant={action === "rebuild-app-cache" ? "primary" : "danger"}
            isLoading={busy}
            loadingLabel={metadata.loadingLabel}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {metadata.confirmLabel}
          </Button>
        </>
      }
    >
      {action === "restore" && inspectionState.status === "ready" ? (
        <>
          <p>
            <strong>
              {restoreMode === "replace"
                ? "現在の利用者データを置き換えます。"
                : "現在の利用者データへ統合します。"}
            </strong>
          </p>
          <p>
            作成日: {formatBackupDate(inspectionState.preview.exportedAt)}
            <br />
            schema version: {inspectionState.preview.schemaVersion}
          </p>
          {restoreMode === "replace" ? (
            <p>
              安全バックアップ:{" "}
              <strong>{createSafetyBackup ? "作成する" : "作成しない"}</strong>
            </p>
          ) : null}
        </>
      ) : null}

      {action === "delete-recordings" ? (
        <p>
          {overview.recordings.count}件・
          {formatDataSize(overview.recordings.bytes)}
          の録音を削除します。学習履歴とテキスト回答は残ります。
        </p>
      ) : null}

      {action === "clear-audio-cache" && overview.audioCache.status === "available" ? (
        <p>
          {overview.audioCache.entryCount}件・
          {formatDataSize(overview.audioCache.bytes)}
          の再取得可能な音声を削除します。学習記録は削除しません。
        </p>
      ) : null}

      {action === "rebuild-app-cache" ? (
        <p>
          アプリの画面と静的ファイルを再取得します。IndexedDBの学習記録、下書き、録音は削除しません。
        </p>
      ) : null}

      {action === "delete-all" ? (
        <>
          <p>
            プロフィール、設定、学習履歴、進捗、下書き、録音をすべて削除します。この操作は元に戻せません。
          </p>
          <label className={styles.confirmField}>
            <span>確認のため「削除」と入力</span>
            <input
              ref={deleteConfirmationRef as RefObject<HTMLInputElement>}
              type="text"
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) =>
                onDeleteConfirmationChange(event.currentTarget.value)
              }
            />
          </label>
        </>
      ) : null}

      {dialogError !== undefined ? (
        <InlineAlert tone="danger" title="処理を完了できませんでした">
          {dialogError}
        </InlineAlert>
      ) : null}
    </Dialog>
  );
}

function confirmationMetadata(
  action: ConfirmAction | undefined,
  restoreMode: RestoreMode,
): {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly loadingLabel: string;
} {
  switch (action) {
    case "restore":
      return {
        title:
          restoreMode === "replace"
            ? "バックアップで置き換えますか"
            : "バックアップを統合しますか",
        description:
          "反映直前にファイルをもう一度検証し、完了まで一部だけを書き込みません。",
        confirmLabel: restoreMode === "replace" ? "置換して復元" : "統合して復元",
        loadingLabel: "復元中",
      };
    case "delete-recordings":
      return {
        title: "保存した録音を削除しますか",
        description: "録音だけを削除します。",
        confirmLabel: "録音を削除",
        loadingLabel: "削除中",
      };
    case "clear-audio-cache":
      return {
        title: "音声キャッシュを削除しますか",
        description: "必要な音声は接続時に再取得できます。",
        confirmLabel: "キャッシュを削除",
        loadingLabel: "削除中",
      };
    case "rebuild-app-cache":
      return {
        title: "アプリキャッシュを再構築しますか",
        description: "接続中に最新のアプリファイルを取得します。",
        confirmLabel: "再構築する",
        loadingLabel: "再構築中",
      };
    case "delete-all":
      return {
        title: "すべての利用者データを削除しますか",
        description: "二段階確認が必要です。",
        confirmLabel: "完全に削除",
        loadingLabel: "削除中",
      };
    default:
      return {
        title: "確認",
        description: "",
        confirmLabel: "実行",
        loadingLabel: "処理中",
      };
  }
}
