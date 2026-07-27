import { Button, InlineAlert } from "../../shared/components";
import { usePwa } from "./PwaProvider";
import styles from "./PwaUi.module.css";

export function PwaStatusRegion() {
  const {
    online,
    offlineReady,
    showUpdateNotice,
    updateFlow,
    updateMessage,
    activeStudyCount,
    registrationError,
    requestUpdate,
    dismissUpdateNotice,
    dismissOfflineReadyNotice,
  } = usePwa();

  if (online && !offlineReady && !showUpdateNotice && registrationError === undefined) {
    return null;
  }

  return (
    <aside className={styles.statusRegion} aria-label="アプリの状態">
      {!online ? (
        <InlineAlert title="オフラインで利用中です" tone="warning">
          保存済みの教材と学習記録はそのまま使えます。未取得の音声は通信が戻ってから再生してください。
        </InlineAlert>
      ) : null}

      {offlineReady ? (
        <InlineAlert
          title="オフライン利用の準備ができました"
          tone="success"
          actions={
            <Button variant="tertiary" size="small" onClick={dismissOfflineReadyNotice}>
              閉じる
            </Button>
          }
        >
          一度開いた基本画面は、通信がないときも起動できます。
        </InlineAlert>
      ) : null}

      {showUpdateNotice ? (
        <InlineAlert
          title="アプリの更新があります"
          tone={updateFlow === "failed" ? "danger" : "info"}
          actions={
            <div className={styles.actions}>
              <Button
                size="small"
                isLoading={updateFlow === "flushing" || updateFlow === "applying"}
                disabled={activeStudyCount > 0}
                loadingLabel={updateFlow === "flushing" ? "保存中" : "更新しています"}
                onClick={() => void requestUpdate()}
              >
                {activeStudyCount > 0 ? "学習を終えて更新" : "保存して更新"}
              </Button>
              <Button
                variant="tertiary"
                size="small"
                disabled={updateFlow === "flushing" || updateFlow === "applying"}
                onClick={dismissUpdateNotice}
              >
                後で
              </Button>
            </div>
          }
        >
          {updateMessage ??
            (activeStudyCount > 0
              ? "学習中の内容を守るため、終了するまで再読み込みしません。"
              : "保存を完了してから、安全に新しい版へ切り替えます。")}
        </InlineAlert>
      ) : null}

      {registrationError !== undefined ? (
        <InlineAlert title="オフライン機能を準備できませんでした" tone="warning">
          通常のWebアプリとして学習できます。通信がある状態で再読み込みしてください。
        </InlineAlert>
      ) : null}
    </aside>
  );
}
