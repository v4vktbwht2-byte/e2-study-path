import { useState } from "react";
import { Button, Card, InlineAlert } from "../../shared/components";
import { usePwa } from "./PwaProvider";
import styles from "./PwaUi.module.css";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function PwaInstallPanel() {
  const { installAvailability, lastInstallOutcome, promptInstall } = usePwa();
  const [prompting, setPrompting] = useState(false);
  const [error, setError] = useState<string>();

  const install = async () => {
    setPrompting(true);
    setError(undefined);
    try {
      await promptInstall();
    } catch (installError) {
      setError(toErrorMessage(installError));
    } finally {
      setPrompting(false);
    }
  };

  return (
    <Card as="section" className={styles.panel} aria-labelledby="install-title">
      <h2 id="install-title" className={styles.heading}>
        端末へ追加
      </h2>

      {installAvailability === "installed" ? (
        <InlineAlert title="端末へ追加されています" tone="success">
          ホーム画面やアプリ一覧からE2 Study Pathを開けます。
        </InlineAlert>
      ) : null}

      {installAvailability === "prompt" ? (
        <>
          <p className={styles.description}>
            端末へ追加すると、ホーム画面から開きやすくなります。学習データはこの端末内に保存されます。
          </p>
          <Button
            isLoading={prompting}
            loadingLabel="確認しています"
            onClick={() => void install()}
          >
            端末へ追加
          </Button>
        </>
      ) : null}

      {installAvailability === "ios-help" ? (
        <>
          <p className={styles.description}>
            Safariの共有メニューからホーム画面へ追加できます。
          </p>
          <ol className={styles.steps}>
            <li>Safari下部または上部の共有ボタンを押します。</li>
            <li>「ホーム画面に追加」を選びます。</li>
            <li>右上の「追加」を押します。</li>
          </ol>
          <p className={styles.note}>
            iOSやブラウザーの版によって、ボタンの位置や表示名が異なる場合があります。
          </p>
        </>
      ) : null}

      {installAvailability === "unavailable" ? (
        <p className={styles.description}>
          このブラウザーでは専用の追加ボタンを表示できません。通常のWebアプリとして、主要な学習機能を利用できます。
        </p>
      ) : null}

      {lastInstallOutcome === "dismissed" ? (
        <p className={styles.note} role="status">
          追加を見送りました。必要になったときに、ブラウザーのメニューから追加できます。
        </p>
      ) : null}

      {error !== undefined ? (
        <InlineAlert title="追加の案内を開けませんでした" tone="danger">
          {error}
        </InlineAlert>
      ) : null}
    </Card>
  );
}
