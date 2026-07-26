# 13. PWA, Offline, Install, and Update

## 1. PWA目標

- ホーム画面またはOSランチャーから起動できる
- standalone表示
- アプリシェルがオフラインで開く
- 保存済み教材と学習履歴をオフラインで利用できる
- 更新時に学習中データを失わない

## 2. Manifest

最低限:

- id
- name
- short_name
- description
- start_url
- scope
- display: standalone
- background_color
- theme_color
- icons 192 / 512
- maskable icon
- language: ja
- categories: education

アイコンは自作SVGからPNGへ生成してよい。公式ロゴを使わない。

## 3. Cache strategy

### Precache

- HTML
- JS/CSS chunks
- manifest
- icons
- offline fallback
- core content index
- 最小のstarter content

### Runtime cache

| リソース | 戦略 |
|---|---|
| versioned content JSON | Cache First + versioned URL |
| optional audio | Cache First、ユーザー操作で取得 |
| navigation | Network First with app-shell fallback |
| static images/SVG | Stale While RevalidateまたはCache First |
| future API | Network First、失敗時明確な表示 |

巨大音声をprecacheしない。

## 4. Update UX

- 新Service Worker検知時に「更新があります」表示
- 学習セッション中は強制リロードしない
- 更新ボタン押下前に保存をflush
- `skipWaiting` とreloadのタイミングを制御
- 更新後にDB migration失敗時の復旧画面を持つ

## 5. Install UX

### beforeinstallprompt対応環境

- ユーザーが学習を1回完了した後など、文脈に沿って案内
- 初回起動直後に強制モーダルを出さない

### iOS

- 共有ボタン → ホーム画面に追加、の手順を説明
- ブラウザーやOSによって表示が違う旨を短く示す

### 非対応

通常のWebアプリとして全主要機能を使える。

## 6. Offline UX

- 上部または設定に小さなオフライン表示
- 保存操作は通常どおり成功させる
- 未キャッシュ音声だけ「オフラインでは利用できません」
- 復帰時に再取得ボタン
- Offline fallbackページからホームへ戻れる

## 7. Storage

- 起動後、ユーザーの文脈に沿って `navigator.storage.persist()` を検討
- Storage Estimateが使える場合、使用量を設定画面に表示
- 音声キャッシュ削除と全キャッシュ再構築を分ける
- IndexedDBをキャッシュ削除と一緒に消さない

## 8. Background features

Push通知やBackground Syncはコア要件にしない。対応差が大きいため、Pilotでは次に留める。

- アプリ内の「今日の復習」表示
- ホーム画面起動時のdue再計算
- 将来拡張用のReminder interface

## 9. Offline tests

E2Eで確認:

1. オンラインで起動
2. starter contentを開く
3. Service Workerがactive
4. contextをofflineへ
5. reload
6. 今日、単語、保存済みレッスンが開く
7. 回答を保存
8. onlineへ戻る
9. データが維持される

## 10. PWA audit

- manifest fetch成功
- iconサイズ
- start_urlとscope
- HTTPS前提（localhost除く）
- Service Worker scope
- installability warning
- cache invalidation
- offline navigation
