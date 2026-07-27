import { useEffect, useRef } from "react";
import { Button, Card, InlineAlert, ProgressBar } from "../../shared/components";
import { formatReadingDuration, isCorrectEvidence } from "./model";
import styles from "./Reading.module.css";
import type { ReadingPracticeSet, ReadingQuestion, ReadingVocabulary } from "./schema";

export type ReadingQuestionStep = "answer" | "evidence" | "feedback";

export interface ReadingQuestionsProps {
  set: ReadingPracticeSet;
  question: ReadingQuestion;
  questionIndex: number;
  step: ReadingQuestionStep;
  selectedChoice: number | null;
  selectedEvidenceId: string;
  answerTimeMs: number;
  elapsedMs: number;
  favoriteVocabularyItemIds: ReadonlySet<string>;
  favoriteSavingId?: string;
  favoriteError?: string;
  saveError?: string;
  saving: boolean;
  onChoiceChange: (index: number) => void;
  onConfirmAnswer: () => void;
  onEvidenceChange: (sentenceId: string) => void;
  onConfirmEvidence: () => void;
  onNext: () => void;
  onAddFavorite: (vocabulary: ReadingVocabulary) => void;
  onExit?: () => void;
}

export function ReadingQuestions({
  set,
  question,
  questionIndex,
  step,
  selectedChoice,
  selectedEvidenceId,
  answerTimeMs,
  elapsedMs,
  favoriteVocabularyItemIds,
  favoriteSavingId,
  favoriteError,
  saveError,
  saving,
  onChoiceChange,
  onConfirmAnswer,
  onEvidenceChange,
  onConfirmEvidence,
  onNext,
  onAddFavorite,
  onExit,
}: ReadingQuestionsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectedFeedback = question.choiceFeedbackJa.find(
    (feedback) => feedback.choiceIndex === selectedChoice,
  );
  const answerCorrect = selectedChoice === question.correctChoiceIndex;
  const evidenceCorrect =
    selectedEvidenceId !== "" && isCorrectEvidence(question, selectedEvidenceId);

  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id, step]);

  return (
    <section className={styles.studyPage}>
      <header className={styles.studyHeader}>
        <div>
          <p className={styles.eyebrow}>読解・設問</p>
          <h1>{set.titleJa}</h1>
        </div>
        <p className={styles.timer} aria-label="学習の経過時間">
          経過 {formatReadingDuration(elapsedMs)}
        </p>
      </header>

      <ProgressBar
        value={questionIndex + 1}
        max={set.payload.questions.length}
        label={`設問 ${questionIndex + 1} / ${set.payload.questions.length}`}
      />

      <Card as="section" className={styles.questionCard}>
        <h2 ref={headingRef} tabIndex={-1}>
          {question.promptJa}
        </h2>

        {step === "answer" ? (
          <>
            <fieldset className={styles.choiceGroup}>
              <legend>最も合う答えを1つ選んでください</legend>
              {question.choices.map((choice, index) => (
                <label key={choice} className={styles.choice}>
                  <input
                    type="radio"
                    name={`reading-choice-${question.id}`}
                    checked={selectedChoice === index}
                    onChange={() => {
                      onChoiceChange(index);
                    }}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </fieldset>
            <Button
              onClick={onConfirmAnswer}
              disabled={selectedChoice === null}
              fullWidth
            >
              回答を確定
            </Button>
          </>
        ) : null}

        {step === "evidence" ? (
          <>
            <InlineAlert tone="info" title="次に根拠を選びます">
              答えを支える本文の1文を選んでください。正誤は根拠を選んだあとに確認できます。
            </InlineAlert>
            <fieldset className={styles.evidenceGroup}>
              <legend>本文から根拠を1文選択</legend>
              {set.payload.paragraphs.flatMap((paragraph, paragraphIndex) =>
                paragraph.sentences.map((sentence) => (
                  <label key={sentence.id} className={styles.evidenceChoice}>
                    <input
                      type="radio"
                      name={`reading-evidence-${question.id}`}
                      checked={selectedEvidenceId === sentence.id}
                      onChange={() => {
                        onEvidenceChange(sentence.id);
                      }}
                    />
                    <span>
                      <span className={styles.evidenceParagraph}>
                        段落{paragraphIndex + 1}
                      </span>{" "}
                      <span lang="en">{sentence.textEn}</span>
                    </span>
                  </label>
                )),
              )}
            </fieldset>
            <Button
              onClick={onConfirmEvidence}
              disabled={selectedEvidenceId === ""}
              fullWidth
            >
              根拠を確認
            </Button>
          </>
        ) : null}

        {step === "feedback" ? (
          <div className={styles.feedback} aria-live="polite">
            <InlineAlert
              tone={answerCorrect ? "success" : "warning"}
              title={answerCorrect ? "正解です" : "ここを確認しましょう"}
            >
              回答時間 {formatReadingDuration(answerTimeMs)}
              ・選んだ根拠は
              {evidenceCorrect ? "合っています。" : "別の文を確認しましょう。"}
            </InlineAlert>

            <section aria-labelledby={`${question.id}-answer`}>
              <h3 id={`${question.id}-answer`}>正答と根拠</h3>
              <p>
                <strong>{question.choices[question.correctChoiceIndex]}</strong>
              </p>
              <p>{question.explanationJa}</p>
              <div className={styles.evidenceAnswer}>
                {set.payload.paragraphs.flatMap((paragraph, paragraphIndex) =>
                  paragraph.sentences
                    .filter((sentence) =>
                      question.evidenceSentenceIds.includes(sentence.id),
                    )
                    .map((sentence) => (
                      <p key={sentence.id}>
                        <span>段落{paragraphIndex + 1}：</span>{" "}
                        <mark lang="en">{sentence.textEn}</mark>
                      </p>
                    )),
                )}
              </div>
            </section>

            {selectedFeedback === undefined ? null : (
              <InlineAlert tone="warning" title="選んだ答えが違う理由">
                {selectedFeedback.reasonJa}
              </InlineAlert>
            )}

            <details>
              <summary>ほかの誤答が違う理由</summary>
              <ul className={styles.reasonList}>
                {question.choiceFeedbackJa.map((feedback) => (
                  <li key={feedback.choiceIndex}>
                    <span>{question.choices[feedback.choiceIndex]}</span>：
                    {feedback.reasonJa}
                  </li>
                ))}
              </ul>
            </details>

            <section aria-labelledby={`${question.id}-paragraphs`}>
              <h3 id={`${question.id}-paragraphs`}>段落の要点</h3>
              <ol className={styles.summaryList}>
                {set.payload.paragraphs.map((paragraph) => (
                  <li key={paragraph.id}>
                    <strong>{paragraph.roleJa}：</strong>
                    {paragraph.summaryJa}
                  </li>
                ))}
              </ol>
            </section>

            <VocabularyFavorites
              vocabulary={set.payload.keyVocabulary}
              favoriteVocabularyItemIds={favoriteVocabularyItemIds}
              favoriteSavingId={favoriteSavingId}
              favoriteError={favoriteError}
              onAddFavorite={onAddFavorite}
            />

            {saveError === undefined ? null : (
              <InlineAlert tone="danger" title="結果を保存できませんでした">
                {saveError}
              </InlineAlert>
            )}
            <Button
              onClick={onNext}
              isLoading={saving}
              loadingLabel="結果を保存中"
              fullWidth
            >
              {questionIndex === set.payload.questions.length - 1
                ? "結果を見る"
                : "次の設問へ"}
            </Button>
          </div>
        ) : null}
      </Card>

      {onExit === undefined ? null : (
        <Button variant="tertiary" onClick={onExit} disabled={saving}>
          中断する
        </Button>
      )}
    </section>
  );
}

interface VocabularyFavoritesProps {
  vocabulary: readonly ReadingVocabulary[];
  favoriteVocabularyItemIds: ReadonlySet<string>;
  favoriteSavingId?: string;
  favoriteError?: string;
  onAddFavorite: (vocabulary: ReadingVocabulary) => void;
}

export function VocabularyFavorites({
  vocabulary,
  favoriteVocabularyItemIds,
  favoriteSavingId,
  favoriteError,
  onAddFavorite,
}: VocabularyFavoritesProps) {
  return (
    <section aria-labelledby="reading-key-vocabulary">
      <h3 id="reading-key-vocabulary">重要語句</h3>
      <ul className={styles.vocabularyList}>
        {vocabulary.map((item) => {
          const favorite = favoriteVocabularyItemIds.has(item.vocabularyItemId);
          return (
            <li key={item.id}>
              <span>
                <strong lang="en">{item.headword}</strong>
                <span>：{item.meaningJa}</span>
              </span>
              <Button
                variant="secondary"
                size="small"
                disabled={favorite || favoriteSavingId === item.vocabularyItemId}
                isLoading={favoriteSavingId === item.vocabularyItemId}
                loadingLabel="追加中"
                onClick={() => {
                  onAddFavorite(item);
                }}
                aria-label={
                  favorite
                    ? `${item.headword}はお気に入りに追加済み`
                    : `${item.headword}をお気に入りに追加`
                }
              >
                {favorite ? "追加済み" : "お気に入りへ"}
              </Button>
            </li>
          );
        })}
      </ul>
      {favoriteError === undefined ? null : (
        <InlineAlert tone="danger" title="単語を追加できませんでした">
          {favoriteError}
        </InlineAlert>
      )}
    </section>
  );
}
