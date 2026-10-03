# ビルド手順：blink を wasm 上で動かす PoC

上流の成果物：`construction/code-generation/code-generation-plan.md`、`construction/code-generation/unit-test-instructions.md`、`construction/code-generation/code-summary.md`。プロジェクトの `README.md`（「前提ツール」「ビルド」）と同じ内容を、ビルドの確認の観点でまとめる。

## 依存関係のインストール

- Node.js 24：`mise.toml` で固定している。mise のツールは非対話シェルの PATH に載らないため、`~/AppData/Local/mise/installs/node/24*/node.exe` を直接呼ぶか、そのディレクトリを PATH の先頭に足す。
- npm の依存：`npm install`（`@playwright/test`）
- Playwright のブラウザ：`npx playwright install chromium firefox webkit`
- コンテナ：Docker Desktop（wslc はこのマシンでは ERROR_SHARING_VIOLATION で動かないため、`docs/results/failures.md` の U-3 を参照）。`FORMICARIUM_CONTAINER` でどちらを使うか指定できる。

## 環境設定

- 環境変数は必須ではない。任意で使えるもの：
  - `FORMICARIUM_CONTAINER`：`docker` または `wslc`
  - `FORMICARIUM_BUILD=host`：ローカルの emsdk でビルドする（このマシンでは未検証。U-4）
  - `EMSDK`：emsdk の場所（既定は `~/AppData/Local/emsdk`）
- 秘密情報は使わない。`gh` の認証は fork の作成と push のときだけ必要で、ビルドには不要。

## ビルドコマンド

```bash
bash scripts/build-blink-wasm.sh   # .vendor/blink を blink.lock のコミットで取得し、dist/blink/{blink.mjs,blink.wasm,build-info.json} を作る（コンテナ emscripten/emsdk:6.0.10）
bash scripts/build-guests.sh       # dist/guests/{probe,hello,exit3,aube} を作る（aube v2.6.1 は 1 時間以上かかる）
bash scripts/native-baseline.sh    # fixtures/baseline/aube-1645.native.txt を作る
```

## ビルドの確認

- `node --test tests/node/build.test.mjs`：wasm と mjs が生成されていること、取得したコミットが `blink.lock` と一致することを確認する。
- `dist/blink/build-info.json` の `blinkCommit` が `blink.lock` の `commit` と一致し、`blinkSourceDirty` が `false` であること。

## fork を修正するとき（Loop-back 1 で使った手順）

- 未公開の修正は `.vendor/blink-src` で行い、`BLINK_SRC=.vendor/blink-src bash scripts/build-blink-wasm.sh` でビルドする。この場合 `blinkSourceDirty` は `true` になり、`build.test.mjs` の 1 件は意図どおり失敗する。通常の取得経路（`fetch-blink.sh`）は `checkout --force` と clean を呼ぶので、ローカル修正には使わない。
- 公開するときは `.vendor/blink-src` で jj を使ってコミットし、`formicarium-wasm` に push してから、`blink.lock` の `commit=` を更新する。その後、`bash scripts/fetch-blink.sh` と `bash scripts/build-blink-wasm.sh` でクリーンビルドする。
- このマシンでは HTTPS 用の git の認証情報と SSH の鍵が非対話シェルから使えない。push には、gh のログイン情報をその場限りの認証ヘルパーとして渡す（`GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0= GIT_CONFIG_KEY_1=credential.helper GIT_CONFIG_VALUE_1="!'<gh.exe のパス>' auth git-credential" jj git push --bookmark formicarium-wasm`）。設定ファイルは変えない。

## よくあるビルドの問題

- `emconfigure ./configure` が WinError 193 で止まる：Windows の emsdk では blink の configure を実行できない。既定のコンテナビルドを使う。
- コンテナからプロジェクトのパスをマウントできない：Docker Desktop の共有設定にないパスは使えない。スクリプトは tar のストリームで受け渡すので、マウントは不要。
- wslc が ERROR_SHARING_VIOLATION で失敗する：`FORMICARIUM_CONTAINER=docker` を使う。
- 並行して重い処理があると、ビルドと計測が大きく遅くなる。計測の前にはほかの処理を止める。
