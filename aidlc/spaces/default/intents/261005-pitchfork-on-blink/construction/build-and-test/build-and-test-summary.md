# Build and Test のまとめ

入力：`construction/code-generation/code-generation-plan.md`（Testing Contract を含む）、`construction/code-generation/unit-test-instructions.md`、`construction/code-generation/code-summary.md`。

## ビルドの状態と前提

- ビルド：成功。pitchfork は Code Generation でビルドしたものを使った。aube・probe 系・コアは、ソースが変わっていないので再ビルドしていない（`build-instructions.md`、`test-results.md`）
- 前提：mise の node 24、Playwright、コンテナ（今回は wslc が `E_FAIL` のため Docker）

## 作成したテストの種類

| ファイル | 内容 |
|---|---|
| `build-instructions.md` | 依存・環境・ビルドのコマンド・確認・よくある問題 |
| `integration-test-instructions.md` | Node.js と 3 ブラウザでの照合、既存スイート、基準値の再現性（I1〜I5） |
| `performance-test-instructions.md` | 実行時間とサイズの計測、時間の上限の決め方（P1〜P3） |
| `security-test-instructions.md` | 取得元・入口・手順の解釈・ネットワーク・秘密情報の確認（S1〜S8） |

Test Strategy は Minimal です。結合・性能・安全性の手順書は、project.md の Corrections に従って作りました。

## カバレッジの見込み

- Units Generation がない stage-level の作業。単体テストは要件ごとに 1 件以上（`unit-test-instructions.md` の 11 件）
- 行カバレッジの数値目標はない（poc）

## Target Verification Matrix

`nfr-requirements/` と `nfr-design/` は poc の範囲外のためありません。測れる目標は、Testing Contract と、requirements.md の NFR から取りました。

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-STRATEGY-1 | `code-generation-plan.md` > Testing Contract > obligations.strategy_volume[0] | 要件ごとに 1 件以上の検証できるテスト | FR1〜FR8・NFR1〜NFR3 のうち、条件が発生しなかった FR7 系を除くすべてにテストか確認手順がある | `cross-unit-traceability.md`、`unit-test-instructions.md` のテスト一覧 | build-and-test | Met |
| TC-STRATEGY-2 | 同 obligations.strategy_volume[1] | 各コンポーネントに正常系の単体テスト 1 件以上 | session（U1）、guest-io の cat（U1）、registry と sessions（I3 の runner）、build-guests の判定（I3 の build）、pitchfork-basic（U2） | `test-results.md` | build-and-test | Met |
| TC-SCOPE-1 | 同 obligations.scope_floor[0] | 既存のテストが合格のまま | Node.js 50/50（変更前の 41 件を含む）、ブラウザ 36/36（変更前の 33 件を含む） | `test-results.md` の I3、U3・I2・I4 | build-and-test | Met |
| NFR1 | `requirements.md` > NFR1 | 既存の aube のテストが合格（Node.js 41、ブラウザ 33） | 合格（I3 の aube-1645、ブラウザの aube-1645 × 3） | `test-results.md` | build-and-test | Met |
| NFR2 | `requirements.md` > NFR2 | 既存の上限を変えない。新しい上限は実測にもとづき根拠を記録 | 既存の上限は変更なし。新しい上限は Node.js 120 秒・ブラウザ 600 秒（実測の最大 × 3 を切り上げ） | `tests/shared/pitchfork-basic.mjs`、`code-summary.md` | build-and-test | Met |
| NFR3 | `requirements.md` > NFR3 | ネットワークなし、許可リストでの検証、`..` の拒否、公式タグからの取得 | S1〜S8 すべて合格 | `test-results.md` の安全性の確認 | build-and-test | Met |

## 準備の状況

- ビルド：準備完了
- テスト：準備完了。すべてのコマンドが合格し、該当する目標はすべて Met
- デプロイ：対象外（poc。Operation フェーズは範囲外）

## 既知の制約と残る事項

- 網羅の確認で、FR7・FR7.1・FR7.2 が `N/A`（`cross-unit-traceability.md`）。native との不一致が起きなかったため、修正も記録も発生していない。承認の場で判断していただく事項
- pitchfork のソースに 1 行のパッチを当てている（人間の判断。`patches/pitchfork-2.29.0-musl-ioctl.patch`）
- コード生成のレビューの軽微な指摘 3 件は受け入れ済みで、未対応
  - `runtime/registry.mjs` の古いコメント
  - `pitchfork.commit` にパッチの記録がない
  - UI のビルドが node のバージョンを固定していない
- terrarium のツールごとの wasm のサイズと実行時間は測っていない
- SAST・依存の脆弱性スキャンは行っていない
