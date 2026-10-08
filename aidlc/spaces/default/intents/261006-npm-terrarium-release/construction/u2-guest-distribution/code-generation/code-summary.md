# Code Summary — U2 Guest Distribution

## Status

実装とローカル検証済み。最新確認時の aube v2.7.0 と pitchfork v2.30.0 を実資産として供給し、Node と Chromium/Firefox/WebKit の consumer が合格した。固定三ファイルの U2 coverage は 201/202 lines（99.5%）。実 terrarium 接続・実配信・U4 CI は未検証。

## Files and Decisions

- `integration/terrarium/guest-distribution/manifest.mjs`: C3 schema、strict string SHA-256/source commit、registered tool/ref、default-first ordering、same-origin/base-path と redirect 境界。
- `integration/terrarium/guest-distribution/fixtures.mjs`: UTF-8 relative map と explicit byte entries、C1 既定 `/work`・`/root` の path/type/mode/inode/hard-link/symlink 検証、コピーと親 directory 補完。
- `integration/terrarium/guest-distribution/resolver.mjs` / `index.d.ts`: C3 consumer boundary、digest/provenance/ELF 検査。guest 起動・retry/fallback はない。musl target は GCC/Rust の明示 provenance に基づく。
- `scripts/guest-distribution/stage.mjs`: static distribution 候補を inputs の実 bytes から生成し、既存 tools/builds/legacy metadata を保持する。source.type 保持の regression は main Red（6 pass/1 fail）を観測し、既存 source の追加 fields と今回の provenance を合成する修正済み。main の同じ command で Green を検証済み。
- `scripts/guest-distribution/coverage.mjs`: U2 固定三ファイルの別 instrumented copy、zero maps、source identity と Node/全 browser case の receipt 検証。80% を下げない。main の測定で 99.5% を検証済み。
- `tests/guest-distribution/`: 各層五〜八ケース群、Node HTTP、Playwright 三 browser、実/模擬供給の分離、TypeScript と U2 専用 ESLint config。serve.mjs は loopback、private synthetic directory、実 HTTP 302 を用いる。
- `docs/guest-distribution.md`: 入力・供給・error/provenance・検証状態と U3/U4 の引渡し。

formicarium の npm exports/files、runtime、U1 の実装・固定13 coverage、公開 workflow は変更しない。本作業領域内の module とローカル候補であり、terrarium へ反映済み・公開済みとは報告しない。

## Observed Verification

以下は main session から受領した observed commands/output に基づく。方法は現行 Testing Contract の test-after。通常層は production→test 作成→main 実行、不具合修正は main Red→修正→同じ test Green の順。

| 検証 | 状態・観測結果 |
|---|---|
| manifest node:test | 検証済み：7 pass、0 fail。array coercion regression で main Red 6 pass/1 fail、strict string 修正後 Green 7 pass |
| fixtures node:test | 検証済み：7 pass、0 fail。UTF-8/bytes copy、roots、symlink 境界 |
| resolver node:test | 検証済み：7 pass、0 fail。canonical Rust target regression main Red 6 pass/1 fail、修正後 Green 7 pass |
| TypeScript consumer | 旧 type-only consumer は tsc exit 0。実 resolver.mjs import は main Red（tsc exit 2、TS7016/TS2578）を観測。resolver.d.mts の最小 declaration bridge を追加、main の同じ command で Green を検証済み |
| producer node:test | 検証済み：source.type regression Red 6 pass/1 fail → 修正後同じ command で 7 pass/0 fail/0 skip |
| Node HTTP integration | 検証済み：最新実資産 aube v2.6.1/v2.7.0 と pitchfork v2.30.0、8 pass/0 fail/0 skip。controlled real 302 target の未接触も確認 |
| Playwright | 検証済み：三 browser 計15 pass、9.5s、一 worker、retry 0 |
| ESLint / collector self-test | 検証済み：両方 exit 0。unused argument の lint Red 後、規則を維持して修正し Green |
| U2 coverage | 検証済み：固定3ファイル 201/202 lines、99.5%。manifest/fixtures/resolver は 100%/100%/98.27%。Node 5 process と browser 15 case receipt を収集 |
| 最新実 guest | 検証済み：aube v2.7.0 は native/U1 Worker exit 0、stdout `2.7.0 linux-x64 (2026-10-07)`。pitchfork v2.30.0 は musl build exit 0、native/U1 Worker exit 0、stdout `pitchfork 2.30.0`。共に stderr 空 |

旧 browser の最初の webServer path failure は runner 準備失敗として扱い、absolute server path/cwd を修正した。WebKit の route.fulfill(302) 非対応は test fixture の不備で、実 HTTP redirect endpoint へ修正後に全 browser 合格を観測した。最新ケースは別に実行した。

## Verification Commands

Node 実体：`/Users/mutoakio/.local/share/mise/installs/node/24/bin/node`。producer・tsc・lint・collector self-test の correctness 検査は build 中に実行した。実 guest・Node integration・browser・coverage measurement は build 完了後に逐次実行した。所要時間を性能証拠として扱わない。

```sh
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/stage.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/eslint/bin/eslint.js --config tests/guest-distribution/eslint.config.mjs integration/terrarium/guest-distribution/*.mjs scripts/guest-distribution/*.mjs
U2_ACTUAL_SITE=.artifacts/u2-guest-distribution/site-v2 /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/integration.test.mjs
U2_ACTUAL_SITE=.artifacts/u2-guest-distribution/site-v2 PLAYWRIGHT_BROWSERS_PATH=/private/tmp/formicarium-playwright /Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/@playwright/test/cli.js test --config tests/guest-distribution/playwright.config.mjs --workers=1 --retries=0
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node scripts/guest-distribution/coverage.mjs self-test
U2_ACTUAL_SITE=/Users/mutoakio/Documents/formicarium/.artifacts/u2-guest-distribution/site-v2 /Users/mutoakio/.local/share/mise/installs/node/24/bin/node scripts/guest-distribution/coverage.mjs prepare .artifacts/u2-coverage-v1
U2_ACTUAL_SITE=/Users/mutoakio/Documents/formicarium/.artifacts/u2-guest-distribution/site-v2 /Users/mutoakio/.local/share/mise/installs/node/24/bin/node --import ./.artifacts/u2-coverage-v1/node-preload.mjs --test --test-concurrency=1 .artifacts/u2-coverage-v1/workspace/tests/guest-distribution/{manifest,fixtures,resolver,stage,integration}.test.mjs
U2_ACTUAL_SITE=/Users/mutoakio/Documents/formicarium/.artifacts/u2-guest-distribution/site-v2 PLAYWRIGHT_BROWSERS_PATH=/private/tmp/formicarium-playwright /Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/@playwright/test/cli.js test --config .artifacts/u2-coverage-v1/workspace/tests/guest-distribution/playwright.config.mjs --workers=1 --retries=0
U2_ACTUAL_SITE=/Users/mutoakio/Documents/formicarium/.artifacts/u2-guest-distribution/site-v2 /Users/mutoakio/.local/share/mise/installs/node/24/bin/node scripts/guest-distribution/coverage.mjs report .artifacts/u2-coverage-v1
```

coverage は source が確定してから copy を作る。source.type 修正を含む変更後に prepare する。計測開始後に production/tests を変更せず、source/instrumented/statement-map hashes と tools/builds/実資産全ファイルの候補 identity を report と結合し、測定前後に再照合する。Node は五 test-file process ごとに一つ、browser は三 project の全五ケースごとに一つの成功 receipt を要求する。未 import は zero、Node/browser realm/case 欠落は失敗。U1 固定13の結果を保持し、U4 の全16対象/統合前 CI をローカル U2 結果で代替しない。

## Assets and Handoff

検証済み：取得・build・実行の証拠は `.artifacts/u2-release-inputs/latest-verification.json`、producer 入力は `.artifacts/u2-release-inputs/stage-input-latest.json`。候補は `/Users/mutoakio/Documents/formicarium/.artifacts/u2-guest-distribution/site-v2`（11 files、staging exit 0）。aube v2.7.0 commit は `d36fec01764689ef6d99a5e43de98925b571d67f`、pitchfork v2.30.0 commit は `60e97b1c39183d56e2124f84f9a68ad550fc4011`。pitchfork は承認済み musl patch を使う既存 build（optimized release 61m26s）、39596008 bytes、SHA-256 `67bcb90c31e8525f95f49c9ef5ff9b6526f36e79471f4804bc533b192a772a23`、UI Node v24.18.1。aube は公式 musl release を取得し再 build していない。release import の built_at は配布 import 時刻で、未知の publisher compile 時刻を示さない。

coverage 証拠は `.artifacts/u2-coverage-v1/report.json`。sourceIdentity は `667f8fb1a5922a539a8272e4072fdb1d953fb570010b16696869db2c052eb1f8`、candidate SHA-256 は `7a17aef4fde6c039c890956bf10a3d4a9a0105f5710b5a90e89a9c994cd0c567`。instrumented Node 五ファイルは36 pass/0 fail/0 skip、browser15件は全 pass（one worker/retry 0）。prepare/report が source・instrumented・statement-map と実候補 identity を照合した。性能 benchmark は実施していない。

traceability の OK は U2 の実装とローカル consumer 検証の範囲。U1 固定13ファイルの証拠を維持し、U4 が union 固定16ファイルと統合前 CI を検証する。U3 の実接続では既定 /work root を保持して entries を seed に渡し、公開 setCwd(selected.cwd) で cwd を設定する。sibling entry の実行前後の保持は U3 で未検証（詳細は docs/guest-distribution.md）。

実配信、実 terrarium 接続、U4 CI/RC/stable、署名検証、実機 Safari は未検証。公開・push の承認は含まない。

## Native Advisory

検証済み（main の native 出力）：required-sections summary は pass。sensor-traceability は pass:false、missing_from_upstream_ids 25 件（他 Unit の AC4.1/4.2/5.x/6.x）。U2 table の gaps/orphans/invalid_entries/invalid_targets はなし。これは intent 全体の upstream ID 集合との差分であり、他 Unit の AC を U2 の実装済みとして追加しない。main が native protocol にこの結果を渡す。
