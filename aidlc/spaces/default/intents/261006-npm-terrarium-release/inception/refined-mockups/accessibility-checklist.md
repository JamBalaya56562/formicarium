# Accessibility Checklist

## Sources

- [memory:M1] stories.md AC4.1.1/AC4.1.3/AC4.2.3、既存操作の比較と原因テキスト。
- [memory:M2] web/index.html：lang=en、native select/link、Tool/Build aria-label。terminal.ts：xtermとfocus。読取りexit0。
- [memory:M3] interaction-spec.mdとdesign-system-mapping.md。

## Scope and Status

全体WCAG認証や既存UIの全面改修は追加しない。以下は変更する表示・通知面と既存入口互換性のチェック計画。ソース属性の確認をブラウザー/支援技術の成功と扱わない。製品の既存英語表示は保持し、日本語の設計文書を表示文字列へ流用しない。

## Checklist

| ID | 確認内容 | 手順/合否 | 現状 |
|---|---|---|---|
| AX1 | キーボード操作/focus | 基準と候補でTool/Build/source/端末をTab等で操作し、ready後focusと入力手順が一致。keyboard trapが増えない | 未検証 |
| AX2 | 名前/label | Tool/Buildと変更した通知面のaccessible nameを観測。既存名を失わない | ソースaria-label観測済み、動作未検証 |
| AX3 | 原因/修正対象 | 未知ref/fixture、shell構文、資産404、隔離不足の原因と修正対象がtextに存在。色だけに依存しない | 未検証 |
| AX4 | 支援技術 | 変更した通知と端末focusをWindows/NVDA等で確認。誤ったfocus移動や重複読み上げを増やさない | 未検証、利用環境を検証時に記録 |
| AX5 | contrast | 変更したtextの実描画色/背景を測定。通常text4.5:1、大きなtext3:1を参考に問題を記録し、既存面との互換範囲を判定 | 未検証、全UI認証ではない |
| AX6 | zoom/幅/長文 | 320/768/1024 pxと200% zoom、長いref/command/outputで基準比較。重要入力/原因が失われない | 未検証 |
| AX7 | iframe | consumerのtitleと埋込みfocusを比較。未対応/隔離不足でも原因へ到達し、未承認親には通知しない | 未検証 |
| AX8 | 状態通知 | ready/exit/error/timeout/cancelを区別。基準イベント順序/回数、textを観測。既存transcriptを変更しない | 未検証 |
| AX9 | 安全な表示 | env機密/stack traceを原因textへ露出させず、特殊文字を別コードとして解釈しない | 未検証 |

## Verification Handoff

後続品質設計で基準/候補のviewport、keyboardとイベントfixture、支援技術環境、変更した通知のcontrast測定を固定する。mainが逐次実行し、コマンド・観測結果・失敗/未実施を保存する。検証できない支援技術は未検証を維持して具体的な再現手順を渡す。実機Safari未検証は初回stableの新たな必須条件にしない。

## Assumptions & Open Questions

ARIAの新規追加・live regionの具体方式は変更面と基準を調査して設計し、存在/対応済みと仮定しない。時間上限を緩めたりCLIに新しい延長UIを足したりしない。
