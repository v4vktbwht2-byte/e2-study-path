import type { Attempt } from "../../domain/models";
import { Button, Card, InlineAlert } from "../../shared/components";
import { formatReadingDuration, readingScore } from "./model";
import { VocabularyFavorites } from "./ReadingQuestions";
import styles from "./Reading.module.css";
import type { ReadingPracticeSet, ReadingVocabulary } from "./schema";

export interface ReadingResultProps {
  set: ReadingPracticeSet;
  attempts: readonly Attempt[];
  readingTimeMs: number;
  favoriteVocabularyItemIds: ReadonlySet<string>;
  favoriteSavingId?: string;
  favoriteError?: string;
  completionNotice?: string;
  onAddFavorite: (vocabulary: ReadingVocabulary) => void;
  onExit?: () => void;
}

export function ReadingResult({
  set,
  attempts,
  readingTimeMs,
  favoriteVocabularyItemIds,
  favoriteSavingId,
  favoriteError,
  completionNotice,
  onAddFavorite,
  onExit,
}: ReadingResultProps) {
  const score = readingScore(attempts);
  const evidenceCorrectCount = attempts.filter((attempt) => {
    const response =
      typeof attempt.response === "object" && attempt.response !== null
        ? (attempt.response as Record<string, unknown>)
        : {};
    return response.evidenceCorrect === true;
  }).length;

  return (
    <main className={styles.studyPage}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>読解・結果</p>
        <h1>読解セットを完了しました</h1>
        <p>間違いも、次に根拠を見つけるための手がかりです。</p>
      </header>

      <Card as="section" className={styles.resultCard}>
        <h2>{set.titleJa}</h2>
        <dl className={styles.resultGrid}>
          <div>
            <dt>正答</dt>
            <dd>
              {score.correctCount} / {score.totalCount}問
            </dd>
          </div>
          <div>
            <dt>根拠文</dt>
            <dd>
              {evidenceCorrectCount} / {score.totalCount}問
            </dd>
          </div>
          <div>
            <dt>本文を読んだ時間</dt>
            <dd>{formatReadingDuration(readingTimeMs)}</dd>
          </div>
          <div>
            <dt>回答時間の合計</dt>
            <dd>{formatReadingDuration(score.totalAnswerTimeMs)}</dd>
          </div>
        </dl>
        <p className={styles.localResultNote}>
          この結果は、この端末での復習に使う練習記録です。
        </p>
      </Card>

      {completionNotice === undefined ? null : (
        <InlineAlert tone="warning" title="完了後のお知らせ">
          {completionNotice}
        </InlineAlert>
      )}

      <Card as="section">
        <VocabularyFavorites
          vocabulary={set.payload.keyVocabulary}
          favoriteVocabularyItemIds={favoriteVocabularyItemIds}
          favoriteSavingId={favoriteSavingId}
          favoriteError={favoriteError}
          onAddFavorite={onAddFavorite}
        />
      </Card>

      {onExit === undefined ? null : (
        <Button onClick={onExit} fullWidth>
          読解一覧へ戻る
        </Button>
      )}
    </main>
  );
}
