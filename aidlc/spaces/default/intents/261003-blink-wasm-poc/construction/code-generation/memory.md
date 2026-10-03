<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-05T00:39:51Z — WebKit での futex 回帰テストの失敗は、テスト側の問題と判断した。失敗 5 回すべてで、待ち手スレッドの開始（412〜694ms）が wake の再試行の打ち切りより遅かった。判定の基準は変えず、再試行を待ち手の終了まで続ける形に直した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-05T00:39:51Z — 委譲先の開発者が、aidlc のガード（state-transition-guard）で変数経由の実行ファイルを起動できず止まったため、ユーザーの選択（Run it here）により Step 11〜16 をメインセッションで実行した。
- 2026-10-05T00:39:51Z — aube の停止の対策として、runtime/web/worker.mjs で Atomics.waitAsync を無効にした。計画の変更範囲（診断の受け渡しのみ）を超えるため、ユーザーの承認を得てから実装した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-05T00:39:51Z — ページ fault の 2 つの欠陥（管理表のロックなし更新、CAS に負けた側の誤った解放）を 1 つの変更で直した。どちらが効いたかは切り分けていない。時間を優先した結果で、レビューの R-01 で指摘されている。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
