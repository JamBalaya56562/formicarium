# Security Requirements — u1-runtime-package

## Sources and Scope

ドキュメント根拠：requirements.md NFR1–NFR7、functional-spec.md、rules.md BR1–BR5、contract-summary.md C1/C2/C8、technology-stack.md。Q1の人間回答「1」は終了確認不能時のsession利用不可を選択した。すべて実装前の要件であり動作は未検証。

U1はローカルのNode/browser library。guest bytesとseed、Worker messageを信頼境界として扱う。資産URLはconsumerが設定するhost通信でありguest networkではない。U3のiframe origin判定、U4の公開認証/証拠判定をU1へ移さない。アカウント認証、DB、常時稼働サービスのSLAは追加しない。

## Requirements and Acceptance

| ID | 詳細要件・合否条件 | 検証方法・担当 |
|---|---|---|
| NFR1.1 | Node>=24とChromium/Firefox/WebKitの空consumerで公開import、Worker、同梱資産、guest実行を確認する。Node builtinをbrowser/sharedに要求しない | U1 pack consumerの成功fixture。環境と実版を記録 |
| NFR1.2 | browserの必須隔離/SharedArrayBuffer等がない場合UNSUPPORTED_ENV、資産不足ASSET_LOAD、factory失敗CORE_INIT。guest未開始を確認する。実機Safariは未検証を維持 | 条件欠落とasset欠落fixture、起動marker。iframe9セルはU3 |
| NFR2.1 | wasmメモリ上限1GB、既存probe600秒/aube browser840秒/pitchfork browser600秒・Node120秒、1worker/retryなしを維持する。runの既定600000msはC1どおり、aubeには840000msを明示する | U1資産/build testとtimeout fixture、既存全体回帰はU4。負荷なし逐次main実行 |
| NFR2.2 | deadlineは受付からasset/core/guest/snapshotまで。current message採用時にも期限とsignalを判定し、CPU-bound中止はhost terminateで行う。新しいlatency SLOを追加しない | controlled lifecycle試験とCPU-bound guest。既存品質上限は延長しない |
| NFR3.1 | 固定された第一者配布JS13ファイルを全件分母に含め行coverage>=80%。Node/Worker/browserで同一source lineのunionを集約する。未importは0、realm収集欠落は失敗/未検証 | U1は測定可能なコードと一覧を提供、U4は候補単位の全体集計・統合前CI。欠落ファイルfixture必須 |
| NFR4.1 | ELF/input/path/type/mode/inode/envを受付時検証してcopyする。root外、..、NUL、中間symlink、親file/symlink、HOME不一致を全体拒否。初期親自動0755と明示modeを両立する | 不正入力、copy改変、seed順不変、保護root、symlink/hard-link fixture |
| NFR4.2 | host FSをmountしない。通常のguestからhost network/FSへ権限を与えず、guest network非対応を維持する。daemonは有限runとしてtimeout/終了する。Worker自体を悪意ある任意JSに対するOS sandboxと主張しない | guest network拒否、host sentinel不変、daemon/time limit fixture。一般ELFからdaemonを推定するAPIは追加しない |
| NFR4.3 | session別state/Worker/bytesを非共有とし、run世代/version/形状/sequenceを検査する。古い通知は不採用、current不正通知はEXECUTIONでrollback | 2session同path、stale/duplicate/unknown/malformed message fixture。iframe親originはU3担当 |
| NFR4.4 | seed/current/返却bytesとsnapshotは独立コピー。root内リンクとmode/削除を保持し、異常snapshot・特殊fileはSNAPSHOTで全体rollbackする。失敗時の部分stateを次runへ渡さない | hard-link/symlink/mode、削除、snapshot失敗、consumer改変のfixture |
| NFR5.1 | loader/wasm/build-infoを同一ビルドとし、blink.lock sourceCommitとdirty=false、各digest、LICENSE/notices、型をpack候補に含め照合する。guest/fixture/private記録を除外する | U1 pack inventoryと空consumer/type検証。依存・機密・実公開判定はU4、未確認を安全確認済みにしない |
| NFR6.1 | コア固有のfactory/argv/locateFile/補助資産/FS参照知識はruntime/core.mjsに閉じる。guest登録表を製品実行の条件にしない | 依存境界読取とregistry未登録guest成功fixture。将来Rust core移行の実装は範囲外 |
| NFR6.2 | browser Workerはcoreロード前にdelete Atomics.waitAsyncを実行する。3browser試験で維持を確認しWebKitを除外しない | source順序とWebKit実行回帰。実機Safari成功を推測しない |
| NFR7.1 | stdout/stderr bytes、正常非0exit、INVALID_INPUT/ASSET_LOAD/CORE_INIT/EXECUTION/SNAPSHOT/TIMEOUT/ABORTEDを区別しPromiseを一度だけsettleする。callback throwはEXECUTION、partial bytesはhost受信済み範囲 | stream/非UTF-8、非0、callback throw、各failure fixture。証拠はcommand/実環境/version/build情報付き |
| NFR7.2 | env/input値、任意cause stack、秘密入りoutputを診断/public証拠へ無条件転記しない。公開fixtureは秘密なし。error protocolは安全なcode/messageと受信bytesだけ | sentinel secretの非露出確認。stdoutそのものはconsumerのデータであり自動編集しない |
| NFR7.3 | 正常doneは候補snapshotとして保持し、Worker終了確認後にcommit・予約解除・結果settleする。終了確認不能時は候補をcommitせずEXECUTIONでrejectしsessionをdisposedへ移す。以後の操作DISPOSED、disposeは冪等 | Q1。成功直後のreadFile/次run、terminate rejection/異常終了の注入。実動作は未検証 |
| NFR7.4 | 通常timeout/abortはWorker終了確認できた場合前stateを保持して再実行可能。終了確認不能の場合だけNFR7.3を優先し、既存のTIMEOUT/ABORTED情報はsafe causeに保持する。dispose要求ではstateを破棄し再利用しない | timeout/abort→再run、cleanup失敗→DISPOSED、同時done/abort/dispose fixture |

## Threat Considerations

今回の差し戻し（人間のRequest Changes／上記2件）では、NFR5.1の照合を評価対象とすべての補助Workerのloader bytesへ結合する。照合後に元URLの応答を変更する試験で、未照合loaderを評価・開始しないことを確認する。同一originのWorker、CORS/CSP、隔離条件を免除しない。Nodeと3ブラウザで新候補の成功経路・不一致拒否・資源解放をmain sessionが逐次検証する。動作は未検証。

NFR4.4は、setCwdで指定したnested cwdの祖先削除後、次runで不足親からcwdを0755で再作成し、既存seed・mode・inode/linkを維持する場合も対象とする。公開APIの操作列を実coreで検査し、異常時rollbackと成功snapshotを確認する。偽FSにも親不存在の失敗条件を持たせる。NFR2の上限とNFR3の固定分母80%は維持し、旧候補v4の結果を修正後の合格根拠にしない。

| STRIDE | 境界・影響 | 要件・oracle |
|---|---|---|
| Spoofing | 古い/別session messageが現runへ混入 | NFR4.3、正規run state/結果の不変 |
| Tampering | consumer buffer改変、snapshot path/inode改変、asset不整合 | NFR4.1/4.4/5.1、コピー・全体拒否・候補digest |
| Repudiation | 試験結果とcandidateの対応不明 | NFR5.1/7.1、U4へcommand/版/build結果を渡す。利用者監査サービスを追加しない |
| Information disclosure | 他session/hostファイル、error cause/envの漏出 | NFR4.2/4.3/7.2、sentinel非露出・非共有 |
| Denial of service | CPU-bound、cleanup失敗、巨大guest/output/state | NFR2.1/2.2/7.3/7.4。1GBはwasm上限でhost heap全体の上限ではない。無制限host入力に対する安全性を保証しない |
| Elevation of privilege | path/symlink経由の範囲外FS、guest network | NFR4.1/4.2、host sentinel不変・拒否fixture |

## Data Protection and Compliance Boundary

guest/input/outputの機密度はconsumer依存。libraryは永続DB・telemetry送信・秘密の自動ログを設けない。resetはseedへ戻すため完全削除ではなく、disposeは所有参照を破棄するがJS/OS memoryの暗号学的消去を保証しない。PII/医療/決済データ利用や法的適合認証を本intentの実績として主張しない。法律上の判断を追加しない。ライセンス/取得元の記録はU1供給物に必要、公開範囲の最終確認はU4。

## Design Alignment and Open Items

NFR7.3/7.4は人間Q1で確定した終了失敗時の追加要件。functional-spec.md Run Workflow 9–10とレビューR-01はまだ未改訂であり解消済みとは扱わない。実装前のNFR Designで順序・遷移・error優先度を統合し、Functional Designの変更が必要なら明示的に差分を扱う。承認済みC1/C8の正常/異常の意味を黙って変更しない。

性能・scalability・reliability・observability専用成果物はlibraryの出力対象外だが、既存上限・単一active・終了失敗・機密診断は上表に残す。host total-memory cap、新しいavailability/latency SLO、法的適合認証は未要求。動作、全体coverage、CI、pack、3browser、公開はすべて未検証。
