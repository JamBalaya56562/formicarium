# テスト手順：blink を wasm 上で動かす PoC

## テストの枠組みと設定

- Node.js 側：組み込みの `node --test` を使う（追加の依存なし）。node は `mise.toml` で固定した版を、mise のインストール先から直接呼ぶ。
- ブラウザ側：Playwright（`@playwright/test`）で Chromium・Firefox・WebKit を使う。設定は `playwright.config.mjs`。ブラウザ本体は `npx playwright install chromium firefox webkit` で入れる。
- 前提（テストの前に 1 回）：`bash scripts/fetch-blink.sh` → `bash scripts/build-blink-wasm.sh` → `bash scripts/build-guests.sh` → `bash scripts/native-baseline.sh`。ゲストのビルドと native 基準値には wslc（`C:\Program Files\WSL\wslc`）が必要。

## このステージのテストの実行方法

すべてプロジェクトのルートで実行する。対象のファイルを明示し、プロジェクト全体を一括で実行するコマンドは使わない。

- ビルド（FR1.2）：`node --test tests/node/build.test.mjs`
- Node.js での実行（FR2.1）：`node --test tests/node/runner.test.mjs`
- probe（FR3、FR4、FR5、Node.js）：`node --test tests/node/probe.test.mjs`
- #1645（FR7.1、Node.js）：`node --test tests/node/aube-1645.test.mjs`
- 計測結果の形式（FR6）：`node --test tests/node/measure.test.mjs`
- ブラウザ（FR2.2、FR5.2、FR7.1）：`npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs`
- 再現性（NFR1）：`node --test tests/node/probe.test.mjs tests/node/aube-1645.test.mjs` を 3 回、`npx playwright test tests/browser/probe.spec.mjs --repeat-each=3`

最初のテストを書く前に、`node --test tests/node/build.test.mjs` が実行できる状態（node と `tests/node/` があること）を整える。

## 期待するカバレッジ

- `poc` の範囲なので、行カバレッジの下限は設けない。
- 要件ごとに最低 1 件のテストを書き、各コンポーネント（ビルド、Node.js ランナー、Web ランナー、probe、計測）に正常系を最低 1 件置く。全体で 10 件前後になる。
- 各テストファイルには、正常系に加えて、異常系か境界のケースを 2 件以上入れる（構築フェーズの規約）。例：存在しないゲスト、0 以外の終了コード、コミットの不一致、項目が欠けた計測 JSON。

## モックとスタブの方針

- blink とゲストは本物を使い、モックにしない（PoC の目的は本物が動くことの確認だから）。
- 計測 JSON の形式テストだけは、固定のサンプル JSON（`tests/fixtures/timings-*.json`）を使う。

## テストデータ

- probe：`dist/guests/probe`（Step 4 のビルド物）
- hello ゲストと終了コード 3 のゲスト：`guest/probe` と同じ Cargo ワークスペースに、小さなバイナリとして用意する（`dist/guests/hello`、`dist/guests/exit3`）。
- #1645：`fixtures/aube-local-deps/`（terrarium から取り込み）と `fixtures/baseline/aube-1645.native.txt`（native 基準値）
- テストは一時ディレクトリにコピーしてから実行し、fixtures 自体は書き換えない。

## Loop-back 1 の正確な実行手順

以下は今回の計画承認後に実行する手順。計画作成時点では未実行。すべてルートで逐次実行し、各終了コードを記録する。Node.js 実体を glob で解決し、そのディレクトリを PATH に足す（Playwright の webServer からも同じ node を使う）。裸の node / npx / mise exec を使わない。

```powershell
$nodeExe = (Get-ChildItem "$env:LOCALAPPDATA/mise/installs/node/24*/node.exe" | Sort-Object { [version]$_.Directory.Name } | Select-Object -Last 1).FullName
$env:PATH = "$(Split-Path $nodeExe);$env:PATH"
& $nodeExe --test tests/node/build.test.mjs
& $nodeExe --test tests/node/runner.test.mjs
& $nodeExe --test tests/node/probe.test.mjs
& $nodeExe --test tests/node/aube-1645.test.mjs
& $nodeExe --test tests/node/measure.test.mjs
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --workers=1 --retries=0 --output=test-results/loopback1-baseline --reporter=list
```

上記が変更前の正確な runner / baseline コマンド（保存済みログを基準として利用し、ソースや環境が変化していない場合は重複実行しない）。初回テストでなく既存スイートのため、すでにある 30 件 / 21 件の基準を保持する。stdout / stderr は呼び出しごとに別ファイルへ保存する。baseline 出力先は修正後に再利用しない。

既存欠陥の Node.js 診断コマンドは次のとおり。全 probe、個別項目を各 3 回逐次実行し、実行ごとに異なる stdout / stderr ファイルと exit code を保存する。syscall trace は性能計測値として扱わない。

```powershell
& $nodeExe runtime/node/run.mjs --core-flag -s --timeout 600 dist/guests/probe
& $nodeExe runtime/node/run.mjs --core-flag -s --timeout 600 dist/guests/probe tokio-timer
& $nodeExe runtime/node/run.mjs --core-flag -s --timeout 600 dist/guests/probe unix-stream-pair
& $nodeExe runtime/node/run.mjs --core-flag -s --timeout 600 dist/guests/probe rayon
& $nodeExe runtime/node/run.mjs --core-flag -s --timeout 600 dist/guests/probe mutex-condvar
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs --grep 'probe の全項目が PASS する' --project=chromium --repeat-each=3 --workers=1 --retries=0 --output=test-results/loopback1-chromium-diagnostic --reporter=list
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs --grep 'probe の全項目が PASS する' --project=webkit --repeat-each=3 --workers=1 --retries=0 --output=test-results/loopback1-webkit-diagnostic --reporter=list
```

ブラウザの syscall trace は Step 11 で許可した診断フラグ伝達の実装を使う。診断モードであることを証拠へ明記し、通常モードの合否と混同しない。WebKit の停止位置は tokio の終了か UnixStream の待ちか未確定であり、START/END の診断と tid 付き syscall で切り分ける。

最低限、特定した欠陥を直接再現するテストを 1 件追加する。対象ファイルは guest/probe/src/、tests/node/probe.test.mjs、tests/browser/probe.spec.mjs。回帰テスト名の共通 prefix を `loopback1:` とし、対象回帰を以下で実行できるようにする。追加は各経路の実装後（test-after）。既存欠陥の診断プログラムによる修正前の観測は許される。

```powershell
& $nodeExe --test --test-name-pattern='loopback1:' tests/node/probe.test.mjs
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs --grep 'loopback1:' --repeat-each=3 --workers=1 --retries=0 --output=test-results/loopback1-regression --reporter=list
```

R-03 は独立した診断 / 回帰として扱う。必要なら probe の `futex-deadline` 項目を実装し、bitset 不一致の反復 wake で期限前に timeout しないこと、一致 wake で解除されること、wake なしで期限満了することを記録する。修正前の現象と修正後の結果が対応していることを求める。thread/TLS の生成終了・mapping 寿命、socketpair の空待ち wake・境界・EOF の回帰も、診断で特定した経路だけを採用する。

修正後は冒頭の Node.js 5 コマンドすべてと、次の既存ブラウザ全体を実行する。テスト追加による件数増加はそのまま報告し、過去の 30 / 21 / 63 件を固定期待値にして追加テストを落とさない。

```powershell
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --workers=1 --retries=0 --output=test-results/loopback1-fixed --reporter=list
& $nodeExe node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --repeat-each=3 --workers=1 --retries=0 --output=test-results/loopback1-fixed-repeat --reporter=list
& $nodeExe --test tests/node/probe.test.mjs tests/node/aube-1645.test.mjs
```

最後の Node.js probe / aube コマンドは 3 回逐次実行する。既存 8 項目全 PASS、exit 0、aube native 一致、timeout なし、既存 suite の失敗 / skip 0 を維持する。probe 600 秒・aube 840 秒の上限、worker 1、retries 0 は下げも引き上げも行わない。新規テストファイルを増やす場合も正常系と 2 件の境界 / 異常系を持たせる。要件対応は単なるパス存在ではなく実行した assertion と結果で確認する。

## 証拠と環境の保持

- tests/browser/probe.spec.mjs / aube-1645.spec.mjs の finally または afterEach で、終了を待てないときも途中出力・全 stderr・pageerror・console・環境・test title・repeat index を保存する。aube の最終 transcript が stderr を消す前にストリームを保存する。
- 結果ディレクトリの再利用・ログ上書きを避ける。各 CLI stdout / stderr と終了コードも別途記録し、ブラウザ timeout を成功にしない。
- 修正したコピーを BLINK_SRC=.vendor/blink-src と明示して build-blink-wasm.sh と build-guests.sh probe を逐次実行し、生成物の source commit / dirty 差分を保存する。診断用と通常用の生成物を識別する。
- 真の blink / static-musl guest を使い、競合・wait / wake・時刻をモックしない。fixtures と native 基準値は変更しない。
- 性能計測は背景負荷を止めてから実行する。今回の調査テストは性能基準の測定を兼ねない。Windows 上の Playwright WebKit と Safari 実機は区別し、Safari 実機は未検証と記録する。

