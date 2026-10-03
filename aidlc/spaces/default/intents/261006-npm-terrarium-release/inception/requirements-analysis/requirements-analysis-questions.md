# Requirements Analysis Questions

回答方法は前工程で選択された Guide me を引き継ぐ。今回の要件は project-description utility の description、承認済み開発手順、現行 CodeKB に基づく。npm/Worker/wasm/型/表示/build-info、既存要素/run()/iframe維持、RC→terrarium受入れ→stable、Trusted Publishing、品質上限・配布JS80%・先行最小版は再質問しない。技術方式・公開操作の承認はこの質問で代用しない。

## Q1: terrarium の対象

既存 API と動作の互換性を確認する terrarium のリポジトリを、ローカルの絶対パスまたはリポジトリ URL と、基準 branch/tag/commit で指定してください。参照先を推測して変更しないための確認です。

A. ローカルの絶対パスと基準 ref を指定する
B. リポジトリ URL と基準 ref を指定する
X. Other (please specify)

[Answer]: Codexによる選定（ユーザーが推奨案の選定を委任）。C:/Users/Jam/Documents/aletheia-works/terrarium、main の 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d を基準にする。

## Q2: 初回に置き換えるツール

初回は aube・pitchfork を formicarium で動かし、それ以外の既存ツールは現在の実行方式を維持しますか？ ゲストと fixture の ref 別配布先は terrarium として確定済みです。

A. aube・pitchfork を置き換え、他のツールは維持する
B. 他のツールも初回対象にする（ツール名を指定する）
X. Other (please specify)

[Answer]: Codexによる選定（同じ委任）：A. aube・pitchforkを置き換え、他のツールは維持する。

## Q3: ブラウザの受け入れ条件

初回 stable の条件として、Chromium・Firefox・WebKit の自動検証に加え、macOS の実機 Safari での確認を必須にしますか？ 実機 Safari は現在未検証です。既存品質上限は変更しません。

A. 自動検証3種を必須とし、実機 Safari は未検証を明記して後続へ残す
B. 初回 stable の前に実機 Safari も必須にする
X. Other (please specify)

[Answer]: Codexによる選定（同じ委任）：A. 自動検証3種を必須とし、実機Safariは未検証を明記して後続へ残す。
