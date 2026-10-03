// runtime/node/host.mjs から起動される Worker。コアを読み込み、ゲストを実行して結果を返す。
// メッセージ：{type:'stdout'|'stderr', chunk} を逐次、最後に {type:'done', results} か
// {type:'error', message}。
import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';

import { GUEST_DIR, runGuest, runSession } from '../guest-io.mjs';
import { blinkCore } from '../core.mjs';

const cores = { [blinkCore.name]: blinkCore };

/** ホストのディレクトリ（またはファイル）を、仮想ファイルシステムのエントリに変換する。 */
function readHostTree(hostPath, guestPath) {
  const entries = [];
  const walk = (h, g) => {
    const stat = lstatSync(h);
    if (stat.isDirectory()) {
      entries.push({ path: g, type: 'dir', mode: 0o755 });
      for (const name of readdirSync(h).sort()) walk(path.join(h, name), `${g}/${name}`);
    } else if (stat.isSymbolicLink()) {
      entries.push({ path: g, type: 'symlink', target: readlinkSync(h) });
    } else if (stat.isFile()) {
      entries.push({ path: g, type: 'file', data: readFileSync(h), mode: stat.mode & 0o777 || 0o644 });
    }
  };
  walk(hostPath, guestPath);
  return entries;
}

function post(type, chunk) {
  // 受け取る側で使えるように、コピーして渡す
  parentPort.postMessage({ type, chunk: Uint8Array.from(chunk) });
}

async function main() {
  const { loaderPath, coreName, guestHostPath, args, copyIn, env, cwd, steps, persist, coreFlags } = workerData;
  const core = cores[coreName];
  if (!core) throw new Error(`unknown core: ${coreName}`);
  const { default: createModule } = await import(pathToFileURL(loaderPath).href);
  const guestPath = `${GUEST_DIR}/${path.basename(guestHostPath)}`;
  const guestEntry = { path: guestPath, type: 'file', data: readFileSync(guestHostPath), mode: 0o755 };
  const entries = copyIn.flatMap((c) => readHostTree(c.host, c.guest));
  const common = {
    createModule,
    core,
    guestPath,
    env,
    cwd,
    coreFlags,
    onStdout: (chunk) => post('stdout', chunk),
    onStderr: (chunk) => post('stderr', chunk),
  };
  let results;
  if (steps) {
    results = await runSession({ ...common, guestEntry, steps, entries, persist });
  } else {
    const started = performance.now();
    const result = await runGuest({ ...common, args, entries: [guestEntry, ...entries] });
    results = [{ ...result, step: { args }, elapsedMs: performance.now() - started }];
  }
  parentPort.postMessage({
    type: 'done',
    results: results.map((r) => ({
      step: r.step,
      exitCode: r.exitCode,
      stdout: r.stdout,
      stderr: r.stderr,
      elapsedMs: r.elapsedMs,
    })),
  });
}

// Emscripten は終了時に ExitStatus を throw する（Node では process.exitCode も設定する）。
// 終了コードは onExit で受け取っているので、これは無視して結果の送信を続ける。
// それ以外の例外は、ページ側に伝えてから終わる。
function onUncaught(error) {
  if (error?.name === 'ExitStatus' || error === 'unwind') {
    process.exitCode = 0;
    return;
  }
  parentPort.postMessage({ type: 'error', message: `uncaught exception in worker: ${error?.stack ?? error}` });
}
process.on('uncaughtException', onUncaught);
process.on('unhandledRejection', onUncaught);

main().catch((error) => {
  parentPort.postMessage({
    type: 'error',
    message: error?.message ?? String(error),
    stdout: error?.stdout,
    stderr: error?.stderr,
  });
});
