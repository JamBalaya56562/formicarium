# Delivery Planning Questions

## Recorded Context

回答方法は前工程のGuide meを引き継ぐ。practices-discovery-questions.md Q2の「最小版を先に確認」と、承認済みunit-of-work-dependency.mdの最初のU1を維持する。Construction Iterationはunit-major、Executionはserial。既回答の公開手順・品質条件・terrarium対象・Safari扱いを再質問しない。

Boltは、一部分の設計と実装を進め、動く成果物で締めくくる作業のまとまり。以下は未決定の計画判断であり、提案を人間の回答として扱わない。検証コマンドの選定は後で実際のコマンドを示して別途確認する。

## Q1 — Work Grouping and Sequence

最初にnpmからNodeとブラウザWorkerを動かす方針を維持し、1単位ずつ、共通npmランタイム→guest/ref配布→terrarium接続→公開・品質証拠の順で進めますか？ 小さな区切りで不具合を確認できるため、この順序を推奨する。数値による優先順位付けは追加せず、最小統合版を先に確認し、残る依存関係を順に満たす。

A. 4つの単位を1つずつ順に進める（推奨）
B. 複数単位をまとめる計画へ変更する（範囲を相談）
X. Other (please specify)

[Answer]: 4単位を1つずつ順に進める（推奨）

## Q2 — Construction Staffing

設計・実装はこの会話を中心に進めますか？ 別チームによる単位別の作業・承認も選択できる。ビルドとテストは既存指示どおりmain sessionで逐次実行する。

A. この会話で進める（推奨）
B. 複数のチームで単位別に担当する（チームを指定）
X. Other (please specify)

[Answer]: この会話で進める（推奨）

## Q3 — Additional Dependencies and Concerns

既知の公開先・npm Trusted Publishing設定と公開操作の承認、terrariumへの書込み権限以外に、待つ必要がある外部作業・期限、または先に確認したい懸念はありますか？ 追加がある場合は対象・担当者・期限・止まる作業を記録する。既知項目の権限や完了は未検証であり、予定日数を推測しない。

A. 追加なし、既知の項目を計画へ記録する
B. 追加の依存・期限・懸念を伝える
X. Other (please specify)

[Answer]: 追加なし、既知の項目を計画へ記録する（推奨）

## Q4 — Checkpoint Verification Command

package.jsonの既存test:build/test:runner/test:probe等はPoC用であり、新しいnpm tarballを空consumerへ導入してNode/browser Workerで実行するチェックポイント用の検証コマンドはまだ存在しない。新しい配布経路を検証するスクリプトをU1で作成した後、最初の完了確認で実際のコマンドを提示して選定する案を推奨する。これはコマンドの実行承認ではなく選定時期の判断であり、未選定の状態を保持する。

A. 検証スクリプトを作成後、最初の完了確認でコマンドを選ぶ（推奨）
B. 計画段階で検証コマンドを具体化してから進める
X. Other (please specify)

[Answer]: スクリプト作成後にコマンドを選ぶ（推奨）
