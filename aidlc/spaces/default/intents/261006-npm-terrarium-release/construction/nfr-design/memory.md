<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations

- 2026-10-07T12:18:00Z — shared statement countersをIstanbulのESM instrumented test copyへ適用する設計とする。Nodeと3browserのnormal/強制終了後に[1,1,0]、未import fileのline0をmainで観測した。製品全体・nested Worker・欠落拒否の成功は未検証。

## Open questions

- 2026-10-07T12:18:00Z — SD3のcleanup watchdog1000msは内部設計値であり既存外側上限を変えない。Nodeとbrowser終了操作の違い、補助Workerの後始末、失敗sessionの非再利用は実装試験で確認する。

## Tradeoffs

- 2026-10-07T17:40:11.822550+00:00 — 人間Q2のAに基づき照合済みBlob moduleとsame-origin bootstrapを選定し、Nodeは非公開run所有コピーを使う。CSP許可条件を明示しCORS/隔離を維持、元URL再importを廃止する。生成loaderの相対pthread参照と資源解放の実動作は未検証でありCode Generationでmainが観測する。
