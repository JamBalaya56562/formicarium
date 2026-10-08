# CI/CD Pipeline — u1-runtime-package

## Sources and Ownership

ドキュメント根拠：security-design.md SD1–SD5、logical-components.md、components.md、functional-spec.md、contract-summary.md C1/C2/C6/C7/C8、security-requirements.md。U1 libraryに適用するビルド/試験/候補手順を設計する。CI workflowとReleaseEvidence/公開判断はU4所有。本設計はCIや権限が動作済みという意味ではない。

## Environment and Resources

| 項目 | 構成 | 境界・合否 |
|---|---|---|
| 実行 | Node>=24、lock固定のnpm dev tools、Node Worker | mainで逐次、mise実体/declared task。CI tool版はlockと実行情報で記録 |
| browser | PlaywrightのChromium/Firefox/WebKit、1worker、retry0 | required browserを省略しない。実機Safari未検証 |
| HTTP consumer | 一時localhost HTTP server、same-origin Worker、COOP same-origin/COEP require-corp | 必須隔離成功fixtureと欠落拒否fixtureを分離。public serviceを追加しない |
| build assets | blink.lock取得元commit、loader/wasm/build-info | dirty=falseとdigest対応。既存同一成果物を再利用し不用なcore/aube rebuildを避ける |
| native oracle | 既存Linux container baseline、guest/fixtureは開発試験のみ | host networkとguest network非対応を分ける。新guest/core不具合はnativeで先に確認 |
| coverage | 非配布のinstrumented test copy、固定13JS map、realm別shared counters | 未import0、counter/realm欠落はfailed/unverified、80%以上。実tarballも別試験 |
| 保存 | 一時consumer/workdirを試験ごと分離、immutable candidate/result artifacts | secretなしfixture、所有session隔離。旧候補結果を別候補へ流用しない |

## Pipeline and Gates

以下のcheck IDsはU1ローカル手順の設計識別子。C6.checkIdの全体必須集合はU4が固定する。

| 順序・check | 処理 | 合格条件 | 所有 |
|---|---|---|---|
| P1 inventory | 固定exports/files、core/型/notices/build-info、guest/private除外、source digest確認 | 一覧差分と取得元説明があり、不一致なし | U1 |
| P2 static/type | 新規変更JS lint/format、public d.tsの正誤consumer、依存境界検査 | invalid型consumerは期待どおり拒否、browser/sharedのNode参照なし、core知識境界維持 | U1 |
| P3 state/lifecycle | input/copy/root/link/mode、bytes/non0、BUSY/stale、timeout/abort/cleanup failure fixture | 候補rollback/正常commit/一度settle、失敗session DISPOSED、正常直後再操作 | U1 |
| P4 pack consumer | 非計測の実npm tarballを空Node/browser consumerに導入 | 公開入口からguest実行、3browser成功、repo外参照なし、asset/隔離不足guest未開始 | U1 |
| P5 coverage | P2/P3/P4と対応する計測copy試験、全realm map集約・欠落oracle | 固定一覧全件と同一source、未import0、realm欠落拒否、>=80%。未観測をpassとしない | U1提供、U4全体集約 |
| P6 regressions | probe8項目・native一致、aube/pitchfork受入れを既存手順で逐次実行 | 全既定限界維持、対象指定回帰、同一core/guest provenance。未実施は未検証 | U4、U1の差分影響を引継ぐ |
| P7 evidence | tarball/digest/commands/status/stdout/stderr/実版/未検証をC6へ渡す | 必須失敗を隠さず候補へ結合、secretなし | U1結果、U4判定 |

test-afterで各層実装後に試験を追加。不具合修正は再現失敗を先に観測する。ビルド/試験を同時に走らせず、性能測定には重い並行処理を入れない。Node/browserテストを一つのmain sessionから逐次呼ぶ。wasm1GB・probe600秒・aube browser840秒・pitchfork600秒browser/120秒Nodeを維持する。

## Timeout and Failure Handoff

### 差し戻し2件の検証環境

R-01のbrowser consumer serverは、元loaderの応答を初回取得後に切り替える経路と、不一致loaderの実行markerを観測する経路を持つ。成功fixtureは明示CSPで照合済みBlob moduleを許可し、拒否fixtureはBlobの許可なし、CORS不足、隔離不足、外部Workerと任意child Blob URLをそれぞれ分離する。補助Worker bootstrapはsame-origin HTTP(S)、loader bytesは同じrunに結合する。これらの実動作は未検証。

Nodeの一時loader領域とbrowserの所有Blobはhostのrun resource registryで所有し、root Workerを強制終了してもmain/hostから解放できるようにする。Worker内finallyだけに削除を依存しない。作成直後のabort、取得途中timeout、正常終了、pthread終了、disposeで解放を検査する。一時領域のmodeと排他作成を確認し、guest FSへmountしない。CSPを自動緩和するserver挙動を製品へ持ち込まない。

R-02は空consumerでnested cwd→祖先remove→runを実行し、0755の再作成dirと既存seed/mode/link、成功snapshot・異常rollback・resetを確認する。NodeとChromium/Firefox/WebKitはmainで一つずつ、1worker/retry0で実行する。

修正前v4は失敗再現用に保持し、修正後候補は別のstaging/manifest/tgz/空consumerへ作る。各試験・13JS固定分母coverage・asset/型検査を新候補digestに結合する。登録済みcheckpointコマンドはv4を指定しているため、修正後候補のものへ変更し、既定の新しい検証コマンド承認手順を通す。全体回帰を120秒のcheckpointへ詰め込まず、checkpointと個別回帰の結果を区別する。

### 既承認の時間予算の引継ぎ

先行code planの人間Approve Planにより、外側probe/pitchfork browser600秒・aube840秒・Node120秒を変えず、内側runを598000/838000/118000msにしてcleanup1000msとharness1000msを予約する追補が記録されている。public既定600000msは変更しない。この適用範囲と数値を修正計画・試験手順へ引き継ぎ、旧文書の840000msを消して黙って整合したとは扱わない。今回の2件の修正では新たな時間予算変更を行わない。実aube/pitchforkへの影響と全体回帰は未検証である。

NFR DesignのSD3はcleanup1000msを提案しているが、同stageレビューR-01はaube run840000msと外側840秒の整合を指摘した。これは未解消であり、本書でtimeoutを短縮・延長して解消したとは扱わない。実装計画でC1/NFR2.1と外側上限の意味を明示し、人間が所見を判断するまで矛盾する試験設定を実装しない。失敗・missing・unverified必須チェックはU4へそのまま渡す。

失敗時は同じ結果を成功へ上書きしない。原因/対象/commandを記録し、必要な修正を対象範囲に限定、新候補または理由付き再実行証拠にする。試験retry0を隠れた再実行で回避しない。

## Promotion, Secrets and Rollback

U1はローカルpack候補を作成するのみ。GitHub Actionsで統合前にP1–P7とU4必須checksを走らせる設計へ引き継ぐが、remote/公開repo設定は現時点で未検証。検証jobにはpublish token/id-token権限を与えない。公開jobのみのTrusted Publishing/Release権限、信頼元/tagと人間承認はU4が具体化し、公式仕様と実設定を照合する。長期npm tokenをU1へ追加しない。

RC next→実terrarium受入れ→stable latestの順をC7どおり維持する。実公開は具体的候補の人間承認後。公開失敗時は追加公開を止め既知の版を案内し、版の上書き/削除をrollbackとして設計しない。ローカルconsumerは失敗時に一時環境を終了し候補を採用しない。blue-green等常時稼働サービスの切替を追加しない。

## Verification Status

ドキュメント根拠：上流の所有・品質・契約。検証済み：NFR Designの小coverage実験Node/3browser（製品試験ではない）。未検証：製品P1–P7、CI、実core/pack/type/coverage、Trusted Publishing、RC/stable公開。後続の実装計画は具体ファイル/コマンドと全Must AC/NFR対応を示す。
