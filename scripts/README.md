# Scripts

## verify_handoff.py

JavaScriptプロジェクトを初期化する前に、この引き継ぎ一式の必須ファイル、JSON構文、サンプル参照を確認する標準ライブラリのみのスクリプト。

```bash
python scripts/verify_handoff.py
```

## generate_manifest.py

実装ソースを含む `PROJECT_MANIFEST.json` を再生成する。

```bash
python scripts/generate_manifest.py
```

両スクリプトは `.git`、`node_modules`、`dist`、カバレッジ、Playwrightの生成物を対象外にする。
