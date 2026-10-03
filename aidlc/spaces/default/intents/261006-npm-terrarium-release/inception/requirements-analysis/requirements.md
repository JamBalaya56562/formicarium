# Requirements

## Sources

- [desc] Initial description: formicariumを@aletheia-works/formicariumとしてJS API・Worker・ビルド済みblink wasm・型定義・ライセンス・ビルド情報を含むnpmパッケージに整備する。aube・pitchforkのstatic-muslゲストとfixtureはterrarium側でref別に配布し、既存の要素・run()・iframe APIを維持して実行部を置き換える。公開対象の確認後にformicariumのpublicリポジトリを作成し、GitHub Releaseとnpmで0.1.0-rc.1を公開、terrariumで受け入れ検証後に0.1.0を公開する。GitHub ActionsのTrusted Publishingを整備する。Rust crateとJSR配布は初回の対象外。ネットワーク・デーモン・汎用対話CLI・C forkのJITは対象外。
- [scope] Workflow-selected scope: classic / Standard depth / Standard test strategy。engine workspace project-description が source=project-description.json として返した本文を上に保持した。
- [memory:M1] 承認済み inception/practices-discovery/team-practices.md：最小tarball先行、test-after、統合前CI・配布JS80%、ユーザーの対象版承認後に版タグで公開、RC next/stable latest。
- [memory:M2] AGENTS.md と承認済み discovered-rules.md：jj、mise実体、mainによる逐次検証、品質上限、コア境界、変更範囲、外部公開の承認。
- [Q1] requirements-analysis-questions.md Q1：ユーザーが推奨選定を委任。Codex がローカル terrarium の main commit 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d を選定した。
- [Q2] 同Q2：委任により aube・pitchfork を初回対象とし、それ以外のツールは維持する案を選定。
- [Q3] 同Q3：委任により Chromium・Firefox・WebKit を必須とし、実機Safari未検証は明記して後続へ残す案を選定。
- [memory:M3] CodeKB business-overview.md / architecture.md / code-structure.md：現行PoCの構成とnpm配布・公開Worker契約の不足。ソース観測と推測を区別する。
- [memory:M4] C:/Users/Jam/Documents/aletheia-works/terrarium/README.md と web/terminal.mjs：リンク・要素・iframeの入口、ref/fixture/tool、ready/run/transcript/events、iframe親origin検証。READMEはドキュメント根拠、rgの該当行は検証済みのソース観測。実行互換性は未検証。

## Intent Analysis

目的は、ツールごとのwasm移植に依存しているterrariumの実行部を、static-muslゲストを動かす共通ランタイムへ置き換えること。formicariumは再利用可能なnpmパッケージを提供し、terrariumはツール・ref・fixtureの配布と既存端末UIを所有する。利用者は既存のリンク、要素、run()、iframeから同じ手順を実行できる。[desc][memory:M3][memory:M4]

対象利用者はJS利用者、terrariumの利用者・保守者、リリース担当。成功は「空のconsumerへ導入したtarballがNodeとbrowser Workerで動く」「terrariumの既存入口からaube/pitchforkの受入れが通る」「承認済みRCの受入れ証拠を満たしてstableを公開できる」で判断する。利用者数・売上・常時稼働サービスの指標は本件の対象ではない。

## Functional Requirements

すべて初回の Must。契約の識別子やファイル配置は後続設計で定めるが、以下の観測可能な結果は維持する。

### FR1 npm パッケージ

`@aletheia-works/formicarium` にJS API、Node/browser Workerの実行に必要な第一者JS、ビルド済みblink loader/wasm、型定義、LICENSE/第三者表示、build-infoを同梱する。consumerはコアを再ビルドせず利用できる。[desc]

- FR1.1 `npm pack` のtarballを空のconsumerへ導入し、公開entry pointからimportできる。リポジトリやdistへの外部相対参照が残らない。
- FR1.2 同梱資産の一覧とpublic exportsを明示し、型のconsumer compileとLICENSE/notices/build-infoの存在・整合を確認できる。
- FR1.3 aube/pitchforkゲストとfixtureを製品パッケージへ同梱しない。開発用probe/テストデータをどう保持するかは設計で分離する。[desc][Q2]
- 合否：pack内容一覧、Node import、browser資産読み込み、型コンパイルが成功する。資産を欠落させたconsumerは原因を識別できる失敗になり、成功扱いしない。

### FR2 ゲストに依存しない実行API

利用者が指定したstatic-musl x86-64ゲスト、引数、環境、cwd、入力ファイルから実行でき、固定のaube/pitchfork登録表への追加なしで利用できる。[desc][memory:M3]

- FR2.1 NodeとブラウザWorkerで終了コードとstdout/stderrを取得できる。テキストとバイナリ出力の表現は契約設計で定め、バイトを欠落・混同させない。
- FR2.2 不正入力、資産取得/初期化失敗、実行失敗を正常なguest終了と区別できる。guestの非0終了は終了コードを保持する。
- 合否：同一の入力を両環境で実行し、終了コードと出力が基準に一致する。不正入力と初期化失敗が識別できる。Nodeのbuiltinをbrowser公開入口へ要求しない。

### FR3 連続コマンドとファイル状態

同じterrarium端末で実行したコマンドが、対象の作業領域・HOMEに作成/変更/削除したファイルを次のコマンドから参照できる。別の端末へ状態を漏らさない。[desc][memory:M3][memory:M4]

- FR3.1 引き継ぐファイルとmode、リセット/終了時の扱いを公開契約に記載し、JS側の読取・削除操作も同じ状態へ反映する。
- FR3.2 ページ再読込みを越える永続化、mtime/hard-linkの忠実再現は既存契約を調べたうえで判断し、未合意の追加機能として実装しない。
- 合否：pitchforkの設定更新→読取、aubeのinstall→list、ファイル削除→次回不在を確認する。独立端末で同じパスを使っても内容が混ざらない。

### FR4 Worker の実行ライフサイクル

長時間処理をメインスレッドから分離し、呼出しが成功・失敗・timeout/中止のいずれでも終了状態へ到達する。終了した実行から別の実行へ結果が混入しない。[desc][memory:M3]

- FR4.1 timeout、中止、終了処理、同時呼出しの扱いと資産URL指定の契約を設計で明示する。
- 合否：正常終了、非0終了、初期化失敗、timeout、中止を各々確認する。中止後の再実行が成功し、Workerが残って次の実行を妨げない。

### FR5 terrarium の既存入口の互換性

基準commitのページリンク、`<terrarium-terminal>`、`run()`、iframe APIを維持し、実行部をformicariumへ置き換える。[desc][Q1][memory:M4]

- FR5.1 tool/ref/run/fixture/cwd/base、readyのtool/ref/commit、run()のcode/output、transcriptとready/exit/errorイベントを基準の正常系・失敗系と比較する。
- FR5.2 iframeのterrarium:ready/run/exit/errorと親originの制限を保持する。未承認originからのrunを実行しない。
- FR5.3 unsupportedなshell構文を黙って別のコマンドとして実行しない。基準が許す構文を調査し、対象外構文の識別可能なエラーを設計する。汎用shellは追加しない。[desc]
- FR5.4 iframeの初回受入れ対象は下の表で固定する。成功対象では同じfixtureの手順とterrarium:ready/run/exit/errorを確認し、未対応対象では原因を識別できる通知とゲスト未実行を確認する。外部originからの親メッセージは、対応条件を満たしていても承認済みoriginに限る。[memory:M4][Q3]

| 埋込み条件 | Chromium | Firefox | WebKit |
|---|---|---|---|
| 同一origin。親・iframe・資産の隔離条件を満たす | 手順成功必須 | 手順成功必須 | 手順成功必須 |
| 外部origin。GitHub Pages配信をcredentiallessとallow="cross-origin-isolated"で埋め込み、親・資産の隔離条件を満たす | 手順成功必須 | 未対応通知・ゲスト未実行必須 | 未対応通知・ゲスト未実行必須 |
| 必要な隔離条件が欠ける | 原因通知・ゲスト未実行必須 | 原因通知・ゲスト未実行必須 | 原因通知・ゲスト未実行必須 |

ドキュメント根拠：terrarium READMEのiframe配信制約。上表は初回の合否条件であり、実行成功は未検証。CORPヘッダを設定できる別配信先による外部origin埋込みは初回必須対象へ追加しない。

- 合否：既存形式のリンク・要素・runから同じfixtureを使う手順が3ブラウザーで通り、iframeは上表の条件を満たす。tool切替時のref/fixture/cwd/queued runのリセット、失敗通知とorigin拒否も回帰検証する。

### FR6 terrarium の ref 別配布

terrariumがaube/pitchforkのstatic-muslゲストとfixtureをref別に配布し、利用者のtool/ref指定に対応する成果物を選ぶ。formicariumの共通コアとゲストのrefを分離する。[desc][Q2][memory:M4]

- FR6.1 既存のbranch/tag/commit/pr-番号の選択とbuilds一覧から、対応するゲスト・fixture・取得元commitを解決する。
- FR6.2 他のツールを追加・一括移行することは初回の対象外。対象の欠落ref/fixtureは識別可能なエラーとし、別refへ黙って切り替えない。
- 合否：異なる2refを選んで取得元情報と成果物の対応を確認する。未配布refと未知tool/fixtureが成功扱いされない。

### FR7 受入れと回帰

最初にtarballからNodeとbrowser Workerを動かす最小版を作り確認する。その後RCを実際にterrariumへ導入し、aube-1645・pitchfork-basicと既存入口の互換性を検証する。[desc][memory:M1]

- FR7.1 Node・Chromium・Firefox・WebKitで対象手順の出力をnative baselineと比較する。既存probe8項目と回帰項目は指定範囲で維持する。
- FR7.2 コア/ゲストが変わっていないときは既存のビルド物を使い、build-infoから同一性を確認する。変更された部分だけ必要な再ビルドを行う。
- FR7.3 rc版の識別子、terrarium基準commit、integration差分、commands/results、ゲストref、browser、未検証事項を証拠として記録する。ローカルpackの成功だけでterrarium受入れを済ませない。
- 合否：native出力一致、入口互換性、品質条件をすべて満たす。失敗・未実施の必須項目がある間はstableへ進めない。

### FR8 公開対象の確認と公開リポジトリ

publicにするソース・資料・履歴と除外物を具体化し、ユーザーの確認後にformicariumのpublicリポジトリを作成する。[desc][memory:M2]

- 合否：公開候補一覧、機密/不要なローカル資料の確認、ライセンスと取得元の記録がレビュー可能。ユーザーの承認を記録するまで公開作成/pushを実行しない。

### FR9 RC・stable の公開

GitHub Releaseとnpmで0.1.0-rc.1を公開し、terrarium受入れ後に0.1.0を公開する。対象版のユーザー承認後、版タグから公開を開始する。[desc][memory:M1]

- FR9.1 RCはnext、stableはlatestとし、tag/version/npm/GitHub Releaseの対応と同梱資産を検証する。
- FR9.2 不具合時は追加公開を止め、既知の版へ誘導する。公開版の上書き/削除を解決策にせず、必要な修正版は別版として扱う。
- FR9.3 RC公開には、対象版と公開操作のユーザー承認、FR1のpack/同梱資産/型検証、FR7の最小tarball consumer（Node/browser Worker）の検証、FR10の公開前チェック通過を必須とする。公開済みRCを使うterrarium受入れはこの時点では未完了でもよい。
- FR9.4 stable公開には、上記の公開前条件に加え、公開済みRCを実際にterrariumへ導入したFR7の受入れ・回帰とNFRの必須検証の完了を必須とする。stable候補との差分にも必要な検証を行い、RCの証拠を未確認の別内容へ流用しない。
- 合否：RCとstableそれぞれの配布先・version・build-infoが対応する。RC公開→公開済みRCのterrarium受入れ→stable公開の順を確認する。terrarium受入れ未完了のstableや、未承認のRC/stableを公開する経路がない。実際の公開は外部操作の承認後に行う。

### FR10 GitHub Actions Trusted Publishing

人間の承認済み版タグに対し、テスト・pack・供給物確認を通過した成果物だけをTrusted PublishingでnpmとGitHub Releaseへ配布する。[desc][memory:M1]

- FR10.1 信頼先とworkflowの対応、公開jobの権限、未信頼変更からの公開阻止を具体化し、秘密の長期npm tokenに依存しない経路を構成する。
- 合否：必須チェック失敗時・未許可の実行元/版では公開jobに進まない。認証・信頼設定は実装時に公式仕様と実設定を照合し、模擬確認と実公開の証拠を分ける。

## Non-Functional Requirements

| ID | 要件・合否条件 | 根拠 |
|---|---|---|
| NFR1 | Node>=24、Chromium・Firefox・WebKitでFR1–FR7の対象検証が通る。iframeの成功/未対応の必須判定はFR5.4の表に従い、Firefox/WebKitのcredentialless外部originケースを成功必須とは扱わない。実機macOS Safariは未検証を明記し初回stableの必須条件にしない。未対応環境では原因を示す | [Q3][memory:M3][memory:M4] |
| NFR2 | probe1回600秒、aube-1645ブラウザ840秒、1worker、retryなし、probe8項目全通過、native出力一致、wasmメモリ上限1GBを維持。pitchforkは既存600秒browser/120秒Nodeを基準に対象テストで確認する。負荷下の計測で性能を断定しない | [memory:M2][memory:M3] |
| NFR3 | 第一者の配布JS全体を固定一覧で80%以上の行coverage。未実行/未収集ファイルを除外して達成しない。Node/Worker/browser計測を収集し欠落を検出、統合前CIで必須検証を実行 | [memory:M1] |
| NFR4 | ゲストネットワーク・デーモンを許可せず、iframeorigin制限、入力/path検証、端末間状態分離を回帰検証。資産取得のhost通信とゲストnetworkを区別 | [desc][memory:M2][memory:M4] |
| NFR5 | loader/wasm/build-info/noticesの出所と整合を確認。コア取得元commitとdirty=false、guestrefを追跡可能。公開候補の機密・依存・ライセンス確認結果を記録し、未確認を安全確認済みとしない | [memory:M1][memory:M2] |
| NFR6 | コア固有知識はruntime/core.mjsの境界へ保持。browser Workerのdelete Atomics.waitAsyncを維持。ゲストを変えるために公開JS実装を変更しなくてよい | [memory:M2][memory:M3] |
| NFR7 | 実行成功/失敗/timeout/中止を識別でき、stdout/stderr/終了コードとビルド・版情報を受入れ記録へ保存できる。機密値をログへ残さず、未検証を明示 | [memory:M1][memory:M2] |

## Constraints

- jjを用い、mise実体をglobで解決し、宣言taskはmise run。main sessionでビルド・テストを逐次実行する。[memory:M2]
- 初回はC blink forkを用いる。paludariumへ将来差し替える境界は保つが、Rustコア作成や移行は本件に含めない。[memory:M2][memory:M3]
- 既存ゲストとfixturesはterrariumの所有。pitchfork musl ioctlの既存1行パッチ例外を保持し、ついでのソース改善を混ぜない。[desc][memory:M2]
- この要件承認は公開先作成、push、publishの実行承認を兼ねない。公開対象と対象版を具体化した段階で既存の人間承認を得る。[memory:M2]
- 正しさの主張には観測コマンド/テスト名/ログを添え、検証済み・ドキュメント根拠・推測を区別する。重い検証を推論で代用しない。[memory:M2]

## Assumptions & Open Questions

選定を委任されたQ1–Q3以外の製品範囲は元の依頼から追加していない。以下は実装方法の検証項目であり、動作成功や環境準備済みという仮定ではない。

- A1：terrariumの基準はmain commit 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d。jj log/status（exit0）で親commitとcleanな作業コピーを観測。後続実装で基準との差分を確認する。担当：開発者。[Q1]
- A2：Node/npm/GitHubの公開権限とTrusted Publishing設定は未検証。リリース担当が実設定・公式仕様・公開候補で確認する。不可の場合は必須要件を満たしたと扱わず、具体的な障害を報告する。[desc]
- A3：COOP/COEP・Worker資産URLの具体的な設定はconsumer環境依存。設計で必要条件と設定方法を記載し、要素・iframe双方を検証する。初回のブラウザー別・埋込み条件別の合否はFR5.4で確定し、設計時に成功対象を縮小しない。iframeのcredentialless制約を全browser対応と表現しない。担当：設計・品質。[memory:M4]
- 後続設計：public exportsと型、ファイルsnapshot範囲、timeout/cancel/dispose/同時呼出し、assetURLの設定方法、計測方式、workflow権限。これらの選択はFR/NFRの結果を満たす技術判断である。
- terrariumは現在formicariumの書込みルート外。対象ファイルと差分を具体化し、その作業領域への必要な書込み権限を得てから変更する。読取り確認は実施済み。[Q1]

## Out of Scope

Rust crate、JSR初回配布、paludarium実装、C fork JIT、ネットワーク・デーモン・汎用対話CLI/汎用shell、未指定の追加guest、他ツールの一括移行、全体整形、変更のないaube再ビルド、実機Safariの初回必須化、未合意の新性能SLO。[desc][Q2][Q3][memory:M2]

## Verification Status

検証済み：engine project-descriptionの本文、CodeKB/手順資料の読み取り、terrarium README/terminal.mjs検索、jj log/status、回答委任の記録。ドキュメント根拠：過去PoC成果、既存品質基準。未検証：npm pack/型/Node/browser実行、terrarium組込み、coverage/CI、機密・依存スキャン、Trusted Publishing、RC/stable公開。要件の合否検証は後続実装とBuild and Test/配布受入れで実行し、今回の文書作成を成功証拠にしない。
