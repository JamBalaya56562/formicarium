# Risk and Sequencing Rationale

## Sources and Human Choice

根拠はdelivery-planning-questions.md Q1、team-practices.mdのWalking Skeleton、unit-of-work-dependency.mdの5辺、unit-of-work-story-map.md、requirements.md、stories.md、mockups.md、components.md、contract-summary.md。Boltは動く成果物で締めくくる設計・実装のまとまり。

人間の選択は4単位を1つずつ順に進める。最小統合版（walking skeleton：配布物を通して端から端まで動く最初の構成）を先に確かめるCockburnの方針を使い、残りは依存を満たして実連携から公開証拠へ進む。価値・緊急性・実工数の数値は未提供であり、形式的な順位スコアを捏造しない。L/Mは既存の相対複雑度で、期間ではない。

## Sequence and Architecture Check

順序はB1/U1→B2/U2→B3/U3→B4/U4。U3→U1、U3→U2、U4→U1、U4→U2、U4→U3の全5辺でproviderが先に完成する。U1とU2は独立だが、最初のnpm consumerで配布・Worker境界の不確実性を減らしてからguest供給を進めるというQ1の選択を優先する。並行可能であることを並行実行の許可と扱わない。

Architectの確認観点：U1は後続Unitなしで実guestのNode/browser実行と型・同梱資産を検証できる。U2の供給をU1のregistryへ登録する依存を追加しない。U3はローカルtarballで構築でき、U4による公開を構築前提としない。公開済みRC受入れはU4のstable判定の条件であり、Unit DAGに逆辺を加えない。承認済みDAGに逸脱なしという主張は機械検査結果を併記して確かめる。

全39要件ID・18ストーリーは初回Mustのまま。最小版を初回stableの全範囲と呼ばず、B1の初期demo後もB1担当の残る状態・失敗・終了契約とB2–B4を検証する。物理的に逐次実行するためB1–B4が実行列となるが、実測時間のcritical pathや工数短縮の主張は未検証。

## Risks and Early Evidence

| リスク | 最初の検証先 | 観測/停止条件 | 次への扱い |
|---|---|---|---|
| 元repo参照・資産欠落・browserにNode依存 | B1実tarball空consumer | Node/3browser/型/資産の失敗 | 修正・再検証前に統合成功としない |
| timeout/abort/古い通知、snapshot破損・link意味 | B1 C1/C8 fixtures | settle/cleanup/atomic commit/FS操作が契約に不一致 | 再現fixtureで修正。B3で実端末比較 |
| ref誤選択・供給digest不一致 | B2 C3、2ref照合 | 未配布をfallback成功、情報と内容の不一致 | 原因を識別して止める |
| 表示/API/iframe互換性を失う | B3 C4/C5、基準commit | event/出力/副作用oracleの不一致 | 基準比較と契約Q1/Q2を優先 |
| 配布JS/別realmの計測漏れ | B1一覧作成、B4計測検証 | 未import/未収集を分母から除外、80%未達 | quality合格・stableへ進めない |
| RCとstable証拠のidentity不一致 | B4 C6/C7 | unknown ID/digest/別候補、未検証差分 | blocked、RC履歴を再ラベルしない |
| 公開設定・外部権限の不足 | B2/B3対象具体化、B4実設定照合 | 権限不明・未承認・公式仕様未照合 | 外部依存として記録、成功を推測しない |

## Limits and Scope

ビルド/テストはmainで逐次。既存時間上限・native一致・wasm1GBを緩めない。変更のないaube再ビルド、JIT、paludarium実装、新guest、Rust/JSR、新UI、汎用shell、新性能SLOは追加しない。Q3の追加なしは既知権限の準備完了を意味しない。実機Safariは未検証を残す。CheerpXの修正報告は今回のblinkを置き換える判断ではない。
