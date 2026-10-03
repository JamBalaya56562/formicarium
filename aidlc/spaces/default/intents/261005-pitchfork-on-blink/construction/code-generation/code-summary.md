# コード生成のまとめ：pitchfork を formicarium で動かす

## 作成・変更したファイル

一覧は `source-manifest.json`（27 件）にあります。主なものは次のとおりです。

| 区分 | ファイル | 内容 | 要件 |
|---|---|---|---|
| ビルド | `scripts/build-guests.sh` | 対象 `pitchfork`、web UI の事前ビルド、musl 向けパッチの適用、全ゲストの static 確認 | FR1.1、FR1.2、NFR3 |
| ビルド | `patches/pitchfork-2.29.0-musl-ioctl.patch`（新規） | `lifecycle.rs:1219` の型を合わせる 1 行 | FR1.1 |
| 表 | `runtime/registry.mjs`（新規） | ゲスト・環境変数・手順の唯一の表 | FR4.1 |
| 手順 | `runtime/session.mjs`、`runtime/guest-io.mjs` | `splitShellWords`、`cat` の手順と実行 | FR3.1〜FR3.3 |
| ブラウザ | `runtime/web/sessions.mjs`、`runtime/web/worker.mjs` | 表から一覧を作る。手順ごとのツール名と `persist` | FR4.1、FR4.2 |
| 基準値 | `scripts/native-baseline.sh`、`scripts/session-info.mjs`、`scripts/lib/node.sh` | 手順名を受け取り、表から設定を得る。`--check-reproducible` | FR5.1 |
| 調査 | `scripts/pitchfork-probe-paths.sh` | 書き込み先と `status api` を native で確かめる（Step 4） | 前提 2 件 |
| fixture | `fixtures/sessions/pitchfork-basic.txt`、`fixtures/pitchfork-basic/app/pitchfork.toml`、`fixtures/baseline/pitchfork-basic.native.txt` | 手順・サンプル・基準値 | FR2.1、FR5.1 |
| テスト | `tests/node/session.test.mjs`、`tests/node/pitchfork-basic.test.mjs`、`tests/browser/pitchfork-basic.spec.mjs`、`tests/shared/pitchfork-basic.mjs` ほか | 下の「テスト」を参照 | FR1〜FR6、NFR1〜NFR3 |
| 文書 | `docs/terrarium-integration.md`、`README.md`、`AGENTS.md` | 調査メモとコマンドの追記 | FR8.1 |

## 主な実装上の決定

- **ゲストと手順の表を `runtime/registry.mjs` 1 か所にまとめた。** シェルの `native-baseline.sh` は `scripts/session-info.mjs` を通して表を読む。`build-guests.sh` のビルド手順はシェルに残した。代わりに、表のゲストがすべてビルドの対象に含まれることを `tests/node/runner.test.mjs` で確かめる（計画の Step 8 のとおり）
- **`splitShellWords` は計画より少し厳しい。** 計画のメタ文字に加えて、次も拒否する。どれも sh が分割以外の意味に解釈する文字で、native との食い違いを防ぐ目的に沿っている
  - 引用符の外の `[`、`(`、`)`
  - 語の先頭の `#` と `~`
  - 二重引用符の中のエスケープしていない `$` と `` ` ``
- **`cat` のステップ**は、引き継いだ通常のファイルだけを読む。symlink・ディレクトリ・存在しないファイル・`persist` の外は Error にする。コアは起動しない
- **時間の上限**（計画の Step 11・12、NFR2）は、実測の最大値の 3 倍を 60 秒単位で切り上げた値にした（`tests/shared/pitchfork-basic.mjs`）
  - Node.js は、3 回の実測が 24.9・26.9・32.7 秒。98.1 秒を切り上げて **120 秒**
  - ブラウザは、3 ブラウザ × 3 回の最大が Firefox の 3.1 分（約 186 秒）。558 秒を切り上げて **600 秒**
  - 既存の上限（probe 600 秒、ブラウザの aube 840 秒、workers 1、再試行なし、wasm 1 GB）は変えていない

## 前提 2 件の確認（計画の Step 4）

`bash scripts/pitchfork-probe-paths.sh` で、busybox のコンテナ（ネットワークなし）を使って 8 コマンドを native に実行した（2026-10-06、検証済み）。

- **書き込み先**：`/work/app/pitchfork.toml` と `/root/.local/state/pitchfork/logs/pitchfork/pitchfork.log` に書く。どちらも `persist`（`/work` と `/root`）の中にある。範囲の外は `/tmp/fslock/<hash>` のロックファイルだけで、毎回作り直されるので引き継ぐ必要はない。`persist` は `['/work', '/root']`、環境変数は空のままにした
- **`pitchfork status api`**：スーパーバイザーがなくても stdout が `Name: app/api` と `Status: available`、終了コードは 0、stderr は空だった。コマンドのあとに残るプロセスもない

## テスト結果（すべて 2026-10-06、このセッションで実行）

| 対象 | コマンド | 結果 |
|---|---|---|
| 変更前の基準（Step 1） | Node.js の既存スイート／ブラウザの既存スイート | 41/41 合格（86 秒）／33/33 合格（7.0 分） |
| 手順の解釈（Step 7） | `node --test tests/node/session.test.mjs` | 8/8 合格 |
| 表と入口の検証（Step 9） | `node --test tests/node/runner.test.mjs` | 15/15 合格 |
| ビルド（Step 3） | `node --test tests/node/build.test.mjs` | 8/8 合格 |
| 基準値（Step 10） | `bash scripts/native-baseline.sh pitchfork-basic --check-reproducible` | 2 回の結果が一致し、基準値を作成 |
| 基準値（Step 10） | `bash scripts/native-baseline.sh aube-1645 --check-reproducible` | 2 回の結果が一致し、既存の基準値から差分なし（`jj diff --stat`） |
| Node.js（Step 11） | `node --test tests/node/pitchfork-basic.test.mjs` を 3 回 | 3 回とも 3/3 合格 |
| ブラウザ（Step 12） | `npx playwright test tests/browser/pitchfork-basic.spec.mjs --repeat-each=3` | 9/9 合格（Chromium・Firefox・WebKit × 3 回、13.6 分） |
| 回帰（Step 13） | Node.js の既存スイートのコマンド | 50/50 合格（変更前の 41 件と、build・runner に追加した 9 件） |
| 回帰（Step 13） | `session.test.mjs` ＋ `pitchfork-basic.test.mjs` | 11/11 合格 |
| 回帰（Step 13） | ブラウザ：probe ＋ aube-1645 ＋ pitchfork-basic | 36/36 合格（変更前の 33 件と、pitchfork 3 件。10.0 分） |

8 コマンドは Node.js と 3 ブラウザのすべてで、最初から native の基準値と一致した。FR7 の修正（blink の fork や formicarium の修正）は不要だった。

## 計画からのずれ

- **pitchfork のソースに 1 行のパッチを当てた**（人間の判断、2026-10-06）。v2.29.0 は musl 向けにそのままではコンパイルできない（`src/supervisor/lifecycle.rs:1219` の `libc::ioctl` に渡す値が `c_ulong`、musl の request は `c_int`）。そのため、型だけを `as _` に直すパッチを `patches/` に記録して当てた。動作は変わらない。要件の制約「pitchfork のソースは変更しない」は、この 1 行だけ緩めた。公式の release に musl 版はない（GitHub API の asset 一覧で確認。linux は gnu だけ）
- **release ビルドの前に web UI をビルドする手順を足した**（人間の判断）。pitchfork の `build.rs` は、`ui/dist/index.html` がないと release で止まる。pitchfork の `mise.toml` の `build:ui` と同じ `aube install --frozen-lockfile && aube run build` を、`dist/guests/aube` を使ってコンテナで実行する。ビルドの時間は 35 分 38 秒だった
- **コンテナの実行環境**：途中で wslc が `E_FAIL` で動かなくなったので、基準値の作成と書き込み先の調査は `FORMICARIUM_CONTAINER=docker` で Docker を使った。イメージ（busybox）とネットワークなしの条件は同じで、aube の基準値は作り直しても差分がなかった
- **ビルドとテストの実行は conductor が行った**。AGENTS.md のとおり、委任したエージェントは mise の node などの動的な実行パスをガードに拒否されるため。developer はコード・テスト・文書を書くところまでを担当し、層ごとの実行は計画の順番どおりに conductor が行った
- **回帰の件数**：Node.js の既存スイートのコマンドは 41 件から 50 件になった（build と runner のテストに追加したため）。変更前の 41 件はすべて合格している

## 未解決の事項

- terrarium のツールごとの wasm のサイズと実行時間は測っていない（`docs/terrarium-integration.md` の 5 節と 6 節）
- 上のパッチを上流に直してもらえるかは未確認
