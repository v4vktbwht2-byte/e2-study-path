# 18. Risk Register

| ID    | Risk                                | Probability | Impact | Mitigation                                                                             |
| ----- | ----------------------------------- | ----------: | -----: | -------------------------------------------------------------------------------------- |
| R-001 | 教材生成量を優先し品質が落ちる      |        High |   High | Pilot量を制限し、batch QAを必須化                                                      |
| R-002 | 公式問題の類似・転載                |      Medium |   High | original metadata、レビュー、公式素材を入力に使わない                                  |
| R-003 | 復習が大量にたまり離脱              |        High |   High | backlog rescue、新規自動抑制、責めないUI                                               |
| R-004 | 復習アルゴリズムが複雑すぎる        |      Medium | Medium | MVPヒューリスティック、純粋関数、交換可能interface                                     |
| R-005 | Service Worker更新で古い資産が残る  |      Medium |   High | versioned cache、update UI、E2E更新試験                                                |
| R-006 | IndexedDB migration失敗             |  Low/Medium |   High | migration test、backup、recovery UI                                                    |
| R-007 | iOSで録音・インストール体験が異なる |        High | Medium | capability detection、手順表示、text fallback                                          |
| R-008 | Web Speech音声品質が不安定          |        High | Medium | fallback扱い、スクリプト、将来audio pack                                               |
| R-009 | PWA容量が大きくなる                 |      Medium | Medium | starterのみprecache、音声on-demand、容量管理                                           |
| R-010 | 過度なゲーム化で学習を圧迫          |      Medium | Medium | 原則に継続支援、ランキングなし                                                         |
| R-011 | 初心者説明に未学習語が混じる        |        High | Medium | prerequisites、stage vocabulary validation、QA                                         |
| R-012 | 四択だけで習得と誤判定              |        High |   High | mastery 5軸、想起・入力へ進行                                                          |
| R-013 | 端末時計変更でdueが破損             |      Medium | Medium | elapsed clamp、studyDate、timezone test                                                |
| R-014 | バックアップimportで既存データ破壊  |  Low/Medium |   High | preview、transaction、自動安全backup                                                   |
| R-015 | Codexが仕様を読まず独自実装         |      Medium |   High | AGENTS、Master Prompt、phase gates、status tracking                                    |
| R-016 | 依存関係の更新でビルド不能          |      Medium | Medium | stable versions、lockfile、CI、更新を別PR化                                            |
| R-017 | グラフがアクセシブルでない          |      Medium | Medium | テキスト要約、table代替、axe+manual                                                    |
| R-018 | 非公式スコアが合格保証に見える      |      Medium |   High | 「練習指標」表示、公式CSEを模倣しない                                                  |
| R-019 | 最新dependency advisoryを見落とす   |     Unknown |   High | lockfile、offline audit、CI、既知CVEの修正版確認、公開前に承認済み環境でregistry audit |
