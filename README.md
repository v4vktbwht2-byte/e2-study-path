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

Phase 00〜10を完了し、Pilot Release `0.2.0`として引き渡せる状態です。Pilot教材は`0.7.0`、IndexedDB schemaは`2`です。

Phase 10では`AC-REL-001`〜`AC-REL-012`、全repository、教材、PWA、backup、mobile、accessibility、文書を横断監査しました。backupの完全往復、timezone offsetを含むmerge、複数タブの破壊操作と旧autosave、英日混在教材の読み上げ、作文回答例と語数検証、教材表現を補強し、最終再レビューをBlocker 0／P1 0／P2 0としました。詳細は[`docs/22_PILOT_RELEASE_AUDIT.md`](docs/22_PILOT_RELEASE_AUDIT.md)です。

Phase 10の全品質ゲート実行結果は次のとおりです。

- clean install: workspace直下の`node_modules`／`dist`削除後、lockfileから533 packagesを再構築
- unit/componentテスト: 75ファイル・547/547件成功
- coverage: Statements 79.98% / Branches 71.77% / Functions 77.12% / Lines 80.33%
- Playwright E2E: 全フローdesktop/320pxで70/70成功（retry 0）
- axe: 主要14 routeと実データ入りTodayでserious／critical違反0件
- Pilot教材検証: 140語・31レッスン・155演習・技能25セット
- `npm run check`: 成功
- production build: root／`/e2-study-path/`とも成功（entry 209.96 kB、500 kB超のchunk警告なし、PWA precache 69件、artifact 70ファイル）

この全実行後の最終コードレビューで、全ユーザーデータ保存をorigin単位の共有ロックへ集約し、バックアップsnapshot barrierと回帰テスト6件を追加しました。変更後のlint、typecheck、format、静的書込み経路監査はPassしましたが、Vitestの再実行はWindows sandboxの`spawn EPERM`と権限付き実行の利用上限により実行不能でした。実公開前に承認済みの通常環境で`npm run check`、`npm run test:coverage`、root／subpathのbuildと`npm run verify:dist`、`npm run test:e2e`を再実行してください。

Web Speechの声質・発音、MediaRecorderの実権限・録音・再生、iPhone Safari／ホーム画面PWA、実際のwaiting Service Worker差替え、NVDA／VoiceOver、実ブラウザーの200% zoom・forced colors、Cloudflare Pages／Accessは実機・配信環境で未確認です。GitHubの非公開repositoryは作成済みで、CIを実行しています。offline dependency auditは0件でしたが、最新registry照会は依存メタデータの外部送信承認が得られず未実施です。公開ライセンス／配布権利も所有者判断待ちのため、Accessで限定公開する場合を含め、利用者へ提供する前に確定してください。

## 必要環境

- Node.js 24.13.1（`.nvmrc`と`package.json`に記録）
- npm 11.8.0以上
- Git
- Chrome、Edge、Firefox、Safari等の現行ブラウザー
- Cloudflare Pagesへ配備する場合は、GitHub連携を許可できるCloudflareアカウント

バックエンド、外部アカウント、APIキー、`.env`はローカル起動に不要です。依存関係はlockfileどおりに入れるため、通常は`npm install`ではなく`npm ci`を使います。

## ローカル起動

開発サーバーは通常`http://localhost:5173/`で起動します。実際のURLはターミナル表示を優先してください。停止はターミナルで`Ctrl+C`です。

### Windows 11／PowerShell

```powershell
git clone <repository-url>
Set-Location <repository-directory>
node --version
npm --version
npm ci
npm run dev
```

PowerShellの実行ポリシーで`npm.ps1`が拒否される場合、ポリシーを変更せず`npm.cmd ci`、`npm.cmd run dev`のように`npm.cmd`を使えます。

### macOS／Linux

`nvm`を使う場合は、リポジトリの`.nvmrc`から同じNode.jsを導入できます。Node.jsを別の方法で管理している場合は、先に24.13.1へ切り替えてください。

```bash
git clone <repository-url>
cd <repository-directory>
nvm install
nvm use
node --version
npm --version
npm ci
npm run dev
```

### WSL2

Node.jsとnpmはWindows側ではなくWSL側へ導入します。速度とfile watchingの安定性のため、可能ならリポジトリを`/mnt/c`配下ではなくWSLのホーム配下へ置いてください。Windowsブラウザーから開く場合は、次のように全interfaceで待ち受けます。

```bash
cd ~/work/<repository-directory>
nvm install
nvm use
npm ci
npm run dev -- --host 0.0.0.0
```

通常はWindows側で`http://localhost:5173/`を開けます。開けない場合は、WSLで`hostname -I`を実行して表示されたIPとターミナルのportを使います。公共ネットワークでは開発サーバーを公開しないでください。WindowsとWSLの両方から同じ`node_modules`を使い回さず、利用する環境側で`npm ci`をやり直します。

### production buildをローカル確認する

PWAのService Workerは開発サーバーでは無効です。install、更新、offlineを確認するときはproduction buildをpreviewします。

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

ブラウザーで`http://127.0.0.1:4173/`を開きます。`localhost`と`127.0.0.1`は別originなので、学習データも別になります。普段使う方を統一してください。

サブディレクトリ配信をローカル確認する場合は、末尾`/`を含むbase pathを指定してからbuildします。

PowerShell:

```powershell
$env:VITE_BASE_PATH="/e2-study-path/"
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
```

macOS／Linux／WSL:

```bash
export VITE_BASE_PATH=/e2-study-path/
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
unset VITE_BASE_PATH
```

この例では`http://127.0.0.1:4173/e2-study-path/`を開きます。previewを`Ctrl+C`で終了してから環境変数を解除します。通常のE2Eを実行する前は`VITE_BASE_PATH`を未設定へ戻してください。

## テストと品質ゲート

初回だけPlaywrightのChromiumを導入します。

Windows／macOS:

```bash
npx playwright install chromium
```

Linux／WSLでOS依存パッケージも必要な場合:

```bash
npx playwright install --with-deps chromium
```

各scriptの役割は次のとおりです。

| コマンド                   | 内容                                                     |
| -------------------------- | -------------------------------------------------------- |
| `npm run format:check`     | Prettierの整形漏れを確認                                 |
| `npm run lint`             | ESLint                                                   |
| `npm run typecheck`        | TypeScript型検査                                         |
| `npm run test`             | Vitestの単体・統合・コンポーネントテスト                 |
| `npm run test:coverage`    | coverageを計測し`coverage/`へHTML・LCOVを出力            |
| `npm run validate:content` | Pilot教材と`src/content/packs/*.json`を検証              |
| `npm run build`            | 型検査後に`dist/`へproduction build                      |
| `npm run verify:dist`      | manifest・SW・base path・公開asset・source map方針を検証 |
| `npm run check`            | lint、型検査、テスト、教材検証、buildを順に実行          |
| `npm run test:e2e`         | production previewに対するdesktop／320px Playwright E2E  |

第三者が変更を提出する前の標準確認は次のとおりです。

```bash
npm ci
npm run check
npm run test:e2e
```

`npm run check`にE2Eは含まれません。`npm run test:e2e`は内部でproduction buildとpreviewを起動し、既定でport 4173を使います。失敗時のHTML reportは`playwright-report/`、traceやscreenshotは`test-results/`に出ます。reportは次のコマンドで開けます。

```bash
npx playwright show-report
```

依存関係のrelease監査では、registryへ接続できる環境で次も実行し、重大度、影響範囲、対応または見送り理由を記録します。

```bash
npm audit
npm audit --omit=dev
```

前者で開発・ビルド依存を含む全依存、後者で本番依存だけを確認します。

CIは`.github/workflows/ci.yml`の「CI」で、`main`／`master`へのpush、pull request、手動実行時にclean install、lint、型検査、テスト、coverage、教材検証、build、成果物検証、E2Eを実行します。E2E失敗時はPlaywright reportとtest resultsを7日間artifactとして保存します。失敗を隠すためにテストをskipしたり、原因を確認せずretryを増やしたりしないでください。

## 教材を追加・検証する

教材の基準は`contracts/*.schema.json`、実装時の詳細は`docs/12_CONTENT_MODEL_AND_AUTHORING.md`、人手確認は`checklists/CONTENT_QA.md`です。現在アプリが起動時に読み込むstarter packは`src/content/pilot/pilotContentPack.ts`で組み立てています。

1. `contracts/sample/content-pack.sample.json`を参考に、小さな単位で教材を作ります。
2. `id`は既存と重複しない安定値にし、`schemaVersion`と`contentVersion`を設定します。
3. `source.type`を`original`にし、作者または生成元を記録します。
4. 単語、レッスン、演習、技能教材間の参照ID、前提関係、正答、解説を揃えます。
5. JSON packとして検証する場合は`src/content/packs/<pack-id>.json`へ置きます。ディレクトリがなければ作成して構いません。
6. 次の検証を実行し、最後に`checklists/CONTENT_QA.md`で人手確認します。

```bash
npm run validate:content
npm run test
npm run build
```

`src/content/packs/`へJSONを置くだけでは、現在のアプリへ自動配信されません。starter packへ含める場合は、対応する配列を`src/content/pilot/`へ追加し、`pilotContentPack.ts`へ明示的に登録します。そのうえでpackの`contentVersion`、`public/content/<pack-id>/<version>/index.json`、`vite.config.ts`のService Worker用content URLとrevisionを同じversionへ更新します。

公式問題、公式音声、公式logo、市販教材、過去問の言い換えは追加しません。問題形式や語数を参考にする場合も、本文、設問、選択肢、解説、音声は独自に作成します。AI生成教材も`original`として出所を記録し、必ず人が正答の一意性、日本語、難易度、偏見、著作権を確認します。

## PWAのinstallとoffline確認

installとService WorkerにはHTTPSまたはlocalhostが必要です。`npm run dev`ではなくproduction previewまたはHTTPSの配信URLで確認します。

### パソコン／Android

1. production URLをChromeまたはEdgeで開き、初回読込を完了させます。
2. アプリ内の「設定」から「この端末に追加」を選び、ブラウザーの確認を許可します。
3. アプリ内に案内がない場合は、address barのinstall iconまたはブラウザーmenuの「アプリをインストール」「ホーム画面に追加」を使います。
4. installしたiconからstandalone表示で起動します。

### iPhone／iPad

1. Safariでproduction URLを開きます。
2. 共有buttonを選びます。
3. 「ホーム画面に追加」を選び、右上の「追加」を押します。
4. ホーム画面のiconから起動します。

install項目が表示されない場合でも通常のWebアプリとして学習できます。offline確認は、オンラインで一度起動して基本教材の準備を終え、install済みPWAまたは同じoriginを閉じて再度開いてから、端末の通信を切るかDevToolsをofflineにして再読み込みします。未取得の任意音声はofflineでは再生できませんが、基本教材、回答、復習、下書きは端末内で利用・保存できます。

## バックアップ、復元、データ回復

学習データはアカウントやserverではなく、ブラウザーのIndexedDBへ保存されます。端末故障、ブラウザーprofile削除、site data削除、origin変更から自動回復するcloud copyはありません。定期的にJSON backupを端末外へ保管してください。

### バックアップを書き出す

1. アプリの「設定」→「データ管理」を開きます。
2. 「バックアップを書き出す」で、必要な場合だけ「スピーキング録音も含める」を有効にします。録音は既定で含みません。
3. 「JSONを書き出す」を選び、downloadされたfileを別drive等へ保管します。

backupにはprofile、設定、復習予定、習熟度、進捗、回答履歴、作文等が入ります。教材本体、アプリcache、再取得できる音声cacheは含みません。

### バックアップから復元する

1. 「設定」→「データ管理」→「バックアップから復元する」でJSONを選びます。
2. schema・app・教材version、警告、カテゴリ別件数を確認します。不正なfileはこの段階で拒否され、現在のデータは変更されません。
3. 現在の記録を残す場合は「現在のデータへ統合」、backupの状態へ切り替える場合は「現在のデータを置換」を選びます。
4. 置換時は「置換前に現在の安全バックアップを書き出す」を有効のままにすることを推奨します。
5. 「復元内容を最終確認」を選び、確認Dialogで実行します。

誤って削除した場合、backupがなければ学習データは復元できません。URLやdomainを変更した後に記録が見えない場合は、元のscheme・host・portのURLへ戻り、そこからbackupを書き出してください。`localhost`と`127.0.0.1`、HTTPとHTTPS、別domain、別ブラウザーprofileはそれぞれ別originです。

表示やService Workerだけが壊れた場合は、site data全削除の前に「データ管理」→「アプリキャッシュを再構築」を使います。これは学習データを残してアプリcacheを再取得します。「閲覧履歴データを削除」「Clear site data」はIndexedDBも消すことがあるため、必ず先にbackupしてください。

## 静的デプロイ

公開操作はrepository ownerの承認を得てから行い、教材、画像、音声、依存assetを配信する権利と、未決定のsoftware licenseの扱いを先に確認してください。

### Cloudflare Pages + Access（採用構成）

sourceはGitHubの非公開repository `v4vktbwht2-byte/e2-study-path`、production branchは`master`を使います。repositoryが非公開でも配備先URLは自動では非公開になりません。production URL、preview URL、custom domainのすべてをCloudflare Accessで保護し、未認証でアプリ本体を取得できないことを共有前に確認してください。

1. Cloudflare Dashboardの「Workers & Pages」からPages projectを作成し、「Connect to Git」でGitHubを選びます。
2. Cloudflare Pages用GitHub Appには「Only select repositories」で`e2-study-path`だけを許可します。
3. production branchを`master`、build commandを`npm run build`、build output directoryを`dist`にします。root directoryは空欄、framework presetはReact (Vite)です。
4. root配備では`VITE_BASE_PATH`を未設定にするか`/`へ設定してdeployします。
5. Pages projectのpreview deploymentにAccess policyを有効化します。
6. productionの`*.pages.dev`を保護する場合は、Pagesが作成したAccess applicationのdomain設定からpreview専用wildcardを外し、production hostnameを対象に含めます。custom domainを使う場合は、そのhostname用のSelf-hosted Access applicationとAllow policyを作成します。
7. 未認証・許可外ユーザーが拒否され、許可ユーザーだけがproduction／previewへ入れることを別browser profileで確認してからURLを共有します。
8. `#/`を含む画面遷移、manifest、icon、install、online起動後のoffline再読込を確認します。

Cloudflare公式手順:

- [Git連携と非公開repository](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [GitHub Appのrepository範囲](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [build設定](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [preview deploymentのAccess](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [production `pages.dev`／custom domainのAccess注意点](https://developers.cloudflare.com/pages/platform/known-issues/)

D-024でCloudflare Pages + Accessを採用したため、GitHub Pagesの自動deploy workflowは削除しています。GitHub Actionsの`CI`は引き続き実行します。

### その他の静的host

Netlify、S3系host、社内static server等でも、生成された`dist/`だけを配信できます。Hash Routerを使うため、通常はSPA rewrite ruleを必要としません。

root domainへ配信するbuild:

PowerShell:

```powershell
$env:VITE_BASE_PATH="/"
npm run build
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
```

macOS／Linux／WSL:

```bash
VITE_BASE_PATH=/ npm run build
```

サブディレクトリへ配信する場合は、`VITE_BASE_PATH=/subdirectory/`のように先頭と末尾の`/`を含めます。hostのbuild commandは`npm run build`、公開directoryは`dist`です。

配信先では次を確認します。

- HTTPSで配信する。
- `dist/`の内容を階層ごと保持し、JS、CSS、JSON、Web Manifest、iconへ正しいMIME typeを返す。
- `index.html`、`service-worker.js`、`manifest.webmanifest`へ長期間のimmutable cacheを設定しない。hash付きassetだけを長期cacheする。
- build時のbase pathと実際の公開pathを一致させる。
- 任意の`#/...`画面をreloadできる。
- 外部telemetryやAPI keyを追加しない。

### Service Worker更新とrollbackの注意

新しいreleaseを配信しても、開いているPWAは旧Service Workerを使い続ける場合があります。更新案内が出たら、回答、下書き、録音等を保存して学習を終えた後に「保存して更新」を選びます。学習中や未完了の書込みがある間に、強制reload、DevToolsからのunregister、site data削除をしないでください。

更新が反映されない場合は、まず全tabとinstall済みPWAを閉じ、onlineで開き直します。それでも直らない場合は、backupを書き出してから「データ管理」→「アプリキャッシュを再構築」を実行します。Service Workerの手動unregisterやbrowser storage削除は最後の手段です。

rollbackでは前releaseの`dist/` artifactを再配信できますが、IndexedDB migrationを自動で元へ戻すことはできません。DB変更を含むrelease前はbackupを案内し、旧appが新DBを読めることを確認するか、互換性のある修正版を再配信します。

### source map公開方針

標準の`npm run build`、CI、Cloudflare Pagesではproduction source mapを生成・公開しません。調査目的で一時的に必要な場合だけ、信頼できるローカル環境で次を実行します。

```bash
npm run build -- --sourcemap
```

生成された`.map`は公開artifactへ含めず、調査後に通常の`npm run build`で`dist/`を作り直します。source mapを本番公開する方針へ変える場合は、source、教材、path等の開示範囲をreviewし、release記録へ残してください。

## トラブルシューティング

### Node.jsまたはnpmのversionが違う

`node --version`と`npm --version`を確認し、Node.js 24.13.1、npm 11.8.0以上へ合わせてから`npm ci`をやり直します。Windows側とWSL側のNode.jsを混在させないでください。

### `npm ci`がlockfileエラーになる

`package.json`と`package-lock.json`が同じcommitか確認します。依存更新が目的でない限りlockfileを手修正せず、作業中の変更を退避してcleanなcheckoutで再確認します。registry接続、proxy、証明書、空き容量も確認してください。

### Windowsで`spawn EPERM`、file lock、削除失敗になる

起動中のdev server、preview、test runnerを`Ctrl+C`で止め、該当repositoryを開いている別processを閉じます。Windows Defenderや企業向けsecurity software、OneDrive同期、深すぎるpathがprocess起動を妨げる場合があります。WindowsとWSLで同じ`node_modules`を共有せず、利用側で`npm ci`を実行してください。

### WSLのdev serverをWindowsブラウザーから開けない

`npm run dev -- --host 0.0.0.0`で起動し、まず`http://localhost:5173/`を試します。開けない場合は`hostname -I`のIP、Windows Firewall、VPN、利用中portを確認します。

### port 5173または4173が使用中

以前のVite／Playwright processを停止するか、開発時は`npm run dev -- --port 5174`のように別portを指定します。E2Eは4173を前提とするため、E2E実行前は4173を空けてください。

### Playwrightがbrowser executableを見つけられない

`npx playwright install chromium`を実行します。Linux／WSLで共有libraryが不足する場合は`npx playwright install --with-deps chromium`を使います。

### Cloudflare Pagesで白画面、asset 404、install不可になる

Pagesのbuild commandが`npm run build`、出力先が`dist`、root配備のbase pathが`/`であることを確認します。Accessの認証redirect後にassetも同じhostnameから取得できること、manifest／Service Workerが200で取得できることも確認します。PWA installにはHTTPS、正常なmanifest、Service Workerが必要です。

### PWAのinstall項目が表示されない

`npm run dev`ではなくproduction previewまたはHTTPS URLを開きます。すでにinstall済みでないか、private browsingでないか、manifest／icon／Service Workerが200で取得できるかを確認します。iOSはSafariの共有menuから「ホーム画面に追加」を使います。

### 更新後も古い画面、真っ白な画面、offline状態が続く

online接続を確認し、学習を保存して全tab／PWAを閉じてから再起動します。次に「設定」→「データ管理」→「アプリキャッシュを再構築」を試します。browserのsite data全削除は学習記録も消すため、先にbackupします。

### 学習データが消えたように見える

同じbrowser profile、scheme、host、portで開いているか確認します。`localhost`と`127.0.0.1`、HTTPとHTTPS、通常windowと一部のprivate window、別domainは保存領域が異なります。元のoriginへ戻ってJSONを書き出し、新しいoriginで復元します。

### backupを復元できない

JSONをeditorで保存し直さず、書き出した元fileを選びます。画面に出るschema／version／破損内容を確認します。検証失敗時は現在データを変更しません。対応外schemaを無理に編集せず、作成元versionのアプリで開いて新しいbackupを書き出してください。

### マイクを許可できない

録音開始操作後にだけ権限を求めます。browser／OSのsite権限を確認してください。拒否またはMediaRecorder非対応でも、テキスト回答と自己評価で練習を完了できます。

## ライセンス、branding、非公式注記

`E2 Study Path`は作業名であり、英検公式または日本英語検定協会公認・推奨の製品ではありません。教材、音声、模擬結果は本プロジェクトの学習用オリジナルで、公式問題、公式音声、公式scoreではありません。

software licenseは未決定です。licenseがない状態をopen sourceや再配布許可と解釈しないでください。repository ownerがlicenseを選ぶまで、Codexやcontributorが独断でMIT等のlicenseを追加してはいけません。公開配布や第三者asset追加の前に`LICENSE_AND_BRANDING.md`を確認し、必要な権利とnoticeを整理します。

## アクセシビリティ手動確認チェックリスト

目標はWCAG 2.2 AAです。自動axeテストは明らかなマークアップ違反の検出に使いますが、読み上げ順、操作の分かりやすさ、実機PWA、文字拡大時の使いやすさまでは保証しません。axeが成功しても、次の手動確認の代わりにはなりません。

確認前に、日付、対象commit、build URL、確認者、端末、OS、ブラウザー、支援技術とそのバージョンを記録します。各項目は「成功」「失敗」「未実施」のいずれかにし、失敗時は再現手順、期待結果、実際の結果、画面またはログ、関連issueを残します。未実施時は理由と次回の確認環境を残してください。

### キーボードのみ

- [ ] `Tab`と`Shift+Tab`で、表示順に沿ってフォーカスが移動し、すべての位置でフォーカス表示を見失わない。
- [ ] スキップリンクをキーボードで表示・実行でき、メインコンテンツへ移動する。画面遷移後は主見出しへフォーカスするか、画面名が適切に通知される。
- [ ] Dialog内だけでフォーカスが循環し、`Escape`または画面上の閉じる操作で閉じられる。閉じた後はDialogを開いた操作へ戻る。
- [ ] 初回設定、診断、今日の学習、レッスン、単語、技能練習、模擬演習、設定、バックアップ／削除を、キーボードだけで開始・回答・保存・中断・再開できる。キーボードトラップや入力欄と衝突するショートカットがない。

成功条件は、マウスやタッチを使わず主要フローを完了でき、フォーカスの現在地と次の操作を常に判断できることです。

### NVDA／VoiceOver

- [ ] WindowsではNVDAとChromeまたはFirefox、iOS／macOSではVoiceOverとSafariで確認する。
- [ ] banner、navigation、main、contentinfoなどのlandmarkを識別でき、各画面に内容を表す主見出しが1つあり、見出し階層で内容をたどれる。
- [ ] 入力、選択、音声再生、録音、開閉ボタンに、目的、値、選択・再生・録音などの現在状態を伝えるlabelがある。
- [ ] 正誤、保存完了、読み込み、オフライン、更新、権限拒否、入力エラーなどの重要な変化がlive regionまたはフォーカス移動で通知される。エラーは対象項目と関連付けられ、色やToastだけに依存しない。
- [ ] 進捗、技能傾向、グラフ、タイマー、録音状態を、視覚表示なしでも値と要約テキストから理解できる。

成功条件は、画面構造、操作名、現在状態、結果、エラーと修正方法を読み上げだけで理解し、主要フローを完了できることです。

### 320 CSS px／文字200%

- [ ] viewportを320 CSS pxにし、さらにブラウザーの文字またはページ表示を200%へ拡大して、縦向きの主要画面を確認する。
- [ ] ページ全体に横スクロールが発生せず、文、見出し、入力内容、エラーが重なったり欠けたりしない。意味上必要な表などに局所スクロールを使う場合は、範囲と目的を判断できる。
- [ ] 主要ボタン、保存、戻る、中断、Dialogの閉じる操作が画面外へ隠れず、拡大後も操作できる。
- [ ] タッチ操作の主要な対象が44 CSS px以上あり、隣接する対象を誤操作しにくい。

成功条件は、320 CSS pxと200%表示を組み合わせても情報や操作が失われず、主要フローを完了できることです。

### ライト／ダーク／高コントラスト

- [ ] ライトとダークの両テーマで、本文、補助文、リンク、入力境界、正誤、警告、無効状態、フォーカスリングを判別できる。
- [ ] OSの高コントラストまたはforced colorsを有効にしても、選択状態、フォーカス、ボタン、入力欄が消えない。
- [ ] 色を見分けなくても、文字、アイコン、形または状態名から正誤と重要状態を理解できる。

成功条件は、各表示モードで内容とフォーカスを読み取れ、色だけに依存せず操作結果を判断できることです。

### 動きの軽減

- [ ] OSの`prefers-reduced-motion`とアプリ内の「動きを減らす」をそれぞれ有効にし、画面遷移、スクロール、進捗、正誤フィードバックなどの不要な動きが停止または短縮される。
- [ ] 動きを減らしても状態変化と操作結果が文字または静的な表示で伝わり、機能が失われない。

成功条件は、動きを避けながら同じ情報と操作へアクセスできることです。

### iOS／Android PWA

- [ ] iOS Safariからホーム画面へ追加し、ホーム画面アイコンからstandalone表示で起動する。Android Chromeでもインストールし、アプリアイコンから起動する。
- [ ] 両方で初回起動、再起動、画面遷移、入力、端末回転、オフライン起動、再接続後の復帰を確認する。
- [ ] セーフエリア、ソフトウェアキーボード、200%表示によって、主見出し、入力中の項目、主要操作、Dialogが隠れない。

成功条件は、iOSとAndroidのインストール済みPWAで主要フローを完了でき、オフライン時も利用可能な範囲と復帰方法が分かることです。

### 録音権限拒否／非対応時の代替

- [ ] 録音を明示的に開始する前に、マイクを使う目的と録音データの扱いを確認できる。画面を開いただけでは権限を要求しない。
- [ ] マイク権限を拒否しても要求を繰り返さず、拒否理由と設定変更方法を画面上と読み上げで確認できる。
- [ ] 権限拒否時またはMediaRecorder非対応時も、テキストによるスピーキング練習へ切り替えられ、入力済みの回答や学習記録を失わない。
- [ ] 録音中と停止中の状態を、音や色だけでなく文字とコントロールの状態から判別できる。

成功条件は、マイクを許可しなくても学習を継続・完了でき、許可の有無で既存データが変わらないことです。

全必須環境で「成功」を確認し、失敗を解消して再確認するまで、WCAG 2.2 AAへの完全適合を宣言しません。端末や支援技術を用意できない項目は合格扱いにせず「未実施」としてリリース記録へ残します。

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
9. `docs/22_PILOT_RELEASE_AUDIT.md`
10. `docs/20_IMPLEMENTATION_STATUS.md`

## 実装と教材制作の区別

この引き継ぎは、アプリ機能を完成させるための仕様とプロンプトを含みます。Codexは動作確認用のオリジナル教材を生成しますが、商用品質の大量教材は別工程です。`prompts/11_CONTENT_EXPANSION.md` と `checklists/CONTENT_QA.md` を使い、少量ずつ検証しながら追加します。
