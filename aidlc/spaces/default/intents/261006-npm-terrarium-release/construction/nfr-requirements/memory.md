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

## Tradeoffs

- 2026-10-07T12:09:33Z — 人間Q1「1」によりWorker終了確認不能時はsessionを利用不可にする。候補snapshotを保存せずEXECUTIONでreject、以後DISPOSEDとする。終了確認できた通常timeout/abort後の再実行契約は保持する。

## Open questions

- 2026-10-07T12:09:33Z — NFR7.3/7.4とFunctional Design R-01の順序差分は後続設計で統合する。凍結されたfunctional-specの記述はまだ改訂しておらず、実装前に順序と遷移を明示する必要がある。

## Interpretations

- 2026-10-07T17:32:13.015289+00:00 — 差し戻し2件を既存NFR5.1とNFR4.4の受入れ条件へ具体化した。旧候補の証拠を流用せず新tarballと全realm coverageで検証する。品質上限・固定分母80%は維持する。
