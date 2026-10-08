# Unit Test Instructions — U2 Guest Distribution

## Framework and Readiness

Node>=24/node:test、既存PlaywrightとTypeScriptを使用する。main sessionのみが以下の各コマンドを一つずつ実行する。miseの実体は実行前に確認し、shim/mise execを使用しない。
以下の新規テスト/configはPlan Approval後のStep 1以降で作成するため、現時点では未存在・未実行。runner準備を各層の最初の実テストより前に完了する。runner起動失敗を製品のRed/Greenとして扱わない。

## Unit-scoped Commands

現環境の実体候補（実行時に確認、版固定を設定へ追加しない）:

```sh
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/manifest.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/fixtures.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/resolver.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/stage.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node --test tests/guest-distribution/integration.test.mjs
/Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/typescript/bin/tsc --project tests/guest-distribution/tsconfig.json
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/formicarium-playwright /Users/mutoakio/.local/share/mise/installs/node/24/bin/node node_modules/@playwright/test/cli.js test --config tests/guest-distribution/playwright.config.mjs tests/guest-distribution/consumer.spec.mjs --workers=1 --retries=0
```

このUnitはguest配布選択だけを検証し、probe/aube/pitchforkの重い実行suiteを重複起動しない。既存guest実行の回帰条件はU1/U3/U4で維持。HTTP serverはloopback・private一時dirを使いafterで終了、fetch試験は回数/URLを検査する。npm package非同梱は固定files/exportsとcandidate pack一覧で照合し、ゲストをnpmへ追加しない。

## Oracles and Test Data

各componentは5–8論理ケース群を目安にnormal +少なくとも2error/edgeを含める。AC4.3.1–3を全件カバーする。
- manifest: 既存catalogueと追加metadata、registered refs、未知tool/ref、欠落commit/schema/format、origin/path/redirect拒否。
- fixtures: UTF-8/binary、既定/空seed、C1 path/mode/inode/copy/symlink、未知fixture。
- resolver: 選択したrefのbytes/commit/digest/cwd、404、不整合sha/tool/ref/commit、ELF bounds/PT_INTERP、retry/fallbackなし。
- producer: 実bytesから算出したsha256を独立に比較、二ref/旧他tool保持、missing inputs/不整合provenance拒否、npm非同梱。
- integration/browser: local HTTPから同じ候補をNodeと三browserで選択、正しいSelectedGuest、一致しない資産をU1へ渡さない。

模擬manifestの二refは架空test dataと明記する。実aube/pitchforkのsource commit/build-infoを捏造しない。dist/guestsで現在観測できたhello/exit3/probeをaube/pitchforkと偽装しない。実供給物が欠落する場合は成功とせず、所在確認・必要な取得/buildを具体化して報告する。変更のないaube再buildは禁止。テストに機密env/fixtureを使わない。

## Coverage and Limits

U2の配布JS inventoryはintegration/terrarium/guest-distribution/{manifest,fixtures,resolver}.mjsの3ファイル。テスト・型・開発専用producer・ELF/wasmを理由付きで区別し、U4でU1の固定13配布JSと合算する。第一者配布JS全体の80% line coverage・統合前CIを維持する。未importを0%、Node/browser realm未収集を未検証/失敗として分母から除外しない。測定結果は候補hashとsource identityに結合する。coverage計測コマンドは既存方式の読み取り確認後に具体化し、未確認の収集成功を主張しない。
browserは1 worker/no retries。probe600秒/aube browser840秒/pitchfork browser600秒Node120秒/wasm1GBの既存上限は変更しない。実機Safari・実配信・CI・公開RC受入れは未検証として別記録する。
