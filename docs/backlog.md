# バックログ

`planning/BACKLOG.md` は製品スコープ一覧、本ファイルは現在の実装順と未検証事項を管理する。

## 残タスク（優先度順）

1. [中] upstream dependency advisory追跡 — React RouterはRSC未使用、`brace-expansion`はbuild-only。互換するstable修正版が出たら更新。
2. [中] 実配信環境でのwaiting Service Worker差替え確認 — 更新案内、保存完了、更新適用、再読込を実際の旧版・新版で確認。
3. [中] iPhone／Android PWA実機確認 — install、standalone、safe area、offline再起動を確認。
4. [中] NVDA／VoiceOverによる主要フロー確認 — 実機・支援技術で見出し、label、live region、英日発音切替を確認。
5. [中] 実ブラウザーの200% zoom・forced colors確認 — 対応環境で情報と操作が失われないことを確認。
6. [中] MediaRecorder・録音権限の実機確認 — 対応端末で権限・録音・再生・削除を確認。
7. [中] Phase 11教材batch QA — 人間の英語校閲者が全教材を小batchで校正し、文法、自然さ、難度、文化的偏りを記録。
8. [低] Web Speechの声質・発音確認 — 利用端末の音声エンジン依存。

## 完了

- 2026-07-28: Pages再配信で検出した`actions/upload-artifact`のNode.js 20廃止警告に対し、`actions/upload-pages-artifact`と`actions/deploy-pages`を公式のNode.js 24対応v5へ更新。
- 2026-07-28: D-026で「OSSライセンスを付与せず権利留保」を確定。READMEと`LICENSE_AND_BRANDING.md`へ個人学習目的、複製・改変・再配布等を許諾しないこと、GitHub利用規約上の閲覧・Fork、第三者成果物の各ライセンスを明記し、公開ライセンス判断を残タスクから完了へ移した。
- 2026-07-28: `v4vktbwht2-byte/e2-study-path`をPublicで公開し、merge commit `b15897b`の`master` CIとGitHub Pages deploy run `30308497828`をPass。公開PWAの320px表示、横overflowなし、オフライン準備完了表示、console error 0、HTML／manifest／Service Worker／3 iconのHTTPS 200とrepository base pathを確認。
- 2026-07-28: `master` CIが日本時間0〜4時だけ失敗する進捗E2Eの日付境界不整合を修正。seedを暦日ではなく午前4時開始の学習日へそろえ、日本時間0:30固定のdesktop／320px回帰を2回連続Pass。全E2E 70/70、`npm run check`の551/551、教材検証、本番buildもPass。
- 2026-07-27: `master`のcoverage CIで顕在化した診断画面のfocus effect競合を修正。見出しの存在だけでなくfocus完了まで待機する回帰テストへ変更し、対象テスト3回連続9/9、全75 test files・551/551、coverage lines 80.18%、lint、typecheckをPass。
- 2026-07-27: registry接続の`npm ci`と最新auditを実行。全依存10／本番2 HighはRSC未使用とbuild-only間接依存として適用可能性を評価。最終コード状態で551/551 unit/component、coverage lines 80.18%、root／subpath artifact 71ファイル、E2E desktop／320px 70/70をPass。
- 2026-07-27: Cloudflare Pages + Access方針をD-025で置き換え、Public GitHub + GitHub Pagesへ変更。README冒頭とlicense節へ、プログラム・文書・教材が生成AI（OpenAI Codex）を利用して作成・編集され、専門家による全件校閲済みではないことを明記した。
- 2026-07-27: `v4vktbwht2-byte/e2-study-path`をprivateで作成し、`master`の`2b8fe14`をpush。Cloudflare Pages + Accessを配備先に確定し、GitHub Pages自動deployを廃止した。
- 2026-07-27: Phase 10の全Release受入条件、repository、教材、PWA、backup、mobile、accessibility、文書を監査。backup完全往復、timezone offset merge、全user-data write gate、backup snapshot barrier、英日混在lang、作文回答例、教材表現、E2E待機競合を補強し、app 0.2.0／content 0.7.0／DB 2を確定。全実行baselineは75 test files・547/547件、coverage lines 80.33%、全E2E 70/70、root/subpath artifact 70ファイル、教材検証がPass。最終競合修正後はlint／typecheck／format／静的経路監査をPassし、動的再実行を公開前ゲートへ記録。
- 2026-07-27: Phase 09のclean install、CI、失敗時Playwright artifact、CI成功commit限定のGitHub Pages OIDC deploy、repository base path、production artifact検証、同期例外rollback対応の共通IndexedDB seed helper、v1 migration／破損backup／DST／MediaRecorderテスト、第三者向け運用READMEを実装。531 unit/component tests、coverage lines 80.14%、全E2E desktop/320px 70/70（Phase 09固有6/6）、root/subpath build、71ファイルのartifact検証を完了。
- 2026-07-27: Phase 08の7日・30日記録、6技能傾向、弱点、Stage進行、7設定の即時保存・反映、route focus、単一main・h1、live region、Dialog復帰、44px操作領域、320px・文字200%相当reflowを実装。518 unit/component tests、全E2E desktop/320px 64/64、主要route axe serious／critical 0件、`npm run check`を完了。
- 2026-07-27: Phase 07のinstall/offline/update PWA、失敗済み書込み・controller切替時の再確認・全置換/全削除の排他バリアを含む更新安全制御、厳密backup schema、20 MiB検証、録音opt-in Base64、preview、原子的replace/merge、安全backup、選択削除、320px UIを実装。484 unit/component tests、全E2E desktop/320px 54/54、root/subpath production buildを完了。初期bundleの500 kB超警告も解消。
- 2026-07-27: Phase 00の資料・環境・依存互換性・Git基準点監査を完了。
- 2026-07-27: Phase 01のReact/Vite基盤、全ルート、共通UI、品質スクリプトを実装し、全Phaseゲートを完了。
- 2026-07-27: Phase 02の復習・習熟度・診断・日次計画domain、Dexie永続化、原子的回答確定、教材検証・seed・起動処理を実装し、144テストと品質ゲートを完了。
- 2026-07-27: Phase 03のオンボーディング、適応診断、Stageマップ、31レッスン・155問、回答保存・中断再開・原子的完了を実装し、205テストとPhase E2E 6件を完了。
- 2026-07-27: Phase 04の140語、単語ハブ・一覧・詳細、Level 1〜7、新規語の同一セッション再想起、Quick Sort、4段階評価、5軸習熟度、canonical Due/Weak、混同語、原子的保存を実装。Phase 04 domain/feature 117件、desktop/320px E2E 8/8、教材検証、production buildを完了。
- 2026-07-27: Phase 05の今日の学習、5/15/30/45/custom、4コース、80件超の滞留救済、競合安全な再計算、IANA学習日境界、単語途中再開、レッスン翌学習日復習・位置再開、IndexedDB v2移行、原子的保存を実装。322 unit tests、全E2E desktop/320px 34/34、`npm run check`、production buildを完了。
- 2026-07-27: Phase 06の読解6、聞き取り6、要約4、意見4、会話4、短縮模試1、計25技能セットと各実画面、履歴・DailyPlan連携、音声・録音fallback、共通教材検証を実装。55 test files・407 unit/component tests、全E2E desktop/320px 46/46、`npm run check`、production buildを完了。

## 見送り・保留

- Cloudflare Pages + Access — 設定負担を避け、D-025でPublic GitHub + GitHub Pagesへ変更。
