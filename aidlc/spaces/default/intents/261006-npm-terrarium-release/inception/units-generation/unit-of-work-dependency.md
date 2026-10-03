# Unit Dependencies

## Sources

承認済み4Unit計画、Domain Designの呼出し関係・ownershipとADR-001–004、requirements FR7/FR9。構築依存の文書根拠であり、実行成功は未検証。

## Dependency DAG

```yaml
units:
  - name: u1-runtime-package
    kind: library
    depends_on: []
  - name: u2-guest-distribution
    kind: packaging
    depends_on: []
  - name: u3-terrarium-integration
    kind: ui
    depends_on: [u1-runtime-package, u2-guest-distribution]
  - name: u4-release-assurance
    kind: packaging
    depends_on: [u1-runtime-package, u2-guest-distribution, u3-terrarium-integration]
```

辺は「左が右に依存する」。U3→U1、U3→U2、U4→U1、U4→U2、U4→U3の5辺。逆向き依存や意図的循環はない。U1内のCoreAdapter/GuestExecution/SessionState/ExecutionLifecycle/PackageSupplyの相互契約はUnit内部であり、Unit辺を追加しない。

## Integration Points

| Consumer | Provider | 境界・契約の対象 | 失敗時の責任 |
|---|---|---|---|
| U3 | U1 | 公開実行・Worker/資産URL・session読取/削除/reset・結果/終了分類 | U1が原因/終了を返し、U3が既存イベントへ翻訳 |
| U3 | U2 | tool/ref→guest/fixture/commit/build-infoの解決 | U2が不足を識別し、U3は別refへ黙ってfallbackしない |
| U4 | U1 | 同一pack候補・配布JS一覧・型/資産/最小consumerとruntime試験結果 | 欠落/候補不一致をU4の判定へ渡す |
| U4 | U2 | guestref/provenanceとnative fixtureの同一性 | 不整合を合格にしない |
| U4 | U3 | 基準commit/差分・browser/iframe・公開済みRCの実受入れ | 必須失敗/未実施はstableを止める |

具体payload、所有者、プロトコル、失敗契約はContract Designで形式化する。第一者JS/コア同梱はruntime呼出し依存ではない。U2の取得元はU1のregistryへ登録する前提を作らない。

## Integrated First Unit

最初の定義・同順位の解決対象はU1 u1-runtime-package。Node/browser adapter、汎用guest実行、同梱コアとpackを含むため、後続Unit・公開npm registry・terrariumなしで空consumerから実guestを動かせる。最小tarballは実装・実行が必要であり、文書・型・既存PoCの成功だけではこの確認を代替しない。詳細demoと人間のConstruction Verification CommandはDelivery Planning/Constructionで確認する。

## Parallel Development Opportunities

U1とU2には相互依存がなく、契約fixtureを用いて独立開発できる。U3/U4のmockによる準備は可能だが、providerがない状態で実連携/受入れ成功を主張しない。重いビルド・テストは並行せずmainで逐次実施する。このDAGは可能な依存関係を示し、推奨実装順序やcritical pathを決めない。

## Construction Dependencies versus Release Preconditions

U3はローカルpackで実装・比較でき、U4のRC公開完了を構築依存にしない。U4のUnit実装はCI・証拠・RC/stable条件の経路を完成させることを含むが、実公開前の人間承認を省略しない。

実操作はRC公開前条件→承認済みRC公開→公開済みRCを実terrariumへ導入して受入れ→stable差分/全必須条件と版・操作承認→stable公開。これはFR9の公開条件であり、Unit DAGへU3→U4を加える根拠ではない。U4のRC条件にstable専用の公開済みRC受入れを課さない。公開済みRC受入れはU3の接続成果物を再利用してU4が判定し、未実施を成功扱いしない。

## Verification Status

DAG・所有・対応の機械検査は別途コマンド結果で確認する。実装、実配信、browser実行、CI、coverage、RC/stable公開は未検証。
