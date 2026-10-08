# Unit Test Instructions — u1-runtime-package

## Runner and Tool Setup

ドキュメント根拠：Testing Contract test-after/Standard。製品試験は未検証。Node>=24/npmはmise lsで確認し実体pathを解決、mise exec/shimsを使わない。以下node/npmは解決した実体を意味する。ビルド/試験はmainのみ逐次。Step1でpackage-lock固定、Step2で最初にnode --test tests/package/runner-ready.test.mjs（骨格作成後）を成功させる。存在しないtestを実行済みとは報告しない。

## Unit-scoped Commands

### Checkpoint cleanup oracle correction

Step23–25のRed/Greenは `FORMICARIUM_CONSUMER=/private/tmp/formicarium-u1-consumer-v7 FORMICARIUM_CANDIDATE=.artifacts/u1-package-v7.manifest.json /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test --test-name-pattern='cleanup oracle|Node host removes' tests/package/consumer.test.mjs`。実装前に別owner解放による旧一覧oracleの誤失敗を観測し、修正後に同じ競合条件と意図した回収漏れ対照を確認する。対照の期待失敗はassert.throws等で検出し、実suite失敗をpassへ読み替えない。

全Node再検証は `FORMICARIUM_CONSUMER=/private/tmp/formicarium-u1-consumer-v7 FORMICARIUM_CANDIDATE=.artifacts/u1-package-v7.manifest.json /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/package/pack.test.mjs tests/package/consumer.test.mjs tests/package/nested-worker.test.mjs`。suite逐次、既存checkpointコマンドと品質上限は維持。test専用tmp内で実loader存在を観測してからsettle後の回収を検査し、環境をfinallyで復元する。製品13JS/README/tgzのdigest不変を確認し、計測test数・realm変更があれば予定inventoryを先に更新してcoverageを再収集する。

### Current Revision Commands and Oracles

今回のrunner readinessは `/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/package/runner-ready.test.mjs`。

Red/Green unit commandは `/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/package/core.test.mjs tests/package/guest-io.test.mjs tests/package/worker-execution.test.mjs`。実coreのRedは下記consumer.test.mjs/consumer.spec.mjs固定ファイルで旧v4を入力し、Greenは新v5へ入力を切り替えて同じoracleを実行する。

Step14–22では以下の旧手順のstaging/manifest/tgz/consumer/coverageの名前をすべてv5へ置換した唯一候補を使用する。旧v4はRedと履歴専用で上書きしない。FORMICARIUM_CONSUMERとFORMICARIUM_CANDIDATEは実行対象の唯一候補へ設定する。最新globで選ばない。

照合後の原URL差替えmarker、同bytes pthread、CSP許可/拒否、CORS/隔離、foreign Worker/任意Blob child拒否、root強制終了後のhost台帳cleanup、nested cwd公開操作順序、mode/snapshot/reset/rollbackを独立oracle化する。Nodeと3browserはmainが逐次実行し1worker/retry0。fake FSは親不存在時mkdirを拒否する。旧v4の成功を修正の証拠に使わずv5 coverageを再収集する。新checkpointコマンドは別途人間へ全文提示する。今回の結果は未検証。

### Historical Baseline Commands

1. node --test tests/package/runner-ready.test.mjs
2. node --test tests/package/errors.test.mjs tests/package/validation.test.mjs tests/package/state.test.mjs
3. node --test tests/package/lifecycle.test.mjs tests/package/protocol.test.mjs
4. node --test tests/package/core.test.mjs tests/package/guest-io.test.mjs tests/package/worker-execution.test.mjs
5. node --test tests/package/public.test.mjs tests/package/node-api.test.mjs tests/package/node-worker.test.mjs tests/package/types.test.mjs
6. node node_modules/@playwright/test/cli.js test --config tests/package/playwright.config.mjs tests/package/browser-api.spec.mjs tests/package/browser-worker.spec.mjs --workers=1 --retries=0
7. node scripts/package/stage-package.mjs --out .artifacts/u1-package-v7
8. npm pack ./.artifacts/u1-package-v7 --pack-destination .artifacts/u1-v7 --json（出力先はmainが新規作成）
9. node scripts/package/verify-package.mjs .artifacts/u1-package-v7.manifest.json .artifacts/u1-v7/aletheia-works-formicarium-0.1.0-rc.1.tgz
10. 空のrepo外consumer `/private/tmp/formicarium-u1-consumer-v7` へ上記唯一tgzをnpm install --ignore-scripts --no-audit --no-fund。以降 FORMICARIUM_CONSUMER はそのpath、FORMICARIUM_CANDIDATE はworkspace内 `.artifacts/u1-package-v7.manifest.json` の絶対pathを指す。
11. node --test tests/package/pack.test.mjs tests/package/consumer.test.mjs tests/package/nested-worker.test.mjs
12. node node_modules/@playwright/test/cli.js test --config tests/package/playwright.config.mjs tests/package/consumer.spec.mjs tests/package/nested-worker.spec.mjs tests/package/browser-broker.spec.mjs --workers=1 --retries=0
13. node --test tests/package/coverage.test.mjs
14. node scripts/package/coverage.mjs prepare /private/tmp/formicarium-u1-consumer-v7/node_modules/@aletheia-works/formicarium .artifacts/u1-coverage-v8
15. node --import ./.artifacts/u1-coverage-v8/coverage-node-preload.mjs --test --test-isolation=none .artifacts/u1-coverage-v8/tests/package/{errors,validation,state,lifecycle,protocol,core,guest-io,worker-execution,public,node-api,node-worker,consumer}.test.mjs（zsh brace展開で12files。別shellでは全pathを列挙）
16. node node_modules/@playwright/test/cli.js test --config .artifacts/u1-coverage-v8/tests/package/playwright.config.mjs .artifacts/u1-coverage-v8/tests/package/browser-api.spec.mjs .artifacts/u1-coverage-v8/tests/package/browser-worker.spec.mjs .artifacts/u1-coverage-v8/tests/package/browser-broker.spec.mjs .artifacts/u1-coverage-v8/tests/package/consumer.spec.mjs --output .artifacts/u1-coverage-v8/browser-results --workers=1 --retries=0
17. node scripts/package/coverage.mjs report .artifacts/u1-coverage-v8 .artifacts/u1-coverage-v8/browser-results .artifacts/u1-package-v7.manifest.json

実装時のcommand具体化（初回計画承認後の実行手順更新）：旧CLI案 `coverage.mjs --unit ...` はprepare/reportの実装CLIへ置換。staging v1/v2/v3は失敗・先行観測の証拠として保持し、候補を上書きしない。新source差分が必要なら新しいstaging/manifest/consumer/copy名で同じ手順を再実行する。methodology、固定13分母、80%、品質上限は変更しない。追加browser broker/nested oracleは観測Redからの修正を検証する。各段階の結果はmain-verification.mdを正本とする。

pack/consumer fixturesはStep7–8の唯一のtgzとsha256をmanifest経由で読む。曖昧なlatest globを使わない。coverage commandは上記U1 package test集合のみを固定し、ブラウザとNodeを順番に実行する。package対象JSだけnode --checkとESLint、types.testが固定tsconfig/正負fixtureへTypeScriptを呼ぶ。既存差分確認はnode --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/session.test.mjsをmainで別途一回。U4全体regressionを各Unitで反復しない。

## Coverage and Test Volume

13配布JS全体>=80%line、未import0、欠落realm失敗、digest一致、line union。生成blink/wasm/第三者/.d.ts/guest/開発専用は根拠付き別チェック。component-test-map.jsonで各13componentに5–8の固有ケース（必要境界は追加）を対応付ける。branch coverageの数値閾値追加なし。Node Worker/3browser Workerのnormal/terminate、未import、realm欠落を独立oracleで確認。計測値を性能値として扱わない。

## Fixtures, Mocks and Oracles

秘密なしELF fixture/既存guestを別入力しtgzから除外。fake Worker/clock/FSはrace、cleanup失敗、snapshot異常の決定論的注入用。realWorker/core/実tarballの代替としない。CPU-bound guestで中止→cleanup→同session再実行、cleanup確認不能ではEXECUTION→DISPOSEDを検証。stdout/stderrをbytes比較、非UTF8/非0exit、mode/hard-link/symlinkと削除を読取oracleへ。callback throw、正常resolve直後操作、done候補後dispose、timer/listener解放、unhandled rejectionの有無を確認。

## Time Budgets and Reporting

計画承認対象の変更提案：aube run838000ms（従来指定840000msから2000ms短縮）、probe/pitchfork browser598000ms、pitchfork Node118000ms、cleanup watchdog1000ms。外側probe600秒/aube840秒/pitchfork browser600秒/Node120秒は延長しない。default公開timeout600000msは維持。短いtimeout注入fixtureでは20ms run+1000ms cleanupを外側5000msに収め、実時刻とsettle/active releaseを記録。実受入れは残余予算でのsettleを実測し、超過は失敗。1worker/retry0、wasm1GB、probe8pass/native一致は維持し全体検証未実施を明記。全test名/command/実版/候補digestと失敗/未検証をU4へ渡す。

現revisionのcommand具体化：v4はloader/cwd Red baseline、v5/v6は途中観測として保持し、製品＋READMEを含むfinal candidateをv7へ一意にbindする。新候補version名への更新は実行手順の具体化であり、新たな人間承認の記録とはしない。parent mainがtesting-posture verifyで現contractに照合してから継続する。Step14–22のmethodology、固定13JS・80%・既定600000ms/cleanup1000ms・全既存品質上限は維持。

現coverage plan：Node third-party generated pthreadのみworkerData=em-pthreadを保持して非包装。browser HTTP pthread bootstrapは第一者core/package-workerをimportするため、全child realmへ依存import前にbridgeを設定し、nested counter bufferをhostへ即relayしてroot強制終了後も保持する。planned case/realm inventoryはscripts/package/coverage-inventory.jsonを正本とし、実行前にrun構造から算出する。結果を見て減らさず、欠落・余分realm・未登録・source digest不一致は失敗とする。
