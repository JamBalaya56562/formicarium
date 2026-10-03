# Technology Stack

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

## 言語と実行環境

| 技術 | 版 | 用途 | 根拠 |
|---|---|---|---|
| JavaScript（ESM） | — | ランナー、テスト、スクリプト | `package.json` の `"type": "module"` |
| Node.js | 24（`engines >=24`） | 実行環境、`node:test`、`worker_threads` | `mise.toml`、`package.json` |
| Rust | stable ＋ `x86_64-unknown-linux-musl` | ゲスト（probe、aube、今回の pitchfork） | `mise.toml`、`guest/probe/Cargo.toml` |
| C | — | blink の fork | `blink.lock` |
| bash（POSIX sh） | — | ビルドと基準値のスクリプト | `scripts/*.sh` |

## フレームワークとツール

| 技術 | 版 | 用途 |
|---|---|---|
| Emscripten | emcc 6.0.10（`dist/blink/build-info.json`） | blink の wasm 化。MEMFS、pthread（`PROXY_TO_PTHREAD`、プール 16）、`MODULARIZE`／`EXPORT_ES6` |
| blink（fork） | `aletheia-works/blink` `formicarium-wasm` @ `4b5c67d5…`（upstream `jart/blink` @ `f006a4fc…`） | x86-64 Linux のユーザーモードエミュレータ（`--disable-jit`） |
| @playwright/test | `^1.55.0` | ブラウザのテスト（Chromium・Firefox・WebKit、workers 1） |
| cmake / ninja | 4 / 1 | `mise.toml` の開発ツール |
| コンテナ | wslc を優先、なければ Docker | ビルドと native の基準値 |
| コンテナのイメージ | `rust:alpine`、`emscripten/emsdk:<ローカルの emsdk と同じ版>`、`busybox:latest` | ゲストのビルド、コアのビルド、native 実行 |

## 実行時の前提

- ブラウザでは `crossOriginIsolated`（COOP/COEP）が必要（SharedArrayBuffer と pthread のため）
- wasm のメモリは初期 128 MB、上限 1 GB（ADR 0010。`tests/node/build.test.mjs` で固定）
- ゲストのネットワークはない（inet の `socket()` は `EAFNOSUPPORT`、ADR 0007）
- 依存関係の詳細は `dependencies.md` を参照

## 今回の版確認（2026-10-06）
検証済み（ソース観測）：package.jsonのdevDependencyは @playwright/test ^1.55.0のみ、runtime npm dependencies未定義。実インストール版は未検証。Node >=24、mise node=24/rust=stable+musl/cmake=4/ninja=1。
blink.lock は fork formicarium-wasm @4b5c67d518b0504e13ccde7ba7823f9b6e467c4c、upstream @f006a4fc6f9b8de9272504fdff0dbbe5ce5dc580。aube既定v2.6.1、pitchfork既定v2.29.0（build-guests.sh:19–22,77–128）。
旧表のemcc 6.0.10は過去生成物の記録で、今回のビルド版の観測ではない。build-blink-wasm.sh:74–79 はlocal版を採り未検出時6.0.10を使う。コンテナはdigest固定されていない。
ドキュメント根拠：実機Safari未検証、性能は前面表示した1台、private file-backed MADV_DONTNEEDの復元制約を維持。
