import { useEffect, useRef, useState } from "react";
import { Button, Card, EmptyState, ErrorState } from "../../shared/components";
import { buildVocabularyCollections } from "./model";
import styles from "./Vocabulary.module.css";
import type {
  VocabularyCollections,
  VocabularyHubPageProps,
  VocabularyQuestionLevel,
  VocabularySessionMode,
} from "./types";

const SYSTEM_CLOCK = { now: () => new Date() };

type LoadState =
  | { status: "loading" }
  | { status: "ready"; collections: VocabularyCollections }
  | { status: "error"; error: Error };

const MENU: readonly {
  mode: VocabularySessionMode;
  title: string;
  description: string;
}[] = [
  { mode: "due", title: "復習を始める", description: "期限が近い順に確認します。" },
  { mode: "new", title: "新しい単語", description: "カードで見てから想起します。" },
  { mode: "weak", title: "苦手だけ", description: "曖昧な語を短く復習します。" },
  {
    mode: "quickSort",
    title: "5分高速チェック",
    description: "知っている度合いを素早く確認します。",
  },
  { mode: "listening", title: "聞き取り", description: "音声から単語を入力します。" },
  { mode: "spelling", title: "スペル", description: "日本語から英語を入力します。" },
  { mode: "context", title: "文脈", description: "例文の空欄で使い方を確認します。" },
];

function countForMode(
  collections: VocabularyCollections,
  mode: VocabularySessionMode,
): number {
  if (mode === "due") return collections.due.length;
  if (mode === "new") return collections.newItems.length;
  if (mode === "weak") return collections.weak.length;
  return collections.all.length;
}

export function VocabularyHubPage({
  content,
  store,
  clock = SYSTEM_CLOCK,
  configuredNewLimit = 10,
  onStart,
  onOpenList,
}: VocabularyHubPageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [manualLevel, setManualLevel] = useState<"auto" | VocabularyQuestionLevel>(
    "auto",
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    const now = clock.now();
    void Promise.all([content.listVocabulary(), store.loadSnapshot()])
      .then(([items, snapshot]) => {
        if (active) {
          setLoadState({
            status: "ready",
            collections: buildVocabularyCollections(items, snapshot, now),
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            error:
              error instanceof Error
                ? error
                : new Error("単語データを読み込めませんでした。"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [clock, content, reloadKey, store]);

  useEffect(() => {
    if (loadState.status !== "ready") {
      return;
    }
    const heading = headingRef.current;
    const scrollContainer = heading?.closest<HTMLElement>("main");
    if (scrollContainer !== null && scrollContainer !== undefined) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    heading?.focus({ preventScroll: true });
  }, [loadState.status]);

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <p role="status">単語の学習状況を読み込んでいます。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="単語ハブを開けませんでした"
          description={loadState.error.message}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </section>
    );
  }

  const { collections } = loadState;
  if (collections.all.length === 0) {
    return (
      <section className={styles.page}>
        <h1 ref={headingRef} tabIndex={-1}>
          単語集中
        </h1>
        <EmptyState
          title="学習できる単語がまだありません"
          description="教材を読み込んだ後に、もう一度開いてください。"
        />
      </section>
    );
  }

  const newLimit = Math.min(
    Math.max(0, configuredNewLimit),
    collections.newItems.length,
  );
  return (
    <section className={styles.page} aria-labelledby="vocabulary-hub-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>単語集中</p>
          <h1 ref={headingRef} id="vocabulary-hub-title" tabIndex={-1}>
            今日の単語メニュー
          </h1>
        </div>
        {onOpenList !== undefined ? (
          <Button variant="secondary" onClick={onOpenList}>
            単語一覧
          </Button>
        ) : null}
      </header>

      <div className={styles.metrics}>
        <Card className={styles.metric}>
          <span>今日の復習</span>
          <strong>{collections.due.length}語</strong>
        </Card>
        <Card className={styles.metric}>
          <span>新規上限</span>
          <strong>{newLimit}語</strong>
        </Card>
        <Card className={styles.metric}>
          <span>復習時間の目安</span>
          <strong>約{Math.max(1, Math.ceil(collections.due.length / 3))}分</strong>
        </Card>
      </div>

      <label className={styles.field}>
        <span>出題レベル</span>
        <select
          value={manualLevel}
          onChange={(event) =>
            setManualLevel(
              event.target.value === "auto"
                ? "auto"
                : (Number(event.target.value) as VocabularyQuestionLevel),
            )
          }
        >
          <option value="auto">自動で選ぶ</option>
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <option key={value} value={value}>
              Level {value}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.menuGrid}>
        {MENU.map((entry) => {
          const count = countForMode(collections, entry.mode);
          return (
            <Card key={entry.mode} as="article" className={styles.menuCard}>
              <h2>{entry.title}</h2>
              <p>{entry.description}</p>
              <p className={styles.muted}>{count}語が対象</p>
              {entry.mode === "new" ? (
                <div className={styles.actionRow}>
                  {([5, 10, 15] as const).map((newWordLimit) => (
                    <Button
                      key={newWordLimit}
                      variant={newWordLimit === 5 ? "primary" : "secondary"}
                      onClick={() =>
                        onStart?.("new", {
                          limit: newWordLimit,
                          ...(manualLevel === "auto" ? {} : { level: manualLevel }),
                        })
                      }
                      disabled={count === 0}
                    >
                      {newWordLimit}語
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  onClick={() =>
                    onStart?.(entry.mode, {
                      ...(manualLevel === "auto" ? {} : { level: manualLevel }),
                    })
                  }
                  disabled={count === 0}
                  aria-label={`${entry.title}、対象${count}語`}
                >
                  {count === 0 ? "対象なし" : "始める"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
