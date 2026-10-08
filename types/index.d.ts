export interface Assets {
  loaderURL: string | URL;
  wasmURL: string | URL;
  workerURL: string | URL;
  buildInfoURL: string | URL;
}
export type FsEntry =
  | { path: string; type: 'dir'; mode: number }
  | { path: string; type: 'file'; mode: number; inodeId: string; data: Uint8Array }
  | { path: string; type: 'symlink'; target: string };
export interface SessionOptions { assets?: Assets; cwd?: string; home?: string; entries?: readonly FsEntry[]; }
export interface OutputChunk { runId: string; sequence: number; stream: 'stdout' | 'stderr'; bytes: Uint8Array; }
export interface RunOptions {
  guest: Uint8Array;
  args?: readonly string[];
  env?: Readonly<Record<string, string>>;
  timeoutMs?: number;
  signal?: AbortSignal;
  onOutput?: (chunk: OutputChunk) => void;
}
export interface RunResult { runId: string; exitCode: number; stdout: Uint8Array; stderr: Uint8Array; elapsedMs: number; }
export type ErrorCode = 'INVALID_INPUT' | 'ASSET_LOAD' | 'UNSUPPORTED_ENV' | 'CORE_INIT' | 'EXECUTION' | 'SNAPSHOT' | 'TIMEOUT' | 'ABORTED' | 'BUSY' | 'DISPOSED' | 'NOT_FOUND' | 'NOT_FILE';
export class ExecutionError extends Error {
  constructor(code: ErrorCode, message?: string, details?: { runId?: string; stdout?: Uint8Array; stderr?: Uint8Array; cause?: unknown });
  code: ErrorCode;
  runId?: string;
  stdout: Uint8Array;
  stderr: Uint8Array;
  cause?: unknown;
}
export const ERROR_CODES: readonly ErrorCode[];
export interface Session {
  run(options: RunOptions): Promise<RunResult>;
  readFile(path: string): Promise<Uint8Array>;
  remove(path: string): Promise<void>;
  listEntries(path?: string): Promise<readonly FsEntry[]>;
  setCwd(path: string): Promise<void>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}
export function decodeUtf8(bytes: Uint8Array): string;
