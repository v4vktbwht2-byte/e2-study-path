# Phase 04 — Vocabulary Mode and Adaptive Review

## Goal

単語集中モードと個人適応型復習を、学習開始から再出題・永続化まで完成させる。

## Context

- `docs/09_REVIEW_ALGORITHM.md`
- `docs/10_VOCABULARY_MODE.md`
- `docs/08_DATA_MODEL_AND_INDEXEDDB.md`
- `contracts/vocabulary-item.schema.json`

## Tasks

1. vocabulary hubを実装する。
2. New Words、Due Review、Weak Words、Quick Sort、Listening、Spelling、Contextの入口を実装する。
3. vocabulary list、filter、search、favoritesを実装する。
4. word detailを実装する。
5. card revealとretrieval practiceを分離する。
6. 出題Level 1〜7のうち、Pilotで全レベルを最低1形式ずつ実装する。
7. ReviewStateに基づく問題形式選択を実装する。
8. suggested ratingを正誤、速度、ヒント、自信度から求める。
9. ユーザーがAgain/Hard/Good/Easyを変更できる。
10. Again項目をセッション後半に再挿入する。
11. session終了サマリーを実装する。
12. mastery 5軸を可視化する。
13. confusion group比較練習を実装する。
14. 140件以上のオリジナル単語・熟語を作る。各ステージ20件以上を目安にする。
15. 初級例文の未知語・文法が難しすぎないようQAする。
16. 回答後のtransactionとreload persistenceをE2Eで確認する。
17. 未来時刻、タイムゾーン、上限interval、Again/relearningのテストを追加する。

## Constraints

- Quick Sortだけで長期定着にしない。
- 四択正解でspellingを上げない。
- Web Speech非対応時に壊れない。
- 発音記号を推測で大量生成しない。未確認なら省略可能。
- 公式単語帳の説明文をコピーしない。

## Done when

- 新規5語学習→同一セッション確認→翌日以降due保存が動く。
- Againが再出題される。
- Hard/Good/Easyで異なるintervalになる。
- 弱点抽出が動く。
- recognition/recall/listening/spelling/contextが問題形式ごとに適切に更新される。
- 140件以上のcontent validationが成功する。

## Verification

```bash
npm run validate:content
npm run test -- review
npm run test -- mastery
npm run test:e2e -- --grep "vocabulary|review|Again"
npm run build
```

Phase 04を記録し、Phase 05へ進む。
