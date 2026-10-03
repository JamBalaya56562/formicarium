# ビルド手順：pitchfork を formicarium で動かす

入力：`construction/code-generation/code-generation-plan.md`、`construction/code-generation/unit-test-instructions.md`、`construction/code-generation/code-summary.md`。

## 前提とツール

- Windows 11 ＋ Git Bash。node は mise が管理しており PATH にないので、実体を直接使う：`ls -d ~/AppData/Local/mise/installs/node/24.*/node.exe | sort -V | tail -1`（`mise.toml` は `node = "24"`）
- Playwright は `node_modules/@playwright/test/cli.js` を上の node で実行する（`npx` を使う場合は、node のディレクトリを PATH の先頭に足す）
- コンテナ：wslc を優先し、使えなければ Docker（`scripts/lib/container.sh`）。wslc が `E_FAIL` で動かないときは `export FORMICARIUM_CONTAINER=docker` で Docker に固定する（project.md の Corrections）
- ネットワーク：pitchfork と web UI の依存を取得するビルドだけがネットワークを使う。基準値の作成と書き込み先の調査は `--network none` で行う

## 依存の取得と環境

| 項目 | 内容 |
|---|---|
| npm の依存 | `@playwright/test`（`package.json`）。取得済みの `node_modules/` を使う |
| コア | `dist/blink/blink.mjs`、`dist/blink/blink.wasm`。今回は変えていないので再ビルドしない（`bash scripts/build-blink-wasm.sh`） |
| ゲスト | `dist/guests/{probe,hello,exit3,aube,pitchfork}`。ソースが変わっていなければ再ビルドしない（project.md の Corrections） |
| 環境変数 | 必須のものはない。`FORMICARIUM_CONTAINER`（コンテナの選択）、`PITCHFORK_REPO`／`PITCHFORK_REF`（既定は公式の `v2.29.0`）は任意 |

## ビルドのコマンド

| 対象 | コマンド | 時間の目安 | 再ビルドする条件 |
|---|---|---|---|
| pitchfork | `bash scripts/build-guests.sh pitchfork` | 初回 35 分 38 秒（2026-10-06、Docker のキャッシュなし） | `PITCHFORK_REF`、`patches/pitchfork-2.29.0-musl-ioctl.patch`、ビルド手順のどれかが変わったとき |
| aube | `bash scripts/build-guests.sh aube` | 1 時間以上 | ソースが変わったときだけ（今回は再ビルドしない） |
| probe 系 | `bash scripts/build-guests.sh probe` | 数分 | `guest/probe/` が変わったとき（今回は変わっていない） |
| 基準値 | `bash scripts/native-baseline.sh pitchfork-basic --check-reproducible`、`bash scripts/native-baseline.sh aube-1645 --check-reproducible` | それぞれ 1 分前後 | fixture・ゲスト・手順の規則が変わったとき |

pitchfork のビルドは次の順で進む（`scripts/build-guests.sh` の `build_pitchfork`）。

1. 公式の `https://github.com/jdx/pitchfork.git` からタグ `v2.29.0` を浅く取得し、コミットを `dist/guests/pitchfork.commit` に記録する
2. `ui/` で `aube install --frozen-lockfile && aube run build` を実行する（release ビルドは web UI を埋め込むため。aube は `dist/guests/aube`）
3. 型を合わせる 1 行のパッチ `patches/pitchfork-2.29.0-musl-ioctl.patch` を、未適用のときだけ当てる
4. `cargo build --release --locked --target x86_64-unknown-linux-musl --bin pitchfork`
5. 全ゲストについて、x86-64 の ELF であることと、static であること（`PT_INTERP` がない）を確かめる

## ビルドの確認

- `node --test tests/node/build.test.mjs`：全ゲストの ELF と static の判定、`pitchfork.commit` が 40 桁の 16 進数であること
- `bash scripts/native-baseline.sh <session> --check-reproducible`：2 回の書き起こしが一致すること（一致しなければ基準値を書かずに終了コード 1）

## よくある問題

| 症状 | 原因 | 対処 |
|---|---|---|
| `the web UI has not been built: ui/dist/index.html is missing` | release ビルドの前に UI がない | ビルド手順の 2 が動いているか確かめる。`dist/guests/aube` がないと止まる |
| `libc::ioctl` の `expected i32, found u64` | musl の `ioctl` の型 | パッチの適用（手順 3）が動いているか確かめる |
| `コンテナの実行環境（wslc または docker）が見つかりません` | wslc が `E_FAIL`、または Docker の起動直後 | `export FORMICARIUM_CONTAINER=docker`、Docker Desktop の起動を待つ |
| `tar: This does not look like a tar archive` | コンテナ内のスクリプトが失敗した | その上の出力が本当の原因。`set -o pipefail` を付けて実行すると終了コードが伝わる |
