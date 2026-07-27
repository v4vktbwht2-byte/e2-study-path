import { useEffect, useState } from "react";
import { EmptyState, ErrorState } from "../../shared/components";
import { ReadingSetList } from "./ReadingSetList";
import styles from "./Reading.module.css";
import type { ReadingPracticeSet } from "./schema";
import type { ReadingHubPageProps } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; sets: readonly ReadingPracticeSet[] }
  | { status: "error"; error: Error };

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("読解教材を読み込めませんでした。");
}

export function ReadingHubPage({ content, onSelectSet }: ReadingHubPageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    void content
      .listReadingSets()
      .then((sets) => {
        if (active) {
          setLoadState({ status: "ready", sets });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({ status: "error", error: toError(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [content, reloadKey]);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>技能練習</p>
        <h1>読解</h1>
        <p>本文を急がず読み、答えを選んだあとに根拠文も確認します。</p>
      </header>

      {loadState.status === "loading" ? (
        <p role="status" aria-live="polite">
          読解教材を読み込んでいます。
        </p>
      ) : loadState.status === "error" ? (
        <ErrorState
          title="読解教材を開けませんでした"
          description={loadState.error.message}
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      ) : loadState.sets.length === 0 ? (
        <EmptyState
          title="読解教材はまだありません"
          description="教材の準備ができるまで、ほかの技能を進められます。"
        />
      ) : (
        <ReadingSetList sets={loadState.sets} onSelectSet={onSelectSet} />
      )}
    </main>
  );
}
