# Logical Components — u1-runtime-package

## Sources and Boundaries

ドキュメント根拠：components.md、functional-spec.md、contract-summary.md C1/C2/C8、security-requirements.md、tech-stack-decisions.md、security-design.md SD1–SD5。新cloud基盤を必要としないlibrary構成。U1の5component ownershipを保持する。

## Component Inventory

| 境界 | 所有・配置 | 適用パターン | failure domain / 共有 |
|---|---|---|---|
| CoreAdapter | runtime/core.mjs、同梱loader/wasm/build-infoの記述 | Adapter、provenance照合、browserロード前waitAsync規則 | 1runのcore。資産は不変bytes/URLで共有可、mutable FS共有禁止 |
| GuestExecution | worker-execution.mjs / guest-io.mjs | copy入出力、core経由FS、完全snapshot材料 | runごとのWorker、古いcoreを再利用しない |
| SessionState | state.mjs / validation.mjs | atomic候補commit、root境界、copy返却 | 1sessionのみに影響。session間inode/buffer非共有 |
| ExecutionLifecycle | lifecycle.mjs / protocol.mjs / errors.mjs、Node/browser api/package-worker | single active、deadline、終端仲裁、cleanup barrier、fail closed | cleanup不能sessionだけdisposed。consumer全体の完全防護は主張しない |
| PackageSupply | public.mjs、exports/types/pack一覧、core assets/notices | fixed inventory、empty consumer、content identity | 不整合候補の配布証拠を失敗。公開判定はU4 |

U3は公開Sessionだけを使いU1内部状態を直接更新しない。U2 guest metadataとU4 evidenceはU1内部protocolへ混ぜない。受入れ用coverage bridgeは製品の公開API/パッケージ依存にしない。テスト用パッケージコピーとmanifestのsource correspondenceを検証し、実配布tarballを計測済みコピーへ黙って置換しない。

## Coverage Selection Experiment

2026-10-07のmain session小試験。実行コマンド：`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/formicarium-playwright /Users/mutoakio/.local/share/mise/installs/node/24/bin/node /private/tmp/formicarium-nfr-coverage/experiment.mjs`。sandbox内のbrowser起動は失敗したためホスト権限で同じコマンドを実行。exit0。検証用scriptは一時ファイルであり製品実装ではない。

観測版：Node v24.21.0、istanbul-lib-instrument6.0.3、istanbul-lib-coverage3.2.2、Playwright1.55.0。browser binariesはChromium140.0.7339.16/build1187、Firefox141.0/build1490、WebKit26.0/build2203。固定fixtureはexported work関数の2statementと未呼出functionの1statement。実行前にIstanbul coverageのstatement slotを共有counter accessorへ結び、work実行後normal終了とCPU-bound loopの強制終了を比較した。

| Realm | normal counts | forced termination counts | 結果 |
|---|---|---|---|
| Node Worker | [1,1,0] | [1,1,0] | 検証済み |
| Chromium module Worker | [1,1,0] | [1,1,0] | 検証済み |
| Firefox module Worker | [1,1,0] | [1,1,0] | 検証済み |
| WebKit module Worker | [1,1,0] | [1,1,0] | 検証済み |

ゼロmetadataを加えたcoverage mapのfilesはruntime/unimported.mjsとruntime/fixture.mjs。未importのline1は0、fixtureのline2/3はmerge後2、未呼出line6は0。同じファイルをmergeしても分母は2ファイルのまま。実験の試験assertionsはcounterにpositive/zeroが存在、file数2、未import line1=0。

採用案はIstanbulのESM statement instrumentationと共有counter bridge。終了時のmessageだけに依存する方式はCPU-bound強制終了で送信を失うため採用しない。Chromiumのみのcoverage APIは3browser要件を満たさない。上記は方式選定の根拠であり製品coverage80%達成の証拠ではない。browser counterのmerge、欠落realm拒否、全13ファイルのbootstrap順序、nested pthread、実wasmは未検証。次の実装で再現可能なrepo内testとして整備する。

一次資料：[Istanbul instrumenter API](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)、[Node Worker仕様](https://github.com/nodejs/node/blob/main/doc/api/worker_threads.md)。これらはinstrumentation/shared buffer/terminateの設計根拠であり今回の製品試験結果ではない。

## Infrastructure Handoff

U1にAWS/VPC/DB/常駐サービスはない。開発試験はローカルHTTP配信と必要な隔離ヘッダ、Node/browser Worker資産の同梱位置を使う。費用はローカル資源と既存配布/CIの範囲で、新cloud resourceを作成しない。実費や公開権限は未検証。U4がTrusted Publishing・ReleaseEvidence・統合前CIを所有する。

## Open Items

cleanup watchdog1000msは内部提案値で、既存外側試験上限を延長しない。nested Worker完全停止、cleanup競合、全体coverage収集はCode Generationで実装し観測する。Functional Design R-01の原文は履歴として残り、security-design SD3の追加判断と実装結果を後の人間チェックポイントへ提示する。
