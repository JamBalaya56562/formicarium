# コード生成の結果：blink を wasm 上で動かす PoC

## 作成・変更したファイル

- 変更：`.gitignore`、`README.md`（日本語の手順と、将来 paludarium に置き換える構想を追記）
- 設定：`mise.toml`、`package.json`、`package-lock.json`、`playwright.config.mjs`、`blink.lock`（fork `aletheia-works/blink` のコミット `247610f272c000185502293b198d766f78d52ba8`）
- スクリプト：`scripts/`（`fetch-blink.sh`、`build-blink-wasm.sh`、`build-guests.sh`、`native-baseline.sh`、`measure-aube.mjs`、`serve.mjs`、`emscripten-env.sh`、`lib/container.sh`、`lib/timings.mjs`）
- ゲスト：`guest/probe/`（probe 本体と、テスト用の `hello`・`exit3`）
- 実行環境：`runtime/`（`core.mjs` にコア固有の処理を集約し、`guest-io.mjs`・`session.mjs`・`node/`・`web/` はコアに依存しない）
- テスト：`tests/node/`（5 ファイル）、`tests/browser/`（2 ファイル）、`tests/fixtures/`
- データと記録：`fixtures/`（terrarium から取り込んだ #1645 の入力、native の基準値）、`docs/licenses.md`、`docs/results/`（計測値、比較表、未解決項目）
- 外部：GitHub に `aletheia-works/blink` を fork し、`formicarium-wasm` ブランチに修正を push した（承認済みの操作）

## 主な実装判断

- **ファイルシステム（Step 6）：blink の VFS ではなく MEMFS を拡張した。** `--enable-vfs` 版もビルドは通るが、blink の hostfs は `linkat`・`flock` をホストにそのまま渡すだけで、Emscripten 上では機能しない。そこで fork 側に `blink/emscriptenfs.{c,js}` を作り、MEMFS に hard link と、実際に排他する BSD 方式の `flock` を追加した。
- **eventfd・epoll・socketpair・pipe は blink の中でエミュレートした**（`blink/emufd.c`）。level/edge-triggered と `EPOLLONESHOT` に対応している。
- **futex**：`FUTEX_WAIT_BITSET`・`FUTEX_WAKE_BITSET` は、待っている側ごとの bitset と照合する。絶対時刻のタイムアウトにも対応した。
- **blink の wasm ビルドはコンテナ（`emscripten/emsdk:6.0.10`）で行う。** Windows では `emconfigure` が WinError 193 で止まり、GNU make もないため。
- **ブラウザ版はネットワークなし。** `socket()` は `EAFNOSUPPORT` を返す。native の基準値も `--network none` で取り、条件をそろえた。
- **コアの境界**：コアは「wasm 1 つ＋JS」として扱い、コア固有の処理は `runtime/core.mjs` だけに置いた。paludarium に置き換えやすくするため。
- **fork で直した blink の不具合（8 件）**：
  - PEXTRW の結果がゼロ拡張されていなかった
  - float→int 変換が範囲外の値で x86 と違う結果を返していた
  - wasm32 で LOCK BTS がデッドロックしていた
  - ファイルの mmap がページごとにメインスレッドとの往復になり、遅かった
  - 終了時の後片付けで競合が起きていた
  - 終了後も pthread の Worker が残っていた
  - 致命的なシグナルで abort していた
  - 終了コードが伝わっていなかった

## テストの結果

- Node.js：`node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs` → 30 件すべて合格。開発者の報告に加え、記録時に node v26.10.0 で再実行して確認した。
- ブラウザ：`npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs` → Chromium・Firefox・WebKit で 21 件すべて合格（開発者の報告。次の「ビルドとテスト」で再確認する）。
- 繰り返し（NFR1）：Node.js の probe と #1645 で 3 回とも 15 件合格。ブラウザで `--repeat-each=3` を付けて 63 件合格（開発者の報告）。
- 計測（FR6）：`docs/results/aube-timings.json`、`docs/results/README.md`。初回 install と frozen install の中央値は次のとおり（CheerpX は 1.8〜5.7 秒と 1.3〜3.6 秒）。
  - Node.js：17.0 秒 / 17.1 秒
  - Chromium：7.6 秒 / 7.6 秒
  - Firefox：13.3 秒 / 13.7 秒
  - WebKit：16.7 秒 / 21.4 秒

## 計画からの逸脱と未解決項目

`docs/results/failures.md` に記録した。該当する計画の項目にはチェックが付いているため、受け入れるかどうかはユーザーの判断による。

- **U-1**：実機の Safari では確認していない。代わりに WebKit で合格した。
- **U-2**：計測の条件が CheerpX とそろっていない（背面での計測をしていない、コマンドごとに blink を起動し直している）。ばらつきも大きい（例：Firefox の初回 install が 13 秒と 102 秒）。
- **U-3**：wslc は ERROR_SHARING_VIOLATION で動かなかったため、Docker で代用した。
- **U-4**：ローカルの emsdk では blink をビルドできず、コンテナでビルドしている。

## Loop-back 1（2026-10-05）：ブラウザの断続的な失敗への対応

Build and Test で残った、断続的な失敗 2 件（Chromium の probe の SIGSEGV、WebKit の停止）と、aube #1645 の断続的な停止に対応した。計画の Step 11〜16 に当たる。各主張には根拠の種類を付けた。証拠のログはこのディレクトリの `loopback1-*.txt` にある。

### 直したもの

| # | 症状 | 原因 | 修正 | 根拠 |
|---|---|---|---|---|
| L-1 | futex で絶対期限より前に ETIMEDOUT が返る（R-03） | `FutexWait` が、ポーリングの回数を経過時間として扱っていた | 実時刻から期限を判定する（`blink/syscall.c`、`patches/blink-loopback1-futex.patch`） | 検証済み：修正前 `loopback1-futex-before.txt` が FAIL（647ms）、修正後 `loopback1-futex-after-1..3.txt` が 3/3 PASS |
| L-2 | 別々のゲストページが同じホストページを共有する。SIGSEGV やフレームポインタの破損として現れる | 非線形メモリ（wasm）で、ホストページ管理表 `g_hostpages` をロックなしで追加・`realloc` していた。また、ページ fault の CAS に負けた側が、管理表の番号をポインタとして解放していた | 管理表の追加をロックで守り、表を広げるときは古い配列を解放しない。CAS に負けた側は `FindHostPage()` で正しいポインタを解放する（`blink/memorymalloc.c`、`blink/memory.c`、`blink/machine.h`、`patches/blink-loopback1-pagefault.patch`） | 検証済み：新しい回帰項目 `page-fault-race` が、修正前は Node.js で 5/5 失敗（`loopback1-pfr-before-node-*.txt`）、修正後は 10/10 合格（`loopback1-pfr-after-node-*.txt`）。2 つの原因のどちらが効いたかは切り分けていない（未検証） |
| L-3 | WebKit で aube が数十秒〜無期限に止まる | Emscripten の実行環境が、代行依頼の待ちに `Atomics.waitAsync` を使い、WebKit でその通知が取りこぼされる。取りこぼしの仕組み（メモリ拡張との関係など）は推測 | `runtime/web/worker.mjs` で、コアを読み込む前に `Atomics.waitAsync` を無効にする（ユーザー承認済み。計画の変更範囲外） | 検証済み：WebKit の診断で、修正前は 2/8 が 4 分で打ち切り（`loopback1-aube-hang-diag.txt`）、修正後は 8/8 が 19〜38 秒で完了（`loopback1-aube-hang-diag-workerfix.txt`） |
| L-4 | WebKit で futex の回帰テストがときどき失敗する | テスト側の問題。起動直後のスレッドの立ち上がり（412〜694ms）が、wake の再試行の打ち切り（約 200 回）より遅かった | 待ち手のスレッドが終わるまで wake を試し続ける（`guest/probe/src/futex_deadline.rs`）。判定の基準は変えていない | 検証済み：失敗 5 回すべてで `waiter_started_ms` > `wake_loop_ms`（`loopback1-trace-webkit40b.txt`） |

### 追加・変更したファイル

- blink（fork のローカルコピー `.vendor/blink-src`、固定元 `247610f`、未公開）：`blink/syscall.c`、`blink/memory.c`、`blink/memorymalloc.c`、`blink/machine.h`。差分の全体は `loopback1-blink-diff.patch`、リポジトリ内の写しは `patches/blink-loopback1-*.patch`。
- `guest/probe/src/futex_deadline.rs`（新規：R-03 の診断・回帰）、`guest/probe/src/page_fault_race.rs`（新規：ページ fault の競合の回帰）、`guest/probe/src/main.rs`（個別指定で動く 2 項目を追加。既存の 8 項目は変えていない）
- `runtime/web/worker.mjs`（L-3）。診断フラグの受け渡し（`runtime/web/sessions.mjs`・`worker.mjs`・`app.mjs`、`runtime/node/run.mjs`）と `tests/browser/diagnostics.mjs` は、前のエージェントが Step 11 で追加していた。
- テスト：`tests/node/probe.test.mjs`、`tests/browser/probe.spec.mjs` に `loopback1:` の回帰を 2 件ずつ追加。

### テストの結果（修正後の最終状態）

| 実行 | 結果 | ログ |
|---|---|---|
| `node --test tests/node/build.test.mjs` | 4/5。失敗 1 件は `blinkSourceDirty: true`（未公開の修正でビルドしているため。下の「未解決」を参照） | `loopback1-fixed-node-build.txt` |
| `node --test` runner / probe / aube-1645 / measure | 9/9、13/13、4/4、5/5 | `loopback1-fixed-node-*.txt` |
| Node.js の probe と aube を 3 回 | 17/17 × 3 | `loopback1-fixed-node-repeat-*.txt` |
| ブラウザ全体（3 ブラウザ） | 30/30 | `loopback1-fixed2-browser.txt` |
| ブラウザ全体 `--repeat-each=3` | 90/90 | `loopback1-fixed2-browser-repeat.txt` |
| 対象回帰 `loopback1:`（Node.js 3 回、ブラウザ 3 種 × 3 回） | 6/6、18/18 | `loopback1-regression-*.txt` |

Node.js のスイートは L-3 の前に実行した。L-3 は Web の worker だけの変更なので、Node.js は再実行していない。probe 600 秒と aube 840 秒の上限、worker 1、retries 0 は変えていない。

### 未解決・未検証

- **ビルドテストの dirty 判定**：fork の `formicarium-wasm` に L-1・L-2 を公開し、`blink.lock` を更新すれば通る。公開は外部への変更なので、ユーザーの判断を待つ（計画 Step 16）。
- **性能の再計測は未実施**：`docs/results/aube-timings.json` は L-1〜L-3 の前のビルドで測った値。特に WebKit の値は L-3 の停止を含む可能性がある（推測）。
- Safari の実機では未確認（U-1 のまま）。
