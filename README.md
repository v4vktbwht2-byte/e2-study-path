# E2 Study Path — Beginner-to-Grade-2 English Learning PWA

> 作業名。英検公式または日本英語検定協会公認の製品ではありません。

英語をほぼ初めて学ぶ人が、段階的に基礎を積み上げ、最終的に英検2級相当の総合力を目指すための自己学習PWAです。

## プロダクトの3本柱

1. **初学者から始められる段階制カリキュラム**
2. **忘れかけた項目を優先する個人適応型復習**
3. **単語暗記に集中できる独立モード**

## 初期版の技術方針

- React + TypeScript + Vite
- PWA、オフライン起動、インストール対応
- IndexedDB（Dexie）によるローカル保存
- 外部アカウント・有料API・バックエンドなし
- コンテンツはバージョン付きJSON
- Vitest、Testing Library、Playwrightによる検証
- モバイルファースト、キーボード操作、アクセシビリティ配慮

## 現在の実装状況

Phase 00〜04が完了し、現在はPhase 05「今日のプラン・滞留救済・レッスン統合」を実装中です。

Phase 04では、Stage 0〜6各20語・合計140語のオリジナル語彙、単語ハブ・一覧・詳細、Level 1〜7、新規語の同一セッション再想起、Quick Sort、Again/Hard/Good/Easy、5軸習熟度、期限・苦手優先復習、混同語比較を実装しました。学習結果はIndexedDBへ原子的に保存されます。

最新のPhase 04検証は次のとおりです。

- domain/featureテスト: 117件成功
- Playwright E2E: desktop/320pxで8/8成功
- Pilot教材検証: 140語・31レッスン・155演習
- production build: 成功（メイン初期chunk 608.48 kBの警告はPhase 07/09で再評価）

Web Speechの声質・発音は実機未確認です。単語セッション途中reloadと学習日境界の設定接続はPhase 05、画面・問題切替時のフォーカス管理はPhase 08で仕上げます。

## ローカル起動

必要環境は Node.js 24.13.1（`.nvmrc`に記録）とnpm 11以降です。

```powershell
npm ci
npm run dev
```

起動後、ターミナルに表示されたローカルURLをブラウザーで開きます。ルーティングはHash Routerを使うため、静的ホスティングでも各画面を直接開けます。

## 品質確認

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run validate:content
npm run build
npm run test:e2e
npm run check
```

`npm run check` はlint、型検査、単体・コンポーネントテスト、教材検証、production buildを順に実行します。E2Eは別コマンドで実行します。

## ディレクトリ

- `src/domain/`: ReactやIndexedDBに依存しない学習規則
- `src/infrastructure/`: IndexedDB、教材、音声、PWAの実装
- `src/features/`: 画面・機能単位のUI
- `src/shared/`: 共通UI、スタイル、汎用処理
- `src/content/`: バージョン付きオリジナル教材
- `e2e/`: Playwrightによる主要フロー検証

## 主要機能

- 初回診断とおすすめ開始地点
- ステージ0〜6の学習マップ
- 今日の学習メニュー
- 初学者向けミニレッスン
- 単語集中モード
- 間隔反復・苦手優先復習
- 語彙、文法、読解、リスニング、英作文、スピーキング練習
- 英検2級形式を参考にしたオリジナル模擬演習
- 学習記録、弱点分析、復習バックログ救済
- JSONバックアップ・復元
- PWA更新通知、オフライン状態表示

## 資料の読み順

1. `START_HERE.md`
2. `MASTER_PROMPT.md`
3. `docs/00_PRODUCT_VISION.md`
4. `docs/01_SCOPE_AND_RELEASES.md`
5. `docs/02_FUNCTIONAL_REQUIREMENTS.md`
6. `docs/07_TECHNICAL_ARCHITECTURE.md`
7. `docs/09_REVIEW_ALGORITHM.md`
8. `docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md`

## 実装と教材制作の区別

この引き継ぎは、アプリ機能を完成させるための仕様とプロンプトを含みます。Codexは動作確認用のオリジナル教材を生成しますが、商用品質の大量教材は別工程です。`prompts/11_CONTENT_EXPANSION.md` と `checklists/CONTENT_QA.md` を使い、少量ずつ検証しながら追加します。
