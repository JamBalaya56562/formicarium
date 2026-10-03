# テスト手順：pitchfork を formicarium で動かす

## 枠組みと設定

- Node.js のテストは `node:test` と `node:assert/strict` で書く。設定ファイルは使わない
- ブラウザのテストは Playwright（`playwright.config.mjs`）を使う
  - 設定は既存のまま：Chromium・Firefox・WebKit、workers 1、再試行なし
- node は mise が管理しており PATH にないので、実体のパスを直接使う（`~/AppData/Local/mise/installs/node/*/node.exe`。バージョンはハードコードしない）。以下のコマンドの `node` はこの実体を指す
- AGENTS.md のとおり、ビルドとテストは main のセッションで実行する。スイートは 1 つずつ、ほかに重い処理を動かさない状態で実行する

## このテストの実行コマンド

既存のテストの実行方法と同じ形で、テストのファイルを 1 つずつ指定して実行します。`npm test` のようなプロジェクト全体のコマンドは使いません。

| 手順 | コマンド | 前提 |
|---|---|---|
| Step 3 | `node --test tests/node/build.test.mjs` | `bash scripts/build-guests.sh pitchfork` |
| Step 7 | `node --test tests/node/session.test.mjs` | なし（コアもゲストも要らない） |
| Step 9 | `node --test tests/node/runner.test.mjs` | なし |
| Step 11 | `node --test tests/node/pitchfork-basic.test.mjs` | `dist/blink/`、`dist/guests/pitchfork`、`fixtures/baseline/pitchfork-basic.native.txt` |
| Step 12 | `npx playwright test tests/browser/pitchfork-basic.spec.mjs` | Step 11 と同じ |

`tests/node/session.test.mjs` と `tests/node/runner.test.mjs` はビルド物を必要としないので、Step 2 の時点で実行できます。`build.test.mjs` は、ビルド物がなければ既存と同じ扱いになります。

既存のスイートの回帰確認（Step 1 と Step 13）は、AGENTS.md のコマンドで行います。

- `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs`
- `npx playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs`

## テストの一覧（Minimal：要件ごとに 1 つ以上）

| # | ファイル | 内容 | 要件 |
|---|---|---|---|
| 1 | `tests/node/session.test.mjs` | `--run "postgres -D data"` が 6 つの argv に分かれる | FR3.2 |
| 2 | 同上 | 単引用符・二重引用符・`\` を `sh` と同じに分ける | FR3.2 |
| 3 | 同上 | 閉じていない引用符と、引用符の外のメタ文字を拒否する | FR3.2 |
| 4 | 同上 | `cat` の解釈と、パス（`..` と絶対パス）の拒否 | FR3.1 |
| 5 | 同上 | `cat` のステップが中身を返し、存在しないファイルでは Error になる | FR3.1 |
| 6 | 同上 | `aube-1645.txt` の解釈結果が変わらない | FR3.3 |
| 7 | `tests/node/runner.test.mjs` | 表の手順のファイルが `fixtures/` に実在する。ゲストがビルドの対象に含まれる | FR4.1、FR2.1 |
| 8 | 同上 | 許可リストの外のゲスト名・手順名と、`session-info` の未知の名前を拒否する | FR4.2、NFR3 |
| 9 | `tests/node/build.test.mjs` | `dist/guests/pitchfork` が static な x86-64 の ELF である | FR1.1 |
| 10 | `tests/node/pitchfork-basic.test.mjs` | 書き起こしが基準値と一致する。状態が引き継がれる（db があり worker がない、`5s`） | FR5.1、FR6.1〜FR6.4 |
| 11 | `tests/browser/pitchfork-basic.spec.mjs` | 10 と同じ内容を Chromium・Firefox・WebKit で確かめる | FR6.1〜FR6.4 |

基準値の再現性（FR5.1、レビュー R-02）は、テストではなく `bash scripts/native-baseline.sh pitchfork-basic --check-reproducible` の終了コードで確かめます。

## カバレッジの目標

- 行カバレッジの数値目標は置きません（poc の範囲では、テストの追加に関する下限がないため。Testing Contract の scope_floor を参照）
- 目標は 2 つです。上の表の要件をすべて 1 つ以上のテストで確かめること。既存のスイートの合格数を維持すること（Node.js 41、ブラウザ 33）

## モックとスタブ

- `cat` のステップの単体テスト（#5）では、`runSession` に cat のステップだけを渡します。この場合 `createModule` は呼ばれないので、呼ばれたら失敗する関数を渡しておき、コアを起動していないことも確かめます
- それ以外は、実物の blink とゲストを使う結合テストです。ゲストの出力をモックで置き換えることはしません

## テストデータ

- 入力は `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` です。テストの中では仮想ファイルシステムに写すだけで、書き換えません
- 正解は `fixtures/baseline/pitchfork-basic.native.txt` です。`scripts/native-baseline.sh` だけが作ります。手で編集しません
- 単体テストの入力は、テストのファイルの中に文字列で書きます
