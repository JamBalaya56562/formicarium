<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-05T22:52:46Z — 初回スキャンは全体を対象にしたが、記録上の範囲は partial にした; developer が深く読んだのは runtime/・scripts/・tests/ など 18 パスで、guest/probe/・patches/・docs の残りは流し読みだった。確かめていないものを analyzed に入れないため kind: partial とし、未読部分は shallow に残した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-05T22:52:46Z — dist/ は developer が読んだが shallow に置いた; gitignore 対象の生成物でソースの指紋では鮮度を確かめられないため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
