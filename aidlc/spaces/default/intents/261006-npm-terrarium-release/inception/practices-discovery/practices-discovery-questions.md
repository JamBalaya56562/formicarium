# Practices Discovery Questions

既存の jj、mise 実体、品質上限、aube 再ビルド回避、変更範囲、RC→terrarium受入れ→stable、Trusted Publishing は引き継ぐ。lint/format 製品と coverage 計測方法は技術側が具体化し、工程承認用の文書へ記載する。新しい硬い制約として無断確定しない。

## Interaction Mode

A. Guide me — 各項目をここで順に回答する
B. I'll edit the file — このファイルを直接編集する
C. Chat — 会話で決める
X. Other (please specify)

[Answer]: Guide me

## Q1: Way of Working

公開後の変更を、どのようにレビューして統合しますか？ jj の使用は確定済みです。

A. main に短命 bookmark の変更をレビュー後にまとめて統合する（org の既定案）
B. main に短命 bookmark の変更をレビュー後に履歴を保持して統合する
X. Other (please specify)

[Answer]: まとめて統合

## Q2: Walking Skeleton

最初に、npm tarball から Node とブラウザ Worker を動かす最小版を作って接続を確かめますか？ Walking skeleton は、機能を揃える前に全体を端から端まで動かす最小版です。

A. 最小版を先に動かして確認する
B. 最小版の専用チェックポイントは設けず、各実装の結合検証で確認する
X. Other (please specify)

[Answer]: 最小版を先に確認

## Q3: Testing Posture

通常の新規実装では、テストをどの順序で書きますか？ 不具合修正では再現テストを先に作り、失敗と修正後の成功を確認します。80%行coverageと統合前CI、既存品質基準は維持します。

A. 各層を実装した後、その層のテストを書いて実行する（test-after）
B. テストを先に書いて失敗を確認し、実装して通す（tdd）
X. Other (please specify)

[Answer]: test-after

## Q4: Deployment

RC と stable の公開を開始する手順はどうしますか？ 配布物の確認後、外部公開には人間の承認を得る方針は維持します。

A. ユーザーが対象版を承認後、版タグから公開する。RCはnext、stableはlatestとし、不具合時は追加公開を止め既知の版へ誘導する
B. ユーザーが対象版を承認後、手動 workflow から公開する。RCはnext、stableはlatestとし、不具合時は追加公開を止め既知の版へ誘導する
X. Other (please specify)

[Answer]: 版タグから公開

## Code Style

既存 ESM・命名・責務境界を踏襲し、新規／変更ファイルに最小のlint/format設定を適用する案を技術側で具体化する。全体整形を混ぜない指示は既に確定済み。製品名だけの質問は設けない。
