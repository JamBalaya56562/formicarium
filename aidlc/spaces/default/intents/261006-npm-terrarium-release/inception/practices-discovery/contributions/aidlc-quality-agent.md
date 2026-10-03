**Collaborator:** aidlc-quality-agent

## Contribution

### 調査範囲と証拠

相互に独立したレビューとして lead の4初稿、CodeKB の code-quality-assessment.md と architecture.md、package.json、memory/org.md・team.md・project.md、指定された知識、tests と playwright.config.mjs の限定検索を読んだ。兄弟の contribution は読んでいない。テスト・ビルド・coverage・npm pack は実行しておらず、成功・数値は未検証。

- 検証済み（設定観測）：Get-Content package.json は node:test と Playwright scripts を示す。coverage 用 script/dependency は記載されていない。
- ドキュメント根拠：code-quality-assessment.md の「テスト」「今回の品質所見」は既存テストがビルド物/native baseline を使う結合検証であること、過去の41/41・33/33は今回未実行であることを区別する。
- 検証済み（ソース観測）：rg の結果で tests/browser/probe.spec.mjs:78 に全 probe PASS 判定、aube-1645.spec.mjs:18 に native一致のテスト名、同:20 に14分の待機、playwright.config.mjs:15 に workers:1 を確認。これらはテストの存在・設定の証拠であり合格証拠ではない。
- ドキュメント根拠：org.md:53–79 は methodology と ordering を独立して確認し、classic の80%行coverage・統合前CIを追加条件としている。team.md はコメントのみで、実践としての cadence は未確定。

### Testing Posture に統合する提案

人間に確認することは「通常の新規実装でテストを先に書くか、各層の実装後に書くか」。test-after は提案値として示し、確定回答後に Methodology と Ordering を別々の明示フィールドへ記録する。通常 test-after でも、不具合の修正では再現する回帰テストを先に作って失敗を観測し、修正後に同じテストを通す。既存の品質上限・逐次実行・再ビルド回避は再質問しない。

80% floor を維持すること、テストを統合前CIで実行することは既定の追加条件であり、採用するかを再質問しない。測定対象とツール選択は技術提案を具体化して承認文書へ載せることで解決できる。ユーザーにコマンドを選ばせる必要はない。

提案（実装・動作は未検証）：第一者が保守する配布JS全体、すなわち共通処理・公開API・Node adapter・browser Worker adapter のソース一覧を事前に固定し、未実行ファイルも分母に含む行coverageを80%以上にする。既存の第一者 runtime を「変更していない」だけで外さない。tests、生成blink JS/wasm、第三者/vendor、ゲストELF、.d.ts、デモページや開発専用scriptsは対象外と明示し、別の資産・型・回帰検証で担保する。最終的な配布対象は設計で確定し、coverage除外を変更して通過させない。Worker別プロセス／ブラウザ別realmの計測結果を取得・マージして対象ファイルの欠落を検出する必要がある。取得できないときは0%/未測定としてfailまたは未検証を報告し、勝手に分母から外さない。

node:test と Playwright は維持する。coverage reporter／計測方式の名前は今ここで追加決定せず、実装段階に main が最小の計測を実行して、未importファイル・Worker内実行・browser内実行の扱いを観測して選ぶ。単一のNodeレポートでbrowser Workerまで計測済みと扱わない。行数・実行行数・対象一覧・除外理由・レポート・実行コマンドをCI成果物として残す。ブランチcoverageは補助診断とし、人間の未承認の新しい数値基準は追加しない。

### 具体的な品質ゲート候補

Standard の量の目安は上限ではなく、要件に対応する小さい純粋JSテストを増やし、Worker/wasm の結合テストは境界に絞る。既存probe8項目、native一致、600秒/840秒、1worker/retryなし、1GB、Atomics.waitAsync削除は維持し、変更前baselineと変更後regressionをmainで逐次実行する。重いゲストの変更がなければ既存buildを利用する。

npm配布の受入れ候補（推測・未検証）：リポジトリ内の相対importでなく作成したtarballを空のconsumerへ導入して、Node import・browser Workerの資産URL・wasm読込み・公開型のコンパイル・LICENSE/notices/build-info同梱を検証する。必要なゲスト/fixtureはterrarium側のrefを使用する。timeout/terminate/dispose、bytes/text、ファイル状態の引継ぎ等は契約が設計で確定してから正常系・失敗系・境界を検証する。terrarium の受入れ成功はローカルpack smokeと区別してRC→stableの証拠にする。

### 未確定事項の扱い

人間の選択：通常の新規実装のテスト作成順序。必要に応じて最小tarball→Node/browser接続確認を最初に行う姿勢はleadのWalking Skeleton質問に統合する。

技術側で具体化する事項：coverage対象manifest、計測とWorker/browserの収集方式、CIコマンド、資産/型/packテスト。今回これらは未整備・未検証であり、CIやcoverageが既に機能するという記述へ変更しない。実装後の検証まで未検証表示を維持する。

## Positions

- AGREE: 既存の上限とmainによる逐次実行を維持する — 人間の明示制約と既存の回帰判定を保持する。
- AGREE: methodology/ordering を人間に確認する — 既存テストの存在からTDD/test-afterのチーム意図は確定できない。
- AGREE: 過去の成功と今回の未検証を区別する — ソース・設定観測は実行成功の代用にならない。
- OBJECT: 「80%を測る対象とツール」をそのまま人間の技術選択質問にする — floorは固定のまま、配布JS全体とWorker/browser収集の具体的提案を技術側で作り承認文書に示すべき。
- OBJECT: coverageの母集団と未実行ファイル/Worker/browserの扱いが初稿では未定義 — 80%の達成を再現可能に判断できる対象一覧と収集/欠落判定が必要。
