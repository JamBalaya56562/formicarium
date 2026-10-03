# Personas

## Sources

- [memory:M1] requirements-analysis/requirements.md のIntent AnalysisとFR1–FR10。
- [Q1] user-stories-questions.md：利用手順ごと（推奨）。

## Persona Definitions

| ID | 名前・役割 | 目的 | 困りごと | 利用状況・優先順位 |
|---|---|---|---|---|
| P1 | JS API利用者 | 自分のstatic-muslゲストをNodeまたはbrowser Workerから動かし、結果と失敗を取得する | リポジトリ内部参照・コア再ビルド・固定guest登録への依存があると導入しにくい | ライブラリconsumerを作る開発者。技術理解は高い想定。最小tarballを最初に確認するため第1優先 |
| P2 | terrarium利用者・保守者 | 既存リンク・要素・run()/iframeからaube/pitchforkの手順を実行し、refと状態を正しく扱う | 入口やイベントの変更、状態混入、未知refへの誤ったfallbackで手順が再現できなくなる | 既存端末を使う利用者と互換性を維持する保守者。第2優先。利用者向け通知は専門的な内部用語を前提にしない |
| P3 | リリース担当 | 承認済み供給物をRCで配布し、terrariumの証拠を確認してstableへ進める | 未検証版・未承認版の公開、取得元や版の対応不明、公開権限の誤設定 | npm/GitHub Releaseと品質・公開判断の担当。第3優先だが公開前準備は早期に着手する |

## Relationships

P1が共通ランタイムを利用し、P2がterrariumへ組み込んで既存利用手順を保つ。P3はP1の最小consumerとP2の公開済みRC受入れの証拠を使って配布版を判断する。同じ人が複数役割を担ってよい。

P2の利用者は既存手順を操作し結果・失敗通知を読む。P2の保守者は基準commitとのAPI/イベント比較と配信条件を確認する。利用者向け通知はこの保守知識を前提にしない。

## Assumptions & Open Questions

技術理解と困りごとは承認済み要件からの設計上の想定（推測）。顧客調査結果・実在人物・利用人数・利用頻度は未検証であり追加しない。新しい役割や製品機能は設けない。
