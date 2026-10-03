<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-05T23:07:16Z — Q5 で fixture の取り込みが選ばれなかったが、実行に必要なので Q7 で取得元を確認した; 未選択の選択肢を除外とは扱わず、追加質問で決めた（写すが出どころは記録しない）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-05T23:07:16Z — 意図の段階の合格基準（バイト単位で完全一致）を、要件で aube と同じ正規化比較に置き換えた; Q3 で正規化比較が選ばれ、Q6 で意図の決定を置き換えることを明示的に確認した。承認済みの意図ステートメントは書き換えず、requirements.md の Intent Analysis に更新を記録した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
