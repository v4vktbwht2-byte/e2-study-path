import { useEffect, useState } from "react";
import {
  createNewReviewState,
  resumeReviewState,
  suspendReviewState,
  type ReviewState,
} from "../../domain/review";
import type { MasteryProfile, VocabularyUserState } from "../../domain/models";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import {
  Button,
  Card,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import {
  buildVocabularyRecords,
  formatPartOfSpeechJa,
  primaryMeaning,
  vocabularyItemKey,
} from "./model";
import { PronunciationButton } from "./PronunciationButton";
import styles from "./Vocabulary.module.css";
import type { WordDetailPageProps, VocabularyStudyRecord } from "./types";

const SYSTEM_CLOCK = { now: () => new Date() };

interface DetailData {
  record: VocabularyStudyRecord;
  confusionItems: readonly VocabularyItem[];
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DetailData }
  | { status: "error"; error: Error };

const MASTERY_LABELS: readonly {
  key: keyof Omit<MasteryProfile, "itemKey" | "lastUpdatedAt">;
  label: string;
}[] = [
  { key: "recognition", label: "見て分かる" },
  { key: "recall", label: "思い出す" },
  { key: "listening", label: "聞き取る" },
  { key: "spelling", label: "つづる" },
  { key: "context", label: "文脈で使う" },
];

function defaultUserState(itemKey: string, now: Date): VocabularyUserState {
  return {
    itemKey,
    favorite: false,
    note: "",
    suspended: false,
    updatedAt: now.toISOString(),
  };
}

export function WordDetailPage({
  wordId,
  content,
  store,
  clock = SYSTEM_CLOCK,
  onBack,
}: WordDetailPageProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [draftNote, setDraftNote] = useState("");
  const [draftFavorite, setDraftFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    setMessage(undefined);
    setErrorMessage(undefined);
    void Promise.all([
      content.getVocabulary(wordId),
      content.listVocabulary(),
      store.loadSnapshot(),
    ])
      .then(([item, items, snapshot]) => {
        if (item === undefined) {
          throw new Error("指定された単語が見つかりません。");
        }
        const record = buildVocabularyRecords([item], snapshot)[0];
        if (record === undefined) {
          throw new Error("単語の学習情報を作成できませんでした。");
        }
        const groupIds = new Set(item.confusionGroupIds);
        const confusionItems = items.filter(
          (candidate) =>
            candidate.id !== item.id &&
            candidate.confusionGroupIds.some((groupId) => groupIds.has(groupId)),
        );
        if (active) {
          setDraftNote(record.userState?.note ?? "");
          setDraftFavorite(record.userState?.favorite ?? false);
          setLoadState({
            status: "ready",
            data: { record, confusionItems },
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
                : new Error("単語詳細を読み込めませんでした。"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [content, reloadKey, store, wordId]);

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <p role="status">単語の詳細を読み込んでいます。</p>
      </section>
    );
  }
  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="単語詳細を開けませんでした"
          description={loadState.error.message}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </section>
    );
  }

  const { data } = loadState;
  const { record } = data;
  const item = record.item;
  const itemKey = vocabularyItemKey(item);
  const userState = record.userState ?? defaultUserState(itemKey, clock.now());

  const updateReadyRecord = (
    nextUserState: VocabularyUserState,
    nextReviewState?: ReviewState,
  ) => {
    setLoadState({
      status: "ready",
      data: {
        ...data,
        record: {
          ...record,
          userState: nextUserState,
          reviewState: nextReviewState ?? record.reviewState,
        },
      },
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    setErrorMessage(undefined);
    const nextUserState = {
      ...userState,
      favorite: draftFavorite,
      note: draftNote,
      updatedAt: clock.now().toISOString(),
    };
    try {
      await store.saveWordState({ userState: nextUserState });
      updateReadyRecord(nextUserState);
      setMessage("お気に入りとメモを保存しました。");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "メモを保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspended = async () => {
    setSaving(true);
    setErrorMessage(undefined);
    const now = clock.now();
    const willSuspend = !userState.suspended;
    const currentReview = record.reviewState ?? createNewReviewState(itemKey, now);
    const nextReview = willSuspend
      ? suspendReviewState(currentReview, "単語詳細から一時停止", now)
      : currentReview.status === "suspended"
        ? resumeReviewState(currentReview, now)
        : currentReview;
    const nextUserState = {
      ...userState,
      favorite: draftFavorite,
      note: draftNote,
      suspended: willSuspend,
      updatedAt: now.toISOString(),
    };
    try {
      await store.saveWordState({
        userState: nextUserState,
        reviewState: nextReview,
      });
      updateReadyRecord(nextUserState, nextReview);
      setMessage(
        willSuspend
          ? "この単語を復習キューから一時停止しました。"
          : "この単語の復習を再開しました。",
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "学習状態を保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetReview = async () => {
    setSaving(true);
    setErrorMessage(undefined);
    const now = clock.now();
    const nextReview = createNewReviewState(itemKey, now);
    const nextUserState = {
      ...userState,
      favorite: draftFavorite,
      note: draftNote,
      suspended: false,
      updatedAt: now.toISOString(),
    };
    try {
      await store.saveWordState({
        userState: nextUserState,
        reviewState: nextReview,
      });
      updateReadyRecord(nextUserState, nextReview);
      setConfirmReset(false);
      setMessage("復習状態を未学習へ戻しました。回答履歴は残っています。");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "復習状態をリセットできませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="word-detail-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            ステージ{item.stage}・{formatPartOfSpeechJa(item.partOfSpeech)}
          </p>
          <h1 id="word-detail-title" lang="en">
            {item.headword}
          </h1>
          <p>{primaryMeaning(item)}</p>
        </div>
        {onBack !== undefined ? (
          <Button variant="secondary" onClick={onBack}>
            一覧へ戻る
          </Button>
        ) : null}
      </header>

      <PronunciationButton text={item.headword} />
      {message !== undefined ? (
        <InlineAlert tone="success">{message}</InlineAlert>
      ) : null}
      {errorMessage !== undefined ? (
        <InlineAlert tone="danger" role="alert">
          {errorMessage}
        </InlineAlert>
      ) : null}

      <Card as="section" className={styles.detailSection}>
        <h2>意味と例文</h2>
        {item.meanings.map((meaning) => (
          <div key={meaning.id}>
            <h3>{meaning.ja}</h3>
            {meaning.noteJa !== undefined ? <p>{meaning.noteJa}</p> : null}
          </div>
        ))}
        {item.exampleSentences.map((example) => (
          <div key={example.id} className={styles.example}>
            <p lang="en">{example.en}</p>
            <p>{example.ja}</p>
          </div>
        ))}
      </Card>

      <Card as="section" className={styles.detailSection}>
        <h2>関連表現</h2>
        <p>
          コロケーション:{" "}
          {item.collocations.length > 0 ? item.collocations.join("、") : "登録なし"}
        </p>
        <p>
          類義語: {item.synonyms.length > 0 ? item.synonyms.join("、") : "登録なし"}
        </p>
        <p>
          反意語: {item.antonyms.length > 0 ? item.antonyms.join("、") : "登録なし"}
        </p>
        <h3>混同しやすい語</h3>
        {data.confusionItems.length > 0 ? (
          <ul>
            {data.confusionItems.map((candidate) => (
              <li key={candidate.id}>
                <span lang="en">{candidate.headword}</span> —{" "}
                {primaryMeaning(candidate)}
              </li>
            ))}
          </ul>
        ) : (
          <p>この教材では混同語の登録はありません。</p>
        )}
      </Card>

      <Card as="section" className={styles.detailSection}>
        <h2>自分のメモ・お気に入り</h2>
        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={draftFavorite}
            onChange={(event) => setDraftFavorite(event.target.checked)}
          />
          <span>お気に入りにする</span>
        </label>
        <label className={styles.field}>
          <span>自分のメモ（プレーンテキスト）</span>
          <textarea
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
          />
        </label>
        <Button
          onClick={() => {
            void savePreferences();
          }}
          isLoading={saving}
          loadingLabel="保存中"
        >
          メモを保存
        </Button>
      </Card>

      <Card as="section" className={styles.detailSection}>
        <h2>習熟度5軸</h2>
        <div className={styles.masteryGrid}>
          {MASTERY_LABELS.map(({ key, label }) => (
            <ProgressBar
              key={key}
              className={styles.masteryItem}
              value={record.mastery?.[key] ?? 0}
              label={label}
            />
          ))}
        </div>
        <p>
          次回復習:{" "}
          {record.reviewState === undefined
            ? "未登録"
            : new Date(record.reviewState.dueAt).toLocaleString("ja-JP")}
        </p>
      </Card>

      <Card as="section" className={styles.detailSection}>
        <h2>過去の回答履歴</h2>
        {record.recentAttempts.length === 0 ? (
          <p>回答履歴はまだありません。</p>
        ) : (
          <ul className={styles.history}>
            {record.recentAttempts.map((attempt) => (
              <li key={attempt.id}>
                {new Date(attempt.createdAt).toLocaleString("ja-JP")}・
                {attempt.correct === true
                  ? "正解"
                  : attempt.correct === false
                    ? "要確認"
                    : "自己確認"}
                ・評価 {attempt.finalRating ?? "未設定"}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card as="section" className={styles.detailSection}>
        <h2>復習状態</h2>
        <div className={styles.actionRow}>
          <Button
            variant="secondary"
            onClick={() => {
              void toggleSuspended();
            }}
            disabled={saving}
          >
            {userState.suspended ? "復習を再開" : "復習を一時停止"}
          </Button>
          {!confirmReset ? (
            <Button
              variant="tertiary"
              onClick={() => setConfirmReset(true)}
              disabled={saving}
            >
              復習状態をリセット
            </Button>
          ) : (
            <>
              <InlineAlert tone="warning">
                未学習へ戻します。過去の回答履歴は削除しません。
              </InlineAlert>
              <Button
                variant="danger"
                onClick={() => {
                  void resetReview();
                }}
                isLoading={saving}
                loadingLabel="リセット中"
              >
                本当にリセットする
              </Button>
              <Button variant="tertiary" onClick={() => setConfirmReset(false)}>
                キャンセル
              </Button>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
