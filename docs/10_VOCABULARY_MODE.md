# 10. Vocabulary Mode

## 1. 目的

単語学習を総合コースから独立して利用できるようにしつつ、結果は共通のReviewStateとMasteryProfileへ反映する。

## 2. セッション種別

### New Words

- 5、10、15語から選択
- 表示 → 短い理解確認 → 想起
- 1語に長時間かけすぎない

### Due Review

- 復習期限順
- 答えを隠す
- Again項目をセッション内で再出題

### Weak Words

抽出条件:

- lapseCountが高い
- 直近3回で2回以上誤答
- 回答が遅い
- confidenceが低い
- recognitionとrecallの差が大きい
- 混同語誤り

### Quick Sort

- 知っている
- あやしい
- 知らない

Quick Sort結果:

- 「知らない」→new queue上位
- 「あやしい」→短い確認
- 「知っている」→認識確認問題。即masteredにはしない

### Listening

- 音声 → 意味選択
- 音声 → 単語選択
- 音声 → 入力

### Spelling

- 日本語 → 頭文字付き
- 日本語 → 文字数ヒント
- 日本語 → 完全入力
- 音声 → 入力

### Context

- 例文穴埋め
- コロケーション
- 語形変化
- 混同語比較

## 3. 出題段階

```text
Level 1: 英語 → 日本語四択
Level 2: 英語 → 答えを頭で思い出して表示
Level 3: 日本語 → 英語四択
Level 4: 日本語 → 頭文字付き入力
Level 5: 日本語 → 完全入力
Level 6: 例文穴埋め
Level 7: 音声 → スペル入力
```

進行条件はMasteryProfileとReviewStateを組み合わせる。

例:

- recognition < 40 → Level 1中心
- recognition >= 60 and recall < 40 → Level 3〜4
- recall >= 60 and spelling < 40 → Level 5
- context < 50 → Level 6
- listening < 50 → Level 7の前段

ユーザーが難易度を手動指定できる。

## 4. 単語カード情報

必須:

- headword
- part of speech
- primary Japanese meaning
- beginner-friendly example
- Japanese translation
- pronunciation action

推奨:

- secondary meaning
- collocations
- word family
- synonym / antonym
- confusion notes
- usage note

初級では情報を折りたたみ、主意味を優先する。

## 5. 多義語

1つのlemmaに複数senseを持てるが、review itemは必要に応じてsense単位とする。

```text
vocab:light:sense-illumination
vocab:light:sense-not-heavy
```

同じ単語の意味を一度に大量導入しない。

## 6. 活用・派生語

- 基本形を親にする
- `decide`, `decision`, `decisive`は関連表示
- 別の品詞として独立学習が必要なら別item
- 入力判定では大文字小文字、前後空白、正規化可能な句読点を吸収
- スペル誤りの許容は明示的。完全一致が必要なモードと練習モードを分ける

## 7. 混同語

`confusionGroupIds` を使う。

例:

- accept / except
- borrow / lend
- rise / raise
- quiet / quite

誤答後に違いを短く表示し、次の復習で比較問題を混ぜる。

## 8. 自分のメモ

- 端末内保存
- HTMLを許可せずプレーンテキスト
- バックアップ対象
- 検索対象にできる

## 9. お気に入り・一時停止

- お気に入り: 弱点優先度へ軽い加点
- 一時停止: review queueから除外
- リセット: 確認後newへ戻す。attempt履歴は維持

## 10. セッション終了

表示:

- 学習語数
- 初回成功
- 再学習
- まだ曖昧
- 次回復習の分布
- 追加で5分続ける

「完璧に暗記」等の過剰な断定をしない。
