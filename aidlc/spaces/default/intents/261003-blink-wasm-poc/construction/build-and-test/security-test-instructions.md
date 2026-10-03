# セキュリティ確認の手順

## 位置づけ

この PoC にはセキュリティの NFR はなく、テスト戦略は Minimal のため、ステージの規定ではセキュリティテスト用の手順書を別に作る必要はない。ただし、外部のコードとビルド物を取り込む構成なので、セキュリティ担当の観点から最低限の確認項目を記す（`construction/code-generation/code-summary.md`）。

## 確認項目

| 項目 | 確認方法 | 理由 |
|---|---|---|
| blink の取得元 | `blink.lock` の `url` が `https://github.com/aletheia-works/blink.git`、`upstream_url` が `https://github.com/jart/blink.git` であること | 背景資料にある、マルウェアが混入した fork（webix・portabox・lanmower/blink）を取り込まないため |
| 取得したコミットの一致 | `node --test tests/node/build.test.mjs`（コミットの不一致はエラーになる） | 取得物のすり替えを防ぐため |
| npm の依存の脆弱性 | `npm audit --omit=dev` と `npm audit` | Playwright（開発用）だけが依存 |
| 秘密情報の混入 | `git grep -nE "(ghp_\|github_pat_\|AKIA[0-9A-Z]{16})"` が何も返さないこと | トークンをリポジトリに入れないため |
| ゲストのネットワーク | wasm 版の `socket()` が `EAFNOSUPPORT` を返すこと（fork のコミット `50bc466`、`docs/results/failures.md` の F-5） | ブラウザ内のゲストに外部通信をさせないため |
| 開発用サーバーの公開範囲 | `scripts/serve.mjs` が既定で `127.0.0.1` だけで待ち受けること | ローカルの開発用に限るため |

## 実行方法

```bash
node --test tests/node/build.test.mjs
npm audit
git grep -nE "(ghp_|github_pat_|AKIA[0-9A-Z]{16})" -- . ':!aidlc'
```
