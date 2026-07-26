# Phase 05 — Daily Plan, Backlog Rescue, and Lesson Integration

## Goal

今日の学習を時間内に自動編成し、復習・新規・レッスン・技能練習を一つの流れとして完了できるようにする。

## Context

- FR-DLY in `docs/02_FUNCTIONAL_REQUIREMENTS.md`
- `docs/09_REVIEW_ALGORITHM.md`
- `docs/03_CURRICULUM_MAP.md`
- `docs/11_LESSON_AND_EXERCISE_ENGINE.md`

## Tasks

1. DailyPlanServiceを完成させる。
2. 5/15/30/45分とcustomのcapacity modelを実装する。
3. 各exercise typeのestimatedSecondsを使う。
4. 優先順位を実装する。
   - overdue reviews
   - due reviews
   - weak items
   - current lesson
   - new vocabulary
   - rotating skill practice
5. light/standard/thorough/allの4コースを実装する。
6. backlogが多い場合に新規導入を自動抑制する。
7. 今日画面へ、残り時間、内訳、開始、続きから、単語ショートカットを表示する。
8. block単位の完了と中断再開を保存する。
9. 時間設定変更時に未完了部分だけ再計算する。
10. 日付が変わったときに新しいplanを作るが、前日の未完了を罰として表示しない。
11. session completion summaryを実装する。
12. current stageとweak skillsに基づくskill rotationを実装する。
13. Lesson completionで登録されたreview itemが翌日planへ反映されることを確認する。
14. due 0、少量、大量、長期休止後のunit/E2Eテストを追加する。

## Suggested capacity rules

- review recognition: 8〜12秒
- recall/typing: 15〜25秒
- lesson section: content estimate
- short reading: 3〜6分
- listening set: audio length + response
- writing: 5〜15分

見積もりは厳密な残り時間保証ではなく、学習プランの目安。

## Done when

- 今日画面から指定時間の学習を開始できる。
- overdueが新規より先に入る。
- 80件超のbacklogでlight courseが機能する。
- 完了済みblockを維持して再計算できる。
- 新しい日付でplanが更新される。

## Verification

```bash
npm run test -- dailyPlan
npm run test:e2e -- --grep "daily plan|backlog"
npm run check
```

Phase 05を記録し、Phase 06へ進む。
