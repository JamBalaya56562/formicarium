# 再開時の失敗調査

## 入力と証拠

`code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md` と、既存の `test-results.md` を引き継ぐ（Modify）。

- 検証済み：`node node_modules/@playwright/test/cli.js test tests/browser/probe.spec.mjs tests/browser/aube-1645.spec.mjs --repeat-each=3 --output=test-results/resume-20261004 --reporter=list` の Chromium 1 回目で probe が失敗。出力は `browser-resume.txt`。
- 検証済み：`chromium-probe-resume-error.md` に `PASS tokio-timer`、`PASS unix-stream-pair`、`PASS rayon`、SIGSEGV、終了コード 139 が保存されている。命令は `mov 0x820(%rdi),%rax`、rip=`0x88042fc0`、faultaddr=`0x80018320`。保存されたメモリマップに faultaddr のページはない。
- 検証済み：同じ Chromium の probe は 2 回目と 3 回目で合格した。Firefox は 21 件すべて合格。
- ドキュメント根拠：既存レビュー R-03 は futex の期限計算を調査候補に挙げている。レビュー自身も再現していないと明記している。

## 原因候補と次の検証

根本原因は未検証。SIGSEGV と futex の期限計算を同じ問題と断定しない。

- 推測：スレッド生成・終了と guest の mmap/munmap、アドレス変換の競合。blink の syscall 記録で clone、munmap、futex とクラッシュした tid の順序を採取する。TLS と解放範囲を対応させ、原因を限定した回帰テストを先に作る。
- 推測：`FutexWait` の `tick` が broadcast のたびに実時間と無関係に進む。異なる bitset の待ち手への wake を繰り返しても期限前に ETIMEDOUT を返さない、という独立した回帰テストで確かめる。再現した場合は毎回の実時刻から期限を計算する。SIGSEGV の修正とは別に判定する。

## 修正候補の影響見積もり

コード生成への戻りが必要な候補は、fork 側の futex の期限計算と、証拠で特定したスレッド／メモリの同期処理の修正。修正そのものはまだ行っていない。

- 工数：期限計算の回帰テストと修正は 1〜2 時間、SIGSEGV／停止の追加診断と同期処理の修正は 2〜8 時間を仮置きする。原因未特定のため後者は超過しうる。
- 費用：既存のローカル Node.js・Playwright・Docker を利用する想定で、新たなサービス購入費用は 0 円。実行・レビューにはモデル利用量を消費する。
- リスク：中〜高。待機、スレッド終了、メモリ管理の変更は他のゲストへ回帰しうる。probe と aube を Node.js・3 ブラウザで再実行し、繰り返し判定を維持する。fork の公開更新は修正レビュー後の操作として扱う。

現時点では修正成功を保証できない。既存成果物を保持し、原因調査と回帰テストから始める。

## 再実行の確定結果

検証済み：browser-resume.txt の終端は 61 passed / 2 failed、終了コード 1。WebKit 2 回目は PASS tokio-timer の後で Timeout 600000ms exceeded（webkit-probe-resume-error.md）。Node.js は各ファイル逐次実行で計 30/30 合格。traceability は 17/17、既存計測の形式は 4 環境 × 3 回で合格（record-resume.txt）。

停止の原因は未検証。WebKit の停止位置は UnixStream::pair または前の tokio runtime の終了処理の可能性もあるため、Mutex/Condvar の問題に限定しない。診断では各 syscall の tid、socketpair の待ちと wake、スレッド終了の順序も採取する。

