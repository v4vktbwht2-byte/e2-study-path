# 16. Deployment and Operations

## 1. Build

- production buildは環境変数なしでも成立
- base pathを設定可能
- source map公開方針をREADMEへ記載
- app versionとcontent versionを画面に表示可能

## 2. Cloudflare Pages + Access

D-024により、GitHubの非公開repositoryをsourceとするCloudflare Pagesを配備先に採用する。GitHub repositoryの非公開設定と配備URLのAccess制御は別であるため、production、preview、custom domainを共有前にAccessで保護する。

Build設定:

- repository: `v4vktbwht2-byte/e2-study-path`
- production branch: `master`
- framework preset: React (Vite)
- build command: `npm run build`
- build output directory: `dist`
- root directory: repository root
- root配備の`VITE_BASE_PATH`: 未設定または`/`

Access要件:

- GitHub Appは対象repositoryだけへ限定する。
- preview deploymentのAccess policyを有効化する。
- production `*.pages.dev`はPagesが作成したAccess applicationのdomain設定を確認し、production hostnameを保護する。
- custom domainはSelf-hosted Access applicationとAllow policyで保護する。
- 未認証、許可外、許可済みの3状態を別browser profileで確認してからURLを共有する。
- Access bypass、service token、公開pathを追加する場合は、対象と理由をdecision logへ残す。

GitHub Pagesの自動deploy workflowは、意図しない二重公開を避けるためD-024で削除した。GitHub Actions CIは継続する。

## 3. Alternative hosts

生成した静的 `dist/` は他の静的hostでも公開できる。移行時はbase path、manifest、Service Worker scope、認証境界を再確認する。

## 4. Versioning

### App version

SemVer。

### Content version

コンテンツパックごとにSemVer。

### DB version

Dexieの整数version。

画面の「アプリ情報」に3つを表示する。

## 5. Release process

1. `npm ci`
2. `npm run check`
3. `npm run test:e2e`
4. manual mobile/PWA QA
5. content QA
6. version update
7. changelog
8. production build
9. Access policyと未認証拒否を確認
10. deploy
11. installed PWA update test

## 6. Rollback

- 前リリースのartifactを保持
- DB migrationは後方互換を意識
- 破壊的migration前にbackup案内
- Service Workerが壊れた場合のcache recovery手順をREADMEへ記載

## 7. Observability

コア版は外部telemetryなし。

代わりに開発者向け診断エクスポートを用意してよい。

含める:

- app version
- content version
- DB version
- browser capability
- SW state
- record counts
- last error codes

個別の回答本文や録音は既定で含めない。

## 8. Support documentation

READMEまたはHelpに:

- 起動
- インストール
- オフライン
- バックアップ
- 復元
- マイク権限
- 更新されない場合
- データ削除
- 非公式注記
