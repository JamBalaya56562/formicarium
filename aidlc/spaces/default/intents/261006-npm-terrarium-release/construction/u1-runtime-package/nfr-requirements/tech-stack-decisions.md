# Tech Stack Decisions — u1-runtime-package

## Sources

ドキュメント根拠：technology-stack.md、requirements.md、contract-summary.md C1/C2/C8、functional-spec.md、rules.md、security-requirements.md NFR1.1–NFR7.4。新規採用では既存構成との互換性を優先する。実行成功と実インストール版は未検証。

## Decisions and Rationale

| 選択 | 用途・理由 | 比較・制約・要件 |
|---|---|---|
| JavaScript ESM/.mjs、明示.d.ts | 既存runtimeを基礎に公開Node/browser/shared入口を分離。型consumerを別検証 | 全TypeScript移行は範囲を増やす。NFR1.1/5.1/6.1 |
| Node >=24 / worker_threads | 既存minimum、hostからCPU-bound workerを終了できる | browserからNode builtinをimportしない。実版を記録。NFR1.1/2.2/7.3 |
| browser module Worker / SharedArrayBuffer | 既存pthread wasmとメインスレッド分離を維持 | 必須隔離を隠さず不足ならguest未開始。NFR1.2/6.2 |
| 既存blink fork + Emscripten loader/wasm | blink.lockに固定された現行C coreを同梱する | CodeKBの過去emcc6.0.10を今回の実ビルド版とみなさない。build-infoの実観測を採用。NFR2.1/5.1/6.1 |
| session所有のin-memory state、runごと新core | normal snapshotだけ原子commit、異常rollbackと端末分離 | DB/IndexedDB/host mountを追加せず再読込永続化を保証しない。NFR4.2–4.4/7.3 |
| structured clone / versioned Worker protocol | consumer bufferをdetachせず世代/形状を検査 | 任意causeやsecretをserializeしない。NFR4.3/7.2 |
| node:test / Playwright3browser | 既存test-afterとnative出力基準を継承 | ビルド/テストはmain逐次、1worker/retryなし。NFR1.1/2.1/7.1 |
| npm pack / 空consumer / 型consumer | repo外参照と資産/type不足を実利用形で検出 | npm publish成功とは別。型チェックtoolは実装時pin、製品runtime依存を増やさない。NFR1.1/5.1 |
| fixed JS inventory + realm merge | 13配布JSを固定分母にする | coverage toolはNFR Designで未import/worker/browser収集の実験に基づき選ぶ。閾値用除外禁止。NFR3.1 |

## Applicability and Ownership

製品runtime npm依存は現状未定義（CodeKBソース観測）であり、不要なframeworkを追加しない。内部worker/protocol/state helperを公開exportにしない。資産URLのNode file取得はadapterへ、core固有locateFileはcore.mjsへ閉じる。Node24以外の最低版緩和、paludarium移行、C JITは対象外。

lint/format、型チェック、coverage計測、静的入力境界確認の具体tool版とコマンドは次の設計/実装で明示し、mise実体または宣言mise taskで実行する。Trusted Publishingと機密・依存・licenseの公開前集約はU4所有。U1は同一候補のpack/資産/型/Worker検証を渡す。

## Verification and Risks

未検証：pack/type/Node/3browser、pthread補助資産の必要一覧、nested worker終了、host memory量、coverage realm収集。既存CodeKBは過去snapshotの観測であり今回成功の証拠ではない。終了確認不能時はQ1/NFR7.3どおりfail closedにする。新しい性能SLOやサービス可用性を推測で設定しない。
