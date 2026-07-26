# 20. Implementation Status

Codexは各フェーズ完了時に更新する。

## Overall

- [x] Phase 00 Pre-flight
- [x] Phase 01 Scaffold and foundation
- [x] Phase 02 Domain, DB, content pipeline
- [x] Phase 03 Onboarding, diagnostic, curriculum
- [ ] Phase 04 Vocabulary and review
- [ ] Phase 05 Daily plan and lesson engine
- [ ] Phase 06 Skill modules and mock
- [ ] Phase 07 PWA, offline, backup
- [ ] Phase 08 Progress, UX, accessibility
- [ ] Phase 09 Tests, CI, deployment
- [ ] Phase 10 Final audit and release
- [ ] Phase 11 Content expansion (separate)

## Feature status

| Feature          | Status      | Verification | Notes |
| ---------------- | ----------- | ------------ | ----- |
| Onboarding       | Complete    | Phase 03 E2E | 目標・時間・任意受験日、端末内保存説明、skip |
| Diagnostic       | Complete    | domain + Phase 03 E2E | 18問適応、途中再開、Stage 0〜6推薦、手動変更 |
| Course map       | Complete    | course component + E2E | Stage 0〜6、進捗、推奨順、強制ロックなし |
| Lesson engine    | Complete    | lesson/DB integration + E2E | 31レッスン、155問、中断・再開・回答・原子的完了 |
| Vocabulary hub   | Not started | —            |       |
| Review scheduler | Complete    | 64 domain tests | 保持率4区分、4段階評価、優先度、再挿入、停止・再開・リセット |
| Daily plan       | In progress | 36 planning/diagnostic tests | 純粋domain完成。今日画面との接続はPhase 05 |
| Reading          | Not started | —            |       |
| Listening        | Not started | —            |       |
| Writing          | Not started | —            |       |
| Speaking         | Not started | —            |       |
| Mock exam        | Not started | —            |       |
| Progress         | Not started | —            |       |
| Backup/restore   | Not started | —            |       |
| PWA/offline      | Not started | —            |       |
| Accessibility    | In progress | component + app-shell E2E | 共通UI、focus、320px、reduced motionの基盤 |
| CI/deploy        | Not started | —            |       |

## Quality gates

| Command                  | Last result | Date |
| ------------------------ | ----------- | ---- |
| npm run lint             | Pass        | 2026-07-27 |
| npm run typecheck        | Pass        | 2026-07-27 |
| npm run test             | Pass (205)  | 2026-07-27 |
| npm run validate:content | Pass (Pilot 31 lessons / 155 exercises + contract sample) | 2026-07-27 |
| npm run build            | Pass        | 2026-07-27 |
| npm run test:e2e         | Pass (Phase 03 6 + app-shell regression) | 2026-07-27 |

## Known issues

- iPhone Safari／ホーム画面PWAとスクリーンリーダーは、実装完了後に実機での手動確認が必要。
- 公開先とソフトウェアライセンスはリポジトリ所有者の最終判断待ち。実装を停止する要因ではない。
- `npm install`が2件のhigh severity advisoryを報告。詳細auditは外部照会ポリシーにより未実行で、Phase 09で再確認する。

## Phase notes

- 2026-07-27 Phase 00: 全仕様・契約・チェックリスト・Phaseプロンプトを監査。Node.js 24.13.1、npm 11.8.0、Git 2.53.0、Python 3.11.9を確認。依存安定版とpeer compatibilityを確認し、Git基準コミットを作成した。
- 2026-07-27 Phase 01: React/Vite基盤、全20ルート、共通UI、テーマ・動き軽減、起動エラー復旧を実装。`npm run check`とdesktop/320px app-shell E2E 8件が成功。
- 2026-07-27 Phase 02: 復習・習熟度・診断・日次計画の純粋domain、Dexie v1の16テーブルとRepository、原子的回答確定、Zod教材検証、冪等seed、StartupGateを実装。`npm run check`と144テストが成功。
- 2026-07-27 Phase 03: オンボーディング、18問適応診断、Stage 0〜6マップ、31レッスン・155問、回答必須レッスン、原子的Attempt・進捗・復習保存を実装。205 unit/component testsとdesktop/320pxのPhase 03 E2E 6件が成功。
