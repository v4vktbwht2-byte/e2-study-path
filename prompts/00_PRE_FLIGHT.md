# Phase 00 — Repository Audit and Execution Plan

## Goal

実装を始める前に、資料、環境、既存ファイルを確認し、矛盾のない実行計画を作る。

## Context

- `AGENTS.md`
- `docs/00_PRODUCT_VISION.md`〜`docs/21_SOURCE_NOTES.md`
- `contracts/`
- `checklists/`
- `planning/`

## Tasks

1. リポジトリ全体を一覧し、既存コードの有無を確認する。
2. 仕様を読み、Pilot Releaseの完成条件を要約する。
3. Node.js、npm、Gitの利用可否を確認する。
4. 安定版のReact、TypeScript、Viteと主要依存の互換性を確認する。プレリリースは使わない。
5. `PLANS.md` にPhase 00〜10の高水準計画とPhase 01の詳細計画を書く。
6. `docs/19_DECISIONS_AND_OPEN_POINTS.md` の確定事項と矛盾する提案をしない。
7. `docs/20_IMPLEMENTATION_STATUS.md` のPhase 00を更新する。
8. Gitが利用可能なら初期状態を確認し、既存変更を上書きしない。

## Constraints

- このPhaseでは大規模実装を始めない。
- ただし、明らかな資料の参照切れやJSON構文エラーは修正してよい。
- 質問で停止せず、資料で解決できることは自律判断する。

## Done when

- 実行環境が記録されている。
- Phase 01〜10の順序と依存関係が明確。
- 仕様上の重大な矛盾がない、またはdecision logに記録済み。
- `python scripts/verify_handoff.py` が成功する。

## Verification

```bash
python scripts/verify_handoff.py
node --version
npm --version
git status --short
```
