## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-04T10:37:58Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/traceability.json > FR2.2, FR5.2 (status OK) | FR2.2 と FR5.2 は「Chromium 系（Chrome / Edge）、Firefox、Safari」を対象にしているが、traceability は両方を OK としている。実際に通ったのは Playwright 同梱の Chromium・Firefox・WebKit（いずれも headless）だけである。実機の Safari は未確認（failures.md U-1）で、インストール済みの Chrome / Edge も使っていない。WebKit の合格は根拠として使えるが、Worker の入れ子や SharedArrayBuffer の挙動が Safari と同じとは限らない（failures.md 自身が「未検証」と書いている）。「OK」と書かれたままだと、承認時に FR2.2 が満たされたと読まれる。根拠の種類：検証済み（テスト実行）と未検証（Safari）の差。 | traceability の FR2.2・FR5.2 を「部分的（WebKit で代替）」と分かる状態にするか、承認時に「WebKit 合格で Safari を満たしたとみなす」かを明示的に決める。 | New |
| R-02 | Major | runtime/guest-io.mjs（Emscripten の `FS.*` を直接呼ぶ。73–143 行付近、268 行の `FS.init`）、runtime/core.mjs（コメント） | code-summary.md は「コア固有の処理は core.mjs だけ。guest-io.mjs などはコアに依存しない」と述べるが、guest-io.mjs は Emscripten の `FS`（mkdir・symlink・writeFile・readdir・init など）を直接使っている。core.mjs が定める境界は実質「Emscripten の MODULARIZE 形式で、`FS` を公開するコア」であり、「wasm 1 つ＋起動用の JS」より狭い。Rust 版（paludarium）が wasm32-unknown-unknown や wasm-bindgen で作られると、このランタイムは差し替えだけでは動かない。さらに hard link と flock は fork 側の `blink/emscriptenfs.js`（MEMFS 拡張）に実装されていて、ファイルシステムの機能が「コア」と「Emscripten の FS」のどちらに属するかが曖昧である。プロジェクト規約「コアは将来の Rust 版に置き換えられること」に対して、境界の説明が実態より広い。根拠の種類：コードを読んだ結果（検証済み）。 | 境界の説明を実態に合わせる（「Emscripten FS を公開するコア」を前提とする）。または `FS` 操作を core.mjs の記述子の背後（ファイル供給・取得の関数）に移す。少なくとも code-summary と README の「コアに依存しない」という書き方を直す。 | New |
| R-03 | Minor | .vendor/blink-src/blink/syscall.c > FutexWait（`tick = AddTime(tick, FromMilliseconds(kPollingMs))` と、`if (rc == 0) rc = ETIMEDOUT;` の組み合わせ） | 待機ループは、broadcast で起こされた場合（rc == 0）も ETIMEDOUT に読み替えて次の周回に入る。そのたびに `tick`（絶対時刻）を実時間の経過とは無関係に 50ms 進める。同じアドレスに別の待ち手がいて wake が来ると、タイムアウト付きの待ち手は、実時間が足りないままタイムアウトに達しうる。FUTEX_WAIT_BITSET を FR3.2 の中心に置いているため、タイマーの「50ms 以上」に影響しうる。probe（tokio-timer）は通っているので、いまの合格には影響しない。根拠の種類：推測（コードを読んだ結果。再現はしていない）。 | 周回ごとに `tick` を `GetTime()` から取り直す（または実時間との差で打ち切る）。直す場合は、同じ futex に複数の待ち手がいる状況のテストを 1 件足す。 | New |
| R-04 | Minor | tests/node/probe.test.mjs、guest/probe/src/main.rs、.vendor/blink-src/blink/emufd.c | 計画 Step 5 は eventfd2（`EFD_SEMAPHORE`、`EFD_NONBLOCK`）、epoll の level-triggered・`EPOLLONESHOT` を実装済みとしているが、これらを直接確かめるテストはない。probe が確かめるのは tokio 経由の edge-triggered と eventfd の暗黙の利用だけである。また fork の変更は Emscripten 専用でない経路（cvt.c の変換、bit.c、ssefloat.c の修正など）にも及ぶが、x86-64 ネイティブ版の blink で回帰を見るテストはない（failures.md O-3 の終了コード 137 も原因は未検証）。要件の合否（probe の項目）には影響しない。 | 要件の範囲外でよいなら、未検証の範囲を code-summary に明記する。余力があれば、eventfd（semaphore）・level-triggered・oneshot を確かめる probe 項目を足す。 | New |
| R-05 | Minor | docs/results/failures.md > U-2、docs/results/README.md | FR6 の値は、JIT を後回しにするかの判断材料になるが、同じ環境でも 8 倍近く開く（Firefox の初回 install が 13.0 秒と 102.0 秒。WebKit の frozen install が 6.9 秒と 129.9 秒）。原因は未調査で、F-7 の「原因そのものは未検証」と同じ種類の待ち（50ms 単位のポーリングや pthread Worker の残り）の可能性も排除されていない。CheerpX との条件差（背面での計測がない、コマンドごとに起動し直す）も大きい。記録の形式（NFR3）は満たしているが、中央値だけを閾値に使うと判断を誤りうる。NFR1 の「同じ結果」は合否については成り立つが、時間については成り立っていない。根拠の種類：検証済み（JSON と記録を読んだ結果）。 | 閾値を決める前に、ばらつきの原因を調べるか、少なくとも起動時間を除いた値・背面での値を足す。判断者に、外れ値を含む値であることを伝える。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs`（node 実行ファイルは mise のインストール先を直接指定） | PASS：30 件中 30 件合格、失敗 0（約 31.5 秒） | Node.js 側の FR1.2・FR2.1・FR3〜FR5・FR6・FR7.1 の主張はテストで裏付けられた（検証済み）。ブラウザ側の Playwright テストは時間がかかるため再実行していない。ブラウザの合格と、繰り返し 63 件合格は開発者の報告のまま（未検証）。 |
| `.vendor/blink-src` の git log | HEAD は 247610f で blink.lock のコミットと一致。作業ツリーに未コミットの変更なし | FR1.1（コミットの一意性）の主張と合う。 |

### Summary

主張の中心（Node.js での probe 全 8 項目と #1645 の再現、blink.lock による固定）は、テストの再実行で裏付けられ、未解決項目も failures.md に隠さず記録されている。承認前に見るべきなのは、FR2.2・FR5.2 を OK としているのに実機の Safari を確認していない点（R-01）と、「コアに依存しない」と言いつつ Emscripten の FS に結びついた境界の説明（R-02）の 2 つである。
