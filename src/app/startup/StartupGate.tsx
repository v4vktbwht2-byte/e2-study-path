import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, Card, InlineAlert } from "../../shared/components";
import { initializeApplication, type StartupSnapshot } from "./initializeApplication";
import styles from "./StartupGate.module.css";

interface StartupGateProps {
  readonly children: ReactNode;
  readonly initializer?: () => Promise<StartupSnapshot>;
}

type StartupState =
  | { status: "loading" }
  | { status: "ready"; snapshot: StartupSnapshot }
  | { status: "error"; error: Error };

export function StartupGate({
  children,
  initializer = initializeApplication,
}: StartupGateProps) {
  const [state, setState] = useState<StartupState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void initializer()
      .then((snapshot) => {
        if (active) {
          setState({ status: "ready", snapshot });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, initializer]);

  if (state.status === "ready") {
    return children;
  }

  if (state.status === "error") {
    return (
      <main className={styles.statePage}>
        <Card as="section" className={styles.panel} padding="large">
          <h1 className={styles.title}>学習データを準備できませんでした</h1>
          <InlineAlert tone="danger" title="学習データは削除されていません">
            再試行しても解決しない場合は、ブラウザーの空き容量とプライベートブラウズ設定を確認してください。
          </InlineAlert>
          <Button className={styles.retryButton} onClick={retry}>
            もう一度試す
          </Button>
          {import.meta.env.DEV ? (
            <details className={styles.details}>
              <summary>開発者向け詳細</summary>
              <pre>{state.error.message}</pre>
            </details>
          ) : null}
        </Card>
      </main>
    );
  }

  return (
    <main className={styles.statePage} aria-busy="true">
      <Card as="section" className={styles.panel} padding="large">
        <h1 className={styles.title}>学習データを準備しています</h1>
        <p className={styles.description} role="status" aria-live="polite">
          端末内の保存領域と基本教材を確認しています…
        </p>
      </Card>
    </main>
  );
}
