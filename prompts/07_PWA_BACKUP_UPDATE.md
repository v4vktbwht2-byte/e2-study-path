# Phase 07 — PWA, Offline, Update Safety, Backup, and Restore

## Goal

アプリをインストール可能・オフライン利用可能にし、ユーザーデータを安全に書き出し・復元できるようにする。

## Context

- `docs/13_PWA_OFFLINE_INSTALL_UPDATE.md`
- `docs/08_DATA_MODEL_AND_INDEXEDDB.md`
- `docs/14_ACCESSIBILITY_PRIVACY_SECURITY.md`
- `contracts/backup.schema.json`

## Tasks

### PWA

1. manifestを実装する。
2. 192、512、maskable iconを自作する。
3. Service Workerとprecache/runtime cacheを設定する。
4. app shell、starter content、versioned JSONをオフライン利用可能にする。
5. optional audioはon-demand cacheとする。
6. offline indicatorと未取得資産の代替表示を実装する。
7. install prompt対応環境の案内とiOS手順を実装する。
8. SW update bannerを実装し、active study中は強制reloadしない。
9. 更新前に保存をflushする。
10. storage estimate、audio cache clear、app cache recoveryを設定画面へ追加する。

### Backup

11. versioned JSON exportを実装する。
12. bundled contentとcacheを既定で除外する。
13. speaking Blobはopt-inとする。
14. import file size、JSON parse、schemaを検証する。
15. import previewに件数、version、作成日、対象を表示する。
16. replaceとmergeを実装する。
17. replace前に自動安全backupを作れるようにする。
18. restoreをtransactionで行う。
19. incompatible versionや破損データで既存データを変更しない。
20. 全データ削除、cache削除、録音削除を分ける。

### Tests

21. backup round-trip unit/integration test。
22. invalid backup test。
23. offline reload E2E。
24. SW update flowの可能な範囲のテスト。
25. base path付きproduction buildを確認する。

## Constraints

- 学習データをCache Storageだけに置かない。
- cache clearでIndexedDBを消さない。
- active session中に自動reloadしない。
- import失敗時に部分反映しない。

## Done when

- manifestとSWがproduction buildで有効。
- offline reload後に学習と保存が可能。
- backup export→delete→restoreが一致する。
- iOS install helpが表示可能。
- update bannerが安全に動く。

## Verification

```bash
npm run build
npm run test -- backup
npm run test:e2e -- --grep "offline|backup|restore|update"
```

Phase 07を記録し、Phase 08へ進む。
