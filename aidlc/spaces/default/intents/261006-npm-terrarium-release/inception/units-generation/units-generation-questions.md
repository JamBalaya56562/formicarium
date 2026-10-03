# Units Generation — Decomposition Plan

## Sources

承認済みDomain Designの8コンポーネント、ADR-001–004、requirements.md、stories.md、team-practices.mdを根拠にする（ドキュメント根拠）。実装・所要時間・公開の成功は未検証。

## Proposed Plan

同じ配布物として検証する共通ランタイムを一つのlibrary Unitにまとめ、更新元の異なるguest供給、既存UIとの接続、品質証拠と公開判断を別Unitにする。新しい常駐サービスは設けない。

| Unit ID | Directory / Name | Kind | 所有コンポーネント | 配布モデル | 相対複雑度 |
|---|---|---|---|---|---|
| U1 | u1-runtime-package | library | CoreAdapter, GuestExecution, SessionState, ExecutionLifecycle, PackageSupply | 共通npm、consumerへ組込み | L |
| U2 | u2-guest-distribution | packaging | GuestDistribution | terrariumのref別guest/fixture資産 | M |
| U3 | u3-terrarium-integration | ui | TerrariumIntegration | 既存terrariumへ組込み | L |
| U4 | u4-release-assurance | packaging | ReleaseAssurance | CI・検証記録・承認済み配布手順 | L |

見積りは比較用の提案であり、実測日数ではない。Unit名はconstructionディレクトリと一致させる。

## Dependency Structure

- U1とU2は他Unitを前提にしない。
- U3はU1の公開API/資産契約とU2のguest/ref/fixture供給契約に依存する。
- U4はU1のcandidate、U2の供給物、U3の実連携と受入れ結果に依存する。
- U1の単体・tarball consumer検証はU4の集約や公開を待たず実行できる。ReleaseAssuranceの公開判断・全体証拠の所有をU1へ移さない。
- 構築依存と公開順序を区別する。U4のRC経路は最小consumerと公開前条件で判定し、公開済みRCの実terrarium受入れをstable経路の条件にする。RC公開が未完了だからU3のローカル実装を阻止するような循環は作らない。
- DAGの最初の定義をU1とし、実tarballからNodeとbrowser Workerでguestを実行できる統合スライスを含める。文書・型・単独層だけの最初のUnitにはしない。後続Unitなしで最小consumerを検証可能にする。
- U1/U2間に直接依存はなく、設計上は並行作業可能。ビルド・テストはmainで逐次実施する。実際のBolt順序・価値判断・critical pathはDelivery Planningで決め、ここでは推奨順序を決めない。

## Alternatives and Constraints

8コンポーネントを8Unitにする案は共通npmの成立に内部層の受渡しを増やす。一つの巨大Unitにする案は共通npmとref別資産、UI、外部公開の独立した変更境界を隠す。4Unit案を推奨する。

U1の内部契約、U1→U3とU2→U3、candidate/証拠→U4の契約はContract Designで固定する。guest/fixtureをnpmへ含めない。core.mjs境界、既存UI/API、iframe条件、既存品質上限を維持する。公開先作成・push・publishは後日の具体的な人間承認が必要。terrariumの書込み権限は変更対象を具体化してから取得する。

## Ambiguity Analysis

既承認の最小tarball先行、Node/browser対応、ref別guest供給、RC→実terrarium受入れ→stableを再質問しない。Unitは一つのcomponentに限定するものではなく、同じconsumer配布境界にある複数componentをまとめる。共通runtimeの所有状態をterrariumへ移さない。公開操作の許可は本計画の承認と別である。新しい製品要件や未回答の製品質問は追加しない。

## Plan Approval

4Unitの境界、kind、依存構造、U1の最小統合スライスを確認する。

[Answer]: Approve Plan
