# Intent Capture & Framing — 質問

## Sources

- [desc] Initial description: "jdx/pitchfork v2.29.0 を x86-64 static-musl でビルドし（ソースは変更しない）、formicarium の blink wasm で Node.js とブラウザ（Chromium・Firefox・WebKit）上で動かす。範囲は terrarium の fixtures/sessions/pitchfork-basic.txt と同じ、スーパーバイザーを要しない 8 コマンド（--version、daemons、daemons add、daemons remove、cat pitchfork.toml、status、settings set、settings get）で、出力は native と一致させる。デーモンの起動・監視とスーパーバイザー／IPC は対象外。terrarium で formicarium を使う組み込みは別作業とし、今回は組み込み方の調査メモだけ残す。"
- [scope] Workflow-selected scope: `poc`.

## Q1. この取り組みで解決したい課題と、今やる理由は何ですか？

依頼文では、terrarium の pitchfork セッションと同じ 8 コマンドを formicarium で動かし、terrarium への組み込み方の調査メモを残すとあります。何を確かめるための一歩かで、成功の測り方が変わります。

A. terrarium のツールごとの wasm ビルドを、formicarium（未改変の Linux バイナリをそのまま動かす方式）に置き換えられるかを、実在の CLI で確かめる
B. 前の PoC で作った formicarium が、テスト用 probe 以外の実際の Rust 製 CLI でも動くかを確かめる
C. A と B の両方
D. Not yet defined
X. Other (please specify)

[Answer]: C. A と B の両方 **Mode:** guided

## Q2. 「出力は native と一致させる」は、どの程度の一致を合格としますか？

8 コマンドの出力には、パスやバージョン文字列など、環境によって変わりうる部分が含まれる可能性があります。合格の線引きを先に決めておきます。

A. terrarium の pitchfork-basic.txt に記録された期待出力と、バイト単位で完全一致
B. 同じ入力で native 実行した出力と、バイト単位で完全一致
C. 環境依存の部分（パス・時刻など）だけ正規化したうえで一致
D. Not yet defined
X. Other (please specify)

[Answer]: A. terrarium の pitchfork-basic.txt に記録された期待出力と、バイト単位で完全一致 **Mode:** guided（注：確認したところ pitchfork-basic.txt にはコマンドだけが書かれ、期待出力は記録されていない。Q5 で再確認する）

## Q3. 関係者と、結果の共有先を教えてください（select all that apply）

前の PoC（blink を wasm で動かす PoC）では「決定者は本人のみ、定期報告は不要」でした。今回も同じかを確認します。

A. 決定者は自分ひとりで、定期的な報告は不要
B. terrarium 側（組み込み作業の担当）にも調査メモを共有する
C. pitchfork の作者（jdx）など外部へ結果を共有する
D. None
X. Other (please specify)

[Answer]: A. 決定者は自分ひとりで、定期的な報告は不要 **Mode:** guided

## Q4. このワークフローは `poc`（実現性の検証）として始めました。この範囲で合っていますか？

A. 合っている：8 コマンドを Node.js と 3 ブラウザで動かし、native と一致することの確認と、組み込み方の調査メモまでを範囲にする
B. 違う：terrarium への組み込みまで含めたい
C. 違う：実装はせず、調査と設計だけにしたい
D. Not yet defined
X. Other (please specify)

[Answer]: A. 合っている：8 コマンドを Node.js と 3 ブラウザで動かし、native と一致することの確認と、組み込み方の調査メモまでを範囲にする **Mode:** guided

## Q5. （Q2 の追加質問）出力一致の「正解」をどこから取りますか？

Q2 では「pitchfork-basic.txt に記録された期待出力とバイト単位で完全一致」を選んでいただきましたが、terrarium の `fixtures/sessions/pitchfork-basic.txt` にはコマンドだけが書かれていて、期待出力は記録されていません。terrarium 側の要件（261004-pitchfork-continuation の FR2）も「バージョン 2.29.0 を表示する」「api と worker を表示する」のような意味での期待結果表です。そのため、正解の取り方を決め直します。

A. 同じ fixture（`fixtures/pitchfork-basic/`）と同じ手順を native の Linux x86-64 で実行して出力と終了コードを記録し、それを正解としてバイト単位で完全一致を求める
B. A と同じく native で正解を記録するが、パスや時刻など環境依存の部分だけ正規化して一致を求める
C. terrarium の FR2 の期待結果表の意味で一致すれば合格（バイト一致は求めない）
D. Not yet defined
X. Other (please specify)

[Answer]: A. 同じ fixture（`fixtures/pitchfork-basic/`）と同じ手順を native の Linux x86-64 で実行して出力と終了コードを記録し、それを正解としてバイト単位で完全一致を求める **Mode:** guided

## Consolidated Summary Confirmation

- Q1：課題は 2 つ。terrarium のツールごとの wasm ビルドを formicarium（未改変の Linux バイナリをそのまま動かす方式）に置き換えられるかを実在の CLI で確かめることと、前の PoC の formicarium が probe 以外の実際の Rust 製 CLI でも動くかを確かめること
- Q2・Q5：合格基準は、同じ fixture（`fixtures/pitchfork-basic/`）と同じ手順を native の Linux x86-64 で実行して記録した出力と終了コードに、バイト単位で完全一致すること（pitchfork-basic.txt には期待出力が記録されていないため、Q5 で正解の取り方を確定）
- Q3：決定者はユーザー本人のみで、定期報告は不要
- Q4：範囲は `poc` のとおり。8 コマンドを Node.js と 3 ブラウザ（Chromium・Firefox・WebKit）で動かして native との一致を確認し、terrarium への組み込み方の調査メモを残すところまで

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
