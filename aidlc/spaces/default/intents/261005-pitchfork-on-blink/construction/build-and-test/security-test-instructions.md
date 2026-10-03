# 安全性の確認の手順

Minimal 戦略でも作っています（project.md の Corrections：取得元の安全確認は記録しておく価値があるため）。要件 NFR3 に対応します。認証やサーバーはない PoC なので、攻撃面は「取得するソース」「ブラウザの入口（URL パラメータ）」「手順ファイルの解釈」「ゲストのネットワーク」の 4 つです。

## 脅威と確認（STRIDE で整理）

| # | 攻撃面 | 脅威 | 対策 | 確認のしかた |
|---|---|---|---|---|
| S1 | 取得するソース | 改ざん（T）：マルウェア入りの fork や別の取得元から取得する | 公式の `https://github.com/jdx/pitchfork.git` のタグ `v2.29.0` を既定にし、`PITCHFORK_REPO` は https だけを受け付ける。キャッシュのクローンは origin の URL が一致するときだけ再利用する。取得したコミットを記録する | `cat dist/guests/pitchfork.commit` を、GitHub の v2.29.0 のタグのコミットと照合する。`grep -n "PITCHFORK_REPO\|remote get-url" scripts/build-guests.sh` |
| S2 | 取得するソース | 改ざん（T）：web UI の依存が変わる | `aube install --frozen-lockfile`（`pnpm-lock.yaml` に固定） | ビルドのログで frozen install が通っていること |
| S3 | パッチ | 改ざん（T）：ソースへの変更が 1 行を超える | `patches/pitchfork-2.29.0-musl-ioctl.patch` は 1 行だけの変更 | `grep -c "^[-+][^-+]" patches/pitchfork-2.29.0-musl-ioctl.patch` が 2（削除 1、追加 1） |
| S4 | ブラウザの入口 | 権限の昇格（E）・情報漏えい（I）：任意のゲストや手順、任意のパスを読み込ませる | `parseRunRequest` が名前の正規表現と許可リストで検証する | `node --test tests/node/runner.test.mjs`（`guest=sh`、`session=../x`、`session=pitchfork-other`、`session=constructor` を拒否） |
| S5 | 手順ファイル | 改ざん（T）：プロジェクトの外を消す・読む、シェルの機能を使わせる | `rm -rf` と `cat` は `..` と絶対パスを拒否。`cat` は `persist` の外・symlink・ディレクトリを拒否。引用符の外のメタ文字を拒否 | `node --test tests/node/session.test.mjs` |
| S6 | 表の読み出し | 改ざん（T）：`session-info` の出力でシェルに任意のコマンドを渡す | 値を `'...'` で囲み `'` をエスケープする。名前・パス・環境変数の値を検証する | `node --test tests/node/runner.test.mjs`（未知の名前は終了コード 0 以外） |
| S7 | ゲストのネットワーク | 情報漏えい（I）：ゲストが外部と通信する | ブラウザ版のゲストは `socket()` が `EAFNOSUPPORT`（ADR 0007）。基準値の作成と書き込み先の調査は `--network none` | `grep -n "network none" scripts/native-baseline.sh scripts/pitchfork-probe-paths.sh` |
| S8 | 秘密情報 | 情報漏えい（I）：資格情報をコミットする | 秘密情報を扱う処理はない | `grep -rniE "(api[_-]?key\|secret\|token\|password)\s*[:=]" runtime scripts tests --include=*.mjs --include=*.sh` が 0 件 |

## 実行のコマンド

上の「確認のしかた」の列を順に実行します。`tests/node/` の 2 つは単体テストと同じコマンドなので、Build and Test では 1 回だけ実行し、結果を共有します。

## 合格の基準

- S1：記録したコミットが、公式の v2.29.0 のタグのコミットと一致する
- S3：変更行が削除 1・追加 1
- S4〜S6：テストの不合格 0 件
- S7：基準値と書き込み先の調査の両方のスクリプトに `--network none` がある
- S8：該当 0 件

## 対象外

- SAST・依存の脆弱性スキャン（`cargo audit` など）は今回は行わない。PoC で配布もしないため。将来の課題として `test-results.md` に残す
