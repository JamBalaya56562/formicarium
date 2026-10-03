## Developer Code Scan Results

対象リポジトリ：formicarium（プロジェクトルート、単一リポジトリ）。スナップショットの範囲は `./`。2026-10-06 に、ファイルの読み取りと短い確認コマンドだけで調べた（aube・blink の再ビルドやテストの実行はしていない）。根拠の種類は、ファイルを読んで確かめたものを「検証済み（読み取り）」、実行して確かめていないものを「未検証」と書く。

### Scan Coverage
- **Analyzed deeply**:
  - `runtime/core.mjs`
  - `runtime/guest-io.mjs`
  - `runtime/session.mjs`
  - `runtime/node/`（`host.mjs`、`run.mjs`、`worker.mjs`）
  - `runtime/web/`（`app.mjs`、`worker.mjs`、`sessions.mjs`、`coi-sw.js`、`index.html`）
  - `scripts/build-guests.sh`
  - `scripts/build-blink-wasm.sh`
  - `scripts/fetch-blink.sh`
  - `scripts/native-baseline.sh`
  - `scripts/lib/container.sh`
  - `scripts/serve.mjs`
  - `scripts/emscripten-env.sh`
  - `tests/node/`（`aube-1645.test.mjs`、`build.test.mjs`、`helpers.mjs`、`measure.test.mjs`、`probe.test.mjs`、`runner.test.mjs`）
  - `tests/browser/`（`aube-1645.spec.mjs`、`probe.spec.mjs`、`diagnostics.mjs`）
  - `fixtures/sessions/aube-1645.txt`、`fixtures/baseline/aube-1645.native.txt`
  - `package.json`、`mise.toml`、`blink.lock`、`playwright.config.mjs`、`.gitignore`
  - `docs/architecture.md`
  - `dist/blink/build-info.json`、`dist/guests/`（`file` で ELF の種類だけ確認）
- **Skimmed only**:
  - `scripts/measure-aube.mjs`、`scripts/lib/timings.mjs`（先頭と形式の検証部分のみ）
  - `guest/probe/`（`Cargo.toml` と `src/main.rs` の構成。`futex_deadline.rs`・`page_fault_race.rs`・`madvise_dontneed.rs`・`src/bin/` は名前と行数のみ）
  - `patches/`（各ファイルの先頭のみ）
  - `docs/decisions/`、`docs/results/`、`docs/nfr-summary.md`、`docs/licenses.md`、`README.md`、`AGENTS.md`、`OUTCOMES.md`（見出しと関連箇所のみ）
  - `fixtures/aube-local-deps/`、`tests/fixtures/`（ファイル名のみ）
  - `.vendor/blink`（`git log` と upstream との `diff --stat` のみ）、`.vendor/blink-src`、`.vendor/cfg.log`（ディレクトリと先頭のみ）
  - `test-results/`（ディレクトリ名のみ。gitignore 対象の過去の実行結果）
  - スナップショットの外（参照しただけで分析範囲には含めない）：`../terrarium/fixtures/sessions/pitchfork-basic.txt`、`../terrarium/fixtures/pitchfork-basic/`（ディレクトリの存在のみ）

### Packages Found
- `formicarium`（ルートの `package.json`）— npm パッケージ（private、ESM、Node >=24）— JavaScript — Node.js とブラウザで blink の wasm を動かすランナー、テスト、計測スクリプト
- `formicarium-guests`（`guest/probe/Cargo.toml`）— Rust の bin クレート（`probe`、`hello`、`exit3`）— Rust — 合格判定用の static-musl x86-64 ゲスト
- blink の fork（`blink.lock` → `.vendor/blink`）— 外部の C ソース（ビルド時に取得）— C — x86-64 Linux のユーザーモードエミュレータ。Emscripten で `dist/blink/blink.{mjs,wasm}` にする
- aube（`aubepkg/aube` v2.6.1、`build-guests.sh` がコンテナ内で clone）— 外部の Rust ソース — Rust — FR7 の確認に使うゲスト。成果物は `dist/guests/aube`（コミット `bd94e42f…` を `dist/guests/aube.commit` に記録）

### Build System
- **Type**: npm（スクリプトの入口のみ）＋ bash スクリプト＋コンテナ（wslc を優先し、使えなければ Docker）。ゲストは cargo、コアは Emscripten（emconfigure／emmake／emcc）
- **Config Files**: `package.json`、`package-lock.json`、`mise.toml`（node 24、rust stable＋`x86_64-unknown-linux-musl`、cmake 4、ninja 1）、`blink.lock`、`guest/probe/Cargo.toml`、`guest/probe/Cargo.lock`、`playwright.config.mjs`、`scripts/lib/container.sh`
- **Build Dependencies**:
  - `scripts/build-blink-wasm.sh` → `scripts/fetch-blink.sh`（`blink.lock` のコミットを `.vendor/blink` に取得し HEAD を照合）→ `emscripten/emsdk:<版>` のコンテナでビルド → `dist/blink/blink.mjs`、`blink.wasm`、`build-info.json`
  - `scripts/build-guests.sh [probe|aube|all]` → `rust:alpine` のコンテナで `cargo build --release --locked --target x86_64-unknown-linux-musl` → `dist/guests/{probe,hello,exit3,aube}`。最後に ELF のマジックと `e_machine=0x3e` を確認する
  - `scripts/native-baseline.sh` → `busybox` のコンテナ（`--network none`）で `dist/guests/aube` を native に実行 → `fixtures/baseline/aube-1645.native.txt`
  - ファイルの受け渡しは tar のストリーム（`container_run <image> <outdir> <script> [inputs...]`）。キャッシュは名前付きボリューム `formicarium-cargo-registry` と `formicarium-cache`
  - リンク設定（`dist/blink/build-info.json` で確認）：`--disable-jit`、`-sPROXY_TO_PTHREAD`、`-sPTHREAD_POOL_SIZE=16`、`-sMAXIMUM_MEMORY=1GB`、`-sINITIAL_MEMORY=128MB`、`-sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createBlink`、`-sEXIT_RUNTIME=1`、`-sENVIRONMENT=web,worker,node`、`-sFORCE_FILESYSTEM=1`、`-sEXPORTED_RUNTIME_METHODS=FS,ENV`。blink のコミットは `4b5c67d5…`、`blinkSourceDirty: false`、emcc 6.0.10

### APIs Discovered
- JS モジュール API — `runtime/guest-io.mjs` — 公開関数 7 つ（`validateEntries`、`populateFs`、`snapshotFs`、`removeTree`、`createOutputCollector`、`runGuest`、`runSession`）＋ `GuestRunError`、定数 `DEFAULT_CWD='/work'`、`GUEST_DIR='/guest'`
- JS モジュール API — `runtime/session.mjs` — 4 関数（`parseSessionScript`、`toSessionSteps`、`formatTranscript`、`normalizeTranscript`）。書き起こしの形式は `$ <command>` / stdout / `[exit <code>]`（stderr は含めない）
- JS モジュール API — `runtime/core.mjs` — コアの記述子 `blinkCore`（`name`、`loaderPath`、`buildInfoPath`、`argv()`）と `defaultCore`
- JS モジュール API — `runtime/node/host.mjs` — `runInWorker(options)`（`guest`、`args`、`copyIn`、`env`、`cwd`、`steps`、`persist`、`coreFlags`、`timeoutMs`、`onStdout`、`onStderr`、`core`）、`GuestNotFoundError`、`EXIT_NOT_FOUND=127`
- CLI — `runtime/node/run.mjs` — `[--copy-in host:/guest] [--cwd] [--env K=V] [--timeout s] [--core-flag f] <guest> [args...]`。終了コードはゲストのもの、使い方の誤り 2、時間切れ 124、内部エラー 70、ゲストなし 127
- Worker メッセージ — `runtime/node/worker.mjs`、`runtime/web/worker.mjs` — `stdout`／`stderr`（Node はバイト、ブラウザはテキスト）、`done`、`error` の 4 種
- ブラウザのページ（URL パラメータ）— `runtime/web/index.html` ＋ `app.mjs` — `?guest=<name>&arg=...`、`?session=<name>`、`&core-flag=-s`。結果は `window.formicariumResult`（`exitCode`、`transcript`、`steps`、`elapsedMs` など）と `window.formicariumDiagnostics` に置く。名前は `runtime/web/sessions.mjs` の許可リスト（`GUESTS`、`SESSIONS`）と照合する
- HTTP（開発用）— `scripts/serve.mjs` — GET／HEAD の静的配信。全応答に COOP／COEP／CORP を付ける（既定 `127.0.0.1:8787`）。ヘッダーを付けられない配信先向けに `runtime/web/coi-sw.js` の service worker がある

### Frameworks & Libraries
- Node.js — 24（`mise.toml`、`engines >=24`）— 実行環境、`node:test`、`worker_threads`
- @playwright/test — `^1.55.0` — ブラウザのテスト（Chromium・Firefox・WebKit、workers 1、1 件あたり 15 分）
- Emscripten — 6.0.10 — blink の wasm 化（MEMFS の FS、pthread）
- blink（fork）— `aletheia-works/blink` `formicarium-wasm` @ `4b5c67d5…`（upstream `jart/blink` @ `f006a4fc…`）— コア。差分は 18 ファイル、+2016／−114（`blink/emufd.c` 1109 行、`blink/syscall.c`、`blink/emscriptenfs.{c,js}`、`blink/memorymalloc.c` など）
- Rust（ゲスト）— stable、`libc 0.2`、`rayon 1`、`tokio 1`（rt-multi-thread、time）— probe
- コンテナのイメージ — `rust:alpine`、`emscripten/emsdk:<版>`、`busybox:latest`

### Test Coverage
- **Test Directories**: `tests/node/`、`tests/browser/`、`tests/fixtures/`（計測 JSON のサンプル）
- **Test Frameworks**: `node:test` ＋ `node:assert/strict`、Playwright（`tests/browser/diagnostics.mjs` の auto fixture が各テストの診断 JSON を保存する）
- **Coverage Config**: absent
- 実質的には結合テスト。ビルド済みのもの（`dist/blink`、`dist/guests`、native の基準値）を前提にし、なければ `missingArtifacts()` で理由を示して失敗させる。2026-10-05 の記録では Node.js 41／41、ブラウザ 33／33（`README.md`。未検証：今回は実行していない）
- 判定の方法：probe は stdout の `PASS <名前>` と終了コード、aube は `normalizeTranscript(transcript) === normalizeTranscript(baseline)`（改行コードと行末の空白、末尾の改行だけをそろえる）

### Code Quality Indicators
- **Linting**: なし（ESLint・Prettier・rustfmt の設定ファイルはない。`coi-sw.js` に `/* eslint-env */` のコメントがあるだけ）
- **CI/CD**: なし（`.github/` などのパイプライン定義はない。formicarium にはリモートもない（`AGENTS.md`））
- **Documentation**: 充実している。`README.md`、`AGENTS.md`、`OUTCOMES.md`、`docs/architecture.md`、ADR 12 件（`docs/decisions/`）、`docs/results/failures.md`。ソースの各ファイル先頭に目的と FR 番号のコメントがある（日本語）。入力の検証（パスの `..` の拒否、許可リスト、ロックの書式チェック）は境界ごとに入っている

### Technical Debt Signals
- 手順ファイルの解釈が aube 専用：`runtime/session.mjs:16` の `parseSessionScript(text, { tool = 'aube' })` は `<tool> ...` と `rm -rf <相対パス>` しか受け付けず、それ以外は `unsupported command` で止める（`tests/node/aube-1645.test.mjs:47` がこれを確かめている）。`runtime/web/worker.mjs:61` と `scripts/measure-aube.mjs` は `tool` を渡さず既定の `aube` に頼っている
- 引数を空白で分割するだけ：`runtime/session.mjs:25` は `split(/\s+/)` で、引用符を解釈しない
- ゲストと手順の一覧が直書き：`runtime/web/sessions.mjs` の `GUESTS`（probe・hello・exit3・aube）、`GUEST_ENV`（aube だけ）、`SESSIONS`（`aube-1645` だけ）。`scripts/native-baseline.sh` は aube と `aube-1645.txt` に固定で、コマンドも `aube` と `rm -rf` しか許さない。`scripts/build-guests.sh` の対象は `probe|aube|all` だけ
- 手順の間でファイルを引き継ぐのは `persist` に挙げたディレクトリだけ（`runtime/guest-io.mjs:321`、既定は cwd と HOME）。hard link は別々のファイルとして写り、mtime などのメタデータは引き継がない（`snapshotFs` は `mode` だけ記録する）
- `patches/` の 3 つのパッチは、fork のコミット `7e1d743`・`4b5c67d` に取り込み済み（記録用の写し。`AGENTS.md` の運用）。`.vendor/blink-src` は jj で管理する開発用のチェックアウトで、`.vendor/cfg.log` は Windows での emconfigure の失敗ログ（docs/results/failures.md の U-4）
- 空の `sh/` ディレクトリが残っている（用途不明）
- リンターと CI がなく、テストはビルド済みのものと長い実行時間（probe 1 回 600 秒、ブラウザの aube 840 秒が上限）を前提にしている

## Handoff Summary
- **Intent-relevant finding**: pitchfork の 8 コマンドを動かすには、手順の実行部分を aube から切り離す必要がある。terrarium の `../terrarium/fixtures/sessions/pitchfork-basic.txt`（スナップショットの外。中身を読んだだけ）には `$ cat pitchfork.toml` と `$ pitchfork daemons add db --run "postgres -D data"` があるが、`runtime/session.mjs:16-35` の `parseSessionScript` は `tool` と `rm -rf` 以外を拒否し（`cat` は `unsupported command` になる）、`:25` の `split(/\s+/)` は引用符を解かないので、`--run` の値が `"postgres`、`-D`、`data"` の 3 つに割れる。native の基準値の側（`scripts/native-baseline.sh:45` の `sh -c "$cmd"`）は引用符を解くため、このままでは出力がずれる（推測：pitchfork をまだ動かしていないので未検証）。ゲストを加えるときに触る場所は、`runtime/web/sessions.mjs` の `GUESTS`／`GUEST_ENV`／`SESSIONS`、`scripts/build-guests.sh` の対象、`scripts/native-baseline.sh` の固定値、`tests/node/*-1645.test.mjs` に当たる新しいテストと、`tests/browser/` の spec。コア（`runtime/core.mjs`、`dist/blink/`）と入出力の共通部（`runtime/guest-io.mjs` の `runGuest`／`runSession`）はゲストに依存しない作りなので、そのまま使える（検証済み（読み取り））。入力ファイルは、Node では `copyIn`（`runtime/node/worker.mjs:16` の `readHostTree`）、ブラウザでは `SESSIONS[].projectFiles` に列挙したものを `fetch` して置く（`runtime/web/worker.mjs:65-72`。一覧と `fixtures/` の中身の一致は `tests/node/runner.test.mjs:73` が確かめる）。
- **Risks / follow-up**:
  - `cat` を手順で扱う方法を決める必要がある。JS の側で仮想 FS のファイルを読んで stdout にする（`rm -rf` と同じ扱い）か、ゲストとして busybox などを入れるか。native の基準値（busybox のコンテナで `sh -c`）と同じ書き起こしになることが条件
  - 引用符つきの引数を解く処理を足すときは、native の `sh -c` と同じ分割になるようにし、`tests/node/aube-1645.test.mjs` の既存の解釈テストを壊さないこと
  - pitchfork の状態やファイルの置き場所（`pitchfork.toml` の場所、`settings set` が書く先が HOME 以下か XDG のディレクトリか、`/root` 以外か）を確かめ、`persist` の範囲に入れること。範囲の外に書くと、次の手順（新しいインスタンス）に引き継がれない（未検証）
  - `pitchfork status` などが、スーパーバイザーのない状態で UNIX ドメインソケットや IPC に触る可能性がある。fork は inet の `socket()` を `EAFNOSUPPORT` で拒否する（`docs/architecture.md`、fork の `50bc466`）が、AF_UNIX の connect の失敗の仕方が native と同じかは確かめていない（未検証）。stderr は書き起こしに含めないので、比べるのは stdout と終了コードだけ
  - pitchfork の初期の `pitchfork.toml`（`daemons remove worker` と `status api` があるので、worker と api を含むはず）は terrarium の `fixtures/pitchfork-basic/` にあると見られる。formicarium の `fixtures/` に取り込み、出どころを記録すること（未検証：中身は読んでいない）
  - ビルドの規則：project.md の Corrections のとおり、aube は再ビルドせず `dist/guests/aube` を使う。pitchfork は `build-guests.sh` に新しい対象を足し、`rust:alpine` のコンテナで `--locked --target x86_64-unknown-linux-musl` でビルドするのが既存の方式に合う。取得元の固定（タグとコミットの記録。aube の `aube.commit` と同じ）を残すこと
  - 品質の上限は緩めない（`AGENTS.md`：probe 600 秒、ブラウザの aube 840 秒、worker 1、再試行なし、wasm のメモリ上限 1 GB を `tests/node/build.test.mjs` で固定）。ブラウザの Worker の `delete Atomics.waitAsync`（`runtime/web/worker.mjs:13`、ADR 0009）は残すこと
  - terrarium への組み込みの調査では、境界は「`runtime/core.mjs` の記述子＋ `runtime/guest-io.mjs` の `runGuest`／`runSession`＋ COOP／COEP が必要」という点（`docs/architecture.md`、ADR 0003）が出発点になる
