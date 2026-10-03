# 結合テストの手順

Minimal 戦略でも作っています（project.md の Corrections：この PoC のテストは実質的に結合テストのため）。単体テストの手順は `construction/code-generation/unit-test-instructions.md` にあります。

## 枠組みと設定

- Node.js：`node:test`。実物の blink の wasm（`dist/blink/`）とゲスト（`dist/guests/`）を、`runtime/node/host.mjs` の `runInWorker`（`worker_threads`）で動かす
- ブラウザ：Playwright（`playwright.config.mjs`）。Chromium・Firefox・WebKit、workers 1、再試行なし。`scripts/serve.mjs` が COOP/COEP 付きで配信する
- 比較の規則：`normalizeTranscript` で改行と行末の空白をそろえ、stdout と終了コードを比べる（requirements.md の FR6.2、Q6）

## 実行のコマンド

スイートは 1 つずつ、ほかに重い処理を動かさない状態で実行します（AGENTS.md）。

| # | 対象 | コマンド | 確かめること | 要件 |
|---|---|---|---|---|
| I1 | pitchfork-basic（Node.js） | `node --test tests/node/pitchfork-basic.test.mjs` | 書き起こしが基準値と一致する。状態が手順の間で引き継がれる | FR6.1〜FR6.4 |
| I2 | pitchfork-basic（ブラウザ 3 種） | `node node_modules/@playwright/test/cli.js test tests/browser/pitchfork-basic.spec.mjs` | I1 と同じ内容を 3 ブラウザで確かめる | FR6.1〜FR6.4 |
| I3 | 既存スイート（Node.js） | `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs` | probe・aube・ランナーに回帰がない | NFR1 |
| I4 | 既存スイート（ブラウザ） | `node node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs` | 同上 | NFR1 |
| I5 | 基準値の再現性 | `bash scripts/native-baseline.sh pitchfork-basic --check-reproducible` | native で 2 回実行した書き起こしが一致する | FR5.1 |

I2 と I4 は 1 回の Playwright の実行にまとめて構いません（spec を 3 つ並べる）。件数はそれぞれ数えます。

## 合格の基準

- I1〜I4：不合格 0 件。件数の基準は次のとおり（2026-10-06 の記録）
  - I3：50 件（変更前の 41 件と、追加した 9 件）
  - I4：33 件
  - I2：3 件
  - I1：3 件
- I5：終了コード 0、かつ `fixtures/baseline/` の差分がないこと
- 時間の上限は変えない。新しいテストは Node.js 120 秒、ブラウザ 600 秒（`tests/shared/pitchfork-basic.mjs`）。既存は probe 600 秒、ブラウザの aube 840 秒

## テストデータと環境

- 入力は `fixtures/sessions/pitchfork-basic.txt`、`fixtures/pitchfork-basic/`、正解は `fixtures/baseline/pitchfork-basic.native.txt`。テストは仮想ファイルシステムに写すだけで、書き換えない
- 手順ごとに新しい blink のインスタンスを作り、`persist`（`/work` と `/root`）だけを引き継ぐ。書き込み先は Step 4 で native に確認済み（`code-summary.md`）
- ブラウザのテストは失敗時に診断 JSON を `test-results/` に保存する（`tests/browser/diagnostics.mjs`）
