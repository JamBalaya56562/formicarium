<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-03T23:43:48Z — Q5 の「blink は使わない」は Rust 版 blink を別リポジトリで作る構想の話で、この PoC は既存の blink（fork）で進めると Q7 で確定した; 先の Deviations の記録（依頼文の前提の撤回）は、この明確化によって解消した。依頼文・意図書の前提は有効なまま。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-03T23:20:41Z — 依頼文の前提（upstream の jart/blink を使う）を、ユーザーが Q5 で撤回した; blink は最後の push が 2025-12-10、最新リリースが 1.1.0（2024-01-21）で更新が止まっていると判断され、Rust で blink 相当を新しいリポジトリに再実装する方針に変わった。承認済みの意図書と依頼文は blink 前提のまま。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-03T23:20:41Z — 方針転換を意図書へどう反映するか（意図の整理に戻る／この段階で記録して進む／新しいワークフローで始め直す）を確認する必要がある。
