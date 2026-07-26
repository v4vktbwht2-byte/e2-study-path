# Phase 03 — Onboarding, Diagnostic, Course Map, and First Lessons

## Goal

初回起動からおすすめ開始地点、ステージマップ、初心者向けレッスンまでを実動させる。

## Context

- `docs/02_FUNCTIONAL_REQUIREMENTS.md` のFR-ONB / FR-DIA / FR-CUR / FR-LES
- `docs/03_CURRICULUM_MAP.md`
- `docs/05_SCREEN_SPECIFICATIONS.md`
- `docs/11_LESSON_AND_EXERCISE_ENGINE.md`

## Tasks

1. Welcome、目標、学習時間、任意受験日、データ説明を実装する。
2. 初回完了状態をUserProfileへ保存する。
3. 診断を18〜24問の上限で作る。基礎問題から始め、連続誤答時に難しい問題を抑える。
4. 「分からない」とスキップを実装する。
5. 診断結果からrecommendedStageとstrengths/gapsを計算する。
6. 結果画面で、できていること、推奨開始地点、最初の3レッスン、手動変更を表示する。
7. 設定から再診断できるようにする。
8. ステージ0〜6とユニットをcontent dataとして実装する。
9. course map、stage detail、lesson listを実装する。
10. lesson rendererを実装し、Explanation、Example、Exercise、Recall、Summaryを動作させる。
11. 中断位置、完了、skipを保存する。
12. 各ステージ最低2件のPilot lessonを追加する。下位ステージほど易しい日本語説明と短い例文にする。
13. 最低80問の文法・語彙exerciseへの土台を作り、このPhaseではオンボーディング・診断・初級lessonに必要な分を追加する。
14. 診断・レッスンのE2Eを作る。

## Diagnostic placement guideline

- Stage 0: alphabet/basic word recognitionに大きな不安
- Stage 1: alphabetは可、be/general verbsが不安
- Stage 2: present basics可、past/future/comparisonが不安
- Stage 3: basic tenses可、present perfect/passive/relative clausesが不安
- Stage 4+: upper questionsを段階的に確認

判定は厳密な公式級判定ではなく、開始提案と明記する。

## Constraints

- 初学者にいきなり上位長文を連続提示しない。
- 診断結果を「不合格」と表示しない。
- lesson contentをコンポーネントへ直書きしない。
- stage lockを強制しすぎない。

## Done when

- 新規ユーザーがオンボーディングと診断を完了できる。
- reload後に今日画面へ戻れる。
- course mapからレッスンを完了できる。
- 完了レッスンと中断位置が保存される。
- 初心者向けのステージ0/1レッスンが実際に学習可能。

## Verification

```bash
npm run check
npm run test:e2e -- --grep "onboarding|diagnostic|lesson"
```

Phase 03を記録し、Phase 04へ進む。
