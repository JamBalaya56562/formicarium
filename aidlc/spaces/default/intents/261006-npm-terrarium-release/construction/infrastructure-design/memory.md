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

- 2026-10-07T12:22:03Z — U1 libraryの基盤成果物はローカルcandidateのCI/CD手順だけとする。新cloud/常駐サービスを追加せず、U4が実workflow・証拠判定・公開認証を所有する。公開jobをU1の検証へ混ぜない。

## Open questions

- 2026-10-07T12:22:03Z — NFR Designのaube timeout/cleanup予算所見は未解消のまま次の実装計画へ渡す。既存840秒上限の延長や承認済み840000msの無断短縮で解決したとは扱わない。
