# Phase 01 — Scaffold, App Shell, and Design Foundation

## Goal

React + TypeScript + Viteの実行可能な基盤を作り、モバイルファーストのアプリシェル、ルーティング、デザイントークン、品質スクリプトを完成させる。

## Context

- `docs/04_INFORMATION_ARCHITECTURE.md`
- `docs/05_SCREEN_SPECIFICATIONS.md`
- `docs/06_DESIGN_SYSTEM.md`
- `docs/07_TECHNICAL_ARCHITECTURE.md`
- `checklists/DEFINITION_OF_DONE.md`

## Tasks

1. 現在の安定版を用いてVite + React + TypeScriptを初期化する。
2. npmを利用し、lockfileを作る。
3. `.nvmrc` または同等に実装環境のNode versionを記録する。
4. React Routerを追加し、静的ホスティングに強いHash Routerを設定する。
5. `src/` を技術設計どおりに分割する。
6. CSS Custom PropertiesとCSS Modulesでデザイントークンを実装する。
7. AppShell、TopBar、BottomNavigation、Button、Card、ProgressBar、InlineAlert、EmptyState、ErrorState、Dialogを作る。
8. 主要ルートを作り、空の白画面ではなく各機能の説明付きplaceholderを表示する。placeholderには「未実装」状態を明示し、Phase完了後に残さない追跡を行う。
9. レスポンシブレイアウト、safe-area、320px幅を考慮する。
10. light/dark/system、reduced motionの基礎を作る。
11. ESLint、Prettierまたは一貫したformatter、Vitest、Testing Library、Playwrightを設定する。
12. `npm run dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:coverage`, `test:e2e`, `validate:content`, `check` のscriptsを整備する。content validationはPhase 02まで仮の成功実装でもよいが、空のno-opにはしない。
13. 起動時エラー境界と開発者向けエラー表示を実装する。
14. READMEへローカル起動方法を書く。

## Constraints

- UIフレームワークを丸ごと導入しない。
- 画面ごとに独自色や独自ボタンを作らない。
- divにonClickだけを付けた疑似ボタンを作らない。
- 大量のグローバル状態ライブラリを導入しない。

## Done when

- 全ルートへ移動できる。
- BottomNavigationがモバイルで使える。
- 320px幅で横スクロールがない。
- ダークモードとreduced motion基礎が動く。
- lint、typecheck、test、buildが成功する。
- 基礎コンポーネントに最低限のテストがある。

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --grep "app shell"
```

## Status update

`docs/20_IMPLEMENTATION_STATUS.md` と `PLANS.md` を更新し、そのままPhase 02へ進む。
