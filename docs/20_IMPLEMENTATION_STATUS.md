# 20. Implementation Status

Codexは各フェーズ完了時に更新する。

## Overall

- [x] Phase 00 Pre-flight
- [ ] Phase 01 Scaffold and foundation
- [ ] Phase 02 Domain, DB, content pipeline
- [ ] Phase 03 Onboarding, diagnostic, curriculum
- [ ] Phase 04 Vocabulary and review
- [ ] Phase 05 Daily plan and lesson engine
- [ ] Phase 06 Skill modules and mock
- [ ] Phase 07 PWA, offline, backup
- [ ] Phase 08 Progress, UX, accessibility
- [ ] Phase 09 Tests, CI, deployment
- [ ] Phase 10 Final audit and release
- [ ] Phase 11 Content expansion (separate)

## Feature status

| Feature | Status | Verification | Notes |
|---|---|---|---|
| Onboarding | Not started | — | |
| Diagnostic | Not started | — | |
| Course map | Not started | — | |
| Lesson engine | Not started | — | |
| Vocabulary hub | Not started | — | |
| Review scheduler | Not started | — | |
| Daily plan | Not started | — | |
| Reading | Not started | — | |
| Listening | Not started | — | |
| Writing | Not started | — | |
| Speaking | Not started | — | |
| Mock exam | Not started | — | |
| Progress | Not started | — | |
| Backup/restore | Not started | — | |
| PWA/offline | Not started | — | |
| Accessibility | Not started | — | |
| CI/deploy | Not started | — | |

## Quality gates

| Command | Last result | Date |
|---|---|---|
| npm run lint | Not run | — |
| npm run typecheck | Not run | — |
| npm run test | Not run | — |
| npm run validate:content | Not run | — |
| npm run build | Not run | — |
| npm run test:e2e | Not run | — |

## Known issues

- iPhone Safari／ホーム画面PWAとスクリーンリーダーは、実装完了後に実機での手動確認が必要。
- 公開先とソフトウェアライセンスはリポジトリ所有者の最終判断待ち。実装を停止する要因ではない。

## Phase notes

- 2026-07-27 Phase 00: 全仕様・契約・チェックリスト・Phaseプロンプトを監査。Node.js 24.13.1、npm 11.8.0、Git 2.53.0、Python 3.11.9を確認。依存安定版とpeer compatibilityを確認し、Git基準コミットを作成した。
