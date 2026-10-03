# External Dependency Map

## Sources and Boundaries

delivery-planning-questions.md Q3「追加なし、既知の項目を計画へ記録する（推奨）」、requirements.mdのA1–A3/FR8–FR10、components.mdの外部依存、unit-of-work.md、contract-summary.md C2/C3/C6/C7、team-practices.md。Boltは動く成果物で締めくくる作業のまとまり。追加の外部チーム・API・期限は人間から指定されていない。以下の所要時間と実権限は未検証であり、完了予定を推測しない。

## Dependency Register

| ID | 対象 | 担当/判断者 | 阻止する作業 | リードタイム | 遅れた場合 |
|---|---|---|---|---|---|
| D1 | 既存blink同梱資産とbuild-info/lock整合 | B1開発担当 | B1実tarball実行 | 未検証 | 同一性確認。必要な変更部分だけ再build、欠落のpass禁止 |
| D2 | native Linux基準、guest/fixtureと取得元情報 | B2開発担当、main検証 | B1固定guest検証、B2供給、B3/B4比較 | 未検証 | 既存build同一性を確認。wslc失敗時は既存Docker fallback、変更のないaubeは再buildしない |
| D3 | terrarium側ref配布先・成果物書込み/実配信 | B2担当、権限保有者は実確認 | B2実供給と後続の実配信受入れ | 未検証 | 供給contract fixtureで準備可能。実配信は未検証として残す |
| D4 | sibling terrariumの書込み権限 | B3担当が差分を用意、人間/権限レビュー | B3実編集・実統合 | 未検証 | 対象ファイル/具体差分を先に提示。読取りとformicarium側準備を継続 |
| D5 | consumer/iframeのWorker資産URL・隔離条件 | B1/B3担当、配信設定保有者 | B1 browser、B3 iframe成功対象 | 未検証 | C2/C5の条件を具体化しFR5.4の9セルどおり観測。成功必須セルの縮小不可 |
| D6 | public source/history/packと除外一覧の承認 | B4が具体候補、人間が確認 | public repository作成/push | 未検証 | ローカル候補/検査を完成。承認前の外部公開なし |
| D7 | GitHub/npm権限、Trusted Publisher/workflow信頼設定 | B4が公式仕様・実設定を照合、設定権限者は実確認 | RC/stable実公開 | 未検証 | workflow/模擬判定準備。長期npm token迂回や未設定の成功扱いをしない |
| D8 | 0.1.0-rc.1の候補・版・公開操作承認 | B4が証拠、人間が判断 | RC next/GitHub Release | 未検証 | RC条件の不足を明示。stable専用受入れの未完了だけでRCを拒否しない |
| D9 | 公開済みRCの実terrarium受入れ | B3成果を使ってB4/mainが実検証 | stable判定 | RC公開後、所要時間未検証 | local pack成功を代用しない。RC identityとinstalledVersionを固定して検証 |
| D10 | stable差分・全必須NFRと0.1.0の具体承認 | B4が候補/証拠、人間が判断 | stable latest/GitHub Release | RC受入れ後、所要時間未検証 | C6 rcAdoptionとstable直接証拠を検査、不足/失敗ならblocked |
| D11 | 意図全体のcheckpoint検証コマンド選定 | B1でscript作成、最初の完了確認で人間が選定 | 最初と以後のUnit完了確認 | Q4により延期 | 未設定を保持し、実コマンドを提示。placeholder/self-approval禁止 |

## Release Order and Evidence

構築順U1→U2→U3→U4と、外部操作の順序を区別する。RC公開前checksと具体承認→RC実公開→公開済みRC実受入れ→stable候補差分/全必須条件と具体承認→stable実公開。D6–D10は計画承認で解除されない。公開の失敗は追加公開を止め、既知の版へ誘導し、上書き/削除・暗黙retryで修正しない。

## Verification Status

レジスタは既知の未確認項目を計画へ配置したドキュメント根拠。外部設定・認証・配信・書込み・実公開の成功は未検証。追加の期限・外部担当者が判明した場合はこの対象に紐付け、無断で新しい製品範囲を足さない。
