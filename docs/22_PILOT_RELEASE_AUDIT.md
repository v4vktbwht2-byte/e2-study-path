# 22. Pilot Release Audit

## Release judgment

2026-07-27時点で、リポジトリを **Pilot Release 0.2.0** として引き渡せる状態と判定する。

- app version: `0.2.0`
- Pilot content version: `0.7.0`
- IndexedDB schema version: `2`
- release-level acceptance: `AC-REL-001`〜`AC-REL-012`をすべてPass
- 最終レビュー: Blocker 0 / P1 0 / P2 0
- 公開判定: ローカル全品質ゲートのbaselineはPass。最終競合修正後の動的ゲート再実行、公開ライセンス・配布権利の確定、remote／Pages設定、最新registry auditをリポジトリ所有者が完了するまで実公開しない。実機確認の未完了範囲も公開時に明示する。

本判定は英検公式または日本英語検定協会公認を意味しない。収録教材、音声fallback、短縮模試の結果は本プロジェクト独自の学習用内容である。

## Release-level acceptance results

| ID         | Result | Primary evidence                                                                                                               |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| AC-REL-001 | Pass   | オンボーディングの保存・skip・再読込をcomponent testと`e2e/phase03.spec.ts`で確認                                               |
| AC-REL-002 | Pass   | 18問の適応診断、難度調整、Stage 0〜6推薦、手動変更、途中再開をdomain testと`e2e/phase03.spec.ts`で確認                           |
| AC-REL-003 | Pass   | レッスン回答、Attempt・進捗・復習項目の原子的保存、再開、翌学習日復習をPhase 03／05 testで確認                                 |
| AC-REL-004 | Pass   | 新規5語のReviewState・MasteryProfile作成と同一セッション再想起をPhase 04 testで確認                                             |
| AC-REL-005 | Pass   | Again／Hard／Good／Easyの状態、期限、interval差を純粋domain testで確認                                                         |
| AC-REL-006 | Pass   | 84件の期限超過で4コースを提示し、lightを15件・新規語0件に制限することをPhase 05 E2Eで確認                                     |
| AC-REL-007 | Pass   | recognition、recall、spelling、listening、productionを出題形式別に更新することをmastery testで確認                            |
| AC-REL-008 | Pass   | Service Worker制御後の通信遮断、Today・単語・保存済み教材の再読込、offline回答保存をPhase 07 E2Eで確認                         |
| AC-REL-009 | Pass   | profile、settings、review、mastery、単語状態、lesson progress、session、attempt、DailyPlan、作文、録音の往復をunit／E2Eで確認 |
| AC-REL-010 | Pass   | キーボード完結、route focus、名前付き操作、主要routeのaxe serious／critical 0件をPhase 08 testで確認                            |
| AC-REL-011 | Pass   | desktop／320px E2E、200%文字相当・160px reflow proxy、44px操作領域をPhase 08 testで確認                                        |
| AC-REL-012 | Pass   | 全件runtime validation、original metadata、素材検索、下記人間向けspot checkで公式素材の非収録を確認                            |

詳細な要件対応は[17_ACCEPTANCE_CRITERIA_TRACEABILITY.md](17_ACCEPTANCE_CRITERIA_TRACEABILITY.md)を参照する。

## Bundled Pilot content

### Stage distribution

| Stage | Vocabulary | Lessons | Exercises | Skill practice |
| ----: | ---------: | ------: | --------: | -------------: |
|     0 |         20 |       8 |        40 |              0 |
|     1 |         20 |       8 |        40 |              0 |
|     2 |         20 |       3 |        15 |              3 |
|     3 |         20 |       3 |        15 |              3 |
|     4 |         20 |       3 |        15 |              3 |
|     5 |         20 |       3 |        15 |              8 |
|     6 |         20 |       3 |        15 |              8 |
|  合計 |        140 |      31 |       155 |             25 |

### Skill practice distribution

| Type                  | Count |
| --------------------- | ----: |
| Reading               |     6 |
| Listening             |     6 |
| Writing — summary     |     4 |
| Writing — opinion     |     4 |
| Speaking/conversation |     4 |
| Short mock            |     1 |
| 合計                  |    25 |

`validate:content`の表示にはcontract sampleが各1件含まれるため、検証時の総表示は141語・32レッスン・156演習となる。Releaseの収録件数は上表のPilot 140語・31レッスン・155演習・25技能セットである。

全Pilot教材は`source.type = original`、author `E2 Study Path project`、新規作成注記を持つ。外部教材URL、raw HTML、公式音声asset、公式ロゴは収録していない。

## Human-readable content spot check

runtime validationとは別に、ID、英語、日本語、正答、解説、出所を代表抽出で読み合わせた。

### Checked items

- Vocabulary: `vocab-s0-hello`／`vocab-s0-happy`、`vocab-s1-study`／`vocab-s1-can`、`vocab-s2-yesterday`／`vocab-s2-next-week`、`vocab-s3-environment`／`vocab-s3-possible`、`vocab-s4-accept`／`vocab-s4-according-to`、`vocab-s5-rise`／`vocab-s5-renewable-energy`、`vocab-s6-issue`／`vocab-s6-affect`
- Lessons/exercises: `lesson-s0-u8`／`exercise-s0-u8-05`、`lesson-s1-u8`／`exercise-s1-u8-05`、`lesson-s2-u3`〜`lesson-s6-u3`と各`exercise-*-05`
- Skills: `practice-reading-evening-library`、`listening-museum-sensory-hours`、`writing-summary-community-fridge`、`writing-opinion-more-parks`、`speaking-energy-monitor`、`mock-green-town-project`

### Result and corrections

- stable ID、schema、Stage、original metadata、正答index、根拠・解説を確認した。
- 初学者向け日本語、英訳対応、collocation、読解本文との整合、作文回答例の語数と「正解は一つではない」表示を確認した。
- 読み合わせで見つけた`Ken and I`の訳、`clean design`の用例、`lend`／`cheap`／`however`のcollocation、図書室の開館時間表現を修正した。
- 要約4件は45〜55語、意見4件は80〜100語の回答例を持ち、Zodで範囲外を拒否する。
- 英日混在の問題文は英語部分だけを`lang="en"`に分割し、英語入力欄と技能教材の英文にも言語を明示した。
- 内容・UX再監査はBlocker 0 / P1 0 / P2 0。人間の英語校閲者による全件校正はPhase 11の推奨作業として残す。

## Repository and architecture audit

- 一時的な準備画面と到達不能なfoundation routeを削除した。
- fake button、空画面、説明のないTODO、`dangerouslySetInnerHTML`、browser内secret、backend／有料API依存はない。
- domain規則はReact／Dexieに依存しない純粋TypeScript、永続化はRepository／portの後ろに置かれている。
- backup timestampの比較をISO文字列順からepoch比較へ変更し、offsetが異なる同一時刻・新旧判定を回帰テストした。
- backupの完全往復を全主要storeで検証し、復元後にprofileだけでなくreview、mastery、履歴、計画、作文、録音まで一致させた。
- 複数タブを含む破壊操作と保留書込みはorigin単位の排他制御で調停し、旧世代の保存が削除・置換後にデータを復活させない。
- 全user-data mutatorをorigin-wide shared lockへ集約し、backup exportは世代を進めないexclusive snapshot barrierで既存書込み完了後の一貫したsnapshotを取得する。
- rootとrepository subpathの双方でmanifest、Service Worker、icon、version付き教材catalog、asset参照、source map非公開を検証する。

## Verification

最終値と実行日は[20_IMPLEMENTATION_STATUS.md](20_IMPLEMENTATION_STATUS.md)のQuality gatesにも記録した。

| Gate                           | Result                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| clean install                  | Pass — `npm ci --offline --no-audit`、lockfileから533 packages                               |
| lint／typecheck                | Pass                                                                                         |
| unit/component                 | Baseline Pass — 75 test files・547/547。最終競合修正の追加6件は環境制限で未再実行            |
| coverage                       | Baseline Pass — 79.98% statements／71.77% branches／77.12% functions／80.33% lines           |
| content validation             | Pass — Pilot 140語・31レッスン・155演習・25技能セット                                       |
| root／repository subpath build | Baseline Pass — entry 209.96 kB、PWA precache 69件                                           |
| production artifact            | Baseline Pass — root／`/e2-study-path/`、manifest／SW／asset／source map方針、70 files        |
| Playwright E2E                 | Baseline Pass — desktop／320px 70/70、retry 0。最終競合修正後は未再実行                       |
| offline dependency audit       | Pass — 全依存0件、本番依存0件                                                                |
| format／diff                   | Pass                                                                                         |
| handoff manifest               | Pass — `python scripts/verify_handoff.py`                                                     |

通常の`npm ci`はsandboxのspawn制限で失敗したため、権限付きのoffline／no-audit指定で同一lockfileを再構築した。全実行後の最終競合修正ではlint／typecheck／format／独立した静的書込み経路監査をPassしたが、追加6回帰テストを含むVitest再実行はsandbox `spawn EPERM`、権限付き実行は利用上限により拒否された。latest registry dependency auditも依存メタデータの外部送信承認が得られなかったため、いずれも実公開前のゲートとする。

## Environment-limited and external verification still required

以下は現環境または外部状態により完了できない。いずれも再現手順と安全な案内またはfallbackがあり、ローカルPilot引き渡しのBlockerではない。

| Priority | Item                              | Reproduction / success condition                                                                                      | Current fallback / workaround                                           |
| -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| High     | 公開ライセンス／配布権利          | リポジトリ所有者がcode・教材・自作iconの配布条件を選び、LICENSEとREADMEへ反映                                        | ライセンス未確定のため、現状はローカル引き渡しに限定                    |
| High     | 最新registry dependency audit    | 承認済み接続環境で`npm audit`と`npm audit --omit=dev`を実行し、Critical／Highが0件                                    | offline audit 0件。新規公開を監査完了まで保留                           |
| High     | 最終コード状態の動的quality gate | 通常環境で`npm run check`、`npm run test:coverage`、root／subpathの`npm run build`と`npm run verify:dist`、`npm run test:e2e`を実行し、追加6回帰テストを含めて全件成功 | 直前baselineは547/547・E2E 70/70・artifact 70 files。変更後lint／typecheck／format／静的監査Pass |
| Medium   | GitHub Actions／Pages             | remoteへpushし、同一commitのCI成功後だけPages deployが走り、公開URLでroot／subpath、offline、更新を確認               | local root／subpath artifactを静的hostへ配置可能                         |
| Medium   | iOS／Android install              | Safari共有メニュー／対応ブラウザーからinstallし、standalone起動、offline再起動、safe areaを確認                      | アプリ内にiOS手順、対応ブラウザーにはinstall UI                          |
| Medium   | waiting Service Worker            | 旧版を開いたまま新版を配信し、案内→保存完了→更新→再読込で学習データが保持されることを確認                            | 書込みflush、失敗時fail-closed、backup／cache recovery                   |
| Medium   | NVDA／VoiceOver                    | オンボーディング→診断→Today→単語→技能練習を読み上げ、見出し、label、live region、英日発音切替を確認                  | axe、keyboard E2E、semantic component test、`lang`分割                   |
| Medium   | 200% zoom／forced colors          | 実ブラウザーで拡大・強制色を有効にし、情報欠落、横スクロール、focus消失、隠れた主要操作がないことを確認              | 200%相当reflow、160px proxy、focus／contrast CSSを自動検証               |
| Medium   | MediaRecorder／権限拒否           | 対応端末で許可・拒否・録音・再生・削除を確認                                                                         | text response fallback、unsupported／拒否／失敗test                      |
| Low      | Web Speechの声質・発音            | Stage別の英文を各対象端末で再生し、理解可能な発音と速度を確認                                                        | script表示、再生速度設定、音声は環境依存で公式音声ではないことを明示     |
| Medium   | 人間の英語校閲者による全件レビュー | pack 1件を含む全352 records（140語・31レッスン・155演習・25技能セット）の文法、自然さ、難度、文化的偏りをbatch記録で確認 | Zod全件検証、代表spot check、original metadata。Phase 11でbatch QAを実施 |

## Recommended Phase 11 batches

1. 公開前ゲート: 最新dependency audit、remote CI／Pages、実配信Service Worker更新を1つのrelease rehearsalとして完了する。
2. 実機アクセシビリティ: iPhone／Android、NVDA／VoiceOver、200% zoom／forced colors、録音・音声を端末別matrixで確認する。
3. 教材拡張: Stageごとの語彙・レッスン・技能教材を小batchで追加し、人間の英語校閲と`CONTENT_QA.md`をbatchごとに完了する。
4. 所有者判断: 正式名称、公開ライセンス、公開先を確定し、brandingと配布条件へ反映する。
