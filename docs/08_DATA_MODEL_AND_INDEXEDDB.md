# 08. Data Model and IndexedDB

## 1. 識別子

- コンテンツIDはリリース間で安定させる。
- `itemKey` は `${itemType}:${itemId}` 形式。
- ユーザーデータIDはUUIDを推奨。
- 配列順序をIDとして使わない。

## 2. 主要エンティティ

### UserProfile

```ts
interface UserProfile {
  id: 'local-user';
  createdAt: string;
  updatedAt: string;
  goals: Array<'grade2' | 'relearn' | 'conversation' | 'vocabulary'>;
  dailyMinutes: number;
  targetExamDate?: string;
  recommendedStage: number;
  selectedStage: number;
  onboardingCompleted: boolean;
  diagnosticCompletedAt?: string;
}
```

### AppSettings

```ts
interface AppSettings {
  id: 'settings';
  theme: 'system' | 'light' | 'dark';
  fontScale: number;
  reducedMotion: boolean;
  dailyNewVocabularyLimit: number;
  reviewIntensity: 'gentle' | 'standard' | 'strong';
  speechRate: number;
  autoPlayAudio: boolean;
  showKanaPronunciationGuide: boolean;
}
```

### ContentPackMeta

```ts
interface ContentPackMeta {
  id: string;
  schemaVersion: string;
  contentVersion: string;
  title: string;
  locale: 'ja-JP';
  installedAt: string;
  checksum?: string;
  source: 'bundled' | 'imported';
  enabled: boolean;
}
```

### VocabularyItem

詳細は `contracts/vocabulary-item.schema.json`。

重要項目:

- stable id
- stage
- lemma / headword
- partOfSpeech
- meanings
- exampleSentences
- collocations
- confusionGroupIds
- tags
- provenance

### Lesson

- id
- stage
- unitId
- order
- prerequisites
- objectives
- sections
- exerciseIds
- estimatedMinutes
- reviewItemKeys

### Exercise

- id
- type
- stage
- prompt
- payload
- answer
- explanation
- hints
- targetSkills
- targetMasteryDimensions
- source

### Attempt

```ts
interface Attempt {
  id: string;
  itemKey: string;
  exerciseId?: string;
  sessionId: string;
  createdAt: string;
  studyDate: string;
  mode: string;
  response: unknown;
  correct: boolean;
  score: number;
  responseTimeMs: number;
  hintCount: number;
  confidence?: 'none' | 'low' | 'medium' | 'high';
  suggestedRating?: ReviewRating;
  finalRating?: ReviewRating;
  confusedWithItemKey?: string;
}
```

### ReviewState

```ts
type ReviewStatus = 'new' | 'learning' | 'review' | 'relearning' | 'suspended';
type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

interface ReviewState {
  itemKey: string;
  status: ReviewStatus;
  learningStep: number;
  intervalDays: number;
  easeBias: number;
  dueAt: string;
  lastReviewedAt?: string;
  firstLearnedAt?: string;
  reviewCount: number;
  lapseCount: number;
  consecutiveSuccesses: number;
  predictedRetention?: number;
  lastRating?: ReviewRating;
  lastResponseTimeMs?: number;
  suspendedReason?: string;
  updatedAt: string;
}
```

### MasteryProfile

```ts
interface MasteryProfile {
  itemKey: string;
  recognition: number;
  recall: number;
  listening: number;
  spelling: number;
  context: number;
  lastUpdatedAt: string;
}
```

値は0〜100。テスト形式の異なる結果を1つの「習得率」に潰さない。

### LessonProgress

```ts
interface LessonProgress {
  lessonId: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'skipped';
  currentSectionIndex: number;
  bestScore?: number;
  completedAt?: string;
  updatedAt: string;
}
```

### StudySession

```ts
interface StudySession {
  id: string;
  type: 'daily' | 'lesson' | 'vocabulary' | 'review' | 'practice' | 'mock';
  startedAt: string;
  endedAt?: string;
  studyDate: string;
  plannedMinutes?: number;
  itemKeys: string[];
  completedItemKeys: string[];
  interrupted: boolean;
}
```

### DailyPlan

```ts
interface DailyPlan {
  date: string;
  generatedAt: string;
  targetMinutes: number;
  mode: 'light' | 'standard' | 'thorough' | 'all';
  blocks: DailyPlanBlock[];
  completedBlockIds: string[];
  sourceSnapshot: {
    dueCount: number;
    overdueCount: number;
    newLimit: number;
  };
}
```

### WritingSubmission

- id
- promptId
- type: summary/opinion
- draft
- wordCount
- checklist
- createdAt / updatedAt
- submittedAt

### SpeakingRecording

- id
- promptId
- createdAt
- durationMs
- mimeType
- blob
- selfAssessment

録音Blobはバックアップの既定対象外とし、ユーザーが明示選択した場合のみ含める。

## 3. Dexie schema案

```ts
this.version(1).stores({
  profiles: 'id',
  settings: 'id',
  appMeta: 'key',
  contentPacks: 'id, contentVersion, installedAt, enabled',
  vocabulary: 'id, stage, partOfSpeech, *tags, *confusionGroupIds',
  lessons: 'id, stage, unitId, [stage+unitId], order',
  exercises: 'id, type, stage, lessonId, *targetSkills, *tags',
  attempts: 'id, itemKey, exerciseId, sessionId, createdAt, studyDate, [itemKey+createdAt]',
  reviewStates: 'itemKey, status, dueAt, lastReviewedAt, [status+dueAt]',
  mastery: 'itemKey, lastUpdatedAt',
  lessonProgress: 'lessonId, status, updatedAt',
  sessions: 'id, type, startedAt, studyDate, endedAt',
  dailyPlans: 'date, generatedAt',
  writingSubmissions: 'id, promptId, type, updatedAt',
  speakingRecordings: 'id, promptId, createdAt'
});
```

実装時にインデックス要件をテストし、不要な複合インデックスを増やさない。

## 4. トランザクション境界

1回答の確定時に同一トランザクションで更新するもの:

- Attempt追加
- ReviewState更新
- MasteryProfile更新
- StudySession進捗更新
- DailyPlanブロック進捗更新

途中で失敗したら全体をロールバックする。

## 5. コンテンツ更新

- コンテンツIDが同じ場合、教材本文を更新しても学習履歴を維持する。
- 正答の意味が変わる破壊的修正では `contentRevision` を増やす。
- 大幅変更時は対象のReviewStateを再評価し、理由をログへ残す。
- 削除された教材の進捗は即削除せず、orphanとしてバックアップ可能にする。

## 6. DB migration

- Dexie versionごとに明示
- migrationは冪等性を意識
- 実データを想定したテストを用意
- 失敗時にバックアップ案内を出す

## 7. バックアップ範囲

既定で含める:

- profile
- settings
- review states
- mastery
- lesson progress
- attempts
- sessions
- daily plans
- writing submissions

既定で除外:

- バンドル教材本体
- 再取得可能な音声キャッシュ
- speaking recording Blob

## 8. データ保持

- Attemptsは学習分析に必要なため保持する。
- データ量が大きくなった場合、古いAttemptの集計アーカイブを検討する。
- 勝手に履歴を削除しない。
