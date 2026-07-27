# Changelog

## Unreleased

- Phase 05「今日のプラン・滞留救済・レッスン統合」を完了。
  - 5/15/30/45分とcustom、light/standard/thorough/all、期限超過→当日期限→苦手→現在レッスン→新規語→技能練習の編成を追加。
  - 80件超の滞留でlightを15件・新規語を0件に抑える救済、残り時間・内訳・開始・続きから・完了summaryを備えた今日画面を追加。
  - 完了済みblockを維持する再計算、学習日変更時の非懲罰的な新規plan、DailyPlanを含む原子的保存を追加。
  - `studyDayStartHour`とIANAタイムゾーンによる学習日境界、単語セッション途中reload、完了レッスンの翌学習日復習を追加。
  - 最新完了状態を保つ競合統合保存、IndexedDB v2の旧DailyPlan移行、復習レッスンの位置・回答再開、planと実レッスンの整合性検証を追加。
- Phase 05検証として322 unit tests、全E2E desktop/320px 34/34（Phase 05固有8/8）、`npm run check`、production buildが成功。
- Current phaseをPhase 06「読解・聞き取り・作文・会話・短縮模試」へ更新し、技能別教材・履歴・fallbackの実装計画を確定。
- Phase 04「単語集中・適応復習」を完了。
  - Stage 0〜6各20語、合計140語のオリジナル語彙をPilot Content Packへ追加。
  - 単語ハブ・一覧・詳細、検索・絞り込み、お気に入り、メモ、停止・再開・リセットを追加。
  - Level 1〜7、新規語の同一セッション再想起、Quick Sort、4段階評価、Again再挿入、5軸習熟度を追加。
  - canonical Due/Weak順位、お気に入り加点、混同誤答の保存・弱点抽出・次回四択への反映を追加。
  - Web Speech非対応時の安全な出題切替、原子的回答保存、終了失敗時の再試行を追加。
- Phase 04検証としてdomain/feature 117件、desktop/320px E2E 8/8、Pilot 140語・31レッスン・155演習の教材検証、production buildが成功。
- 実機Web Speech、iPhone Safari／ホーム画面PWA、スクリーンリーダー確認を保留。画面遷移focusはPhase 08へ移管。
- production buildのメイン初期chunk 616.87 kB警告をPhase 07/09の再評価対象として記録。
- `npm install`が報告したhigh severity advisory 2件の`npm audit --json`は、依存メタデータの外部送信を伴う実行承認が得られず未実施。Phase 09で承認条件を確認して再試行する。
- Initial product specification and Codex implementation handoff created.
