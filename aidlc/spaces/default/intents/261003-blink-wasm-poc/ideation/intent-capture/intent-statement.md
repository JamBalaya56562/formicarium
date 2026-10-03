# 意図書：blink を wasm 上で動かす PoC

## Problem Statement

- aletheia-works の vivarium で、CLI のバグ再現を、ツールごとの wasm ビルドなしにブラウザ上で動かしたい。これを満たした後、一般向けの OSS へ広げる。[Q1]
- 今のやり方には 2 つの問題がある。terrarium のようにツールごとに wasm ビルドする方式は負担が大きく、CheerpX には制約がある。[Q3]
- この PoC で確かめたいこと：upstream の jart/blink を Emscripten でビルドし（インタプリタのみ）、Node.js の Worker と COOP/COEP 付きのブラウザページで、未改変の static-musl x86-64 バイナリが動くかどうか。[desc]

## Target Customer

- 最初の受益者は aletheia-works 自身である。vivarium の CLI バグ再現を、ブラウザだけで確認できるようにする。[Q1]
- その後、一般の利用者にユーザーモード x86 Linux エミュレータの OSS として届ける。[Q1]

## Success Metrics

- 必須条件：static-musl x86-64 の Rust probe がブラウザと Node.js の両方で合格すること。probe の内容は、multi-thread tokio runtime のタイマーと `UnixStream::pair`、4 並列の rayon `par_iter` と Mutex/Condvar、ファイルの作成・hard link・symlink・flock。[desc] [Q2]
- 計測：static-musl の aube を動かし、実行時間を記録する。JIT の要否を判断する閾値は、計測結果を見てから決める。[desc] [Q2]
- 計測結果で決まるのは「JIT 開発を後回しにするかどうか」であり、JIT 開発自体は行う。[Q2]

## Initiative Trigger

- terrarium のようにツールごとに wasm ビルドする方式は、ツールが増えるたびにビルドとパッチが要り、負担が大きい。[Q3]
- CheerpX には制約がある（自前ホストも再配布もできない、32-bit のみ、NULL パスの stat で VM が止まる）。[Q3]

## Initial Scope Signal

- このワークフローで選ばれたスコープ（workflow-selected）は `poc`。[scope]
- ユーザーが確認した範囲：実現性の検証（ビルド、probe、計測、JIT 要否の判断材料）まで。JIT 開発は後続の別ワークフローで行う。[Q5] [Q2]
- 範囲に含む作業：blink への eventfd2・FUTEX_WAIT_BITSET・edge-triggered epoll の実装と、ブラウザ側のファイルシステムの不足を埋めること。[desc]

## Assumptions & Open Questions

None.
