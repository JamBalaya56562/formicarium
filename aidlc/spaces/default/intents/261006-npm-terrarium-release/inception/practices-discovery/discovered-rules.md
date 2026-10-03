# Discovered Rules

## Mandated

- ALWAYS リポジトリ操作には jj を使い、PowerShell の @ はクォートする。（人間の指示：AGENTS.md）
- ALWAYS mise 管理ツールは版番号を固定せず実体を解決し、宣言された task は mise run で実行する。（人間の指示）
- ALWAYS 正しさの主張にコマンド出力・テスト名・具体的なログを添え、検証済み／ドキュメント根拠／推測を区別する。実行できていないものには未検証と書く。（人間の指示）
- ALWAYS ビルドとテストは main session で一つずつ実行し、性能測定は重い並行負荷のない状態で行う。（人間の指示）
- ALWAYS probe 600秒、aube ブラウザ840秒、1worker、retryなし、8項目合格、native 出力一致、wasm 1GB とブラウザ Worker の delete Atomics.waitAsync を維持する。（人間の指示）
- ALWAYS コア固有の知識は runtime/core.mjs に限定する。（人間の指示・ADR 0003）
- ALWAYS 変更の範囲を指摘された範囲に限定する。（人間の指示）
- ALWAYS レビューへの返信は5行以内とし、反論は投稿前に人間の確認を得る。（人間の指示）
- ALWAYS fork を編集する前に jj new を行い、パッチの写しを patches/ に残す。（人間の指示）

## Forbidden

- NEVER git/sl/mise exec または mise shim をリポジトリ作業・直接ツール実行の代わりに使用する。（人間の指示）
- NEVER ゲストのソースが変わっていない aube を Build and Test のために再ビルドする。（既存承認済み project.md Corrections）
- NEVER 品質基準やタイムアウトを緩めて検証を通過させる。（人間の指示）
- NEVER C fork の JIT 作業を、人間が再開を指示していない状態で提案する。（人間の指示・ADR 0002）
- NEVER 公開リポジトリ作成・push・publish を現時点で実施する。公開対象確認と必要な人間の承認前に外部公開しない。（人間の既存指示。公開予定そのものの禁止ではない）
- NEVER 指摘外の改善や全体整形を同じ修正へ追加する。（人間の指示）
- NEVER PowerShell の実行ポリシーを変更してスクリプトを実行する。（人間の指示）

## 根拠と範囲

上記は既存の人間の指示だけを抽出した。質問 Q1–Q4 の回答は team-practices.md の実践へ統合した。80% coverage は org の追加条件、計測・lint/format・security/supply-chain の具体案は技術提案として区別し、新しい人間の硬い制約へ無断昇格していない。
