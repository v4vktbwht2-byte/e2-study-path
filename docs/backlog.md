# バックログ

`planning/BACKLOG.md` は製品スコープ一覧、本ファイルは現在の実装順と未検証事項を管理する。

## 残タスク（優先度順）

1. [高] Phase 08: 記録・設定・アクセシビリティ — 実用時の状態、画面遷移focus、操作性を仕上げ。
2. [高] Phase 09: 全テスト・CI・静的デプロイ — 再現可能な品質ゲートを完成。
3. [高] Phase 10: 最終監査・Pilot Release — 全受入条件と文書を確定。
4. [高] npm依存のhigh severity advisory 10件を詳細監査 — `npm audit --json`は依存メタデータの外部送信を伴う実行承認が得られず未実施。Phase 09で承認条件を確認して再試行。
5. [中] iPhone Safari／ホーム画面PWA実機確認 — Windows環境外のため実装後に利用者確認が必要。
6. [中] 実配信環境でのwaiting Service Worker差替え確認 — 更新案内、保存完了、更新適用、再読込を実際の旧版・新版で確認。
7. [中] 主要フローのスクリーンリーダー手動確認 — 実機・支援技術での最終確認が必要。
8. [中] MediaRecorder・録音権限の実機確認 — 対応端末で権限・録音・再生・削除を確認。
9. [低] Web Speechの声質・発音確認 — 利用端末の音声エンジン依存。

## 完了

- 2026-07-27: Phase 07のinstall/offline/update PWA、失敗済み書込み・controller切替時の再確認・全置換/全削除の排他バリアを含む更新安全制御、厳密backup schema、20 MiB検証、録音opt-in Base64、preview、原子的replace/merge、安全backup、選択削除、320px UIを実装。484 unit/component tests、全E2E desktop/320px 54/54、root/subpath production buildを完了。初期bundleの500 kB超警告も解消。
- 2026-07-27: Phase 00の資料・環境・依存互換性・Git基準点監査を完了。
- 2026-07-27: Phase 01のReact/Vite基盤、全ルート、共通UI、品質スクリプトを実装し、全Phaseゲートを完了。
- 2026-07-27: Phase 02の復習・習熟度・診断・日次計画domain、Dexie永続化、原子的回答確定、教材検証・seed・起動処理を実装し、144テストと品質ゲートを完了。
- 2026-07-27: Phase 03のオンボーディング、適応診断、Stageマップ、31レッスン・155問、回答保存・中断再開・原子的完了を実装し、205テストとPhase E2E 6件を完了。
- 2026-07-27: Phase 04の140語、単語ハブ・一覧・詳細、Level 1〜7、新規語の同一セッション再想起、Quick Sort、4段階評価、5軸習熟度、canonical Due/Weak、混同語、原子的保存を実装。Phase 04 domain/feature 117件、desktop/320px E2E 8/8、教材検証、production buildを完了。
- 2026-07-27: Phase 05の今日の学習、5/15/30/45/custom、4コース、80件超の滞留救済、競合安全な再計算、IANA学習日境界、単語途中再開、レッスン翌学習日復習・位置再開、IndexedDB v2移行、原子的保存を実装。322 unit tests、全E2E desktop/320px 34/34、`npm run check`、production buildを完了。
- 2026-07-27: Phase 06の読解6、聞き取り6、要約4、意見4、会話4、短縮模試1、計25技能セットと各実画面、履歴・DailyPlan連携、音声・録音fallback、共通教材検証を実装。55 test files・407 unit/component tests、全E2E desktop/320px 46/46、`npm run check`、production buildを完了。

## 見送り・保留

- 公開先の最終決定と実デプロイ（GitHub認証・Pages設定が必要）。
- ソフトウェアライセンスの追加（リポジトリ所有者の選択待ち）。
