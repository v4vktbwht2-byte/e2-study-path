# Phase 08 — Progress, Settings, UX States, and Accessibility

## Goal

学習記録と弱点を分かりやすくし、全画面の空・エラー・非対応状態を整え、アクセシビリティを仕上げる。

## Context

- `docs/05_SCREEN_SPECIFICATIONS.md`
- `docs/06_DESIGN_SYSTEM.md`
- `docs/14_ACCESSIBILITY_PRIVACY_SECURITY.md`
- FR-PRO / FR-SET

## Tasks

### Progress

1. 日別学習時間、review、新規、lesson完了を集計する。
2. 7日/30日表示を実装する。
3. 語彙、文法、読解、聞き取り、作文、会話の技能別傾向を表示する。
4. weak items、recognition-recall gap、lapse、遅い回答を表示する。
5. stage progressを表示する。
6. グラフにテキスト要約を付ける。
7. 連続日数を罰にせず、再開を肯定する文言にする。

### Settings

8. daily minutes、新規上限、review intensity、speech rate、theme、font scale、reduced motionを実装する。
9. 設定変更を即時反映・保存する。
10. アプリ情報にapp/content/DB version、非公式注記を表示する。

### UX states

11. 全主要画面のloading、empty、error、offline、unsupportedを確認し実装する。
12. route not foundとfatal recoveryを実装する。
13. destructive actionsに明確な確認を付ける。
14. Toastだけに重要エラーを依存させない。

### Accessibility

15. semantic headings、landmarks、labels、live regionsを確認する。
16. keyboard-onlyで主要フローを完了可能にする。
17. focus managementを実装する。
18. 44px touch targetを確認する。
19. 200% zoomと320px幅を修正する。
20. dark themeとcontrastを確認する。
21. reduced motionを全アニメーションへ適用する。
22. axe自動テストを追加する。
23. アクセシビリティ手動確認項目をREADMEへ記録する。

## Constraints

- 外部analyticsを追加しない。
- グラフだけで情報を伝えない。
- streak lossを大きな警告にしない。
- 文字サイズを上げたとき主要ボタンを隠さない。

## Done when

- progressが実データから更新される。
- 設定がreload後も維持される。
- 主要画面に適切な空・エラー状態がある。
- 自動axeで重大違反がない。
- キーボードと320px幅で主要フローが完了する。

## Verification

```bash
npm run test -- progress
npm run test:e2e -- --grep "accessibility|settings|progress|mobile"
npm run check
```

Phase 08を記録し、Phase 09へ進む。
