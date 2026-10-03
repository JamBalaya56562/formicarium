# Requirements Analysis — 質問

前提：意図ステートメント（`ideation/intent-capture/intent-statement.md`）とコード知識ベース（`aidlc/spaces/default/codekb/formicarium/`）。下の質問は、そこで見つかった食い違いと障害に絞っています。

## Q1. 手順にある `cat pitchfork.toml` を、formicarium でどう実行しますか？

今の手順の解釈（`runtime/session.mjs` の `parseSessionScript`）は、対象のツールと `rm -rf` しか受け付けないので、`cat` の行は拒否されます（コード知識ベースの所見 Q1）。

A. JS 側に `cat` 相当の手順を足す（`rm -rf` と同じく、blink を通さずにファイルの中身を出力する）
B. busybox などの static-musl のゲストを追加し、`cat` も blink の上で実行する
C. `cat` の行は書き起こしに残すが、実行と比較の対象から外す
D. Not yet defined
X. Other (please specify)

[Answer]: A. JS 側に `cat` 相当の手順を足す（`rm -rf` と同じく、blink を通さずにファイルの中身を出力する） **Mode:** guided

## Q2. 引数の分け方を、native 側とどうそろえますか？

今の手順の解釈は空白で分けるだけで引用符を解かないため、`pitchfork daemons add db --run "postgres -D data"` の `--run` の値が 3 つに割れます。native の基準値は `sh -c` で実行するので引用符が解かれ、両者の引数が食い違います（所見 Q2）。

A. JS 側の分割を `sh -c` と同じ規則（引用符と `\` のエスケープ）にし、native 側と同じ argv になることをテストで確かめる
B. 手順全体を busybox の `sh` ゲストで実行し、分割を native と同じ sh に任せる
C. 手順ファイルの書き方を変え、引用符を使わずに済む形にする（terrarium の fixture とは別物になる）
D. Not yet defined
X. Other (please specify)

[Answer]: A. JS 側の分割を `sh -c` と同じ規則（引用符と `\` のエスケープ）にし、native 側と同じ argv になることをテストで確かめる **Mode:** guided

## Q3. 何をどう比べて「一致」とみなしますか？

意図の段階では「native で記録した出力と終了コードに、バイト単位で完全一致」と決めました（intent-capture Q5）。一方、今の比較（`normalizeTranscript`）は改行と行末の空白をそろえてから比べており、書き起こしに stderr は含まれません。

A. stdout と終了コードを、正規化なしでバイト単位で比べる（pitchfork 用の比較では `normalizeTranscript` を使わない）
B. stdout・stderr・終了コードのすべてを、正規化なしでバイト単位で比べる
C. 今の aube と同じく、改行と行末の空白だけそろえて stdout と終了コードを比べる（intent-capture Q5 の決定を緩める）
D. Not yet defined
X. Other (please specify)

[Answer]: C. 今の aube と同じく、改行と行末の空白だけそろえて stdout と終了コードを比べる（intent-capture Q5 の決定を緩める） **Mode:** guided（Q6 で確認）

## Q4. 一部のコマンドや環境で native と一致しなかった場合、どう扱いますか？

たとえば `pitchfork status api` がスーパーバイザーのない状態でソケットに触り、そこでの失敗のしかたが native と違う可能性があります（所見 Q5、未確認）。pitchfork のソースは変えない前提です。

A. blink の fork や formicarium 側を直して一致させる。直せない場合は、1 件でも不一致があれば不合格とし、原因を記録する
B. 1 件でも不一致があれば不合格とするが、直さずに原因を記録して PoC を終える
C. 不一致は結果として記録し、部分的な成功として扱う
D. Not yet defined
X. Other (please specify)

[Answer]: A. blink の fork や formicarium 側を直して一致させる。直せない場合は、1 件でも不一致があれば不合格とし、原因を記録する **Mode:** guided

## Q5. aube 向けに直書きされている部分と、fixture の取り込みをどう扱いますか？（select all that apply）

ゲスト・環境変数・手順の一覧が aube 向けに直書きされています（`runtime/web/sessions.mjs`、`scripts/native-baseline.sh`、`scripts/build-guests.sh`。所見 Q3）。初期の `pitchfork.toml`（api と worker の定義）は terrarium の `fixtures/pitchfork-basic/app/` にあります。

A. 直書きを 1 か所の表にまとめ、aube と pitchfork の両方をそこから引く形に直す
B. 今の作りのまま、各所に pitchfork を書き足すだけにする
C. terrarium の `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` を formicarium の `fixtures/` に写し、出どころ（terrarium のコミット）を記録する
D. 既存の aube のテスト（Node.js 41 件、ブラウザ 33 件）が引き続き合格することを、合格条件に含める
X. Other (please specify)

[Answer]: A, D（A. 直書きを 1 か所の表にまとめ、aube と pitchfork の両方をそこから引く形に直す／D. 既存の aube のテスト（Node.js 41 件、ブラウザ 33 件）が引き続き合格することを、合格条件に含める） **Mode:** guided

## Q6. （Q3 の追加質問）意図の段階で決めた合格基準を、Q3 の内容に置き換えてよいですか？

意図の段階（intent-capture Q5、承認済みの意図ステートメント）では「native で記録した出力と終了コードに、バイト単位で完全一致」を合格基準にしました。Q3 では「改行と行末の空白をそろえ、stdout と終了コードを比べる」（aube と同じ）を選んでいただいたので、基準が緩くなります。どちらを要件にするか確認させてください。

A. 置き換える：pitchfork も aube と同じ正規化（改行と行末の空白）で stdout と終了コードを比べる。意図ステートメントの基準はこの要件で更新されたものとして扱う
B. 置き換えない：意図の段階の決定どおり、stdout と終了コードを正規化なしでバイト単位で比べる
C. 両方を記録する：合格基準は正規化した比較とし、正規化なしのバイト一致かどうかも参考として記録する
D. Not yet defined
X. Other (please specify)

[Answer]: A. 置き換える：pitchfork も aube と同じ正規化（改行と行末の空白）で stdout と終了コードを比べる。意図ステートメントの基準はこの要件で更新されたものとして扱う **Mode:** guided

## Q7. （Q5 の追加質問）pitchfork の手順ファイルと初期の `pitchfork.toml` は、どこから用意しますか？

Q5 では「fixture を写して出どころを記録する」（C）は選ばれませんでした。ただ、手順（8 コマンド）と、初期の `pitchfork.toml`（api と worker の定義）がないと実行できません。

A. terrarium の `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` を formicarium の `fixtures/` に写す（出どころは記録しない）
B. A と同じく写し、出どころ（terrarium のコミット）も記録する
C. 写さずに、実行時に `../terrarium` のファイルを直接読む
D. formicarium 側で、同じ内容の手順と `pitchfork.toml` を新しく書く
X. Other (please specify)

[Answer]: A. terrarium の `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` を formicarium の `fixtures/` に写す（出どころは記録しない） **Mode:** guided

## Consolidated Summary Confirmation

- Q1：`cat pitchfork.toml` は、`rm -rf` と同じく JS 側の手順として実装し、blink を通さずにファイルの中身を出力する
- Q2：手順の引数は `sh -c` と同じ規則（引用符と `\` のエスケープ）で分け、native 側と同じ argv になることをテストで確かめる
- Q3・Q6：一致の判定は aube と同じく、改行と行末の空白をそろえて stdout と終了コードを比べる。意図の段階の「バイト単位で完全一致」はこの要件で置き換える
- Q4：native と一致しない場合は、blink の fork や formicarium 側を直して一致させる（pitchfork のソースは変えない）。直せない場合は 1 件でも不一致があれば不合格とし、原因を記録する
- Q5：ゲスト・環境変数・手順の直書きを 1 か所の表にまとめ、aube と pitchfork の両方をそこから引く。既存の aube のテスト（Node.js 41 件、ブラウザ 33 件）が引き続き合格することも合格条件に含める
- Q7：terrarium の `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` を formicarium の `fixtures/` に写す（出どころは記録しない）

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
