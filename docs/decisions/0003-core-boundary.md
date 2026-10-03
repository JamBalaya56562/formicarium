# 0003. コアは「wasm 1 つ＋起動用の JS」という境界でだけ扱う

- 状態：採用（2026-10-04）
- 決めた人：コード生成の計画（ユーザー承認済み）

## Context（背景）

コアは将来 paludarium に置き換える（[0001](0001-blink-fork.md)）。置き換えのたびに、ブラウザ側や Node.js 側の実行環境を作り直したくない。

## Decision（決定）

コアは Emscripten の MODULARIZE 形式（ES モジュールの既定エクスポートがファクトリ）の wasm モジュール 1 つとして扱う。
コア固有の知識（ビルド物の場所、コマンドラインの組み立て）は `runtime/core.mjs` の記述子だけに置く。
入出力の共通部、Node.js とブラウザの実行環境は、Emscripten の FS API だけに依存する。

## Consequences（結果）

- 置き換えは、`runtime/core.mjs` に記述子を足し、`dist/` にビルド物を置けば済む。
- 置き換え先のコアも、同じ形式（MODULARIZE、FS API、終了コードの扱い）に合わせる必要がある。
- この PoC のテスト一式を、置き換え先の受け入れ条件として使える。

## Alternatives Rejected（退けた案）

- **blink の API に合わせて実行環境を書く**：置き換えのたびに実行環境を作り直すことになる。

## 参照

`runtime/core.mjs`、`docs/architecture.md`
