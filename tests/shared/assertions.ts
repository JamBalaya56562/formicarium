import assert from 'node:assert/strict';
import type { FsEntry } from '../../types/index.js';
export function entryAt<T extends FsEntry['type']>(
  entries: readonly FsEntry[] | undefined,
  path: string,
  type: T,
): Extract<FsEntry, { type: T }> {
  const entry = entries?.find((entry) => entry.path === path);
  assert.ok(entry?.type === type, `${path}: expected ${type}`);
  return entry as Extract<FsEntry, { type: T }>;
}
