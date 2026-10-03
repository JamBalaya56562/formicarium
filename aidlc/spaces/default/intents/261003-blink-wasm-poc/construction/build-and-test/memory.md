<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-05T03:17:12Z — NFR2（失敗の記録）は自動テストではなく文書の内容で確認し、TC-REQ を Met とした。記録の要件にテストを書くより、記録の中身を見る方が適切と判断した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-05T03:17:12Z — Build and Test の再実行の前に、ユーザーの承認を得て blink の修正を fork に公開し、blink.lock を更新した。push は gh のログイン情報をその場限りの認証ヘルパーとして渡して行った（このシェルでは HTTPS の認証情報と SSH の鍵が使えない）。
- 2026-10-04T10:56:50Z — ゲスト（probe・aube）は再ビルドせず、コード生成で作った dist/guests を使った; aube v2.6.1 のビルドは 1 時間以上かかるため。blink の wasm はコンテナで作り直し（2 分 13 秒、コミット 247610f）、テストはその新しいビルドに対して実行した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-05T03:17:12Z — 性能の再計測は試行 3 回のまま（既存の条件を維持）。ばらつきが大きく、Chromium が遅くなった原因は切り分けられていない。
- 2026-10-04T10:56:50Z — Minimal 戦略では不要な結合・性能・セキュリティの手順書も作った; ステージの成果物として宣言されているうえ、この PoC のテストは実質的に結合テストで、性能計測（FR6）と取得元の安全確認（マルウェア混入した fork の回避）は記録しておく価値があるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
