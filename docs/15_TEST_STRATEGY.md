# 15. Test Strategy

## 1. テストピラミッド

1. 純粋ドメインの単体テスト
2. Repository・DB統合テスト
3. コンポーネントテスト
4. 主要フローのE2E
5. 手動PWA・実機確認

## 2. Unit tests

重点:

- Review scheduler
- Review queue priority
- Daily plan capacity
- Mastery update
- Diagnostic placement
- Text answer normalization
- Word count
- Backup validation and merge
- Content references
- Progress aggregation

復習ドメインは高いカバレッジを目標とし、分岐を網羅する。

## 3. Repository integration

`fake-indexeddb` または実ブラウザーで確認:

- schema作成
- migration
- transaction rollback
- attempt + review + masteryの原子的更新
- dueAt query
- content seed update
- backup restore

## 4. Component tests

- 回答前後の表示
- ヒント使用
- 4段階評価
- word count
- audio unsupported fallback
- microphone denied fallback
- update banner
- offline banner
- empty / error states
- dialog focus

## 5. E2E critical journeys

### E2E-001 初回開始

1. 初回起動
2. 目標・時間設定
3. 診断
4. 推奨ステージ
5. 今日画面

### E2E-002 単語学習と復習

1. 新規単語を学ぶ
2. 問題回答
3. Good評価
4. ReviewState確認
5. reload
6. 状態維持

### E2E-003 Again再出題

1. 誤答
2. Again
3. 同一セッション後半で再出題
4. dueAt更新

### E2E-004 Daily plan

1. 期限超過データをseed
2. 今日画面
3. overdueが新規より優先
4. 軽めコース選択
5. 指定件数に近いプラン

### E2E-005 Backup

1. 学習データ作成
2. export
3. 全削除
4. import preview
5. restore
6. データ一致

### E2E-006 Offline

1. オンライン起動
2. SW active
3. 教材閲覧
4. offline
5. reload
6. 学習・保存

### E2E-007 Writing

1. 要約課題
2. 入力
3. 45〜55語表示
4. draft保存
5. reload後再開

### E2E-008 Speaking fallback

マイク権限拒否でもテキスト練習を完了できる。

### E2E-009 Mobile

320×640 viewportで、今日→単語→回答→完了を操作できる。

## 6. Accessibility tests

自動:

- axeで重大違反なし
- accessible name
- form label
- colorは自動だけに依存せず手動確認

手動:

- キーボードのみ
- VoiceOverまたはNVDAの主要フロー
- 200% zoom
- reduced motion
- dark mode

## 7. Content tests

- schema
- duplicate IDs
- dangling references
- prerequisite cycles
- correct answer validity
- explanation presence
- stage coverage
- source metadata
- word-count target samples
- profanity / forbidden raw HTML

## 8. PWA tests

- Manifest
- SW registration
- installability warnings
- offline reload
- version update
- active session update deferral
- cache cleanup

## 9. CI

Pull request / pushで:

```text
install
lint
typecheck
unit/component tests
content validation
build
E2E
artifact upload on failure
```

E2Eが重い場合もmainブランチでは必須とする。

## 10. Test data

- 現在時刻を固定
- ユーザータイムゾーンを明示
- 期限超過0 / 少 / 多
- 初回 / 長期利用
- migration前DB
- 破損backup
- unsupported APIs

## 11. Manual release matrix

| 環境 | 必須 |
|---|---|
| Desktop Chrome | Yes |
| Desktop Firefox | Yes |
| Desktop Edge | Yes |
| iPhone Safari | Yes |
| iPhone Home Screen PWA | Yes |
| Android Chrome | Recommended |
| Android installed PWA | Recommended |
