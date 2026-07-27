import { Button, Card } from "../../shared/components";
import { formatReadingDuration, READING_FONT_SCALES } from "./model";
import styles from "./Reading.module.css";
import type { ReadingPracticeSet } from "./schema";

export interface ReadingReaderProps {
  set: ReadingPracticeSet;
  elapsedMs: number;
  fontScaleIndex: number;
  onFontScaleIndexChange: (index: number) => void;
  onStartQuestions: () => void;
  onExit?: () => void;
}

export function ReadingReader({
  set,
  elapsedMs,
  fontScaleIndex,
  onFontScaleIndexChange,
  onStartQuestions,
  onExit,
}: ReadingReaderProps) {
  const fontScale = READING_FONT_SCALES[fontScaleIndex] ?? 1;
  return (
    <section className={styles.studyPage}>
      <header className={styles.studyHeader}>
        <div>
          <p className={styles.eyebrow}>読解・本文</p>
          <h1>{set.titleJa}</h1>
        </div>
        <p className={styles.timer} aria-label="読解の経過時間">
          経過 {formatReadingDuration(elapsedMs)}
        </p>
      </header>

      <Card as="section" className={styles.readerTools} aria-label="本文の表示設定">
        <span>文字サイズ</span>
        <div className={styles.inlineActions}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              onFontScaleIndexChange(fontScaleIndex - 1);
            }}
            disabled={fontScaleIndex <= 0}
            aria-label="本文の文字を小さくする"
          >
            小さく
          </Button>
          <output aria-live="polite">{Math.round(fontScale * 100)}%</output>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              onFontScaleIndexChange(fontScaleIndex + 1);
            }}
            disabled={fontScaleIndex >= READING_FONT_SCALES.length - 1}
            aria-label="本文の文字を大きくする"
          >
            大きく
          </Button>
        </div>
      </Card>

      <Card as="article" className={styles.passage}>
        <p>{set.payload.introductionJa}</p>
        <h2 lang="en">{set.payload.passageTitleEn}</h2>
        <div
          className={styles.passageText}
          style={{ fontSize: `${fontScale}rem` }}
          lang="en"
        >
          {set.payload.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraph.id}>
              <span
                className={styles.paragraphNumber}
                aria-label={`段落${paragraphIndex + 1}`}
              >
                {paragraphIndex + 1}
              </span>{" "}
              {paragraph.sentences.map((sentence) => sentence.textEn).join(" ")}
            </p>
          ))}
        </div>
      </Card>

      <div className={styles.stickyActions}>
        {onExit === undefined ? null : (
          <Button variant="tertiary" onClick={onExit}>
            中断する
          </Button>
        )}
        <Button onClick={onStartQuestions}>設問へ進む</Button>
      </div>
    </section>
  );
}
