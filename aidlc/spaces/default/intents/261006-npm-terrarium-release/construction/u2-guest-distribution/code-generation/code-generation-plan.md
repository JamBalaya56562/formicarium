# Code Generation Plan — U2 Guest Distribution

## Scope and Sources

担当: GuestDistribution、US4.3 / AC4.3.1–AC4.3.3、FR6.1/FR6.2、C3。
参照: inception/contract-design/contract-summary.md C3、inception/units-generation/unit-of-work.md U2、inception/user-stories/stories.md US4.3、inception/requirements-analysis/requirements.md、inception/delivery-planning/bolt-plan.md B2。
NFR1/NFR3/NFR4/NFR5/NFR7の関連条件を保持する。U1のC1/C2/C8と承認済みskeletonを変更しない。

この計画は実装前であり、チェックボックスはすべて未実施。初回Plan Approvalが必要。
利用者の復旧指示に従い、U2の正規の計画作成・承認を先に実施し、既に選ばれた自動進行の設定記録を承認後に試す。設定・状態・承認receipt・導入済みAI-DLCは手編集しない。

## Implementation Boundary

現在の変更対象はformicarium作業領域内。terrarium向けの供給モジュールを `integration/terrarium/guest-distribution/` に実装し、供給物のproducerを `scripts/guest-distribution/` に置く。これはterrariumへ引き渡すソースであり、formicariumの公開exports/filesには追加しない。C3の所有はterrarium向けGuestDistributionのまま。
ローカルの静的サイト候補は `.artifacts/u2-guest-distribution/site/` に生成し、tools.json / dist/builds.json / ref別guest・fixtures・build-infoを含む。U3で既存terrariumへ接続する際、反映対象と外部作業領域の書込み権限を確認する。ローカル候補を実配信やterrarium本体への反映済み成果として報告しない。

想定ソース:
- integration/terrarium/guest-distribution/manifest.mjs: C3 metadataと供給URLの検証。
- integration/terrarium/guest-distribution/fixtures.mjs: UTF-8/明示bytesからC1 FsEntryへの変換。
- integration/terrarium/guest-distribution/resolver.mjs: resolveGuest、catalogue選択と資産検証の公開境界。
- integration/terrarium/guest-distribution/index.d.ts: C3公開型。
- scripts/guest-distribution/stage.mjs: static-musl供給物とmanifestの生成。
- tests/guest-distribution/{manifest,fixtures,resolver,stage,integration}.test.mjs、consumer.spec.mjs、playwright.config.mjs、serve.mjs、types.ts、tsconfig.json。
- docs/guest-distribution.md: 配置、provenance、U3/U4への受渡しと未検証事項。

## Contract Details

tools.jsonとdist/builds.jsonの既存Choice/tool/ref/source/describeの意味を維持し、aube/pitchforkのbuildへC3 metadataを追加する。他ツールの既存metadataを保持し形式変更を強制しない。
refはcatalogueの登録keyのみ選択する。branch/tag/full commit/pr-Nをテストし、未配布refをdefaultへfallbackしない。省略ref/fixture/cwdはterrarium基準の既定値を保持し、fixture=''は空seed、undefinedはtool既定。
baseは絶対HTTP(S) URL。供給URLはbase相対で解決し、同一originかつbaseの配布path配下に限定する。資格情報入りURL、path traversal、供給先外URL、許可先外redirectを拒否する。refをURL文字列へ直接連結しない。
guest/fixture/build-infoのSHA-256、schemaVersion、tool/ref、source URL/ref/commit、formatを確認する。guestはELF64 little-endian x86-64でprogram header boundsを検証し、PT_INTERPを拒否する。ELFだけでmuslを断定せずbuild-infoのtarget/build provenanceと照合する。
fixtureは既存relative file mapを/workへ変換できる形を保持し、明示binary entryも扱う。C1と同じroot/path/type/mode/inode/symlink境界を検証し、重複pathやroot外・中間symlinkを拒否する。bytesはコピーする。UTF-8既存fixtureとbinary fixturesは別テストで確認する。
404、未知tool/ref/fixture、metadata不一致、digest不一致、ELF不正は原因と対象を識別できるErrorでrejectする。fallback・暗黙retry・guest起動をしない。機密envやfixture値をエラーへ入れない。
source.commitのない資産をproducerが推測で補完しない。変更のないaubeを再buildしない。pitchforkの既存musl一行patchを保持する。現在dist/guestsではhello/exit3/probeだけを観測しており、実aube/pitchfork供給物とbuild-infoは未確認。利用可能な既存資産を先に調査し、欠落は具体的なblockerとして報告する。

## Ordered Implementation Steps

- [x] Step 1 — runnerと入力在庫を確認する。既存node:test/Playwright/TypeScriptを使い、main sessionで実体パスとunit-scopedコマンドを確認する。実guest/build-infoの所在・commit・patchを調査し、再buildが必要なら根拠を示す。テスト準備の最小configを作る。AC4.3.1–3/NFR5。
- [x] Step 2 — manifest.mjsでC3 schema・registered ref・供給URL・metadataの検証層を実装する。AC4.3.1/3。
- [x] Step 3 — manifest.test.mjsに正常2ref、branch/tag/commit/pr-N、未知tool/ref、missing commit、format/schema不正、origin/path/redirect境界の5–8論理ケース群を作成しmainで実行する。AC4.3.1–3/NFR4/5。
- [x] Step 4 — fixtures.mjsで既存UTF-8 mapと明示bytesのC1 FsEntry変換を実装する。AC4.3.1/NFR4。
- [x] Step 5 — fixtures.test.mjsに既定/空seed、binary copy、mode/inode、重複/path traversal/root外、symlink境界、cwd既定の5–8ケース群を作成しmainで実行する。AC4.3.1/3。
- [x] Step 6 — resolver.mjsと型を実装する。catalogue→選択→fetch/digest/provenance→SelectedGuestの順で検査し、共通core版とguest refを分離する。AC4.3.1–3。
- [x] Step 7 — resolver.test.mjsに正常2ref、default、fixture=''、未知fixture/404、改変digest、異なるtool/ref/commit、ELF/dynamic guest不正、供給先外redirectのケース群を作成しmainで実行する。types.ts/tsconfig.jsonでC3 consumerをcompileする。AC4.3.1–3/NFR1/4/5。
- [x] Step 8 — stage.mjsでref別static site供給物を生成する。既存buildsを保持し、sha256を実bytesから計算し、build-info/source/patchを照合する。UI・npm・公開workflowは変更しない。AC4.3.1/2/NFR5。
- [x] Step 9 — stage.test.mjsに正常生成、二refの分離、旧/他tool metadata保持、missing asset/commit、不正target/patch、digest対応、npm非同梱の5–8ケース群を作成しmainで実行する。AC4.3.1–3/FR1.3。
- [x] Step 10 — integration.test.mjsとbrowser consumer.spec.mjsでローカルHTTP供給をNode/Chromium/Firefox/WebKitから選択しbytes/commit/digest/entries/cwdを照合する。各拒否ケースでguest未実行を確認する。模擬2refのschema試験と実aube/pitchfork資産の供給検証を別記録にし、模擬を実guest合格として流用しない。AC4.3.1–3/NFR1/4/5。
- [x] Step 11 — U2の配布JS一覧をmanifest/fixtures/resolverの固定3ファイルとして定め、Node/browserの計測を収集・照合する。未実行を0%、realm欠落を未検証/失敗にする。U1の固定13ファイル・80%基準を維持し、U4へunion用のidentity付き結果を渡す。U2の新規配布JSも第一者配布JS coverageの分母へ加える。CI実行はU4で必須、ローカル成功で代替しない。NFR3。
- [ ] Step 12 — docs、code-summary.md、source-manifest.json、traceability.jsonを生成する。AC4.3.1–3/FR6/NFR関連条件を実装・テストの既存pathへ結び、候補identity/commands/resultsと実配信未検証をU3/U4へ渡す。正規の第三者レビュー・Unit検証・完了記録へ進む。未実施Mustが残れば完了しない。

## Verification and Completion

方法はtest-after。各層を実装してから対応テストを作成・main sessionで逐次実行する。今回の復旧は新規製品実装前の順序調整であり、AI-DLC guardの変更・回避や承認の代替ではない。
normal caseと2つ以上のerror/edge caseを各componentに含める。実行コマンドはunit-test-instructions.md。timeouts/1 worker/no retries/native比較/wasm1GBを緩めない。性能測定・aube本体の再buildは本Unitの既定検証に追加しない。
実配信・CI・公開RC受入れはこの計画時点で未検証。U2のローカル契約fixture成功を外部公開済みの供給成功と呼ばない。実aube/pitchfork欠落は早期に報告する。

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
