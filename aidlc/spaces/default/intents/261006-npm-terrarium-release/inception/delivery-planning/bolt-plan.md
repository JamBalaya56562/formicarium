# Bolt Plan

## Sources and Decisions

根拠：requirements-analysis/requirements.md、user-stories/stories.md、refined-mockups/mockups.md、domain-design/components.md、units-generation/unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、contract-design/contract-summary.md、practices-discovery/team-practices.md。方針の人間回答はdelivery-planning-questions.md Q1–Q4。以下は実装計画のドキュメント根拠であり、実行成功は未検証。

Boltは、一部分の設計・実装を進め、動く成果物で締めくくる作業のまとまり。本計画は4単位を1つずつ逐次実行する。最小統合版（walking skeleton：配布物を通して端から端まで動く最初の構成）を先に確認する既承認方針を維持する。

Constructionは記録済みunit-major / serial、すなわち各単位の適用設計とCode Generationを終えて、検証・完了確認後に次へ進む。この会話が実行の中心となる。runtimeの順序は承認済みUnit DAGに従い、本書の順序だけで変更しない。共通Build and Testは全単位の実装後に行うが、各単位の検証をそこまで待たせない。

## Ordered Bolts

| Bolt | Unit | 前提 | 担当 | 目的 |
|---|---|---|---|---|
| B1 | U1 u1-runtime-package | 既存コア・固定guest・consumer検証環境 | aidlc-developer-agent | 最小統合版と共通runtimeの全Must |
| B2 | U2 u2-guest-distribution | guest/fixtureと取得元情報、配布対象の権限 | aidlc-developer-agent | 指定refと実供給物の対応 |
| B3 | U3 u3-terrarium-integration | U1/U2、基準terrarium、必要な書込み権限 | aidlc-developer-agent | 既存入口・状態・iframe互換性 |
| B4 | U4 u4-release-assurance | U1/U2/U3の成果物と証拠、公開設定 | aidlc-developer-agent | 候補同一性・品質・公開判断 |

### B1 — U1 Runtime Package

範囲：CoreAdapter、GuestExecution、SessionState、ExecutionLifecycle、PackageSupply。US1.1/US1.2/US1.3、US2.1/US2.2/US2.3、US3.1/US3.2、US5.3。契約C1/C2/C8。

最初のdemoは実際にpackしたtarballを元repoへ参照できない空consumerへ導入し、登録表に依存しない固定static-musl x86-64 guestをNodeとChromium/Firefox/WebKit Workerで実行してstdout/stderr/exitCodeを期待値と照合する。型consumerのcompile、同梱資産・notices・build-info照合も行う。公開npm・U2・U3・U4を前提にしない。既存PoCや最初の設計レビューの成功では代替しない。

完了条件：最小統合版に加え、全担当ストーリーの正常系・不正入力・欠落資産・非0終了・timeout/abort/dispose・古い通知・BUSY、正常exitだけのsnapshot commit、hard-link/symlink/mode/削除、公開readFile/remove/listEntries/setCwd/reset、session間分離をC1どおり実検証する。core固有知識をruntime/core.mjsに閉じ、browser Workerのdelete Atomics.waitAsyncを保持する。第一者配布JSの固定一覧を候補に結び付けU4へ渡す。最小版だけで残りMustを完了扱いしない。

このBoltが確かめること：repo外の配布経路でもNode/browserが同じ契約を満たし、正常・異常終了後に状態とWorkerを安全に再利用・終了できるか。観測で失敗した場合は原因と再現を記録し、成功したことにして後続へ進めない。最小統合版の人間チェックポイントを省略しない。

### B2 — U2 Guest Distribution

範囲：GuestDistribution、US4.3、C3。U1には構築依存しないが、人間のQ1によりB1後に着手する。

demo：aube/pitchforkの指定tool/refを選び、異なる2refについてguest・fixture・source commit・build-info・digestの対応を表示・照合する。branch/tag/commit/pr-Nと既存builds一覧の選択を保持する。

完了条件：static-musl供給物とmanifestの対応、fixture変換、未知tool/fixture・未配布ref・404・digest/format不一致の識別可能な拒否を検証する。別refへfallbackしない。guest/fixtureはterrarium側のref配布に保ちnpmへ混ぜない。他ツールは移行しない。変更のないaubeを再ビルドせず、既存pitchfork musl一行パッチを維持する。ローカル供給fixtureと実配信を区別し、実配信が未実施なら未検証として残し、供給成功を主張しない。

このBoltが確かめること：共通コア版から独立したguestrefを誤選択せず、取得元と内容を追跡してU3/U4へ渡せるか。

### B3 — U3 Terrarium Integration

範囲：TerrariumIntegration、US4.1/US4.2、C4/C5とC1/C2/C3のconsumer。基準はterrarium main commit 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d。

demo：ローカルtarballから既存リンク・terrarium-terminal・run()・iframeを動かし、aube/pitchforkの同じfixture手順、readyのtool/ref/commit、code/output/transcript、イベント順序/回数/fieldsを3browserで基準比較する。キーボード・focus・tool切替reset・queueも確認する。

完了条件：C1公開FS操作を使った連続コマンドと独立端末、hard-link保持、C4のstdout＋stderr受信順表示、native stdout比較の別記録、空command・非0・失敗・partial表示の契約を検証する。ls/rmのC1→C4翻訳fixture、unsupported shell構文の拒否、iframe9セルと未承認originの実行/通知拒否を検証する。非実行はmarker等の副作用oracleでも確かめる。新UIや汎用shellを作らない。

このBoltが確かめること：共通runtimeへ替えても既存の利用手順と公開APIが保たれるか。ローカルpackによるこの結果を公開済みRCの実受入れと呼ばない。具体的なterrarium変更対象・差分を用意してから必要な書込み権限を取得する。

### B4 — U4 Release Assurance

範囲：ReleaseAssurance、US5.1/US5.2、US6.1/US6.2/US6.3/US6.4、C6/C7。C6のcandidateId/tarballSha256/evidenceId/index/digestとrcAdoptionを実装し、未知ID・別候補・欠落・破損・収集漏れを拒否する。

demo：同一候補の証拠を集約し、正しいRC/stable条件を通すfixtureと、不足・失敗・未承認をblockedへするfixtureを実行する。RC証拠のstableへの直接混入/再ラベルは拒否し、公開済みRCの不変envelope＋stable差分検証をrcAdoptionで結合する。模擬公開と実公開は別証拠。

完了条件：固定第一者配布JS全体のNode/Worker/browser行coverage80%以上、未import/別realm未収集の検出、統合前CI、native一致、probe8項目と指定回帰、aube-1645・pitchfork-basic、候補内容/型/資産/出所/dirty=false/noticesを実検証する。公開source/history/packの一覧と機密・依存・license確認、Trusted Publishing公式仕様と実設定・公開job限定権限・未信頼元拒否を証拠化する。必要な実外部操作が未承認・未実施なら、関連ストーリーを未完了として記録する。

このBoltが確かめること：合格証拠が対象候補へ正しく結び付き、失敗/未実施や候補差分を隠した公開が阻止されるか。実公開は、対象・版・操作の承認後にRC公開→公開済みRCを実terrariumへ導入して受入れ→stable差分/全必須NFRと承認→stable公開。RC公開前にstable専用のRC受入れを要求して循環を作らない。

## Verification and Checkpoints

Q4により意図全体の検証コマンド選定を延期した。U1で実tarballの空consumerチェックと、以後の完了Unitに応じた累積チェックを実行するスクリプトを作成し、最初の完了確認で実際の一行コマンドを提示して人間に選定してもらう。stateのverification-commandは未設定のままとする。仮コマンドの自己承認や未実施のpassを記録しない。

ビルド/テストはmainで逐次実施する。probe600秒、aube browser840秒、pitchfork browser600秒/Node120秒、1worker・retryなし、native出力一致、wasm1GBを保持する。実機macOS Safariは未検証と記録し初回stableの必須へ追加しない。日数・速度の見積りは未検証であり期日を捏造しない。

## Planning Status

- [x] 人間の順序・担当・外部依存・コマンド選定時期を反映。
- [x] 4Unit/18storiesと契約C1–C8へ完了条件を対応。
- [x] 公開前・RC後・stable条件を区別。
- [x] 計画・phase traceabilityの機械照合結果を確認。

検証済み：`& './aidlc/spaces/default/intents/261006-npm-terrarium-release/.aidlc-engine/design-validation/validate-delivery.ps1'` はexit 0、`verdict=PASS, requirements=39, stories=18, units=4, edges=5, artifacts=5, errors=[]`。3つのtraceabilityのcoverage件数は39/18/18。結果と全対応表は`verification/phase-check-inception.md`へ記録した。この観測は文書の参照整合・順序に限定する。

本書の承認は実装・検証成功や外部公開の承認を意味しない。全製品動作は未検証。
