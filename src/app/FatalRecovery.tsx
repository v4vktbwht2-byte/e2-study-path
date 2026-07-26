import { useEffect, useRef } from "react";
import styles from "./FatalRecovery.module.css";

interface FatalRecoveryProps {
  readonly error: Error;
  readonly onReset: () => void;
}

export function FatalRecovery({ error, onReset }: FatalRecoveryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="fatal-error-title">
        <h1
          ref={headingRef}
          id="fatal-error-title"
          className={styles.title}
          tabIndex={-1}
        >
          アプリを起動できませんでした
        </h1>
        <p className={styles.description}>
          学習データは削除されていません。まず再読み込みをお試しください。
        </p>
        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
          <button className={styles.link} type="button" onClick={onReset}>
            今日の学習へ
          </button>
        </div>
        {import.meta.env.DEV ? (
          <details className={styles.details}>
            <summary>開発者向け詳細</summary>
            <pre>{error.message}</pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}
