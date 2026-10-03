# 性能計測の手順

Minimal 戦略でも作っています（project.md の Corrections：性能の計測は記録しておく価値があるため）。この PoC の要件には性能の数値目標はありません。計測は合否ではなく、`docs/terrarium-integration.md` の 5 節（置き換えの判断材料）と、テストの時間の上限の根拠に使います。

## 枠組みと設定

- 計測はテストの記録から取る。新しい計測用のスクリプトは作っていない
  - Node.js：`tests/node/pitchfork-basic.test.mjs` が `t.diagnostic` に `elapsedMs`（手順全体）と `stepMs`（コマンドごと。コアの起動を含む）を出す
  - ブラウザ：`tests/browser/pitchfork-basic.spec.mjs` が注釈 `elapsed` に、コマンドごとの `elapsedMs` を出す
- このノート PC は、同じ計算でも速さが最大 2.4 倍揺れる（AGENTS.md）。ほかに重い処理を動かさない状態で測り、比較は目安にとどめる

## 実行のコマンド

| # | 対象 | コマンド | 記録するもの |
|---|---|---|---|
| P1 | Node.js | `node --test tests/node/pitchfork-basic.test.mjs` を 3 回 | 各回の `elapsedMs` と `stepMs` |
| P2 | ブラウザ | `node node_modules/@playwright/test/cli.js test tests/browser/pitchfork-basic.spec.mjs --repeat-each=3 --reporter=list` | ブラウザごとの 3 回のテスト時間 |
| P3 | サイズ | `ls -l dist/blink/ dist/guests/pitchfork dist/guests/aube` | コアとゲストのバイト数 |

## 目標と使い方

| 項目 | 値の決め方 | 記録先 |
|---|---|---|
| テストの時間の上限（Node.js） | P1 の最大値 × 3 を 60 秒単位で切り上げる（requirements.md の NFR2、計画の Step 11） | `tests/shared/pitchfork-basic.mjs` の `NODE_TIMEOUT_MS` |
| テストの時間の上限（ブラウザ） | P2 の最大値 × 3 を 60 秒単位で切り上げる（計画の Step 12） | 同 `BROWSER_TIMEOUT_MS` |
| 置き換えの判断材料 | P1〜P3 の実測値 | `docs/terrarium-integration.md` の 5 節 |

上限は実測の 3 倍の余裕なので、P1・P2 の最大値が上限の 3 分の 1 を超えたら、上限を見直す合図とします（テストが上限で落ちるより先に気づくため）。上限を緩めて合格させることはしません。
