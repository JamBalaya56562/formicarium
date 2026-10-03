# Practices Discovery Evidence

## Sources

| ID | 読み取った具体物 | 観測／利用した内容 |
|---|---|---|
| E1 | package.json 全体（Get-Content） | private:true、0.0.0、type:module、Node>=24、node:test/Playwright scripts、devDependency Playwrightのみ。lint/format/coverage/pack/publish scriptsなし。検証済み（設定観測） |
| E2 | mise.toml 全体（Get-Content） | Node24、Rust stable+musl、cmake4、ninja1。検証済み（設定観測） |
| E3 | main 実行 jj log -r 'ancestors(@, 6)' --no-graph と jj status、exit0 | @ uzznvkko f2fc1061、parent oyxnoqpm e4b1e675 blink-wasm-poc、d1007961 pitchfork Node/browser、8dca7d6d AGENTS、31cfe5f5 ADRs、1ac83107 NFR。status は aidlc 文書・記録のみ。検証済み（mainからの観測報告）。短い履歴だけでは今後の branching 方針は推定しない |
| E4 | memory/team.md、project.md、org.md（Get-Content、team存在確認） | team五節はコメントのみ。project の aube再ビルド回避、musl1行パッチ、コンテナ代替等の既存 corrections を保持。org の classic coverage80%/CI と未承認の手法既定値を区別 |
| E5 | active aidlc-state.md（Get-Content） | Brownfield/classic/Standard、npm RC→terrarium受入れ→stable、Trusted Publishing、公開対象確認、対象外を記録済み |
| E6 | AGENTS.md（user提供本文） | jj、mise実体、main検証、品質上限、変更範囲、外部公開確認等。人間の指示 |

## Reverse Engineering Inputs

6つすべてを今回読み取った。共通基点は aidlc/spaces/default/codekb/formicarium/。

- code-structure.md：ESM、runtime/共通部とNode/browser境界、命名、既存設定の不足を使った。
- technology-stack.md：Node24、Playwright、wasm/コンテナ、生成物の過去版と現在設定の区別を使った。
- dependencies.md：blink.lock、guest/fixture配布境界、第三者表示、digest未固定を使った。
- code-quality-assessment.md：既存結合テスト、coverage/CI/lint未整備、品質制約、旧Q1–Q3解消を使った。過去41/41・33/33は今回の成功とは扱わない。
- architecture.md：core記述子、共通guest-io、Worker、新インスタンスとsnapshotの境界を使った。npm tarballの動作は未検証。
- business-overview.md：PoCからnpmパッケージへの今回の対象、terrarium側ref配布、RC受入れを使った。

## Discovery Findings

検証済み（設定観測）：新しいlint/formatter/coverage設定の候補検索 rg --files -g '*eslint*' -g '*prettier*' -g '.editorconfig' -g '*yml' -g '*yaml' は一致なし、package scripts に該当コマンドなし。公開CI不在はCodeKBのroot inventoryを根拠にする（ドキュメント根拠）。実際のCIサービス設定やnpm権限は未検証。

既存の「formicariumにremoteを作らない」は過去のローカルPoC時の選択。今回の説明は公開対象確認後にpublic repoを作る意図を持つ。この初稿では外部操作せず、公開準備のレビュー時に対象を具体化する。既存の選択を無断で解除した扱いにはしない。

## Interview Decisions

practices-discovery-questions.md の5つの回答タグ（回答方法とQ1–Q4）を読んで統合した。既知の jj／mise／品質上限／aube／JIT／ゲスト配布先／RC→stable／Trusted Publishing は再質問していない。

| 分野 | 人間の回答／統合した方針 | 技術提案の位置づけ |
|---|---|---|
| Way of Working | Q1: まとめて統合。mainへ短命bookmarkの変更をレビュー後にまとめる | 現在のbookmark改名は未実施 |
| Walking Skeleton | Q2: 最小版を先に確認。tarball→Node/browser Worker を先に接続する | 最小版の成功は未検証 |
| Testing Posture | Q3: test-after。通常は層の実装後にテスト、不具合は再現失敗→修正→成功 | 80%/CIを維持し、配布JS全体・未実行ファイル・Worker/browser収集を技術側で具体化 |
| Deployment | Q4: 版タグから公開。対象版のユーザー承認後、RC next/stable latest、不具合時停止・既知版誘導 | workflow/権限/Trusted Publishingの設定は未検証 |
| Code Style | 質問なし。既存指示の新規／変更範囲・全体整形禁止を維持 | ブランド選択は技術側で最小設定を具体化、未導入 |

## Participants and Uncertainty

lead aidlc-pipeline-deploy-agent が3つの独立寄稿を読み、回答を統合した。寄稿は contributions/aidlc-quality-agent.md、aidlc-developer-agent.md、aidlc-devsecops-agent.md。

- quality の2 OBJECT：技術製品の選択を人間への必須質問から除外し、coverage の母集団を第一者配布JS全体（未変更runtime含む）へ定義した。未実行ファイルとWorker/browser収集・マージ・欠落検出を明記した。
- developer の OBJECT：linter/formatter ブランド質問を除外し、既存スタイルとエラー区分を保つ最小設定・限定適用を技術提案として統合した。
- devsecops の2 OBJECT：ブランド質問を除外し、公開候補の機密・依存・build-info/notices、公開jobの信頼境界・最小権限、静的チェックとブラウザ境界確認を未実施の提案として明記した。

寄稿の OBJECT は文書へ統合済みで、人間への追加判断待ちはない。具体的なcoverage方式・lint/format・スキャナ・workflow・資産／型検証の実装と成功は後続工程で観測する。build/test/coverage/npm pack/公開/terrarium受入れは今回実行しておらず未検証。推測から成功を確定しない。

main の最終commit観測：jj log -r '@' --no-graph -T commit_id、exit0、9937cb048556928fedc9301854422c9e4df3ea9e。これは統合時点の参照であり、配布成功の証拠ではない。
