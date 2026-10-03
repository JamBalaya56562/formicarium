# Reverse Engineering Timestamp

## 実施の記録

- 実施日：2026-10-06（Asia/Tokyo）
- intent：261006-npm-terrarium-release、Focused scan、Depth Standard
- 対象：formicarium（プロジェクトルート）
- コミット：ec662400d8185f196568f0c2038ac3981118a7dd（親セッションのjj観測）
- 方法：SOURCE_CHANGED拒否後の新snapshotに基づくdeveloper再スキャンを読み、現在の旧共有9資料から新たに統合した。拒否された候補は復元していない。
- 旧共有storeはUNVERIFIED。今回範囲外の旧本文は未検証の背景資料として保持する。
- ビルド・テスト・npm pack・公開・terrarium実行は今回未実施。テストソースの存在は合格証拠ではない。

## 証拠と鮮度の境界

- 検証済み（ソース観測）：developer-scan.md の各file/lineと Re-scan after source guard refusal の限定再観測コマンド exit0。今回のanalyzed.pathsは25pathsで拡張していない。動作保証を意味しない。
- ドキュメント根拠：ADR・NFR・license・terrarium memoの記述。過去合格数は今回の実行結果ではない。
- 推測・未検証：npm公開契約・Worker資産配置・別run状態・再利用可能性。terrarium内部、生成wasm/vendor coreは深く分析していない。
- 旧の広いtests/node/・tests/browser/・aube fixture・playwright設定はshallowへ降格。深いテスト分析は4ファイルのpitchfork-testsに限る。
- 新snapshotの範囲：runtime/,scripts/,package.json,docs/,blink.lock,tests/,.gitignore,mise.toml
- store_generation：sha256:49b8bdbdc14a004ed1d2d235ad26c65cf3a7050877b083cc34043552be8cabec
- source_fingerprint：git:9f16536692bf955a61de0ad6b67a2333588fa94d
- 正規mint：新snapshotと同じ権限文脈で親がcodekb-scope-diff --repo formicarium --mint --paths（下の25paths）を実行、exit0で d3023476ab3fd05400eba25a57c2e659f6f255fd を観測。
- 通常sandboxのtree値が同方式の再snapshotで一致したという親の観測を再スキャンは記録している。git/treeの異なるnamespace間の値を同一と主張しない。
- Mermaid公式parseの既観測：mermaid12.1.0、total4/failed0、render未実施。今回の4図のSHA256が既観測値と一致した場合のみ適用する。Interaction Diagramsとtext fallbackを保持した。

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261006-npm-terrarium-release
fingerprint: d3023476ab3fd05400eba25a57c2e659f6f255fd
analyzed:
  paths:
    - runtime/
    - scripts/build-blink-wasm.sh
    - scripts/fetch-blink.sh
    - scripts/build-guests.sh
    - scripts/native-baseline.sh
    - scripts/session-info.mjs
    - scripts/serve.mjs
    - scripts/pitchfork-probe-paths.sh
    - scripts/emscripten-env.sh
    - scripts/lib/container.sh
    - scripts/lib/node.sh
    - tests/node/build.test.mjs
    - tests/node/pitchfork-basic.test.mjs
    - tests/browser/pitchfork-basic.spec.mjs
    - tests/shared/pitchfork-basic.mjs
    - package.json
    - mise.toml
    - blink.lock
    - .gitignore
    - docs/architecture.md
    - docs/decisions/
    - docs/nfr-summary.md
    - docs/licenses.md
    - docs/terrarium-integration.md
    - docs/results/failures.md
  components:
    - core-descriptor
    - guest-io
    - session
    - registry
    - node-runtime
    - web-runtime
    - dev-server
    - build-scripts
    - native-baseline
    - pitchfork-tests
shallow:
  paths:
    - tests/node/
    - tests/browser/
    - fixtures/sessions/aube-1645.txt
    - fixtures/baseline/aube-1645.native.txt
    - playwright.config.mjs
    - scripts/measure-aube.mjs
    - scripts/lib/timings.mjs
    - guest/probe/
    - guest/
    - patches/
    - docs/results/
    - README.md
    - AGENTS.md
    - OUTCOMES.md
    - fixtures/aube-local-deps/
    - fixtures/
    - tests/fixtures/
    - dist/
    - .vendor/
    - node_modules/
    - test-results/
    - sh/
    - LICENSE
    - package-lock.json
```
