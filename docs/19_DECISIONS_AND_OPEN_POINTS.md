# 19. Decisions and Open Points

## Confirmed decisions

| ID    | Decision                                                   | Reason                                                                                                                                                  |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | 初期版はローカル専用                                       | 完成範囲を抑え、オフラインとプライバシーを優先                                                                                                          |
| D-002 | React + TypeScript + Vite                                  | PWA構築とCodex実装の再現性                                                                                                                              |
| D-003 | IndexedDB + Dexie                                          | 構造化履歴・Blob・オフラインに対応                                                                                                                      |
| D-004 | Hash Routerを基本                                          | GitHub Pages等の静的ホストで直リンク問題を減らす                                                                                                        |
| D-005 | CSS Modules + tokens                                       | 依存を抑え、設計を明示                                                                                                                                  |
| D-006 | AI APIはoptional                                           | APIキー保護、コスト、採点誤認を避ける                                                                                                                   |
| D-007 | 復習は透明な独自ヒューリスティック                         | 実装・説明・テストが容易。将来交換可能                                                                                                                  |
| D-008 | 復習表示は4段階中心                                        | 根拠の弱い精密百分率を前面に出さない                                                                                                                    |
| D-009 | 教材とコードを分離                                         | 量産・更新・QAを独立させる                                                                                                                              |
| D-010 | 公式素材を収録しない                                       | 著作権・誤認防止                                                                                                                                        |
| D-011 | TypeScript 6.0.3を使用                                     | 最新7.0.2は現行typescript-eslint 8.65.0のpeer範囲外。安定版のうち品質ツールと互換な版を採用                                                             |
| D-012 | 詳細仕様に必要な契約項目をPhase 02でJSON SchemaとZodへ追加 | contentRevision、技能別教材、単語メモ・お気に入り、厳密なbackup等を`additionalProperties: false`の既存契約へ明示し、仕様とruntime検証の不一致を残さない |
| D-013 | AC-REL-001〜012をすべてRelease必須条件として扱う           | 個別の重大度が未定義であるため、安全側で全release-level acceptanceをblockerとする                                                                       |
| D-014 | マニフェストはソースのみを追跡                             | `.git`、依存、build・test生成物を除外し、実装後もhandoff検証を再現可能にする                                                                            |
| D-015 | 学習規則へ現在時刻を注入する                               | 純粋関数とRepositoryを決定的にテストし、端末時刻・日付境界・再読み込みによる不安定動作を避ける                                                          |
| D-016 | 不正な教材項目はpack全体から隔離できる                     | 1件の教材不備で既存の学習データと利用可能な教材を失わず、起動時に件数付きで問題を説明できるようにする                                                   |
| D-017 | backup schema v1.0.0を厳密検証し、importを20 MiBへ制限する | unknown field、破損JSON、過大な録音、非互換versionをDB変更前に拒否し、部分反映を防ぐ                                                                    |
| D-018 | 録音は既定backup対象外、明示選択時だけBase64で含める       | BlobはJSONへ直接保存できず容量も大きいため。1件10 MiBを上限とし、MIME・宣言size・復号sizeを一致検証する                                                 |
| D-019 | backup mergeは非削除・新しいrecord優先                     | 現在データを残しつつ進捗を後退させない。settingsは取込側、内容が異なるAttempt・録音の同一IDは拒否し、DailyPlan完了と提出済み作文を保持する              |
| D-020 | app cache、音声cache、録音、全利用者データを別操作にする   | cache recoveryでIndexedDBを消さず、利用者が削除対象を誤認しないようにする                                                                               |
| D-021 | Service Worker更新前に画面外の保留書込みも中央で待機する   | 作文のunmount保存や復元処理はroute participant解除後も続き得るため、Promiseをcomponent外で追跡し、失敗時は更新をfail-closedにする                       |
| D-022 | Pilot Releaseをapp 0.2.0／content 0.7.0／DB 2とする        | Phase 00〜10の実装完了をapp versionで示し、教材校正・作文回答例・言語指定の変更をcontent versionで再seed対象にし、既存DB migrationとの境界を明示する    |
| D-023 | 破壊操作と通常保存をorigin単位の世代・排他lockで調停する   | 複数タブの旧autosaveが全削除・置換復元後にデータを復活させないよう、shared／exclusive lock取得後に世代を検証し、調停API非対応時は破壊操作をfail-closedにする |

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
