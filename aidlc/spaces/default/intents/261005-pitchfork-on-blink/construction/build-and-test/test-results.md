# テスト結果（2026-10-06、Build and Test で実行）

## ビルド

| 対象 | 状態 | 根拠 |
|---|---|---|
| pitchfork | 成功（Code Generation で 2026-10-06 にビルドした `dist/guests/pitchfork` をそのまま使用。ソースとビルド手順はその後変わっていないので再ビルドしていない） | ビルドのログ `Finished release profile [optimized] target(s) in 35m 38s`、`node --test tests/node/build.test.mjs` 合格（下の I3 に含む） |
| aube・probe 系・コア | 再ビルドなし（ソースに変更なし。project.md の Corrections） | `dist/guests/aube`、`dist/blink/` は既存のまま |
| 基準値 | 成功 | `bash scripts/native-baseline.sh pitchfork-basic --check-reproducible` → `== 2 回の実行で書き起こしが一致しました`（Docker、ネットワークなし） |

基準値の実行では、後ろに付けた `| head -2` が途中でパイプを閉じたため、シェルの表示は `exit=141`（SIGPIPE）でした。スクリプトは 2 回の一致を表示してから基準値を書いており、その基準値に対して下のテストが合格しています。

## テスト

単体テストの手順の各コマンドは 1 回ずつ実行しました。I3 は `build.test.mjs` と `runner.test.mjs` を含むので、それらは別に実行していません。

| # | コマンド | 合計 | 合格 | 不合格 | スキップ | 時間 |
|---|---|---|---|---|---|---|
| U1 | `node --test tests/node/session.test.mjs` | 8 | 8 | 0 | 0 | 0.7 秒 |
| U2・I1 | `node --test tests/node/pitchfork-basic.test.mjs` | 3 | 3 | 0 | 0 | 12.7 秒（`elapsedMs=12059`） |
| I3 | `node --test tests/node/build.test.mjs tests/node/runner.test.mjs tests/node/probe.test.mjs tests/node/aube-1645.test.mjs tests/node/measure.test.mjs` | 50 | 50 | 0 | 0 | 30.0 秒 |
| U3・I2・I4 | `playwright test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs tests/browser/pitchfork-basic.spec.mjs` | 36 | 36 | 0 | 0 | 3.9 分 |

ブラウザの 36 件の内訳は、既存の probe と aube が 33 件、pitchfork-basic が Chromium・Firefox・WebKit の各 1 件です。pitchfork-basic の時間は、Chromium 11.1 秒、Firefox 11.4 秒、WebKit 20.0 秒でした。

## 不合格の詳細

なし。

## 安全性の確認（`security-test-instructions.md`）

| # | 結果 | 根拠 |
|---|---|---|
| S1 | 合格 | `dist/guests/pitchfork.commit` = `cfdea79f1d52b8449c0b99b29a03d9e771cd8ec3`。GitHub API の `repos/jdx/pitchfork/commits/v2.29.0` の sha と一致。既定の取得元は `https://github.com/jdx/pitchfork.git`（`scripts/build-guests.sh:31`）、https 以外は拒否（同 :38）、キャッシュは origin の URL を照合（同 :90） |
| S2 | 合格 | `aube install --frozen-lockfile`（同 :97）。Code Generation のビルドで通過 |
| S3 | 合格 | パッチの変更行は 2（削除 1・追加 1） |
| S4〜S6 | 合格 | I3（`runner.test.mjs`）と U1（`session.test.mjs`）が合格 |
| S7 | 合格 | `scripts/native-baseline.sh:99` と `scripts/pitchfork-probe-paths.sh:80` に `--network none` |
| S8 | 合格 | 秘密情報らしい代入の検索結果 0 件 |

## カバレッジ

行カバレッジは測っていません（poc の範囲ではテストの追加に関する下限がなく、数値目標を置いていないため）。要件ごとの網羅は `cross-unit-traceability.md` にあります。

## 性能（`performance-test-instructions.md`）

- P1・P2 は Code Generation で 3 回ずつ測定済み。値は `docs/terrarium-integration.md` の 5 節、上限の根拠は `tests/shared/pitchfork-basic.mjs`
  - Node.js：最大 32.7 秒 → 上限 120 秒
  - ブラウザ：最大 3.1 分 → 上限 600 秒
- 今回の実行は Node.js 12.1 秒、ブラウザ最大 20.0 秒で、どちらも上限の 3 分の 1 未満。上限を見直す必要はない
- P3：コア 455,584＋132,512 バイト、pitchfork 40,223,816 バイト、aube 31,471,776 バイト

## 今回行わなかったこと

- SAST・依存の脆弱性スキャン（`cargo audit` など）は行っていない。PoC で配布しないため（`security-test-instructions.md` の対象外）
