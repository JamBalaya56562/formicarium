<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-06T04:49:49Z — 時間の上限は計画どおり実測の最大値 × 3 を 60 秒単位で切り上げ、Node.js 120 秒・ブラウザ 600 秒に分けた; 暫定値は両方 600 秒の共通定数だったが、環境で 5 倍ほど差があるため 2 つの定数にした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-06T04:49:49Z — ビルドとテストは conductor が実行し、developer は書くところまでにした; AGENTS.md のとおり、委任したエージェントは mise の node などの動的な実行パスをガードに拒否されるため。計画の手順の順番（層ごとに実装→テスト）は保った。
- 2026-10-06T04:49:49Z — release ビルドの前に web UI をコンテナでビルドする手順を足した; pitchfork の build.rs は ui/dist/index.html がないと release で止まる。人間の判断で、mise.toml の build:ui と同じ aube install --frozen-lockfile && aube run build を dist/guests/aube で実行する形にした。
- 2026-10-06T04:49:49Z — pitchfork v2.29.0 は musl 向けにそのままではコンパイルできず、型だけを直す 1 行のパッチを当てた; lifecycle.rs:1219 の ioctl の request が c_ulong で、musl は c_int。人間の判断で「ソースは変更しない」を 1 行だけ緩めた。terrarium も同じ行を直している。patches/pitchfork-2.29.0-musl-ioctl.patch に記録。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-06T04:49:49Z — wslc が E_FAIL で動かなくなったので、FORMICARIUM_CONTAINER=docker で Docker に切り替えた; 基準値とパス調査は同じ busybox イメージで、ネットワークなし。aube の基準値は作り直しても差分がなかった。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
