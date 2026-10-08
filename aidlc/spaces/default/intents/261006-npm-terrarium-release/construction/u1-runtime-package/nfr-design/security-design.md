# Security Design — u1-runtime-package

## Sources

ドキュメント根拠：security-requirements.md NFR1.1–NFR7.4、tech-stack-decisions.md、functional-spec.md、contract-summary.md C1/C2/C8、components.md。終了確認不能時は人間Q1「1」。本設計はU1 libraryの追補。製品動作は未検証。

## SD1 — Environment and Asset Boundary

NFR1.1/1.2/5.1。shared入口はNode builtinを読まない。環境別APIが自身に相対のWorkerとassetsを解決し、明示Assetsはconsumerの責任で再配置する。browser Workerのsame-origin、SharedArrayBufferとcrossOriginIsolated等を開始前に検査し、不足はUNSUPPORTED_ENVでguest未開始。通信取得/不整合はASSET_LOAD、factory初期化だけCORE_INIT。C2の明示URL・CORS/CORP条件を維持しblob等の自動迂回をしない。

loaderは実行JSでありconsumerが指定した任意loaderを安全なguestと同じ信頼度と扱わない。同梱loader/wasm/build-info/lock/noticeのdigest対応はpack段階で検証する。任意consumer asset URLが信頼済みとなるわけではなく、guest隔離保証は承認済み同梱coreを前提とする。ゲストnetwork非対応とhost資産通信を分ける。

## SD2 — Input and Snapshot Boundary

### SD1追補 — 照合対象と評価対象の結合

人間のQ2回答Aに基づくR-01修正設計。元URLを照合後に再importする成功経路を廃止する。loader/wasm/build-infoを取得・検証した後、run所有の独立したloader bytesを評価対象へ渡す。HTTPのCache-ControlやURL名だけを不変性の証明にしない。評価先の準備に失敗したらASSET_LOAD、対応環境・明示CSP条件不足はUNSUPPORTED_ENVまたは取得不能としてguest開始前に拒否する。実装時にcode分類を固定し、CSP拒否をCORE_INITやguest exitに混ぜない。

Nodeではadapterが非公開の一時領域（directory 0700、loader file 0400、排他的作成）へ同じbytesを置く。ファイル名をblink.mjsとして生成loaderの相対pthread参照を同じコピーへ向ける。元loader pathは再取得しない。一時領域はrun所有で、実行中に書換えず、nested Workerの終了後に削除する。guest FSへmountしない。資産取得から一時領域の準備も既存deadlineに含める。任意のhost nativeコードや同一OSユーザーの侵害を防ぐsandboxとは主張しない。

browserでは照合済みbytesのみから所有Blob moduleを作って評価する。consumerはCSPのscript-src（または適用される代替directive）でblob:を明示許可する。policyを自動で緩和せずeval/unsafe-evalを使わない。元asset取得のCORS/CORPとCOOP/COEP・SharedArrayBufferは維持する。rootと補助WorkerはHTTP(S)のsame-origin package bootstrapを使い、外部Worker URLをBlobで迂回しない。任意のBlob URLをchild-createで受付けない。

生成loaderのimport.meta.urlと相対pthread起動の結合はCoreAdapterで扱う。core所有の照合済みBlobと既知のblink補助参照だけを、同一origin bootstrapと同じloader bytesへ結合する。一般URL解決の変更、consumerが指定した別URLの暗黙置換、未照合sourceの文字列評価は行わない。bootstrapは同じrun/version/世代とloader digestを検査し、初期化前の通知を順序保持して渡す。補助Workerで元asset URLを再importせず、同じ照合済みbytesを評価する。pthread固有知識はcore.mjsへ閉じ、host brokerは所有・URL/形状/identityの一般検査と終了だけを担当する。

所有Blobのrevoke、一時領域の削除、補助Workerの終了を既存cleanup barrierへ含める。作成途中の失敗も所有resourceを残さない。正常・abort・timeout・disposeで確認する。Nodeのdata URLは生成loaderのcreateRequire(import.meta.url)と相対Workerに適合しないため採用しない。Blob URLへの相対参照を未対応のまま成功扱いにせず、実core pthreadで検証する。本方式の実装・動作は未検証。

R-01のoracleは、最初に正しいloader bytesを取得した後に元URL/fileを別loaderへ変更し、その後の評価が正しいbytesに結合され、変更loaderのmarkerが一切動かないことを確認する。単なる同一URL引数のassertionでは代替しない。Nodeと3browserでnormal/pthread、CSP拒否、CORS/隔離不足、任意child Blob URL拒否、cleanup後の再runを検証する。

### SD2追補 — 削除済みnested cwd

R-02修正では、復元済みstateのroot境界を確認してから不足親を外側からcwdまで順に作成する。自動dirは0755、既存dirの明示modeは変更しない。中間file/symlinkは拒否し、既存seedとhard-link/symlinkを保持する。run成功時だけ再作成dirをsnapshotへcommitし、異常runでは前stateを保持する。setCwd→祖先remove→runの公開操作列をNode/3browser実coreで確認し、偽FSにも親不存在を拒否する条件を追加する。mode/reset/rollbackを併せて検証し、修正前の失敗をmain sessionで観測してから実装する。

NFR4.1–4.4。受付時の形状・ELF header bounds・PT_INTERP・args/env/path/mode/inode検査は共通validation責任。入力全件を検証してコピーした候補seedを構築し、成功時だけstateへ渡す。パスは..を消して許可することなく拒否し、root境界をcomponent単位で比較する。途中symlinkは公開操作でfollowしない。初期親は0755で補い明示modeは最後に適用して順序差を消す。

workerにはコピーしたstateだけを渡す。restore/snapshotの実行時FS機構とcore参照はCoreAdapterに閉じ、host FSのmountを設けない。snapshotはlstat相当でlinkを追跡せずinodeグループとmode/削除を記録、特殊file/外部target/不完全なroot状態を全体失敗として返す。hostでもsnapshotを独立検証し、所有stateへ直接書き込むmessageを許可しない。

公開readFile/listEntriesはcopy、removeは原子的。別sessionへbuffer/inode identityを共有しない。guest network拒否とhost sentinel不変を試験する。任意の悪意あるJS loader、host native任意コード、JS/OSの完全なメモリ隔離を保証する設計ではない。

## SD3 — Lifecycle and Commit Barrier

NFR2.1/2.2/7.1/7.3/7.4。以下はfunctional-spec.md Run Workflow9–10とTermination/terminating行に対する明示的追補である。先行レビューR-01の対象文書自体は未改訂で、そのレビューを合格済み実装と扱わない。ここで具体化した順序を実装計画に取り込み、矛盾する旧順序を実装しない。

1. 同期にactive予約、入力copyと開始時刻/deadlineを保持する。受理後からcore/guest/snapshotまで同じdeadline、各current通知の採用にもdeadline/signalを検査する。
2. current doneと完全snapshotを検証して成功候補として保持する。この時点ではcommit/resolveしない。terminal処理を一つに絞り、後続通知を採用しない。
3. listener/timer/fetchを止め、Workerとcore所有の補助Workerを後始末する。Node adapterはterminate完了をawaitする。browser adapterはWorker.terminate呼出しの成功をplatform提供の終了操作として扱う（Node同等のexit acknowledgementがあるとは主張しない）。nested pthreadの所有・終了は実試験で確認する。
4. cleanup成功後、まだdispose要求がなく受付期限内にsnapshot完了した正常候補なら、SessionStateが一度だけ原子commitする。非0exitも正常。cleanup中のabort/disposeが確定した場合は候補を破棄する。
5. state/次phase確定、active予約解除を先に行い、最後に結果を一度settleする。正常resolve直後のFS操作/次runはBUSYにならない。

| 終端条件 | cleanup | state / 次phase | Promise |
|---|---|---|---|
| normal exit（非0含む） | 成功 | 候補commit、idle | resolve RunResult |
| input/core/snapshot/callback/timeout/abort失敗 | 成功 | 前state、idle | 当該codeでreject |
| dispose要求 | 成功 | 所有state破棄、disposed | active run ABORTED、dispose resolve |
| cleanup失敗または終了を確認できない | 失敗 | 候補rollback、所有stateへのアクセス不可、disposed | EXECUTION、safe causeに元TIMEOUT/ABORTED等を保持 |

Node終了待ちを無限にしない。内部cleanup watchdogは1000msを設計値とし、失敗するとdisposedへ移しsettleする。これはguest受付deadlineの延長ではない。既存probe/aube/pitchforkの外側上限は変えず、その内側でrun deadlineとcleanup予算を確保する。最大上限と完全に同じtimeoutを使ってcleanup猶予を後付けする試験は設計しない。遅れたtermination成功を新runへ転用せず、失敗sessionの自動復活も行わない。残存Workerの完全停止を証明していない状態で停止済みと報告しない。

disposeは呼出しを共有する一つのcleanupへ束ね、初回cleanup失敗をEXECUTIONで返す。状態はdisposedのまま、以後disposeは冪等、他操作DISPOSED。disposedのstateは再利用しない。cleanup failureの二重reject/unhandled rejection、古いmessage、doneとabort競合を注入して確認する。

## SD4 — Protocol and Safe Diagnostics

NFR4.3/7.1/7.2。C8のversion/session/run/generation/sequenceとpayloadを共通protocolで検査する。current不正形状はEXECUTION、古い通知は捨てる。outputはbytesのcopyとstream/sequenceを保持し、callback戻り値を待たずthrowはrollback。任意Error stack/cause/env/inputをWorker messageへserializeしない。error causeは安全なcodeと固定説明を使う。秘密入りstdoutを勝手に改変せずpublic証拠へ転記しない。

運用telemetryや新ログサービスは設けない。受入れ用秘密なしfixture、command・環境・version・build-infoとstdout/stderrの別artifactをU4へ渡す。resetはseedへ戻し、disposeは所有参照を破棄するだけで暗号学的メモリ消去とは主張しない。

## SD5 — Core Isolation and Coverage Controls

NFR3.1/6.1/6.2。core.mjsにfactory/argv/locateFile/FS知識を閉じ、registry未登録guestで固定JSの変更なしに実行する。browser coreロード前のdelete Atomics.waitAsyncを維持する。MEMFSの抽出・復元の責任はGuestExecutionだが実コアFSの取得方法はCoreAdapterへ隔離する。

固定JS13ファイルはfunctional-specの一覧。test専用コピーでIstanbul statement instrumentationを行い、製品tarballは非計測のまま実ロード/型/資産検証する。全一覧からゼロcoverage metadataを事前生成、source digestとmapを固定し、未importファイルも分母に残す。Nodeとbrowser realmごとのstatement countersをSharedArrayBufferへ結び、hostが強制終了後も読めるようにする。一つのrealmに一つのwriter領域を割当て、counter割当てと登録をimport前に済ませる。Function/branch countersの閾値は追加しない。

集計はsource path/digest/statement-mapの一致を確認し、同一lineへexecuted unionを取る。二つのrealmの行数を足さない。各予定realmの登録/開始/終了操作とcounter領域の受取りを照合する。未開始と確認したfileは0、開始したのにcounter map/領域がないケースはmissingで失敗にする。欠落を0成功に偽装しない。critical対象moduleの初期化counterもproxy/preamble順序を検証し、bootstrap自身を分母から恣意的に除外しない。

実験で確認したのはNodeと3browserの小ESM Workerにおけるnormal/CPU-bound terminate後のstatement保持と、未import fileのゼロ分母だけ。製品全13JS・real blink・nested pthread・realm登録の欠落検出は未検証でありCode Generation/U4で別oracleを確認する。計測によりcodeの意味が変わらないことを非計測tarballと同じfixture結果で比較する。計測は性能測定と分け、性能値に流用しない。

## Verification Strategy and Remaining Risk

SD1–SD5の成功/失敗/境界fixtureをmainで逐次実行する。U1小consumerはNode/3browser、欠落asset、無隔離、非0/bytes、不正path、snapshot/link/mode、正常直後の再操作、timeout/abort/cleanup失敗を含む。NFR2の上限、U4の全体回帰/80%/統合前CIを下げない。AWS/account認証、DB、license法的保証、host heap総量の上限、Safari成功は追加しない。外部公開は具体的な承認後。実装成功は未検証。
