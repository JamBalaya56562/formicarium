# User Stories

## Sources

- [memory:M1] 承認済み requirements-analysis/requirements.md：全FR/NFR、iframe条件表、RC/stable条件。
- [memory:M2] practices-discovery/team-practices.md：最小tarball先行、test-after、CI、配布JS80%、既存品質上限。
- [memory:M3] CodeKB business-overview.md / component-inventory.md：既存構成。今回は実行成功を確認していない。
- [Q1] user-stories-questions.md：利用手順ごと（推奨）。Personaはpersonas.mdのP1–P3。

## Story Map and Priority

| 利用手順 | ストーリー | 前提となる成果物 |
|---|---|---|
| tarball導入 | US1.1–US1.3 | ビルド済みコア、public契約 |
| ゲスト実行と終了 | US2.1–US2.3 | tarball実行入口 |
| 連続操作・状態分離 | US3.1–US3.2 | 実行APIとFS契約 |
| terrariumから利用 | US4.1–US4.3 | 基準commit、guest/fixture、共通ランタイム |
| 品質・保守判断 | US5.1–US5.3 | 対象実装と検証成果物 |
| 公開判断・配布 | US6.1–US6.4 | 具体的な人間承認、公開前検証、RC受入れ |

全18件は初回Must Have。最小tarballのUS1.1/US1.2を先行するが、残りのMustを省いてstable公開しない。正式なMVP境界・Unit・見積りはDelivery Planningで決める。以下の依存は実装順序であり、検証では明記した固定fixture/成果物を用意して各ストーリーの結果を個別に判定する。

相対規模の設計前評価（推測・実工数は未検証）：複数入口を扱うUS4.1と複数環境のUS5.1はL、その他は暫定M。LはUnit/Delivery Planningで入口・環境ごとの担当と検証コマンドへ分割する。各ストーリーに固定fixtureを用意し、他ストーリーの実行結果に依存して初期状態を作らない。

Contract Designの終了までにpublic exports/型、snapshot範囲、timeout/cancel/dispose/同時呼出し、assetURLと失敗分類を一つの契約に固定する。実装・テストは複数の選択肢を任意に採用せず、その固定契約を前提にACを具体化する。公開権限とterrarium書込み権限の準備は未検証であり、用意済みと仮定しない。

## Stories and Acceptance Criteria

### US1.1 Node consumerから導入して実行する

P1として、空のNode consumerへtarballを導入して指定ゲストを動かしたい。コアを再ビルドせず、自分のアプリで利用するため。
根拠：FR1、FR1.1、FR2、FR7、NFR1。優先度：Must Have。依存：ビルド済みコア。
- AC1.1.1 Given Node>=24の空consumerとpackしたtarball、When 公開entry pointをimportして入力ゲストを実行する、Then 終了コードと期待出力を得る。
- AC1.1.2 Given 元リポジトリへ参照できないconsumer、When 同じ手順を行う、Then consumer内の同梱資産だけでコアをロードする。
- AC1.1.3 Given 必要なwasmを欠落させたconsumer、When 実行する、Then 欠落を識別できる失敗を返し成功扱いしない。
INVEST：導入から実行までの単一結果。public契約の名前・配置は設計で交渉可能。

### US1.2 browser Workerから導入して実行する

P1として、tarballのbrowser入口からゲストをWorkerで動かしたい。ページを占有せず同じランタイムを利用するため。
根拠：FR1.1、FR2、FR4、FR4.1、FR7、NFR1。優先度：Must Have。依存：US1.1と共通tarball。
- AC1.2.1 Given 隔離条件を満たす空browser consumer、When 資産URLを指定してゲストを実行する、Then Chromium/Firefox/WebKitで期待出力と終了コードを得る。
- AC1.2.2 Given browser用public入口、When consumerへ導入する、Then Node builtinや元リポジトリへの外部相対参照なしでWorkerと資産を取得する。
- AC1.2.3 Given 資産404または必要な隔離条件不足、When 開始する、Then 原因を識別できる失敗を返しguest成功を通知しない。
INVEST：Nodeとの差分を固定guestで独立検証。URL解決方法はContract Designで確定する。

### US1.3 型と供給物情報から利用方法を確かめる

P1として、型定義と資産・ライセンス・取得元情報をtarball内で確認したい。誤用を避け、導入内容を追跡するため。
根拠：FR1.2、FR1.3、NFR5。優先度：Must Have。依存：public契約と配布一覧。
- AC1.3.1 Given tarballのみを導入した型consumer、When 正しいpublic API呼出しをcompileする、Then 型解決が成功し、不正な入力型はcompileで拒否される。
- AC1.3.2 Given pack一覧、When 宣言した資産と照合する、Then JS/Worker/loader/wasm/types/LICENSE/notices/build-infoが揃い、aube/pitchforkゲストとfixtureは同梱されない。
- AC1.3.3 Given build-infoとblink.lock、When 供給物を照合する、Then 取得元commit・dirty=false・版を追跡でき、不整合または欠落は失敗として記録される。
INVEST：配布契約確認の単一成果。開発probeの配置は設計で製品範囲と分離する。

### US2.1 任意の対象ゲストの結果を取得する

P1として、引数・env・cwd・入力ファイルを指定して出力と終了コードを取りたい。固定登録表を編集せず自分のゲストを利用するため。
根拠：FR2、FR2.1、NFR6、NFR7。優先度：Must Have。依存：US1.1/US1.2。
- AC2.1.1 Given static-musl x86-64ゲストと同じ入力、When Nodeとbrowser Workerで実行する、Then stdout/stderrと終了コードが対応するnative基準に一致する。
- AC2.1.2 Given 非UTF-8バイトを含む出力fixture、When 結果を取得する、Then 公開契約に従うバイト列が欠落せず、stdout/stderrを混同しない。
- AC2.1.3 Given 固定登録表にない有効な対象guest、When 入力を指定する、Then 公開JS実装や登録表を編集せず実行でき、非0終了も元の終了コードを保持する。
INVEST：結果取得という単一価値。bytes/textの型は契約設計に委ねる。

### US2.2 入力・初期化失敗を識別する

P1として、開始できなかった原因を正常なguest終了と区別したい。入力や配信設定を直せるようにするため。
根拠：FR2.2、NFR4、NFR7。優先度：Must Have。依存：実行入口。
- AC2.2.1 Given 不正guest形式・cwd・ファイルpathの各fixture、When 開始する、Then 原因付きで拒否し、許可外pathへの配置とguest実行を行わない。
- AC2.2.2 Given loader取得/コア初期化の失敗fixture、When 開始する、Then 通常の非0終了と識別できる失敗として返る。
- AC2.2.3 Given guestがexit3で正常に終了するfixture、When 取得する、Then 初期化失敗へ変換せず終了コード3を返し、機密env値を診断ログへ露出しない。
INVEST：エラー分類の単一結果。エラー表現はContract Designで固定する。

### US2.3 停滞した実行を終了して再実行する

P1として、timeout/中止後も次の実行を開始したい。停滞したWorkerに利用を妨げられないため。
根拠：FR4、FR4.1、NFR7。優先度：Must Have。依存：Worker入口。
- AC2.3.1 Given 停滞するguest、When 指定timeoutに到達または中止する、Then 契約で定める終了結果を1回だけ通知しWorkerを終了処理する。
- AC2.3.2 Given 中止済み実行と新しい実行、When 古い実行の通知が遅れて届く、Then 新しい結果へ混入せず次の正常guestは成功する。
- AC2.3.3 Given 同時呼出しとdispose後の呼出し、When 開始を要求する、Then 契約で選んだ隔離/直列化/拒否の規則どおりに終わり、未解決呼出しを残さない。
INVEST：終了・再利用の境界を対象。timeout精度の新しい性能SLOは追加しない。

### US3.1 同じ端末でファイル状態を引き継ぐ

P2として、コマンドで変更したファイルを次の操作から読みたい。aube/pitchforkの既存手順を再現するため。
根拠：FR3、FR3.1、FR3.2。優先度：Must Have。依存：実行APIとFS契約。
- AC3.1.1 Given 同一端末とfixture、When pitchforkの設定更新→読取、aubeのinstall→listを行う、Then 作業領域/HOMEの対象ファイルとmodeが次の呼出しへ引き継がれる。
- AC3.1.2 Given 作成済みファイル、When JS側で読取/削除して次のguestを実行する、Then 同じ状態を参照し削除済みファイルは不在になる。
- AC3.1.3 Given reset/端末終了、When 再度開始する、Then 公開契約の初期化規則に従う。ページ再読込み永続化・mtime/hard-linkは基準契約調査と判断を記録し、未合意の新機能を必須成功条件にしない。
INVEST：連続操作で一つの利用価値を示す。snapshotの具体範囲は契約設計で定める。

### US3.2 別端末と許可外領域へ状態を漏らさない

P2として、独立した端末が互いのファイルを変更しない状態で使いたい。別の作業を壊さず手順を再現するため。
根拠：FR3、NFR4。優先度：Must Have。依存：FS状態の所有単位。
- AC3.2.1 Given 2端末が同じguestパスを使う、When 別々の内容を書き込んで読む、Then 各端末は自分の内容だけを返す。
- AC3.2.2 Given 端末Aの削除/reset/終了、When 端末Bで読む、Then Bの対象状態は変わらない。
- AC3.2.3 Given 境界外pathまたはguestネットワーク要求、When 実行する、Then 許可外への操作を拒否し、host資産取得をguestネットワーク許可として扱わない。
- AC3.2.4 Given 常駐daemon実行を要求するfixture、When 開始する、Then 契約で定めた非対応/終了結果を返し、常駐サービスを起動して成功扱いせずWorkerを残さない。pitchforkのdaemon add/removeという設定操作とは区別する。
INVEST：独立性と入力境界をfixtureで直接検証できる。

### US4.1 既存リンク・要素・run()から同じ手順を使う

P2として、既存入口と結果の形式を変えずに利用したい。利用コードや説明手順を作り直さないため。
根拠：FR5、FR5.1、FR5.3、NFR1。優先度：Must Have。依存：terrarium基準commitとランタイム。
- AC4.1.1 Given 基準commitのリンク/要素/run()のfixture、When 同じtool/ref/run/fixture/cwd/baseで呼ぶ、Then 3ブラウザーでreadyのtool/ref/commit、code/output、transcript、ready/exit/errorが基準に一致する。成功・非0終了・入力/初期化失敗ごとにイベントの順序/回数/fieldsを比較し、全イベントが成功時に発火するとは仮定しない。既存キーボード操作・フォーカスも基準と比較する。
- AC4.1.2 Given tool切替前のref/fixture/cwd/queued run、When toolを切り替える、Then 基準どおりにリセットされ古い実行が混ざらない。
- AC4.1.3 Given 不正入力または対象外shell構文、When 実行する、Then 原因と修正対象の入力項目をテキストで伝え、別コマンドとして黙って実行しない。許可構文の範囲は基準調査で記録する。新たなUI再設計は行わない。
INVEST：互換性は固定された基準fixtureで判定。UI再設計や汎用shellを追加しない。

### US4.2 対応条件に合うiframeから安全に実行する

P2として、対応する埋込みでは実行し、非対応では原因を知りたい。許可した親ページから既存APIを使うため。
根拠：FR5.2、FR5.4、NFR1、NFR4。優先度：Must Have。依存：iframeメッセージ契約。
- AC4.2.1 Given 同一originと必要な隔離条件、When 承認済み親からrunを送る、Then Chromium/Firefox/WebKitで同じfixtureが成功しterrarium:ready/run/exit/errorの契約を保持する。
- AC4.2.2 Given 外部originのGitHub Pages iframeにcredentialless/allow="cross-origin-isolated"と必要な隔離条件、When 実行する、Then Chromiumでは成功しFirefox/WebKitでは未対応通知とguest未実行を確認する。
- AC4.2.3 Given 隔離条件不足または未承認origin、When runを要求する、Then 条件不足は原因を通知し、未承認originのrunはいずれのbrowserでも実行しない。通知先も既存のorigin制限を守り、未承認親へ情報を返さない。
- AC4.2.4 Given FR5.4の9セルと各対応条件における未承認origin、When 個別に判定する、Then 非実行ケースは通知だけでなくguestのmarker書込み/呼出し監視等のoracleで副作用がないことを確認する。oracleの具体方式は品質設計で固定する。
INVEST：FR5.4の表をそのまま合否に使う。実機Safari/CORP別配信先は初回必須へ追加しない。

### US4.3 指定refのguestとfixtureを選ぶ

P2として、aube/pitchforkの指定refと対応fixtureを取得したい。異なる版の手順を正しく再現するため。
根拠：FR6、FR6.1、FR6.2、NFR5。優先度：Must Have。依存：terrarium配布成果物と取得元情報。
- AC4.3.1 Given branch/tag/commit/pr-番号とbuilds一覧、When 対象tool/refを選ぶ、Then 対応guest/fixture/commitを解決しformicarium共通コアの版と分離して表示・記録できる。
- AC4.3.2 Given 異なる2refの配布fixture、When 各refを選ぶ、Then 取得元commitと内容の対応を確認できる。
- AC4.3.3 Given 未配布ref・未知tool/fixture、When 要求する、Then 識別可能な失敗となり別refへfallbackしない。既存の他ツールは初回移行の対象へ追加しない。
INVEST：配布選択を独立fixtureで検証。guestビルド方式は設計で決める。

### US5.1 配布候補の回帰と受入れ証拠を判定する

P3として、候補版の実行結果をnative基準と比較したい。既存の正しさを失った版をstableへ進めないため。
根拠：FR7、FR7.1、FR7.2、FR7.3、NFR1、NFR2、NFR7。優先度：Must Have。依存：候補実装・既存baseline。
- AC5.1.1 Given 候補と同一性を確認したコア/guest、When Nodeと3browserでprobe8項目・aube-1645・pitchfork-basicを逐次検証する、Then 必須出力がnative基準に一致し、指定範囲の回帰項目も成功する。
- AC5.1.2 Given 検証設定、When 実行する、Then probe600秒・aube browser840秒・pitchfork browser600秒/Node120秒・1worker・retryなし・wasm1GBを維持し、上限緩和で成功にしない。
- AC5.1.3 Given 結果記録、When 公開判断する、Then commands、stdout/stderr/終了コードまたは初期化失敗/timeout/中止の区別、対象版・core/guest build情報、terrarium基準commit/差分、guestref、browser、未検証事項が揃う。機密値は保存せず、stderr/code記録は既存transcript形式と分離し、既存baselineにないstderr/バイト基準はUS2.1の専用fixtureで確認する。変更のないaubeは再ビルドせず、負荷下の計測で性能成功を断定しない。
INVEST：受入れ証拠の生成・判定が結果。公開済みRCの実terrarium検証はUS6.4で別判定する。

### US5.2 配布JSのcoverageとCI結果から統合を判断する

P3として、全配布JSを含む検証結果を確認したい。未実行部分を隠して品質条件を満たしたと扱わないため。
根拠：NFR3、FR10。優先度：Must Have。依存：配布JS一覧と対象実装。
- AC5.2.1 Given 事前固定した第一者配布JS一覧、When Node/Worker/browser計測を集約する、Then 未実行ファイルも分母に含め行coverage80%以上を確認する。
- AC5.2.2 Given 未importファイルまたはrealmの収集欠落、When 集計する、Then 欠落を検出し0%または未測定として失敗/未検証を報告し、分母から除外しない。収集欠落が残る間はNFR3合格・品質gate通過・stable公開へ進めない。
- AC5.2.3 Given 統合前CI、When 必須検証が走る、Then 固定一覧・除外理由・行数・レポート・コマンドを成果物へ残し、不合格時は統合/公開の必須チェックを通過しない。
INVEST：品質判定の独立成果。計測方式は未import/別realmの試験を観測して設計する。

### US5.3 コア境界を保ってguestを差し替える

P1として、共通ランタイムを変更せず対象guestを差し替えたい。将来のコア更新とツール利用を分離するため。
根拠：NFR6、FR2。優先度：Must Have。依存：public契約・実行入口。
- AC5.3.1 Given 異なる有効guestのfixture、When 同じpublic JS実装に入力する、Then 登録表追加や公開JS修正なしで実行する。
- AC5.3.2 Given 対象差分、When 依存境界を確認する、Then コア固有の知識はruntime/core.mjsの境界に保ち、別adapterへ直接のコア依存を拡散させない。
- AC5.3.3 Given browser WorkerとWebKit回帰、When コアをロードする、Then delete Atomics.waitAsyncを維持して対象検証が通る。paludarium実装やC fork JITへ範囲を拡張しない。
INVEST：guest差替えの利用価値と境界を示す。コア移行の実装を含まない。

### US6.1 公開する内容を確認して公開先を用意する

P3として、公開ソース・資料・履歴・除外物を確認したい。承認した内容だけをpublicにするため。
根拠：FR8、NFR5。優先度：Must Have。依存：公開候補一覧。
- AC6.1.1 Given 公開候補、When source/history/packの機密・依存・ライセンス・取得元を確認する、Then 対象一覧・除外・検査結果・未確認事項がレビュー可能になる。
- AC6.1.2 Given 公開先作成/pushの承認がない、When 公開準備を行う、Then 外部公開は実行されない。
- AC6.1.3 Given 具体的な対象へのユーザー承認、When publicリポジトリを作成して対象をpushする、Then 対象と結果を記録し候補以外の内容を公開しない。
INVEST：公開対象の決定は配布版の公開と別。後続で必要な外部操作承認を得る。

### US6.2 承認済み版だけを信頼した公開経路へ渡す

P3として、必要チェックを通った承認済み版タグから配布したい。未信頼変更や認証誤設定からの公開を防ぐため。
根拠：FR10、FR10.1、NFR5。優先度：Must Have。依存：公開先・workflow設計。
- AC6.2.1 Given 公式仕様と実設定、When Trusted Publishingを構成する、Then 信頼先とworkflow・公開job限定権限を照合し長期npm tokenに依存しない経路を確認する。
- AC6.2.2 Given 必須チェック失敗または未許可実行元/版、When 公開を要求する、Then 公開jobへ進まずnpm/GitHub Releaseを作成しない。
- AC6.2.3 Given 承認済み版タグとチェック済み供給物、When 公開経路を確認する、Then tag/version/npm/GitHub Releaseと実際の同梱内容が対応し、模擬確認と実公開の証拠を分ける。
INVEST：公開の信頼境界を対象。公開先の権限準備は未検証。

### US6.3 最小consumer検証後にRCを配布する

P3として、公開前条件を満たす0.1.0-rc.1を配布したい。実terrarium受入れに使う公開済み候補を用意するため。
根拠：FR9、FR9.1、FR9.3。優先度：Must Have。依存：US1.1–US1.3、US6.1/US6.2、対象版・操作承認。
- AC6.3.1 Given 承認・pack/資産/型・最小Node/browser consumer・公開前チェックが成功、When 版タグからRCを公開する、Then 0.1.0-rc.1がnpm nextとGitHub Releaseへ対応する内容で配布される。
- AC6.3.2 Given 公開済みRCのterrarium受入れが未完了、When RC公開の合否を判定する、Then 受入れ未完了だけでRCを拒否せず、stable条件と区別する。
- AC6.3.3 Given 必要な公開前条件または承認の欠落、When RC公開を要求する、Then 公開を止め具体的な欠落を示す。
INVEST：RC供給の単一成果。実公開は具体的な外部操作承認後に行う。

### US6.4 公開済みRCの受入れ後にstableへ進める

P3として、実terrariumで受け入れたRCの証拠からstableを判断したい。未検証の利用経路や差分を正式版へ持ち込まないため。
根拠：FR9.2、FR9.4、FR7.3、NFR1–NFR7。優先度：Must Have。依存：公開済みRC・terrarium integration・必須検証。
- AC6.4.1 Given 公開済みRCを実terrariumへ導入した差分、When FR7の実手順・既存入口と全必須NFRを確認する、Then 版・core/guest build情報・commit/ref/commands、stdout/stderr/終了コードまたは初期化失敗/timeout/中止と未検証事項を記録し、ローカルpackだけでは受入れ完了にしない。機密値は保存せず既存transcript形式を変えない。
- AC6.4.2 Given 受入れ完了・stable候補との差分検証・対象版と操作承認、When 版タグから公開する、Then 0.1.0がnpm latestとGitHub Releaseへ対応する内容で配布される。
- AC6.4.3 Given 必須項目の失敗/未実施、不具合または証拠と候補の不一致、When 公開判断する、Then stable/追加公開を止め、既知の版へ誘導する。公開版を上書き/削除せず必要な修正版は別版とする。
INVEST：RC供給とは独立したstable判定。RCを固定前提としてテストできる。公開と回帰の大きさはUnit/Delivery Planningで分割する。

## Assumptions & Open Questions

- 本文は受入れ基準であり、実装・検証成功の証拠ではない。全ACの動作は未検証。
- public exports/型、FS snapshot、timeout/cancel/dispose/同時呼出し、assetURL、coverageの収集方式、workflow権限はContract Design以降で確定する。
- 相対見積りや実装日数はまだ未検証。開発者の評価を統合し、Unit/Delivery Planningで具体化する。
- 追加guest、JSR/Rust配布、汎用shell、実機Safari初回必須化、新性能SLOは承認済み範囲外を維持する。
