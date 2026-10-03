# 結合テスト手順

## 位置づけ

テスト戦略は Minimal のため、ステージの規定では結合テスト用の手順書を別に作る必要はない。ただしこの PoC のテストは、もともと実物の blink（wasm）と実物のゲストを組み合わせる結合テストである（`construction/code-generation/unit-test-instructions.md` の「モックとスタブの方針」）。ここでは、それらを結合テストとしてまとめて実行する手順を記す。

## テストの枠組みと設定

- Node.js：`node --test`（組み込み）
- ブラウザ：Playwright（`playwright.config.mjs`）。Chromium・Firefox・WebKit を使う。開発用サーバー（`scripts/serve.mjs`）は Playwright の `webServer` が自動で起動する。

## 実行方法

```bash
node --test tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs
npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs
```

繰り返し（NFR1）：

```bash
npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --repeat-each=3
```

## 期待するカバレッジ

- probe の 8 項目すべてと、aube #1645 の再現が、Node.js と 3 つのブラウザで合格すること（FR2・FR3・FR4・FR5・FR7）。
- 行カバレッジの下限は設けない（`poc` の範囲）。

## テストデータと環境

- `dist/blink/`、`dist/guests/` のビルド物と、`fixtures/aube-local-deps/`、`fixtures/baseline/aube-1645.native.txt` を使う。
- テストは一時ディレクトリにコピーしてから実行し、fixtures 自体は書き換えない。
