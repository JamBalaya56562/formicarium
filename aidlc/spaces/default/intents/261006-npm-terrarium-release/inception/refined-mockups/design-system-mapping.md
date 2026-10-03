# Design System Mapping

## Sources

- [memory:M1] terrarium/web/index.htmlのstyleと要素を読取りexit0。
- [memory:M2] packages/terrarium/src/terminal.tsのxterm import、font/theme/fit/focusをrgで観測exit0。
- [memory:M3] stories.md US4.1/US4.2とmockups.md。

## Component Mapping

| 仕様の面 | 既存実装/契約 | 今回の適用 |
|---|---|---|
| ページ枠 | header/main/terrarium-terminal | レイアウト保持 |
| Tool/Build | native select、aria-label Tool/Build | hidden条件と選択/reset保持 |
| source | native a、target blank、rel noopener | 取得元commit/PRに対応、変更なし |
| status | span.status、textContent | 原因/readyのテキスト表示を既存面で比較 |
| 端末 | @xterm/xterm、FitAddon、shadow root | 入力/scroll/fit/focus保持 |
| embed | body.embed header display:none | 親側表示・通知を含む失敗条件を設計 |
| JS API | DOMなし | 型/例/原因分類の開発者体験、UI tokenなし |
| リリース | コマンド/記録 | 管理画面なし、候補と証拠の照合 |

## Existing Tokens

| 項目 | ソース値 | 適用範囲 |
|---|---|---|
| background | #0d1117 | page/terminal |
| foreground | #c9d1d9 | page |
| muted | #8b949e | status |
| link | #58a6ff | source |
| select background | #161b22 | select |
| border | #30363d | header/select |
| page font | 14px/1.5 system-ui | page |
| terminal font | 13px ui-monospace等 | xterm |
| header gap/padding | 12px / 10px 16px | header |
| select radius/padding | 6px / 4px 8px | select |

これらはソース値の観測で、描画値やWCAG合格の証拠ではない。CSSの全面変更や新token体系は追加しない。responsiveは既存header flex-wrap/端末fitを保つ。必要な通知変更に関するcontrast/focus/読み上げを検証し、既存範囲外の問題は本件のついで修正にしない。

## Assumptions & Open Questions

基準との描画・操作一致、contrast、zoom、支援技術は未検証。UI製品の追加選定は不要。取得元baselineが動いた場合も承認済みcommitとの比較を失わない。
