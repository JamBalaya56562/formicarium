# NFR Requirements Questions — u1-runtime-package

## Context and Existing Decisions

Guide meを継続する。既承認のNFR1–NFR7、品質上限、配布JS全体80%、Safari未検証、guest network非対応、主セッション逐次検証を維持し再質問しない。新しい性能SLOやサービスを追加しない。U1 libraryの出力はsecurity-requirements.md、tech-stack-decisions.md、traceability.jsonに限定する。

## Q1 — Worker終了失敗時のsession

ドキュメント根拠：Functional DesignレビューR-01はcleanupとPromise settleの順序、およびcleanup失敗後のsession状態が未確定と指摘した。正常時はWorker終了を確認してから状態保存・予約解除・結果返却する必要がある。これは実装成功の証拠ではなく未検証の設計判断。

Worker終了を確認できない異常時、sessionの扱いはどうしますか。

- A: 利用不可にする（推奨）。runはEXECUTIONで失敗、候補snapshotを保存しない。以後はDISPOSED、新sessionへ明示的に作り直す。正常に終了できたtimeout/abort後は従来どおり再実行可能。
- B: 前の状態で再利用を試みる。runはEXECUTIONで失敗、候補snapshotを保存しない。ただし残存Workerとの非干渉を別途証明できない間はBUSYを維持する。
- X: Other（希望する方針を記載）。

[Answer]: 利用不可にする。人間の原文：1

## Ambiguity Analysis

Q1以外の製品判断は承認済み要件・契約へ従う。Q1を確定してから終了失敗の要件を具体化する。回答は現行functional-spec.mdや承認済みC1/C8を既に改訂したことを意味しない。必要な設計整合と差分は後続に明示する。
