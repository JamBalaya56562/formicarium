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

- 2026-10-07T12:10:00Z — U1の初期entryは不足親を0755で自動作成し、明示dir modeを優先する。人間はQ1に「1」と回答した。親がfile/symlinkなら全seedを拒否する設計で利便性と原子性を両立する。動作は未検証。

## Open questions

- 2026-10-07T12:10:00Z — 固定配布JS一覧と追加pthread資産の有無はビルド時に確認する。U1設計は生成loaderを第一者coverage分母から除き、資産試験を別途行う。現在は未検証。

## Interpretations

- 2026-10-07T12:02:05Z — 直前の2件の記録日時12:10:00Zは入力誤りであり、実際の記録は12:02:05Z以前。同記録の内容・判断は変更しない。

## Interpretations

- 2026-10-07T17:27:39.452485+00:00 — 人間のRequest Changesと上記2件を既存C1/C2の履行修正として扱う。照合済みloaderと評価対象の同一性、root内の不足親からのcwd再作成を設計に明記し、新APIや品質基準変更は行わない。実行再現と修正はCode Generationでmain sessionが順次観測する。
