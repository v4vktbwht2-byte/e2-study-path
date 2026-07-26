# 19. Decisions and Open Points

## Confirmed decisions

| ID | Decision | Reason |
|---|---|---|
| D-001 | 初期版はローカル専用 | 完成範囲を抑え、オフラインとプライバシーを優先 |
| D-002 | React + TypeScript + Vite | PWA構築とCodex実装の再現性 |
| D-003 | IndexedDB + Dexie | 構造化履歴・Blob・オフラインに対応 |
| D-004 | Hash Routerを基本 | GitHub Pages等の静的ホストで直リンク問題を減らす |
| D-005 | CSS Modules + tokens | 依存を抑え、設計を明示 |
| D-006 | AI APIはoptional | APIキー保護、コスト、採点誤認を避ける |
| D-007 | 復習は透明な独自ヒューリスティック | 実装・説明・テストが容易。将来交換可能 |
| D-008 | 復習表示は4段階中心 | 根拠の弱い精密百分率を前面に出さない |
| D-009 | 教材とコードを分離 | 量産・更新・QAを独立させる |
| D-010 | 公式素材を収録しない | 著作権・誤認防止 |

## Open points for repository owner after Pilot

以下はPilot実装を止めない。

1. 正式なアプリ名
2. 公開ライセンス
3. 公開先の最終選択
4. 商用レベルの教材制作体制
5. 人間による英語校閲者
6. 音声収録またはTTSサービス
7. クラウド同期の要否
8. AI添削の要否と予算

## Decision log template

### D-XXX Title

- Date:
- Context:
- Options:
- Decision:
- Consequences:
- Affected requirements/files:
