# Intent Capture & Framing — 質問

## Sources

- [desc] Initial description: "upstream の jart/blink を Emscripten でビルドし（インタプリタのみ）、Node.js の Worker と COOP/COEP 付きブラウザページで動かす。合格条件は static-musl x86-64 の Rust probe（multi-thread tokio runtime のタイマーと UnixStream::pair、4 並列 rayon par_iter と Mutex/Condvar、ファイルの作成・hard link・symlink・flock）が通ること。そのために blink に eventfd2、FUTEX_WAIT_BITSET、edge-triggered epoll を実装し、ブラウザ側のファイルシステムの不足を埋める。最後に static-musl の aube を動かして計測し、JIT が必要かを判断する。背景資料は knowledge の documents/research/cheerpx-oss.md。"
- [scope] Workflow-selected scope: `poc`.

## Q1. この取り組みは誰のどんな課題を解決するものですか？

背景資料では、terrarium はツールごとに wasm へビルドする路線をとっており、formicarium は「未改変の Linux バイナリを 1 つのエンジンで動かす」路線です。誰の課題として捉えるかで、成功の測り方が変わります。

A. aletheia-works 自身の課題：vivarium の CLI バグ再現を、ツールごとのビルドなしでブラウザ上で動かしたい
B. 一般の利用者の課題：OSS のユーザーモード x86 Linux エミュレータとして広く使ってもらいたい
C. A を先に満たし、あとで B に広げる
D. Not yet defined
X. Other (please specify)

[Answer]: C. A を先に満たし、あとで B に広げる（ユーザー発言：「1は両方です。先にaletheia-worksです。」） **Mode:** chat

## Q2. この PoC の成功（JIT が必要かどうかの判断）は、どう判定しますか？

依頼文では、最後に static-musl の aube を計測して JIT の要否を判断するとあります。判断の基準を先に決めるか、計測後に決めるかを確認します。

A. probe の合格を必須とし、aube の計測値を記録する。JIT 要否の閾値は計測を見てから決める
B. probe の合格に加えて、事前に閾値を決める（例：aube の frozen install が CheerpX 上の実測値の N 倍以内なら JIT 不要）
C. probe の合格だけを成功とし、aube の計測は参考値にとどめる
D. Not yet defined
X. Other (please specify)

[Answer]: X. Other — probe の合格を必須とし、aube の計測値を記録する。閾値は計測を見てから決める。ただし計測が決めるのは JIT 開発を後回しにするかどうかであり、JIT 開発自体は行う（ユーザー発言：「計測を見てから決めます ただ、それはJIT開発を後回しにするかどうかの話で、JIT開発自体は行います。」） **Mode:** chat

## Q3. なぜ今この取り組みを始めるのですか？

A. ツールごとに wasm ビルドする terrarium 路線の負担（ツールが増えるたびにビルドとパッチが要る）
B. CheerpX の制約（自前ホスト・再配布ができない、32-bit のみ、NULL パスの stat で VM が止まる）
C. A と B の両方
D. Not identified
X. Other (please specify)

[Answer]: C. A と B の両方（ユーザー発言：「3は両方」） **Mode:** chat

## Q4. 関係者と、結果の共有先を教えてください（select all that apply）

A. 決定者は自分ひとりで、定期的な報告は不要
B. aletheia-works の他プロジェクト（vivarium・terrarium）にも結果を共有する
C. blink に加えた変更（eventfd2・FUTEX_WAIT_BITSET など）を upstream の jart/blink へ還元する
D. None
X. Other (please specify)

[Answer]: A. 決定者は自分ひとりで、定期的な報告は不要（ユーザー発言：「4は自身だけで報告不要」） **Mode:** chat

## Q5. このワークフローは `poc`（実現性の検証）として始めました。この範囲で合っていますか？

A. 合っている：実現性の検証（ビルド・probe・計測・JIT 要否の判断）までを範囲にする
B. 違う：利用できるエミュレータの MVP まで作りたい
C. 違う：実装はせず、調査と設計だけにしたい
D. Not yet defined
X. Other (please specify)

[Answer]: A. 合っている：実現性の検証（ビルド・probe・計測・JIT 要否の判断）までを範囲にする（ユーザー発言：「OK」。JIT 開発そのものは後続の別ワークフローで行う） **Mode:** chat

## Consolidated Summary Confirmation

- Q1：まず aletheia-works 自身の課題（vivarium の CLI バグ再現を、ツールごとのビルドなしにブラウザで動かす）を満たし、のちに一般向け OSS へ広げる
- Q2：probe の合格は必須。aube の計測値を記録し、閾値は計測を見てから決める。計測で決まるのは JIT 開発を後回しにするかどうかで、JIT 開発自体は行う
- Q3：きっかけは、terrarium のツールごとの wasm ビルドの負担と、CheerpX の制約の両方
- Q4：決定者はユーザー本人のみで、定期報告は不要
- Q5：範囲は `poc`（ビルド・probe・計測・JIT 時期の判断材料まで）。JIT 開発は後続の別ワークフロー

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
