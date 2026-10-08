# Entities — u1-runtime-package

## Sources

ドキュメント根拠：components.mdの所有モデル、contract-summary.md C1/C2/C8、requirements.md FR1–FR4。技術設計提案。実装・実行は未検証。

## Entity Model

```yaml
entities:
  - name: CoreDescription
    owner: CoreAdapter
    description: コア固有の起動と供給物情報
    attributes:
      - {name: coreId, type: string, required: true, unique: true}
      - {name: loaderLocation, type: absolute-URL, required: true}
      - {name: wasmLocation, type: absolute-URL, required: true}
      - {name: sourceCommit, type: commit-id, required: true}
      - {name: buildInfo, type: provenance-record, required: true}
    constraints: [loaderとwasmとbuild-infoは同じビルド, 評価対象と補助Workerは照合済みloader bytesに結合, 起動知識はこの所有者に限定]
    relationships: []
  - name: GuestRequest
    owner: GuestExecution
    description: 受付時にコピーした単一guest入力
    attributes:
      - {name: requestId, type: string, required: true, unique: true}
      - {name: guest, type: bytes, required: true, min: 1, constraints: [ELF64 little-endian x86-64, PT_INTERPなし]}
      - {name: args, type: string-list, required: true, default: [], constraints: [NULなし]}
      - {name: env, type: string-map, required: true, default: {}, constraints: [HOMEはsession.homeと一致, NULなし]}
      - {name: cwd, type: absolute-POSIX-path, required: true, default: /work}
      - {name: home, type: absolute-POSIX-path, required: true, default: /root}
      - {name: inputFiles, type: FsEntry-list, required: true, default: []}
      - {name: coreId, type: string, required: true, references: CoreDescription.coreId}
    constraints: [consumerのbufferをdetachしない, guest登録表を必要としない]
    relationships:
      - {target: CoreDescription, cardinality: many-to-one, direction: outgoing}
  - name: GuestResult
    owner: GuestExecution
    description: 正常guest終了の出力と完全なsnapshot材料
    attributes:
      - {name: requestId, type: string, required: true, unique: true, references: GuestRequest.requestId}
      - {name: stdout, type: bytes, required: true}
      - {name: stderr, type: bytes, required: true}
      - {name: exitCode, type: integer, required: true}
      - {name: elapsedMs, type: nonnegative-number, required: true, min: 0}
      - {name: fileChanges, type: FsEntry-list, required: true}
    constraints: [非0の正常終了も結果, 完全snapshotなしを成功扱いしない]
    relationships:
      - {target: GuestRequest, cardinality: one-to-one, direction: outgoing}
  - name: SessionSnapshot
    owner: SessionState
    description: session内で唯一所有する仮想ファイル状態
    attributes:
      - {name: sessionId, type: string, required: true, unique: true}
      - {name: generation, type: nonnegative-integer, required: true, min: 0, default: 0}
      - {name: cwd, type: absolute-POSIX-path, required: true, default: /work}
      - {name: home, type: absolute-POSIX-path, required: true, default: /root}
      - {name: roots, type: absolute-POSIX-path-list, required: true, constraints: [初期cwd/homeで固定, 重複領域を統合, 予約領域を禁止]}
      - {name: entries, type: FsEntry-list, required: true, default: []}
      - {name: initialSeed, type: FsEntry-list, required: true, constraints: [reset用の独立コピー]}
      - {name: initialCwd, type: absolute-POSIX-path, required: true}
      - {name: modes, type: path-mode-map, required: true, constraints: [entriesのmodeの派生表示]}
    constraints: [原子的全置換, 別sessionと非共有, 返却bytesはコピー, 削除済みcwdは次runでroot内の不足親から再作成, mtime永続化を保証しない]
    relationships: []
  - name: RunHandle
    owner: ExecutionLifecycle
    description: 受付から終了までの単一runの所有情報
    attributes:
      - {name: runId, type: string, required: true, unique: true}
      - {name: requestId, type: string, required: true, references: GuestRequest.requestId}
      - {name: sessionId, type: string, required: true, references: SessionSnapshot.sessionId}
      - {name: workerId, type: string, required: false, references: WorkerHandle.workerId}
      - {name: generation, type: nonnegative-integer, required: true, min: 0}
      - {name: phase, type: enum, required: true, allowed: [preparing, running, snapshotting, terminating, settled]}
      - {name: startedAt, type: monotonic-time, required: true}
      - {name: timeoutMs, type: positive-integer, required: true, min: 1, default: 600000}
      - {name: deadline, type: monotonic-time, required: true}
      - {name: termination, type: enum, required: false, allowed: [exit, failure, timeout, aborted]}
      - {name: result, type: GuestResult-or-error, required: false}
    constraints: [session内activeは1つ, 一度だけsettle, 古い通知を無視, cleanupまで予約維持]
    relationships:
      - {target: SessionSnapshot, cardinality: many-to-one, direction: outgoing}
      - {target: GuestRequest, cardinality: one-to-one, direction: outgoing}
      - {target: GuestResult, cardinality: one-to-zero-or-one, direction: outgoing}
      - {target: WorkerHandle, cardinality: one-to-zero-or-one, direction: outgoing}
  - name: WorkerHandle
    owner: ExecutionLifecycle
    description: runごとの専用実行環境
    attributes:
      - {name: workerId, type: string, required: true, unique: true}
      - {name: runId, type: string, required: true, references: RunHandle.runId}
      - {name: environment, type: enum, required: true, allowed: [node, browser]}
      - {name: assetLocations, type: Assets, required: true}
      - {name: termination, type: enum, required: true, allowed: [live, terminating, terminated]}
    constraints: [runごとに新規生成, CPU-bound中止はhostからterminate, nested worker後始末]
    relationships:
      - {target: RunHandle, cardinality: one-to-one, direction: outgoing}
  - name: PackageCandidate
    owner: PackageSupply
    description: 未公開tarballの内容同一性
    attributes:
      - {name: candidateId, type: string, required: true, unique: true}
      - {name: version, type: version-string, required: true}
      - {name: exports, type: export-target-map, required: true}
      - {name: assets, type: path-digest-map, required: true}
      - {name: types, type: declaration-path-list, required: true}
      - {name: licenses, type: path-digest-map, required: true}
      - {name: notices, type: path-digest-map, required: true}
      - {name: buildInfo, type: provenance-record, required: true}
      - {name: contentDigest, type: sha256, required: true}
      - {name: firstPartyJS, type: path-digest-list, required: true}
    constraints: [guestとfixtureを除外, dirty=false, lockのcommitと一致, 同一候補の証拠だけへ対応]
    relationships:
      - {target: CoreDescription, cardinality: many-to-one, direction: outgoing}
value_objects:
  - name: FsEntry
    description: 通常file・directory・symlinkのタグ付き状態値
    attributes:
      - {name: path, type: absolute-POSIX-path, required: true, unique: true, constraints: [root内, NULと二重dotを拒否]}
      - {name: type, type: enum, required: true, allowed: [dir, file, symlink]}
      - {name: mode, type: integer, required: false, min: 0, max: 4095, constraints: [dir/fileでは必須]}
      - {name: inodeId, type: nonempty-string, required: false, constraints: [fileでは必須, 同じsession内のみ有効]}
      - {name: data, type: bytes, required: false, constraints: [fileでは必須, inode共有fileは同じdataとmode]}
      - {name: target, type: nonempty-string, required: false, constraints: [symlinkでは必須, 親から解決してroot内]}
    constraints: [中間symlinkをfollowしない, 不足親は0755で自動作成, 明示dir mode優先]
  - name: OutputChunk
    description: host受信順の出力単位
    attributes:
      - {name: runId, type: string, required: true}
      - {name: sequence, type: nonnegative-integer, required: true, min: 0}
      - {name: stream, type: enum, required: true, allowed: [stdout, stderr]}
      - {name: bytes, type: bytes, required: true}
    constraints: [sequenceはrunの全stream共通, callbackにコピー, resultのstream別bytesへ集約]
  - name: ExecutionError
    description: 正常guest終了以外の安全な失敗情報
    attributes:
      - {name: code, type: enum, required: true, allowed: [INVALID_INPUT, ASSET_LOAD, UNSUPPORTED_ENV, CORE_INIT, EXECUTION, SNAPSHOT, TIMEOUT, ABORTED, BUSY, DISPOSED, NOT_FOUND, NOT_FILE]}
      - {name: runId, type: string, required: false}
      - {name: stdout, type: bytes, required: true}
      - {name: stderr, type: bytes, required: true}
      - {name: cause, type: safe-local-cause, required: false}
    constraints: [機密envや任意stackをWorkerで送らない, 未送信bytesの完全性を保証しない]
  - name: Assets
    description: 同じビルドの実行資産URL
    attributes:
      - {name: loaderURL, type: absolute-URL, required: true}
      - {name: wasmURL, type: absolute-URL, required: true}
      - {name: workerURL, type: absolute-URL, required: true}
      - {name: buildInfoURL, type: absolute-URL, required: true}
    constraints: [browser Workerはsame-origin module, Node file URLはadapterで処理, 混在ビルドを拒否]
```

## Entity Summary

7エンティティをcomponents.mdの所有者へ対応した。FsEntry/OutputChunk/ExecutionError/Assetsは識別子を持つ独立所有エンティティではなく境界の値。ordered workflowと状態遷移の正本はfunctional-spec.md。mtime/ページ再読込みの永続化を新機能にしない。
