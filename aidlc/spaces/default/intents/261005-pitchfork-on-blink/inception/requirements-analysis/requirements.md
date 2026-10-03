# 要件定義：pitchfork を formicarium で動かす PoC

## Sources

- [intent] `ideation/intent-capture/intent-statement.md`（intent-statement）。課題、成功指標、範囲
- [biz] `aidlc/spaces/default/codekb/formicarium/business-overview.md`（business-overview）。formicarium の目的と現在の機能
- [arch] `aidlc/spaces/default/codekb/formicarium/architecture.md`（architecture）。手順（session）の実行の流れ、`persist` による引き継ぎ、基準値の作り方
- [code] `aidlc/spaces/default/codekb/formicarium/code-structure.md`（code-structure）。ファイル構成と規約
- [cqa] `aidlc/spaces/default/codekb/formicarium/code-quality-assessment.md`。intent に関わる所見 Q1〜Q6 と守るべき制約
- [Qn] `inception/requirements-analysis/requirements-analysis-questions.md` の確認済みの回答（Q1〜Q7）
- [desc] 最初の依頼文（`project-description.json`）

## Intent Analysis

目的は 2 つあります。1 つは、terrarium のツールごとの wasm ビルドを formicarium に置き換えられるかを、実在の CLI である pitchfork で確かめることです。もう 1 つは、前の PoC で作った formicarium が、probe 以外の実際の Rust 製 CLI でも動くかを確かめることです。[intent]

今の formicarium は aube 1 つを前提に作られています。手順の解釈・ゲストの一覧・基準値の作成が aube に寄っているため、2 つ目のゲストを足せる形に直すことも、この作業に含まれます。[biz] [cqa]

合格基準は、意図の段階では「バイト単位で完全一致」でしたが、Q6 で置き換えました。aube と同じく、改行と行末の空白をそろえたうえで stdout と終了コードを比べます。意図ステートメントの成功指標は、この要件で更新されたものとして扱います。[intent] [Q3] [Q6]

## Functional Requirements

### FR1: pitchfork ゲストのビルド

- **FR1.1**: jdx/pitchfork v2.29.0 を、ソースを変えずに x86-64 static-musl でビルドし、`dist/guests/pitchfork` に置くこと。[desc]
  - 既存のゲストと同じ方式でビルドする。`scripts/build-guests.sh` に対象を足し、`rust:alpine` のコンテナで `--locked --target x86_64-unknown-linux-musl` を使う。[cqa]
  - ビルド後、出力が x86-64 の ELF であることを確かめる。[arch]
- **FR1.2**: 取得元として、公式リポジトリ（jdx/pitchfork）のタグ v2.29.0 とそのコミットを記録すること。[cqa]

### FR2: fixture の取り込み

- **FR2.1**: terrarium の `fixtures/sessions/pitchfork-basic.txt` と `fixtures/pitchfork-basic/` を、formicarium の `fixtures/` に写すこと（出どころは記録しない）。[Q7]
  - 受入条件：Given 写した fixture、When 内容を terrarium 側と比べる、Then 手順の 8 行と `app/pitchfork.toml`（api と worker の定義）が一致している。

### FR3: 手順の解釈の拡張

- **FR3.1**: 手順ファイルの `cat <相対パス>` を受け付け、`rm -rf` と同じく JS 側の手順として実行すること。blink は通さず、ファイルの中身を stdout に出し、終了コードは 0 とする。[Q1] [cqa]
  - 受入条件（正常）：Given `pitchfork.toml` がある、When `cat pitchfork.toml` を実行する、Then 中身がそのまま stdout に出て、終了コードは 0。
  - 受入条件（異常）：Given 存在しないパス、または `..` を含むパス、When `cat` を実行する、Then 実行を止めて理由を返す。存在しない場合の stdout と終了コードを native と比べることは、この PoC では求めない。
- **FR3.2**: 手順の引数を `sh -c` と同じ規則（引用符と `\` のエスケープ）で分けること。[Q2] [cqa]
  - 受入条件：Given `pitchfork daemons add db --run "postgres -D data"`、When 引数を分ける、Then argv は `pitchfork`、`daemons`、`add`、`db`、`--run`、`postgres -D data` の 6 つになる。これを単体テストで確かめる。
  - 受入条件（境界）：引用符の閉じ忘れは解釈の時点で失敗として報告し、黙って分割しない。
- **FR3.3**: 既存の `aube-1645` の手順が、拡張後も同じ steps に解釈されること。[Q5]

### FR4: ゲストと手順の一覧の一元化

- **FR4.1**: ゲスト・ゲストごとの環境変数・手順の一覧を 1 か所の表にまとめ、次の場所がそこを参照するようにすること。[Q5] [cqa]
  - Node.js 側の実行
  - ブラウザ側の `runtime/web/sessions.mjs`
  - `scripts/native-baseline.sh`
  - `scripts/build-guests.sh`
- **FR4.2**: 表に aube と pitchfork の両方が載り、ブラウザ側の許可リストによる入口の検証は今と同じ厳しさを保つこと。[Q5] [code]

### FR5: native の基準値の記録

- **FR5.1**: `pitchfork-basic` の手順を native で実行し、stdout の書き起こしと各コマンドの終了コードを `fixtures/baseline/pitchfork-basic.native.txt` に記録すること。[intent] [arch]
  - 既存の基準値と同じ方式を使う。busybox のコンテナで、ネットワークなし、`sh -c` で実行する。
  - 実行のたびに fixture を置き直し、前回の結果が混ざらないようにする。

### FR6: 実行と一致の判定

- **FR6.1**: `pitchfork-basic` の 8 コマンドを、手順の順番どおりに実行できること。実行環境は Node.js と、ブラウザ 3 種（Chromium・Firefox・WebKit）である。[desc] [intent]
- **FR6.2**: 各環境で、書き起こしと基準値を比べること。比べ方は aube と同じで、`normalizeTranscript` で改行と行末の空白をそろえてから、stdout と終了コードを比べる。[Q3] [Q6]
- **FR6.3**: 手順の間で状態が引き継がれること。[desc] [arch]
  - 受入条件：Given `daemons add db` と `daemons remove worker` を実行した後、When `cat pitchfork.toml` を実行する、Then api と db があり、worker はない。
  - 受入条件：Given `settings set general.interval 5s` を実行した後、When `settings get general.interval` を実行する、Then `5s` が返る。
  - どちらも、native の基準値と同じ結果になること。
- **FR6.4**: 4 環境のそれぞれで 8 コマンドすべてが一致したときだけ、合格とすること。[intent] [Q4]

### FR7: 不一致の扱い

- **FR7.1**: native と一致しないコマンドや環境があれば、blink の fork か formicarium 側を直して一致させること。pitchfork のソースは変えない。[Q4] [desc]
- **FR7.2**: 直せない場合は、1 件でも不一致があれば不合格とし、コマンド・環境・差分・原因を記録すること。[Q4]

### FR8: terrarium への組み込み方の調査メモ

- **FR8.1**: terrarium で formicarium を使う方法をまとめた調査メモを 1 本残すこと。組み込みそのものは行わない。[desc] [intent]

## Non-Functional Requirements

- **NFR1（回帰なし）**: 既存の aube のテストが引き続き合格すること（2026-10-05 の記録で Node.js 41 件、ブラウザ 33 件）。pitchfork の合格だけで代わりにしない。[Q5]
- **NFR2（品質の上限を緩めない）**: 次の上限を変えないこと。[cqa]
  - テストの時間の上限（probe 600 秒、ブラウザの aube 840 秒）
  - workers 1、再試行なし
  - wasm のメモリ上限 1 GB
  - pitchfork のテストに上限を新しく設ける場合は、実測にもとづいて決め、その根拠を記録する。
- **NFR3（安全）**: 次を守ること。[cqa] [arch]
  - ブラウザ版のゲストにネットワークを持たせない（`socket()` は `EAFNOSUPPORT`）
  - ブラウザの URL パラメータは許可リストで検証する
  - 手順のパスの `..` は拒否する
  - pitchfork は公式リポジトリのタグから取得する

## Constraints

- pitchfork のソースは変更しない。[desc]
- コアは jart/blink の fork を使う。Rust 版の blink（paludarium）は別リポジトリの構想で、この PoC では使わない。[biz]
- aube は再ビルドせず、既存の `dist/guests/aube` を使う。[cqa]
- ビルドと基準値の作成は、既存と同じくコンテナで行う。[arch]

## Assumptions

- [assumption] pitchfork が状態や設定を書く場所（`pitchfork.toml`、`settings set` の書き先）が、手順の間で引き継ぐ `persist` の範囲（ブラウザでは `[projectRoot, '/root']`）に入っている。外れていれば、FR6.3 を満たすために `persist` の範囲を広げる必要がある。根拠：[cqa] の所見 Q4（未検証）
- [assumption] スーパーバイザーがない状態で `pitchfork status api` を実行したときの stdout と終了コードは、native と formicarium で同じになる。違えば FR7 に従って直す。根拠：[cqa] の所見 Q5（未検証）

## Out of Scope

- デーモンの起動と監視、スーパーバイザー、IPC。[desc]
- terrarium での組み込みそのもの（FR8 の調査メモだけを残す）。[desc]
- stderr の比較。[Q3]
- 正規化なしのバイト単位での一致。[Q6]

## Open Questions

- 調査メモ（FR8）に最低限含める項目と、置き場所。後のステージで決める。[intent]
- pitchfork の状態の書き先と `persist` の範囲は、実機で確かめる必要がある（Assumptions の 1 つ目）。
