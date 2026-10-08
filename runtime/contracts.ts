import type {
  Assets,
  FsEntry,
  OutputChunk,
  RunOptions,
  RunResult,
} from '../types/index.js';

export type { Assets, FsEntry, OutputChunk, RunOptions, RunResult };
export type ByteSink = (bytes: Uint8Array) => void;
export interface LegacyEntry {
  path: string;
  type?: 'dir' | 'file' | 'symlink';
  mode?: number;
  inodeId?: string;
  data?: Uint8Array | string;
  target?: string;
}
export interface FileSystem {
  analyzePath(path: string, dontResolveLastLink?: boolean): { exists: boolean };
  isDir(mode: number): boolean;
  lstat(path: string): { mode: number; ino: number };
  mkdir(path: string, mode?: number): void;
  writeFile(path: string, bytes: Uint8Array | string): void;
  readFile(path: string): Uint8Array;
  chmod(path: string, mode: number): void;
  symlink(target: string, path: string): void;
  readlink(path: string): string;
  link(source: string, target: string): void;
  readdir(path: string): string[];
  init(
    input: () => null,
    stdout: (byte: number) => void,
    stderr: (byte: number) => void,
  ): void;
  chdir(path: string): void;
  rmdir(path: string): void;
  unlink(path: string): void;
}
export interface CoreModule {
  FS: FileSystem;
  ENV: Record<string, string>;
}
export interface ModuleOptions {
  arguments: string[];
  noInitialRun: boolean;
  preRun: ((module: CoreModule) => void)[];
  onExit(code: number): void;
  quit(code: number, error?: Error): void;
  onAbort(reason: unknown): void;
  print(line: string): void;
  printErr(line: string): void;
}
export type ModuleFactory = (options: ModuleOptions) => Promise<CoreModule>;
export interface CoreDescriptor {
  name?: string;
  loaderPath?: string;
  buildInfoPath?: string;
  argv(
    guestPath: string,
    args: readonly string[],
    coreFlags?: readonly string[],
  ): string[];
  captureModule?(module: CoreModule): CoreModule;
  // biome-ignore lint/suspicious/noConfusingVoidType: cleanup supports synchronous and asynchronous callbacks with optional success results.
  cleanup?(): void | boolean | Promise<void | boolean>;
}
export interface GuestOptions {
  createModule: ModuleFactory;
  core: CoreDescriptor;
  guestPath: string;
  args?: readonly string[];
  entries?: readonly LegacyEntry[];
  env?: Readonly<Record<string, string>>;
  cwd?: string;
  snapshotRoots?: readonly string[];
  coreFlags?: readonly string[];
  onStdout?: ByteSink;
  onStderr?: ByteSink;
}
export interface GuestResult {
  exitCode: number;
  stdout: Uint8Array;
  stderr: Uint8Array;
  snapshot?: FsEntry[];
}
export interface SessionStep {
  args?: string[];
  removeTree?: string;
  catFile?: string;
}
export interface Identity {
  protocolVersion?: number;
  sessionId: string;
  runId: string;
  generation: number;
}
export interface RunRequest extends Identity {
  type: 'run';
  assets: Assets;
  guest: Uint8Array;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  home: string;
  entries: FsEntry[];
  snapshotRoots: string[];
}
export interface Streams {
  stdout: Uint8Array[];
  stderr: Uint8Array[];
}
export interface WorkerHandle {
  detach?(): void;
  terminate(): void | Promise<void>;
}
export interface WorkerHandlers {
  message(value: unknown): void;
  error(error: unknown): void;
  exit(code?: number): void;
}
export type SpawnWorker = (
  request: RunRequest,
  handlers: WorkerHandlers,
) => WorkerHandle;
export interface ResourceDescriptor {
  resourceId: number;
  moduleURL: string;
  bootstrapURL: string;
}
export interface ResourceAllocator {
  allocate(bytes: Uint8Array): Promise<ResourceDescriptor>;
}
export type ControlMessage =
  | {
      type: 'child-message' | 'child-error';
      childId: number;
      payload?: unknown;
    }
  | {
      type: 'resource-ready';
      resourceRequestId: number;
      descriptor: ResourceDescriptor;
    }
  | { type: 'resource-error'; resourceRequestId: number }
  | { type: 'unrelated' };
export interface ControlChannel {
  post(message: object, transfer?: Transferable[]): void;
  subscribe(
    listener: (message: ControlMessage, ports?: readonly MessagePort[]) => void,
  ): () => void;
}
export interface HostOptions {
  guest: string;
  args?: string[];
  copyIn?: { host: string; guest: string }[];
  env?: Record<string, string>;
  cwd?: string;
  steps?: SessionStep[];
  coreFlags?: string[];
  persist?: string[];
  onStdout?: ByteSink;
  onStderr?: ByteSink;
  timeoutMs?: number;
  core?: CoreDescriptor & { name: string; loaderPath: string };
}
export interface HostResult {
  results: (GuestResult & { step: SessionStep; elapsedMs: number })[];
}
export interface CoreLoadOptions {
  assets: Assets;
  readBytes(url: string | URL): Promise<Uint8Array>;
  childWorkers?: ControlChannel;
  resources?: ResourceAllocator;
  importModule?: (url: string) => Promise<{ default: unknown }>;
}

export function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : undefined;
}
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
