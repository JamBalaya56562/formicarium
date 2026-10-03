# Component Inventory

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

健全性の評価は、developer のスキャン（読み取り）と今回の要件（pitchfork の追加）から見たもの。healthy＝旧スキャンで再利用候補と評価したもの（推測・未検証）、at-risk＝今回の intent で手を入れる必要がある見込み。

## 本体のコンポーネント

### core-descriptor
- 場所：`runtime/core.mjs`
- 責務：コアのビルド物の場所と、コアに渡す argv の組み立て。コアを知る唯一の場所
- 依存：`dist/blink/`（blink-core）
- 健全性：healthy

### guest-io
- 場所：`runtime/guest-io.mjs`
- 責務：仮想 FS へのゲストと入力の配置、出力の取得、手順の実行（`runGuest`／`runSession`）、手順の間のファイルの引き継ぎ（`snapshotFs`／`populateFs`）
- 依存：Emscripten の FS API のみ。ゲストには依存しない
- 健全性：healthy（引き継ぎの範囲は `persist` に限られる。`code-quality-assessment.md` を参照）

### session
- 場所：`runtime/session.mjs`
- 責務：手順ファイルの解釈と書き起こしの作成・正規化
- 依存：なし
- 健全性：旧指摘解消済み（tool/rm -rf/cat、引用符対応。session.mjs:36–99、実行は未検証）

### node-runtime
- 場所：`runtime/node/`（`run.mjs`、`host.mjs`、`worker.mjs`）
- 責務：CLI と `worker_threads` の Worker。ホストのファイルを `copyIn` で取り込む
- 依存：guest-io、session、core-descriptor
- 健全性：healthy

### web-runtime
- 場所：`runtime/web/`（`index.html`、`app.mjs`、`worker.mjs`、`sessions.mjs`、`coi-sw.js`）
- 責務：ページ、実行用 Worker、ゲストと手順の許可リスト、COOP/COEP の service worker
- 依存：guest-io、session、core-descriptor
- 健全性：registryへ集約済み、入口はregistry名に限定（web/worker.mjs:38–92、ソース観測）

### dev-server
- 場所：`scripts/serve.mjs`
- 責務：開発用の静的配信と COOP／COEP／CORP の付与
- 依存：Node.js のみ
- 健全性：healthy

## ビルド・検証のコンポーネント

### build-scripts
- 場所：`scripts/build-blink-wasm.sh`、`scripts/fetch-blink.sh`、`scripts/build-guests.sh`、`scripts/emscripten-env.sh`、`scripts/lib/container.sh`
- 責務：blink の取得と wasm 化、ゲストの static-musl ビルド、コンテナの実行
- 依存：`blink.lock`、コンテナ（wslc または Docker）、`emscripten/emsdk`、`rust:alpine`
- 健全性：pitchfork対応済み（build-guests.sh:19–22、実行は未検証）

### native-baseline
- 場所：`scripts/native-baseline.sh`
- 責務：busybox のコンテナ（`--network none`）でゲストを native に実行し、基準値の書き起こしを作る
- 依存：registry/session-infoが選ぶゲストと手順、dist/guests/ と fixtures/sessions/
- 健全性：session-info経由の選択に変更済み（native-baseline.sh:49–52、実行は未検証）

### test-suites
- 場所：`tests/node/`、`tests/browser/`
- 責務：ビルド物の確認、ランナーの単体・結合テスト、probe と aube の合格判定、計測の形式確認
- 依存：node-runtime、web-runtime、native-baseline の出力、`dist/`
- 健全性：healthy（結合テストが中心で、ビルド物がないと理由を示して失敗する）

## 外部・浅い読み取りのコンポーネント

### blink-core
- 場所：`blink.lock` → `.vendor/blink` → `dist/blink/`
- 責務：x86-64 の解釈実行と Linux のシステムコールのエミュレート。fork は upstream に対して 18 ファイル、+2016／−114
- 健全性：未評価（`dist/blink/build-info.json` のみ詳しく確認。fork のソースは浅い読み取り）

### probe-guests
- 場所：`guest/probe/`
- 責務：合格判定用のゲスト `probe`、`hello`、`exit3`
- 健全性：未評価（浅い読み取り）

### measurement
- 場所：`scripts/measure-aube.mjs`、`scripts/lib/timings.mjs`
- 責務：aube の所要時間の計測と記録の形式の確認
- 健全性：未評価（浅い読み取り。`tool` を渡さず既定の `aube` に頼っている点だけ確認）

## 今回の評価（2026-10-06）
既存 healthy/at-risk は旧pitchfork intentの評価であり、今回の動作保証ではない。今回の検証済み（ソース観測）は core-descriptor/guest-io/session/node-runtime/web-runtime/dev-server/build-scripts/native-baseline の構造のみ。npm 配布の健全性と実行結果は未検証。
session の旧at-risk理由（aube限定・引用符未対応）は解消済み。build-scripts はpitchforkを扱い、native-baseline はsession-info経由で選択する。web-runtime のURL入口はregistry名に限定される。test-suites 全体は検索のみで浅い範囲へ降格する。

### registry
- 場所：runtime/registry.mjs
- 責務：デモ/受入れのゲスト・環境変数・手順の所有とlookupSession。
- 依存：データ記述。web/sessionsとscripts/session-infoが利用する。
- 根拠：registry.mjs:12,28–81。検証済み（ソース観測）。npm製品APIへの採用は未決定。

### pitchfork-tests
- 場所：tests/node/pitchfork-basic.test.mjs、tests/browser/pitchfork-basic.spec.mjs、tests/shared/pitchfork-basic.mjs、tests/node/build.test.mjs。
- 責務：native書き起こし一致、daemon add/removeの設定反映、settings set/get、ビルドprovenanceの判定。
- 依存：node-runtime/web-runtime/native-baseline、生成物。
- 根拠：Node:51–74、browser:22–53、build:21–40,95–139。検証済み（テストソース観測）、実行は未検証。
