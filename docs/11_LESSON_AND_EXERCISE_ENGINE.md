# 11. Lesson and Exercise Engine

## 1. レッスンモデル

レッスンは複数sectionからなる。

```ts
type LessonSection =
  | ExplanationSection
  | ExampleSection
  | ExerciseSection
  | RecallSection
  | SpeakingSection
  | SummarySection;
```

各sectionは `id`, `type`, `title`, `content`, `estimatedMinutes` を持つ。

## 2. Exercise types

Pilotで実装する型:

- `multipleChoice`
- `multiSelect`
- `trueFalse`
- `textInput`
- `cloze`
- `sentenceOrder`
- `matching`
- `listenAndChoose`
- `dictation`
- `readingQuestion`
- `selfRecall`
- `writingPrompt`
- `speakingPrompt`

## 3. 共通Exercise契約

```ts
interface BaseExercise {
  id: string;
  schemaVersion: string;
  type: string;
  stage: number;
  prompt: RichTextBlock[];
  instructionsJa?: string;
  hints: Hint[];
  explanation: ExplanationBlock[];
  targetSkills: string[];
  targetMasteryDimensions: MasteryDimension[];
  reviewItemKeys: string[];
  estimatedSeconds: number;
  source: ContentSource;
}
```

`RichTextBlock` は安全なデータ構造とし、任意HTMLを実行しない。

## 4. 採点

### 自動採点

- multipleChoice
- multiSelect
- trueFalse
- textInput
- cloze
- sentenceOrder
- matching
- listenAndChoose
- dictation
- readingQuestion

### 自己評価

- selfRecall
- writingPrompt
- speakingPrompt

自己評価はReviewRatingと混同しない。作文・会話ではrubricチェックを別に持つ。

## 5. テキスト入力正規化

- Unicode正規化NFKC
- trim
- 連続空白を1つへ
- 英字の大文字小文字は問題設定で制御
- 末尾句読点の許容を設定可能
- apostropheの表記差を正規化
- 複数正答を許可

スペル学習では過剰な曖昧一致を避ける。編集距離による「ほぼ正解」はフィードバックとして表示しても、正解判定は問題設定に従う。

## 6. Hint

- 段階的ヒント
- 使用回数をAttemptへ保存
- 最終答えを即表示するヒントは最後に置く
- ヒントを使った正解はmastery deltaを小さくする

## 7. 解説

必須要素:

- 正答
- 理由
- 誤答選択肢の主要な違い
- 必要に応じて日本語訳
- 関連レッスン

初学者向けに、文法用語だけで説明を終えない。

## 8. レッスン完了

- 必須sectionを閲覧
- 最終確認を完了
- 完了時にreview itemを登録
- スコアが低い場合も進行を完全禁止せず、再学習を提案

## 9. 途中保存

- section移動ごとにLessonProgressを保存
- 入力途中の作文はdebounce保存
- ブラウザー終了時イベントだけに依存しない

## 10. コンテンツレンダリング安全性

- Markdownを使う場合は許可要素を制限
- raw HTML無効
- URL schemeを検証
- 外部画像は初期版で原則禁止または明示許可リスト
- ユーザー入力をinnerHTMLへ渡さない
