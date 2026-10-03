# Business Overview

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

## 目的

formicarium は、x86-64 Linux のバイナリ（static-musl。pitchfork は承認済み musl ioctl 型の1行パッチ例外あり）を、カーネルを起動せずに Node.js とブラウザ（Chromium・Firefox・WebKit）で動かす PoC である。エミュレータのコアは jart/blink の fork を Emscripten で wasm にしたもの（インタプリタのみ）。根拠：`docs/architecture.md`、`package.json` の `description`（検証済み（読み取り））。

将来はコアを paludarium（Rust 版 blink、別リポジトリ）に置き換える構想があり、コアとの境界を `runtime/core.mjs` の記述子に閉じ込めている（`docs/architecture.md`、ADR 0003）。

## 主な機能

- 単体のゲストの実行：CLI（`runtime/node/run.mjs`）またはブラウザのページ（`?guest=<name>`）で 1 つのバイナリを動かし、stdout・stderr・終了コードを返す
- 手順（session）の実行：`fixtures/sessions/*.txt` の `$ <command>` を 1 行ずつ、手順ごとに新しい blink のインスタンスで実行し、native と同じ形式の書き起こし（transcript）を作る
- native との一致の判定：コンテナで native に実行した基準値（`fixtures/baseline/*.native.txt`）と、改行と行末の空白だけをそろえて比べる
- 計測：aube の install の所要時間を記録する（`scripts/measure-aube.mjs`。浅い読み取りのみ）

詳しい API は `api-documentation.md`、構成要素の一覧は `component-inventory.md` を参照。

## 業務上の文脈と現在の対象

- 合格判定用のゲスト `probe`（スレッド、futex、ページフォールト、madvise などの確認）と、実アプリの例として aube v2.6.1 の手順 `aube-1645` が動く（2026-10-05 の記録で Node.js 41/41、ブラウザ 33/33。未検証：今回は実行していない）
- 旧 intent（`261005-pitchfork-on-blink`）は、jdx/pitchfork v2.29.0 を同じ方式でビルドし、terrarium の `pitchfork-basic.txt` と同じスーパーバイザー不要の 8 コマンドを native と一致させることが目的。現在の作りが aube に寄っている箇所は `code-quality-assessment.md` の「intent に関わる所見」にまとめた

## 今回の対象（2026-10-06）
ドキュメント根拠：現在の intent は `261006-npm-terrarium-release`。JS API・Worker・blink wasm・型・ライセンス・ビルド情報を npm へ整備し、ゲスト/fixture は terrarium の ref 別配布へ移す意図が aidlc-state.md に記録されている。公開対象確認、RC の受入れ後 stable、Trusted Publishing、Rust crate/JSR・ネットワーク・デーモン・汎用対話CLI・C fork JIT の対象外も同記録にある。
検証済み（ソース観測）：package.json は formicarium 0.0.0/private:true で公開設定は未整備。runtime/registry.mjs:28–67 は5ゲスト（pitchfork を含む）・2手順を持つ。pitchfork の受入れ判定の存在は tests/node/pitchfork-basic.test.mjs:51–74 で確認。実行結果は今回未検証。
terrarium 自体の組込み状況と npm 公開動作は未検証。設計案は architecture.md、API の現状は api-documentation.md を参照。
