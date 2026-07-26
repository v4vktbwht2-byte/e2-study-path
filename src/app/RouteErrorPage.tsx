import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { ErrorState } from "../shared/components";
import { FocusHeading } from "./FocusHeading";
import styles from "./RouteErrorPage.module.css";

function getErrorMessage(error: unknown): string | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  return error instanceof Error ? error.message : String(error);
}

export function RouteErrorPage() {
  const error = useRouteError();
  const details = getErrorMessage(error);
  const actions = (
    <div className={styles.actions}>
      <Link className={styles.link} to="/">
        今日の学習へ
      </Link>
      <Link className={styles.link} to="/help">
        ヘルプを見る
      </Link>
    </div>
  );

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <FocusHeading className={styles.title}>画面を表示できませんでした</FocusHeading>
        <ErrorState
          title="読み込み中に問題が起きました"
          description="学習データは削除されていません。再読み込みしても直らない場合は、今日の学習画面へ戻ってください。"
          onRetry={() => window.location.reload()}
          retryLabel="再読み込み"
          actions={actions}
        />
        {details ? (
          <details className={styles.details}>
            <summary>開発者向け詳細</summary>
            <pre>{details}</pre>
          </details>
        ) : null}
      </div>
    </main>
  );
}
