import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState } from "../../shared/components";
import { buildVocabularyRecords, formatPartOfSpeechJa, primaryMeaning } from "./model";
import styles from "./Vocabulary.module.css";
import type { VocabularyListPageProps, VocabularyStudyRecord } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; records: readonly VocabularyStudyRecord[] }
  | { status: "error"; error: Error };

function searchableText(record: VocabularyStudyRecord): string {
  return [
    record.item.headword,
    record.item.lemma,
    ...record.item.meanings.map((meaning) => meaning.ja),
    ...record.item.tags,
    record.userState?.note ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function studyStatus(record: VocabularyStudyRecord): string {
  if (
    record.userState?.suspended === true ||
    record.reviewState?.status === "suspended"
  ) {
    return "suspended";
  }
  return record.reviewState?.status ?? "new";
}

export function VocabularyListPage({
  content,
  store,
  onOpenWord,
  onBack,
}: VocabularyListPageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [partOfSpeech, setPartOfSpeech] = useState("all");
  const [status, setStatus] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    void Promise.all([content.listVocabulary(), store.loadSnapshot()])
      .then(([items, snapshot]) => {
        if (active) {
          setLoadState({
            status: "ready",
            records: buildVocabularyRecords(items, snapshot),
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
                : new Error("単語一覧を読み込めませんでした。"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [content, reloadKey, store]);

  const filteredRecords = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return loadState.records.filter(
      (record) =>
        (normalizedQuery === "" || searchableText(record).includes(normalizedQuery)) &&
        (stage === "all" || String(record.item.stage) === stage) &&
        (partOfSpeech === "all" || record.item.partOfSpeech === partOfSpeech) &&
        (status === "all" || studyStatus(record) === status) &&
        (!favoritesOnly || record.userState?.favorite === true),
    );
  }, [favoritesOnly, loadState, partOfSpeech, query, stage, status]);

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>単語一覧を準備しています</h1>
        <p role="status">単語一覧を読み込んでいます。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="単語一覧を開けませんでした"
          description={loadState.error.message}
          headingLevel={1}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="vocabulary-list-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>検索・絞り込み</p>
          <h1 id="vocabulary-list-title">単語一覧</h1>
        </div>
        {onBack !== undefined ? (
          <Button variant="secondary" onClick={onBack}>
            単語ハブへ戻る
          </Button>
        ) : null}
      </header>

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>単語・意味・メモを検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>ステージ</span>
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="all">すべて</option>
            {[0, 1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                ステージ{value}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>品詞</span>
          <select
            value={partOfSpeech}
            onChange={(event) => setPartOfSpeech(event.target.value)}
          >
            <option value="all">すべて</option>
            {[
              "noun",
              "verb",
              "adjective",
              "adverb",
              "pronoun",
              "preposition",
              "conjunction",
              "determiner",
              "phrase",
              "other",
            ].map((value) => (
              <option key={value} value={value}>
                {formatPartOfSpeechJa(
                  value as VocabularyStudyRecord["item"]["partOfSpeech"],
                )}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>学習状態</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">すべて</option>
            <option value="new">未学習</option>
            <option value="learning">学習中</option>
            <option value="review">復習中</option>
            <option value="relearning">再学習中</option>
            <option value="suspended">一時停止</option>
          </select>
        </label>
        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          <span>お気に入りだけ</span>
        </label>
      </div>

      <p role="status">{filteredRecords.length}語を表示しています。</p>
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="条件に合う単語がありません"
          description="検索語や絞り込み条件を変えてみてください。"
        />
      ) : (
        <div className={styles.wordGrid}>
          {filteredRecords.map((record) => (
            <Card key={record.itemKey} as="article" className={styles.wordCard}>
              <div>
                <h2 lang="en">{record.item.headword}</h2>
                <p>{primaryMeaning(record.item)}</p>
              </div>
              <p className={styles.wordMeta}>
                ステージ{record.item.stage}・
                {formatPartOfSpeechJa(record.item.partOfSpeech)}・
                {record.userState?.favorite === true ? "★ お気に入り" : "☆"}
              </p>
              <Button variant="secondary" onClick={() => onOpenWord?.(record.item.id)}>
                詳細を見る
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
