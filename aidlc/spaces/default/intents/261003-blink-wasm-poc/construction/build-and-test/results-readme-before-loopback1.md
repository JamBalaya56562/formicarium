# 計測結果：aube の 4 コマンド（FR6）

このファイルは `scripts/measure-aube.mjs` が `docs/results/aube-timings.json` から生成する。手で編集しない。

- 生成日時：2026-10-04T10:30:02.545Z
- コア：blink（commit 247610f272c000185502293b198d766f78d52ba8、emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.10 (d6c521a7f05449857c76bd99e396895583cf2083)）
- aube：2.6.1 linux-x64 (2026-10-04)（commit bd94e42f54d3b5e3dd102716b7197f316cb5f4ed、x86-64 static-musl）
- ホスト：Windows_NT 10.0.26300 x64、Intel(R) Core(TM) i7-8650U CPU @ 1.90GHz x8、Node.js 24.21.0
- 値は秒。「中央値（最小–最大）」。各値は、コアの起動（wasm の読み込みと初期化）を含む、そのコマンド 1 回の実時間。

| 環境 | 版 | OS | ページ | 試行 | --version | 初回 install | frozen install | list |
|---|---|---|---|---|---|---|---|---|
| Node.js Worker | 24.21.0 | Windows_NT 10.0.26300 x64 | n/a | 3 | 4.8（3.2–7.0） | 17.0（15.8–23.6） | 17.1（16.4–22.6） | 7.1（5.5–7.4） |
| chromium | 153.0.8010.12 | Windows_NT 10.0.26300 x64 | visible (headless) | 3 | 3.0（1.9–3.5） | 7.6（6.7–22.0） | 7.6（5.5–15.2） | 2.8（2.7–3.9） |
| firefox | 155.0 | Windows_NT 10.0.26300 x64 | visible (headless) | 3 | 1.5（1.2–2.1） | 13.3（13.0–102.0） | 13.7（10.7–16.1） | 1.5（1.5–1.7） |
| webkit | 26.6 | Windows_NT 10.0.26300 x64 | visible (headless) | 3 | 2.0（1.4–4.7） | 16.7（4.5–18.6） | 21.4（16.0–30.8） | 4.2（2.8–6.0） |
| CheerpX 1.3.9（背景資料） | 1.3.9 | — | hidden | 4 | 0.3–0.7 | 1.8–5.7 | 1.3–3.6 | 0.17–0.65 |

## 比べるときの差異

- CheerpX の install は node --version の起動（0.5–1.3 s）を含む
- CheerpX はネットワークなし（registry の名前解決が即座に失敗する）
- CheerpX の aube は i586 glibc ビルド、formicarium は x86-64 static-musl ビルド
- formicarium の値は、コマンドごとに blink を起動し直す（ファイルシステムの中身は JS 側で引き継ぐ）。CheerpX は 1 つの VM の中で続けて実行する。
- ネットワークの扱い（registry への接続の試み）が両者の時間にどう効いているかは、まだ確かめていない（未検証）。
- CheerpX の値の出典：`aidlc/spaces/default/knowledge/documents/research/cheerpx-oss.md`（CheerpX 1.3.9, WebVM Debian image, localhost, page hidden, 4 page loads）。
- JIT を後回しにするかどうかの閾値は、この結果を見てユーザーが決める（意図書「Success Metrics」）。
