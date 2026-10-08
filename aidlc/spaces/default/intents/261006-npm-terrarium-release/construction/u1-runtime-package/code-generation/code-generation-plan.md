# Code Generation Plan — u1-runtime-package

## Scope and Sources

ドキュメント根拠：U1 functional-design（entities/rules/functional-spec）、nfr-requirements、nfr-design、infrastructure-design、inception requirements/units/story-map/contracts/components。U1の9ストーリー・28AC、16詳細NFR、13BRを対象とする。実装・製品試験は未検証。既存runtime/core.mjs・guest-io.mjsの読取りでFS参照時点とhard-link欠落を確認した。U2 guest配布、U3 terrarium変更、U4全体CI・公開は別所有。

固定第一者配布JS13：runtime/public.mjs、errors.mjs、validation.mjs、state.mjs、lifecycle.mjs、protocol.mjs、worker-execution.mjs、core.mjs、guest-io.mjs、node/api.mjs、node/package-worker.mjs、web/api.mjs、web/package-worker.mjs（各短縮名はruntime/配下）。exportsとtypes/assets/noticesはfunctional-specの固定表を維持。旧CLI/session/registryは非配布開発入口を維持する。core固有起動・FS取得hook・nested pthread cleanupはcore.mjs、一般FS状態はguest-io/state、Node file取得はNode adapterが所有。

## Decisions Proposed for This Approval

終了順序はSD3の追補を採用し、旧Functional DesignのWorkflow9–10およびstate-machineの早期commitを実装しない。doneは候補、cleanup成功、dispose/abort再確認、原子commit、active解除、Promise settleの順。cleanup不能は候補rollback、EXECUTION（安全な元原因付き）、session DISPOSED。正常非0exitはcommit可。browser terminateにNode同等のackを仮定しない。

時間予算の変更提案：外側probe600秒/aube840秒/pitchfork browser600秒/Node120秒は維持。内部cleanup watchdog1000msを維持し、実consumer受入れのrun timeoutはaube838000ms、probe/pitchfork browser598000ms、pitchfork Node118000msとする。1000ms cleanupと1000ms harness残余を外側に確保する。これはC1/NFR2.1にあるaube840000ms指定から2000msの短縮提案であり、承認前に設定を変更しない。公開API既定600000msと任意の明示timeoutを一律短縮しない。外側上限内にsettleした観測が必須であり、OS schedulingの上限保証を主張しない。実aubeの成功率・影響は未検証。上限延長、retry追加、worker増加で解消しない。今回のApprove Planはこの試験指定差分を含む。拒否時は計画を再検討する。

## Implementation Steps

### Checkpoint cleanup oracle correction

今回の対象はStep23–25。既存Steps1–22は履歴として保持する。検証済み：checkpointのNode19件中18pass、1failは共有tmp一覧から既存dirが1件消えた差分。ソース確認済み：consumer.testの回収oracleはOS全体のprefix一覧を比較し、直前の直接coreテストは非同期localOwner.disposeを待たない。消えたdirの所有者と因果関係は未検証。製品の漏れとは断定しない。

- [ ] Step 23 — mainで共有tmpに別ownerが保持・解放する資源を用意し、旧oracleの誤失敗を決定論的に再現してRedを記録する。漏れを残した場合は必ず失敗する対照も用意する。（US2.3、NFR7.1）
- [ ] Step 24 — tests/package/consumer.test.mjsと必要なtest専用helperで、直接core再現のresource ownerを明示所有してdispose完了を待つ。回収oracleはこのテスト専用tmpを使用し、環境変数をfinallyで復元する。実spin出力時に配下の実loaderを観測し、正常・abort・timeout・disposeの各settle後に空であることを確認する。他ownerの存在／削除には依存せず、回収漏れ対照は検出する。製品runtime/tgz v7・品質基準を変更しない。製品欠陥が判明した場合は別の具体的修正計画へ戻る。（US2.3、NFR7.1）
- [ ] Step 25 — mainで対照試験・既存v7 Node pack/consumer/nested全件を逐次実行し、同じ承認済みcheckpointコマンドを再検証する。code-summary/source-manifest/main-verificationに観測を追記して第三者レビューを取り直す。固定13JSの製品bytes不変と保存済みcoverage対応を確認する。test数変更時はcoverageの予定realm数も更新し再収集する。新規製品candidateを作らず、失敗記録を消さず、retry/timeout/閾値を変更しない。（全U1）

### Current Revision — human-requested two defects

以下Step14–22が今回の承認対象。Step1–13のチェックは旧実装の履歴で、今回の修正の成功を意味しない。Testing Contractと固定13JS/80%条件を継続する。

- [x] Step 14 — mainで既存runner-ready.test.mjsを実行し成功を確認する。（全U1）
- [x] Step 15 — core.test.mjs、consumer.test.mjs、consumer.spec.mjsに照合後の原URL差替え再現を追加し、Nodeと3browserの実loaderで未照合markerの実行をRedとして観測する。fake importだけで代替しない。（US1.2/2.2/5.3、NFR5.1、BR1.2）
- [x] Step 16 — runtime/core.mjsと既存Node/web API・package-worker adapterで照合済みbytesの評価と同bytes pthread bootstrapを実装。回答Q2=Aのbrowser Blob moduleと明示script-src blob:条件、同一origin HTTP Workerを採用。Nodeはrun専用0700領域の排他的0400 loader copyを使う。原URL再import・Node data URLを使わない。core固有知識はcore.mjs内に保つ。（US1.2/2.2/5.3）
- [x] Step 17 — 同じ再現のGreen、pthread正常/中止後再run、CSP許可/拒否、CORS/隔離条件、foreign Worker/任意Blob child拒否を確認。host側run資源台帳が作成途中・正常・abort・timeout・disposeでtemp/Blobを回収し、root強制終了時にもchildren停止後に解放する。root finallyだけに依存しない。既存cleanup/commit順序と通知identityを維持してrefactorする。（US2.1/2.2/2.3/5.3）
- [x] Step 18 — guest-io.test.mjsのfake FSを親不存在時mkdir失敗へ補正。consumer.test.mjs/consumer.spec.mjsでsetCwd('/work/project/sub')→remove('/work/project')→runをNodeと3browserの実coreでRedとして観測する。（US3.1/3.2、NFR4.4、BR3.2）
- [x] Step 19 — guest-io.mjsでroot内の欠落親を順に0755で復元。既存mode、seed、link、snapshot commit/rollbackを維持しfile/symlink衝突を拒否。同じ実core再現とmode/snapshot/reset/失敗rollbackのGreenを確認しrefactorする。（US3.1/3.2）
- [x] Step 20 — 新候補v5のstaging/manifest/tgz/空consumerを生成し非計測Node/3browser consumer・nested・brokerを逐次検証。v4を上書きせず新digestを記録。checkpoint検証コマンドはv5用を別途全文提示し、長いsuiteは120秒checkpoint外で実行する。（US1.1/1.2/1.3/2.1/3.1）
- [x] Step 21 — v5計測copyで固定13JS全realmの行coverage80%以上、欠落検知、digest一致を再確認。新配布helperが必要なら分母へ追加。既存U1 unit/helper/type/ESLintとbuild/runner/session差分試験をmainのみ逐次実行。guest欠落、CI、全体受入れを未検証として記録し品質基準を下げない。（全U1）
- [x] Step 22 — READMEへCSP条件とtemp所有/解放を記載。code-summary、source-manifest、traceability、component-test-map、main-verificationに新path/digestとRed/Green観測を記録。（全U1）

今回の修正・再現は未検証。以前の承認済み内部予算838000/598000/118000msとcleanup1000ms/harness残余1000ms、公開default600000msを継続する。公開操作は含まない。

- [x] Step 1 — 配布/依存/試験骨格。package.json、package-lock.json、scripts/package/stage-package.mjs、tests/package/fixtures.mjs、tests/package/playwright.config.mjsを整備。package名@aletheia-works/formicarium、version0.1.0-rc.1のローカル候補、private=trueを保持。files/exportsを固定し、公開操作なし。node:test、Playwright1.55.0、TypeScript5.9.3、ESLint9.36.0、istanbul-lib-instrument6.0.3、istanbul-lib-coverage3.2.2をdev依存で固定する。導入時lock/実版を確認し、ツール互換性を未観測のまま断言しない。（US1.1/1.2/1.3）
- [x] Step 2 — runner readiness。tests/package/runner-ready.test.mjsを用意し、node --test tests/package/runner-ready.test.mjsをmainで観測してから各層試験へ進む。後続新規実装はtest-after、既存欠陥は再現失敗→修正→成功。ビルド/試験はmainのみ逐次。（全U1）
- [x] Step 3 — validation/state層実装。errors.mjs、validation.mjs、state.mjs。入力copy/ELF bounds/PT_INTERP/NUL/env/path、親0755/明示mode順不変、root統合、inode整合、公開FS原子的操作/独立session/resetを実装。（US2.2/3.1/3.2）
- [x] Step 4 — validation/state層試験。tests/package/errors.test.mjs、validation.test.mjs、state.test.mjs。各component5–8の独立ケースを最低限、全境界をtable-drivenで追加。seed部分commit禁止、bufferコピー、symlink親、削除/hard-link、root境界とBUSY/DISPOSEDをoracle化。層実装後にmainで実行。（US2.2/3.1/3.2）
- [x] Step 5 — lifecycle/protocol実装。lifecycle.mjs、protocol.mjs。時計/Worker adapterを内部注入可能にし、同期予約、全期間deadline、古い世代の破棄、current不正通知拒否、callback例外、候補commit barrier、timeout/abort/dispose/cleanup失敗の優先順位と一度settleを実装。テスト用注入をpublic exportsに追加しない。（US2.1/2.2/2.3/3.2）
- [x] Step 6 — lifecycle/protocol試験。tests/package/lifecycle.test.mjs、protocol.test.mjs。各5–8以上、done後cleanup保留中のabort/dispose、cleanupreject/hang、正常resolve直後FS/次run、古いexit、未知message、partial bytes、unhandled rejectionを独立oracle化。短い期限の決定論的注入と実Worker中止の試験を区別する。（US2.1/2.2/2.3/3.2）
- [x] Step 7 — core/guest実行層。core.mjs、guest-io.mjs、worker-execution.mjs。既存CLI互換を保つadapter追加。FSをpreRunで確保、lstat snapshot、hard-link保持/復元、mode/欠落root/特殊file拒否、bytes flush、非0exit、nested Worker後始末。FS参照欠落とhard-link欠陥は先にtests/package/core.test.mjs、guest-io.test.mjsで再現失敗をmainが記録してから修正。core以外にblink argv/factory/補助Worker知識を増やさない。（US2.1/3.1/5.3）
- [x] Step 8 — guest実行層試験。core.test.mjs、guest-io.test.mjs、worker-execution.test.mjsを各5–8以上へ拡充。fake FSの順序だけで成功扱いせずreal coreでlink/mode/非0/bytes/失敗snapshotを後続consumer試験へ接続。既存session/runner testsを差分に対応する範囲でmainが逐次実行。（US2.1/2.2/3.1/5.3）
- [x] Step 9 — Node/browser公開API層。public.mjs、node/api.mjs、node/package-worker.mjs、web/api.mjs、web/package-worker.mjs、types/index.d.ts、types/node.d.ts、types/browser.d.ts。shared rootはdecodeUtf8/公開Errorのみ。相対package assets、Node file取得、browser same-origin/SAB/隔離検査、delete Atomics.waitAsyncをcore load前へ。runごと専用Worker、core再利用なし。（US1.1/1.2/2.1/2.3/5.3）
- [x] Step 10 — 公開API/Worker試験。tests/package/public.test.mjs、node-api.test.mjs、node-worker.test.mjs、browser-api.spec.mjs、browser-worker.spec.mjs、types.test.mjs、types-valid.ts、types-invalid.ts、tsconfig.json、eslint.config.mjs。残る配布5componentも各5–8の固有振舞いを対応表で計数する。3browser1worker/retry0、Node builtin依存境界、型の正例成功/負例期待診断、asset欠落/環境不足時guest未開始を観測。（US1.1/1.2/2.1/2.2/2.3/5.3）
- [x] Step 11 — 非計測tarball skeleton。scripts/package/stage-package.mjs、verify-package.mjs、tests/package/pack.test.mjs、consumer.test.mjs、consumer.spec.mjsを追加。同梱assetsを既存dist/blinkからdigest/lock/dirty=false検査後にstaging。LICENSE/THIRD_PARTY_NOTICES.md/READMEを整備。npm packはstagingから出力、空consumerへ実tgzをinstallしrepo外アクセスを検出。既存guestまたは開発fixtureのみをconsumerへ別入力、guestをtgzに含めない。Node+Chromium/Firefox/WebKitで実guest正常/非0/bytes/state→次run/abort後再実行。欠落成果物は成功扱いせず必要なbuildだけmainへ依頼、aube不要再ビルドなし。（US1.1/1.2/1.3/2.1/2.3/3.1/3.2）
- [x] Step 12 — coverage層実装後に試験。scripts/package/coverage.mjs、coverage-inventory.json、tests/package/coverage.test.mjs。固定13JS全件を事前登録し未import0、Node/browser各realm shared counters登録/欠落検知、強制終了保持、digest/statement-map照合とline unionを実装。bootstrapを分母から外さない。計測copyと非計測実tgzを同fixture結果で比較し、>=80%をmainで観測。不足は失敗、分母変更/閾値低下なし。生成loader/wasm、.d.ts、第三者、guest、開発専用は理由付き別検証。（全U1、NFR3.1）
- [x] Step 13 — 文書/証拠/traceability。READMEにassets/隔離/期限/エラー/FS/decode例を記載。code-summary.md、source-manifest.json（generator含む全変更path）、traceability.json（28AC+16NFR+13BR→実在source/test）、component-test-map.json、候補digest/commands/results/未検証を作成。U4へ既存全回帰/CI/公開条件を引継ぐ。core差分が影響する既存build/runner/sessionを実行、probe/aube/pitchfork全体回帰の未実施を隠さない。U1終了でtarball skeleton人間checkpointへ渡す。（全U1）

## Story and Quality Traceability

| Story | Steps | Main verification |
|---|---|---|
| US1.1 | 1,9–11,13 | Node/shared import + noninstrumented consumer |
| US1.2 | 1,9–11,13 | assets/types/browser isolation |
| US1.3 | 1,11–13 | pack inventory/notices/provenance/guest exclusion |
| US2.1 | 5–11,13 | bytes/nonzero/registry-free guest |
| US2.2 | 3–10,13 | input/asset/core/snapshot distinct failures |
| US2.3 | 5,6,9–11,13 | deadline/abort/cleanup/BUSY/dispose |
| US3.1 | 3,4,7,8,11,13 | snapshot/link/mode/next-run |
| US3.2 | 3–6,11,13 | FS/reset/copy/isolation |
| US5.3 | 7–10,13 | core boundary/waitAsync |

28ACはfunctional traceability全件、16詳細NFRはNFR traceability全件、13BRはrules.md全件をStep13で集合照合。実装前にOKの架空targetを作らない。NFR1.1/1.2→9–11、2.1/2.2→5,6,11と上記時間提案、3.1→12、4.1–4.4→3–8,11、5.1→11、6.1/6.2→7–10、7.1–7.4→5–10。component5–8 testsは13配布JSごとに明示し、integrationだけでunit境界を省略しない。

## Verification and Limits

main逐次実行。80%固定全13JS、1worker retry0、外側既存上限、probe8項目/native一致/wasm1GBを維持。全体CIはU4で統合前必須、ローカルpassをCI済みと呼ばない。real Safari、real core/nested termination/coverage全realmは未検証。U1ローカル計画承認はpush/npm publish/remote作成/terrarium書込みを許可しない。コードを書き始めるのはこの計画と試験手順の人間承認後。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "通常の新規実装は各テスト可能な層を実装した後にその層のテストを作成・実行し、不具合修正は再現テストの失敗を先に観測してから修正し同じテストの成功を確認する。（人間の回答 Q3）",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: 通常の新規実装は各テスト可能な層を実装した後にその層のテストを作成・実行し、不具合修正は再現テストの失敗を先に観測してから修正し同じテストの成功を確認する。（人間の回答 Q3）\n- node:test と Playwright の既存結合テストを利用する（検証済み：package.json scripts、code-quality-assessment.md）。今回の成功結果・coverage 値は未検証。\n- classic の追加条件は行 coverage 80%以上と統合前 CI 実行（ドキュメント根拠：org.md Testing Posture）。基準を下げて通過させない。\n- coverage の技術提案（未実装・未検証）：第一者が保守する配布 JS 全体（既存 runtime の未変更ファイル、共通処理、公開 API、Node/browser Worker adapter を含む）の一覧を事前に固定し、未実行ファイルも分母に含める。tests、生成 blink JS/wasm、第三者/vendor、ゲスト ELF、.d.ts、デモ・開発専用 scripts は理由を明示して対象外とし、資産・型・回帰検証を別途行う。設計で配布対象を確定し、閾値達成のために除外を変更しない。\n- Worker/ブラウザ内の計測を収集・マージし、対象一覧と照合して欠落を検出する。未収集ファイルを分母から外さず0%または未測定として失敗／未検証を報告する。計測方式は担当者が未importファイル・別process/realmを含む試験を観測して選ぶ。対象一覧、除外理由、行数、レポート、実行コマンドを CI 成果物へ残す。ブランチ coverage の新しい数値条件は追加しない。\n- 既存上限は probe 600秒、aube ブラウザ840秒、1worker、retryなし、probe 8項目全通過、native 出力一致、wasm 1GB。テストは main session が逐次実行する（人間の指示：AGENTS.md）。\n- aube はソースが変わっていなければ再ビルドしない。計測は重い並行処理なしで行う。新しいコア不具合の回帰 probe は native Linux でも確認する。\n- npm tarball の import/Worker/型/wasm・notices・build-info の同梱確認は設計候補（推測・未検証）。ゲストと fixture は terrarium 側の ref 別配布という既存意図を維持する。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:dd7d634a9c475bfe0b7fdd87b1566bd3f238a9b0ead389ae268b08de9bf333f2",
  "contract_sha256": "sha256:ce013e1551c9c06de1a756c04942d606c8dffe82caf0ae8422f95df28968c638"
}
```
