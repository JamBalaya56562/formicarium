# コード生成計画：pitchfork を formicarium で動かす

## 前提と入力

- 要件：`inception/requirements-analysis/requirements.md`（FR1〜FR8、NFR1〜NFR3）。ユーザーストーリーと Units Generation は poc の範囲外のため、各ステップは要件 ID に対応づける
- コード知識ベース：`aidlc/spaces/default/codekb/formicarium/`（特に `code-quality-assessment.md` の Q1〜Q6）
- 要件の段階でレビューから受け入れた指摘のうち、安く対応できるものはこの計画に含めた。内容は次のとおり
  - 調査メモの中身と置き場所を決める
  - 基準値の再現性を確かめる
  - 許可リストの外の名前を拒否するテストを置く
  - static であることを確かめる
  - 時間の上限の決め方を決める
  - 前提 2 件を早い段階で確かめる
- 方式：test-after（下の Testing Contract）。層ごとに、実装してからその層のテストを書いて実行する

## 影響範囲（変更するファイル）

| ファイル | 変更 | 影響 |
|---|---|---|
| `runtime/session.mjs` | `cat` の手順、`sh` 互換の引数分割、ツール名の受け取り方 | 中（Node・ブラウザ・テストが使う） |
| `runtime/guest-io.mjs` | `runSession` に `cat` のステップを追加 | 中（すべての手順の実行） |
| `runtime/web/sessions.mjs` | 一覧を新しい表から読む形に変更（`GUESTS`／`GUEST_ENV`／`SESSIONS` の公開は維持） | 中（ページ・Worker・テスト） |
| `runtime/registry.mjs`（新規） | ゲスト・環境変数・手順の 1 つの表 | 新規 |
| `runtime/web/worker.mjs` | 手順の解釈に、その手順のツール名を渡す | 低 |
| `scripts/native-baseline.sh` | 手順名を引数で受け取り、表から設定を得る。再現性の確認オプション | 中（基準値の作成） |
| `scripts/session-info.mjs`（新規） | `native-baseline.sh` に表の内容をシェル変数として渡す | 新規 |
| `scripts/build-guests.sh` | `pitchfork` の対象を追加。static であることの確認 | 低 |
| `fixtures/sessions/pitchfork-basic.txt`、`fixtures/pitchfork-basic/app/pitchfork.toml`（新規） | terrarium から写す | 新規 |
| `fixtures/baseline/pitchfork-basic.native.txt`（新規） | native の基準値 | 新規 |
| `tests/node/session.test.mjs`（新規）、`tests/node/runner.test.mjs`、`tests/node/build.test.mjs`、`tests/node/pitchfork-basic.test.mjs`（新規）、`tests/browser/pitchfork-basic.spec.mjs`（新規） | テスト | 新規・追記 |
| `package.json` | テスト用スクリプトを追加 | 低 |
| `docs/terrarium-integration.md`（新規）、`README.md`、`AGENTS.md` | 調査メモ（FR8）と手順の追記 | 低 |

aube のソースとビルド物は変更しない。`dist/guests/aube` を再ビルドせずにそのまま使う。

## 手順

### Step 1: 既存テストの基準を記録する（NFR1）

- [x] Node.js の既存スイートを実行し、合格数・不合格数を記録する（2026-10-05 の記録は 41/41）
  - コマンド：`node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs`
- [x] ブラウザの既存スイートを実行し、同じく記録する（2026-10-05 の記録は 33/33）
  - コマンド：`npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs`
- 2 つのスイートは 1 つずつ、ほかに重い処理を動かさない状態で実行する（AGENTS.md）

### Step 2: テストの実行方法を確かめ、正確なコマンドを記録する（Testing Contract の runner_step）

- [x] `node --test`（mise の node の実体）と `npx playwright test` が Step 1 と同じ形で動くことを確かめる
- [x] 確かめたコマンドを `unit-test-instructions.md` に書く

### Step 3: pitchfork ゲストをビルドする（FR1.1、FR1.2、NFR3）

- [x] `scripts/build-guests.sh` に対象 `pitchfork` を追加する
  - 取得元は公式の `https://github.com/jdx/pitchfork.git` のタグ `v2.29.0`（`PITCHFORK_REF`、ref の文字種は aube と同じく検査する）
  - `rust:alpine` で `cargo build --release --locked --target x86_64-unknown-linux-musl` を実行し、`dist/guests/pitchfork` に置く
  - コミットを `dist/guests/pitchfork.commit` に記録する
  - pitchfork のソースは変えない
- [x] 生成物の確認を強める。全ゲストについて、x86-64 の ELF であることに加え、static であることを確かめる（プログラムヘッダに `PT_INTERP` がない）
- [x] ビルドする：`bash scripts/build-guests.sh pitchfork`。aube は再ビルドしない
- [x] テストを書いて実行する：`tests/node/build.test.mjs` に、`dist/guests/pitchfork` が static な x86-64 の ELF であることを足す

### Step 4: 前提 2 件を native で確かめる（requirements.md の Assumptions）

- [x] busybox のコンテナ（ネットワークなし）で、fixture を `/work/app`、HOME を `/root` に置いて 8 コマンドを native に実行する
- [x] 各コマンドの前後で `find / -newer` を使い、pitchfork が書き込んだパスを一覧にする
- [x] `pitchfork status api` の stdout・終了コード・stderr を記録する
- [x] 判定：書き込み先がすべて `/work` か `/root` の下にあれば、`persist` の範囲は今のままにする。外にあれば、その手順の `persist` を広げる（Step 7 で表に持たせる）
- [x] 結果は `code-summary.md` に書く

### Step 5: fixture を取り込む（FR2.1）

- [x] `../terrarium/fixtures/sessions/pitchfork-basic.txt` を `fixtures/sessions/pitchfork-basic.txt` に写す
- [x] `../terrarium/fixtures/pitchfork-basic/` を `fixtures/pitchfork-basic/` に写す
- [x] 出どころは記録しない（Q7）

### Step 6: 手順の解釈を実装する（業務ロジック層。FR3.1、FR3.2、FR3.3）

- [x] `runtime/session.mjs` に `splitShellWords(text)` を足す。分け方は `sh -c` と同じ規則
  - 単引用符
  - 二重引用符（中の `\` は `$`、`` ` ``、`"`、`\` の前だけエスケープとして扱う）
  - 引用符の外の `\`
  - 閉じていない引用符は Error にする
  - `|`、`;`、`&`、`<`、`>`、`$`、`` ` ``、`*`、`?` が引用符の外にあれば、解釈できないものとして Error にする（native の `sh` と結果が食い違うのを防ぐ）
- [x] `parseSessionScript(text, { tool })` を `splitShellWords` の結果で判定する形に変える。受け付けるのは次の 3 つ
  - `<tool> ...`：ゲストの実行
  - `rm -rf <相対パス>`
  - `cat <相対パス>`：`{ command, catFile }`
  - `rm` と `cat` のパスは、`..` を含むものと `/` で始まるものを拒否する
- [x] `toSessionSteps` で、`catFile` を `{ catFile: '<cwd>/<path>' }` に変える
- [x] `runtime/guest-io.mjs` の `runSession` に `catFile` のステップを足す
  - 引き継いでいるファイルからその中身を stdout に返し、終了コードは 0 とする
  - 対象が `persist` の範囲の外、存在しない、またはディレクトリのときは Error にする（FR3.1 の異常系）

### Step 7: ステップ 6 のテストを書いて実行する（FR3.1、FR3.2、FR3.3）

- [x] 新しく `tests/node/session.test.mjs` を作る。テストは次のとおり
  1. `pitchfork daemons add db --run "postgres -D data"` が 6 つの argv に分かれる（FR3.2、正常）
  2. 単引用符・二重引用符の中の `\"`・引用符の外の `\ ` を、`sh` と同じに分ける（FR3.2、境界）
  3. 閉じていない引用符と、引用符の外のメタ文字を拒否する（FR3.2、異常）
  4. `cat pitchfork.toml` を `catFile` として解釈し、`cat ../x` と `cat /etc/passwd` を拒否する（FR3.1、正常と異常）
  5. `cat` だけの手順を `runSession` で実行すると中身がそのまま返り、存在しないファイルでは Error になる（FR3.1。`cat` のステップは blink を起動しないので、コアなしで単体テストできる）
  6. `fixtures/sessions/aube-1645.txt` の解釈結果が、変更前と同じ steps になる（FR3.3）
- [x] 実行する：`node --test tests/node/session.test.mjs`

### Step 8: ゲストと手順の表を 1 か所にまとめる（FR4.1、FR4.2、NFR3）

- [x] 新しく `runtime/registry.mjs` を作る。ゲスト・ゲストごとの環境変数・手順を 1 つの表にする
  - 手順ごとに持つ項目：`guest`、`script`、`projectBase`、`projectFiles`、`projectRoot`、`cwd`、`persist`
  - aube（`AUBE_NO_UPDATE_CHECK=1`）と pitchfork の両方を載せる
  - pitchfork の環境変数は Step 4 の結果で決める。必要がなければ空にする
- [x] `runtime/web/sessions.mjs` は表から `GUESTS`／`GUEST_ENV`／`SESSIONS` を作って公開する
  - パスはこのファイルからの相対パスのまま
  - 名前の正規表現 `NAME` と `parseRunRequest` の検証は変えない
- [x] `runtime/web/worker.mjs`：`parseSessionScript` に `{ tool: session.guest }` を渡し、`persist` に表の値を使う
- [x] Node.js のテストは表から設定を読む。`tests/node/aube-1645.test.mjs` は `GUEST_ENV` の参照先だけが変わる
- [x] 新しく `scripts/session-info.mjs <name>` を作る。表から 1 つの手順の設定を、シェルで安全に読める形（`KEY='value'` で、値の `'` はエスケープする）で出力する。名前は `NAME` と表で検証する
- [x] `scripts/build-guests.sh` のビルド手順はシェルに残す
  - ビルドの対象は `probe|aube|pitchfork|all`
  - 表の `GUESTS` にあるゲストがすべてビルドの対象に含まれることは、Step 9 のテストで確かめる。ビルド手順そのものはシェルの処理なので、表には置かない

### Step 9: ステップ 8 のテストを書いて実行する（FR4.1、FR4.2）

- [x] `tests/node/runner.test.mjs` に足すテストは次のとおり
  1. 表のどの手順についても、`script` と `projectFiles` が `fixtures/` に実在する
  2. 表の `GUESTS` の名前が、すべて `build-guests.sh` のビルドの対象に含まれる
  3. 許可リストにないゲスト名・手順名（`?guest=sh`、`?session=../x`、`?session=pitchfork-other`）が `parseRunRequest` で拒否される（FR4.2、レビュー R-03）
  4. `scripts/session-info.mjs` が、未知の名前を終了コード 0 以外で拒否する
- [x] 実行する：`node --test tests/node/runner.test.mjs`

### Step 10: native の基準値を作る（FR5.1）

- [x] `scripts/native-baseline.sh [<session>]`（既定は `aube-1645`）に変える
  - 手順の設定は `scripts/session-info.mjs` から得る
  - 受け付けるコマンドは `<guest>`、`rm -rf`、`cat`
  - 実行は今と同じく busybox のコンテナで、ネットワークなし、`sh -c` で行う
  - 実行のたびに fixture を置き直す
- [x] `--check-reproducible` を付けたときは、2 回作って一致することを確かめ、一致しなければ終了コード 1 にする（レビュー R-02）
- [x] 実行する：`bash scripts/native-baseline.sh pitchfork-basic --check-reproducible` → `fixtures/baseline/pitchfork-basic.native.txt`
- [x] 実行する：`bash scripts/native-baseline.sh aube-1645 --check-reproducible`。既存の基準値と同じ内容になることを `git diff` で確かめる（FR4 の作り替えで基準値が変わっていないこと）

### Step 11: Node.js で実行して一致を確かめる（FR6.1〜FR6.4、FR7）

- [x] 新しく `tests/node/pitchfork-basic.test.mjs` を作る。`runInWorker` で手順を実行して確かめる内容は次のとおり
  1. 書き起こしが、基準値と `normalizeTranscript` で一致する（FR6.2）
  2. `cat pitchfork.toml` の出力に `[daemons.api]` と `[daemons.db]` があり、`[daemons.worker]` がない。`db` の `run` は `postgres -D data`（FR6.3）
  3. `settings get general.interval` の stdout が `5s`（FR6.3）
- [x] 実行する：`node --test tests/node/pitchfork-basic.test.mjs`
- [x] 不一致があれば、blink の fork か formicarium 側を直して一致させる（FR7.1）
  - 直したら、そのつど Step 1 の既存スイートを再実行する
  - 直せなければ、コマンド・環境・差分・原因を `docs/results/failures.md` に記録し、不合格として報告する（FR7.2）
- [x] 時間の上限：最初の 3 回の実行時間を記録し、最大値の 3 倍を 60 秒単位で切り上げた値を、このテストの上限にする。値と根拠は `code-summary.md` に書く（NFR2、レビュー R-04）

### Step 12: ブラウザ 3 種で実行して一致を確かめる（FR6.1〜FR6.4、FR7）

- [x] 新しく `tests/browser/pitchfork-basic.spec.mjs` を作る。既存の `aube-1645.spec.mjs` と同じ形で `?session=pitchfork-basic` を開き、Step 11 の 1〜3 を Chromium・Firefox・WebKit で確かめる
  - 診断の保存には `tests/browser/diagnostics.mjs` を使う
- [x] `package.json` の `test:browser` に新しい spec を足し、`test:pitchfork` を追加する
- [x] 実行する：`npx playwright test tests/browser/pitchfork-basic.spec.mjs`
- [x] 時間の上限は Step 11 と同じ決め方で決める。不一致の扱いも Step 11 と同じ（FR7）

### Step 13: 既存テストに回帰がないことを確かめる（NFR1、NFR2）

- [x] Step 1 と同じ 2 つのコマンドを実行し、合格数が Step 1 と同じであることを確かめる
  - 既存の上限（600 秒、840 秒、workers 1、再試行なし、wasm のメモリ上限 1 GB）は変えない

### Step 14: 調査メモと文書（FR8.1）

- [x] 新しく `docs/terrarium-integration.md` を作る。少なくとも次の見出しを置く
  1. terrarium での使い方の案（`runtime/` をライブラリとして読み込む／ページを iframe で埋め込む、の比較）
  2. terrarium 側で必要な変更
  3. ゲストを 1 つ足すのに要った変更（今回の実績）
  4. 制約：COOP/COEP、ネットワークなし、wasm のメモリ上限
  5. 置き換えの判断材料として測った値：ゲストとコアのサイズ、手順ごとの実行時間
  6. 未解決の事項
- [x] `README.md` と `AGENTS.md` に、pitchfork のビルド・基準値・テストのコマンドを追記する

### Step 15: 記録

- [x] `code-summary.md`、`source-manifest.json`、`traceability.json` を書く（結果を FR・NFR の ID に対応づける）

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
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
  "input_sha256": "sha256:ddd208517f68585f816e80821872bd21e26dc15e7bf545c6a78ec96b6afc20da",
  "contract_sha256": "sha256:8780c9b6738d34215859c7d0d02b149a16944cf2942a43d2c2dee67268c80df0"
}
```

Testing Contract の層と、この計画の手順の対応は次のとおりです。

| 層 | 対応する手順 |
|---|---|
| Data model / database | 該当なし（データベースはない） |
| Repository / data access | 引き継ぐファイルの読み出し。Step 6 の `catFile`、テストは Step 7 |
| Business logic | 手順の解釈。実装は Step 6、テストは Step 7 |
| API / endpoint | ゲストと手順の表、URL の検証、`session-info`。実装は Step 8、テストは Step 9 |
| Frontend behavior | ブラウザでの実行。実装とテストは Step 12 |
| Environment/build configuration | Step 3、Step 10 |
| Documentation and traceability | Step 14、Step 15 |

## 要件との対応

| 要件 | 手順 |
|---|---|
| FR1.1、FR1.2 | Step 3 |
| FR2.1 | Step 5 |
| FR3.1、FR3.2、FR3.3 | Step 6、Step 7 |
| FR4.1、FR4.2 | Step 8、Step 9 |
| FR5.1 | Step 10 |
| FR6.1〜FR6.4 | Step 11、Step 12 |
| FR7.1、FR7.2 | Step 11、Step 12 |
| FR8.1 | Step 14 |
| NFR1 | Step 1、Step 13 |
| NFR2 | Step 11、Step 12、Step 13 |
| NFR3 | Step 3、Step 8、Step 9 |
| Assumptions（前提 2 件） | Step 4 |
