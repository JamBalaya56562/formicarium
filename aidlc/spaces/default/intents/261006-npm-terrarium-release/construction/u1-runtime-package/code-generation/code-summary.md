# Code Summary — u1-runtime-package

## Scope and Implementation

ドキュメント根拠：承認済み計画と Testing Contract に従い、U1 の9 stories・28 AC・16詳細NFR・13 BRを実装対象とした。private local RC `@aletheia-works/formicarium@0.1.0-rc.1`。固定13第一者JS、公開exports6、tarball inventory23 files。shared入口はError/decode、Node/browser環境入口はcreateSession。guest/registry/旧CLI/session/service worker/vendor/fixture/開発依存は配布外。

変更一覧の正本は `source-manifest.json`。main生成のstaging/計測copyはGit-ignoredの証拠なのでsource-review claimsへ含めず、別のcandidate/coverage manifestで結合する。third-party dist/blink build出力とnative guest ELFはartifact provenanceとして記録し、第一者authoringとは扱わない。runtime errors/validation/state/lifecycle/protocol/worker-execution/public、既存 core/guest-io、Node/browser API/Worker、型3、package/lock、ESLint、staging/archive verifier/coverage helpers、tests/package、README/THIRD_PARTY_NOTICES、`.gitignore`、build-guests shell portabilityを含む。生成package-lockもclaim済み。ローカル `.artifacts/` のtarball/staging/計測copy/compiled fixtureはignoreし、公開候補へ混ぜない。

状態は所有copy、seedは全体検証後に生成。不足親0755、明示dir mode優先、root component境界、中間symlink拒否、inode整合、lstat snapshot/hardlink復元を実装。guest ELF64/x86-64/static executableのheader/program bounds、PT_LOAD/PT_INTERP、args/env/NUL/期限等を受付時に検証する。

doneは候補として保持し、cleanup成功→abort/dispose再確認→snapshot原子commit→予約解除→settle。古いrun世代は不採用、current形状/sequence/aggregate不整合はEXECUTION。正常非0exitはresolve/commit。失敗snapshotはSNAPSHOT、timeout/abortは前stateを保持。終了確認不能はEXECUTION、安全な元codeをcauseに保持してsessionをDISPOSEDへ移す。公開既定600000msとcleanup watchdog1000msは維持。

core固有factory/argv/locateFile/FS取得とpthread対応はcore.mjs。browser強制outer terminate後の実idle pthread活動残存を観測し、generic host-owned child brokerを追加。coreがChildWorker proxyを供給し、browser adapterがsame-origin/options/run identityを検証して実Workerを所有する。outer/child全terminateをhostで同期実行し、CPU-blocked Workerの協力を要求しない。Emscriptenがbrowserにも付けるNode-only workerDataはcore境界で除去する。MessagePortを双方向relayする。必要Worker assetのfetch/body preflightは受付deadline内に実施し、同期ownership handleを先に返す。abort/dispose/deadlineはfetchを取消しlate completionでWorkerを生成しない。Nodeはplatform Worker.terminateのPromiseを待つ。browserをNode相当のack保証とは記述しない。

## Current Rework — Steps 14–22

検証済み：現Testing Contract `ce013e1551c9c06de1a756c04942d606c8dffe82caf0ae8422f95df28968c638`、runner-ready3/3。loader差替えRedはNode2件と3browser各1件で、実生成factoryのfixture正常exit/output後に未照合marker1 != 0を観測。fake importを根拠にしていない。Node最初のURL object fixture失敗は対象Redではなくharness不備として除外。隔離ディレクトリ内の実pthread termination Promiseを待ってからfixtureを削除する。

現実装：照合済みbytesをhost run resource channelへ送る。Nodeは0700専用ディレクトリの排他的0400 blink.mjsコピーからroot/pthreadが同じbytesを評価。browserはhost所有Blob moduleから同bytesを評価し、literal blink.mjsと当該Blob baseのみcore URL bridgeでsame-origin HTTP package-worker bootstrapへ解決する。Blob原文の置換/evalはしない。hostがroot/childrenのhandleを所有し、停止後にtemp/Blobを回収。Node root termination Promise、作成中allocationの完了も待つ。core固有名/URL変換/bootstrapはcore.mjsに閉じる。CSPに明示script-src blob:とwasm compilation許可が必要で、拒否はASSET_LOAD。任意foreign/Blob child URL拒否を維持。

検証済みの中間観測：Node unit34成功、追加core資源/bridge13成功。中間v5 SHA256 `395a206586927bea4180b5f68ba53f30d33aad0e10f110b4b518bdff291d6e4a`、Node consumer7成功。3browser mutation/CSP許可・拒否/Blob正常・abort・timeout・dispose回収12成功（2.8m）。Chromium直接mutation harnessの初回停止は中断した未完了観測で、原因は未特定。childエラー転送と30s期限追加後のmarker0/fixture正常結果を記録し、特定raceの修正と推測しない。

検証済み：cwd Redはunit ENOENT/Node実consumer CORE_INITの2失敗、3browser実consumer CORE_INITの3失敗。guest-io preRunは欠けたparentsを外側から0755で作ってcwdを作成。既存modeは保持、lstatでfile/symlink衝突を拒否。cwd/guest/state unit20成功。追加lifecycleの削除cwd snapshot cleanup/abort rollback/reset seed mode・hardlink oracleもNode104件の成功で検証済み。

現時点の中間v6 SHA256 `490940bcb86f05877e5841c1e258cde091e93a32b897624f74f2be8167e17166`。最終v7 `.artifacts/u1-package-v7.manifest.json`、tgz SHA256 `969e9fab854d4499da1d38087bd601b65042b6d50b086c8fc8ddaefd0752f810`、空consumer `/private/tmp/formicarium-u1-consumer-v7` のstage/pack/archive verify/install成功を検証済み。v6との差はREADMEのみでruntime SHAは同じ。検証済み：v7 Node pack/consumer/nested19件全成功、runtime bytesが同一のv6 3browser consumer/nested/broker48件全成功、v7追加cwd rollback/reset・resource通知21件全成功。Node unit/type/helper104件、ESLint13JS+3helpers成功。既存build/runner/sessionは30成功・2失敗（pitchfork成果物欠落、旧baselineと同じ）。旧v4 coverage90.27%を現sourceの合格に流用しない。配布JS追加なし。

## Candidate and Provenance

検証済み：core buildは blink.lock `4b5c67d518b0504e13ccde7ba7823f9b6e467c4c`、dirty=false、Emscripten6.0.10、JIT無効、wasm最大memory1GB。loader132512bytes、wasm455584bytes。既存guest hello/exit3/probeをbuildしstatic ELF check成功。test-only Rust fixtureのSHA256 `f061ed9273f3ecd2a535ca585f0a5c10615960caed4fc51dee60ecb17ba3c338`、native seed→verify/bytes/thread-exitのoracle成功。guestをruntime tgzへ同梱しない。

stagingは新規/空の `.artifacts/` 配下だけに固定一覧をcopy、dirty/commit/digest不整合を拒否。staged build-infoは既存metadataを保存しloader/wasm SHA256 tupleを追加するため、dist build-infoと同一bytesとは主張しない。実tar inventory/digest/exports/privateを検証してexact tgz SHAをmanifestにbind、空repo外consumerのinstalled全filesを再照合する。Emscripten/musl license全文はpinned build imageからmainが取得しnoticesへ収録、blink/zlib noticesも収録した。公開前の最終ライセンス監査はU4。

旧候補v4の履歴（今回loader/cwd変更後の合格証拠ではない）：`.artifacts/u1-package-v4.manifest.json`、tgz SHA256 `3fc9bc589c624cf5f9854c863198532e119b1467faad8e79c1b996e3ff05cc06`、consumer `/private/tmp/formicarium-u1-consumer-v4`。検証済み：stage/pack/archive verify/install、lifecycle/protocol18/18、3browser追加errors/preflight15case成功（11.5s）。検証済み：v4 Node pack/consumer/nested15/15（3955.111625ms）、3browser既存API/Worker＋consumer/nested/broker全69case成功（5.5m）。追加errors/preflight15caseも成功。最終v4計測copy Node94/94（3292.402125ms）、3browser60/60（3.7m）、coverage report exit0、固定13全141realm、594/658 lines=90.27%（floor80%）を検証済み。v3 browser consumer/nested/brokerは33case成功（5.2m）だが追加契約oracle6caseがRedのため最終候補から除外した。旧v1/v2/v3候補はidentity付き先行/Red証拠として保持。

## Tests and Evidence

全コマンド/実版/観測の正本はmain所有 `main-verification.md`。mainがinstall/build/testを逐次実行。委譲実装agentはbuild/testを実行していない。Node24.21.0、Playwright1.55.0（Chromium140/Firefox141/WebKit26.0）、TypeScript5.9.3、ESLint9.36.0、Istanbul instrument6.0.3/coverage3.2.2を使用。browser workers1/retries0。

検証済みの層試験：runner3/3、errors/validation/state28/28、lifecycle/protocol18/18、core/guest/worker20/20、shared/Node/type21/21、browser API/Worker36/36、fixed13 syntax/ESLint成功。最終fixed13＋stage/verify/coverage ESLint exit0、types正負＋coverage helper8/8（958.892834ms）成功。既存runner/sessionは復元後・core/guest変更後とも23/23成功。最終build/runner/sessionは32tests中30pass/2fail（1067.824916ms）、唯一の失敗は既存pitchfork .commit/build-info成果物の欠落。今回の初期baselineにもあった前提欠落であり、全既存suite greenとは記述しない。core build/fork7caseとrunner/session23caseは成功。core broker追加後のunitは15/15、browser既存36case成功。13component別に5以上のnamed casesを `component-test-map.json` に対応付けた。

既存欠陥はRed先行：preRun FS、inode欠落/復元、明示dir mode、特殊file omissionの5ケースが全失敗してから修正、同oracle成功をmainが確認。lifecycle done後lateWorkererrorの再現1失敗→修正→18成功。browser direct pthread wrapper timerでは初期候補のChromium abort/timeout、WebKit abortでsettle後150msにcounterが増加し、valid実pool残存を確認してhost-owned brokerを修正した。人工第三層heartbeatの先行試験は製品child生存の証明として採用しない。

非計測v1 exact tgz consumer：Node pack+consumer12/12、3browser15/15。real normal/non0/非UTF8 bytes、hardlink/symlink/mode/delete snapshot→次fresh core、spin-startedを要求したCPU-bound timeout/abort→直後run、pthread正常exitを観測。ただしbrowser強制nested停止にRedがあるためv1を最終候補として扱わない。直接2階層Node observer3/3成功。observer timerはCPU実行中pthreadでブロックされるため、停止counterだけで全active childの死や性能を証明したとは主張しない。idle実pool活動とpublic CPU中止/reuseの観測を区別する。

## Coverage and Traceability

旧v4でのNFR3.1観測（現revisionは最終候補で再検証待ち）：固定13全sourceを事前登録、未import0、shared statement countersをWorker静的依存import前にproxyへ接続し、強制終了後もhostが保持する方式を実装。source/instrumented/statement-map digest照合、planned case/realm inventory欠落のfail-closed、line union >=80%を要求する。root/mainの計測copyを用い、actual private tgzを変更しない。同Rust consumer casesの結果を非計測baselineと比較する。計測hostが所有するgenerated pthread helperは第三者assetとして包装対象外、第一者13のbootstrapを分母から外さない。coverage unit6/6は検証済み、v3 collector readinessはNode94/94、planned host+17Worker全18realm登録成功。最終v4計測copy Node94/94、browser60/60、141realms（Node host+17Workers、各browser20pages+21Workers）、594/658lines=90.27%をmainが観測。source/instrumented/statement-map digestとv4 candidate SHAをreportで照合した。80%を下げず未import0を維持した。

`traceability.json` は28AC+16NFR+13BR全57件→実在source/testの紐付け。OKは対象存在/実装対応の意味であり、全NFRの実環境合格を表さない。NFR2.1のaube/pitchfork/probe全体回帰、NFR4.2のguest network/host-sentinel全受入れ、実機Safari、CI、公開前依存/機密/ライセンス監査は未検証またはU4へ引継ぐ。prototypeの過去実績と今回の未実行suiteを混同しない。

## Deviations and Handoff

必要前提修正：macOS Bash3.2で既存build-guestsの `$image）` 等5表示interpolationがunboundとなったため `${image}）` 等へ限定修正。同commandの既存probe build成功をmainが確認。guest/probe source変更なし。既存probeはscratchを削除するため、test-only Rust fixtureを追加してpersistent links/modes/deletion/bytes/CPU spin/threadケースをnativeに確認した。配布外。

承認済み差分：aube838000ms、probe/pitchfork browser598000ms、pitchfork Node118000msをconsumer受入れ用run budgetとして提案承認済み。外側840/600/120秒、公開600000ms、1worker/retry0、全13coverage80%を緩和しない。今回aube/pitchfork実受入れを実行したとは主張しない。

未検証：実Safari、全probe8項目/aube native一致/pitchfork品質回帰、host全heap上限、実公開、CI、負荷/性能計測、任意悪意JS/guestに対するOS sandbox保証。JIT、core fork/lock変更、guest製品配布、terrarium編集、remote作成、push/publishは範囲外。統合前CIと全体回帰/公開条件はU4へ渡す。旧v4観測は履歴として保持し、現revisionの最終候補とcoverageは別に記録する。stage review・approval・lifecycleはmainが所有する。

## Historical v4 Local Evidence Artifacts

候補manifest `.artifacts/u1-package-v4.manifest.json`、report `.artifacts/u1-coverage-v4/coverage-report.json`、statement metadata `.artifacts/u1-coverage-v4/coverage-metadata.json`、Node realms `.artifacts/u1-coverage-v4/coverage-node.json`、browser realms `.artifacts/u1-coverage-v4/browser-results/**/coverage-realms.json`。これらはmachine-local ignored生成物。command/version/count/候補SHA/coverage/limitationsのversion-controlled要約は本書とmain-verification.md、57件のtargetはtraceability.json。計測結果を速度比較・本番性能・CI合格として扱わない。

## Final Revision Verification

### Checkpoint cleanup oracle correction

検証済み：変更はtests/package/consumer.test.mjsのみ。旧回収oracleが共有tmpの別ownerの正常削除を誤失敗にすることを実ownerによる決定論的Red（1fail、175.344208ms）で確認した。withCleanupOracleは私有tmpへTMPDIRを一時設定してfinallyで元の存在状態と値を復元する。正常・abort・timeout・disposeの既存4runは、出力中に実loader存在・候補SHA・0700/0400を観測し、settle後に私有領域が空と確認する。別ownerの存在/削除は無関係、私有ownerを意図して残した対照はERR_ASSERTIONとして検出する。全体tmpの古い残存物を勝手に削除しない。

計画時の推測訂正：直接mutation fixtureはresourcesを既に渡し、fixture.disposeもawaitしている。localOwnerの未await回収をこのcallerの原因とは扱わず、冗長な変更をしなかった。元checkpointで消えたdirの所有者は未確認。今回のRedは誤失敗の機構を証明するが元dirの同定を意味しない。

main検証済み：scoped2pass2043.586792ms、v7全Node pack/consumer/nested20pass5741.012833ms。fresh coverage-v9 Node107pass6057.623125ms。Worker追加0、予定26Node realms不変。v8/v9 metadataの13source/instrumented/statement-mapおよびlayout全体がdeepEqual。browser製品・試験が未変更のため、既存v8 browser99passの保存済み収集と新v9 Nodeを結合しreport exit0、1253realm、695/758行91.68%。browserを今回再収集済みとは主張しない。workspace runtime13+README、実tgzはv7 manifestと一致。最新正本は.artifacts/u1-coverage-v9/coverage-report.json、browser provenanceは.artifacts/u1-coverage-v8/browser-results。承認済みv7 checkpoint再検証はレビュー記録後に行う。CI・全体guest・実Safariは未検証。

検証済み：coverage-v8は候補v7の固定13JSを計測し、Node106件（6486.849167ms）と3browser99件（8.3m）が全成功。予定realmを全件照合し1253realm、695/758行=91.68%、閾値80%を通過。source/instrumented/statement-map digestを照合した `.artifacts/u1-coverage-v8/coverage-report.json` が正本。初回coverage-v7はIstanbulのnew FunctionがCSPに拒否され2失敗したため採用せず、globalThis参照へ設定しCSPを変えず再収集した。新helperはESLint成功。

検証済み：最新browser-errorsの15件全成功14.0s（preflight中abort/timeout/dispose、unsupported major、Worker404）。最終候補とworkspace runtime13+READMEの14ファイルdigest一致。今回のloader/removed-cwdの実core RedからGreenを確認し、mode/seed/rollback/reset/補助Worker停止とhost資源解放を検証した。全体CI・実Safari・aube/pitchfork/probe全受入れは未検証。

生成copy v7/v8とpackage staging v7はGit-ignored証拠でありsource-manifestから除外し、candidate/coverage digestを別途照合した。2件の追加FS試験とCSPを守るcoverage設定はmainが補完した。担当agentの最終追記は自動安全判定で中断されたが、既存の保存済み製品修正を検証し、実行結果をmain-verificationへ記録した。新しいcheckpoint検証コマンドはv7用を人間に提示する必要があり、旧v4 proofを流用しない。
