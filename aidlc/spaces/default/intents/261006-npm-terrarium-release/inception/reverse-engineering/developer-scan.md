## Developer Code Scan Results

対象 intent は `261006-npm-terrarium-release`、Focused scan、Depth Standard。2026-10-06 にソースを読み取った。既存 CodeKB 9 件は UNVERIFIED の背景資料として読み、現行コードと照合した。共有 CodeKB、アプリケーション、日誌は変更していない。

根拠の区別：**検証済み（ソース観測）**は読んだ具体的な行または検索結果、**ドキュメント根拠**は既存文書に記載された結果、**推測・未検証**は設計への影響の見立て。ビルド、テスト、npm pack、公開、terrarium 実行は今回実施していない。既存テストの存在は合格の証拠として扱わない。

### Scan Coverage

- **Analyzed deeply**:
  - `runtime/`（全13ファイル。core、guest-io、registry、session、Node 3ファイル、web 6ファイル）
  - `scripts/build-blink-wasm.sh`
  - `scripts/fetch-blink.sh`
  - `scripts/build-guests.sh`
  - `scripts/native-baseline.sh`
  - `scripts/session-info.mjs`
  - `scripts/serve.mjs`
  - `scripts/pitchfork-probe-paths.sh`
  - `scripts/emscripten-env.sh`
  - `scripts/lib/container.sh`
  - `scripts/lib/node.sh`
  - `tests/node/build.test.mjs`
  - `tests/node/pitchfork-basic.test.mjs`
  - `tests/browser/pitchfork-basic.spec.mjs`
  - `tests/shared/pitchfork-basic.mjs`
  - `package.json`
  - `mise.toml`
  - `blink.lock`
  - `.gitignore`
  - `docs/architecture.md`
  - `docs/decisions/`
  - `docs/nfr-summary.md`
  - `docs/licenses.md`
  - `docs/terrarium-integration.md`
  - `docs/results/failures.md`（最終状態、既知の制約、ADR に関係する観測。出力上限で一部の旧経緯は抜粋確認）
- **Skimmed only**:
  - `scripts/measure-aube.mjs`、`scripts/lib/timings.mjs`（import/export、計測入力・ビルド情報読込の検索）
  - `tests/node/`、`tests/browser/`、`tests/fixtures/`（上の4ファイル以外はテスト名・import・assertion 関連の検索）
  - `docs/results/`（failures.md 以外はファイル一覧）
  - `guest/`、`fixtures/`、`patches/`、`dist/`、`.vendor/`、`node_modules/`、`test-results/`、`sh/`（ルートのディレクトリ一覧のみ）
  - `README.md`、`LICENSE`、`package-lock.json`、`playwright.config.mjs`（存在のみ）
  - `OUTCOMES.md`（必須引継ぎとして読んだが今回の snapshot 対象外なので verified coverage に含めない）
  - `.github/`、`.npmignore`、型・lint設定（ルート inventory と存在照会。見つからなかった）

境界：snapshot.paths 内だけを深く分析し、範囲外のソース、terrarium リポジトリ、vendor コア、生成 wasm を深く読んでいない。親が提供した snapshot は store_generation `sha256:49b8bdbdc14a004ed1d2d235ad26c65cf3a7050877b083cc34043552be8cabec`、source_fingerprint `git:9f16536692bf955a61de0ad6b67a2333588fa94d`（再取得した公開用 snapshot）。確信度は現行ソースの構造で高、生成物・外部組込み・公開動作で未検証。

### Packages Found

- `formicarium` — library/runtime PoC — JavaScript ESM — x86-64 static-musl ゲストの Node/ブラウザ実行。検証済み：package.json は `name: formicarium`、`version: 0.0.0`、`private: true`、`type: module`、`license: Apache-2.0`。
- 検証済み：package.json に `exports`、`main`、`types`、`files`、`publishConfig`、pack/publish/release script はない。意図された `@aletheia-works/formicarium` の npm 配布設定は未整備。
- ゲストは npm 依存ではなく `dist/guests/` の ELF。registry.mjs:28–35 に probe/hello/exit3/aube/pitchfork、43–67 に2手順を記述。今回の intent ではゲスト・fixture の配布責務を terrarium へ置くため、registry はデモ/受入れ用データとして分離する設計が必要（推測・未検証）。

### Build System

- **Type**: npm script によるテスト/開発配信、bash + コンテナによるコア・ゲストビルド。
- **Config Files**: package.json、mise.toml、blink.lock、scripts/build-blink-wasm.sh、scripts/build-guests.sh、scripts/lib/container.sh。
- **Build Dependencies**: blink.lock → fetch-blink → Emscripten → dist/blink/{blink.mjs,blink.wasm,build-info.json}。検証済み：build-blink-wasm.sh:27–47,132–149。
- コアは `--disable-jit`、MODULARIZE/EXPORT_ES6、pthread pool 16、PROXY_TO_PTHREAD、初期128MB/上限1GB。build-info は commit/dirty/emcc/mode/configure/link を記録する（51,138–146）。ライセンスのコピー・生成工程はこのスクリプトにない。
- aube は既定 v2.6.1、pitchfork は v2.29.0、`--locked --target x86_64-unknown-linux-musl`。pitchfork は既存 aube でUIを先にビルドし、musl ioctl 1行パッチを適用、コミット・パッチsha256・node版・UIsha256を記録する（build-guests.sh:77–128）。aube 再ビルドを不要にする制約を維持する。
- static ELF 判定は magic/machine/ELF64/little-endian/PT_INTERP を確認（build-guests.sh:138–176）。native-baseline は registry から設定を取得し、network none、stdout/exit の書き起こし、2回一致なら基準値保存（native-baseline.sh:49–119）。
- `.gitignore` は dist/vendor/node_modules と機械ローカルAI-DLC状態を除外する。npm 同梱する dist の選別と公開前生成は別契約として必要（推測・未検証）。

### APIs Discovered

| API | 場所・根拠 | 現行の契約 |
|---|---|---|
| 共通JS | guest-io.mjs:15–17,27–33,40–60,88–145,151–182,206–294,306–319,332–387 | 2定数、GuestRunError、8関数。entriesは絶対path/file/dir/symlink。runGuestはexitCode/stdout/stderr/optional snapshot、runSessionはstep結果配列 |
| 手順JS | session.mjs:36–99,136–194 | 5関数。splitShellWords、parseSessionScript、toSessionSteps、formatTranscript、normalizeTranscript。tool/rm -rf/catのみ、展開やパイプ等を拒否 |
| registry | registry.mjs:12,28–81 | NAME/GUESTS/SESSIONS/lookupSession。凍結済み5ゲスト・2手順 |
| コア記述子 | core.mjs:9–26 | blinkCore/defaultCore、loaderPath/buildInfoPath/argv。場所はプロジェクト相対文字列 |
| Node JS | node/host.mjs:16–114 | projectRoot/EXIT_NOT_FOUND/GuestNotFoundError/runInWorker。guestはホストパス、copyIn、steps、persist、callbacks、timeoutMs、core |
| Node CLI | node/run.mjs:8–13,18–20,29–102 | copy-in/cwd/env/timeout/core-flag。usage=2、timeout=124、internal=70、not-found=127、正常時ゲスト終了コード |
| ブラウザ | web/sessions.mjs:41–59、app.mjs:59–113 | URL許可リスト、guest/arg/session/core-flag=-s。window.formicariumResult/Diagnostics。Web Workerへのstdout/stderr/done/error |
| HTTP開発配信 | scripts/serve.mjs:25–29,49–93 | 静的GET/HEAD。COOP same-origin、COEP require-corp、CORP same-origin |

検証済み：依存は Node host→core/Worker、Node Worker→guest-io/core、web Worker→core/guest-io/session/sessions、web sessions→registry、app→sessions。common JS は Node builtin を import しない。永続DBはない。

検証済み：runSession はステップごとに新インスタンス、persist の snapshot を次へ渡す。hard link同一性・mtime・デバイス/FIFOはsnapshot対象外（guest-io.mjs:104–128,348–384）。Node Workerのdoneはsnapshotを含めず（node/worker.mjs:64–72）、ブラウザも返すのは exit/transcript/steps（web/worker.mjs:88–102）。独立した run() 呼出し間のFS状態保存を公開する契約は現行APIから確認できない（推測・未検証）。

### Frameworks & Libraries

- 検証済み：実行時 npm dependencies は未定義、devDependency は `@playwright/test: ^1.55.0` のみ。実インストール版は今回は未確認。
- Node.js >=24（package.json）、mise node=24/rust=stable+musl/cmake=4/ninja=1。
- blink forkは `aletheia-works/blink` / `formicarium-wasm` / `4b5c67d518b0504e13ccde7ba7823f9b6e467c4c`、upstream `jart/blink` / `f006a4fc6f9b8de9272504fdff0dbbe5ce5dc580`（blink.lock）。
- Emscripten はローカル版をコンテナタグに合わせ、未検出時6.0.10。Rust image=rust:alpine、native image=busybox:latest（build-blink-wasm.sh:74–79、build-guests.sh:24、native-baseline.sh:57）。digest固定ではない。

### Test Coverage

- **Test Directories**: tests/node/、tests/browser/、tests/shared/、tests/fixtures/。
- **Test Frameworks**: node:test + node:assert/strict、Playwright。全結果は今回未検証。
- **Coverage Config**: package scriptsにはcoverage収集なし。ルートinventoryでもcoverage/lint設定は見つからない。数値coverageは未検証。
- 検証済み（テストソース）：build.test.mjs:21–40 が wasm magic、ESM factory、lock一致、dirty=false、JITなし、pthread、1GBをassert。95–139 がELF判定、pitchfork provenanceをassert。
- pitchfork-basic.test.mjs:51–74 は「書き起こしが native の基準値と一致する」「daemons add と remove の結果が cat pitchfork.toml に表れる」「settings set の値が次の settings get で返る」。ブラウザspec:22–53は同じ3判定。shared:12–13はNode120秒/browser600秒。
- 検索による確認：session.test.mjsは引用符分割/cat/既存互換、runner.test.mjsはCLI/表/入口検証、probeは8項目と3回帰、aubeはnative一致、measureは計測形式。npm tarballからのimport/Worker/型/同梱ライセンスを対象としたテストは今回の一覧で見つからない。
- 既存品質上限（probe600秒、aube browser840秒、1worker、retriesなし、1GB）は引継ぎ制約。過去の合格数はdocs/nfr-summary.mdとterrarium-integration.mdのドキュメント根拠であり、今回の実行結果ではない。

### Code Quality Indicators

- **Linting**: root inventory と設定存在照会ではESLint/Prettier設定は見つからない。ソースのコメントは日本語、ESM、camelCase、JSDoc、境界検証を使用。
- **CI/CD**: root inventory/存在照会で `.github/` は見つからない。package.json にrelease/publish scriptなし。GitHub Release/npm Trusted Publishingの現行実装は確認できない。
- **Documentation**: README存在、OUTCOMES、12 ADR、architecture/NFR/failures/license/terrarium memoを確認。licenses.md:29–30は配布時にISCとEmscripten/musl表示を同梱する未実装工程を記載。
- エラーはguest-ioのGuestRunError、Node Worker境界のerrorメッセージ、ブラウザのstderr末尾添付、CLI終了コードに分かれる。stdout/stderrはcommon/Nodeでbytes、webでstream TextDecoderのtext（web/worker.mjs:15–18）。公開APIの出力型を確定する必要がある（推測・未検証）。

### Technical Debt Signals

| 所見 | 証拠・確信度 | 今回への影響 |
|---|---|---|
| npm設定と型定義が未整備 | package.json全体、runtime一覧に.d.tsなし。検証済み（ソース観測） | export/type/files/asset配置・tarball受入れを設計する |
| 汎用ブラウザWorkerではなくregistry名を解決する | web/worker.mjs:38–92、sessions.mjs:7–35。検証済み | terrariumのref別guest/fixture URLまたはbytesを受ける入口が必要（推測・未検証） |
| npm配置に依存するコアURL解決 | core.mjs:12–14、node/host.mjs:53、web/worker.mjs:33。検証済み | loader/wasm/pthread Workerの配信場所・URL・bundler条件を契約化する（推測・未検証） |
| custom coreの実行境界が限定的 | Node hostのcore引数、WorkerのblinkCore name表:13,40–41。検証済み | 将来置換時は記述子差替えだけでなくWorker選択表も必要。今回コア追加は対象外 |
| 呼出し間のFS受渡しが非公開 | Node Worker:64–72、web Worker:88–102。検証済み | terrarium run()のセッション状態/終了/タイムアウト/破棄を設計する（推測・未検証） |
| third-party表示の自動同梱なし | build-blink:132–149、licenses.md:29–30。ソース観測/ドキュメント根拠 | 実バイナリに含む表示を確認しpack manifestで固定。法律上の再評価はしていない |
| ビルド脚本にGit例が残る | fetch-blink.sh:35–54、build-blink:70–71、build-guests:66–68,100–118、build.test:45–57。検証済み | AGENTS.mdはjj操作を優先。今回これらコマンドを実行していない |
| 古いCodeKBのQ1/Q2/Q3は現行で解消済み | session.mjs:36–99,123–125、guest-io:363–366、registry、native-baseline:49–52、build-guests:19–22。検証済み | 過去のaube固定/引用符/cat不足を未修正課題として継承しない |

ドキュメント根拠：terrarium-integration.md:11–25はリンク・要素run()・iframeの3入口とライブラリ方式の案A推奨、5行目は組込み未実施。37–40の「ソースは変えずに」記述は同文書50/125–126のmuslパッチ例外と合わせて読む。実機Safari、file-backed MADV_DONTNEED復元、前面1台のみの性能測定は引継ぎ文書上の制約。JITはADR0002に従い今回提案しない。

## Re-scan after source guard refusal

公式 codekb-publish が SOURCE_CHANGED を返したため、親が旧candidate9件を破棄し、新snapshotを取得した後、developerリンクを再実施した。共有storeは未変更との親の観測報告に基づく。

- 公開に用いる新snapshot: store_generation `sha256:49b8bdbdc14a004ed1d2d235ad26c65cf3a7050877b083cc34043552be8cabec`、source_fingerprint `git:9f16536692bf955a61de0ad6b67a2333588fa94d`。
- 親は通常sandboxでも同じpathsを再snapshotし、`tree:7581ee26180ea5871c32085458804230c7c85d3b86abf4c5185d0bc323444834`が初回と完全一致することを観測した。これは同一アルゴリズムで対象ソースbytesが変わっていないという観測根拠であり、`git:`と`tree:`間の値の一致を主張するものではない。実行権限によるGit可用性とfingerprint namespace差は親の調査報告に基づく。通常guardでunknownだった検証をverifiedとして扱わない。
- 今回は新snapshotの後に2回の限定rg/Get-Contentで現在ソースを再観測した（両コマンド終了コード0）。Scan Coverageの25深いpathに関係するexport/import/契約・生成工程・ADR/制約・テストassertを再確認した。初回の深い読取は同一bytesの背景として用い、拒否されたcandidate9件を再利用していない。範囲は拡張していない。
- 再確認した主要証拠: package.jsonのprivate=trueと公開設定未定義、core.mjs:12/14の相対path、web/worker.mjs:13/33のwaitAsync無効化とloader解決、guest-io.mjs:248/363/383のsnapshot/cat/状態受渡し、registry.mjs:28/43/73の一元表、session.mjs:36/125の引用符分割/cat、build-blink-wasm.sh:36/138の1GBとbuild-info、build-guests.sh:87/124/127のmuslパッチとprovenance、licenses.md:29の同梱要件、pitchforkテストのnative一致・状態assert。旧Q1–Q3解消を同じ行から再確認した。
- 懸念・制約・深い/浅い範囲・実行未検証の評価は再観測結果と整合している。ビルド、テスト、pack、terrarium実行、publishはこの再スキャンでも実行していない。mint/publish/link receiptは親が新snapshotと同じ権限文脈で実行する。

## Handoff Summary

- **Intent-relevant finding**: 現行common JS/Worker実行基盤とpitchfork受入れテストは再利用候補だが、npm公開設定・型・同梱ライセンス・汎用ブラウザWorker・別呼出し間の状態API・公開CIは未整備（上記ソース観測）。npmコア配布とterrarium ref別ゲスト配布の境界を先に確定する必要がある（推測・未検証）。
- **Risks / follow-up**: 公開exportsとbytes/text結果型、Worker/wasm/pthread URL解決、guest/fixture注入、persist受渡し、timeout/terminate、COOP/COEP、pack allowlist、third-party notices/build provenance、RC→terrarium受入れ→stableのTrusted Publishingを後続設計で扱う。terrarium内部コード・実生成物・tarball実行・公開アカウント設定は今回未検証。
- **Preserve**: core固有知識の境界、delete Atomics.waitAsync（web/worker.mjs:13）、1GB、品質上限、network/daemon/一般対話CLI/JIT対象外、aube再ビルド回避、jj運用、人による公開対象確認と外向き操作の承認。
- **Verification handoff**: main sessionで後続実装に適した Node testsを逐次実行し、pack生成物からNode import・browser Worker・型コンパイル・ライセンス/wasm/build-info同梱を確認する。現行回帰コマンドは `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/session.test.mjs tests/node/pitchfork-basic.test.mjs`、ブラウザは `npx playwright test tests/browser/pitchfork-basic.spec.mjs`。mise実体パスを解決してmain sessionから実行する。今回はこれらを実行していない。


