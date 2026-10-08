# Main Verification — u1-runtime-package

## Observed Commands

すべてmain sessionが逐次実行。未完了・未検証を合格へ変換しない。

| Command | Observed result |
|---|---|
| Node24.21.0 --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/session.test.mjs（製品変更前） | exit1、32tests/24pass/8fail/0skip。blink/guest資産欠落、clone未完了HEAD、sleep欠落による127など。事前baselineであり変更後regression結果ではない |
| npm install --ignore-scripts --no-audit --no-fund（既存temp cache） | exit0、133packages、approved5devtools版はrunnerで確認。ESLint9.36.0 unsupportedのnpm警告あり |
| Node24.21.0 --test tests/package/runner-ready.test.mjs | exit0、3tests/3pass/0fail/0skip、465.886833ms。自タスクのDocker buildをpause→試験→unpauseして同時実行を避けた |
| BLINK_SRC=.vendor/blink FORMICARIUM_CONTAINER=docker CONTAINER_EXTRA_ARGS='--platform linux/amd64' bash scripts/build-blink-wasm.sh | exit0。emsdk6.0.10 image sha256:e077d54e2b8970575ebc4f185ac1de0b95c05f2b266134d4ba27449af7aebf65。build-info：commit4b5c67d518b0504e13ccde7ba7823f9b6e467c4c、dirty=false、disable-jit、MAXIMUM_MEMORY1GB。loader132512bytes/wasm455584bytes |
| Node24.21.0 --test tests/package/errors.test.mjs tests/package/validation.test.mjs tests/package/state.test.mjs | exit0、28tests/28pass/0fail/0skip、65.403917ms。errors6/state10/validation12 |
| FORMICARIUM_CONTAINER=docker CONTAINER_EXTRA_ARGS='--platform linux/amd64' bash scripts/build-guests.sh probe（修正前） | exit1、line45 imageに続く全角括弧をbash3.2が変数名として解釈しunbound variable。修正後同commandはこの行を通過、Rust build進行中、終了結果は未検証 |
| 同probeビルドcommand（brace修正後） | exit0、release1m12s、staticELF検査通過。exit3/hello/probe生成。rust:alpine image sha256:0cce0a5e0e8ba67b455257a3a02a1d99005f382748789d6464460028810f1627。guestソース変更なし |
| Node24.21.0 --test tests/node/runner.test.mjs tests/node/session.test.mjs（成果物準備後、core/guest変更前） | exit0、23tests/23pass/0fail/0skip、1018.966291ms。hello/exit3/CLI timeout、既存session構文/registry/cat互換の事前baseline |
| Node24.21.0 --test tests/package/lifecycle.test.mjs tests/package/protocol.test.mjs（初回） | exit1、18tests/17pass/1fail。done候補後late Worker errorがEXECUTIONで正常結果を上書きする欠陥を再現 |
| 同lifecycle/protocol command（修正後、oracle不変） | exit0、18tests/18pass/0fail/0skip、111.47525ms。中止/disposeだけ候補を取消し、lateWorkererror/exitは正常候補を上書きしない |
| Node24.21.0 --test tests/package/core.test.mjs tests/package/guest-io.test.mjs（既存source修正前） | exit1、5tests/0pass/5fail/0skip、62.046709ms。factoryPromise前exitのsnapshot欠落、snapshotinodeId欠落、hardlinkrestore分離、明示dirmode消失、特殊file黙落ちを再現。独立MemoryFS oracleでありrealcoreの代替ではない |
| Node24.21.0 --test tests/package/core.test.mjs tests/package/guest-io.test.mjs tests/package/worker-execution.test.mjs（修正後） | exit0、20tests/20pass/0fail/0skip、75.400584ms。元5欠陥と資産digest tuple、不正build/CORE_INIT分類、stream bytes/sequence/cleanupを確認。realcore/nestedの代替とはしない |
| Node24.21.0 --test tests/node/runner.test.mjs tests/node/session.test.mjs（core/guest修正後） | exit0、23tests/23pass/0fail/0skip、713.211042ms。変更前23passと同じoracle。性能比較ではない |
| Node24.21.0 --test tests/package/public.test.mjs tests/package/node-api.test.mjs tests/package/node-worker.test.mjs tests/package/types.test.mjs | exit0、21tests/21pass/0fail/0skip、1268.498625ms。realhello/exit3の公開API、即時再実行、rawWorker不正protocol、NodeNext型正負fixture。まだ実tgz consumerではない |
| Playwright browser-api.spec.mjs/browser-worker.spec.mjs、tests/package/playwright.config.mjs、workers1/retries0 | exit0、36passed/27.4s。Chromium/Firefox/WebKit各12。隔離不足・cross-originWorker拒否・中止/bytes/API・waitAsync削除等。CPU-boundはtest-onlyWorker、realguest/nestedの代替ではない |
| ESLint fixed13配布JS + scripts/package/stage-package.mjs | exit0、診断なし |
| Node --check fixed13配布JS | exit0、13files PASS |

## Limits and Remaining Verification

最終v4（検証済み）：browser API/Worker/broker/consumer/nested合計69pass (5.5m)、別errors/preflight15pass (11.5s)。計測copy Node94pass3292.402125ms、browser60pass (3.7m)。report exit0、固定13JS、141realm全収集、line union 594/658=90.27%、80%基準達成。全13source/digest/statement-mapが同v4候補に一致。計測・非計測consumerに同guest/bytes/state/timeout/abort expectationsを適用して成功。ESLint配布13+stage/verify/coverage exit0。types+coveragehelper8/8pass958.892834ms。

既存build/runner/session最終観測：exit1、32tests/30pass/2fail/0skip、1067.824916ms。2failは初期baselineにも存在した dist/guests/pitchfork、pitchfork.commit、pitchfork.build-info未生成のみ。core lock/dirty=false/JITなし/wasm cap関連、fork/static ELF、runner/session23件はpass。既存全体greenとは主張しない。U4 guest全体回帰/CI・実Safari/公開は未検証のまま引継ぐ。

v4エラー契約修正Green：lifecycle/protocol18/18pass108.571125ms。browser-errors全3browser15pass11.5s（元6Red oracle不変＋preflight abort/timeout/dispose9cases）。v4 stage/pack/verify/install exit0、23files、tgz SHA256 3fc9bc589c624cf5f9854c863198532e119b1467faad8e79c1b996e3ff05cc06。空consumer-v4のNode pack/consumer/nested15/15pass3955.111625ms。sameidentity不正major EXECUTION、rootWorker404 ASSET_LOAD、fetch取消後lateWorker0を確認。v4 browser総回帰69caseと固定13全realm coverageは実行中／未検証。

追加エラー契約Red：browser-errors.spec.mjs workers1/retries0、exit1、6/6failed。全3browserで同identity不正major child-controlはEXECUTION期待にTIMEOUT、missing rootWorker404はASSET_LOAD期待にEXECUTION。oracle不変で修正予定。

v3計測収集readinessのみ：instrumentedcopy Node12files --test-isolation=none、exit0、94/94pass、3325.003209ms。coverage-node.json exact18realm（host+worker1..17）全登録counts[0]=1。まだbrowser全realm/lineunion/80%は未検証。現在修正中の最終sourceへ再計測が必要であり、この結果を最終受入れとはしない。

v3修正：core側でgenerated workerDataをbrowser向けoptionsから除去。core/worker-execution15/15pass65.840417ms。stage/pack/verify/install exit0、tgz SHA256 ca43b709fc4b5c7bfc6379e62de59624af99e365dee3038cb8cf213dcb0668f4。Chromium normal/nonzero個別1pass11.8s後、consumer/nested/broker全3browser33pass (5.2m)、exit0。直接real pthread wrapper timerで全normal/abort/timeout counter増分0→即時run成功。generatedcore options互換とhost管理child停止のGreenを確認。browser rootWorker404分類とcurrent不正major child-controlは追加検証中。v3の全sourceから13JS instrumented copyを準備したが、coverage計測・最終candidate適用はまだ未検証。

Broker初回修正 v2：core/worker-execution unit15/15pass65.649875ms、既存browserAPI/Worker36pass22.4s。v2 stage/pack/verify/install exit0、23files、tgz SHA256 3bd7d8b73514e39495aca3fa73225739531a4ce94745b51a4ffa2d7f61ebb768。Node pack/consumer/nested15/15pass3956.143416ms。

v2 realbrowser consumerはRed：Chromium normal/snapshot/timeoutがchildControl EXECUTION。診断のため停止exit130、3failed/1interrupted/20notrun。読み取りでgenerated blink.mjsの実Worker options `{type:"module",workerData:"em-pthread",name:"em-pthread"}`を確認。browserが無視するNode専用workerDataがgeneric host allowlistに拒否されるため、core固有adapter内で正規化する追加修正予定。

直接2階層oracleの追加Red（検証済み）：Node nested3/3pass、3748.260875ms。browser nested workers1/retries0 exit1、6pass/3fail (2.0m)。real pthread wrapper内timerに人工第三層なし。Chromium abort129→134/timeout6930→6937、WebKit abort138→156とsettle後150ms counter増加。全normal/Firefox全3/WebKit timeoutはpass。CPU実行中childのtimer停止自体は死の証明ではないが、idle実pool child活動残存は観測済み。host所有descendant brokerで明示停止する修正を実施予定。閾値/oracleは緩めない。

Browser nested追加初回は未達：Chromium normal/abort/timeoutで人工的第三層heartbeat counterがsettle後150msも149→184/141→205/7860→7929と増加。主セッションが診断のためCtrl-Cで停止、exit130、3failed/1Firefoxinterrupted/5notrun。観測用追加Worker自体の独立寿命とreal pthread停止を区別する必要があり、この失敗だけで製品pthreadが生存したとは断定しない。直接pthread realm内timerのoracleへ修正して再確認予定。

Step11 browser追加（検証済み）：同exact tgz installed consumerのみを配信。Playwright consumer.spec.mjs workers1/retries0、Chromium/Firefox/WebKit各5、15passed (3.2m)、exit0。real bytes/非zero、snapshot次core引継ぎ、開始stdout確認後のCPU-bound abort/timeout→直後run、pthread正常exit。実Safariは未検証。

Step11 nested Node追加（検証済み）：nested-worker.test.mjs exit0、3tests/3pass/0fail/0skip、4102.593833ms。installed real loader/wasm/package-workerをtest-only wrapperからimport、実pthread descendantに観測用heartbeat Workerを追加。normal/abort/timeoutのouter settle後150msに共有counter増分0、次run成功。追加observerがある条件の活動停止の証拠であり、非計装descendantの性能やbrowser descendant停止を直接計測したとは主張しない。

Step11追加観測（検証済み）：Rust musl fixture再コンパイル成功。native seed/verify/bytes/thread-exit exit0、stdout [0,255,128,65,10]、stderr [254,0,66,10]、非zero exit3。fixture SHA256 f061ed9273f3ecd2a535ca585f0a5c10615960caed4fc51dee60ecb17ba3c338。再実行時の残存native fixture hardlinkによるEEXISTは、試験専用 /work/kept を清掃して解消。製品source変更なし。

stage-package → npm pack → verify-package exit0、23files。npm既定cache書込み拒否は /private/tmp/formicarium-npm-cache 指定で解消。tgz SHA256 a13885101f85367707270a205a95ea5b8420bc01d6ee8e319971f59c9124f476。空の /private/tmp/formicarium-u1-consumer に exact tgz を npm install --ignore-scripts --no-audit --no-fund、exit0 added1。Node consumer+pack試験 exit0、12tests/12pass/0fail/0skip、2828.796125ms。realguest起動、非UTF8出力、hardlink/symlink/mode/deletionの次core引継ぎ、開始出力を確認したCPU spin中止/timeoutと直後再実行、pthread正常終了、全tarball/installed digestを確認。

検証済みは上記観測の範囲のみ。まだreal public API/Worker、tarball空consumer、3browser製品試験、nested cleanup、全13JScoverage、既存回帰、CIは未検証。測定/benchmarkは実施していない。aube/pitchforkの再ビルド・公開操作は行っていない。cloneはjj、DockerDesktopは既存appを起動しbuild手段として使用。

## Revision runner readiness — 2026-10-07T17:50Z

検証済み：人間のApprove Planを受領しPLAN_APPROVAL_RECORDED成功。Node24.21.0実体で `--test tests/package/runner-ready.test.mjs` を実行。3 tests/3 pass/0 fail、299.750791ms。修正Red/Green、v5候補、coverageは未検証。

## R-01 observed Red — verified

Node command: `FORMICARIUM_CANDIDATE=.artifacts/u1-package-v4.manifest.json FORMICARIUM_CONSUMER=/private/tmp/formicarium-u1-consumer-v4 /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test --test-name-pattern='real.*loader mutation' tests/package/core.test.mjs tests/package/consumer.test.mjs`. Both real generated factory/guest runs exit0 and fixture-ok, then marker assertion actual1 expected0: 2fail, 0pass, 431.979458ms. Initial harness failure filename.startsWith was corrected and is not defect evidence.

Browser command: same candidate/consumer env, `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/formicarium-playwright /Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/@playwright/test/cli.js test --config tests/package/playwright.config.mjs tests/package/consumer.spec.mjs --grep 'real loader mutation' --workers=1 --retries=0`. Chromium13.4s/Firefox20.1s/WebKit13.1s: each guest exit0 fixture-ok then marker actual1 expected0. 3failed exit1. 検証済み：照合後に原URLから未照合JSが評価される。Greenとpthread/cleanupは未検証。

## R-02 observed Red and initial R-01 Green

検証済み：v5 consumer public removed nested cwd testはCORE_INIT、guest-io unitはmkdirIfMissingの親ENOENT。2fail exit1、255.884208ms。Browser同操作はChromium12.0s/Firefox14.0s/WebKit12.5s全3fail CORE_INIT。guest-io製品修正前のRed。

R-01 main unit34pass、追加core13pass（temp0700/file0400/late allocation cleanup/限定Blob URLbridgeを含む）。初回v5 tgz sha256395a206586927bea4180b5f68ba53f30d33aad0e10f110b4b518bdff291d6e4a。Nodeconsumer7pass/2979.862125ms、mutation marker0、正常pthread/timeout/abort再run確認。Browser初回Green batchはChromium通常13.2s・pthread12.8s pass2、試験用mutation wrapper応答待ちを2.1minで中断exit130、残り6未実行。browser mutationGreenは未検証。v5は初期snapshotで現source差分後の最終候補ではない。全体coverageとCIは未検証。

## Final v7 and observed verification

候補tgz SHA256969e9fab854d4499da1d38087bd601b65042b6d50b086c8fc8ddaefd0752f810、空consumer/private/tmp/formicarium-u1-consumer-v7へinstall。v6とのmanifest差分はREADME.mdだけ（runtime全hash同一）。

検証済み：非計測v6 consumer/nested/brokerの3browser48件全pass10.6m。v7 Node pack/consumer/nested19件全pass13970.029583ms。v7追加3browser cwd rollback/reset/resource broker21件全pass1.4m。Node U1 unit/type/helper104件全pass4441.550416ms、ESLint固定13JS+package helpers3件exit0。既存build/runner/session32件は30pass2fail1245.716041ms：pitchfork/pitchfork.commit/pitchfork.build-info欠落（旧baselineと同じ）。全体回帰成功とは主張しない。

coverage-v7 prepareは固定13JSを元candidate digestで計測copy。Node計測106件全pass9745.256917ms、host+25workerの26realm全登録と予定26一致。ブラウザ99件収集中、coverage合計はまだ未検証。

## Coverage CSP correction

初回coverage-v7 browser collectはChromium30pass/CSP2fail、1interrupted、66未実行でexit130。CSP2failはIstanbul既定の `new Function("return this")` がunsafe-eval未許可でEvalErrorになった。製品の非計測CSP全6件は成功済み。CSPを変更せずinstrumenterのcoverageGlobalScope=globalThis、coverageGlobalScopeFunc=falseへ変更し、新しいcoverage-v8へ再prepare（元候補はv7のまま）。固定13JS/80%/statement-map不変。helper6件再実行pass。

## Final coverage / remaining checks

### Checkpoint cleanup oracle failure and deterministic Red

Step24–25 Green検証済み：承認済みscoped command（pattern cleanup oracle|Node host removes）は2pass、2043.586792ms。全v7 Node pack.test/consumer.test/nested-worker.testは20pass、5741.012833ms、exit0。consumer専用TMPDIR、実loaderbytes/SHA/0700/0400の稼働中観測、4終了経路settle後空、他ownerからの独立、私有資源の意図した漏れERR_ASSERTION対照を確認。

fresh coverage command：node scripts/package/coverage.mjs prepare /private/tmp/formicarium-u1-consumer-v7/node_modules/@aletheia-works/formicarium .artifacts/u1-coverage-v9、続いてnode --import ./.artifacts/u1-coverage-v9/coverage-node-preload.mjs --test --test-isolation=none .artifacts/u1-coverage-v9/tests/package/{errors,validation,state,lifecycle,protocol,core,guest-io,worker-execution,public,node-api,node-worker,consumer}.test.mjs。Node107pass6057.623125ms。v8/v9 coverage-metadata全体をassert.deepEqualで照合exit0。13source/instrumented/statement-mapおよびlayout完全一致。node scripts/package/coverage.mjs report .artifacts/u1-coverage-v9 .artifacts/u1-coverage-v8/browser-results .artifacts/u1-package-v7.manifest.json はexit0、1253realms、695/758行91.68% passed。browser側は未変更の既存v8収集であり今回の再収集ではない。Nodeの追加testはWorkerなし、予定26不変。

製品対応確認command：node --input-type=moduleのreadFile/createHash/assertでmanifest.files内runtime13+READMEと実tarball.sha256を照合しexit0、runtime13+README and tgz match v7。testのみ変更でcandidate更新なし。承認済みcheckpoint再検証待ち。

検証済み：承認済みv7 checkpoint commandは2026-10-07T19:05:41.941Z〜19:05:47.897Z、exit1、Node19件中18pass/1fail、5745.731208ms。consumer回収テストの共有tmp baselineからformicarium-core-mFjsrnが消えた比較差分。&&後のbrowserは未実行。proof id2b30722e-2c9e-4f9c-b423-b5ceeb6104ac。漏れ増加ではなく他dir減少であり、元の当該dir所有者は未確認。

ソース確認済み：consumer.testの旧oracleはOS全体のformicarium-core-*一覧を比較するため、別ownerの正常な削除も誤失敗する。loader-mutation.mjsはresourcesを明示提供しfixture.disposeでawait済み。従って計画時の「直前の直接coreにlocalOwnerの非同期回収がある」とする因果推測はこのcallerに当てはまらず撤回する。nested-worker.testは別test fileとして同時実行され得るが、元失敗の所有者同定を完了したとは主張しない。

Step23 main Red command：FORMICARIUM_CONSUMER=/private/tmp/formicarium-u1-consumer-v7 FORMICARIUM_CANDIDATE=.artifacts/u1-package-v7.manifest.json /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test --test-name-pattern='cleanup oracle' tests/package/consumer.test.mjs。exit1、1fail/0pass、175.344208ms。実installed createCoreResourceOwnerでallocateした別ownerのformicarium-core-2NscInをdisposeすると、旧deepEqualが元失敗と同じ減少方向の差分で失敗した。期待失敗をpassに変換せず観測した。

検証済み：CSP修正copy v8 Node106pass6486.849167ms、browser99pass8.3m。coverage report exit0：758total/695covered/0skipped=91.68%、1253realms、threshold80 passed。candidate969e9fab854d4499da1d38087bd601b65042b6d50b086c8fc8ddaefd0752f810とsource/instrumented/statement-map digest一致。browser-errors15pass14.0s。変更後coverage helper ESLint exit0。main/runtime13+README=14filesはv7manifest一致。
