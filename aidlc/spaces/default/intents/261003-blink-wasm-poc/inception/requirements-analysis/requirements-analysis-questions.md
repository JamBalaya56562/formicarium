# Requirements Analysis — 質問

依頼文と意図書（`ideation/intent-capture/intent-statement.md`）、背景資料（`knowledge/documents/research/cheerpx-oss.md`）から、合否が判定できる要件にするには足りない点を質問にしました。前の段階のレビューで出た指摘（成功指標と vivarium の関係、実行環境と計測項目の具体性）もここで扱います。

## Q1. probe の合格を確かめる実行環境はどれですか？

依頼文には「Node.js の Worker と COOP/COEP 付きブラウザページで動かす」とあります。合格条件として、どの環境とどのブラウザで通る必要があるかを決めます。

A. Node.js の Worker と、Chromium 系ブラウザ（Chrome / Edge）のページの両方
B. Node.js の Worker と、Chromium 系と Firefox のページ
C. Node.js の Worker と、主要ブラウザすべて（Chromium 系・Firefox・Safari）
D. Node.js の Worker のみ（ブラウザは動作確認だけで、合格条件にしない）
X. Other (please specify)

[Answer]: C. Node.js の Worker と、主要ブラウザすべて（Chromium 系・Firefox・Safari）（ユーザー発言：「Q1はSafari も含めたすべて」） **Mode:** chat

## Q2. aube の計測では何を測りますか？

JIT をいつ作るかを判断する材料です。背景資料には、CheerpX 上で aube の 4 つのコマンドを計測した値があります（`--version`、初回 `install`、frozen install、`list`）。

A. CheerpX と同じ 4 コマンドの実行時間（比較できるようにする）
B. A に加えて、エミュレータの起動時間とメモリ使用量
C. A に加えて、命令実行数あたりの時間などのエミュレータ内部の統計
D. frozen install の実行時間だけ
X. Other (please specify)

[Answer]: A. CheerpX と同じ 4 コマンドの実行時間（比較できるようにする）（ユーザー発言：「Q2は4コマンドでお願いします」） **Mode:** chat

## Q3. vivarium で使う形の「CLI バグ再現」を、この PoC で 1 件動かしますか？

最初の目的は vivarium の CLI バグ再現をブラウザで動かすことです。probe の合格だけではそこまで示せない、というレビュー指摘がありました。背景資料には、aube の #1645（frozen install と `aube list` が `0.0.0` を表示する）の再現例があります。

A. 動かす：aube #1645 の再現が、ブラウザ上で native と同じ出力になることを合格条件に加える
B. 動かす：ただし合格条件にはせず、結果を記録するだけ
C. 動かさない：この PoC の範囲外とし、後続のワークフローで扱う
D. Not yet defined
X. Other (please specify)

[Answer]: A. 動かす：aube #1645 の再現が、ブラウザ上で native と同じ出力になることを合格条件に加える（ユーザー発言：「2は合格条件」） **Mode:** chat

## Q4. probe が通らない部分が残ったとき、PoC をどう締めくくりますか？

eventfd2 などの不足が想定以上に大きいこともありえます。失敗や中止の扱いを先に決めます。

A. 期限を設ける（例：N 週間）。期限までに通らない部分は、原因と残作業を記録して PoC を終える
B. 期限は設けず、probe が全部通るまで続ける
C. 一時的な回避策（probe 側の調整や、特定機能の代替実装）で先へ進み、回避した項目を記録する
D. Not yet defined
X. Other (please specify)

[Answer]: X. Other — 失敗内容ごとに、ユーザーが個別にどうするかを判断する（ユーザー発言：「Q4はその失敗内容によります。それぞれの内容によってどうするかは判断します。」） **Mode:** chat

## Q5. blink に加える変更は、どの形で管理しますか？

この PoC では、upstream の jart/blink に eventfd2・FUTEX_WAIT_BITSET・edge-triggered epoll を足し、wasm 向けの修正を入れます。upstream への還元は前段の関係者の質問では選ばれていません（還元しないと決めたわけではありません）。いずれにしても、変更の置き場所は決めておく必要があります。

A. formicarium リポジトリ内にパッチ列として置き、ビルド時に upstream の特定コミットへ当てる
B. jart/blink を fork したリポジトリで管理し、formicarium から参照する
C. blink のソースを formicarium リポジトリに取り込み（vendoring）、直接変更する
D. Not yet defined
X. Other (please specify)

[Answer]: X. Other — blink は使わない（更新が止まっているため）。Rust で blink 相当のものを自分で再実装し、新しいリポジトリで実装する。blink と同等の既存 Rust 実装があればそれを使ってもよい（ユーザー発言：「blinkは更新がない状態だから、使いません。これも自分自身でrust言語で再実装しましょう。また、新しいレポジトリを作成して実装したいと思っています。既にrust言語で実装されたものがあるとかなら、それでもいいですが、このblinkと同等のものがいいです。」） **Mode:** chat

## Q6. 「新しいリポジトリ」は、formicarium とどういう関係にしますか？

Q5 で、Rust による再実装を新しいリポジトリで行うと決まりました。formicarium 自体も作ったばかりのリポジトリなので、置き場所を確認します。

A. エミュレータのコアを新しいリポジトリにし、formicarium はブラウザ側（Worker・ページ・ファイルシステム）とそれらの統合を担う
B. formicarium をそのまま新しいリポジトリとして使い、ここに Rust で実装する
C. formicarium とは別に新しいリポジトリを作り、formicarium は計画・記録だけに使う
D. Not yet defined
X. Other (please specify)

[Answer]: A. エミュレータのコアを新しいリポジトリにし、formicarium はブラウザ側（Worker・ページ・ファイルシステム）とそれらの統合を担う（ユーザー発言：「1はコアだけ別リポジトリ」。続く発言で、新しいリポジトリは blink の Rust 版の開発用と明確化された） **Mode:** chat

## Q7. Q5 の明確化：この PoC での blink の扱い

Q5 の後、ユーザーから「こちらは既存のblinkで進めて下さい。ただ、blinkのrust版作成も進めるということです。そして、それは別のレポジトリで進めていきます。」との明確化があった。この PoC は既存の blink を使い、Rust 版 blink の開発は別リポジトリの別の取り組みとして並行して進める、という理解でよいか確認する。

A. その理解で合っている。この PoC は既存の blink で進め、ワークフローは作り直さずにこのまま続ける
B. その理解で合っている。ただしワークフローは作り直す
C. 違う
D. Not yet defined
X. Other (please specify)

[Answer]: A. その理解で合っている。この PoC は既存の blink で進め、ワークフローは作り直さずにこのまま続ける（ユーザー回答：「合っていてこのまま続けていいですが、rust版blinkのレポジトリとか最初のAI-DLC導入とかは、このレポジトリと関係ないですが、お願い致します。また、将来的にrust版blinkに置き換える構想だということも分かるようにしておいて下さい。」） **Mode:** chat

## Q8. この PoC で blink に加える変更は、どの形で管理しますか？

（Q5 の元の質問。既存の blink を使うことになったため、改めて確認する。）

A. formicarium リポジトリ内にパッチ列として置き、ビルド時に upstream の特定コミットへ当てる
B. jart/blink を fork したリポジトリで管理し、formicarium から参照する
C. blink のソースを formicarium リポジトリに取り込み（vendoring）、直接変更する
D. Not yet defined
X. Other (please specify)

[Answer]: B. jart/blink を fork したリポジトリで管理し、formicarium から参照する（ユーザー回答：「fork」） **Mode:** chat

## Consolidated Summary Confirmation

- Q1：合格条件となる実行環境は、Node.js の Worker と主要ブラウザすべて（Chromium 系・Firefox・Safari）
- Q2：aube は CheerpX と同じ 4 コマンド（`--version`、初回 `install`、frozen install、`list`）の実行時間を計測する
- Q3：aube #1645 の再現（frozen install と `aube list` が native と同じく `0.0.0` を表示する）を、ブラウザ上で動かすことを合格条件に加える
- Q4：probe が通らない部分が残った場合は、失敗内容ごとにユーザーが個別に判断する
- Q5・Q7：この PoC は既存の jart/blink で進め、ワークフローは作り直さない。Rust 版 blink は別リポジトリで並行して開発し、将来は formicarium のコアを Rust 版 blink に置き換える構想である（この構想が文書から分かるようにする）
- Q6：エミュレータのコアは別リポジトリ（将来の Rust 版 blink）とし、formicarium はブラウザ側（Worker・ページ・ファイルシステム）と統合を担う
- Q8：この PoC で blink に加える変更は、jart/blink の fork リポジトリで管理し、formicarium から参照する

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
