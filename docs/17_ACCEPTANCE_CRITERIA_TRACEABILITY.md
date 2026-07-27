# 17. Acceptance Criteria and Traceability

## 1. Release-level acceptance

### AC-REL-001 First-run

Given 新規端末状態
When アプリを起動しオンボーディングを完了する
Then 目標、学習時間、開始ステージが保存され、今日画面へ移動する。

### AC-REL-002 Diagnostic

Given 診断を選択したユーザー
When 基礎問題へ回答する
Then 難しすぎる問題の連続を避け、できている項目と推奨ステージを表示する。

### AC-REL-003 Lesson

Given ステージ0または1のレッスン
When 説明、例文、確認、想起を完了する
Then 進捗と復習項目が保存され、再読込後も完了状態が残る。

### AC-REL-004 Vocabulary new

Given 新規単語セッション
When 5語を学習する
Then 各項目にReviewStateとMasteryProfileが作成される。

### AC-REL-005 Adaptive review

Given review状態の単語
When Again、Hard、Good、Easyをそれぞれ選ぶ
Then `09_REVIEW_ALGORITHM.md` に従う異なる状態・dueAt・intervalが得られる。

### AC-REL-006 Backlog rescue

Given 80件以上の期限超過
When 今日画面を開く
Then 軽め・標準・しっかり・すべてが表示され、軽めでは優先項目だけが選ばれる。

Phase 05 verification: `e2e/phase05.spec.ts`で84件の期限超過からlight 15件・新規語0件をdesktop/320pxの両方で確認する。`src/domain/planning/dailyPlan.test.ts`と`src/features/today/model.test.ts`で4コース、完了済みblockを維持する再計算、学習日変更も検証する。

### AC-REL-007 Mastery dimensions

Given 英→日四択に正解
Then recognitionは更新されるがspellingは更新されない。

Given スペル入力に正解
Then spellingとrecallが設定された割合で更新される。

### AC-REL-008 Offline

Given オンラインで一度起動しstarter contentを開いた
When ネットワークを切り再読み込みする
Then アプリシェル、今日、単語、保存済み教材が利用でき、回答を保存できる。

Phase 07 verification: `e2e/phase07.spec.ts`でService Worker制御後に実通信を遮断し、Today・単語・保存済みレッスンのreloadとAttempt保存・再読込をdesktop/320pxの両方で確認する。manifest、scope、192/512/maskable icon、version付き教材catalogのprecacheもproduction artifactで検証する。

### AC-REL-009 Backup

Given 学習履歴がある
When JSONをexportし、別の空状態へrestoreする
Then profile、review、mastery、progressが復元される。

Phase 10 verification: `e2e/phase07.spec.ts`でprofile、settings、review、mastery、lesson progress、単語お気に入り・メモ、session、attempt、DailyPlan、作文をJSONへ書き出し、全利用者データ削除後の空状態へ置換復元して完全一致を確認する。domain／Dexieテストでは録音opt-in、merge、rollback、破損・非互換拒否を含む全主要storeの往復を検証する。

### AC-REL-010 Accessibility

Given キーボードのみ
When オンボーディングから単語1問を完了する
Then マウスなしで完了でき、フォーカスが見える。

Phase 08 verification: `e2e/phase08.spec.ts`でオンボーディングから単語1問の回答までをキーボードだけで完了し、route遷移後の主見出しfocusを確認する。主要14 routeと実データ入りTodayをaxeで走査し、serious／critical違反0件、各画面の単一main・単一h1・主見出しfocusを確認する。

### AC-REL-011 Mobile

Given 320px幅
When 今日→単語セッション→完了
Then 横スクロールや隠れた主要ボタンなしで完了する。

Phase 08 verification: `e2e/phase08.spec.ts`で320px・文字200%相当と160px reflow proxyを確認し、既存Phase 04 E2Eで320pxの単語セッション完了を確認する。主要操作領域は共通tokenとcomponent testsで44px以上を維持する。

### AC-REL-012 Content legality

Given bundled content
Then source metadataがoriginalで、公式問題・公式音源・公式ロゴが含まれない。

Phase 10 verification: Pilot 140語・31レッスン・155演習・25技能セットはすべて`source.type = original`で、共通Zod検証が外部音声URL、参照切れ、ID重複、raw HTML、作文回答例の語数違反を拒否する。短縮模試は公式問題・公式音声・公式スコアではないと画面に明示する。Stage分布、人間向けspot check、修正内容は`docs/22_PILOT_RELEASE_AUDIT.md`へ記録する。

## 2. Requirement traceability summary

| Requirement area   | Detailed spec      | Primary phase | Primary tests                                             |
| ------------------ | ------------------ | ------------: | --------------------------------------------------------- |
| FR-ONB             | 02, 05             |            03 | E2E-001                                                   |
| FR-DIA             | 02, 03             |            03 | unit diagnostic + E2E-001                                 |
| FR-CUR/LES         | 03, 11             |         03/05 | lesson component + `LessonRenderer.test.tsx` + AC-REL-003 |
| FR-DLY             | 09 + planning docs |            05 | planning/today unit + `phase05.spec.ts`                   |
| FR-VOC             | 10                 |            04 | vocabulary components + E2E-002                           |
| FR-REV             | 09                 |            04 | scheduler unit + E2E-003                                  |
| FR-REA/LIS/WRI/SPK | 05, 11, 12         |            06 | E2E-007/008 + components                                  |
| FR-PRO             | 08                 |            08 | aggregation unit                                          |
| FR-DAT             | 08, 14             |            07 | E2E-005                                                   |
| FR-PWA             | 13                 |         07/09 | E2E-006                                                   |
| NFR-A11Y           | 06, 14             |      08/09/10 | axe／keyboard／reflow E2E + 実機manual pending            |
| NFR-PRIV           | 14                 |           all | review checklist                                          |

## 3. Phase gates

### Phase 01

- App boots
- responsive shell
- scripts work
- no TypeScript errors

### Phase 02

- DB opens
- schemas validate
- domain tests pass
- sample content seeds

### Phase 03

- onboarding and diagnostic work end-to-end
- stage map and at least one lesson work

### Phase 04

- vocabulary sessions and review scheduler work
- reload persists state

### Phase 05

- Complete: 今日のプラン、単語回答、レッスン完了がDailyPlan進捗を含む原子的保存で動作する。
- Complete: 80件超の滞留で4コースを提示し、lightは15件・新規語0件へ抑える。
- Complete: 完了済みblockを維持する再計算、単語途中再開、IANA学習日境界、翌学習日のレッスン復習が動作する。
- Evidence: 322 unit tests、全E2E desktop/320px 34/34（`e2e/phase05.spec.ts` 8/8）、`npm run check`成功。

### Phase 06

- Complete: 読解・聞き取り・作文・会話・短縮模試をオリジナル教材で完了し、履歴とDailyPlan進捗へ保存できる。
- Complete: 音声非対応時のtext fallback、作文autosave、会話timer・録音、模試中断警告・弱点導線が動作する。
- Complete: 読解6、聞き取り6、要約4、意見4、会話4、短縮模試1の計25セットがoriginal metadataと技能別schemaを通過し、公式教材・公式スコアと誤認させない。
- Evidence: 55 test files・407 unit/component tests、全E2E desktop/320px 46/46（`e2e/phase06.spec.ts` 12/12）、`npm run check`成功。

### Phase 07

- Complete: manifest・自作icon・Service Worker・用途別cache・offline fallback・install/iOS案内がproduction buildで動作する。
- Complete: active学習中は更新を適用せず、実際の保留書込みPromiseを全件flushできた場合だけService Workerを切り替える。
- Complete: 厳密version付きJSON、録音opt-in、preview、transactional merge/replace、安全backup、分離削除が動作する。
- Evidence: 68 test files・484 unit/component tests、全E2E desktop/320px 54/54（`e2e/phase07.spec.ts` 8/8）、root/subpath production build、`npm run check`成功。

### Phase 08

- Complete: 7日・30日記録、6技能傾向、弱点、Stage進行が実データから集計・説明される。
- Complete: 7設定が検証・即時保存され、テーマ、文字倍率、動き軽減が変更時と再起動時に反映される。
- Complete: 単一main・h1、route focus、live region、Dialog復帰、44px操作領域、320px・文字200%相当のreflowを整備した。
- Evidence: 73 test files・518 unit/component tests、全E2E desktop/320px 64/64（Phase 08固有10/10）、主要route axe serious／critical 0件、`npm run check`成功。
- Manual pending: NVDA／VoiceOver、iOS／Android PWA、実ブラウザーzoom・forced colors、実機録音。

### Phase 09

- Complete: clean installからlint、型検査、unit/component、coverage、教材検証、build、artifact検証、全E2Eを再現するCIを追加した。
- Complete: repository名配下のbase path、manifest／Service Worker scope、Pages artifact、OIDC deployを備えたGitHub Pages workflowをPhase 09で追加した。D-024で一度削除後、D-025のPublic Pages方針で復元した。
- Complete: v1 migration fixture、破損backup、DST境界、unsupported MediaRecorder、原子的E2E seed helperを追加した。
- Complete: READMEだけでWindows、macOS／Linux、WSL、テスト、教材追加、PWA、backup、deploy、復旧を実行できるようにした。
- Evidence: clean `npm ci`、73 test files・531/531件、coverage 79.80% statements／71.62% branches／76.75% functions／80.14% lines、全E2E desktop/320px 70/70（Phase 09固有6/6）、root/subpath build、artifact 71ファイル、`npm run check`成功。
- Manual pending: Phase 09時点ではremote GitHub Actions／Pages、最新registry dependency audit、実OS・実端末・実配信環境。最新auditと最終動的ゲートは2026-07-27に完了し、D-025でPublic GitHub Pages確認へ移行した。

### Phase 10

- Complete: `AC-REL-001`〜`AC-REL-012`を1件ずつ再確認し、すべてPassとして`docs/22_PILOT_RELEASE_AUDIT.md`へ記録した。
- Complete: placeholder／dead route、duplicate abstraction、domain leakage、公式素材、教材件数・分布、backup完全往復、offline／update／mobile／accessibilityを横断監査した。
- Complete: 指摘されたtimestamp比較、複数タブの破壊操作と旧世代保存、英日混在の読み上げ、教材表現、作文回答例を修正し、Blocker 0／P1 0／P2 0まで再レビューした。
- Complete: app `0.2.0`、Pilot content `0.7.0`、DB schema `2`としてREADME、CHANGELOG、checklist、status、plan、backlogを同期した。
- Current evidence: registry接続のclean install、75 test files・551/551件、coverage 79.73% statements／71.80% branches／76.29% functions／80.18% lines、全E2E desktop/320px 70/70、root/subpath build、artifact 71ファイル、教材検証をPass。最新auditのHighはRSC未使用とbuild-only間接依存として適用可能性を評価した。詳細値は`docs/20_IMPLEMENTATION_STATUS.md`、受入・教材・手動確認matrixは`docs/22_PILOT_RELEASE_AUDIT.md`を正本とする。
- Pending: remote CI／GitHub Pages、upstream dependency修正版、iOS／Android PWA、waiting Service Worker、NVDA／VoiceOver、実zoom／forced colors、実機録音・Web Speech。
