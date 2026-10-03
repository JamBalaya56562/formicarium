# terrarium への組み込み方の調査メモ（FR8.1）

intent `261005-pitchfork-on-blink` の調査メモです。terrarium（ツールごとに wasm にビルドして、ブラウザの端末で 1 つの CLI を動かす）
で、ツールごとのビルドの代わりに formicarium（x86-64 の static-musl バイナリをそのまま blink で動かす）を使う方法をまとめます。
組み込みそのものは行っていません（requirements.md の Out of Scope）。

根拠の種類は AGENTS.md に合わせて **検証済み / ドキュメント根拠 / 推測** と書きます。実測値は Build and Test で記入します。

## 1. terrarium での使い方の案

terrarium には入口が 3 つあります（terrarium の README、ドキュメント根拠）。リンク（`?ref=&run=&fixture=&cwd=&tool=`）、
`<terrarium-terminal>` 要素（`run()` で 1 コマンドずつ実行し、`code` と `output` を返す）、iframe（`postMessage` で
`terrarium:run` と `terrarium:exit` をやり取りする）です。formicarium を使う形として、次の 2 案を比べます。

| 観点 | 案 A：`runtime/` をライブラリとして読み込む | 案 B：formicarium のページを iframe で埋め込む |
|---|---|---|
| 形 | terrarium の `terminal.mjs`（または `<terrarium-terminal>`）が、ツールごとの `<tool>.js`/`<tool>.wasm` の代わりに `runtime/guest-io.mjs` の `runGuest`／`runSession` と `runtime/core.mjs` のコアを Worker で呼ぶ | terrarium のページに `runtime/web/index.html?session=...` を iframe で置き、結果（書き起こし）を受け取る |
| 端末の操作感 | terrarium の端末をそのまま使える。1 コマンドごとに `runGuest` を呼び、`persist` の中身を次へ渡す（今の `runSession` と同じ仕組み） | 今の formicarium のページには対話的な入力がない。`postMessage` で 1 コマンドずつ受け付ける口を新しく作る必要がある |
| 分離 | terrarium のページと同じ権限で動く（terrarium の要素と同じ扱い） | 別のオリジンに置けば分離できる。ただし COOP/COEP の下の iframe は `allow="cross-origin-isolated"` と、CORP か `credentialless`（Chromium のみ）が要る（terrarium の README、ドキュメント根拠） |
| 配布 | `runtime/` の 4 ファイル（`core.mjs`、`guest-io.mjs`、`session.mjs`、`registry.mjs`）と `dist/blink/`、ゲストのバイナリを terrarium の `web/` から配る | formicarium のページをそのまま配る。terrarium 側の変更は小さい |
| コアの置き換え（paludarium） | `runtime/core.mjs` の記述子を差し替えるだけで済む（ADR 0003、ドキュメント根拠） | 同じ。iframe の中だけが変わる |

推奨は **案 A** です（推測）。terrarium の価値は「端末でコマンドを打つと、そのツールが実際に出すものが見える」ことで、
その端末と `run()` の API を保ったまま実行部だけを差し替えられるからです。案 B は分離の利点がありますが、
対話の口を formicarium に作り直すことになり、`credentialless` が Chromium だけという制約も残ります。

## 2. terrarium 側で必要な変更

案 A の場合（推測。terrarium のコードは読んだだけで、変更も実行もしていない）：

- `web/tools.json`（ツールの一覧）に「実行方式」を足す。今の「ツールごとの wasm」と「formicarium のコアで x86-64 バイナリを動かす」を選べるようにする
- `web/terminal.mjs` の実行部を、実行方式で分ける。formicarium の方式では、Worker で `runGuest` を呼び、
  コマンドごとに `persist` のディレクトリ（`/work` と `/root`）の写しを次へ渡す
- 端末で打たれた 1 行を、formicarium の手順と同じ規則（`runtime/session.mjs` の `splitShellWords`）で分ける。
  `|` や `$` のように sh が別の意味に解釈する文字は、黙って違う動きをせずにエラーとして表示する
- `fixture`（`/work` に置くサンプル）は、terrarium の `fixtures/` をそのまま `runSession` の `entries` に写せる
- ビルドの CI（GitHub Actions）は、ツールごとの wasm ビルド（Rust の std と依存 crate へのパッチを含む）の代わりに、
  `x86_64-unknown-linux-musl` の static ビルドだけになる。terrarium の `scripts/build-pitchfork.sh` が当てている
  pitchfork 自身へのパッチ（`patches/tools/pitchfork-*.patch`）も要らなくなる（今回、pitchfork のソースは変えずに
  ビルドする。FR1.1）
- `ref`（`pr-<number>` などのビルドの選択）は、ゲストのバイナリの置き場所の選択に置き換わる。コア（`dist/blink/`）は全ツールで共通

## 3. ゲストを 1 つ足すのに要った変更（今回の実績）

pitchfork を足すのに変えた formicarium のファイルです。2 つ目以降のゲストのための作り替え（一覧の一元化、手順の文法の拡張）を含みます。

| 区分 | ファイル | 内容 | 次のゲストでも要るか |
|---|---|---|---|
| ビルド | `scripts/build-guests.sh` | 対象 `pitchfork` と取得元（`PITCHFORK_REPO`／`PITCHFORK_REF`）、static であることの確認。release ビルドが埋め込む web UI を、先に `dist/guests/aube` で `aube install --frozen-lockfile && aube run build` してから作る | 要る（対象を 1 つ足す。ツールごとのビルドの事情は個別に要る） |
| ビルド | `patches/pitchfork-2.29.0-musl-ioctl.patch`（新規） | musl の `ioctl` の型に合わせる 1 行（`as libc::c_ulong` → `as _`）。v2.29.0 は musl 向けにそのままではコンパイルできない。当てたパッチの sha256 と UI に使った node の版は `dist/guests/pitchfork.build-info` に記録する | ツールによる |
| 表 | `runtime/registry.mjs`（新規） | ゲスト・環境変数・手順の唯一の表 | 要る（1 行ずつ足す） |
| 手順 | `fixtures/sessions/pitchfork-basic.txt`、`fixtures/pitchfork-basic/` | terrarium から写した手順とサンプル | 要る |
| 基準値 | `fixtures/baseline/pitchfork-basic.native.txt` | `bash scripts/native-baseline.sh pitchfork-basic` が作る | 要る（スクリプトの変更は不要） |
| テスト | `tests/node/pitchfork-basic.test.mjs`、`tests/browser/pitchfork-basic.spec.mjs` | 書き起こしの一致と状態の引き継ぎ | 要る |
| 作り替え（初回だけ） | `runtime/session.mjs` | `cat` の手順、`sh -c` と同じ引数の分割、ツール名の受け取り | 不要 |
| 作り替え（初回だけ） | `runtime/guest-io.mjs` | `runSession` の `cat` のステップ | 不要 |
| 作り替え（初回だけ） | `runtime/web/sessions.mjs`、`runtime/web/worker.mjs` | 表から一覧を作る、手順ごとのツール名と `persist` | 不要 |
| 作り替え（初回だけ） | `scripts/native-baseline.sh`、`scripts/session-info.mjs`（新規）、`scripts/lib/node.sh`（新規） | 手順名を引数で受け取り、表から設定を得る。再現性の確認 | 不要 |

次のゲストからは、ビルドの対象・表の 1 行・fixture・基準値・テストの 5 か所で済む見込みです（推測。2 つ目のゲストで確かめる）。
blink の fork とコアの記述子（`runtime/core.mjs`）は、今回変えていません。8 コマンドは Node.js と 3 ブラウザのすべてで、
最初から native と一致しました（2026-10-06。FR7.1 の修正は不要でした）。

## 4. 制約

- **COOP/COEP**：コアは pthread（`SharedArrayBuffer`）を使うので、ページは cross-origin isolated でなければならない。
  ヘッダーを付けられない配信先では `runtime/web/coi-sw.js`（service worker）で付ける（README、ドキュメント根拠）。
  terrarium も同じ制約を持っており、`web/coi-serviceworker.js` がある（ドキュメント根拠）
- **ネットワークなし**：ブラウザ版のゲストにはネットワークがない。fork は inet の `socket()` を `EAFNOSUPPORT` で拒否する
  （NFR3、`docs/architecture.md`）。aube は更新の確認を `AUBE_NO_UPDATE_CHECK=1` で止めている。
  registry からの取得が要る操作（オンラインの `aube install` など）はできない
- **wasm のメモリ上限 1 GB**：`-sMAXIMUM_MEMORY=1GB`。WebKit がインスタンスごとに上限まで確保するため 4 GB から下げた。
  1 GB を超えるメモリを使うゲストは動かない（README、`tests/node/build.test.mjs` が固定）
- **手順の文法**：formicarium の手順は `<tool> ...`、`rm -rf <相対パス>`、`cat <相対パス>` の 3 つだけを受け付け、
  パイプ・リダイレクト・変数の展開などは拒否する。terrarium の端末で任意のシェルの構文を打てるようにするなら、
  sh そのもの（busybox など）をゲストとして動かすか、端末側で解釈を足す必要がある（推測）
- **状態の引き継ぎ**：コマンドごとにコアを起動し直し、`persist` のディレクトリの中身だけを次へ渡す。
  その外（例：`/tmp`）に書かれたものは消える。hard link は別々のファイルになり、mtime は引き継がない
  （`code-quality-assessment.md` の Q4、検証済み（読み取り））。pitchfork の書き込み先は計画の Step 4 で確かめる
- **デーモン**：pitchfork のスーパーバイザーや IPC は対象外（requirements.md の Out of Scope）。terrarium の pitchfork も
  スーパーバイザーの要らないコマンドだけを対象にしている（`scripts/build-pitchfork.sh` のコメント、ドキュメント根拠）
- **起動の固定費**：コマンドごとに blink を起動し直すので、1 コマンドあたり 0.3〜0.5 秒の固定費がかかる（README、ドキュメント根拠）

## 5. 置き換えの判断材料として測った値

2026-10-06 に、このノート PC で測った値です。このマシンは同じ計算でも速さが最大 2.4 倍揺れるので（AGENTS.md）、比較の目安にとどめます。

### サイズ

| 対象 | formicarium | terrarium（ツールごとの wasm） |
|---|---|---|
| コア（`dist/blink/blink.wasm` ＋ `blink.mjs`） | 455,584 ＋ 132,512 バイト（約 0.6 MB。全ゲストで共通） | なし（ツールごとに含む） |
| pitchfork（`dist/guests/pitchfork`、x86-64 static-musl、release） | 40,223,816 バイト（約 40 MB） | 未計測（terrarium 側のビルド物は今回測っていない） |
| aube（`dist/guests/aube`） | 31,471,776 バイト（約 31 MB） | 未計測（同上） |

### 手順ごとの実行時間（pitchfork-basic）

Node.js は `tests/node/pitchfork-basic.test.mjs` を 3 回実行したときの `stepMs`（コアの起動を含む、各ステップの実時間）です。値は 3 回の最小〜最大です。

| コマンド | Node.js（3 回） |
|---|---|
| `pitchfork --version` | 2.0〜4.6 秒 |
| `pitchfork daemons` | 1.6〜8.5 秒 |
| `pitchfork daemons add db --run "postgres -D data"` | 2.0〜5.4 秒 |
| `pitchfork daemons remove worker` | 2.5〜3.8 秒 |
| `cat pitchfork.toml`（JS 側。コアを起動しない） | 0 秒 |
| `pitchfork status api` | 2.4〜3.1 秒 |
| `pitchfork settings set general.interval 5s` | 4.3〜10.1 秒 |
| `pitchfork settings get general.interval` | 2.3〜4.7 秒 |
| 合計 | 24.9〜32.7 秒 |

ブラウザは、Playwright のテスト 1 件（ページの読み込みと判定を含む）の時間を 3 回ずつ測りました。コマンドごとの内訳は、テストの注釈 `elapsed` に残ります。

| ブラウザ | 3 回のテスト時間 |
|---|---|
| Chromium | 28.0〜34.3 秒（29.0、28.0、34.3） |
| Firefox | 51.2 秒〜3.1 分（1.3 分、51.2 秒、3.1 分） |
| WebKit | 46.8 秒〜2.2 分（2.2 分、1.0 分、46.8 秒） |

テストの時間の上限は、上の最大値の 3 倍を 60 秒単位で切り上げて決めました（計画の Step 11・12、NFR2）。Node.js は 120 秒、ブラウザは 600 秒です（`tests/shared/pitchfork-basic.mjs`）。

## 6. 未解決の事項

- terrarium のツールごとの wasm のサイズと実行時間は、今回測っていない。どちらが勝つかは未検証
- pitchfork v2.29.0 は musl 向けにそのままではコンパイルできず、型だけを直す 1 行のパッチ
  （`patches/pitchfork-2.29.0-musl-ioctl.patch`）を当てた。上流に直してもらえるかは未確認
- terrarium の端末で、手順の文法の外（パイプ、リダイレクト、変数）を打たれたときの扱い（4 節）。
  エラーにするか、sh をゲストとして動かすかは決めていない
- 実機の Safari（macOS）では確かめていない（WebKit で代用。既存の未解決事項と同じ）
- 組み込みの API：案 A の場合、`runtime/` を npm パッケージとして切り出すか、terrarium に写すか
