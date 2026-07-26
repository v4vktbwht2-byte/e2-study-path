# Phase 10 — Final Audit and Pilot Release

## Goal

仕様、実装、テスト、教材、PWA、文書を横断レビューし、Pilot Releaseとして引き渡せる状態にする。

## Context

全資料、特に:

- `docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md`
- `docs/18_RISK_REGISTER.md`
- `checklists/FINAL_RELEASE_CHECKLIST.md`
- `checklists/CODE_REVIEW.md`

## Tasks

1. `git diff` と全リポジトリをレビューする。
2. release-level acceptance criteriaを1件ずつ確認し、結果を記録する。
3. placeholder、fake buttons、dead routes、unexplained TODOを検索し解消する。
4. duplicate abstractions、巨大component、domain leakageを確認する。
5. 公式問題、公式音声、公式ロゴ、誤認表現がないか確認する。
6. bundled content件数とstage分布をレポートする。
7. content validationと人間向けspot checkを行う。
8. 320px、一般スマホ、desktopの主要フローを確認する。
9. offline、update、backup、restore、data deletionを再確認する。
10. keyboard、focus、screen reader semantics、reduced motionを再確認する。
11. clean installから全コマンドを実行する。
12. README、CHANGELOG、app versionを更新する。
13. `docs/20_IMPLEMENTATION_STATUS.md` を最終更新する。
14. `PLANS.md` に最終結果と既知問題を書く。
15. Critical/Highの既知不具合がある場合、release completeと宣言せず修正する。
16. Medium以下で残すものは再現手順と回避策を書く。

## Mandatory commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run validate:content
npm run build
npm run test:e2e
python scripts/verify_handoff.py
```

## Done when

- 全critical acceptance criteriaがpass。
- 全mandatory commandsがpass、または実行不能理由が環境依存として明記されている。
- 主要フローにplaceholderがない。
- documentationが実装と一致する。
- Pilot Releaseの起動・公開手順が明確。

## Final response format

```text
Pilot Release summary
- Implemented:
- Architecture:
- Content counts:
- Verification:
- Deployment:
- Known limitations:
- Recommended Phase 11 batches:
```
