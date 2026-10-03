# Code Quality Assessment

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

根拠の種類は developer のスキャンに合わせ、「検証済み（読み取り）」＝ファイルを読んで確かめたもの、「未検証」＝実行して確かめていないもの、「推測」と書く。今回はテストもビルドも実行していない。

## テスト

- 枠組み：`node:test` ＋ `node:assert/strict`、Playwright（`tests/browser/diagnostics.mjs` が各テストの診断 JSON を保存）
- 性格：実質的に結合テスト。ビルド物（`dist/blink`、`dist/guests`、native の基準値）を前提にする
- 判定：probe は stdout の `PASS <名前>` と終了コード。aube は `normalizeTranscript(transcript) === normalizeTranscript(baseline)`
- 結果の記録：2026-10-05 に Node.js 41/41、ブラウザ 33/33（`README.md`。未検証：今回は実行していない）
- カバレッジの設定：なし
- 上限：probe 1 回 600 秒、ブラウザの aube 840 秒、workers 1、再試行なし（`AGENTS.md`。緩めないこと）

## リンター・CI・文書

- リンター／フォーマッタ：なし（ESLint・Prettier・rustfmt の設定ファイルがない）
- CI/CD：なし（パイプラインの定義がなく、リモートもない）
- 文書：充実している。`README.md`、`AGENTS.md`、`OUTCOMES.md`、`docs/architecture.md`、ADR 12 件、`docs/results/failures.md`。各ソースの先頭に目的と FR 番号のコメント
- 入力の検証：境界ごとにある（パスの `..` の拒否、URL の許可リスト、`blink.lock` の書式チェック）

## 旧 intent の所見（pitchfork の追加、現行補正済み）

| # | 所見 | 場所 | 検証状況 |
|---|---|---|---|
| Q1 | 解消済み：cat を扱う | runtime/session.mjs:36–99、guest-io.mjs:363–366 | 検証済み（ソース観測）、実行は未検証 |
| Q2 | 解消済み：splitShellWords が引用符を扱う | runtime/session.mjs:36–99 | 検証済み（ソース観測）、native一致は今回未検証 |
| Q3 | 解消済み：registry に5ゲスト・2手順、shellもsession-info経由で選択しpitchforkを扱う | registry.mjs:28–81、native-baseline.sh:49–52、build-guests.sh:19–22 | 検証済み（ソース観測） |
| Q4 | 手順の間でファイルを引き継ぐのは `persist` のディレクトリだけ（`runSession` の既定は cwd と HOME、ブラウザの手順では `[projectRoot, '/root']`）。hard link は別々のファイルになり、mtime などは引き継がない（`mode` だけ）。pitchfork の状態や設定の置き場所（`pitchfork.toml` の場所、`settings set` の書き先が HOME 以下か XDG のディレクトリか）が範囲の外だと、次の手順に引き継がれない | `runtime/guest-io.mjs:348–384`、`runtime/web/worker.mjs` | 引き継ぎの仕組みは検証済み（読み取り）。pitchfork の書き先は未検証 |
| Q5 | `pitchfork status` などが、スーパーバイザーのない状態で UNIX ドメインソケットや IPC に触る可能性がある。fork は inet の `socket()` を `EAFNOSUPPORT` で拒否するが、AF_UNIX の connect の失敗の仕方が native と同じかは確かめていない。stderr は書き起こしに含めないので、比べるのは stdout と終了コードだけ | `docs/architecture.md`、fork の `50bc466` | 未検証 |
| Q6 | pitchfork の初期の `pitchfork.toml` は terrarium の `fixtures/pitchfork-basic/` にあると見られる。旧intent当時は formicarium の `fixtures/` へ取り込み出どころを記録する案を仮説として挙げた。現intentでは未採用であり、guest/fixtureはterrarium側でref別配布する意図が記録されている（aidlc-state.md、ドキュメント根拠） | リポジトリの外（`../terrarium`） | 未検証（中身は読んでいない） |

再利用候補（推測・未検証）：`runtime/core.mjs` と `runtime/guest-io.mjs` の `runGuest`／`runSession` はゲストに依存しない（検証済み（読み取り））。入力ファイルは、Node では `copyIn`（`runtime/node/worker.mjs:16` の `readHostTree`）、ブラウザでは `SESSIONS[].projectFiles` を `fetch` して置く。

## 技術的負債

- 上の Q1〜Q3 は解消済み（再スキャンのソース観測）。native と JS の出力一致は今回再実行していない。
- `patches/` の 3 つのパッチは fork のコミット `7e1d743`・`4b5c67d` に取り込み済みの写し（記録用）
- `.vendor/blink-src`（jj で管理する開発用のチェックアウト）と `.vendor/cfg.log`（Windows での emconfigure の失敗ログ）が残っている（gitignore の対象）
- 空の `sh/` ディレクトリ（用途不明）
- コンテナのイメージはタグだけで固定しており、ダイジェストでは固定していない（`dependencies.md`）
- リンターと CI がない。テストはビルド物と長い実行時間を前提にする

## 守るべき制約

- 品質の上限（テストの時間、workers 1、再試行なし、wasm のメモリ上限 1 GB）は緩めない
- ブラウザの実行用 Worker の `delete Atomics.waitAsync`（`runtime/web/worker.mjs:13`、ADR 0009）は残す
- aube は再ビルドせず `dist/guests/aube` を使う（project.md の Corrections）。新しいゲストは `build-guests.sh` に対象を足し、`rust:alpine` で `--locked --target x86_64-unknown-linux-musl` でビルドし、取得元（タグとコミット）を記録する

## 今回の品質所見（2026-10-06）
検証済み（ソース観測）：旧Q1/Q2/Q3は現行ソースで解消済み。session.mjs:36–99,123–125 とguest-io.mjs:363–366が引用符/catを扱い、registry・session-info/native-baseline:49–52・build-guests:19–22がゲスト/手順選択とpitchforkを扱う。旧Q1〜Q3を未修正の技術的負債として扱わない。Q4〜Q6の旧仮説とfork内部の挙動は今回の動作確認を行っていない。
| 所見 | 根拠 | 区分 |
|---|---|---|
| npm公開設定・型未整備 | package.json全体、runtime inventoryに.d.tsなし | 検証済み（ソース観測） |
| 公開CI/pack受入れ未整備 | root inventoryで.github/なし、release/publish scriptsなし、tarball import/Worker/type/noticesテストは一覧で見つからない | 検証済み（ソース観測） |
| browser入口のregistry依存、呼出し間snapshot未公開 | web/worker.mjs:38–102、node/worker.mjs:64–72 | 検証済み（ソース観測） |
| ライセンス同梱工程なし | build-blink-wasm.sh:132–149、docs/licenses.md:29–30 | ソース観測/ドキュメント根拠 |
| coverage数値・テスト成功・npm/terrarium動作 | 今回実行していない | 未検証 |

既存build testはwasm magic/ESM/lock/dirty=false/JITなし/pthread/1GB/provenanceをassertする（build.test.mjs:21–40,95–139）。pitchforkテストはNode3判定/browser3判定を持つ（Node:51–74、browser:22–53）。存在は成功証拠ではない。
守る制約：probe600秒、aube browser840秒、1worker、retryなし、8項目全通過、native一致、1GB、delete Atomics.waitAsync、aube再ビルド回避、C fork JIT対象外、jj運用。後続テストはmain sessionで逐次実行する。
具体的な検証手順（未実施）：mise実体Nodeで `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/session.test.mjs tests/node/pitchfork-basic.test.mjs`、Playwrightで `npx playwright test tests/browser/pitchfork-basic.spec.mjs`。npm整備後はtarballからNode import/browser Worker/型コンパイル/notices・wasm・build-info同梱を確認する。
