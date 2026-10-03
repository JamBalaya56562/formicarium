# コード生成計画：blink を wasm 上で動かす PoC

## 前提と入力

- 要件：`aidlc/spaces/default/intents/261003-blink-wasm-poc/inception/requirements-analysis/requirements.md`（FR1〜FR7、NFR1〜NFR3）。この範囲（`poc`）ではユニット分割を行わないため、各ステップは要件 ID に直接対応づける。
- 要件レビューの未解決の指摘（R-01〜R-08）は、承認時に「承知のうえ」とされた。この計画では、合格条件の具体化（R-01）、aube の版・入力・native 基準値（R-02）、ゲストの入出力（R-04）、fork 元の限定（R-08）をステップ内で扱う。
- 背景資料：`aidlc/spaces/default/knowledge/documents/research/cheerpx-oss.md`。webix・portabox・lanmower/blink は使わない（マルウェア混入の履歴がある）。
- 将来構想：エミュレータのコアは、別リポジトリ paludarium（Rust 版 blink）に置き換える予定。そのため formicarium では、ブラウザ側と統合部分（`runtime/`・`web/`）を blink 固有のビルド物から分け、コアは「wasm モジュール 1 つ＋起動用の JS」という境界でだけ扱う。

## リポジトリ構成（新規作成）

```
formicarium/
  mise.toml                 node・rust・cmake などのツール定義（emsdk は ~/AppData/Local/emsdk を使う）
  blink.lock                fork の URL とコミット（aletheia-works/blink@<sha>）
  scripts/
    fetch-blink.sh          blink.lock のコミットを .vendor/blink に取得
    build-blink-wasm.sh     Emscripten で blink を wasm 化（インタプリタのみ）
    build-guests.sh         コンテナ（wslc）で static-musl の probe と aube をビルド
    native-baseline.sh      コンテナで #1645 を native 実行し、期待出力を保存
    measure-aube.mjs        aube の 4 コマンドを計測して JSON に記録
  guest/probe/              static-musl x86-64 の Rust probe（Cargo プロジェクト）
  fixtures/aube-local-deps/ terrarium から取り込む #1645 用の入力プロジェクト
  fixtures/baseline/        native の期待出力（aube-1645.native.txt）
  runtime/                  コアに依存しない共通部（ゲストのファイル供給、stdout/stderr/終了コードの取得）
    node/run.mjs            Node.js の Worker でゲストを実行する CLI
    web/                    ブラウザ用のページ、Worker、COOP/COEP 用の service worker
  tests/                    node --test と Playwright のテスト
  docs/results/             計測値と合否の記録
```

## 実装ステップ

### Step 1：開発環境とツールの準備（FR1.2）

- [x] `mise.toml` に node（LTS）、rust（stable と `x86_64-unknown-linux-musl` ターゲット）、cmake、ninja を定義する。
- [x] emsdk は terrarium と同じ `~/AppData/Local/emsdk` を使う。`scripts/emscripten-env.sh` で `EMSDK`、`PATH`、`EM_CONFIG` を設定する。emsdk がなければ、導入手順を README に書き、スクリプトは分かりやすいエラーで止める。
- [x] `.gitignore` に `.vendor/`、`dist/`、`target/`、`node_modules/` を追加する。
- [x] テストランナーを先に用意する：`package.json`（テスト用 scripts）、`tests/node/`、`playwright.config.mjs` を作り、`node --test tests/node/build.test.mjs` が実行できる状態にする（Testing Contract の runner_step）。

### Step 2：blink の fork と固定（FR1.1）

- [x] `gh repo fork jart/blink --org aletheia-works --clone=false` で fork を作る（ユーザー承認済み）。fork 元は jart/blink に限る（R-08）。
- [x] fork 上に作業ブランチ `formicarium-wasm` を作る。`blink.lock` に fork の URL と、取り込み元の upstream コミットを記録する。
- [x] `LICENSE`（ISC）を確認し、Apache-2.0 の formicarium から参照・配布できることを `docs/licenses.md` に記録する（Assumptions の確認。R-08）。
- [x] `scripts/fetch-blink.sh`：`blink.lock` のコミットを `.vendor/blink` に取得する。コミットが一致しなければエラーで止める。

### Step 3：blink の Emscripten ビルド（FR1.2）

- [x] fork 側で、Emscripten 向けの修正を入れる。対象は configure の検出、`mmap` や `sigaltstack` などのない機能の分岐、ページサイズの扱い。`--disable-jit` を前提にする。
- [x] `scripts/build-blink-wasm.sh`：`emconfigure ./configure --disable-jit` → `emmake make` で `dist/blink/blink.mjs` と `blink.wasm` を生成する。`-pthread`、`-sPROXY_TO_PTHREAD`、`-sALLOW_MEMORY_GROWTH=1`、`-sMODULARIZE=1`、`-sEXPORT_ES6=1`、`-sEXIT_RUNTIME=1` を付ける。
- [x] クリーンな状態から 1 コマンド（`bash scripts/build-blink-wasm.sh`）で生成できることを確認する。
- [x] テスト（実装の後に作成・実行）：`tests/node/build.test.mjs`（FR1.2）。wasm と mjs が生成されていること、`blink.lock` のコミットと取得物が一致すること、コミットの不一致でエラーになることを確認する。

### Step 4：ゲストのビルドと native 基準値（FR5.1、FR6.1、FR7.1）

- [x] `guest/probe/`：static-musl x86-64 の Rust probe を作る。各項目は `PASS <名前>` または `FAIL <名前>: <理由>` を 1 行で出力し、全項目 PASS のときだけ終了コード 0 を返す。合格条件は次のとおり（R-01）。
  - `tokio-timer`：worker 4 スレッドの multi-thread runtime で、`sleep(50ms)` が 50ms 以上 2000ms 以内に発火する。`interval(10ms)` が 5 回発火する。
  - `unix-stream-pair`：`UnixStream::pair` の片側から 1 MiB を書き、もう片側で同一内容を読み切る。書き手を閉じると EOF になる。
  - `rayon`：4 スレッドの pool で `(0..1_000_000).into_par_iter().sum()` が `499999500000` になる。
  - `mutex-condvar`：4 スレッドが Mutex のカウンタを 10,000 回ずつ増やして 40,000 になる。Condvar のピンポン 1,000 往復が 10 秒以内に終わる。
  - `fs-basic`：作成・書き込み・読み戻し・rename・read_dir が期待どおりに動く。
  - `fs-hardlink`：hard link 後の `nlink` が 2 で、片方への書き込みがもう片方から見える。
  - `fs-symlink`：`readlink` が作成時のパスを返し、symlink 経由で読める。
  - `fs-flock`：1 つ目の fd で `LOCK_EX` を取ると、2 つ目の fd の `LOCK_EX|LOCK_NB` が `EWOULDBLOCK` を返す。解放後は取得できる。
- [x] `scripts/build-guests.sh`：wslc で `rust:alpine` コンテナを使い、probe と aube v2.6.1 を `x86_64-unknown-linux-musl` の static バイナリとしてビルドする。aube の musl ビルドが通らない場合は、原因を `docs/results/` に記録してユーザーに判断を仰ぐ（NFR2。R-02）。
- [x] `fixtures/aube-local-deps/` を terrarium から取り込む。#1645 の手順は terrarium の `fixtures/sessions/aube-1645.txt` と同じ（`aube install` → `rm -rf node_modules` → `aube install --frozen-lockfile` → `aube list`）。
- [x] `scripts/native-baseline.sh`：同じ static-musl の aube を x86-64 Linux コンテナで native 実行し、出力を `fixtures/baseline/aube-1645.native.txt` に保存する（R-02）。

### Step 5：blink へのシステムコール追加（FR3.1〜FR3.3、FR4.2）

すべて fork の `formicarium-wasm` ブランチに実装する（R-07：実装場所はコア側）。

- [x] `eventfd2`：カウンタとフラグ（`EFD_NONBLOCK`、`EFD_SEMAPHORE`、`EFD_CLOEXEC`）を持つ、エミュレータ内のファイル記述子として実装する。
- [x] `FUTEX_WAIT_BITSET` と `FUTEX_WAKE_BITSET`：既存の futex 実装に bitset の照合を追加する。
- [x] `epoll`：ホストの epoll に頼らない実装（`epoll_create1`、`epoll_ctl`、`epoll_pwait`）を作る。level-triggered、edge-triggered（`EPOLLET`）、`EPOLLONESHOT` に対応させる。対象 fd は eventfd・pipe・socketpair・通常ファイル。
- [x] `socketpair(AF_UNIX, SOCK_STREAM)`：エミュレータ内の双方向バッファとして実装し、epoll から待てるようにする。

### Step 6：ファイルシステムの不足を埋める（FR4.1）

- [x] blink の `--enable-vfs`（エミュレータ内のファイルシステム）が Emscripten 上で使えるかを確かめる。使えれば、その上で hard link・flock・rename・read_dir を実装、または有効化する。
- [x] 使えない場合は、Emscripten の MEMFS 上に hard link（同じ inode を共有）と flock（fd ごとのロック表）を追加する。どちらを採ったかと理由を `code-summary.md` に記録する。

### Step 7：実行環境の共通部（FR2.1、FR2.2、R-04）

- [x] `runtime/guest-io.mjs`：ゲストのバイナリと入力ファイルを仮想ファイルシステムに置く処理と、stdout・stderr・終了コードを取り出す処理を、コアに依存しない形で提供する。
- [x] `runtime/node/run.mjs`：`node runtime/node/run.mjs <guest> [args...]` で、Node.js の Worker 上の blink でゲストを実行する。stdout・stderr はそのまま流し、終了コードを自分の終了コードにする。ゲストが見つからないときは、終了コード 127 とエラーメッセージを返す。
- [x] `runtime/web/`：`index.html`、Worker 用スクリプト、COOP/COEP を付ける service worker（GitHub Pages でも動くように）を作る。ページは `crossOriginIsolated` を表示し、`?guest=probe` などで実行するゲストを選ぶ。結果は `<pre id="output" data-testid="output">` と `data-exit-code` 属性に出す。
- [x] `scripts/serve.mjs`：COOP/COEP ヘッダーを付けてローカル配信する、依存のない開発用サーバーを作る。
- [x] テスト（実装の後に作成・実行）：`tests/node/runner.test.mjs`（FR2.1、R-04）。hello ゲストが終了コード 0 と期待どおりの stdout を返すこと、終了コード 3 のゲストの終了コードが伝わること、存在しないゲストでは 127 になることを確認する。

### Step 8：計測と記録（FR6.1、FR6.2、NFR3）

- [x] `scripts/measure-aube.mjs`：Node.js 上と各ブラウザ上で、aube の `--version`、初回 `install`、frozen install、`list` をそれぞれ 3 回実行し、実行時間を記録する。記録には環境（ブラウザ名とバージョン、OS、前面か背面か、試行回数）を添え、`docs/results/aube-timings.json` に保存する。
- [x] `docs/results/README.md`：背景資料の CheerpX 1.3.9 の値と並べた表を出力する。差異（CheerpX 側の `node --version` 起動や、ネットワークなし）も記録する。

### Step 9：統合テストの作成と実行（test-after、Minimal：要件ごとに 1 件、コンポーネントごとに正常系を最低 1 件）

Step 5〜8 の各層を実装した後に、その層をまとめて検証するテストを作成・実行する。ビルドとランナーのテストは、それぞれ Step 3 と Step 7 で実装直後に作成・実行する。

- [x] `tests/node/probe.test.mjs`：FR3・FR4・FR5.1・FR5.2（Node.js）。probe の全項目が PASS であることを、項目ごとに確認する。
- [x] `tests/node/aube-1645.test.mjs`：FR7.1（Node.js）。#1645 の手順の出力が `fixtures/baseline/aube-1645.native.txt` と一致すること。
- [x] `tests/browser/probe.spec.mjs`：FR2.2、FR5.2。Playwright で Chromium・Firefox・WebKit を使い、`crossOriginIsolated` が真であることと、probe の全項目が PASS であることを確認する。
- [x] `tests/browser/aube-1645.spec.mjs`：FR7.1（ブラウザ）。3 つのブラウザで、出力が native の基準と一致すること。
- [x] `tests/node/measure.test.mjs`：FR6。計測結果の JSON に 4 コマンドと環境情報が揃っていること。項目が欠けた JSON を不合格にすること。
- [x] 判定の再現性（NFR1。回数 3 回は未確認の前提）：probe と #1645 のテストを 3 回繰り返し、同じ結果になることを確認する。

### Step 10：結果の記録（NFR2、NFR3）

- [x] 通らなかった項目は、項目名・環境・症状・原因の見立てを `docs/results/failures.md` に記録する（NFR2）。対応はユーザーが個別に判断する。
- [x] README に、ビルド・実行・テスト・計測の手順と、将来 paludarium に置き換える構想を書く。

## 要件との対応

| 要件 | ステップ |
|---|---|
| FR1.1 | Step 2 |
| FR1.2 | Step 1、Step 3（build.test） |
| FR2.1 | Step 7（runner.test） |
| FR2.2 | Step 7、Step 9（browser/probe.spec） |
| FR3.1〜FR3.3 | Step 5、Step 9（probe） |
| FR4.1 | Step 6、Step 9（probe の fs 項目） |
| FR4.2 | Step 5、Step 9（probe の unix-stream-pair） |
| FR5.1、FR5.2 | Step 4、Step 9 |
| FR6.1、FR6.2 | Step 8、Step 9（measure.test） |
| FR7.1 | Step 4、Step 9（aube-1645） |
| NFR1 | Step 9 |
| NFR2 | Step 4、Step 10 |
| NFR3 | Step 8 |

## 注意点

- **Safari**：このマシンは Windows なので、Safari そのものでは試せない。Playwright の WebKit で代わりに確認し、実機の Safari での確認は macOS 環境が用意できたときに行う。FR2.2 の「Safari」をどう判定するかは、ユーザーの判断が必要。
- **規模**：Step 5 と Step 6（blink の C コードへの追加）が最も大きく、不確実でもある。通らない項目は NFR2 に従って記録し、ユーザーの判断を仰ぐ。

## Loop-back 1：ブラウザの断続的な失敗への限定対応

Step 1〜10 の完了記録は前回実装の履歴として保持する。今回の実行対象は Step 11〜16。ユーザーの Retry with fix はこの再計画の根拠であり、新しい Plan Approval 後に実行する。

ドキュメント根拠：`../build-and-test/browser-resume.txt` の末尾は 61 passed / 2 failed。`chromium-probe-resume-error.md` は PASS rayon 後の SIGSEGV（exit 139、faultaddr=0x80018320）、`webkit-probe-resume-error.md` は PASS tokio-timer 後の 600000 ms タイムアウトを保存している。Node.js 30/30 は同ステージの各 node-*-resume.txt が根拠。今回の計画作成ではテストを再実行していない。根本原因は未検証。

### Step 11：診断と回帰テストの実行準備（FR2.1、FR2.2、FR5.2、NFR2）

- [x] mise の Node.js 24 系の実体を glob で解決する。変更前の基準は保存済みの Node.js 30/30 とブラウザ 61/63 のログを利用し、同じソースへの全体再実行は重複させない。ソース差分または環境の変化が確認された場合だけ、既存 Node.js 5 ファイルとブラウザ 2 ファイルを逐次再実行し、基準値を別に保存する。
- [x] `tests/browser/probe.spec.mjs`、`tests/browser/aube-1645.spec.mjs` の診断収集を整える。成功・失敗・timeout のいずれでも stdout、全 stderr、pageerror、console、途中の表示、結果、ブラウザ版、実行条件を testInfo.outputPath / 添付へ保存する。aube の最終 transcript に置換される前の stderr も保持する。
- [x] 必要な診断フラグの受け渡しだけを `runtime/web/sessions.mjs`、`runtime/web/worker.mjs`、`runtime/web/app.mjs` に追加する。公開入力は許可リストで検証する。`playwright.config.mjs` は worker 1、逐次実行を保持し、診断成果物を固有の出力先に保存する。
- [x] 診断収集実装後に `tests/node/runner.test.mjs` と `tests/browser/probe.spec.mjs` に正常終了、非ゼロ終了、timeout の証拠保存を検証するテストを追加・実行する（test-after）。既存の unknown guest 検証も維持する。

### Step 12：既存欠陥の再現と原因の限定（FR3.2、FR4.2、FR5.2、NFR1、NFR2）

- [x] 全 probe を Chromium / WebKit で各 3 回、続いて必要な項目を個別に、逐次診断実行する。`--core-flag -s` 相当で clone、exit、mmap、munmap、futex、socketpair の tid と順序を採取する。ログが不足する場合だけ fork の該当経路へ限定した診断を追加する。
- [x] guest の TLS、解放範囲、faultaddr を記録と対応づける。tokio runtime の破棄、UnixStream の待ち・wake、rayon pool の終了、Mutex/Condvar を切り分ける。source inspection は候補を選ぶ根拠に留め、根本原因と扱わない。テスト設定の原因も観測なしに除外しない。
- [x] R-03 の futex 期限候補は SIGSEGV / 停止と独立に調べる。異なる bitset の待ち手への wake の反復でも、本来の絶対期限前に ETIMEDOUT が返らないかを小さい診断ゲストで観測する。再現しなければ断定・修正しない。
- [x] 再現できない場合は試行数・失敗率・採取ログと限界を記録し、修正成功を主張しない。既存欠陥の再現・診断は test-after の実装修正前の観測として扱う。

### Step 13：観測で限定した blink 経路の修正（FR3.2、FR4.2、FR5.2）

- [x] 診断で原因が特定されたスレッド / メモリ寿命、socketpair wait/wake の経路だけを fork の該当 C ファイルで修正する。`.vendor/blink` と `.vendor/blink-src` のどちらがビルド入力か確認し、差分を記録して意図しないコピーの混用を防ぐ。
- [x] R-03 が再現した場合だけ、futex の deadline を実時刻から再計算する限定修正を行う。wake の回数を経過時間と同一視しない。原因未特定の同期処理変更やついでの改善は含めない。
- [x] 各経路の修正直後に `guest/probe/src/` の選択可能な回帰項目と `tests/node/probe.test.mjs` / `tests/browser/probe.spec.mjs` のテストを作成・実行する。最低限、特定した欠陥を直接起こす 1 件の回帰テストを必須にする。正常系と少なくとも 2 件の境界 / 異常系を保持する。
- [x] 新規回帰項目の想定：反復する thread/TLS の生成・終了と mapping 寿命、socketpair の空待ちからの wake・バッファ境界・EOF、bitset 不一致 wake と一致 wake・期限満了。採用対象は診断で必要性が確認された経路に限定する。

### Step 14：ビルドと対象回帰の確認（FR1.1、FR1.2、FR5.1、FR5.2）

- [x] 必要なら `scripts/build-guests.sh` に回帰ゲストのビルドを追加し、その実装後に build テストを実行する。probe だけの再ビルドで済ませ、aube の入力・版は変えない。
- [x] `bash scripts/build-guests.sh probe` と `BLINK_SRC=.vendor/blink-src bash scripts/build-blink-wasm.sh` を逐次実行する（編集したコピーを BLINK_SRC に明示する）。通常の取得経路は checkout --force と clean を呼ぶため、ローカル修正に対して使わない。固定元 247610f、ローカル差分、生成物の識別情報を記録する。未公開のローカル修正は dirty として明示し、未存在の commit を blink.lock に書かない。
- [x] 最小回帰を Node.js と Chromium / Firefox / WebKit で各 3 回逐次実行し、全項目 PASS、exit 0、timeout なしを求める。修正前後の具体的なコマンド、ログ、テスト名を並べる。

### Step 15：既存スイートと再現性の維持（FR2〜FR7、NFR1、NFR3）

- [ ] unit-test-instructions.md の Node.js 5 ファイルすべて、browser probe / aube 両ファイルすべてを逐次実行する。続けて両ブラウザファイルを 3 回ずつ繰り返す。既存の 30 / 21 / 63 件に追加したテストを含め、失敗・skip 0 を求める。
- [x] 600 秒 probe / 840 秒 aube の上限、全 8 項目の合格、aube native 一致、worker 1 を緩和しない。retries で失敗を隠さない。行カバレッジ下限の追加はないが、Testing Contract の要件ごとの検証と既存 suite green は保持する。
- [ ] 計測 JSON と要件対応を再確認する。性能再計測が必要な場合は全テストが合格してから背景のビルド・コンテナ処理を止め、既存 4 コマンド / 4 環境 / 3 回の条件を維持する。Safari 実機は未検証のまま区別する。

### Step 16：結果と変更範囲の記録（NFR2、NFR3）

- [x] code-summary.md、traceability.json、source-manifest.json、docs/results/failures.md に今回の差分・対応要件・具体的な検証証拠・未検証事項を反映する。保存済みの失敗証拠と Loop-Back Log は保持する。
- [x] fork 公開更新は現時点の実行対象に含めず、差分と検証結果をレビューできる状態にしてから、親がユーザーの再承認を扱う。リポジトリ操作は jj のみ。

## 今回の変更範囲と影響

実装候補は blink の該当する待機 / スレッド / memory 経路、guest/probe の回帰項目、Node/Web ランナーの診断伝達、上記の正確なテストファイル・build 設定、結果資料に限る。DB、API の新機能、JIT、Rust コア、依存の更新は対象外。診断で別の根本原因が判明しこの範囲を超えるなら、その差分を計画へ明示して親へ返す。

推測：追加診断と限定修正 2〜8 時間、独立 futex 調査・修正 1〜2 時間、合計 3〜10 時間を仮置きする。原因未特定のため超過しうる。購入費用は既存ローカル環境利用で 0 円想定、モデル利用量とローカル計算を消費する。影響は待機・スレッド終了・メモリを共有する他ゲストにも及び得るため回帰リスク中〜高。修正成功は未検証。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c5db1280ba0333b655bcf97bdcaeaa0fd9cc0f50807a6ee879935b8aff3e17e0",
  "contract_sha256": "sha256:be5041ec2297dded1a31f328fae6a86555cf649f231018ea8168c9bb8dd811a5"
}
```


