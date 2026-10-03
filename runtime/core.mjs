// エミュレータのコアの記述子。コア固有の知識はここだけに置く。
//
// コアは「wasm モジュール 1 つ＋起動用の JS」として扱う。起動用の JS は Emscripten の
// MODULARIZE 形式（ES モジュールの既定エクスポートがファクトリ）であることを前提にする。
// いまのコアは blink の fork（dist/blink/）。paludarium（Rust 版 blink）に置き換えるときは、
// この記述子を差し替える。

/** blink（fork）のコア */
export const blinkCore = {
  name: 'blink',
  /** プロジェクトのルートから見た、起動用 JS の場所 */
  loaderPath: 'dist/blink/blink.mjs',
  /** ビルド情報（コミットなど）の場所 */
  buildInfoPath: 'dist/blink/build-info.json',
  /**
   * コアに渡すコマンドライン。blink は `blink [flags] <program> [args...]` の形で受け取る。
   * @param {string} guestPath 仮想ファイルシステム上のゲストのパス
   * @param {string[]} args ゲストに渡す引数
   * @param {string[]} [coreFlags] コア自身へのフラグ（診断用。例：blink の -s はシステムコールの記録）
   */
  argv(guestPath, args, coreFlags = []) {
    return [...coreFlags, guestPath, ...args];
  },
};

export const defaultCore = blinkCore;
