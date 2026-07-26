# 12. Content Model and Authoring

## 1. コンテンツパック

各パックは独立したバージョンを持つ。

```json
{
  "id": "core-ja-beginner-to-grade2",
  "schemaVersion": "1.0.0",
  "contentVersion": "0.1.0",
  "locale": "ja-JP",
  "title": "Core Course",
  "description": "Original pilot content",
  "generatedAt": "2026-07-27T00:00:00Z",
  "source": {
    "type": "original",
    "author": "E2 Study Path project"
  },
  "vocabulary": [],
  "lessons": [],
  "exercises": []
}
```

## 2. スキーマ

`contracts/` を基準にTypeScript/Zodスキーマを実装する。JSON Schemaと実装スキーマの差分テストを用意するか、単一ソースから生成する。

## 3. 難易度メタデータ

各教材に次を持たせる。

- stage: 0〜6
- optional CEFR hint
- grammar prerequisites
- vocabulary prerequisites
- estimatedMinutes / estimatedSeconds
- targetSkills
- tags

CEFRや英検帯は参考メタデータであり、公式認定と表示しない。

## 4. オリジナル教材ルール

- 公式問題文を言い換えただけの教材を作らない
- 人名、企業名、出来事は架空または一般的なものを使う
- 差別的・偏見的な例文を避ける
- 不必要な個人情報、政治的扇動、医療助言を教材にしない
- 日本人学習者に不自然な直訳を避ける
- 正答が複数成立しないか確認する
- 誤答選択肢は意味のある誤りにする

## 5. 初学者向け例文

- 未学習文法を避ける
- 1文を短くする
- 代名詞の参照を明確にする
- 難しい固有名詞を減らす
- 新規単語以外の未知語を抑える

例:

悪い例:

```text
Protecting the environment requires sophisticated international cooperation.
```

初級向け:

```text
We must protect the environment.
```

上位ステージでは長くしてよい。

## 6. 単語項目品質

必須確認:

- 綴り
- 品詞
- 日本語意味
- 例文と訳の整合
- コロケーション
- 多義語のsense分離
- distractorが不正解であること
- 発音情報を推測で作らない。未確認なら省略可能

## 7. 読解教材

- 段落ごとに役割を持たせる
- 設問の根拠文をメタデータ化
- 正答選択肢は本文のコピーだけでなく適切な言い換えを使う
- 不正解理由を持つ
- 上位ステージでは社会的話題を扱う

## 8. リスニング教材

最低限:

- script
- speaker labels
- audio strategy
- question
- choices
- answer
- explanation
- repeat policy

Web Speech利用時は音声品質が環境依存であると表示し、公式音声の代替と誤認させない。

## 9. ライティング教材

### Summary

- 原文はオリジナル
- 中心テーマ、利点、問題点等のkey pointsをメタデータ化
- 45〜55語のサンプル回答は1例にすぎないと表示

### Opinion

- topic
- points 3つ程度
- 賛成・反対のどちらでも成立
- 理由の例
- 80〜100語のサンプル
- 内容・構成・語彙・文法のrubric

## 10. スピーキング教材

- 約60語のオリジナルpassage
- No.1回答根拠
- 3コマの代替として、Pilotでは3場面のテキストカードまたは自作SVGを使える
- No.3、No.4の質問
- 回答例は複数の可能性を認める

## 11. コンテンツ検証コマンド

`npm run validate:content` で次を検査する。

- JSON parse
- schema validation
- ID重複
- 参照切れ
- prerequisite cycle
- 正答index範囲
- 空の解説
- stage範囲
- 語数制約
- source metadata
- 禁止されたraw HTML
- 例文訳の欠落
- 読解根拠参照の範囲

## 12. コンテンツ量の目標

Pilot後の拡張目安。これは製品内目標であり公式必要語彙数ではない。

| ステージ | 語彙・熟語目標 | レッスン目標 |
|---|---:|---:|
| 0 | 200 | 16 |
| 1 | 400 | 24 |
| 2 | 500 | 24 |
| 3 | 600 | 24 |
| 4 | 600 | 24 |
| 5 | 500 | 20 |
| 6 | 600 | 24 |
| 合計 | 3,400 | 156 |

一度に生成せず、50〜100語、2〜4レッスン単位でQAする。
