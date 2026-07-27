# 20. Implementation Status

Codexは各フェーズ完了時に更新する。

## Overall

- [x] Phase 00 Pre-flight
- [x] Phase 01 Scaffold and foundation
- [x] Phase 02 Domain, DB, content pipeline
- [x] Phase 03 Onboarding, diagnostic, curriculum
- [x] Phase 04 Vocabulary and review
- [x] Phase 05 Daily plan and lesson engine
- [x] Phase 06 Skill modules and mock
- [x] Phase 07 PWA, offline, backup
- [ ] Phase 08 Progress, UX, accessibility
- [ ] Phase 09 Tests, CI, deployment
- [ ] Phase 10 Final audit and release
- [ ] Phase 11 Content expansion (separate)

## Feature status

| Feature          | Status      | Verification                         | Notes                                                                       |
| ---------------- | ----------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Onboarding       | Complete    | Phase 03 E2E                         | 目標・時間・任意受験日、端末内保存説明、skip                                |
| Diagnostic       | Complete    | domain + Phase 03 E2E                | 18問適応、途中再開、Stage 0〜6推薦、手動変更                                |
| Course map       | Complete    | course component + E2E               | Stage 0〜6、進捗、推奨順、強制ロックなし                                    |
| Lesson engine    | Complete    | lesson/DB integration + Phase 05 E2E | 31レッスン、155問、中断・再開・回答・原子的完了・翌学習日復習・復習位置再開 |
| Vocabulary hub   | Complete    | Phase 04 feature + E2E               | 140語、7入口、一覧・検索・お気に入り・詳細                                  |
| Review scheduler | Complete    | Phase 04 domain/feature 117 + E2E    | 4段階評価、Level 1〜7、canonical Due/Weak、Again、5軸、混同語               |
| Daily plan       | Complete    | Phase 05 domain/component + E2E      | 5/15/30/45/custom、4コース、滞留救済、競合安全な再計算、原子的完了          |
| Reading          | Complete    | Phase 06 component + E2E             | 6セット、根拠文、採点・解説、語句お気に入り                                 |
| Listening        | Complete    | audio/model/component + Phase 06 E2E | 6セット、本番風1回再生、復習、script・dictation・fallback                   |
| Writing          | Complete    | domain/component + Phase 06 E2E      | 要約4・意見4、語数、autosave、履歴、自己評価rubric                          |
| Speaking         | Complete    | recorder/component + Phase 06 E2E    | 4セット、20秒timer、録音・text response・権限fallback                       |
| Mock exam        | Complete    | component + Phase 06 E2E             | オリジナル短縮1セット、timer、中断警告、非公式結果、弱点導線                |
| Progress         | Not started | —                                    |                                                                             |
| Backup/restore   | Complete    | backup/adapter tests + Phase 07 E2E  | 厳密JSON、preview、merge/replace、安全backup、録音opt-in、分離削除          |
| PWA/offline      | Complete    | PWA tests + Phase 07 E2E             | install/iOS案内、offline、用途別cache、更新前write flush、base path         |
| Accessibility    | In progress | component + app-shell/Phase 04 E2E   | 共通UI、320px、reduced motionの基盤。画面遷移focusはPhase 08                |
| CI/deploy        | Not started | —                                    |                                                                             |

## Quality gates

| Command                  | Last result                                                                                   | Date       |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------- |
| npm run lint             | Pass                                                                                          | 2026-07-27 |
| npm run typecheck        | Pass                                                                                          | 2026-07-27 |
| npm run test             | Pass (484/484)                                                                                | 2026-07-27 |
| npm run validate:content | Pass (Pilot 140 vocabulary / 31 lessons / 155 exercises / 25 practice sets + contract sample) | 2026-07-27 |
| npm run build            | Pass (entry 209.09 kB、500 kB超のchunk警告なし、PWA precache 68件)                            | 2026-07-27 |
| npm run test:e2e         | Pass (all desktop/320px 54/54; Phase 07 8/8)                                                  | 2026-07-27 |
| npm run check            | Pass (lint、typecheck、unit、content validation、build)                                       | 2026-07-27 |

## Known issues

- iPhone Safari／ホーム画面PWAとスクリーンリーダーは、実装完了後に実機での手動確認が必要。
- Web Speechの声質・発音・端末差は実機未確認。
- 問題・feedback・画面切替時のフォーカス管理はPhase 08で仕上げる。
- MediaRecorderの録音・権限拒否とWeb Speechの音声品質・端末差は対応端末での実機確認が必要。非対応時のtext fallbackは自動テスト済み。
- 実際のwaiting Service Worker差替え、`beforeinstallprompt`、Storage永続化、iOS standaloneは配信環境・対応実機で最終確認が必要。
- `vite-plugin-pwa`内部の`inlineDynamicImports`非推奨警告が残るが、Service Worker生成と68件のprecache注入は成功している。
- 公開先とソフトウェアライセンスはリポジトリ所有者の最終判断待ち。実装を停止する要因ではない。
- PWA依存追加後の`npm install`が10件のhigh severity advisoryを報告。`npm audit --json`は依存メタデータの外部送信を伴う実行承認が得られず未実施で、Phase 09で承認条件を確認して再試行する。

## Phase notes

- 2026-07-27 Phase 00: 全仕様・契約・チェックリスト・Phaseプロンプトを監査。Node.js 24.13.1、npm 11.8.0、Git 2.53.0、Python 3.11.9を確認。依存安定版とpeer compatibilityを確認し、Git基準コミットを作成した。
- 2026-07-27 Phase 01: React/Vite基盤、全20ルート、共通UI、テーマ・動き軽減、起動エラー復旧を実装。`npm run check`とdesktop/320px app-shell E2E 8件が成功。
- 2026-07-27 Phase 02: 復習・習熟度・診断・日次計画の純粋domain、Dexie v1の16テーブルとRepository、原子的回答確定、Zod教材検証、冪等seed、StartupGateを実装。`npm run check`と144テストが成功。
- 2026-07-27 Phase 03: オンボーディング、18問適応診断、Stage 0〜6マップ、31レッスン・155問、回答必須レッスン、原子的Attempt・進捗・復習保存を実装。205 unit/component testsとdesktop/320pxのPhase 03 E2E 6件が成功。
- 2026-07-27 Phase 04: Stage 0〜6各20語・合計140語、単語ハブ・一覧・詳細、Level 1〜7、新規語の同一セッション再想起、Quick Sort、4段階評価、5軸習熟度、canonical Due/Weak、Again再挿入、混同誤答保存、Web Speech fallbackを実装。Phase 04 domain/feature 117件とdesktop/320px E2E 8/8、Pilot 140語・31レッスン・155演習の教材検証、production buildが成功した。
- 2026-07-27 Phase 05: 5/15/30/45/custom、light/standard/thorough/all、期限超過→技能練習の優先編成、80件超の滞留救済、今日画面、競合安全な再計算、IANA学習日境界、単語途中再開、完了レッスンの翌学習日復習・位置再開、DailyPlanを含む原子的保存、IndexedDB v2移行を実装。322 unit tests、全E2E desktop/320px 34/34、`npm run check`、production buildが成功した。
- 2026-07-27 Phase 06: 読解6、聞き取り6、要約4、意見4、会話4、短縮模試1のオリジナル教材と実画面を追加。AudioService、作文autosave・rubric、録音・text fallback、短縮模試中断警告、Today振分け、技能履歴とDailyPlanの原子的完了、共通教材検証を実装した。407 unit/component tests、全E2E desktop/320px 46/46、`npm run check`、production buildが成功した。
- 2026-07-27 Phase 07: prompt更新型PWA、manifest・自作icon・offline fallback・用途別cache、共通offline/install/iOS/update UI、失敗済み書込み・controller切替時の再確認・全置換/全削除の排他バリアを含む更新安全制御を実装。厳密backup v1.0.0、録音opt-in、preview、原子的merge/replace、安全backup、分離削除をデータ管理へ接続した。484 unit/component tests、全E2E desktop/320px 54/54、root/subpath production buildが成功した。
