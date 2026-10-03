# Interaction Specification

## Sources

- [memory:M1] stories.mdの全AC、requirements.mdのFR1–FR10/NFR1–NFR7。
- [memory:M2] terrarium/web/index.html、web/terminal.mjs、packages/terrarium/src/terminal.tsのソース読取りexit0。
- [memory:M3] 本工程mockups.mdのM1–M6とteam-practices.md。

## Components

### API Consumer

| Field | Value |
|---|---|
| Component | formicarium public consumer |
| Description | コア再ビルドなしで対象guestを実行する |
| Category | input / display（プログラムからの呼出し） |

入力はguest、args、env、cwd、files、assetURL、timeout/cancel。型・required/default・公開名はContract Designで固定する。Node/browserの結果契約を対応させ、非0guest終了とhost初期化失敗を区別する。bytesの原データを保持し、機密envをログへ露出しない。UI用ARIA/hover/viewportはN/A。

### Existing Page Header

| Field | Value |
|---|---|
| Component | 既存header |
| Description | tool/build/source/statusの選択・表示 |
| Category | navigation / input / feedback |

| State | Trigger | Response |
|---|---|---|
| default/loading | ページ開始 | 既存hidden条件と状態テキスト |
| ready | build解決・要素ready | title/tool/ref/source、ready時間とfocusを基準どおり更新 |
| error | 要素error/対応条件不足 | 原因テキスト、成功を通知しない |
| embed | embed query | headerを非表示 |
| hover/focus | pointer/Tab | 既存select/linkの振舞いを保持 |

Tool選択はref/fixture/cwd/runを除去、Build選択はrefを更新する。tool/ref/fixture/cwd/baseは既存URL/属性契約を保持する。responsiveは既存flex-wrap。Tool/Buildのaria-labelとnative select/linkを保持し、追加modalを作らない。

### Terrarium Terminal

| Field | Value |
|---|---|
| Component | terrarium-terminal（既存） |
| Description | CLI操作と出力/結果・失敗を伝える |
| Category | input / display / feedback |

| State | Trigger | Response |
|---|---|---|
| empty | fixtureなし | 有効な初期状態。未知fixture失敗と区別 |
| loading | asset/guest/fixture準備 | 基準の表示と入力受付を維持 |
| ready | 初期化成功 | ready fieldsと基準focus/queued run |
| running | 端末入力/run()/許可親メッセージ | 対象guestの結果を待つ |
| exit | guest終了（0または非0） | 元のcode/output、基準transcript/events |
| error | 不正入力/host初期化失敗 | 原因＋修正する入力。正常な非0終了と分ける |
| timeout/cancel | 指定期限/中止 | 1回の終了結果・Worker終了・次実行可能 |
| partial | 長出力/遅延通知 | 既存scroll/fit。古い結果を次実行へ混ぜない |
| disposed/reset | 終了/reset | 状態の初期化規則を契約に従い適用 |

run()の既存code/outputとtranscript形式は変えず、低層stdout/stderr/codeの受入れ記録を別に持つ。成功・非0終了・開始失敗でイベントの順序/回数/fieldsをそれぞれ比較する。同時呼出し/終了後呼出しはContract Designで一つの規則へ固定する。hover/disabled/error/ARIAの既存実装は確認対象であり、未観測の制御を存在すると仮定しない。

### Iframe Bridge

| Field | Value |
|---|---|
| Component | 既存postMessage橋渡し |
| Description | 承認済み親からのrunと結果通知 |
| Category | input / feedback |

message sourceがwindow.parent、originが既存targetOrigin、typeがterrarium:run、commandがstringという基準検証を保持する。通知もtargetOriginに限定し、ワイルドカードを使わない。ready/run/exit/errorのpayloadはContract Designで基準を採取し固定する。

| 条件 | Chromium | Firefox | WebKit |
|---|---|---|---|
| 同一origin＋必要な隔離 | 成功 | 成功 | 成功 |
| 外部GitHub Pages＋credentialless/allowと必要条件 | 成功 | 未対応通知・未実行 | 未対応通知・未実行 |
| 必要な隔離不足 | 原因通知・未実行 | 原因通知・未実行 | 原因通知・未実行 |

9セルに未承認origin拒否を直交して検証する。未承認親への通知を回避し、正当な利用者へ原因を表示する。非実行はmarker/spy等の方式を品質設計で固定して観測する。iframe自体のtitleはconsumer向け記載、別配信先・実機Safari対応は初回必須に増やさない。

## Flows and Recovery

1. 導入：空consumer→tarball→import→入力→開始→結果/失敗。欠落資産は原因と設定対象を返し、再ビルドをconsumerへ要求しない。
2. 端末：リンク/属性→guest/ref/fixture解決→ready→コマンド→結果→同一端末の次操作。Tool切替は基準reset。欠落refは他版へfallbackしない。
3. 中止：running→timeout/cancel→終了通知1回→Worker終了→新実行。後着通知を捨てる具体識別方式は設計で決める。
4. 状態：固定fixture→作成/変更/mode→次操作→JS読取/削除→次回不在。2端末を交互実行して分離を確認する。mtime/hard-link/再読込み永続化は基準契約調査で扱う。
5. 配布判断：M6どおりRCとstableを区別し、必須失敗/未検証時は追加公開を止める。新しい公開管理画面は作らない。

## Responsive Behaviour

既存height/flex/min-width/fit/scrollを維持し、320/768/1024 CSS pxの比較点と200% zoomでheaderの折返し、端末のfit、入力/focus、長い出力の読取りを確認する。これはテスト比較点であり新しいCSS breakpointではない。embedは親が与える領域にfitする。実測・操作は未検証。

## Accessibility

既存native select/link、Tool/Build名、端末focusを基準比較する。失敗を色だけで表さずテキストにし、長いログを逐次すべて読み上げる新機能は追加しない。変更する通知面についてアクセシビリティ確認を行い、全UI認証を本件の成功条件へ追加しない。具体チェックはaccessibility-checklist.md。

## Assumptions & Open Questions

全フローの動作は未検証。public型、snapshot、並行/終了規則、通知文言、iframe不足時の表示経路、テストoracleを後続設計で固定する。基準のruntime種類が変わっても既存入口と表示の互換性を必須とする。
