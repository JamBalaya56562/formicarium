<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-06T05:27:53Z — FR7 系（不一致時の扱い）は条件が起きなかったので N/A のまま、網羅の確認では不合格の指摘として承認の場に出した; 規則は OK だけを網羅とみなすため、黙って合格にせず人間の判断に委ねた。
- 2026-10-06T05:27:53Z — pitchfork は Code Generation でビルドしたものを再ビルドせずに使った; ソースとビルド手順がその後変わっておらず、ビルドは 35 分以上かかるため。aube の再ビルドをしない既存の Corrections と同じ考え方で、build.test.mjs で ELF・static・コミットを確かめた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-06T05:27:53Z — 単体テストの手順のうち build と runner は既存スイートのコマンド（I3）に含まれるので、別には実行しなかった; 各テストファイルを 1 回だけ実行し、件数を二重に数えないため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
