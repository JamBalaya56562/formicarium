オープンソース版 CheerpX（未改変の Linux x86 バイナリを、カーネルを起動せずユーザーモードでエミュレートし、x86→wasm JIT でブラウザ上で動かす方式）の調査メモ（2026-10-03、terrarium で作成）。本文自体が「何も決定していない」と明記している。ラベルは [verified]（コード確認・実行済み）/ [doc]（各プロジェクトの文書）/ [estimate]（判断）。

CheerpX: Community Edition は自前ホスティング・再配布ができず、32-bit x86 のみ。CheerpX 1.3.9 上で aube（i586 ビルド）を動かした結果、`stat64(NULL)` / `fstatat64(fd, NULL)` が EFAULT を返さず VM 全体が停止することが判明した。`statx` に ENOSYS を返す LD_PRELOAD shim で回避でき、#1645 を再現できた。

先行事例: user-mode エミュレーションと x86→wasm JIT を両立した OSS は無い。copy/v86（BSD-2）は JIT の手本（ページ単位で wasm モジュールを生成）だが 32-bit のみ。jart/blink（ISC）は土台候補（x86-64 user-mode、178 syscall）だが、wasm32 では linear memory モードが使えず遅い。また `eventfd` が無く、`FUTEX_WAIT_BITSET` は EINVAL を返し、epoll はホストへの passthrough のみ。webix / portabox は履歴にマルウェアがあり、使用禁止。

最初のマイルストーン案 [estimate]: upstream の blink を Emscripten でビルドし（インタプリタのみ）、Worker と COOP/COEP ページで動かす。合格条件は static-musl x86-64 の Rust probe（tokio マルチスレッド、rayon、hard link / symlink / flock）を通すこと。そのうえで static-musl の aube を計測し、JIT の要否を判断する。JIT の見積もりは、命令ごとにハンドラを呼ぶ方式で 4〜8 週間、インライン化・TLB 高速パス込みでさらに 4〜8 か月。
