**Collaborator:** aidlc-developer-agent

## Contribution

独立レビュー。lead初稿4文書、CodeKB code-structure/architecture/component-inventory、package.json、および以下のruntime検索だけを参照した。兄弟のcontributionは読んでいない。実行テスト・build・formatter導入は行っていない（未検証）。space-level shared/developer knowledgeにはMarkdownなし。harness側のshared/developer knowledgeを読み取った。

### Naming / File Organization

- 検証済み（ソース観測）：package.jsonはtype:module。runtime/guest-io.mjs:15,27,40,206、session.mjs:36,136は定数UPPER_SNAKE_CASE、クラスPascalCase、関数camelCase。file名guest-io.mjsはkebab-case。複数の関連exportを同一moduleに置き、tests/nodeとtests/browserに分ける構成はCodeKB code-structureのディレクトリ表にも記録されている。
- 提案（推測・未検証）：新規コードはESM/.mjs、2スペース、single quotes、semicolon、既存camelCase/定数/クラス命名を踏襲する。ファイルは責務ごとに分け、共通runtimeとNode/browser固有adapterの現行境界を維持する。既存規模を任意の行数制限や「1 export / 1 file」に合わせる改名・再配置はしない。今回のJS APIと型の公開面だけを明示し、全既存内部exportを公開仕様へ昇格させない。

### Layer Boundaries

- 検証済み（検索exit0）：rg -n 'import|export' runtime/core.mjs runtime/guest-io.mjs runtime/session.mjs runtime/node/host.mjs。guest-io/sessionにはimport行なし、host:8–11にNode builtin、13にcoreを観測。rg -n 'import|waitAsync|catch|postMessage|error' runtime/web/worker.mjsは4–7に共通module、13にdelete Atomics.waitAsyncを出力した。
- ドキュメント根拠：CodeKB architecture:124–126とcomponent-inventoryのregistry節はregistryをデモ/受入れのguest/env/session所有者と記述する。npm製品APIへregistryを必須依存させる判断はまだない。ゲスト/fixtureをterrarium側ref別配布にする既存意図と両立する設計を後続工程で具体化する。core固有知識をcore.mjsに閉じる指示は再質問しない。

### Error Handling

- 検証済み（ソース観測）：guest-io:40–60,220–228は入口のTypeError、27–33はcause/stdout/stderrを保持するGuestRunError、248はexitCodeを結果として返し、253–259は起動/実行失敗をrejectする。session:110–114は行番号付きErrorにcauseを保持。web/worker:103–106は境界catchからerrorメッセージを送る。実際のエラー伝播結果は未検証。
- 提案（推測・未検証）：既存の「入力不正は例外、通常のguest終了はexitCode、host/core失敗は原因付き例外」の区別を保つ。既存APIをResult型へ一括変更しない。Workerを越えるerrorの型/識別子/causeの扱い、公開型定義、snapshot結果は後続契約設計の論点であり、本工程で人間に実装detailを選ばせる必要はない。

### Interview Boundary

- linter/formatterの製品名と内部設定は通常の技術選択として、まず既存スタイルを保つ最小設定を担当者が提案して工程承認へ含められる。ブランド選定だけの質問は不要。新規変更のみへ適用し、全体整形を混ぜない範囲は人間が既に指定済み。現時点で導入済み・実行済みと書かない。
- 人間の意図が残る質問は公開後の統合/レビュー運用、最小一連動作を先に確かめる進め方、テストを書く順序、外部公開を開始する契機。80% coverage測定ツール・対象やWorker契約の細部は既存制約を維持しつつ担当者が設計できる。hard constraintとして新しい規約を追加するなら工程承認の対象にする。
- 初稿で未確定が5分野に整理され、既存指示を再質問しない方針には同意する。source観測と将来チーム規約を区別したまま統合してほしい。

### Verification Limits

最初のruntime検索で存在しないruntime/web/run-worker.mjsを指定しexit1となった。正しいruntime/web/worker.mjsを指定して再検索しexit0を確認した。今回の根拠は検索出力と文書読み取りであり、動作成功・lint成功・npm tarball受入れは主張しない。

## Positions

- AGREE: ESMと共通runtime/Node/browser境界を踏襲する — 現行のimport/export検索とCodeKBの責務表が裏付ける。
- AGREE: core.mjsとdelete Atomics.waitAsyncを維持する — 人間の既存指示であり、worker:13にも該当行が存在する。
- AGREE: 既存指示だけをMandated/Forbiddenへ抽出する — 観測したスタイルを未承認の硬い規約へ変えない。
- OBJECT: linter/formatter製品名を必須の人間への選択にする — 通常の技術選択として最小設定を提案でき、適用範囲と全体整形禁止は既に指定されている。
