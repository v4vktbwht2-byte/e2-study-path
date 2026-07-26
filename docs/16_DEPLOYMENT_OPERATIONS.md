# 16. Deployment and Operations

## 1. Build

- production buildは環境変数なしでも成立
- base pathを設定可能
- source map公開方針をREADMEへ記載
- app versionとcontent versionを画面に表示可能

## 2. GitHub Pages

第一候補としてGitHub Actionsを用意する。

要件:

- repository名配下のbase pathに対応
- PWA manifestのstart_url / scopeもbaseに合わせる
- Hash Routerを使い直リンク404を避ける
- Actions artifactからPagesへdeploy

READMEに:

1. PagesをGitHub Actions sourceへ設定
2. workflow実行
3. 公開URL
4. 更新時のSW注意

## 3. Alternative hosts

Cloudflare Pages等でも静的 `dist/` を公開できる。特定サービスへロックしない。

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
9. deploy
10. installed PWA update test

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
