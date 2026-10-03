# 調査範囲の選択

## Q1. 既存コードの調査範囲

検証済み: `aidlc engine workspace codekb-scope-diff --repo formicarium` は `UNVERIFIED` を返した。既存資料は `261005-pitchfork-on-blink` で作成され、runtime/、ビルド・取得・基準値スクリプト、tests/node/、tests/browser/、aube の fixture、package.json、mise.toml、blink.lock、playwright.config.mjs、.gitignore、docs/architecture.md を分析している。現在のツリーの指紋を計算できず、鮮度は未検証。

今回は npm パッケージ化・配布と terrarium への統合が対象。全体を再調査するか、今回の関連箇所を調査して既存資料へ統合するかを選択する。

A. Full rescan — リポジトリ全体を調査し、9つの調査資料を置き換える。
B. Focused scan — npm 配布、JS API、Worker、wasm、型定義、ライセンス、ビルド情報、terrarium 統合に関係する部分を調査し、既存資料の他の記述を保持する。過去の分析範囲は鮮度未検証として記録する。
X. Other (please specify)

[Answer]: B. Focused scan
