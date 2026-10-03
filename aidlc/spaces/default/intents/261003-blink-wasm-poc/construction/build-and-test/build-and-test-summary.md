# ビルドとテストのまとめ

**現在の判定（Loop-back 1 後の再実行、2026-10-05）：成功。検証済み：Node.js 36/36、ブラウザ 30/30、ブラウザの 3 回繰り返し 90/90、Node.js の probe・aube の 3 回繰り返し 17/17 × 3。性能も再計測した。前回の判定と記録は下に残した。**

前回（Loop-back 1 前）の判定：失敗（Node.js 30/30、ブラウザ 61/63）。

上流の成果物：`construction/code-generation/code-generation-plan.md`、`construction/code-generation/unit-test-instructions.md`、`construction/code-generation/code-summary.md`。詳細は `test-results.md`。

## ビルドの状態と前提

- blink の wasm ビルドは成功した（コンテナ `emscripten/emsdk:6.0.10`、公開済みの fork のコミット `7e1d7439`、3 分 43 秒、`blinkSourceDirty: false`）。証拠：rerun-fetch-blink.txt、rerun-build-blink.txt。
- 前提：Node.js 24、Docker Desktop、Playwright のブラウザ。手順は `build-instructions.md`。
- probe は Loop-back 1 で再ビルドした（回帰項目 2 件を追加）。aube はコード生成のビルド物を使った。

## 用意したテストの種類

| 種類 | 手順書 | 状態（Loop-back 1 後） |
|---|---|---|
| ユニット・結合（Node.js） | `construction/code-generation/unit-test-instructions.md`、`integration-test-instructions.md` | 36 件中 36 件合格。probe・aube の 3 回繰り返しも 17/17 × 3 |
| 結合（ブラウザ） | `integration-test-instructions.md` | 30 件中 30 件合格。3 回繰り返しで 90 件中 90 件合格 |
| 性能計測（FR6） | `performance-test-instructions.md` | Loop-back 1 後のビルドで再計測した（4 環境 × 3 回、全コマンド終了コード 0） |
| セキュリティの確認 | `security-test-instructions.md` | 前回の確認のまま（`npm audit` で脆弱性 0 件、秘密情報の混入なし）。今回の変更で依存は増えていない |

## カバレッジの期待値

- `poc` の範囲で、テスト戦略は Minimal のため、行カバレッジの下限はない。
- 要件 17 件すべてに、テストか成果物が対応している（`cross-unit-traceability.md`）。

## Target Verification Matrix

Loop-back 1 後の最終状態で判定した。NFR の設計ステージは実行していないため、対象は Testing Contract と requirements.md の非機能要件。前回の判定（TC-GREEN と NFR1 が Not Met、TC-REQ が Unverified）は test-results.md に残した。

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-GREEN | code-generation-plan.md / Testing Contract / scope_floor | 既存テストの失敗 0 | Node.js 36/36、ブラウザ 30/30、繰り返し 90/90。失敗・skip 0 | rerun2-node-*.txt、rerun2-browser.txt、rerun2-browser-repeat.txt | build-and-test | Met |
| NFR1 | requirements.md / Non-Functional Requirements | 同じ環境で同じ合否（3 回は未確認の前提） | ブラウザ全体の 3 回繰り返しで全 90 件合格。Node.js の probe・aube の 3 回とも 17/17 | rerun2-browser-repeat.txt、rerun2-node-repeat-1..3.txt | build-and-test | Met |
| TC-REQ | code-generation-plan.md / Testing Contract / strategy_volume | 各要件に検証可能なテスト、各コンポーネントに正常系 | 要件 17 件のうち 16 件は、実行したテストが合格した（対応は test-results.md の「要件ごとのテスト」）。NFR2（失敗の記録）は自動テストではなく、docs/results/failures.md の内容で確認した。ビルド・Node.js ランナー・Web ランナー・probe・計測の各コンポーネントに、合格した正常系がある | test-results.md、rerun2-*.txt、cross-unit-traceability.md | build-and-test | Met |
| NFR3 | requirements.md / Non-Functional Requirements | 計測値に環境・前面/背面・試行回数を添える | Loop-back 1 後のビルドで 4 環境 × 3 回を再計測し、形式テストに合格 | rerun2-measure.txt、rerun2-node-measure-after.txt（5/5）、docs/results/aube-timings.json | build-and-test | Met |

## 準備状況の評価

- ビルド：**できている**。blink は公開済みの fork のコミット `7e1d7439` からクリーンビルドした（`blinkSourceDirty: false`、3 分 43 秒）。
- テスト：**できている**。上の Target Verification Matrix はすべて Met。
- デプロイ：この範囲（`poc`）には含まれない。

## 既知の制約と残っている項目

- Loop-back 1 で直した不具合（futex の期限、ページ fault の競合、WebKit での aube の停止）は、docs/results/failures.md の L-1〜L-3 に記録した。
- 再計測の値も、ばらつきが大きい。Chromium の初回 install の中央値は 7.6 秒から 20.3 秒になった。L-3（Atomics.waitAsync の無効化）の影響か、計測のばらつきかは切り分けていない（未検証）。

- （前回）ブラウザのテストがときどき失敗した。Loop-back 1 で対応済み。
- 実機の Safari では確認していない（`docs/results/failures.md` の U-1）。
- 計測の条件が CheerpX とそろっておらず、値のばらつきも大きい（U-2）。
- wslc は使えず Docker で代用した（U-3）。ローカルの emsdk ではなくコンテナでビルドしている（U-4）。

## （前回）再開時の判定

検証済み：ブラウザ 3 回の再実行は **61/63 合格、2 件失敗**。Chromium の probe が SIGSEGV、WebKit の probe が 600 秒のタイムアウトになった（test-results.md と browser-resume.txt）。aube #1645 は 3 ブラウザ × 3 回すべて native と一致した。

ビルド・ゲストは既存の成果物を使用し、再ビルドと性能再計測は未実行。テスト準備の評価は **失敗、修正待ち**。原因候補と工数・費用・リスクは resume-investigation.md を参照。修正はまだ行っていない。

## （前回）再開時の Node.js と記録の検証

検証済み：mise 管理の Node.js 24 系を glob で解決し、以下をそれぞれ 1 回、逐次実行した（ブラウザ終了後）。

| コマンド | 結果 | 証拠 |
|---|---|---|
| node --test tests/node/build.test.mjs | 5/5 合格 | node-build-resume.txt |
| node --test tests/node/runner.test.mjs | 5/5 合格 | node-runner-resume.txt |
| node --test tests/node/probe.test.mjs | 11/11 合格 | node-probe-resume.txt |
| node --test tests/node/aube-1645.test.mjs | 4/4 合格 | node-aube-1645-resume.txt |
| node --test tests/node/measure.test.mjs | 5/5 合格 | node-measure-resume.txt |
| node aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/build-and-test/verify-record.mjs | TRACEABILITY: 17/17、TIMINGS: 4 environments x 3 trials、終了コード 0 | record-resume.txt |

traceability の確認は status=OK と対応先ファイルの存在の検証であり、全要件の動作合格を意味しない。TC-REQ はすべての要件について最小の検証レベルのテストが揃うかを独立に証明できていないため Unverified。NFR1 と TC-GREEN は Not Met。NFR3 は既存計測記録の検証で Met とするが、計測値の再取得・性能の安定性は今回未検証。

テスト前のシェル起動が Rust stable の更新を開始したため、その完了を確認してからブラウザを開始した。Rust の更新をゲスト再ビルドと取り違えない。Node.js テストの実行とブラウザテストは並行させていない。

