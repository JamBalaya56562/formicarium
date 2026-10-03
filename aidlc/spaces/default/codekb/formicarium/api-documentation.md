# API Documentation

> 範囲と証拠：旧資料はUNVERIFIED。SOURCE_CHANGED拒否後の新snapshotとdeveloper再スキャンから統合した。今回のソース観測だけを再確認済みとして扱い、範囲外の旧記述は背景資料（未検証）として保持する。reverse-engineering-timestamp.mdを参照。

## 外部に見える API

以下は developer のスキャン（ファイルの読み取り）による。実行しての確認はしていない。

### CLI：`runtime/node/run.mjs`

```
node runtime/node/run.mjs [--copy-in host:/guest] [--cwd <dir>] [--env K=V] [--timeout <s>] [--core-flag <f>] <guest> [args...]
```

| 終了コード | 意味 |
|---|---|
| ゲストの終了コード | 正常に実行できた |
| 2 | 使い方の誤り |
| 124 | 時間切れ |
| 70 | 内部エラー |
| 127 | ゲストが見つからない（`EXIT_NOT_FOUND`） |

### ブラウザのページ：`runtime/web/index.html` ＋ `app.mjs`

- `?guest=<name>&arg=...`：単体のゲスト。名前は `GUESTS` にあるもの（`probe`、`hello`、`exit3`、`aube`、`pitchfork`）。引数は 1 つ 4096 文字まで
- `?session=<name>`：手順。名前は `SESSIONS` にあるもの（`aube-1645`、`pitchfork-basic`）
- `&core-flag=-s`：診断用（`-s` 以外は拒否）
- 結果：`window.formicariumResult`（`exitCode`、`transcript`、`steps`、`elapsedMs` など）と `window.formicariumDiagnostics`

### 開発用 HTTP：`scripts/serve.mjs`

GET／HEAD の静的配信（既定 `127.0.0.1:8787`）。すべての応答に COOP／COEP／CORP を付ける。ヘッダーを付けられない配信先では `runtime/web/coi-sw.js` を使う。

## 内部のモジュール API

| モジュール | 公開しているもの |
|---|---|
| `runtime/core.mjs` | `blinkCore`（`name`、`loaderPath`、`buildInfoPath`、`argv()`）、`defaultCore` |
| `runtime/guest-io.mjs` | `validateEntries`、`populateFs`、`snapshotFs`、`removeTree`、`createOutputCollector`、`runGuest`、`runSession`、`GuestRunError`、`DEFAULT_CWD='/work'`、`GUEST_DIR='/guest'` |
| `runtime/session.mjs` | `splitShellWords`、`parseSessionScript(text, { tool = 'aube' })`、`toSessionSteps(commands, cwd)`、`formatTranscript(commands, results)`、`normalizeTranscript` |
| `runtime/node/host.mjs` | `runInWorker({ guest, args, copyIn, env, cwd, steps, persist, coreFlags, timeoutMs, onStdout, onStderr, core })`、`GuestNotFoundError`、`EXIT_NOT_FOUND=127` |
| `runtime/web/sessions.mjs` | registry由来の一覧と `parseRunRequest(searchParams)`（所有はruntime/registry.mjs） |

## 契約（データの形）

- **手順ファイル**：`#` で始まる行はコメント。`$ <command>` の行が 1 コマンド。現在受け付けるのは `<tool> ...`（既定 `aube`）、`rm -rf <相対パス>`、`cat <path>`。引用符を解釈し、展開/パイプ等を拒否する
- **書き起こし**：コマンドごとに `$ <command>`、stdout、`[exit <code>]`。stderr は含めない。比較は `normalizeTranscript`（改行コード、行末の空白、末尾の改行だけをそろえる）
- **Worker のメッセージ**：`stdout`／`stderr`（Node はバイト、ブラウザはテキスト）、`done`、`error`（`message` と、コアの `stderr` の末尾）
- **ファイルの項目（entries）**：`{ path, type: 'file', data, mode }`。パスの `..` は拒否する

## 現行API契約の更新（2026-10-06）
以下は検証済み（ソース観測）、実行確認は未検証。
| 境界 | 現行の契約と根拠 |
|---|---|
| guest-io | entries は絶対pathのfile/dir/symlink。runGuestはexitCode/stdout/stderr/optional snapshot、runSessionは結果配列。snapshotはhard link同一性・mtime・device/FIFOを保存しない（guest-io.mjs:88–145,206–294,332–387） |
| session | splitShellWords、parseSessionScript、toSessionSteps、formatTranscript、normalizeTranscript。tool/rm -rf/catだけを許し、展開/パイプ等を拒否（session.mjs:36–99,136–194） |
| registry | NAME/GUESTS/SESSIONS/lookupSession。probe/hello/exit3/aube/pitchfork、aube-1645/pitchfork-basic（registry.mjs:12,28–81） |
| Node | projectRoot/EXIT_NOT_FOUND/GuestNotFoundError/runInWorker。guestはホストパス、copyIn/steps/persist/callbacks/timeoutMs/coreを受ける（node/host.mjs:16–114） |
| Worker | Nodeのstdout/stderrはbytes、webはTextDecoderのtext。doneはNodeでもbrowserでもsnapshotを公開していない（node/worker.mjs:64–72、web/worker.mjs:15–18,88–102） |
| HTTP | dev-server はGET/HEAD、COOP same-origin、COEP require-corp、CORP same-origin（serve.mjs:25–29,49–93） |

推測・未検証：terrariumの要素/run()/iframe維持のために、汎用guest注入、資産URL、別呼出し間の状態、結果型、timeout/破棄を決める必要がある。現行 browser Worker はregistry名を解決する入口であり、terrarium ref別の任意guest URL/bytes を受ける公開契約は確認できない（web/worker.mjs:38–92）。npmの公開exports/型も未整備。
