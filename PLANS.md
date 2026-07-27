# 実行計画ログ

各Phaseの開始前に計画を追記し、完了後に結果・検証・既知制約を更新する。

## 現在のPhase

- Phase: 06 — Reading, Listening, Writing, Speaking, and Mock Practice
- Status: 完了（次はPhase 07）
- Last updated: 2026-07-27

## Phase 00〜10 高水準計画

| Phase | 主な成果                                            | 主な依存       | 完了ゲート                                      |
| ----: | --------------------------------------------------- | -------------- | ----------------------------------------------- |
|    00 | 資料・環境・矛盾・Git基準点の監査                   | ハンドオフ一式 | `verify_handoff.py`                             |
|    01 | React/Vite基盤、Hash Router、共通UI、品質スクリプト | 00             | lint / typecheck / test / build / app-shell E2E |
|    02 | 純粋ドメイン、Dexie、Repository、コンテンツ検証     | 01             | domain / DB / content gate                      |
|    03 | オンボーディング、診断、コース、14レッスン          | 02             | first-run / lesson E2E                          |
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
