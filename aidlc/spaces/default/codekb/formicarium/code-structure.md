# Code Structure

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

## ディレクトリ構成

| パス | 分類 | 内容 |
|---|---|---|
| `runtime/` | 本体（JS、ESM） | `core.mjs`（コアの記述子）、`guest-io.mjs`（入出力の共通部）、`session.mjs`（手順ファイルと書き起こし） |
| `runtime/node/` | 本体（Node.js） | `run.mjs`（CLI）、`host.mjs`（`runInWorker`）、`worker.mjs`（`worker_threads` の Worker） |
| `runtime/web/` | 本体（ブラウザ） | `index.html`、`app.mjs`（ページ）、`worker.mjs`（実行用 Worker）、`sessions.mjs`（許可リスト）、`coi-sw.js`（COOP/COEP の service worker） |
| `scripts/` | ビルド・開発用 | `build-blink-wasm.sh`、`fetch-blink.sh`、`build-guests.sh`、`native-baseline.sh`、`emscripten-env.sh`、`serve.mjs`、`measure-aube.mjs`、`lib/container.sh`、`lib/timings.mjs` |
| `guest/probe/` | ゲスト（Rust） | 合格判定用の `probe`、`hello`、`exit3`（浅い読み取りのみ） |
| `tests/node/`、`tests/browser/` | テスト | `node:test` と Playwright の結合テスト |
| `tests/fixtures/` | テスト用データ | 計測 JSON のサンプル |
| `fixtures/` | 入力と基準値 | `sessions/aube-1645.txt`、`baseline/aube-1645.native.txt`、`aube-local-deps/` |
| `patches/` | 記録用 | fork に取り込み済みのパッチの写し |
| `docs/` | 文書 | `architecture.md`、`decisions/`（ADR 12 件）、`results/`、`nfr-summary.md`、`licenses.md` |
| `blink.lock`、`mise.toml`、`package.json`、`playwright.config.mjs` | 設定 | コアの取得元、開発ツール、npm スクリプト、ブラウザのテスト設定 |
| `dist/`、`.vendor/`、`test-results/` | 生成物（gitignore） | ビルド物、blink の取得先、過去のテスト結果 |
| `sh/` | 不明 | 空のディレクトリ |

## コードのパターン

- **ESM と純粋関数中心**：`session.mjs` の 5 関数は副作用のない変換。`guest-io.mjs` は Emscripten の FS API だけに依存する（検証済み（読み取り））
- **Worker への委譲**：Node.js でもブラウザでも、コアの実行はメインスレッドから Worker に移し、`stdout`／`stderr`／`done`／`error` のメッセージで結果を返す
- **許可リストでの入口の検証**：ブラウザの URL パラメータは `sessions.mjs` の `NAME` 正規表現と `GUESTS`／`SESSIONS` で照合してから使う
- **ファイル先頭の目的コメント**：各ソースの先頭に目的と FR 番号を日本語で書いている
- **コンテナでのビルド**：`scripts/lib/container.sh` の `container_run` が wslc を優先し、使えなければ Docker を使う。入出力は tar のストリーム

## 命名と規約

- JS は camelCase、ファイルは kebab-case または短い単語（`guest-io.mjs`）
- 手順の名前は `<ゲスト>-<課題番号>`（`aube-1645`）。テストも `tests/node/aube-1645.test.mjs`、`tests/browser/aube-1645.spec.mjs` と対応させている
- フォーマッタとリンターの設定はない（`code-quality-assessment.md` を参照）

## 現行構成の更新（2026-10-06）
検証済み（ソース観測）：runtime/ は13ファイル。runtime/registry.mjs が NAME/GUESTS/SESSIONS/lookupSession を集約し、web/sessions.mjs が URL 入力を検証する。session.mjs は splitShellWords を含む5関数で、引用符とcatを扱う（36–99,136–194）。
scripts/session-info.mjs がregistry設定をshellへ渡し、pitchfork-probe-paths.sh はnativeで書込み先を調べる。scripts/lib/node.sh はUI等のNode実行を支える。tests/shared/pitchfork-basic.mjs と Node/browser の受入れテストが追加済み。
package.json に exports/main/types/files/publishConfig や pack/publish/release scripts はなく、runtime inventory に .d.ts はない。npm 配布のためのファイル分割・配置は後続設計事項（推測・未検証）。
guest/fixtures/patches/dist/vendor は一覧確認のみ。内容を今回再検証していない。
