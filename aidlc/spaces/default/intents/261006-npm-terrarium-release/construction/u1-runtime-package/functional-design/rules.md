# Rules — u1-runtime-package

## Sources

requirements.md、stories.mdのU1担当、contract-summary.md C1/C2/C8、functional-design-questions.md Q1。ドキュメント根拠と人間回答を設計へ適用する。動作は未検証。

## Business Rules

```yaml
rules:
  - id: BR1.1
    statement: 空consumerは同梱物だけで公開入口を利用できる
    category: constraint
    applies_to: PackageCandidate
    trigger: packとimport
    logic: IF packageを導入した THEN Node/browser/sharedを分離しrepo外参照を使わない
    violation: 候補検証失敗
    source: [FR1, FR1.1, FR2]
  - id: BR1.2
    statement: 同一ビルドの照合済みbytesを評価対象へ結合し環境条件を満たしてからguestを開始する
    category: validation
    applies_to: Assets / WorkerHandle
    trigger: run preparing
    logic: IF 資産不足または不整合または照合bytesと評価対象が異なる THEN ASSET_LOAD; IF 必須環境不足 THEN UNSUPPORTED_ENV; 補助Workerも同じ照合済みloaderだけを使う
    violation: 開始拒否・rollback・cleanup
    source: [FR1.1, FR4.1, NFR1, NFR5]
  - id: BR1.3
    statement: 型・LICENSE・notices・build-infoと固定JS一覧を候補へ含めguestを除く
    category: policy
    applies_to: PackageCandidate
    trigger: pack候補作成
    logic: IF 内容一覧とdigestとlock commitとdirty=falseが一致しない THEN 候補検証失敗
    violation: 配布証拠を合格にしない
    source: [FR1.2, FR1.3, NFR3, NFR5]
  - id: BR2.1
    statement: 対応guestとコピーした入力だけを受付ける
    category: validation
    applies_to: GuestRequest
    trigger: run受付
    logic: IF ELF/path/env/args/期限に不正がある THEN INVALID_INPUT; ELSE 登録表なしで実行する
    violation: guest実行なし・所有state変更なし
    source: [FR2, FR2.2, NFR4, NFR6]
  - id: BR2.2
    statement: stdoutとstderrはbytesで分離し受付順sequenceを保持する
    category: constraint
    applies_to: GuestResult / OutputChunk
    trigger: output / done
    logic: IF 正常終了 THEN 全chunkをflushしstream別集約を返す; IF callback throw THEN EXECUTIONでrollback
    violation: 結果混入やbytes不一致はEXECUTION
    source: [FR2.1, NFR7]
  - id: BR2.3
    statement: 正常非0終了と開始・core・snapshot失敗を区別する
    category: policy
    applies_to: RunHandle
    trigger: terminal decision
    logic: IF 正常exit THEN 元のexitCodeを返す; ELSE 原因codeと安全なpartial bytesでrejectする
    violation: 失敗をguest exitに変換しない
    source: [FR2.2, NFR7]
  - id: BR2.4
    statement: runを一度だけ終了し古い通知を採用しない
    category: constraint
    applies_to: RunHandle / WorkerHandle
    trigger: message / deadline / abort / dispose
    logic: IF activeあり THEN BUSY; IF disposed THEN DISPOSED; IF deadlineまたはabort THEN terminateしrollback; ELSE 同一run世代だけ採用
    violation: 不正current messageはEXECUTION・cleanup
    source: [FR4, FR4.1, NFR7]
  - id: BR3.1
    statement: 完全な正常終了snapshotだけを原子的に保存する
    category: constraint
    applies_to: SessionSnapshot
    trigger: validated done
    logic: IF 期限内で未abortかつ完全snapshot THEN 非0も含めcommit; ELSE 前stateを保持
    violation: SNAPSHOTまたは該当異常codeでrollback
    source: [FR3, FR3.1, FR3.2]
  - id: BR3.2
    statement: 公開FS操作は所有状態とroot境界へ適用する
    category: validation
    applies_to: SessionSnapshot / FsEntry
    trigger: readFile / remove / listEntries / setCwd / reset
    logic: IF active THEN BUSY; IF root外または中間symlink THEN INVALID_INPUT; ELSE C1の対象別規則でコピーまたは原子的変更; 次runで削除済みcwdの不足親をroot内で順に0755で補い既存modeを保持する
    violation: 不在NOT_FOUND・非file読取NOT_FILE・root削除INVALID_INPUT
    source: [FR3.1, NFR4]
  - id: BR3.3
    statement: sessionごとの状態とWorkerを共有せずnetworkとdaemonを追加しない
    category: policy
    applies_to: SessionSnapshot / WorkerHandle
    trigger: create / reset / dispose / guest request
    logic: IF 別session THEN bytesとinode identityを非共有; IF networkまたはdaemonを要求 THEN 既存非対応または有限終了規則を保持
    violation: 許可外host操作を行わずtimeout時もWorkerを後始末
    source: [FR3, FR4, NFR4]
  - id: BR4.1
    statement: コア固有の起動知識はruntime/core.mjsへ閉じる
    category: constraint
    applies_to: CoreDescription / GuestExecution
    trigger: adapter設計と依存検査
    logic: IF guest差替え THEN 入力bytesだけを変える; IF core差替え THEN core境界だけで記述する
    violation: 境界検査失敗
    source: [FR2, NFR6]
  - id: BR4.2
    statement: browserのコアロード前にAtomics.waitAsyncを削除する
    category: constraint
    applies_to: browser WorkerHandle
    trigger: coreロード
    logic: IF browser Worker THEN delete Atomics.waitAsyncを先に行いWebKit回帰を確認する
    violation: 境界・回帰検証失敗
    source: [NFR6, NFR1, NFR2]
  - id: BR5.1
    statement: 初期entryの不足親を0755で自動作成し明示modeを保持する
    category: validation
    applies_to: FsEntry / SessionSnapshot
    trigger: initial seed検証
    logic: IF 不足親dir THEN 作成; IF 明示dir THEN 明示mode優先; IF 親fileまたはsymlink THEN 全体INVALID_INPUT
    violation: 部分的なseedを残さず作成拒否
    source: [FR3.1, FR2.2]
    decision_source: functional-design-questions.md Q1
```

## Rules Summary

| Group | 規則 | 内容 |
|---|---|---|
| BR1 | 1.1–1.3 | 導入・資産・供給物同一性 |
| BR2 | 2.1–2.4 | 入力・出力・失敗・Worker寿命 |
| BR3 | 3.1–3.3 | 状態commit・公開FS・分離 |
| BR4 | 4.1–4.2 | core境界・WebKit規則 |
| BR5 | 5.1 | 回答済み親自動生成 |

規則の順序と競合処理はfunctional-spec.mdの正本へ委ねる。既存タイムアウトや品質基準を緩めない。
