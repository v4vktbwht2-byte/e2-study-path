import type { Ref } from "react";
import { InlineAlert } from "../../shared/components";
import { ExerciseRenderer } from "./ExerciseRenderer";
import styles from "./Lesson.module.css";
import type { LessonExerciseResult, NormalizedLessonSection } from "./types";

export interface LessonSectionViewProps {
  section: NormalizedLessonSection;
  headingRef?: Ref<HTMLHeadingElement>;
  onExerciseResult?: (result: LessonExerciseResult) => void | Promise<void>;
}

function BodyText({ value }: { value: string }) {
  return value
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={`${paragraph}-${index}`}>{paragraph}</p>);
}

export function LessonSectionView({
  section,
  headingRef,
  onExerciseResult,
}: LessonSectionViewProps) {
  return (
    <article
      className={styles.sectionCard}
      aria-labelledby={`lesson-section-${section.id}`}
    >
      <header className={styles.sectionHeader}>
        <p className={styles.sectionKind}>
          {section.kind === "goal"
            ? "目標"
            : section.kind === "explanation"
              ? "説明"
              : section.kind === "example"
                ? "例文"
                : section.kind === "exercise"
                  ? "確認"
                  : section.kind === "recall"
                    ? "思い出す"
                    : section.kind === "practice"
                      ? "使ってみる"
                      : "まとめ"}
        </p>
        <h2 id={`lesson-section-${section.id}`} ref={headingRef} tabIndex={-1}>
          {section.titleJa}
        </h2>
        {section.estimatedMinutes > 0 ? (
          <p className={styles.estimated}>
            このセクションの目安 {section.estimatedMinutes}分
          </p>
        ) : null}
      </header>

      {section.objectivesJa !== undefined ? (
        <ul className={styles.goalList}>
          {section.objectivesJa.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      ) : null}

      {section.bodyJa !== undefined ? (
        <div className={styles.bodyText}>
          <BodyText value={section.bodyJa} />
        </div>
      ) : null}

      {section.examples !== undefined && section.examples.length > 0 ? (
        <div className={styles.examples}>
          {section.examples.map((example, index) => (
            <figure key={`${example.en}-${index}`}>
              <blockquote lang="en">{example.en}</blockquote>
              <figcaption>{example.ja}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {section.exercises.map((exercise) => (
        <ExerciseRenderer
          key={exercise.id}
          exercise={exercise}
          onResult={onExerciseResult}
        />
      ))}

      {section.missingExerciseIds.length > 0 ? (
        <InlineAlert tone="warning">
          一部の確認問題を読み込めませんでした。次のセクションへ進むことはできます。
        </InlineAlert>
      ) : null}

      {(section.kind === "exercise" || section.kind === "recall") &&
      section.exercises.length === 0 &&
      section.missingExerciseIds.length === 0 ? (
        <InlineAlert tone="info">
          このセクションは説明を確認したら次へ進めます。
        </InlineAlert>
      ) : null}
    </article>
  );
}
