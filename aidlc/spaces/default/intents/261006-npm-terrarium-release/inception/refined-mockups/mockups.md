# Refined Mockups

## Sources

- [memory:M1] user-stories/stories.md：利用手順別18ストーリーと受入条件。
- [memory:M2] requirements-analysis/requirements.md：承認済み機能/品質条件。
- [memory:M3] terrariumのweb/index.html、web/terminal.mjs、packages/terrarium/src/terminal.tsをGet-Content/rgで読取り（exit0）。基準commitは60dd0dc448f3a67d226dc8a3c6b3afcf4709823d。
- [memory:M4] practices-discovery/team-practices.md。

## Design Scope

classicではrough-mockupsがないため、承認済み要件/ストーリーから直接作成した。formicariumは画面を所有しないライブラリで、terrariumの既存端末がUIを所有する。以下は状態と開発者体験の仕様図であり、製品動作のスクリーンショットではない。API名やイベントpayloadの新しい契約はここで確定せず、Contract Designで基準との比較表を固定する。

## Mockups

### M1 API consumerの利用手順

```text
空consumer
  → pack済みtarballを導入
  → Node用またはbrowser用public入口をimport
  → guest / args / env / cwd / files / assetsを指定
  → 実行を待つ
  → stdout・stderr・exitCode、または開始失敗/timeout/中止
  → 同一セッションの次操作、または終了処理
```

公開名を使う最小例は型定義と同時にContract Designで確定し、元repo参照を要求しない。guest/fixtureはterrariumのref別配布でありtarballへ混ぜない。非UTF-8の原データを保持し、terrariumの表示用text変換と分ける。画面や公開GUIは追加しない。

### M2 既存ページの初期化・empty・loading

```text
┌ terrarium ─────────────────────── Loading… ┐
│                                            │
│          既存の端末表示領域                │
│                                            │
└────────────────────────────────────────────┘
```

構造はheader＋main＋terrarium-terminal。Tool/Build/sourceの初期hidden状態は基準を保持する。隔離不足時は原因表示、対応条件下では資産読み込みへ進む。架空のprogress％、spinner、再試行ボタンを追加しない。fixtureなしは有効な空状態として区別し、未知fixture/未配布refは成功した空状態へ変換しない。

### M3 ready・running・exit

```text
┌ terrarium · <tool> [Tool▼] [Build▼] source ┐
│                           Ready in <n> s  │
├───────────────────────────────────────────┤
│ <基準のprompt> <command>                   │
│ <既存形式のoutput / transcript>           │
│ <次のprompt（基準に従う）>                │
└───────────────────────────────────────────┘
```

表示文字列・prompt・イベント順序は基準比較で確定し、この図のplaceholderを製品文字列として実装しない。Toolは公開buildのある複数候補がある時に表示する。Build変更はrefを更新し、Tool変更はref/fixture/cwd/queued runを基準どおりresetする。実行中と終了後の入力受付は基準を保持する。guest非0終了は初期化失敗と分け、元のcode/outputを返す。

### M4 error・unsupported・拒否

```text
┌ 既存header … <原因を示す状態テキスト> ────┐
│ <既存端末のエラー表示面>                  │
│ <原因と、利用者が修正できる入力項目>      │
└───────────────────────────────────────────┘
```

例の内容（最終文言は契約設計で固定）：未配布refは選んだrefを示す、未知fixtureはfixtureを示す、対象外shell構文は許可された構文への修正対象を示す、資産404は資産URLの確認先を示す。入力envの値・stack trace・内部管理用語を利用者へそのまま出さない。新たな別refへのfallbackやUI再設計はしない。

embedでは既存どおりheaderを非表示とし、要素の既存表示面と承認済み親へのterrarium:errorで失敗を伝える。未承認親には通知も実行も行わない。隔離不足で要素をmountできない場合の既存表示経路を調査し、既存面で原因を伝える具体方式を契約設計で確定する。エラー通知だけで未実行を主張せず、marker/呼出し監視で確認する。

### M5 partial・長い出力・終了競合

端末領域の既存scroll/fitを保ち、長いcommand/ref/output、空stdout＋stderr、非UTF-8、guest非0終了、timeout、中止、遅延通知を別fixtureで比較する。timeout/中止は1回の終了結果へ収束し、古い通知が次実行へ混ざらない。ファイル状態は同一端末のみ継続し、reset/終了後と別端末の状態を分ける。新たなダウンロードボタンや全出力保存UIは追加しない。

### M6 リリース担当の確認体験

```text
公開候補/履歴/pack一覧 → 対象と公開操作の人間承認
  → 最小Node/browser・型・資産・公開前チェック
  → 0.1.0-rc.1 / next / GitHub Release
  → 公開済みRCを実terrariumで受入れ・必須NFR
  → stable候補差分検証・対象と公開操作の人間承認
  → 0.1.0 / latest / GitHub Release
```

これは既存コマンド/成果物での作業手順であり、新しい管理画面を作らない。未実施/失敗/coverage収集欠落が残るstable判定は停止し、模擬公開チェックと実公開証拠を混同しない。

## Story Coverage

| Story | 表現先 | 利用者が確認する結果 |
|---|---|---|
| US1.1 | M1 | Node consumerの導入/結果/欠落資産失敗 |
| US1.2 | M1/M2/M4 | browser入口・Worker資産・隔離条件 |
| US1.3 | M1/M6 | 型compileと資産/供給物一覧 |
| US2.1 | M1/M3/M5 | stdout/stderr/bytes/元の終了コード |
| US2.2 | M1/M4 | 不正入力と開始失敗の区別 |
| US2.3 | M1/M5 | timeout/中止/次実行と終了処理 |
| US3.1 | M3/M5 | 同一端末のファイル/mode/削除/reset |
| US3.2 | M4/M5 | 状態分離/path/network/daemon禁止 |
| US4.1 | M2/M3/M4/M5 | 既存リンク/要素/run()/入力/イベント |
| US4.2 | M2/M4 | iframe条件別実行・通知・origin制限 |
| US4.3 | M3/M4 | ref/guest/fixture/commit対応と未知拒否 |
| US5.1 | M6 | native回帰/上限/commands/results証拠 |
| US5.2 | M6 | 固定配布JS80%・欠落検出・CI停止 |
| US5.3 | M1/M6 | コア境界・guest差替え・waitAsync維持 |
| US6.1 | M6 | 公開対象の一覧と別承認 |
| US6.2 | M6 | 信頼した公開経路・必須チェック |
| US6.3 | M6 | RC公開前条件とnext供給物 |
| US6.4 | M6 | 公開済みRC受入れとstable条件 |

## Assumptions & Open Questions

ソース構造は観測済みだが、基準と変更後の表示・focus・イベント一致は未検証。WebKitは実機Safariの代替であることを記録する。新たなUI機能、WCAG全体認証、CORP別配信先の初回必須化は追加しない。API/FS/Worker/iframeの具体契約とM4の隔離不足通知経路はContract Designで固定し、全受入条件の実行は後続で確認する。
