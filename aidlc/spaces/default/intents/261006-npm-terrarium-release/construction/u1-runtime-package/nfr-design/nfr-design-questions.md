# NFR Design Questions — u1-runtime-package

## Sources and Prior Answers

Guide meを継続。requirements、contract-summary C1/C2/C8、NFR RequirementsのQ1「1」により既存品質条件と終了確認不能時のDISPOSEDが確定済み。再質問しない。未import・別realmを含むcoverage方式は担当者が実験に基づき選ぶ既存委任に従う。

## Questions

初回は未回答事項なし。差し戻しR-01の具体方式について、以下を確認する。

## Q2 — Verified Loader Evaluation and Browser CSP

検証済み（ソース読取り）：現候補は取得したloaderを照合後、元URLをdynamic importする。生成blink.mjsはimport.meta.urlを基準にblink.mjsのpthread Workerを作る。そのため単に元URLを別のURLへ変えるだけでは、照合とpthread起動の両方を満たせない。修正方式の実動作は未検証。

技術提案：Nodeはrun所有の非公開一時領域に照合済みloader bytesを置き、そのコピーと補助Workerだけを評価する。browserは照合済みbytesから作った所有Blob moduleを評価し、補助Workerはsame-origin HTTP(S)のpackage bootstrapを介して同じbytesを受け取る。生成loaderの相対URLの扱いはCoreAdapterへ閉じる。元assetの取得・CORS、COOP/COEP、SharedArrayBuffer、same-origin Workerを維持し、外部Worker URLのblob迂回、eval/unsafe-eval、policy自動緩和は行わない。Blob/一時領域はrun終了まで所有し、正常・abort・timeout・disposeでcleanupする。

このbrowser方式には、consumerのCSPで照合済みBlob moduleの実行を許可する条件が加わる。許可がなければ開始を拒否し、README/受入れ条件へ明記する。既存SD1はblob等の自動迂回を禁止しており、今回の明示的な方式選択と区別する必要がある。

A. 照合済みBlob module方式を採用する（推奨）。CSPの許可条件を明記し、同一originのWorkerと元assetのCORS条件は維持する。Node/3ブラウザで変更応答・pthread・cleanupを実検証してから承認する。
B. Blob moduleを使わない条件を優先し、loader評価方式を再検討する。
X. Other (please specify)

[Answer]: A. 照合済みBlob module方式を採用する。人間の原文：A

## Ambiguity Analysis

cleanup順序はNFR7.3/7.4に合わせ、このstageのsecurity-designを明示的な設計追補とする。coverageはmainの小試験でNodeと3browserの共有statement countersを確認したが、製品全体・nested pthread・欠落検出は未検証として残す。新しいSLO・cloud基盤・公開操作は追加しない。
