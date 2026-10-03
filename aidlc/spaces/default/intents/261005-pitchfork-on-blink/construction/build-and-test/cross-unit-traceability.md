# 要件の網羅の確認（Cross-Unit Final Coverage Gate）

## 判定

**不合格（3 件が OK になっていない）**。`requirements.md` の 27 個の ID のうち、24 個は `OK` で、対象のファイルが実在します。FR7・FR7.1・FR7.2 の 3 つは `N/A` です。

この 3 つは「native と一致しなかったときの扱い」を定めた条件付きの要件です。今回は Node.js と 3 ブラウザのすべてで最初から一致したので、修正も記録も発生しませんでした。ただし、この確認の規則は `OK` だけを網羅とみなすので、承認の場で判断していただく指摘として残します。

入力は次の 2 つです。`user-stories` は poc の範囲外のため、AC の ID はありません。
- `inception/requirements-analysis/requirements.md`
- `construction/code-generation/traceability.json`（Units Generation がない stage-level の 1 ファイルだけ）

## ID ごとの網羅

| ID | 状態 | 担当 | 対象のファイル | 実在 |
|---|---|---|---|---|
| FR1 | OK | code-generation（stage-level） | `scripts/build-guests.sh` | あり |
| FR1.1 | OK | 同上 | `tests/node/build.test.mjs` | あり |
| FR1.2 | OK | 同上 | `scripts/build-guests.sh` | あり |
| FR2 | OK | 同上 | `fixtures/sessions/pitchfork-basic.txt` | あり |
| FR2.1 | OK | 同上 | `fixtures/pitchfork-basic/app/pitchfork.toml` | あり |
| FR3 | OK | 同上 | `runtime/session.mjs` | あり |
| FR3.1 | OK | 同上 | `runtime/guest-io.mjs` | あり |
| FR3.2 | OK | 同上 | `tests/node/session.test.mjs` | あり |
| FR3.3 | OK | 同上 | `tests/node/session.test.mjs` | あり |
| FR4 | OK | 同上 | `runtime/registry.mjs` | あり |
| FR4.1 | OK | 同上 | `tests/node/runner.test.mjs` | あり |
| FR4.2 | OK | 同上 | `runtime/web/sessions.mjs` | あり |
| FR5 | OK | 同上 | `scripts/native-baseline.sh` | あり |
| FR5.1 | OK | 同上 | `fixtures/baseline/pitchfork-basic.native.txt` | あり |
| FR6 | OK | 同上 | `tests/node/pitchfork-basic.test.mjs` | あり |
| FR6.1 | OK | 同上 | `tests/browser/pitchfork-basic.spec.mjs` | あり |
| FR6.2 | OK | 同上 | `tests/node/pitchfork-basic.test.mjs` | あり |
| FR6.3 | OK | 同上 | `tests/shared/pitchfork-basic.mjs` | あり |
| FR6.4 | OK | 同上 | `tests/browser/pitchfork-basic.spec.mjs` | あり |
| FR7 | N/A | 同上 | 不一致が起きなかったため、修正も記録もなし | — |
| FR7.1 | N/A | 同上 | 直すべき不一致がなかった。blink の fork と `runtime/core.mjs` は変更なし | — |
| FR7.2 | N/A | 同上 | 直せない不一致がなかった。`docs/results/failures.md` への記録なし | — |
| FR8 | OK | 同上 | `docs/terrarium-integration.md` | あり |
| FR8.1 | OK | 同上 | `docs/terrarium-integration.md` | あり |
| NFR1 | OK | 同上 | `tests/node/aube-1645.test.mjs` | あり |
| NFR2 | OK | 同上 | `tests/shared/pitchfork-basic.mjs` | あり |
| NFR3 | OK | 同上 | `scripts/session-info.mjs` | あり |

## 網羅されていない ID

- FR7、FR7.1、FR7.2：条件（native との不一致）が発生しなかったため `N/A`。条件が発生したときの手順は、計画の Step 11・12 と `integration-test-instructions.md` に書いてある
