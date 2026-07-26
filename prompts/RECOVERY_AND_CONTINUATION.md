# Recovery and Continuation Prompt

Codexが途中で止まった、新しいセッションになった、またはコンテキストが切れた場合に使う。

```text
このリポジトリの実装を再開してください。

最初に次を読んでください。
- AGENTS.md
- PLANS.md
- docs/20_IMPLEMENTATION_STATUS.md
- docs/19_DECISIONS_AND_OPEN_POINTS.md
- git statusと直近のdiff

実装済み機能を推測せず、コードとテストで確認してください。
未完了の最小Phaseを特定し、そのPhaseのprompts/*.mdを読んでから作業を再開してください。
既存の正常な実装を作り直さず、不足分を補ってください。
開始前に短い復旧計画をPLANS.mdへ追記し、完了後に該当品質ゲートを実行してください。
認証情報や破壊的操作が不要なら、質問で停止せず自律的に進めてください。
```
