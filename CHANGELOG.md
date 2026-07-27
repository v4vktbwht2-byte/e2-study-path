# Changelog

## Unreleased

- GitHubに`v4vktbwht2-byte/e2-study-path`をprivate repositoryとして作成し、`master`をpush。
- Cloudflare Pages + Access方針をPublic GitHub + GitHub Pagesへ変更し、スマホ向け公開URL・install手順とCI成功commit限定の自動deployを追加。
- README冒頭とlicense節へ、プログラム・文書・教材が生成AI（OpenAI Codex）を利用して作成・編集され、専門家による全件校閲済みではないことを明記。
- 公開前に追跡ファイル、秘密情報pattern、commit作者情報を監査。
- 最新registry auditを実行し、HighをRSC未使用とbuild-only間接依存として評価。最終状態で551/551 unit/component、coverage lines 80.18%、root/subpath artifact 71ファイル、E2E 70/70をPass。
- `master`のcoverage CIで顕在化した診断画面のfocus effect競合を修正し、見出しのfocus完了まで待機する安定したテストへ変更。
- 日本時間0〜4時に暦日と午前4時開始の学習日がずれて失敗する進捗E2Eを修正し、日本時間0:30固定の境界回帰へ変更。

## 0.2.0 - 2026-07-27

- Phase 10「最終監査・Pilot Release」を完了。
  - `AC-REL-001`〜`AC-REL-012`を再確認し、教材件数・Stage分布・人間向けspot check・手動確認matrixを`docs/22_PILOT_RELEASE_AUDIT.md`へ記録。
  - backupの全主要store往復、timezone offsetを含むtimestamp merge、複数タブの削除・置換と旧autosaveの競合を修正・回帰テスト。
  - 全ユーザーデータ保存をorigin-wide shared lockへ集約し、世代を進めないbackup snapshot barrierと回帰テスト6件を追加。
  - 英日混在教材の言語指定、作文の回答例と語数validation、読解・語彙・collocationの表現を校正。
  - 到達不能な準備画面を削除し、app `0.2.0`、Pilot content `0.7.0`、DB schema `2`へversionを確定。
  - 最終レビューはBlocker 0／P1 0／P2 0。実機・実配信・最新registry auditは公開前の外部確認として記録。
- Phase 10検証としてclean install、75 test files・547/547件、coverage lines 80.33%、全E2E desktop/320px 70/70、Pilot教材140語・31レッスン・155演習・25技能セット、root/subpath build、70ファイルのartifact検証が成功。最終競合修正後はlint／typecheck／format／静的経路監査をPassし、追加6回帰テストを含む動的ゲート再実行は環境制限のため公開前確認へ記録。
- Phase 09「全テスト・CI・静的デプロイ」を完了。
  - clean install、lint、型検査、unit/component、coverage、教材、build、artifact、E2Eを実行するGitHub Actions CIと、失敗時Playwright artifactを追加。
  - repository base pathを自動設定し、secret不要のOIDCでPages artifactを公開するGitHub Pages workflowを追加。
  - v1 DailyPlan migration fixture、破損backup、DST境界、MediaRecorder、原子的IndexedDB seed helperのテストを追加。
  - manifest、Service Worker、icon、starter教材、全asset参照、source map方針を検証するproduction artifact validatorを追加。
  - Windows、macOS／Linux、WSL、テスト、教材、PWA、backup、deploy、更新・rollback、troubleshootingをREADMEへ追加。
- Phase 09検証としてclean install、73 test files・531/531件、coverage lines 80.14%、全E2E desktop/320px 70/70（Phase 09固有6/6）、root/subpath build、71ファイルのartifact検証が成功。
- 次の開発batchをPhase 11「教材拡張・公開前実機確認」へ更新。
- Phase 08「記録・設定・UX状態・アクセシビリティ」を完了。
  - 7日・30日の学習記録、6技能傾向、弱点候補、Stage進行を端末内の実データから集計する記録画面を追加。
  - 学習時間、新規上限、復習強度、読み上げ速度、テーマ、文字倍率、動き軽減の即時保存・即時反映を追加。
  - route遷移focus、単一main・h1、live region、Dialog復帰、44px操作領域、320px・文字200%相当reflowを整備。
  - 主要14 routeと実データ入りTodayのaxe、キーボード完結、設定reload、進捗実データ、mobile reflow E2Eを追加。
- Phase 08検証として73 test files・518/518件、全E2E desktop/320px 64/64（Phase 08固有10/10）、axe serious／critical 0件、production build、PWA precache 70件が成功。
- 次のPhaseをPhase 09「全テスト・CI・静的デプロイ」へ更新。
- Phase 07「PWA・オフライン・安全な更新・バックアップ／復元」を完了。
  - prompt更新型Service Worker、manifest、自作192/512/maskable icon、offline fallback、version付き教材catalog、用途別runtime cacheを追加。
  - 共通offline表示、install prompt、iOS手順、更新banner、Storage Estimate、永続保存、音声cache削除、app cache再構築を追加。
  - 学習中は更新操作を無効化し、Today、単語メモ、作文画面離脱、復元・削除の実書込みPromiseが完了した後だけ更新する安全制御を追加。
  - 厳密backup schema v1.0.0、20 MiB上限、録音opt-in Base64、preview、原子的merge／replace、置換前の安全backup、録音・cache・全データの分離削除を追加。
  - starter packと各画面を動的分割し、500 kB超のchunk警告を解消。
- Phase 07検証として68 test files・484/484件、全E2E desktop/320px 54/54（Phase 07固有8/8）、root/subpath production build、PWA precache 68件が成功。
- 次のPhaseをPhase 08「記録・設定・UX状態・アクセシビリティ」へ更新。
- Phase 06「読解・聞き取り・作文・会話・短縮模試」を完了。
  - 読解6、聞き取り6、要約4、意見4、会話4、短縮模試1の計25セットを、すべてオリジナル教材として追加。
  - 読解の根拠・解説、聞き取りの本番風／復習・音声fallback、作文の語数・autosave・rubric、会話のtimer・録音／text fallbackを追加。
  - 短縮模試のsection timer、中断警告、非公式結果、弱点練習導線と、Todayから技能別教材への振分けを追加。
  - Attempt・StudySession・DailyPlanの原子的保存、履歴、plan整合性検証、共通Zod技能教材検証を追加。
- Phase 06検証として55 test files・407/407件、全E2E desktop/320px 46/46（Phase 06固有12/12）、技能教材25セットの検証、`npm run check`、production buildが成功。
- 次のPhaseをPhase 07「PWA・オフライン・バックアップ・復元」へ更新。
- Phase 05「今日のプラン・滞留救済・レッスン統合」を完了。
  - 5/15/30/45分とcustom、light/standard/thorough/all、期限超過→当日期限→苦手→現在レッスン→新規語→技能練習の編成を追加。
  - 80件超の滞留でlightを15件・新規語を0件に抑える救済、残り時間・内訳・開始・続きから・完了summaryを備えた今日画面を追加。
  - 完了済みblockを維持する再計算、学習日変更時の非懲罰的な新規plan、DailyPlanを含む原子的保存を追加。
  - `studyDayStartHour`とIANAタイムゾーンによる学習日境界、単語セッション途中reload、完了レッスンの翌学習日復習を追加。
  - 最新完了状態を保つ競合統合保存、IndexedDB v2の旧DailyPlan移行、復習レッスンの位置・回答再開、planと実レッスンの整合性検証を追加。
- Phase 05検証として322 unit tests、全E2E desktop/320px 34/34（Phase 05固有8/8）、`npm run check`、production buildが成功。
- Phase 04「単語集中・適応復習」を完了。
  - Stage 0〜6各20語、合計140語のオリジナル語彙をPilot Content Packへ追加。
  - 単語ハブ・一覧・詳細、検索・絞り込み、お気に入り、メモ、停止・再開・リセットを追加。
  - Level 1〜7、新規語の同一セッション再想起、Quick Sort、4段階評価、Again再挿入、5軸習熟度を追加。
  - canonical Due/Weak順位、お気に入り加点、混同誤答の保存・弱点抽出・次回四択への反映を追加。
  - Web Speech非対応時の安全な出題切替、原子的回答保存、終了失敗時の再試行を追加。
- Phase 04検証としてdomain/feature 117件、desktop/320px E2E 8/8、Pilot 140語・31レッスン・155演習の教材検証、production buildが成功。
- 実機Web Speech、MediaRecorder、iPhone Safari／ホーム画面PWA、スクリーンリーダー確認を保留。画面遷移focusはPhase 08へ移管。
- production buildのメイン初期chunk 676.50 kB警告をPhase 07/09の再評価対象として記録。
- `npm install`が報告したhigh severity advisory 2件の`npm audit --json`は、依存メタデータの外部送信を伴う実行承認が得られず未実施。Phase 09で承認条件を確認して再試行する。
- Initial product specification and Codex implementation handoff created.
