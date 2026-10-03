# 意図ステートメント：pitchfork を formicarium で動かす PoC

## Problem Statement

terrarium はツールごとに wasm 向けのビルドを用意しています。これを formicarium（未改変の Linux バイナリをそのまま動かす方式）に置き換えられるかは、まだ実在の CLI で確かめていません。[Q1]

前の PoC で作った formicarium は、テスト用の probe でしか動作を確かめていません。実際の Rust 製 CLI でも動くかは、まだ分かっていません。[Q1]

この PoC では、jdx/pitchfork v2.29.0 をソースを変えずに x86-64 static-musl でビルドし、formicarium で動かして上の 2 点を確かめます。[desc] [Q1]

## Target Customer

| 対象 | 得られるもの | Source |
|---|---|---|
| ユーザー本人（aletheia-works） | terrarium のツールごとの wasm ビルドを formicarium に置き換えられるかの判断材料 | [Q1] [Q3] |
| ユーザー本人（aletheia-works） | formicarium が probe 以外の実際の Rust 製 CLI でも動くことの確認 | [Q1] [Q3] |

## Success Metrics

- 対象は、terrarium の `fixtures/sessions/pitchfork-basic.txt` と同じ 8 コマンドです：`--version`、`daemons`、`daemons add`、`daemons remove`、`cat pitchfork.toml`、`status`、`settings set`、`settings get`。[desc]
- 実行環境は Node.js と、ブラウザ 3 種（Chromium・Firefox・WebKit）の計 4 つです。[desc] [Q4]
- 正解は、同じ fixture（`fixtures/pitchfork-basic/`）を使い、同じ手順を native の Linux x86-64 で実行して記録した出力と終了コードです。[Q5]
- 合格条件は、8 コマンド × 4 環境の 32 回すべてで、出力が正解とバイト単位で完全に一致し、終了コードも一致することです。[Q2] [Q5]
- terrarium への組み込み方をまとめた調査メモを 1 本残します。[desc] [Q4]

## Initiative Trigger

terrarium のツールごとのビルドを formicarium に置き換えられるかを確かめる必要があります。あわせて、前の PoC の formicarium が実際の CLI でも動くかを確かめる必要もあります。この 2 つが今回の動機です。[Q1]

## Initial Scope Signal

| 項目 | 内容 | Source |
|---|---|---|
| workflow-selected scope | `poc` | [scope] |
| ユーザーが確認した範囲 | 8 コマンドを Node.js と 3 ブラウザで動かして native との一致を確かめ、terrarium への組み込み方の調査メモを残すところまで | [Q4] |
| 対象外 | デーモンの起動・監視、スーパーバイザー／IPC | [desc] |
| 対象外（別作業） | terrarium で formicarium を使う組み込み（今回は調査メモだけを残す） | [desc] [Q4] |
| 制約 | pitchfork のソースは変更しない | [desc] |

## Assumptions & Open Questions

None.
