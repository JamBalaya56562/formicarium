# Team Allocation

## Sources and Staffing

delivery-planning-questions.md Q2「この会話で進める（推奨）」、unit-of-work.mdのcomponent所有、contract-summary.mdの契約所有、team-practices.mdのmainによる逐次ビルド/テストを根拠にする。Boltは動く成果物で締めくくる作業のまとまり。mobは同じ成果物を協力して確認する担当の組合せ。本scopeではTeam Formationを実施しておらず、存在しない人間チーム名を作らない。

## Bolt Assignment

| Bolt | Unit | 実装責任 | 担当範囲 | 確認支援 |
|---|---|---|---|---|
| B1 | U1 | aidlc-developer-agent（AI） | runtime/pack、C1/C2/C8 | architectの設計確認、qualityの検証計画 |
| B2 | U2 | aidlc-developer-agent（AI） | guest/ref供給、C3 | architectの境界確認、qualityのref失敗確認 |
| B3 | U3 | aidlc-developer-agent（AI） | terrarium接続、C4/C5 | designの既存操作比較、qualityのiframe/状態確認 |
| B4 | U4 | aidlc-developer-agent（AI） | evidence/coverage/CI/公開判断、C6/C7 | security/quality/architectureによる該当確認 |

確認支援は計画上の役割であり、自動的に別agentを起動する約束ではない。適用工程が指定する役割とレビュー手順に従う。各ファイル・moduleの実編集責任を実装計画で明示し、他の担当の変更を戻さない。main sessionが実コマンドと結果を確認し、build/testの並行実行はしない。

## Ownership and Human Decisions

SessionStateの所有はU1、GuestDistributionはU2、既存UIの翻訳はU3、ReleaseEvidence/ReleaseDecisionはU4。U4の証拠集約待ちをU1のローカル検証の前提にしない。状態内部表のU3直アクセスや重複した証拠所有を作らない。

人間が持つ判断：各計画の承認、最小統合版の実検証後の確認、具体的な検証コマンド選定、必要な外部作業権限、公開source/history/除外物・対象commitの確認、公開先作成/push・RC・stable各操作の承認。現在の回答は自動進行モードの付与ではない。以後の完了確認は記録済み方針と適用手順に従う。

## Verification Status

担当配置は人間回答と既存所有表に基づく計画（ドキュメント根拠）。人員増員・外部チーム引渡し・同時ビルドを前提にしない。実装、統合、公開設定・認証の成功は未検証。
