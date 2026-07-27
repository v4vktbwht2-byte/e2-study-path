# バックログ

`planning/BACKLOG.md` は製品スコープ一覧、本ファイルは現在の実装順と未検証事項を管理する。

## 残タスク（優先度順）

1. [高] Phase 10: 最終監査・Pilot Release — 全受入条件と文書を確定。
2. [高] 最新registryのdependency audit — offline auditは0件で、`glob@11.1.0`は既知CVE修正版。外部送信承認が得られず最新照会は未実施のため、公開前に承認済み環境で全依存の`npm audit`と本番依存の`npm audit --omit=dev`を実行。
3. [中] GitHub Actions／Pages実環境確認 — remote未設定のため、CI green、Pages URL、artifact、権限を実repositoryで確認。
4. [中] iPhone Safari／ホーム画面PWA実機確認 — Windows環境外のため利用者確認が必要。
5. [中] 実配信環境でのwaiting Service Worker差替え確認 — 更新案内、保存完了、更新適用、再読込を実際の旧版・新版で確認。
6. [中] NVDA／VoiceOverによる主要フロー確認 — 実機・支援技術での最終確認が必要。
7. [中] 実ブラウザーの200% zoom・forced colors確認 — 対応環境で情報と操作が失われないことを確認。
8. [中] MediaRecorder・録音権限の実機確認 — 対応端末で権限・録音・再生・削除を確認。
9. [低] Web Speechの声質・発音確認 — 利用端末の音声エンジン依存。

## 完了

- 2026-07-27: Phase 09のclean install、CI、失敗時Playwright artifact、CI成功commit限定のGitHub Pages OIDC deploy、repository base path、production artifact検証、同期例外rollback対応の共通IndexedDB seed helper、v1 migration／破損backup／DST／MediaRecorderテスト、第三者向け運用READMEを実装。531 unit/component tests、coverage lines 80.14%、全E2E desktop/320px 70/70（Phase 09固有6/6）、root/subpath build、71ファイルのartifact検証を完了。
- 2026-07-27: Phase 08の7日・30日記録、6技能傾向、弱点、Stage進行、7設定の即時保存・反映、route focus、単一main・h1、live region、Dialog復帰、44px操作領域、320px・文字200%相当reflowを実装。518 unit/component tests、全E2E desktop/320px 64/64、主要route axe serious／critical 0件、`npm run check`を完了。
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
