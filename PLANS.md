# 実行計画ログ

各Phaseの開始前に計画を追記し、完了後に結果・検証・既知制約を更新する。

## 現在のPhase

- Phase: 01 — Scaffold, App Shell, and Design Foundation
- Status: 実装準備完了
- Last updated: 2026-07-27

## Phase 00〜10 高水準計画

| Phase | 主な成果 | 主な依存 | 完了ゲート |
|---:|---|---|---|
| 00 | 資料・環境・矛盾・Git基準点の監査 | ハンドオフ一式 | `verify_handoff.py` |
| 01 | React/Vite基盤、Hash Router、共通UI、品質スクリプト | 00 | lint / typecheck / test / build / app-shell E2E |
| 02 | 純粋ドメイン、Dexie、Repository、コンテンツ検証 | 01 | domain / DB / content gate |
| 03 | オンボーディング、診断、コース、14レッスン | 02 | first-run / lesson E2E |
| 04 | 140語、単語集中、5軸習熟度、適応復習 | 02・03 | vocabulary / review E2E |
| 05 | 今日のプラン、滞留救済、レッスン統合 | 03・04 | daily-plan / backlog E2E |
| 06 | 読解・聞き取り・作文・会話・短縮模試 | 02・05 | skill-module E2E |
| 07 | PWA、オフライン、更新、バックアップ・復元 | 02・06 | offline / backup E2E |
| 08 | 記録、設定、状態表示、アクセシビリティ | 01〜07 | axe / settings / mobile E2E |
| 09 | 全テスト、CI、GitHub Pages成果物 | 01〜08 | clean install full suite |
| 10 | AC-REL-001〜012、教材、PWA、文書の最終監査 | 00〜09 | mandatory commands / release checklist |

## Phase 00 — Repository Audit and Execution Plan

**Goal**

実装前の資料、環境、既存状態、依存互換性を確認し、Phase 01〜10の実行順を固定する。

**Implementation steps**

1. `MASTER_PROMPT.md`、`START_HERE.md`、`docs/00`〜`21`、`contracts/`、`checklists/`、`planning/`、Phaseプロンプトを確認。
2. Node.js、npm、Git、Pythonとハンドオフ検証を確認。
3. npmレジストリの公開メタデータから安定版とpeer dependencyを確認。
4. Gitを初期化し、元のハンドオフを基準コミットとして保存。
5. 実装後もハンドオフ検証できるよう、生成物をマニフェスト対象外へ修正。
6. 計画、決定ログ、進捗、運用バックログを更新。

**Verification commands**

```powershell
python scripts/verify_handoff.py
node --version
npm --version
git --version
git status --short
```

**Decisions made**

- 現在の実行環境は Node.js 24.13.1、npm 11.8.0、Git 2.53.0、Python 3.11.9。
- React 19.2.8、Vite 8.1.5、TypeScript 6.0.3を基準にする。TypeScript 7.0.2は現行`typescript-eslint` 8.65.0のpeer範囲外なので採用しない。
- React Router 7.18.1、Dexie 4.4.4、Zod 4.4.3、date-fns 4.4.0、vite-plugin-pwa 1.3.0、Vitest 4.1.10、Playwright 1.62.0、ESLint 10.8.0を基準にする。
- `PROJECT_MANIFEST.json` はリポジトリソースを対象とし、Gitメタデータ、依存、ビルド・テスト生成物を除外する。
- AC-REL-001〜012は重大度の記載がないため、全件をPilot Releaseの必須条件として扱う。

**Results**

- 既存アプリコード、`package.json`、lockfile、テスト、CIはなく、仕様のみのハンドオフ状態と確認。
- 製品方針の真正面からの矛盾はなし。データ契約の不足はPhase 02で詳細仕様を優先して整合化する。
- Windows環境ではiPhone Safari／ホーム画面PWAの実機検証は実行できないため、最終的に明示的な実機確認待ちとして記録する。
- 初期コミット: `6aa0b15`。

**Known limitations / follow-up**

- 公開先とソフトウェアライセンスは所有者判断待ち。Pages用設定は作成するが、認証を要する公開操作は行わない。
- iPhone実機とスクリーンリーダーの最終手動確認は外部確認が必要。

## Phase 01 — Scaffold, App Shell, and Design Foundation

**Goal**

React + TypeScript + Viteの実行可能な基盤と、320px幅・キーボード操作・テーマ切替に対応した共通アプリシェルを完成させる。

**Files and areas expected to change**

- `package.json`、`package-lock.json`、`.nvmrc`
- Vite、TypeScript、ESLint、Vitest、Playwright設定
- `src/app/`、`src/shared/`、`src/features/`、`src/test/`
- `README.md`、`docs/20_IMPLEMENTATION_STATUS.md`、`docs/backlog.md`

**Implementation steps**

1. 互換性を確認した固定バージョンでnpm基盤とlockfileを作る。
2. Hash Routerと仕様上の全主要ルートを定義する。
3. AppShell、TopBar、BottomNavigation、Button、Card、ProgressBar、InlineAlert、EmptyState、ErrorState、Dialogを実装する。
4. CSS変数とCSS Modulesでlight/dark/system、文字、余白、focus、safe-area、reduced motionを実装する。
5. 将来Phaseの画面には説明付き準備状態を置き、`docs/backlog.md`で除去Phaseを追跡する。
6. 起動エラー境界、Not Found、ルート単位コード分割の基礎を実装する。
7. unit/component/app-shell E2Eと全必須npm scriptsを整備する。
8. 320×640で横スクロールと主要ナビゲーションを確認する。

**Verification commands**

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --grep "app shell"
```

**Decisions made**

- UIフレームワークと大型グローバル状態ライブラリは追加しない。
- Phase 01の準備画面はdead routeを避けるための一時実装とし、対応Phase完了時に必ず実画面へ置換する。

**Results**

- 未実施。

**Known limitations / follow-up**

- Phase 02以降の永続状態を使う画面は、このPhaseでは準備状態として表示する。
