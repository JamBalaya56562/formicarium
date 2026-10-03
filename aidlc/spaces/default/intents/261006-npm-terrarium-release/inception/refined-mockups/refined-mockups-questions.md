# Refined Mockups Questions

## Sources

- [memory:M1] 承認済み stories.md：18ストーリー、56受入条件、UI再設計は対象外。
- [memory:M2] 承認済み requirements.md：FR1–FR10/NFR1–NFR7、既存入口とRC/stable順序。
- [memory:M3] terrarium/web/index.html、web/terminal.mjs、packages/terrarium/src/terminal.tsの読取り（exit0）。ソース上の構成を観測したもので、表示・操作の動作は未検証。
- [memory:M4] team-practices.md：最小tarball先行、公開の別承認、既存品質条件。

## Design Questions and Resolved Context

| 論点 | 既存決定・今回の適用 | 根拠 |
|---|---|---|
| 各ストーリーの表現 | JS APIの利用手順、既存端末の状態、リリース証拠の確認手順へ対応させる | M1/M2 |
| 操作パターン | 既存select/link/端末入力/run()/iframeを保持。新たなmodal/wizardは追加しない | M1/M3 |
| 状態 | empty/loading/ready/running/exit/error/partial/unsupportedを区別 | M1 |
| デザインシステム | 既存のdark pageとxtermを再利用。色・配置の刷新はしない | M1/M3 |
| アクセシビリティ | 既存キーボード操作・focusを比較し、失敗原因と修正対象をテキストで伝える。全UIの新たな適合認証を追加しない | M1 |
| responsive | 既存flex、header wrap、embed header非表示を維持。具体viewport/zoomの比較を検証計画へ渡す | M3 |
| 開発者体験 | pack導入→public import→入力/資産指定→結果/失敗→終了。具体exports/型はContract Designまでに固定 | M1/M2 |

上表は既存決定と技術判断の整理であり、この工程で新しいユーザー回答を受けた記録ではない。新しい製品判断の質問はない。Summary Confirmationは今回off。

## Assumptions & Open Questions

API識別子、snapshot範囲、同時呼出し、assetURL、通知の具体的文言/失敗分類はContract Designで固定する。ブラウザー表示・支援技術・contrast/zoom・実terrarium動作は未検証。
