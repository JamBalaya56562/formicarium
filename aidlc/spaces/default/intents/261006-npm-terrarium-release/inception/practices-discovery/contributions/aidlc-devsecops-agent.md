**Collaborator:** aidlc-devsecops-agent

## Contribution

### 読み取った範囲と証拠

Practices Discovery Step 3 の独立レビュー。lead の4初稿、CodeKB の dependencies.md / technology-stack.md / code-quality-assessment.md、package.json、blink.lock、docs/licenses.md、active-space の team/project の本文と org の Testing Posture / Deployment / Code Style、提供された AGENTS.md 指示を確認した。兄弟の寄稿は読んでいない。ビルド・テスト・脆弱性照会・公開操作は行っていない。

- 検証済み（設定の読み取り）：Get-Content package.json の出力では scripts は既存 Node/Playwright テストと serve のみ、devDependencies は @playwright/test ^1.55.0 のみ。lint/format/security-scan/publish のコマンドは定義されていない。runtime dependencies は未定義。
- 検証済み（設定の読み取り）：Get-Content blink.lock の出力は fork URL、formicarium-wasm branch、commit=4b5c67d518b0504e13ccde7ba7823f9b6e467c4c、upstream_commit=f006a4fc6f9b8de9272504fdff0dbbe5ce5dc580 を記録している。
- ドキュメント根拠：CodeKB code-quality-assessment.md「今回の品質所見」は公開 CI と pack 受入れ未整備を記録する。dependencies.md は npm lockfile、blink の取得元/commit 照合、タグのみのコンテナ取得を記録する。スキャンを実行した証拠ではない。
- ドキュメント根拠：docs/licenses.md「配布するときにすること」は blink ISC と Emscripten/musl 表示の同梱を求める。CodeKB は build-blink-wasm.sh:132–149 に表示生成・コピー工程がないと記録する。今回は法律判断や upstream ライセンス本文の再調査を行っていない。
- 検証済み（読み取り）：memory/team.md の Deployment / Code Style はコメントだけで、affirmed なセキュリティゲート方針はない。org の Deployment は本番公開の別承認を述べる。新しい npm 配布では既存 intent の RC→terrarium受入れ→stable と外部公開の承認条件を具体化する。

### 初稿へ統合する内容

| 分野 | 現行の事実 | 提案する扱い |
|---|---|---|
| lint / format | package scripts に導入済みの証拠なし。CodeKB も設定なしを記録 | 新しい公開 JS API・型と変更対象に絞って設定する。製品名や細かなルールは agent が既存 ESM と互換性を調べて選び、設定・check コマンド・対象をレビュー可能にする。全体整形を混ぜない。推測・未検証の設計候補 |
| SAST | 実行ログや CI 定義の証拠なし | 公開 API/Worker/ファイル入力の変更を対象とした静的チェックを後続 CI 設計へ接続する。lint の成功をセキュリティ検証全体の成功とは記載しない。採用製品と具体コマンドは技術判断で確定する |
| DAST | 今回はパッケージ配布で、staging サービスの運用は観測されていない | 常時稼働サービス用の汎用スキャン基盤を新設しない。ブラウザ受入れで Worker の入力境界・ファイルパス・隔離ヘッダ等、変更した境界を検証する候補とする。既存の Playwright 成功は DAST 成功証拠ではない |
| secrets | スキャナを実行した証拠なし | 公開候補の source/pack 内容に対する機密検出と、検出時に公開を止める処理を CI 設計へ含める候補。機密値をログや成果物へ残さない。現在の「秘密なし」は未検証 |
| dependencies / supply chain | JS runtime dependency 未定義でも npm devDeps、C fork、Emscripten/musl とビルドイメージの依存がある | JS lockfile と blink.lock を維持し、公開 wasm/loader の build-info・dirty=false・取得元/commit と notices を pack 受入れで照合する。devDependencies だけを照会して wasm 側の安全確認を完了扱いにしない |
| Trusted Publishing | intent で採用済み。現行 CI 実装や npm 権限設定は未検証 | 採用するかを再質問しない。公開 workflow と信頼先の対応、公開 job に限る必要な権限、未信頼変更からの公開阻止を後続 CI/Deployment 設計で具体化する。npm/GitHub の実際の利用条件は実装時に公式情報で確認し、設定を検証する |

これらは公開対象に必要な技術的設計候補であり、現時点で導入済みとも、人間の硬い ALWAYS/NEVER 制約とも認定しない。クラウド基盤、IaC スキャン、サーバー認証、ネットワーク機能など今回の対象外へ拡張しない。タグのみの既存コンテナ取得は記録上の再現性課題であり、全ゲストの再ビルドや一括更新を追加しない。公開コアのビルドに必要な取得元固定の改善は、その設計範囲で検討する。

### 人間に残る判断と通常の技術判断

- 人間に残る判断：どの契機・誰の最終確認で RC/stable の公開を実行するか、不具合で新しい配布を止めて既知の版へ誘導する運用。既存の外部公開承認を省略する提案にしない。スキャン所見を未解決のまま出す必要が生じた場合は、実際の所見と限定した影響を示して判断を求める。仮想のリスク免除を今の質問に増やさない。
- 通常の技術判断：linter/formatter とスキャナの選定、対象ファイル、check コマンド、pack allowlist、workflow の権限と入力制限。agent が具体案を作成して既存の工程承認へ出す。ツール名の選択だけを独立した必須質問にしない。
- 再質問しない事項：jj、mise 実体、main session の逐次検証、品質上限、aube 再ビルド回避、C fork JIT 除外、guest/fixture は terrarium、RC→受入れ→stable、Trusted Publishing。discovered-rules.md に既存の人間の指示だけを載せる初稿の方針を維持する。

### 未検証のもの

脆弱性や機密の有無、SAST/DAST/依存スキャンの成功、CI 上の Trusted Publishing と公開権限、npm tarball の allowlist・notices・build-info の一致、実際の npm/terrarium 動作は未検証。後続段階で main session が具体的コマンドと終了コード・ログを記録する。現在の読取結果は成功検証の代替にしない。

## Positions

- AGREE: 現行設定・既知の人間の制約・未確定候補を分ける初稿 — 設定観測から運用の実績や新しい硬い制約を作らず、証拠の強さを保っている。
- AGREE: RC→terrarium受入れ→stable と Trusted Publishing を再質問しない — 既存 intent に記録済みであり、後続工程は具体的な安全な公開経路を設計する。
- AGREE: 変更範囲を限定し全体整形とゲスト再ビルドを混ぜない — 公開 API 整備の範囲と既存品質基準を保つ。
- OBJECT: Code Style の linter/formatter 製品選定を人間への必須質問にする案 — ツール選定は通常の技術判断として具体案を作り、追加する運用方針だけを工程のレビュー対象にする。
- OBJECT: security scan と公開 supply-chain の扱いが初稿に明示されていない — 実施済みとは書かず、公開対象の機密・依存・build-info/notices と公開 job の信頼境界を後続 CI 設計の候補として明記する。
