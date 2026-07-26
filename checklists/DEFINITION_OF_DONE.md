# Definition of Done

機能またはフェーズは、次を満たして初めて完了。

## Behavior

- [ ] 要求IDまたはacceptance criteriaへ対応している
- [ ] 正常系が動く
- [ ] loading / empty / error / offline / unsupportedを考慮した
- [ ] reload後に必要な状態が残る
- [ ] 中断・戻るでデータを失わない

## Code

- [ ] TypeScript errorなし
- [ ] domain ruleがUIへ埋め込まれていない
- [ ] DB直接参照がfeature UIへ漏れていない
- [ ] 重複ロジックを増やしていない
- [ ] 不要な本番dependencyを追加していない
- [ ] 秘密情報がない

## Tests

- [ ] unit test
- [ ] 必要なintegration/component test
- [ ] critical flowはE2E
- [ ] regression testがある
- [ ] testsをskipしていない

## UX / Accessibility

- [ ] 320px幅
- [ ] keyboard
- [ ] visible focus
- [ ] accessible names
- [ ] 44px touch target
- [ ] reduced motion
- [ ] 色だけで状態を伝えていない
- [ ] 日本語文言が初心者を責めない

## Data / Offline

- [ ] transaction境界を確認
- [ ] schema validation
- [ ] offlineで壊れない
- [ ] migration影響を確認
- [ ] backup対象を確認

## Documentation

- [ ] READMEまたは詳細仕様と一致
- [ ] implementation status更新
- [ ] PLANS更新
- [ ] known limitation記録
