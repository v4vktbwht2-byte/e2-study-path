# 実行計画ログ

各Phaseの開始前に計画を追記し、完了後に結果・検証・既知制約を更新する。

## 現在のPhase

- Phase: 10 — Final Audit and Pilot Release
- Status: Phase 10完了・Pilot Release 0.2.0引き渡し可能
- Last updated: 2026-07-27

## Phase 00〜10 高水準計画

| Phase | 主な成果                                            | 主な依存       | 完了ゲート                                      |
| ----: | --------------------------------------------------- | -------------- | ----------------------------------------------- |
|    00 | 資料・環境・矛盾・Git基準点の監査                   | ハンドオフ一式 | `verify_handoff.py`                             |
|    01 | React/Vite基盤、Hash Router、共通UI、品質スクリプト | 00             | lint / typecheck / test / build / app-shell E2E |
|    02 | 純粋ドメイン、Dexie、Repository、コンテンツ検証     | 01             | domain / DB / content gate                      |
|    03 | オンボーディング、診断、コース、31レッスン          | 02             | first-run / lesson E2E                          |
|    04 | 140語、単語集中、5軸習熟度、適応復習                | 02・03         | vocabulary / review E2E                         |
|    05 | 今日のプラン、滞留救済、レッスン統合                | 03・04         | daily-plan / backlog E2E                        |
|    06 | 読解・聞き取り・作文・会話・短縮模試                | 02・05         | skill-module E2E                                |
|    07 | PWA、オフライン、更新、バックアップ・復元           | 02・06         | offline / backup E2E                            |
|    08 | 記録、設定、状態表示、アクセシビリティ              | 01〜07         | axe / settings / mobile E2E                     |
|    09 | 全テスト、CI、GitHub Pages成果物                    | 01〜08         | clean install full suite                        |
|    10 | AC-REL-001〜012、教材、PWA、文書の最終監査          | 00〜09         | mandatory commands / release checklist          |

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

- Phase 00時点では公開先とソフトウェアライセンスは所有者判断待ち。後にD-025でPublic GitHub Pages、D-026でOSSライセンスを付与しない権利留保方針を確定した。
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

- React 19.2.8 + TypeScript 6.0.3 + Vite 8.1.5を固定し、lockfileを作成。
- 情報設計の20ルートをHash Routerへ登録。5タブ、設定・ヘルプ、Not Found、fatal recovery、ルート遷移時の見出しフォーカスを実装。
- 10種の共通UI、light/dark/system、safe-area、focus-visible、reduced motion、320px対応を実装。
- unit/component 28件と、desktop/320pxのapp-shell E2E 8件が成功。
- `npm run check`、`npm run test:e2e -- --grep "app shell"` が成功。

**Known limitations / follow-up**

- Phase 02以降の永続状態を使う画面は、このPhaseでは準備状態として表示する。
- `npm install` は2件のhigh severity advisoryを報告した。詳細照会は実行環境の外部送信ポリシーで拒否されたため、Phase 09のdependency auditで再確認する。

## Phase 02 — Domain Model, IndexedDB, and Content Pipeline

**Goal**

復習・習熟度・診断・日次プランを純粋TypeScriptで実装し、Dexie Repositoryとruntime content validationを通じて安全に永続化する。

**Files and areas expected to change**

- `src/domain/**`
- `src/infrastructure/db/**`、`src/infrastructure/content/**`
- `src/app/startup/**`、`src/app/providers/**`
- `src/content/**`、`contracts/**`、`scripts/validate-content.mjs`
- domain / DB / content tests

**Implementation steps**

1. 詳細仕様を反映したdomain types、ReviewScheduler interface、repository portsを定義する。
2. Review scheduler全状態・queue priority・推奨評価・Mastery 5軸・DailyPlan容量・Diagnostic placementを純粋関数で実装する。
3. Dexie v1 schemaとRepositoryを作り、回答確定時のAttempt・ReviewState・Mastery・Session・DailyPlanを1 transactionで更新する。
4. `contracts/`の不足をdecision logに沿って補い、Zod runtime schemasと整合させる。
5. sample content loader、隔離可能なvalidation、冪等seed、version updateを実装する。
6. `validate:content`をschema、重複、参照、cycle、正答、stage、source、raw HTML等の実検証へ更新する。
7. startup providerでDB・content初期化、loading・fatal recoveryを接続する。
8. scheduler分岐、時刻境界、Repository、migration、transaction rollback、seed冪等性をテストする。

**Verification commands**

```powershell
npm run lint
npm run typecheck
npm run test -- review
npm run test -- db
npm run validate:content
npm run build
```

**Decisions made**

- `docs/08`の詳細要件を優先し、回答確定transactionにはDailyPlan進捗も含める。
- Exerciseの表示本文はPilot契約のplain textを維持し、技能別の構造化データは型付きpayload schemaで検証する。
- pack envelopeと個別教材を分けて検証し、不正1件を隔離できる設計にする。

**Results**

- 復習スケジューラ、保持率4区分、回答速度評価、再挿入、5軸習熟度更新を純粋TypeScriptで実装。
- 18〜24問の診断セッション、基礎問題の連続誤答時の上位問題抑制、Stage 0〜6配置、強み・課題集計を実装。
- 学習時間容量、優先度6段階、4コース、大量滞留時の新規抑制、技能ローテーションを含む日次計画を実装。
- Dexie v1に16テーブルとRepositoryを実装。回答確定時の5領域更新を単一transactionにし、rollbackを検証。
- JSON SchemaとZodを拡張し、pack envelopeと教材単位の検証、重複・参照切れ・循環・正答index・raw HTML検出、冪等seedとversion更新を実装。
- DB、教材、初期設定を起動時に準備するStartupGateと、失敗時の日本語エラー・再試行を実装。
- `npm run check`が成功。14 test files、144件が成功。

**Known limitations / follow-up**

- お気に入り・メモの画面接続はPhase 04、技能別payloadの厳密化はPhase 06、backupの実データ検証と移行はPhase 07で完成させる。
- ブラウザ実動作の回帰テストはPhase 03の初回フローE2Eと合わせて継続する。

## Phase 03 — Onboarding, Diagnostic, Course Map, and First Lessons

**Goal**

初回起動から目標設定、適応診断、推薦開始地点、コース閲覧、Stage 0/1の最初のレッスン完了までを永続化された実フローとして完成させる。

**Files and areas expected to change**

- `src/features/onboarding/**`、`src/features/diagnostic/**`
- `src/features/course/**`、`src/features/lesson/**`
- `src/content/**`、`src/app/**`
- Phase 03 unit/component/E2E tests

**Implementation steps**

1. Welcome、学習目標、1日学習時間、任意の受験予定日、端末内保存の説明を実装し、UserProfileへ保存する。
2. 注入可能な診断問題セットと既存の純粋domainを接続し、18〜24問、分からない、skip、途中保存・再開を実装する。
3. 推薦Stage、強み・課題、最初の3レッスン、手動開始地点変更を結果画面に表示し、再診断導線を設ける。
4. Stage 0〜6のコースマップ、Stage詳細、推奨順と進捗を実装する。ロックは強制しない。
5. Stage 0/1の16ユニットに加えてStage 2〜6も各2件以上、合計26レッスン以上・80問以上のオリジナル教材をcontent packとして追加し、runtime/CI検証を通す。
6. goal、explanation、example、exercise、recall、practice、summaryを描画するレッスンエンジンと、中断・再開・完了保存を実装する。
7. 一時準備ルートを実画面へ置換し、初回起動・診断・レッスンのunit/component/E2Eを追加する。
8. 仕様、状態、バックログ、受入条件traceを更新し、Phase品質ゲートを実行する。

**Verification commands**

```powershell
npm run check
npm run test:e2e -- --grep "onboarding|diagnostic|lesson"
python scripts/verify_handoff.py
```

**Decisions made**

- 診断結果は合否ではなく「おすすめの開始地点」として表現し、利用者がStageを変更できる。
- レッスン順は推薦するが強制ロックしない。skipした項目は短い確認問題の候補へ戻す。
- 教材はすべて本プロジェクトのオリジナルとし、公式問題・ロゴ・音声を含めない。

**Results**

- 初回設定3ステップ、端末内保存説明、目標・学習時間・任意受験日、診断後回しを実装し、UserProfileへ保存。
- 18問の適応診断をStage別`3/3/3/3/2/2/2`で実装。途中保存・再開、分からない、skip、基礎3連続失敗時の早期終了、全正解時のStage 6推薦を検証。
- Stage 0〜6のマップ、現在地、完了率、推奨順、前提未達でも開始できるStage詳細を実装。
- Stage 0/1各8件、Stage 2〜6各3件、合計31レッスン・155問のオリジナル教材を追加。
- 7種のlesson section、選択・入力・自己回答、ヒント、読解本文、Web Speechと非対応fallback、回答必須、skip、中断・再開・完了を実装。
- Attempt＋StudySession、LessonProgress＋ReviewState＋StudySessionを原子的に保存し、rollbackとskip後の昇格を検証。
- `npm run check`が成功。24 test files、205件が成功。指定Phase 03 E2Eはdesktop/320pxの6件が成功。

**Known limitations / follow-up**

- Web Speechの声質と発音は端末・ブラウザー依存のため、最終的な実機確認が必要。
- 現時点のメイン初期chunkは500kB警告を超える。PWA分割と配信構成を確定するPhase 07/09で再評価する。

## Phase 04 — Vocabulary Mode and Adaptive Review

**Goal**

140件以上のオリジナル単語・熟語を、検索・絞り込み・お気に入り・7段階出題・4段階評価・5軸習熟度・適応復習へ接続する。

**Implementation steps**

1. Stage 0〜6へ各20件以上、合計140件以上のオリジナル語彙、初級例文、意味、品詞、関連表現、混同グループを追加する。
2. Vocabulary hubへ新規、期限復習、苦手、高速仕分け、聞き取り、スペル、文脈の入口と件数・所要時間を表示する。
3. 一覧、検索、Stage・品詞・状態filter、お気に入り、メモ、停止・再開を実装する。
4. 単語詳細に例文、関連表現、5軸習熟度、次回復習、履歴を表示する。
5. Level 1〜7の出題、カード閲覧と想起の区別、形式自動選択、Web Speech fallback、混同語比較を実装する。
6. 正誤・速度・ヒント・自信度からsuggested ratingを出し、Again/Hard/Good/Easyの手動変更とAgain再挿入を実装する。
7. Attempt・ReviewState・Mastery・Sessionを原子的に保存し、終了summaryと再読込後の永続化を実装する。
8. review/mastery/content/component/E2Eを追加し、Phaseゲートを通す。

**Verification commands**

```powershell
npm run validate:content
npm run test -- review
npm run test -- mastery
npm run test:e2e -- --grep "vocabulary|review|Again"
npm run build
```

**Decisions made**

- Quick Sortだけではmasteredにせず、認識確認を経てReviewStateへ進める。
- 発音記号は推測生成せず、未確認項目ではWeb Speechまたは英文表示を使う。
- 四択はrecognitionだけを更新し、spelling/recallは対象形式でのみ更新する。

**Results**

- Stage 0〜6へ各20語、合計140語のオリジナル語彙を追加し、31レッスン・155演習と同じPilot Content Packへ統合した。
- 新規、期限復習、苦手、高速仕分け、聞き取り、スペル、文脈の入口、一覧・検索・絞り込み、お気に入り、メモ、停止・再開・リセット、単語詳細を実装した。
- 新規語の閲覧、短い理解確認、同一セッション内のLevel 2再想起、翌日以降のdue保存を接続した。Quick Sortは全件分類後に`unknown → unsure → known`順で実確認し、自己申告だけでは習得扱いにしない。
- Level 1〜7、正誤・速度・ヒント・自信度による推奨評価、Again/Hard/Good/Easy上書き、Again再挿入、5軸Mastery更新、終了summaryを実装した。
- Dueをcanonical `rankReviewQueue`へ接続し、お気に入りを`userPinned`として反映した。Weakは`extractWeakWords`の一括score順とお気に入り軽加点を使う。
- 混同語の誤選択をAttemptへ保存し、Weak抽出、誤答後比較、次回Level 1/3四択の候補優先へ接続した。
- Attempt・ReviewState・Mastery・Sessionを同一transactionで保存し、回答履歴・お気に入り・メモの再読込後永続化と失敗時の再試行を検証した。
- Phase 04 domain/featureテスト117件、全unit 32ファイル・282/282件、desktop/320pxのPhase 04 E2E 8/8が成功。教材検証はPilot 140語・31レッスン・155演習とcontract sampleで成功し、`npm run check`とproduction buildも成功した。

**Known limitations / follow-up**

- 実音声ファイルは含めず、PilotではWeb Speechと明示fallbackを使う。声質・発音・端末差は実機未確認。
- 単語セッション途中reloadの再開と、`studyDayStartHour`・IANAタイムゾーンを使う学習日境界の画面接続はPhase 05で実装済み。
- 問題・feedback・画面切替時のフォーカス管理とスクリーンリーダー手動確認はPhase 08で仕上げる。
- production buildは成功するが、メイン初期chunkが608.48 kBで警告対象。Phase 07/09のPWA分割・配信構成で再評価する。

## Phase 05 — Daily Plan, Backlog Rescue, and Lesson Integration

**Goal**

利用者が選んだ時間内に、期限超過復習、当日復習、苦手、新規語、現在レッスン、技能練習を一つの「今日の学習」として自動編成し、完了済み項目を失わず中断・再開・再計算できるようにする。

**Files and areas expected to change**

- `src/domain/planning/**`
- `src/features/today/**`、`src/features/lesson/**`、`src/features/vocabulary/**`
- `src/infrastructure/db/**`、`src/app/routes/**`
- Daily Plan unit/component/E2E tests

**Implementation steps**

1. 既存の純粋`buildDailyPlan`を唯一の編成規則として維持し、ReviewState、Weak、LessonProgress、Mastery、設定から候補を作るapplication/Repository境界を実装する。
2. 5/15/30/45分とcustomのcapacityを接続し、復習8〜12秒、想起・入力15〜25秒、教材の`estimatedSeconds`／`estimatedMinutes`を見積もりへ使う。
3. `overdue review → due review → weak item → current lesson → new vocabulary → rotating skill practice`の優先順位を画面と保存データへ反映する。
4. light/standard/thorough/allの4コースを実装し、大量backlogでは新規導入を抑え、80件超でもlight courseが短時間で完了できるようにする。
5. 今日画面へ残り時間、内訳、開始、続きから、単語ショートカット、空・loading・error状態を実装する。
6. DailyPlan blockとStudySessionの完了・中断を原子的に保存し、設定時間変更時は完了済みblockを固定して未完了部分だけを再計算する。
7. 学習日が変わったら新しいplanを作り、前日の未完了を失敗や連続記録の罰として表示しない。
8. current Stageと弱い技能からskill rotationを決定し、レッスン完了で登録されたreview itemを翌学習日のplanへ反映する。
9. AppSettingsの`studyDayStartHour`と端末IANAタイムゾーンをDaily Plan・Attempt・Reviewへ一貫して注入し、単語セッション途中reloadも回答確定地点から再開できるようにする。
10. due 0件、少量、大量、80件超、長期休止、日付変更、時間変更、中断再開をunit/component/E2Eで検証し、Phase品質ゲートを通す。

**Verification commands**

```powershell
npm run test -- dailyPlan
npm run test:e2e -- --grep "daily plan|backlog"
npm run check
```

**Decisions made**

- 編成規則をReactやDexieへ重複実装せず、純粋domainへ候補と注入時刻を渡す。
- 再計算では完了済みblockを不変とし、残り時間と未完了候補だけを再編成する。
- lightを選んだ結果残った項目や前日未完了を失敗扱いにせず、励ます日本語で次回候補として扱う。
- `all`以外は時間容量を目安として使い、最小の意味あるblockが1件も入らない場合だけ予算超過を許容する。
- 学習日は端末ローカル日付の単純な文字列化ではなく、AppSettingsの開始時刻とIANAタイムゾーンから決定する。

**Results**

- 5/15/30/45分とcustom、light/standard/thorough/allを純粋domainの`buildDailyPlan`へ接続し、期限超過、当日期限、苦手、現在レッスン、新規語、技能練習の順で編成できるようにした。
- 80件超の滞留ではlightを15件、新規語を0件へ抑え、標準・しっかり・すべてを含む4コースから無理のない量を選べるようにした。
- 今日画面へ学習日、残り時間、内訳、優先理由、開始・続きから、単語ショートカット、完了summary、空・loading・error状態を実装した。
- DailyPlan blockの完了をAttempt・ReviewState・Mastery・StudySessionまたはLessonProgressと同一transactionで保存し、再読込後も完了状態を維持する。時間変更時は完了blockを固定し、未完了部分だけを再計算する。
- DB上の最新完了状態と再計算planをtransaction内で単調増加に統合し、別タブや古い画面からの保存でも完了を巻き戻さない。旧DailyPlan契約はIndexedDB v2 migrationで現行block契約へ変換する。
- `studyDayStartHour`と端末IANAタイムゾーンから学習日境界を解決し、DSTを含む時刻境界をDaily Plan・レッスン・単語へ注入した。学習日が変わると前日未完了を罰せず新しいplanを作る。
- 単語セッションは確定済み回答とLevel 2再想起queueから途中再開でき、重複した未完了sessionを閉じる。今日のプラン経由では、due語は回答確定、新規語は同一セッションの再想起完了時にblockを完了する。
- レッスン完了時に次学習日のreview itemを登録した。期限到来後の復習blockでは元の完了進捗を壊さず全セクションと問題を再実施し、セクション位置・回答済み問題を中断再開できる。URLのplan項目と実レッスンの一致も検証し、復習結果とDailyPlan blockを原子的に保存する。
- レッスン候補は各Exerciseの`estimatedSeconds`を優先して所要時間を計算し、説明sectionは`estimatedMinutes`へフォールバックする。
- 全unit 322/322件、全E2E desktop/320px 34/34（Phase 05固有8/8）が成功し、`npm run check`も成功した。production buildは成功したが、メイン初期chunk 616.87 kBの警告が残る。

**Known limitations / follow-up**

- Web Speechの声質・発音、iPhone Safari／ホーム画面PWA、スクリーンリーダーは実機未確認。
- メイン初期chunk 676.50 kBはPhase 07/09で分割と配信構成を再評価する。
- `npm audit --json`は依存メタデータの外部送信を伴う実行承認が得られず未実施。Phase 09で承認条件を確認して再試行する。

## Phase 06 — Reading, Listening, Writing, Speaking, and Mock Practice

**Goal**

読解・聞き取り・英作文・スピーキングを実際に完了して履歴保存できる技能別モジュールとして実装し、上位Stageでは英検2級の現行形式を参考にしたオリジナル短縮模試へ接続する。

**Files and areas expected to change**

- `src/features/reading/**`、`src/features/listening/**`
- `src/features/writing/**`、`src/features/speaking/**`、`src/features/mock/**`
- `src/domain/practice/**`、`src/infrastructure/audio/**`、`src/infrastructure/db/**`
- `src/content/**`、`contracts/**`、`src/app/routes/**`
- 技能別unit/component/E2E tests

**Implementation steps**

1. 既存のExercise・Attempt・StudySession・ReviewState・Mastery・DailyPlan契約を再利用し、技能別の採点可能問題と自己評価課題を純粋domainとRepository境界へ分離する。
2. 読解ハブ、セット一覧、段落番号付きreader、文字サイズ、回答時間、根拠文選択、結果画面を実装し、正答根拠・誤答理由・段落要点・重要語句を表示する。重要語句は単語お気に入りへ追加できるようにする。
3. オリジナル読解を6セット以上追加し、Stage、技能、出典、正答、解説、参照整合性をruntime/CIで検証する。
4. 聞き取りへ本番風と復習モードを実装する。本番風は1回再生を制御し、復習では繰り返し、速度、一文再生、script、dictationを提供する。
5. `AudioService`をasset audio・Web Speech・unsupportedへ抽象化し、オフライン・音声なし・Web Speech非対応でも英文表示と自己練習で完了できるようにする。オリジナルscriptと問題を6セット以上追加する。
6. 要約・意見作文のprompt一覧、editor、Unicode対応word count、draft autosave、再読込、履歴、内容・構成・語彙・文法の自己評価rubricを実装する。要約45〜55語、意見80〜100語を目安として表示し、自動正誤判定はしない。
7. オリジナル作文教材を要約4題・意見4題以上追加し、WritingSubmissionの下書き・提出・自己評価を永続化する。
8. スピーキングへ20秒黙読、音読、No.1、20秒準備、3場面説明、No.3/4の流れを実装する。権限説明後にだけMediaRecorderを要求し、録音・再生・削除と、拒否・非対応時のtext response／self-practiceを提供する。
9. 自作3場面テキストカードまたはSVGを含むオリジナル会話教材を4セット以上追加する。録音Blobは既定backup対象外の方針を維持する。
10. オリジナル短縮模試を1セット以上追加し、セクションtimer、中断警告、結果、弱点練習へのリンクを実装する。結果は公式スコアではなく学習用の目安と明示する。
11. 各技能の完了をAttempt・StudySession・Mastery・DailyPlanへ原子的に保存し、今日の学習のskill rotationと履歴へ接続する。
12. 読解6、聞き取り6、要約4、意見4、会話4、短縮模試1の教材検証、word count unit、各技能の完了・再読込・権限拒否・音声非対応component/E2Eを追加し、Phase品質ゲートを通す。

**Verification commands**

```powershell
npm run validate:content
npm run test -- wordCount
npm run test:e2e -- --grep "reading|listening|writing|speaking|mock"
npm run check
```

**Decisions made**

- 公式過去問・公式音声・公式ロゴ・公式イラストは使用せず、教材と3場面表現をすべて本プロジェクトのオリジナルとしてsource metadataへ記録する。
- Web Speechを本番相当音声と断定せず、音声機能が利用できない環境でも学習フローを完了可能にする。
- 自由作文・自由発話はAIや規則だけで正誤判定せず、目安、rubric、履歴、自己評価で学習を支援する。
- 録音権限は画面表示直後に要求せず、利用者が説明を読んで録音開始を選んだ時点で要求する。
- 短縮模試の結果は公式スコア・合否予測として表示しない。

**Results**

- 読解6、聞き取り6、要約4、意見4、会話4、短縮模試1のオリジナル教材をPilot Content Packへ追加し、全25セットを共通Zod schema、参照整合性、ID一意性、語数目標、ローカル音声パス、非公式表記で検証した。
- 読解の一覧・reader・文字サイズ・回答時間・根拠文・採点・解説・重要語句のお気に入り、聞き取りの本番風1回再生・復習・速度・一文再生・script・dictationを実装した。
- 要約45〜55語・意見80〜100語のeditor、Unicode対応word count、即時autosave、履歴、4観点rubricを実装し、自由作文を自動正誤判定しない設計にした。
- 会話練習の20秒タイマー、音読、No.1根拠、3場面説明、No.3/4、録音・再生・削除、権限拒否・非対応時のtext response／self-practiceを実装した。権限待ちの中断、二重開始、stream解放、保存失敗も処理する。
- オリジナル短縮模試へsection timer、中断警告、asset／Web Speech／text fallbackによる聞き取り、結果、弱点練習リンク、非公式スコア表記を実装した。
- Todayのskill rotationから各技能へqueryを保持して振り分け、Attempt・StudySession・DailyPlanを同一transactionで原子的に保存する。plan対象外教材への切替と不整合保存を防止した。
- `npm run check`が成功し、55 test files・407/407件、教材25セット、production buildを確認した。全E2Eはdesktop/320pxで46/46件（Phase 06固有12/12件）が成功した。

**Known limitations / follow-up**

- 実音声の収録はPilot Releaseの必須条件にせず、asset audioがない教材ではWeb Speechまたは明示されたtext fallbackを使う。
- MediaRecorder、Web Speech、iPhone Safari、ホーム画面PWA、スクリーンリーダーの挙動と音声品質は、対応する実機・ブラウザーでの最終確認が必要。
- production buildは成功するが、メイン初期chunk 676.50 kBの警告をPhase 07/09で再評価する。

## Phase 07 — PWA, Offline, Update Safety, Backup, and Restore

**Goal**

アプリシェルと保存済み教材をインストール後もオフラインで使え、学習中の保存を壊さず更新できるPWAを完成させる。同時に、端末内の利用者データを厳密なversion付きJSONとして安全に書き出し、検証・プレビュー後に統合または置換できるようにする。

**Files and areas expected to change**

- `vite.config.ts`、`package.json`、`public/**`、`index.html`
- `src/infrastructure/pwa/**`、`src/features/pwa/**`、`src/app/**`
- `src/domain/backup/**`、`src/infrastructure/backup/**`
- `src/features/data/**`、`src/app/routes/**`
- `contracts/backup.schema.json`、`contracts/sample/backup.sample.json`
- PWA、backup、storage、cache、offline E2E tests

**Implementation steps**

1. `vite-plugin-pwa`をprompt更新方式で導入し、同じ正規化baseをVite、manifest、Service Workerへ適用する。自作192/512/maskable icon、offline fallback、versioned content catalogを追加する。
2. app shell、全JS/CSS chunk、starter content、manifest、iconをprecacheし、versioned JSON・画像・optional audioへ用途別runtime cacheを設定する。音声は利用者が再生した時だけ取得し、base path込みURLへ解決する。
3. starter packを動的importへ分離し、初期chunk警告を削減する。production artifactでmanifest、scope、icon、SW、base pathを検査する。
4. 全画面共通のonline/offline状態、install prompt、iOS手順、更新bannerを実装する。更新は自動reloadせず、active studyがなく、登録済みflushがすべて成功した時だけ適用する。
5. 学習中状態と未保存書込みを共通registryへ登録する。作文autosaveを明示flushへ接続し、進行中の診断・レッスン・単語・技能・模試では更新を保留する。
6. Storage Estimate、永続保存要求、音声cache削除、app cache再構築を実装する。cache操作とIndexedDB削除は分離し、再構築はonline時だけ行う。
7. backup schemaを厳密化し、お気に入り・メモを含む`vocabularyUserStates`、対象一覧、録音opt-in wire形式を追加する。教材、cache、内部version metadata、録音Blobは既定で除外する。
8. 20 MiBのimport上限、JSON parse、schema version、unknown field、主キー重複、JSON値、Base64・MIME・復号サイズをDB変更前に検証し、作成日、version、件数、録音、警告をpreviewする。
9. replaceは対象tableを単一Dexie transactionで置換し、既定ONの自動安全backupを先に作る。mergeは時刻付きrecordの新しい側、DailyPlanの単調増加、提出済み作文の保持、ID衝突時の安全規則で統合する。
10. 録音だけ削除、音声cacheだけ削除、app cache再構築、全利用者データ削除を別操作にし、全削除は二段階確認後も教材とcacheを残す。
11. backup round-trip、録音opt-in、invalid・非互換・rollback・merge競合、cache分離、update flush、install fallbackをunit/integration/componentで検証する。
12. production previewでSW active、offline reload後の学習・保存、export→削除→preview→restore、manifest/icon、desktop/320px、base path付きbuildを検証し、Phase品質ゲートを通す。

**Verification commands**

```powershell
npm run test -- backup
npm run build
npm run test:e2e -- --grep "offline|backup|restore|update|PWA"
npm run check
python scripts/verify_handoff.py
```

**Decisions made**

- Service Worker更新は`prompt`方式とし、自動reloadしない。active study中は適用操作を無効化し、更新前flushが1件でも失敗した場合も現行版を維持する。
- backup schema versionは`1.0.0`とし、当面は完全一致だけを受理する。import全体上限は20 MiB、録音1件は10 MiBとする。
- backup既定対象はprofile、settings、review、mastery、単語お気に入り・メモ、lesson progress、attempt、session、daily plan、writing submission。教材、cache、appMeta、録音は除外し、録音は明示選択時だけBase64で含める。
- mergeは削除を行わず、時刻がある同一キーは新しい側を採用する。settingsは取込側、Attemptと録音の内容が異なる同一IDは拒否し、DailyPlan完了状態と提出済み作文は後退させない。
- replaceは録音がbackup対象外なら既存録音を保持する。自動安全backupの生成またはダウンロードに失敗した場合は置換を開始しない。
- cache名はアプリ固有prefixへ限定し、cache削除ではIndexedDBを変更しない。

**Results**

- prompt更新型Service Worker、manifest、自作192/512/maskable icon、offline fallback、version付き教材catalog、用途別runtime cacheを実装した。共通offline・install・iOS手順・update表示を実画面へ接続した。
- app shell、全JS/CSS chunk、基本教材をprecacheし、starter packと画面を動的分割した。production buildの単一chunk警告を解消し、entry chunkは209.09 kB、基本教材は151.87 kBの遅延chunkになった。
- activeな診断・レッスン・単語・技能・模試では更新操作を無効化した。Today、単語メモ、作文画面離脱、復元・削除の実書込みPromiseを中央trackerへ登録し、全件成功後だけService Worker更新を適用する。
- backup schema `1.0.0`、20 MiB上限、録音10 MiB上限、録音opt-in Base64、厳密Zod検証、件数・version・録音容量・警告のpreviewを実装した。破損、unknown field、参照切れ、競合、非互換をDB変更前に拒否する。
- replaceとmergeをDexie transactionで実装した。置換前の安全backup、進捗を後退させないmerge、失敗時rollback、録音・音声cache・app cache・全利用者データの分離削除をデータ管理画面へ接続した。
- productionの実通信遮断でToday・単語・保存済みレッスンを再読込し、オフライン回答をIndexedDBへ保存した。JSON書出し→全削除→置換復元の完全一致、manifest/SW/icon、320px overflowをPlaywrightで検証した。
- `npm run check`（68 test files・484件）、Phase 07 E2E desktop/320px 8/8、全E2E 54/54、`VITE_BASE_PATH=/e2-study-path/` buildが成功した。

**Known limitations / follow-up**

- iPhone Safariのホーム画面追加、standalone起動、MediaRecorderを含むbackup、実際のService Worker更新は対応する実機・配信環境で最終確認が必要。
- `beforeinstallprompt`、Storage永続化、容量推定はブラウザー判断のため、非対応・拒否時の説明を常に用意する。
- `vite-plugin-pwa`の内部から`inlineDynamicImports`非推奨警告が出るが、Service Worker生成とprecache注入は成功している。依存更新時に解消を確認する。
- PWA依存追加後の`npm install`はhigh severity advisory 10件を報告した。詳細監査は依存メタデータの外部送信承認が得られず未実施のため、Phase 09の再確認対象とする。

## Phase 08 — Progress, Settings, UX States, and Accessibility

**Goal**

端末内の実学習データを7日・30日の記録、技能傾向、弱点、ステージ進行として説明可能に表示する。設定を即時保存・即時反映し、主要画面をキーボード、支援技術、320px幅、200%文字倍率、ダークテーマ、動き軽減で安全に使える状態へ仕上げる。

**Files and areas expected to change**

- `src/domain/progress/**`、`src/features/progress/**`、`src/app/routes/**`
- `src/features/settings/**`、設定repository、起動時appearance適用
- `src/shared/components/**`、`src/shared/styles/**`、主要featureのUX state
- `e2e/phase08.spec.ts`、axe・settings・progress・mobile tests
- `README.md`、`CHANGELOG.md`、`docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md`、`docs/20_IMPLEMENTATION_STATUS.md`、`docs/backlog.md`

**Implementation steps**

1. Attempt、ReviewState、Mastery、LessonProgress、StudySession、教材stageを一括読込する進捗portを定義し、日付境界を固定できるpure TypeScript集計へ渡す。
2. 7日・30日について、日別学習時間、復習、新規、完了レッスン、学習日数、連続日数、再開を集計する。時間は完了sessionの開始・終了差を基準にし、不正・未完了値を安全に除外する。
3. 語彙・文法・読解・聞き取り・作文・会話の傾向を、対象Attemptと習熟度から説明付きで表示する。グラフと同じ情報を数値・日本語要約でも提供する。
4. recognition-recall gap、lapse、低正答率、遅い回答、期限超過から苦手候補を決定的に順位付けし、項目IDだけでなく利用可能な教材名を表示する。
5. stage別の完了レッスン数・全レッスン数と現在地を表示し、履歴なしの空状態、読込失敗、再試行を実装する。
6. daily minutes、新規上限、review intensity、speech rate、theme、font scale、reduced motionを入力ごとに検証して保存し、表示設定は同じ操作内でroot属性へ反映する。保存失敗は画面内で通知する。
7. app version、教材version、IndexedDB version、非公式注記を設定画面へ表示する。
8. 主要routeのloading、empty、error、offline、unsupported、not found、fatal recovery、破壊操作確認を監査し、重要エラーを永続的なInline表示または専用画面で伝える。
9. 見出し・landmark・label・live region・focus移動・Dialog復帰・44px操作領域・200%文字倍率・320px overflow・dark contrast・reduced motionを監査して修正する。
10. `@axe-core/playwright`の安定版を固定導入し、主要routeを実データ状態で走査する。キーボード、設定reload、進捗更新、320px・200%表示もPlaywrightで検証する。
11. READMEへ自動検査の範囲とスクリーンリーダー・実機を含む手動確認項目を記録し、Phase品質ゲートとhandoff検証を通す。

**Verification commands**

```powershell
npm run test -- progress
npm run test:e2e -- --grep "accessibility|settings|progress|mobile"
npm run check
python scripts/verify_handoff.py
```

**Decisions made**

- グラフは補助表現とし、同じ数値と傾向を見出し・表・日本語要約でも提供する。
- streakは学習を責める指標にせず、現在の連続日数と期間内学習日数を小さく表示し、再開した日を肯定する。
- 設定は楽観表示で隠さず、保存完了または失敗を画面内live regionで通知する。表示設定は保存操作と同時にroot属性へ適用する。
- WCAG 2.2 AAを目標とするが、自動axe合格だけで完全適合を宣言しない。スクリーンリーダー、iOS PWA、200%ブラウザーzoomは手動確認事項として残す。

**Results**

- StudySession、Attempt、ReviewState、Mastery、LessonProgressを集計し、7日・30日の学習時間、復習・新規・レッスン数、6技能傾向、弱点候補、Stage進行を説明付きで表示した。
- daily minutes、新規上限、復習強度、読み上げ速度、テーマ、文字倍率、動き軽減の7設定を検証・即時保存し、表示設定を起動時と変更時に反映した。
- route遷移とloading完了時の主見出しfocus、単一main landmark、各画面のh1、live region、Dialog復帰、44px操作領域、320px・文字200%相当のreflowを整備した。
- 録音削除へ確認Dialogを追加し、loading、empty、error、offline、unsupported、not found、fatal recoveryの主要状態を監査した。
- `@axe-core/playwright` 4.12.1を固定し、主要14 routeと実データ入りTodayを走査した。重大度serious／criticalの違反は0件だった。
- `npm run check`は73 test files・518/518件、教材検証、production buildまで成功した。全Playwright E2Eはdesktop／320pxで64/64件、Phase 08固有は10/10件成功した。
- production buildはentry 210.34 kB、500 kB超のchunk警告なし、PWA precache 70件で成功した。

**Known limitations**

- NVDA／VoiceOver、iOS／Androidのホーム画面PWA、実ブラウザーの200% zoom・forced colorsは対応端末での手動確認が必要。
- MediaRecorderの権限・録音・再生・削除とWeb Speechの声質は対応実機での確認が必要。
- `vite-plugin-pwa`内部の`inlineDynamicImports`非推奨警告は継続しているが、Service Worker生成と70件のprecache注入は成功している。
- high severity advisory 10件の詳細監査は、依存メタデータの外部送信承認が得られず未実施のままPhase 09へ引き継ぐ。

## Phase 09 — Full Test Suite, CI, and Static Deployment

**Goal**

clean installから同じ品質ゲートを再現し、pull request／pushのCI、失敗artifact、GitHub Pages用base path build、汎用`dist/`配信を自動化する。READMEだけで第三者が起動、検証、教材追加、PWA運用、backup、deploy、復旧を実行できる状態にする。

**Files and areas expected to change**

- `.github/workflows/**`
- `package.json`、`vite.config.ts`、`playwright.config.ts`
- `e2e/support/**`、`e2e/phase09.spec.ts`、不足分のunit／integration tests
- `scripts/**`
- `README.md`、`CHANGELOG.md`、`docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md`、`docs/20_IMPLEMENTATION_STATUS.md`、`docs/backlog.md`

**Implementation steps**

1. `npm run test:coverage`で重要domain、DB migration、backup検証、時刻境界、unsupported APIの不足を確認し、仕様分岐を補う。
2. Playwrightから任意storeへ原子的かつ失敗理由付きで投入・読込できる共通IndexedDB seed helperを用意し、critical journeyのfixtureへ適用する。
3. root production previewに対するmanifest、Service Worker、offline reload、routing、保存の既存E2Eを維持し、base path artifactのmanifest・scope・asset参照・Hash Routerを追加検証する。
4. CI workflowで固定Node／npm、`npm ci`、lint、typecheck、unit/component、coverage、教材検証、build、Playwrightを実行し、失敗時report・test resultsをartifact化する。
5. Pages workflowでrepository名からbase pathを決定し、同じlockfileからproduction build、artifact upload、Pages deployを行う。fork等でPages権限がない場合もCI buildは独立して通る構成にする。
6. READMEへWindows、macOS/Linux、WSL、テスト、教材作成、PWA install、backup／restore、Pages／代替host、Service Worker更新、troubleshooting、source map・license方針を書く。
7. workspace内の対象を確認したうえでclean `npm ci`を行い、全check、coverage、全E2E、root／subpath build、artifact検証、handoff検証を実行する。
8. dependency auditを試みる。外部送信承認が得られない場合は件数、未監査理由、Release判断への影響を隠さず記録する。

**Verification commands**

```powershell
npm ci
npm run test:coverage
npm run check
npm run test:e2e
$env:VITE_BASE_PATH = "/e2-study-path/"
npm run build
Remove-Item Env:VITE_BASE_PATH
python scripts/verify_handoff.py
```

**Decisions made**

- CIは単一の`npm run check`だけへ隠さず、lint、型検査、unit/component、coverage、教材検証、buildを別stepで見える化する。
- CIを含めPlaywright retryは0回とし、flakyを再実行だけでgreen扱いにしない。失敗時のtrace、screenshot、HTML reportをartifactとして調査する。
- Pages deployと通常CIを分離し、`dist/`はGitHub Pages以外の静的hostでもそのまま配信できるようにする。
- source mapは既定で公開せず、外部telemetryとsecretを導入しない。
- Phase 09時点ではlicenseが所有者判断待ちのため追加しない。後にD-026で、個人学習目的としてOSSライセンスを付与しない方針を確定した。

**Results**

- GitHub Actions CIを追加し、`main`／`master`のpush、pull request、手動実行でclean install、lint、型検査、unit/component、coverage、教材検証、build、artifact検証、全E2Eを実行するようにした。E2E失敗時はPlaywright report、trace、screenshotを7日保持する。
- GitHub Pages workflowを追加し、既定branchのCI成功後に検証済みの同一commitだけをbuild・公開するようにした。owner siteは`/`、project siteはrepository名配下のbase pathを自動設定し、deploy jobだけにPages／OIDC権限を限定している。
- v1 DailyPlanの複数record migration fixture、破損backup、DST開始・終了日の学習日境界、MediaRecorder非対応・失敗・解放を13テスト追加した。
- 共通IndexedDB seed helperを追加し、存在しないstoreの事前拒否と、`put()`の同期例外時に先行書込みをrollbackすることをE2Eで確認した。
- production artifact validatorを追加し、manifestのid／start_url／scope、192／512／maskable icon、Service Worker、starter教材、全HTML参照、base path外参照、source map非公開を検証した。
- READMEへWindows、macOS／Linux、WSL、テスト、教材追加、PWA install、backup／restore、Pages／代替host、Service Worker更新・rollback、troubleshooting、license方針を追加した。
- workspace直下の`node_modules`と`dist`を照合して削除し、`npm ci --offline --no-audit`でlockfileから533 packagesを再構築した。
- `npm run test:coverage`は73 test files・531/531件、Statements 79.80%、Branches 71.62%、Functions 76.75%、Lines 80.14%で成功した。
- `npm run check`、全Playwright E2E desktop／320px 70/70件、root／`/e2-study-path/` build、71ファイルのartifact検証が成功した。entryは210.34 kB、PWA precacheは70件だった。
- `npm audit --omit=dev --offline`と全依存のoffline auditは0件だった。build時依存`glob@11.1.0`は既知のCVE-2025-64756修正版だが、npmの非推奨警告は残る。

**Known limitations**

- Phase 09時点ではGitHub ActionsとGitHub Pagesはremote未設定だった。2026-07-27にprivate GitHubへpushし、D-024でCloudflare Pages + Accessへ配備方針を変更した。
- Windows以外の起動手順、Firefox／Safari、実端末PWA、実配信環境の更新・rollbackは手動確認が必要。
- offline auditは最新registry照会の代わりにはならない。依存メタデータの外部送信承認が得られなかったため、公開前に接続可能な承認済み環境で全依存の`npm audit`と本番依存の`npm audit --omit=dev`を再実行する。
- `vite-plugin-pwa`内部の`inlineDynamicImports`非推奨警告は継続しているが、root／subpath双方のService Worker生成とartifact検証は成功している。

## Phase 10 — Final Audit and Pilot Release

**Goal**

仕様、実装、テスト、教材、PWA、文書を横断監査し、`AC-REL-001`〜`AC-REL-012`を満たすPilot Releaseとして再現可能な引き渡し状態にする。

**Files and areas expected to change**

- release acceptance、risk、decision、status、checklist、backlog、README、CHANGELOG
- backup／update safetyとそのunit／E2E
- 教材schema、Pilot教材、言語指定、教材catalog version
- 到達不能な準備画面
- `PROJECT_MANIFEST.json`

**Implementation steps**

1. 全repositoryのdiff、placeholder、dead route、TODO、duplicate abstraction、domain leakage、secret、公式素材を検索する。
2. `AC-REL-001`〜`AC-REL-012`をテスト証跡と実装に照らして1件ずつ判定する。
3. Pilot件数・Stage分布・技能分布を集計し、全件validationと代表spot checkを行う。
4. offline、update、backup、restore、delete、mobile、keyboard、focus、screen reader semanticsを再監査する。
5. 指摘されたtimestamp merge、backup完全往復、複数タブ競合、英日混在言語指定、作文回答例、教材表現を修正する。
6. app／content version、README、CHANGELOG、checklist、status、backlog、manifestを同期する。
7. clean install後にmandatory commands、root／subpath artifact、offline audit、handoff検証を実行する。
8. Blocker／P1／P2を再レビューし、Critical／High実装不具合0件を確認する。

**Verification commands**

```powershell
npm ci --offline --no-audit
npm run lint
npm run typecheck
npm run test:coverage
npm run validate:content
npm run build
npm run verify:dist
npm run test:e2e
$env:VITE_BASE_PATH = "/e2-study-path/"
npm run build
npm run verify:dist
Remove-Item Env:VITE_BASE_PATH
npm audit --offline
npm audit --omit=dev --offline
python scripts/verify_handoff.py
```

**Decisions made**

- Release versionはapp `0.2.0`、Pilot content `0.7.0`、IndexedDB schema `2`とする。
- `AC-REL-001`〜`AC-REL-012`は引き続き全件release blockerとして扱い、各結果を`docs/22_PILOT_RELEASE_AUDIT.md`へ残す。
- 複数タブの破壊操作はorigin単位のexclusive lock、通常保存はshared lockと世代検証で調停する。安全な調停APIがない環境では破壊操作をfail-closedにする。
- 作文の回答例は唯一解として扱わず、一例であると明示する。要約45〜55語、意見80〜100語を教材validationで保証する。
- 実機・実配信・remote・最新registry照会は自動検証と区別し、再現手順、成功条件、fallbackを記録して実公開前の外部ゲートとする。

**Results**

- 到達不能な準備画面を削除し、主要routeのplaceholder、fake button、説明のないTODOを0件にした。
- backupの主要store完全往復、timezone offsetが異なるtimestamp merge、全通常保存のorigin-wide shared lock、削除・置換後の旧autosave復活防止、世代を進めないbackup snapshot barrierを追加した。
- 英日混在教材の英語部分、技能教材の英文、英語入力欄へ`lang`を明示した。
- 要約・意見8件へ範囲内の回答例を追加し、複数解を認めるUIと語数validationを追加した。教材読み合わせで見つけた訳・collocation・図書室の開館時間表現も修正した。
- Pilot 140語・31レッスン・155演習・25技能セットのStage／技能分布、spot check、original metadataを監査し、教材・UXレビューをBlocker 0／P1 0／P2 0にした。
- `AC-REL-001`〜`AC-REL-012`をすべてPassと判定し、release auditと手動確認matrixを`docs/22_PILOT_RELEASE_AUDIT.md`へ記録した。
- `npm ci --offline --no-audit`で533 packagesを再構築後、`npm run check`を成功させた。`npm run test:coverage`は75 test files・547/547件、Statements 79.98%、Branches 71.77%、Functions 77.12%、Lines 80.33%だった。
- 全Playwright E2Eはdesktop／320px 70/70件をretry 0で成功。実行中に見つかったIndexedDB初期化待ちと初期route focus待ちの2競合は、明示的な安定条件を追加して再発を防いだ。
- root／`/e2-study-path/` build、manifest／Service Worker／教材catalog／asset／source map方針を含む70ファイルのartifact検証、全依存・本番依存のoffline audit 0件、format、diff、handoff検証を成功させた。entryは209.96 kB、PWA precacheは69件だった。
- 上記全実行後の最終レビュー指摘を受け、全user-data mutatorを中央ゲートへ移し、snapshot競合を含む回帰テスト6件を追加した。変更後のlint、typecheck、formatと独立した静的書込み経路監査はPass。Vitest再実行はsandbox `spawn EPERM`後の権限付き実行が利用上限で拒否されたため、追加6件を含む動的ゲートは公開前に通常環境で再実行する。

**Known limitations**

- 最新registry dependency audit、remote CI／Cloudflare Pages／Access、実配信waiting Service Worker、iOS／Android PWA、NVDA／VoiceOver、実zoom／forced colors、MediaRecorder、Web Speech、人間の英語校閲者による全件レビューを外部確認として残す。
- 最終競合修正後の`npm run check`、`npm run test:coverage`、root／subpath build・artifact検証、`npm run test:e2e`は環境制限で未再実行。直前の全実行値と変更後の静的検証を証跡として残し、実公開前のHigh gateとする。
- offline audit、artifact、E2E、fallbackはローカルで確認するが、実公開はHigh priorityの最新registry audit完了後に行う。
- Phase 10完了時点では公開ライセンスと正式名称はリポジトリ所有者の判断待ちだった。後にD-025でPublic GitHub Pages、D-026でOSSライセンスを付与しない権利留保方針へ変更した。

## Post-Phase 10 — Private GitHub and Cloudflare handoff

**Decisions made**

- sourceはGitHubのprivate repository `v4vktbwht2-byte/e2-study-path`で管理する。
- 配備先はCloudflare Pages、production／previewの利用制限はCloudflare Accessで行う。
- GitHub repositoryのprivate設定は配備URLを保護しないため、Accessの未認証拒否確認を共有前ゲートにする。
- 意図しない二重公開を避けるため、GitHub Pages自動deploy workflowを削除し、GitHub Actions CIだけを継続する。

**Results**

- `master`のPilot Release commit `2b8fe14`をprivate repositoryへpushした。
- GitHub remoteを`origin`として設定し、`master`を`origin/master`へ追跡させた。
- Cloudflare Pagesのbuild設定、Access設定、production／preview確認手順をREADMEと運用文書へ追加した。
- D-024、R-021、status、release audit、checklist、backlog、CHANGELOGを同じ方針へ同期した。

**Known limitations**

- Cloudflare Pages projectのGitHub接続、production／preview Access policy、配備URLはCloudflareアカウントでの設定が必要。
- private GitHub上のCI結果、Access拒否／許可、offline、waiting Service Worker更新は実環境で確認する。

## Post-Phase 10 — Public GitHub Pages handoff

**Goal**

Cloudflareの設定を必要とせず、スマホから公開URLを開いてPWAとしてinstallできるGitHub Pages構成へ変更する。第三者がrepositoryと教材を閲覧する前提で、AI作成・非公式・未校閲範囲と権利条件をREADMEへ明示する。

**Decisions made**

- D-024をD-025で置き換え、`v4vktbwht2-byte/e2-study-path`をPublic repositoryへ変更する。
- GitHub Pagesのproject URL `/e2-study-path/`へ、既定branchのCI成功commitだけを自動deployする。
- README冒頭とlicense節に、実装・文書・教材が生成AI（OpenAI Codex）を利用して作成・編集されたこと、専門家による全件校閲済みではないことを表示する。
- D-026で、個人学習を主目的としてOSSライセンスを付与せず、Public表示を複製・改変・再配布等の許諾と扱わない方針を確定する。

**Verification**

```powershell
npm audit
npm audit --omit=dev
npm run check
npm run test:coverage
$env:VITE_BASE_PATH = "/e2-study-path/"
npm run build
npm run verify:dist
Remove-Item Env:VITE_BASE_PATH
npm run test:e2e
python scripts/verify_handoff.py
```

**Known limitations**

- 公開URLでのiPhone／Android install、standalone、offline再起動、waiting Service Worker差替えは実端末確認を残す。
- 正式名称と人間の英語校閲者による全件レビューは所有者判断・Phase 11作業として残す。software licenseはD-026で確定済み。

**Local results**

- registry接続の`npm ci`、`npm run check`、75 files・551/551 unit/component、coverage lines 80.18%をPass。
- root／`/e2-study-path/` buildと71ファイルのartifact検証、desktop／320px E2E 70/70をPass。
- 最新auditの全依存10／本番2 Highを確認。React Routerは本PWAが使わないunstable RSC API限定、`brace-expansion`は公開runtimeへ含まれないbuild-only間接依存と評価し、stable修正版の追跡を残した。
- D-026でOSSライセンスを付与しない権利留保方針を確定し、README、権利方針、decision log、release audit、backlogを同期した。
- Pages再配信で検出したNode.js 20廃止警告に対し、`actions/upload-pages-artifact`と`actions/deploy-pages`をv5、`actions/configure-pages`をv6へ更新し、全Actionを公式のNode.js 24対応版へ移行した。

**Remote results**

- Public repository: `https://github.com/v4vktbwht2-byte/e2-study-path`
- Public PWA: `https://v4vktbwht2-byte.github.io/e2-study-path/`
- PR #4、merge commit `b15897b`の`master` CI、GitHub Pages deploy run `30308497828`をPass。
- 320px実URLで横overflowなし、オフライン準備完了表示、console error 0件を確認。HTML、manifest、Service Worker、192／512／maskable iconはHTTPS 200。manifestの`id`／`start_url`／`scope`は`/e2-study-path/`、`display`は`standalone`。
