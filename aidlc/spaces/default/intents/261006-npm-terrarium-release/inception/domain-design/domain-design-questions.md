# Domain Design Plan

## Sources

- [memory:M1] 承認済みrequirements.mdとstories.md：npm共通ランタイム、terrarium既存入口、状態引継ぎ、RC/stable順序。
- [memory:M2] CodeKB architecture.md/component-inventory.md/dependencies.md：core/guest-io/Node/web/session/registry境界。記録されたソース観測と旧未検証資料を区別する。
- [memory:M3] team-practices.mdと承認済みrefined-mockupsの仕様。
- [Q1] 要件分析のQ1–Q3：terrariumの推奨選定をCodexへ委任。基準commit・初回guest・browser判定は承認済み。

## Plan and Resolved Context

1. 既存コア境界を保ち、汎用実行・セッション状態・Worker終了責任を分ける。
2. terrariumは既存入力/表示/通知を、ref配布はguest/fixture/取得元を所有する。
3. パッケージ供給と公開判断を実行処理から分ける。配布サーバーやnpm自体をコンポーネントにしない。
4. catalogueを先に確定し、図/所有表/依存表を同じデータから導く。
5. 18ストーリーの対応、所有一意、依存対称性、非循環、参照先とMermaid構文をmainで検証する。

## Boundary Options

| 論点 | Option A（推奨案） | Option B | 理由・可逆性 |
|---|---|---|---|
| 状態の所有 | 共通SessionStateが所有し、terrariumは公開操作から利用 | terrariumがsnapshotを所有し毎回ランタイムへ渡す | AはJS側読取/削除とguest更新を同じ所有者へ集約。BはUI側へ状態規則が漏れる。型と保存形式は後続設計で固定できる |
| 実行入口 | Node/browserを同じExecutionLifecycleの環境adapterとして扱う | 環境ごとに終了・状態規則を別実装 | Aは結果と中止の共通規則を保つ。環境固有import/資産取得は別入口へ分離する。Unit分割は後続 |
| 配布 | 共通PackageSupplyとterrarium GuestDistributionを分離 | guest/fixtureを共通npmへ同梱 | Bは承認済み配布範囲に反する。Aの資産配置はContract Designで固定 |

これは承認時に選ぶ境界の推奨案であり、新しいユーザー回答の記録ではない。既に確定したguest/browser/公開順序を再質問しない。実装方式として判断できる内容は推奨案を作成し、成果物の承認で確定する。新しい製品範囲の質問はない。

## Ambiguity Analysis

既存registryはデモ/受入れ専用のデータであり、汎用APIのguest登録表にしない。既存session.mjsの手順変換/transcriptと永続するSessionStateを区別する。CoreAdapterは新しいコア実装ではなくcore.mjsの既存境界。ReleaseAssuranceの成功条件はRC公開前と公開済みRC受入れ後のstableで分ける。具体的なexports/型・snapshot・同時呼出し・assetURL・失敗分類・通知経路はContract Designで固定し、動作確認済みとしない。

## Assumptions & Open Questions

全実装動作と公開権限は未検証。新たなデータベース、AWS基盤、汎用shell、Rust/JIT、UI再設計は追加しない。
