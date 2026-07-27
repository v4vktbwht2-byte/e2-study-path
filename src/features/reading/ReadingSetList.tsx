import { Button, Card } from "../../shared/components";
import type { ReadingPracticeSet } from "./schema";
import styles from "./Reading.module.css";

export interface ReadingSetListProps {
  sets: readonly ReadingPracticeSet[];
  onSelectSet: (set: ReadingPracticeSet) => void;
}

export function ReadingSetList({ sets, onSelectSet }: ReadingSetListProps) {
  return (
    <ul className={styles.setList} aria-label="読解セット一覧">
      {sets.map((set) => (
        <li key={set.id}>
          <Card as="article" className={styles.setCard}>
            <div>
              <p className={styles.eyebrow}>ステージ {set.stage}</p>
              <h2>{set.titleJa}</h2>
              <p>{set.descriptionJa}</p>
              <p className={styles.meta}>
                目安 {set.estimatedMinutes}分・
                {set.payload.questions.length}問
              </p>
            </div>
            <Button
              onClick={() => {
                onSelectSet(set);
              }}
              aria-label={`${set.titleJa}を始める`}
            >
              読んでみる
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
