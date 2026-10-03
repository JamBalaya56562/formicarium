# 要件の網羅確認（Cross-Unit Final Coverage Gate）

## 判定

**合格**：`inception/requirements-analysis/requirements.md` にある FR と NFR の 17 件すべてが、`construction/code-generation/traceability.json` で `OK` になっており、対応先のファイルも存在する。ユーザーストーリーの段階は実行していないため、AC はない。このワークフローはユニット分割をしないので、対応はすべてステージ単位（`construction/code-generation/`）にある。

確認方法：requirements.md から `**FR<n>.<m>**` と `**NFR<n>**` を抜き出し、traceability.json の coverage と突き合わせ、対応先ファイルの有無をスクリプトで確かめた。

## 要件ごとの対応

| ID | 状態 | 担当 | 対応先ファイル | 注記 |
|---|---|---|---|---|
| FR1.1 | OK | code-generation（ステージ単位） | `blink.lock` | |
| FR1.2 | OK | 同上 | `tests/node/build.test.mjs` | |
| FR2.1 | OK | 同上 | `tests/node/runner.test.mjs` | |
| FR2.2 | OK | 同上 | `tests/browser/probe.spec.mjs` | Safari は Playwright の WebKit で代用。実機の Safari では未確認（`docs/results/failures.md` の U-1）。コード生成の承認時に、レビュー指摘 R-01 は承知のうえとされた |
| FR3.1 | OK | 同上 | `tests/node/probe.test.mjs` | |
| FR3.2 | OK | 同上 | `tests/node/probe.test.mjs` | |
| FR3.3 | OK | 同上 | `tests/node/probe.test.mjs` | |
| FR4.1 | OK | 同上 | `tests/node/probe.test.mjs` | |
| FR4.2 | OK | 同上 | `tests/node/probe.test.mjs` | |
| FR5.1 | OK | 同上 | `guest/probe/src/main.rs` | |
| FR5.2 | OK | 同上 | `tests/browser/probe.spec.mjs` | FR2.2 と同じく、Safari は WebKit で代用 |
| FR6.1 | OK | 同上 | `scripts/measure-aube.mjs` | |
| FR6.2 | OK | 同上 | `docs/results/README.md` | |
| FR7.1 | OK | 同上 | `tests/node/aube-1645.test.mjs` | ブラウザ側は `tests/browser/aube-1645.spec.mjs` |
| NFR1 | OK | 同上 | `tests/browser/probe.spec.mjs` | 3 回の繰り返しで確認（回数はユーザーに未確認の前提） |
| NFR2 | OK | 同上 | `docs/results/failures.md` | |
| NFR3 | OK | 同上 | `scripts/lib/timings.mjs` | |

## 網羅されていない要件

なし。

## Modify 再開時の再確認

検証済み：`node aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/build-and-test/verify-record.mjs` → `TRACEABILITY: 17/17 OK entries with existing targets`（record-resume.txt）。これは対応先の構造検証であり、動作の合格判定とは別である。今回のブラウザ probe は 2 件失敗したため、FR5.2 と NFR1 の動作合格を意味しない。証拠は test-results.md と browser-resume.txt。

## Loop-back 1 後の再確認（2026-10-05）

同じ方法で再確認し、**合格**。requirements.md の FR・NFR 17 件すべてが `traceability.json` で `OK` で、対応先のファイルも存在する。Loop-back 1 で要件の ID は増減していない。各要件を実際に検証したテストと結果は、test-results.md の「要件ごとのテスト（TC-REQ）」にある。
