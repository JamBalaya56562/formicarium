## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-05T00:37:44Z
**Iteration:** 1

これは advisory レビュー（1 回限り）です。対象は Loop-back 1（Step 11〜16）。blink の差分 4 ファイル、`runtime/web/worker.mjs`、`guest/probe/src/{futex_deadline,page_fault_race,main}.rs`、両テストを読み、`loopback1-*.txt` のログを確認しました。READY は「Major が 2 件以下」という機械的な判定です。下の Major 2 件は、承認前に人間が判断してください。

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/code-summary.md > Loop-back 1 > 直したもの L-2 / loopback1-pfr-before-node-*.txt | L-2 は 2 つの別々の欠陥（`TrackHostPage` の無ロック realloc と、CAS に負けた側の `FreeAnonymousPage` へのインデックス誤渡し）を 1 つの差分で直している。code-summary 自身が「どちらが効いたか未切り分け」と書いている。修正前の失敗を示すログは Node.js のみ（`loopback1-pfr-before-node-1..5.txt` は 5/5 失敗、例 `FAIL page-fault-race: round=0 corrupted slots=309 ... got=0x80000000000f2b00 want=0x8000000000001900`）。ブラウザで `page-fault-race` が修正前に失敗したログはない。元の症状（Chromium の rayon 後 SIGSEGV、WebKit の tokio-timer 後の停止）が L-2 で直ったという主張の根拠は、修正後のブラウザが 90/90 通ったことだけ。修正前のブラウザの失敗率は `loopback1-browser-diagnostic.txt` の 3 回中 Chromium 1 回（`-s` 付き）のみ。 | 次のいずれかを選ぶ。(a) 片方ずつ外した 2 ビルドで `page-fault-race` を Node.js で回し、各修正の寄与を切り分ける。(b) 元の Chromium SIGSEGV が L-2 で直ったという主張を「推測」に格下げし、修正前のブラウザでの `page-fault-race` 失敗率を採って回帰テストがブラウザでも欠陥を捉えると示す。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/code-generation-plan.md > Step 15 / code-summary.md > テストの結果 | Step 15 の 1 項目目と 3 項目目が未チェック（`- [ ]`）のまま。最終状態で既存スイートが green ではない。`build.test.mjs` は 4/5 で、失敗は `blinkSourceDirty: true`（`loopback1-fixed-node-build.txt`）。poc スコープは「既存スイートを green に保つ」ことを求める。この失敗の原因はテスト側ではない（未公開の fork 修正でビルドしているため。判定自体は意図どおり）が、green の主張はできない。Node.js の runner / probe / aube / measure は L-3 の前に実行したままで、最終状態では再実行していない。`unit-test-instructions.md` どおりの全体再実行も未実施。 | Step 15 を未完了として扱う。ゲートでは「既存スイート green」を満たさないことを明示し、(a) fork へ公開して `blink.lock` を更新する、または (b) dirty を既知の失敗として承認する、のどちらかを人間が決める。最終状態（L-3 を含む）で Node.js 5 ファイルを再実行する。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/code-summary.md > 未解決（性能の再計測） / runtime/web/worker.mjs L9-13 | L-3 の `delete Atomics.waitAsync` は WebKit だけでなく、全ブラウザの worker の挙動を変える（Chromium / Firefox も waitAsync を使わなくなる）。`aube-timings.json` は L-1〜L-3 の前の値で、再計測していない。FR6 / NFR3 の数値が現行ビルドを表していない。加えて、`TrackHostPage` は匿名ページの割り当てごとにロックを取る。性能への影響は未測定。未解決事項として文書化はされている点は適切。 | 再計測しないなら、`aube-timings.json` と報告書に「L-1〜L-3 の前のビルドで測定」と明記する。再計測するなら、全テスト合格後に 4 コマンド × 4 環境 × 3 回で行う。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/loopback1-aube-hang-diag-workerfix.txt / runtime/web/worker.mjs | L-3 の証拠は WebKit の診断 8 回（修正前は 2/8 が停止、修正後は 8/8 完了）で、標本が小さい。取りこぼしの仕組みは推測と明記されている。`delete` はこの Worker のグローバルにだけ効き、Emscripten が起動する pthread 用の Worker には効かない。pthread 側が waitAsync を使う経路があるかは確認していない。この修正を固定するテストがなく、Emscripten の更新や読み込み順の変更で黙って外れても、断続的な停止としてしか現れない。計画の変更範囲外の変更で、ユーザー承認済みと記録されている点は適切。 | `delete Atomics.waitAsync` が効いている（コア読み込み時点で undefined）ことを確かめる軽い回帰項目を、worker か spec に 1 件加える。または、これを既知の対処であり固定していないと明記する。 | New |
| R-05 | Minor | .vendor/blink-src/blink/memorymalloc.c > TrackHostPage / AllocateAnonymousPage (patches/blink-loopback1-pagefault.patch) | 修正は並行性として妥当。ロック下で新配列を作って複製し、RELEASE で公開し、読み側は ACQUIRE で読む。古い配列は解放しないため解放後参照は起きない。確認できた範囲では g_hostpages_lock が葉のロックで、順序の問題は見当たらない（TrackHostPage 呼び出し元は 2 か所）。ただし、`AllocateAnonymousPage` はプールから再利用したページでも毎回 `TrackHostPage` を呼び、`g_hostpages.n` は減らない。このため表は割り当て回数に比例して増え続け、古い配列も残る（合計で最大で現行表の約 2〜3 倍、幾何級数的な増加）。`page-fault-race` は 16 MiB を 6 回 mmap/munmap するので、長時間のゲストでは表が膨らむ。これは既存の挙動で、今回の変更が悪化させた部分は古い配列の保持だけ。上限は未測定。 | PoC では許容してよい。報告書に「古い配列を解放せず、表は縮まない」ことを既知の制約として記録する。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261003-blink-wasm-poc/construction/code-generation/loopback1-blink-diff.patch > blink/syscall.c FutexWait | L-1 の修正は観測と対応している。修正前の FAIL（2 秒の期限が 647ms で切れた、`loopback1-futex-before.txt`）、修正後 3/3 PASS。ポーリング周期ごとに `GetTime()` から期限を判定するため、wake 回数が経過時間として数えられる欠陥は消える。テストの判定基準（期限の 1900ms 以上、ノーウェイクの 95ms 以上）は緩められていない。L-4（待ち手の起動の遅れ）の修正はテスト側のみで、判定は変えておらず、`waiter_started_ms > wake_loop_ms` で 5 回すべて説明できている。残る小さな点：ループ終了後に期限ちょうどで起きた wake を拾うのは `slot >= 0` の場合だけで、`slot < 0`（slot 枯渇）の経路は wakeseq の変化を見落とし得る。今回の変更範囲ではなく、既存の挙動。 | 対応は不要。気にするなら `slot < 0` の経路の末尾判定を別件として記録する。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| バリデーションツール | 指定なし | 実行していない。ログの内容と差分の読解のみ（推測ではなく、ファイルの該当行を根拠にした）。ビルドとテストは再実行していない（未検証）。 |

### Summary

L-1（futex の絶対期限）と L-2 のロック・解放の修正は、ログと差分から観測と整合している。回帰テストも判定基準を緩めずに欠陥を捉えている。ただし L-2 は 2 つの修正が未切り分けで、ブラウザでの修正前の失敗がなく、元の SIGSEGV への効果は推測の域を出ない（R-01）。Step 15 は未完了で、最終状態では既存の build テストが赤のまま（R-02）。この 2 点を承認前に判断してください。
