# Unit Story Map

## Sources

承認済みstories.mdの18件、components.md、4Unit計画。主担当はtraceability.jsonのtargetと一致する。補助Unitはcross-cuttingな検証・統合先で、重複したcomponent ownershipを意味しない。

## Story Mapping

| Story ID | Implementing Unit ID | Directory | Cross-cutting Units |
|---|---|---|---|
| US1.1 | U1 | u1-runtime-package | — |
| US1.2 | U1 | u1-runtime-package | — |
| US1.3 | U1 | u1-runtime-package | — |
| US2.1 | U1 | u1-runtime-package | — |
| US2.2 | U1 | u1-runtime-package | — |
| US2.3 | U1 | u1-runtime-package | — |
| US3.1 | U1 | u1-runtime-package | — |
| US3.2 | U1 | u1-runtime-package | — |
| US4.1 | U3 | u3-terrarium-integration | U1, U2 |
| US4.2 | U3 | u3-terrarium-integration | U1, U2 |
| US4.3 | U2 | u2-guest-distribution | — |
| US5.1 | U4 | u4-release-assurance | U1, U2, U3 |
| US5.2 | U4 | u4-release-assurance | U1, U2, U3 |
| US5.3 | U1 | u1-runtime-package | — |
| US6.1 | U4 | u4-release-assurance | U1, U2, U3 |
| US6.2 | U4 | u4-release-assurance | U1, U2, U3 |
| US6.3 | U4 | u4-release-assurance | U1, U2, U3 |
| US6.4 | U4 | u4-release-assurance | U1, U2, U3 |

## Story Implementation Order within Units

- U1: US1.1 → US1.2 → US1.3で実tarballの最小統合スライスを確認。続いてUS2.1/US2.2/US2.3で入出力・失敗・終了、US3.1/US3.2で状態・分離を確認。US5.3のcore境界とguest差替え検証は該当差分全体で維持する。未完了のMustを最小版で省略しない。
- U2: US4.3のref供給・2ref照合・欠落拒否を一つの供給契約として検証。
- U3: US4.1の既存入口とイベント比較、その接続を使うUS4.2のiframe9セルと未承認origin/guest非実行oracleを検証。
- U4: US5.1/US5.2で回帰・固定coverage・欠落拒否の判定を整備。US6.1/US6.2の公開対象・信頼経路を具体化。US6.3のRC条件とUS6.4のstable条件を別経路で確認。実公開は具体的な人間承認後、RC→実terrarium受入れ→stableという要件順を守る。

上記は各Unit内の受入れ依存を示す。Unit間の経済的順序・Bolt割当・critical pathはDelivery Planningで決定する。

## Cross-cutting Concerns

U1はruntimeとpackのローカル検証を提供し、U4は候補同一性・全体coverage・公開証拠を判定する。U2はref成果物を提供し、U3は選択と端末表示を接続する。US3.1/US3.2はU1に主担当を置き、実terrariumの操作はU3のUS4.1とU4のUS5.1/US6.4で組み合わせる。US5.1/US6.4の実受入れはU1/U2/U3の成果物と結果を必要とするが、ReleaseEvidence/ReleaseDecisionはU4だけが所有する。

## Coverage Verification

全18ストーリーを主担当へ一度ずつ割り当てた。U1=9件、U2=1件、U3=2件、U4=6件。全Unitにストーリーがあり、8componentの所有はunit-of-work.mdと一致する。機械照合の結果をmainの実行出力で確認する。動作・coverage数値・公開は未検証。

