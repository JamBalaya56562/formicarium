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

## Interpretations
- 2026-10-07T12:40:00Z — 人間のApprove Planに対する保護された承認記録を取得し、U1実装へ進む。終了候補はcleanup後commitとし、明記した内部期限の短縮と既存外側限界の維持を承認対象に含めた。

## Open questions
- 2026-10-07T12:40:00Z — このMacの既存ビルド成果物が欠落しており、事前suiteは32件中24pass・8failを観測した。固定コアコミットをjjで取得しDockerを起動、既存手順で再ビルド中。製品tarball・realWorker・coverageの成功はまだ未検証。

### 2026-10-07T13:48:42Z
- Observation: exact tarball consumer trials found browser pthread descendants active after forced outer termination; direct real-pthread timer oracle reproduced Chromium abort/timeout and WebKit abort. Host-owned descendant broker fixed it; v3 all three-browser consumer/nested/broker 33 passed.
- Decision: generated blink Node-only workerData is normalized in core, generic host options validation remains strict. Missing Worker asset and current unsupported-major child control were reproduced in all browsers, then v4 corrected classification and preflight cancellation; 15 browser regression cases passed.
- Evidence: v4 tgz SHA256 3fc9bc589c624cf5f9854c863198532e119b1467faad8e79c1b996e3ff05cc06; external empty consumer Node 15 passed. v3 collector readiness retained host plus 17 Node Worker realms and 94 tests passed, not final coverage acceptance.
- Remaining: final v4 browser suite and full 13-file merged coverage, independent review and next required checkpoint. Real Safari, broad guest regressions, CI and publication remain unverified.

## Interpretations — 2026-10-07T18:12Z

人間のApprove Planを今回の段階のreceiptへ記録。mainのみ試験し、実生成loader差替えRedをNode2件と3browserでmarker1として観測してからGreenへ進んだ。cwdもNodeENOENT/CORE_INITと3browserCORE_INITのRed後に親復元を修正。旧v4成功は修正証明に流用しない。

## Tradeoffs — 2026-10-07T18:12Z

回答Aに従うBlobは明示CSP許可を必要とし任意Blob child許可へ広げない。host台帳がroot強制終了後の資源解放を所有。browser pthread bootstrapが第一者moduleを読むため全childrealmをcoverage収集へ加える。中間v5/v6と最終候補を混同せず、文書凍結後に新候補を作る。
