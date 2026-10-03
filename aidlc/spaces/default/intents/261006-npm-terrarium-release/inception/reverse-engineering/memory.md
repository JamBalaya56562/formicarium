<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-10-06T12:42:33Z — CodeKB の snapshot・mint・publish は同じ権限条件で実行する。通常実行の snapshot は tree:7581ee26180ea5871c32085458804230c7c85d3b86abf4c5185d0bc323444834、サンドボックス外では git:9f16536692bf955a61de0ad6b67a2333588fa94d となり、混在した publish は SOURCE_CHANGED で拒否された。通常実行で再取得した tree 指紋は元と一致したが、拒否を迂回せず候補を破棄し、同じ条件の新 snapshot に基づいて再調査・再統合する。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

- 2026-10-06T11:41:32Z — npm 配布時の wasm/Worker の URL 解決契約、型定義、ライセンス表示同梱は現行コード・資料との照合対象。実装方式や公開対象は後続工程で確定し、今回の調査では新しい要件として確定しない。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
