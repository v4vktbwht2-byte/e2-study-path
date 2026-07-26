# Phase 09 — Full Test Suite, CI, and Static Deployment

## Goal

品質検証を自動化し、GitHub Pagesを含む静的ホスティングへ再現可能に公開できる状態にする。

## Context

- `docs/15_TEST_STRATEGY.md`
- `docs/16_DEPLOYMENT_OPERATIONS.md`
- `checklists/PWA_MOBILE_QA.md`
- `checklists/FINAL_RELEASE_CHECKLIST.md`

## Tasks

1. test coverageの不足を確認し、重要分岐を補う。
2. migration fixture、破損backup、時刻境界、unsupported APIsのテストを追加する。
3. Playwright critical journeysを安定化する。
4. E2EでDB seed helperを安全に用意する。
5. offline testをproduction previewに対して実行する。
6. axe integrationをCIへ入れる。
7. GitHub Actions workflowを作る。
   - npm ci
   - lint
   - typecheck
   - tests
   - content validation
   - build
   - E2E
8. 失敗時にPlaywright report等をartifact化する。
9. GitHub Pages deploy workflowを作る。
10. repository base pathに対応する。
11. READMEへWindows、macOS/Linux、WSLの起動手順を書く。
12. READMEへtest、content authoring、PWA install、backup、deploy、troubleshootingを書く。
13. license未決定なら勝手にOSS licenseを追加しない。
14. dependency auditを実行し、重大な問題があれば修正または記録する。
15. production previewでmanifest、SW、offline、routingを確認する。

## Constraints

- CIをgreenに見せるためテストをskipしない。
- flaky testは無条件retryだけで隠さない。
- secrets不要の構成にする。
- Pages以外でもdistを配信可能にする。

## Done when

- clean installから全checkが成功する。
- CI設定が再現可能。
- Pages build artifactが生成される。
- READMEだけで第三者が起動・テスト・deployできる。

## Verification

```bash
rm -rf node_modules dist
npm ci
npm run check
npm run test:e2e
npm audit --omit=dev || true
```

監査結果の重大度と対応を記録する。Phase 09後、Phase 10へ進む。
