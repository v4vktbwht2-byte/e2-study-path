# 16. Deployment and Operations

## 1. Build

- production buildは環境変数なしでも成立
- base pathを設定可能
- source map公開方針をREADMEへ記載
- app versionとcontent versionを画面に表示可能

## 2. GitHub Pages

D-025により、Public GitHub repositoryからGitHub Pagesへ配備する。

要件:

- 公開URLは `https://v4vktbwht2-byte.github.io/e2-study-path/`
- repository名配下のbase path `/e2-study-path/`に対応
- PWA manifestのstart_url／scopeとService Worker scopeもbaseに合わせる
- Hash Routerを使い直リンク404を避ける
- 既定branchのCI成功commitだけをPages artifactとしてdeploy
- production source map、secret、個人情報を公開artifactへ含めない
- README冒頭とlicense節にAI利用、非公式教材、未校閲範囲を表示

GitHub PagesのSourceはGitHub Actionsとし、`github-pages` environmentは既定branchだけをdeploy可能にする。Cloudflare Pages + AccessはD-024の旧方針として廃止する。

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
9. READMEのAI作成表示と公開artifactの秘密情報不在を確認
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
