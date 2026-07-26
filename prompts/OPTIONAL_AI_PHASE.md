# Optional AI Phase — Not Part of Core Release

## Preconditions

- コアPWAが完成している
- サーバー側または安全なserverless proxyを用意できる
- API費用とデータ送信にユーザーが同意する
- プライバシーポリシーを更新する

## Candidate features

- 英文要約の学習用フィードバック
- 意見英作文の内容・構成・語彙・文法コメント
- 文法ミスの説明
- 面接回答の文字起こしと改善案
- 個人の弱点に合わせたオリジナル練習問題

## Hard constraints

- API keyをPWA bundle、localStorage、IndexedDBへ保存しない
- AI評価を公式採点と表示しない
- 原文と送信内容を送信前に説明する
- opt-in
- タイムアウト、quota、offline時のfallback
- AIなしでもコア学習を継続可能
- 生成教材は自動で本番content packへ入れない
