<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-05T21:54:16Z — terrarium の pitchfork-basic.txt はコマンド列だけで期待出力を持たないので、出力一致の正解は native 実行で記録して作る必要がある; Q2 で「fixture の期待出力と完全一致」が選ばれたが、実ファイルを開くと期待出力は無く、terrarium の FR2 も意味レベルの表だった。質問を作る前に参照先の fixture を開いて中身を確かめるべきだった。Q5 で「native の Linux x86-64 で記録しバイト一致」に確定。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
