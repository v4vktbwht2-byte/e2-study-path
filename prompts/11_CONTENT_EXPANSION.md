# Phase 11 — Controlled Content Expansion

このPhaseはアプリ機能完成後に別セッションで実行する。大量生成を一度に行わない。

## Goal

`docs/12_CONTENT_MODEL_AND_AUTHORING.md` の目標へ向け、オリジナル教材を小さなbatchで増やす。

## Batch size

- Vocabulary: 50〜100件
- Lessons: 2〜4件
- Reading/listening: 2〜4セット
- Writing/speaking: 2〜4セット

## Per-batch workflow

1. 対象stage/unitと未充足objectiveを分析する。
2. 既存ID、headword、topicとの重複を確認する。
3. batch planを作る。
4. original contentを作成する。
5. schema validation。
6. ID/reference/answer checks。
7. 未学習語・未学習文法を確認する。
8. 正答・誤答理由をspot checkする。
9. `checklists/CONTENT_QA.md` を完了する。
10. contentVersionを増やす。
11. migration/seed updateをテストする。
12. 既存学習履歴が維持されることを確認する。

## Vocabulary batch prompt template

```text
Goal:
Stage {N}, Unit {ID}向けに、重複のないオリジナル語彙{COUNT}件を追加する。

Context:
- Current content pack
- Curriculum prerequisites
- vocabulary schema
- CONTENT_QA checklist

Constraints:
- 公式単語帳や過去問をコピーしない
- 各項目に品詞、自然な日本語意味、段階相応の例文と訳、tags、source metadata
- 発音記号は確認できない場合省略
- 例文で未導入語を増やしすぎない
- 多義語を一度に詰め込まない

Done when:
- validation pass
- no duplicate lemma+sense
- stage coverage report
- spot check report
```

## Lesson batch prompt template

```text
Goal:
{STAGE}/{UNIT}の学習目標を満たすオリジナルレッスンを{COUNT}件作る。

Each lesson must include:
- objective
- concise Japanese explanation
- examples
- guided exercise
- retrieval exercise
- use-in-context exercise
- summary
- review item registration

Done when:
- prerequisites valid
- all exercise references valid
- answer/explanation reviewed
- mobile rendering tested
```

## Content completion reporting

各batch後に次を出す。

- Added counts
- Stage/unit coverage
- Duplicate checks
- Validation result
- Human review still needed
- Next recommended batch
