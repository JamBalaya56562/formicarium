# 要件書：blink を wasm 上で動かす PoC

上流の成果物：`aidlc/spaces/default/intents/261003-blink-wasm-poc/ideation/intent-capture/intent-statement.md`（以下、意図書）。根拠は `requirements-analysis-questions.md` の回答（Q1〜Q8）と、意図書の各節です。

## Intent Analysis

- 目的：未改変の x86-64 Linux バイナリを、ブラウザ上でカーネルを起動せずに動かせるかを確かめる。最初の受益者は aletheia-works（vivarium の CLI バグ再現）、その後に一般向けの OSS へ広げる（意図書「Target Customer」）。
- この PoC が出すもの：
  - 既存の jart/blink（インタプリタのみ）を wasm 上で動かした結果。合格条件は probe と aube #1645 の再現（Q1、Q3）。
  - JIT 開発を後回しにするかどうかを判断するための aube の計測値（意図書「Success Metrics」、Q2）。
- 将来構想：エミュレータのコアは、別リポジトリで並行開発する **Rust 版 blink** に置き換える。formicarium はブラウザ側（Worker・ページ・ファイルシステム）と統合を担う。この PoC で既存の blink を使うのは、その置き換えまでのつなぎであり、実現性を早く確かめるためである（Q5、Q6、Q7）。

## Functional Requirements

### FR1 blink の wasm ビルド

- **FR1.1** jart/blink を fork したリポジトリで、この PoC の変更を管理する。formicarium はその fork の特定コミットを参照する（Q8）。
  - 合否：formicarium から参照するコミットが一意に決まり、fork 上の upstream との差分を一覧できること。
- **FR1.2** fork した blink を Emscripten でビルドし、インタプリタのみ（JIT なし）の wasm を生成する（依頼文、意図書「Problem Statement」）。
  - 合否：文書化した 1 つのコマンドで、クリーンな状態から wasm 成果物を生成できること。

### FR2 実行環境

- **FR2.1** blink の wasm を Node.js の Worker で実行できる（Q1）。
- **FR2.2** blink の wasm を、COOP/COEP ヘッダー付きのブラウザページで実行できる。対象は Chromium 系（Chrome / Edge）、Firefox、Safari（Q1）。
  - 合否：各環境で `crossOriginIsolated` が真になり、ゲストの x86-64 バイナリが起動して終了コードを返すこと。

### FR3 blink に追加するシステムコール

- **FR3.1** `eventfd2` を実装する（依頼文）。
- **FR3.2** `futex` の `FUTEX_WAIT_BITSET` を実装する。現状は EINVAL を返す（依頼文、背景資料）。
- **FR3.3** edge-triggered の `epoll` を、ホストの epoll に頼らずに実装する（依頼文）。
  - 合否（FR3 全体）：FR5 の probe のうち、該当する項目が全環境で合格すること。

### FR4 ブラウザ側のファイルシステム

- **FR4.1** probe と aube が使うファイル操作をブラウザで提供する：作成、hard link、symlink、flock、rename、read_dir（依頼文、背景資料）。
- **FR4.2** `UnixStream::pair` が使う `socketpair` をブラウザで提供する（依頼文）。
  - 合否：FR5 のファイル操作とソケットの項目が、全環境で合格すること。

### FR5 合格判定用の probe

- **FR5.1** static-musl x86-64 の Rust probe を用意する。次の項目をそれぞれ個別に PASS/FAIL で出力する（依頼文）。
  - multi-thread tokio runtime のタイマー
  - `UnixStream::pair`
  - 4 並列の rayon `par_iter` と Mutex/Condvar
  - ファイルの作成、hard link、symlink、flock
- **FR5.2** probe が FR2 の全環境（Node.js の Worker、Chromium 系、Firefox、Safari）で全項目 PASS になる（Q1）。

### FR6 aube の計測

- **FR6.1** static-musl x86-64 の aube を blink の wasm 上で実行し、次の 4 コマンドの実行時間を計測する：`--version`、初回 `install`、frozen install、`list`（Q2）。
- **FR6.2** 計測結果を、背景資料にある CheerpX 1.3.9 上の値と並べて記録する（Q2、意図書「Success Metrics」）。
  - 合否：4 コマンドすべての計測値と計測環境が記録されていること。JIT を後回しにするかどうかの閾値は、計測後にユーザーが決める（意図書「Success Metrics」）。

### FR7 vivarium 用途の確認：aube #1645 の再現

- **FR7.1** aube #1645 の再現手順をブラウザ上で実行し、frozen install と `aube list` が native と同じく `0.0.0` を表示する（Q3）。
  - 合否：ブラウザでの出力が、native（x86-64 Linux）での出力と一致すること。

## Non-Functional Requirements

- **NFR1 判定の再現性**：probe の各項目と FR7 の判定は、同じ環境で繰り返し実行しても同じ結果になること（FR5、FR7 の合否を安定させるため）。[assumption] 回数は 3 回を提案する。ユーザーにはまだ確認していない。背景資料には、CheerpX で 1 回だけ起きて再現しなかった遅延の記録がある。
- **NFR2 失敗時の扱い**：通らない項目は、項目名・環境・症状・原因の見立てを記録し、ユーザーが個別に扱いを決める（Q4）。
- **NFR3 計測の記録性**：FR6 の各値には、ブラウザ名とバージョン、OS、ページが前面か背面か、試行回数を添える（背景資料の CheerpX 計測と比べられるようにするため。Q2）。

## Constraints

- エミュレータには、jart/blink の fork を使う。JIT は使わず、インタプリタのみとする（依頼文、Q7、Q8）。
- ゲストのバイナリは static-musl の x86-64 とする（依頼文）。
- 範囲は `poc`（実現性の検証）とする。JIT 開発は後続の別ワークフローで行う（意図書「Initial Scope Signal」）。
- エミュレータのコアは別リポジトリが担い、formicarium はブラウザ側と統合を担う（Q6）。

## Assumptions

- [assumption] jart/blink の ISC ライセンスは、formicarium の Apache-2.0 と両立する。根拠：ISC は寛容なライセンスである。fork と配布の前に確認する。
- [assumption] aube は static-musl x86-64 向けにビルドできる。根拠：背景資料で確認済みなのは i586 glibc のビルドのみで、musl はまだ試していない。

## Out of Scope

- JIT の開発（後続の別ワークフロー。意図書「Initial Scope Signal」）
- Rust 版 blink の実装（別リポジトリでの別の取り組み。Q5、Q7）

## Open Questions

- blink への変更を upstream の jart/blink に還元するかどうか（意図書の関係者の質問では選ばれていないが、しないと決めたわけでもない）
- Safari で、Worker とスレッドに必要な SharedArrayBuffer がどこまで使えるか（FR2.2 の実現性に関わる）
- JIT を後回しにするかどうかの閾値（FR6 の計測後にユーザーが決める）
