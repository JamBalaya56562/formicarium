# テスト結果：blink を wasm 上で動かす PoC

**現在の判定（Modify 再開後）：失敗。検証済み：Node.js 30/30 合格、ブラウザ 61/63 合格。根本原因は未検証。以下の前回結果を保持し、末尾に今回の詳細を追記した。**

上流の成果物：`construction/code-generation/code-generation-plan.md`、`construction/code-generation/unit-test-instructions.md`、`construction/code-generation/code-summary.md`。

実行日：2026-10-04。実行環境：Windows 11、Node.js v24.21.0（mise）、Docker Desktop、Playwright（Chromium・Firefox・WebKit、headless、worker 1 本）。ほかの重い処理は並行させていない。

## ビルド

| コマンド | 結果 | 証拠 |
|---|---|---|
| `bash scripts/build-blink-wasm.sh` | 成功（終了コード 0、2 分 13 秒） | `dist/blink/build-info.json`：`blinkCommit` が `247610f272c000185502293b198d766f78d52ba8`（`blink.lock` と一致）、`blinkSourceDirty: false`、emcc 6.0.10 |
| `bash scripts/build-guests.sh` | 再実行していない | aube v2.6.1 のビルドに 1 時間以上かかるため、コード生成で作った `dist/guests/` を使った |
| `bash scripts/native-baseline.sh` | 再実行していない | コード生成で作った `fixtures/baseline/aube-1645.native.txt` を使った |

## テスト

| コマンド | 合計 | 合格 | 失敗 | 備考 |
|---|---|---|---|---|
| `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs` | 30 | 30 | 0 | 作り直した wasm で実行（65 秒） |
| `npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs` | 21 | 19 | **2** | 17.2 分 |
| `npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --repeat-each=3` | 63 | 62 | **1** | 11.7 分 |

コード生成の段階では、開発者がブラウザのテストを 21 件中 21 件、63 件中 63 件の合格と報告していた。今回の再実行では再現せず、失敗はその時々で違うテストに出た。

### 失敗の詳細

**1. Chromium：aube #1645 の再現（1 回目の実行）**

- `tests/browser/aube-1645.spec.mjs:22`：`aube install --frozen-lockfile` が `[exit 1]` で終わり、native の基準値（`[exit 0]`）と食い違った。続く `aube list` は native と同じく `filedep 0.0.0` を表示した。
- frozen install の stderr は、この実行の成果物が繰り返しの実行で上書きされたため残っていない。

**2. WebKit：aube #1645 の再現（1 回目の実行）**

- `tests/browser/aube-1645.spec.mjs:19`：`page.waitForFunction: Timeout 840000ms exceeded`。14 分たっても再現の手順が終わらなかった。
- コード生成で計測した WebKit の frozen install は 6.9〜129.9 秒だったので、遅いのではなく止まっていたと見ている（推測）。

**3. Firefox：probe の mutex-condvar（繰り返し 2 回目）**

- `tests/browser/probe.spec.mjs:53`：`PASS tokio-timer`、`PASS unix-stream-pair`、`PASS rayon` の後に、ゲストが SIGSEGV で止まった。
  - blink のログ：`blink/blink.c:162:42 terminating due to SIGSEGV (rip=88099535 code=1 faultaddr=8061ca28)`、`mov %rax,` の実行中、`[CORRUPT FRAME POINTER]`
  - 成果物：`test-results/probe-probe-の全項目が-PASS-する-firefox-repeat2/`

## 失敗の分析

- **原因の所在は未検証。** どれも同じテストがほかの回では合格しているが、それだけでは設定や実装の原因を切り分けられない。
- **原因は fork 側の blink（`aletheia-works/blink@247610f`）の、スレッド間の競合だと見ている（推測）。** 根拠は次のとおり。
  - Firefox の SIGSEGV は、Mutex・Condvar で 4 スレッドが同じメモリを書き換える項目の途中で起きた。フレームポインタも壊れていた。
  - 対象はゲストのマルチスレッドの部分（tokio・rayon・Mutex・Condvar・aube）に偏っている。
  - コード生成のレビュー（R-03）では、`FutexWait` が broadcast の wake を ETIMEDOUT と扱い、`tick` を実際の経過時間と無関係に進める問題が指摘されている（コードを読んだ結果で、再現はしていない）。
- **原因はまだ特定できていない。** 再現率が低いため、修正方針の確認には、繰り返し実行と blink のシステムコール記録（`--core-flag -s`）での調査が必要になる。

## Target Verification Matrix

適用する品質目標を再確認した。NFR の設計ステージは未実行だが、Testing Contract の既存スイート維持と requirements.md の再現性は適用される。以前の N/A 行はこれらを落としていたため訂正する。

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-GREEN | code-generation-plan.md / Testing Contract / scope_floor | 既存テストの失敗 0 | ブラウザ 63 件中 2 件失敗 | browser-resume.txt の 2 failed / 61 passed | build-and-test | Not Met |
| NFR1 | requirements.md / Non-Functional Requirements | 同じ環境で同じ合否（3 回は未確認の前提） | Chromium の probe は失敗・合格・合格、WebKit は合格・タイムアウト・合格 | browser-resume.txt、chromium-probe-resume-error.md、webkit-probe-resume-error.md | build-and-test | Not Met |
| TC-REQ | code-generation-plan.md / Testing Contract / strategy_volume | 各要件に検証可能なテスト、各コンポーネントに正常系 | 対応先の構造確認とテスト結果を別に確認する。対応先の存在だけではテスト充足を証明しない | cross-unit-traceability.md、Node.js の各再開ログ（30/30 合格）、record-resume.txt（17/17） | build-and-test | Unverified |
| NFR3 | requirements.md / Non-Functional Requirements | 計測値に環境・前面/背面・試行回数を添える | 既存の 4 環境 × 3 回が形式検証合格、新規計測は未実行 | node-measure-resume.txt の pass 5 / fail 0、record-resume.txt の TIMINGS | build-and-test | Met |


## Modify による再開結果（2026-10-04）

検証済み：Node.js 24 系の実体を glob で解決し、`node node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --repeat-each=3 --output=test-results/resume-20261004 --reporter=list` を worker 1 本で実行した。結果は **61 passed / 2 failed、終了コード 1**（20.0 分）。ブラウザ別は Chromium 20/21、Firefox 21/21、WebKit 20/21。aube の native 一致は 3 環境 × 3 回すべて合格。

- Chromium 1 回目：probe が `PASS rayon` の後で SIGSEGV、終了コード 139。`mutex-condvar` の PASS がない。rip=`0x88042fc0`、faultaddr=`0x80018320`。同じテストの 2・3 回目は合格。
- WebKit 2 回目：`PASS tokio-timer` の後で進まず、`Timeout 600000ms exceeded`。同じテストの 1・3 回目は合格。
- 証拠：`browser-resume.txt`、`chromium-probe-resume-error.md`、`webkit-probe-resume-error.md`。前回の結果は上に保持した。
- 原因と影響見積もり：`resume-investigation.md`。根本原因は未検証。前回の futex の指摘だけで今回の SIGSEGV の原因を説明したとは扱わない。
- ビルド物は前回と同じ `247610f` を利用し、今回の wasm／ゲスト再ビルドは未実行。今回の目的は既存の失敗の再現と証拠保存。性能の再計測は、失敗が残るため未実行。

失敗判定：ブラウザコマンドが失敗し、TC-GREEN と NFR1 は Not Met。成功として承認を求めない。コード生成の修正候補へ戻る前に、影響見積もりを添えた選択をユーザーに提示する。現時点の loop-back 回数は 0/3。

## 再開時の Node.js と記録の検証

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


## Loop-Back Log

### Loop-back 1 — 2026-10-04T13:15:59.6795756Z

- Diagnosis：検証済み：Chromium の probe は SIGSEGV（exit 139）、WebKit の probe は PASS tokio-timer の後で 600 秒タイムアウト。browser-resume.txt に 61 passed / 2 failed。根本原因は未検証。
- Root-cause stage：code-generation（暫定）。blink fork のスレッド・メモリ管理、socketpair の待ちと wake、futex の期限計算を調査候補とする。テスト設定の原因も、証拠なしに除外しない。
- Planned fix：ユーザーが Retry with fix を選択。clone／exit／mmap／munmap／futex／socketpair の tid 付きログで原因を限定し、その原因の回帰テストと同期処理の修正を行う。futex の期限計算は独立に再現テストで確認し、再現すれば実時刻から期限を計算する。修正前に新しい試行の計画をレビューに出す。既存成果物は Modify で保持する。
- Estimated impact：追加診断・同期修正 2〜8 時間、futex の期限計算 1〜2 時間（暫定、原因未特定のため超過しうる）。購入費用 0 円、モデル利用量・ローカル計算は消費。回帰リスク中〜高。Node.js と 3 ブラウザの probe・aube を再検証する。

## Loop-back 1 後の再実行（2026-10-05）

**判定：成功。** 前回までの記録は上に残した。実行環境は前回と同じ（Windows 11、Node.js v24.21.0、Docker Desktop、Playwright の Chromium・Firefox・WebKit、worker 1）。テストと計測は逐次で行い、ほかの重い処理は並行させていない。

### ビルド

| コマンド | 結果 | 証拠 |
|---|---|---|
| `bash scripts/fetch-blink.sh` | 成功（終了コード 0） | rerun-fetch-blink.txt |
| `bash scripts/build-blink-wasm.sh` | 成功（終了コード 0、3 分 43 秒）。`blinkCommit` が `7e1d7439…`（`blink.lock` と一致）、`blinkSourceDirty: false` | rerun-build-blink.txt、`dist/blink/build-info.json` |

blink の修正（L-1・L-2）は、ユーザーの承認を得て fork の `formicarium-wasm` に公開し（コミット `7e1d74390765d787000dd54b4258782e0d51bcfe`）、`blink.lock` を更新した。

### テスト

| コマンド | 合計 | 合格 | 失敗 | 証拠 |
|---|---|---|---|---|
| `node --test tests/node/build.test.mjs` | 5 | 5 | 0 | rerun2-node-build.txt |
| `node --test tests/node/runner.test.mjs` | 9 | 9 | 0 | rerun2-node-runner.txt |
| `node --test tests/node/probe.test.mjs` | 13 | 13 | 0 | rerun2-node-probe.txt |
| `node --test tests/node/aube-1645.test.mjs` | 4 | 4 | 0 | rerun2-node-aube-1645.txt |
| `node --test tests/node/measure.test.mjs` | 5 | 5 | 0 | rerun2-node-measure.txt |
| Playwright `tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs` | 30 | 30 | 0 | rerun2-browser.txt（2.9 分） |
| 同上 `--repeat-each=3` | 90 | 90 | 0 | rerun2-browser-repeat.txt（9.8 分） |
| `node --test tests/node/probe.test.mjs tests/node/aube-1645.test.mjs` を 3 回 | 17 × 3 | 17 × 3 | 0 | rerun2-node-repeat-1..3.txt |

skip は 0 件。probe 600 秒・aube 840 秒の上限、worker 1、retries 0 は変えていない。

### 要件ごとのテスト（TC-REQ）

| 要件 | 実行したテスト（すべて合格） |
|---|---|
| FR1.1 | build.test.mjs「fork の取得（FR1.1）」3 件 |
| FR1.2 | build.test.mjs「blink の wasm ビルド（FR1.2）」2 件 |
| FR2.1 | runner.test.mjs 9 件 |
| FR2.2 | probe.spec.mjs「ページが crossOriginIsolated になる」「hello ゲストが起動して終了コード 0 を返す」（3 ブラウザ。Safari は WebKit で代用、U-1） |
| FR3.1〜FR3.3、FR4.1、FR4.2、FR5.1 | probe.test.mjs の項目ごとのテスト、probe.spec.mjs「probe の全項目が PASS する」 |
| FR5.2 | probe.spec.mjs「probe の全項目が PASS する」（3 ブラウザ × 1＋3 回） |
| FR6.1 | `node scripts/measure-aube.mjs --trials 3`（4 環境 × 3 回、全コマンド終了コード 0）、measure.test.mjs |
| FR6.2 | measure.test.mjs「表には環境ごとの中央値と CheerpX の値が並ぶ」 |
| FR7.1 | aube-1645.test.mjs 4 件、aube-1645.spec.mjs（3 ブラウザ × 1＋3 回） |
| NFR1 | 上の 3 回繰り返し |
| NFR2 | 自動テストなし。`docs/results/failures.md` の内容（項目名・環境・症状・見立て）で確認 |
| NFR3 | measure.test.mjs「docs/results/aube-timings.json（計測済みなら）も形式を満たす」 |

### 性能の再計測（FR6、NFR3）

`node scripts/measure-aube.mjs --trials 3`（終了コード 0、580 秒）。中央値（最小〜最大）、単位は秒。修正前の値は `aube-timings-before-loopback1.json` と `results-readme-before-loopback1.md` に保存した。

| 環境 | --version | 初回 install | frozen install | list |
|---|---|---|---|---|
| Node.js Worker | 3.7（3.0–4.5） | 8.2（6.9–10.3） | 13.6（10.3–14.1） | 5.6（3.2–5.9） |
| Chromium | 3.6（1.6–6.9） | 20.3（17.4–30.5） | 17.2（10.2–19.9） | 4.2（1.5–6.2） |
| Firefox | 1.3（1.2–1.3） | 5.4（4.6–15.6） | 19.5（7.4–20.2） | 1.6（1.4–2.2） |
| WebKit | 2.3（2.2–2.9） | 7.4（5.4–16.4） | 5.6（5.4–8.0） | 4.9（2.1–10.4） |
| （修正前）Chromium | 3.0 | 7.6 | 7.6 | 2.8 |
| （修正前）WebKit | 2.0 | 16.7 | 21.4 | 4.2 |
| CheerpX 1.3.9（背景資料） | 0.3–0.7 | 1.8–5.7 | 1.3–3.6 | 0.17–0.65 |

観察：WebKit の install は速くなり（16.7 → 7.4 秒、21.4 → 5.6 秒）、Chromium は遅くなった（7.6 → 20.3 秒、7.6 → 17.2 秒）。WebKit の改善は L-3 の停止がなくなったためと見ている（推測）。Chromium の悪化が L-3（Atomics.waitAsync の無効化で postMessage 経由になった）によるものか、計測のばらつきかは切り分けていない（未検証）。試行 3 回では、ばらつきに対して標本が小さい。

### Target Verification Matrix（最終）

| Target ID | Expected | Actual | Evidence | Verdict |
|---|---|---|---|---|
| TC-GREEN | 既存テストの失敗 0 | 失敗・skip 0 | 上の表 | Met |
| NFR1 | 同じ環境で同じ合否 | 3 回とも全件合格 | rerun2-browser-repeat.txt、rerun2-node-repeat-*.txt | Met |
| TC-REQ | 各要件に検証可能なテスト、各コンポーネントに正常系 | 上の「要件ごとのテスト」。NFR2 は文書で確認 | 同上 | Met |
| NFR3 | 計測値に環境・前面/背面・試行回数 | 再計測し、形式テスト合格 | rerun2-node-measure-after.txt | Met |

### 追加調査：Chromium の悪化と L-3 の切り分け（2026-10-05）

ABBA の交互計測の結果は `docs/results/failures.md` の「U-6 の追加調査」と `ab-l3/summary.txt` にある。結論：Chromium の悪化は L-3 によるものではない（L-3 ありの install の中央値 8.5 秒）。Firefox では L-3 で遅くなる可能性がある（未検証）。条件によらず frozen install が 2 群に分かれる。
