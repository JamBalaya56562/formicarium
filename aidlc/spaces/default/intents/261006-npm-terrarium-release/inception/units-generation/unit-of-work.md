# Units of Work

## Sources

承認済みcomponents.md / decisions.md ADR-001–004、requirements.md、stories.md、units-generation-questions.mdの人間回答「Approve Plan」。以下は設計文書根拠。実装・実行・公開・見積り精度は未検証。

## Unit Definitions

| Unit ID | Directory | Name | Kind | Deployment Model | Complexity | Components |
|---|---|---|---|---|---|---|
| U1 | u1-runtime-package | u1-runtime-package | library | shared / embedded npm library | L | CoreAdapter, GuestExecution, SessionState, ExecutionLifecycle, PackageSupply |
| U2 | u2-guest-distribution | u2-guest-distribution | packaging | standalone static distribution assets | M | GuestDistribution |
| U3 | u3-terrarium-integration | u3-terrarium-integration | ui | embedded in existing terrarium | L | TerrariumIntegration |
| U4 | u4-release-assurance | u4-release-assurance | packaging | shared CI / release artifacts | L | ReleaseAssurance |

Directoryはconstruction下の安定識別子であり、Nameと依存YAMLを一致させる。L/Mは相対的な提案で、実測工数ではない。新たな常駐実行サービスを作らない。

## Unit Responsibilities

### U1 — Runtime Package

static-musl x86-64 guestの汎用実行、引数/env/cwd/入力ファイル、stdout/stderr/終了コード、入力・初期化失敗分類、Workerのtimeout/cancel/dispose、run世代と状態所有を実装する。SessionStateの唯一の所有者は変えない。Node/browser入口を分け、browserにNode builtinを要求しない。公開JS/Worker/loader/wasm/型/LICENSE/notices/build-infoを含むnpm候補を作る。guest/fixtureは含めない。

最小統合スライスとして、後続Unitや公開registryを使わず、実際にpackしたtarballを元リポジトリへ参照できない空consumerへ導入し、固定guestをNodeとChromium/Firefox/WebKit Workerで実行する。型、資産欠落、registry未登録guest、コア境界の試験もこのUnitで実行可能にする。その後の状態・ライフサイクル機能を最小版の証拠だけで完了扱いしない。

U1は自身の検証コマンドと結果を提供する。ReleaseEvidence/ReleaseDecisionと全体coverage判定・公開判断はU4が所有し、U1の試験をU4完了まで待たせない。第一者配布JSの一覧をpack候補から固定し、U4へ渡す。core固有知識をruntime/core.mjsに閉じ、browser Workerのdelete Atomics.waitAsyncを保持する。

### U2 — Guest Distribution

aube/pitchforkのstatic-musl guestとfixture、branch/tag/commit/pr-番号とbuilds一覧のref解決、取得元commit/build-info、異なる2refの照合、未配布ref/未知tool/fixtureの失敗を担当する。共通コア版とguestrefを分ける。他ツールの移行は追加しない。変更のないaubeを再ビルドせず、既存pitchfork musl一行パッチを保持する。

出力はterrariumのref別静的供給物であり、formicarium npmへ移さない。独立した供給契約fixtureで検証可能。具体的な配布先権限・実配信は未検証で、後続で確認する。

### U3 — Terrarium Integration

基準commit 60dd0dc448f3a67d226dc8a3c6b3afcf4709823dとの差分として、既存リンク・要素・run()・iframe APIを共通runtimeへ接続する。tool/ref/run/fixture/cwd/base、ready情報、code/output、transcript、イベント順序/回数/fields、tool切替、キーボード/フォーカスを保つ。低層stderr/bytesを既存transcriptへ混ぜない。対象外shell構文は識別可能な失敗とし、汎用shellは作らない。

FR5.4の9セルと未承認親origin拒否を保ち、非実行ケースをguest副作用のoracleでも確認する。状態の内部表へ直接アクセスせずU1の公開操作を使う。U2のref成果物を選ぶ。ローカルtarballで連携を実装・検証できるが、公開済みRCを使う実受入れとは区別する。terrariumの変更対象を具体化してから必要な書込み権限を取得する。

### U4 — Release Assurance

U1候補の同一性、U2供給物、U3基準/差分/実結果をReleaseEvidenceへ集約し、ReleaseDecisionを所有する。Node/Worker/browserを含む固定された第一者配布JS全体の80%行coverage、未import/未収集の欠落検出、統合前CI、native比較、probe8項目・指定回帰・aube-1645・pitchfork-basicを担当する。テストはmainで逐次実行し、既存上限を緩めない。

公開source/history/packの具体一覧、機密/依存/取得元/license/notices、dirty=false、Trusted Publishingの公式仕様と実設定を確認する。候補・版・tag・dist-tag・GitHub Releaseの対応と模擬/実操作証拠を区別する。公開先作成/push、RC公開、stable公開はそれぞれ具体的な人間承認を得る。

RCは公開前条件と最小consumer成功で判定する。実terrarium受入れ未完了だけではRCを拒否しない。公開済みRCのU3受入れと全必須NFR・stable差分検証後にstableを判定する。失敗・欠落・未承認時は公開を止め、既知の版へ誘導し、上書き/削除で直さない。

## Implementation Notes and Constraints

Unit間payload/型/エラー/中止時commit/資産URL/ref manifest/証拠同一性はContract Designで固定する。内部runtimeとnpm候補は同じconsumer配布境界にあるためU1へまとめ、Entity ownershipは元catalogueどおり保持する。8Unit案は層間受渡しを増やし、1Unit案はnpm・guest供給・UI・公開の独立した変更境界を隠すため、承認済み4Unitを採用する。

jjとmise実体を使う。ゲストnetwork/daemon、JIT、paludarium実装、JSR/Rust配布、追加guest、新UI/性能SLOは追加しない。probe600秒、aube browser840秒、pitchfork browser600秒/Node120秒、1worker、retryなし、native一致、wasm1GBを維持する。実機Safariは未検証と記録する。Unitの完成は外部公開承認を兼ねない。

## Assumptions & Open Questions

見積り・CI認証・配布権限・実行互換性は未検証。Contract Design以降で技術契約を固定し、Delivery PlanningでBoltと期待demo・検証コマンドを確認する。本書は実装の経済的順序・critical pathを選ばない。
