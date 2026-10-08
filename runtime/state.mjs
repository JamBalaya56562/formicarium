import { failure, invalid } from './errors.mjs';
import { normalizePath, normalizeRoots, inRoots, parentPath, copyEntry, validateEntries } from './validation.mjs';

/** This is the sole owner of a session's persistent filesystem state. */
export class SessionState {
  #entries;
  #seed;
  #initialCwd;
  #disposed = false;
  #active = false;

  constructor({ cwd = '/work', home = '/root', entries = [] } = {}) {
    this.cwd = normalizePath(cwd);
    this.home = normalizePath(home);
    this.roots = Object.freeze(normalizeRoots(this.cwd, this.home));
    this.#entries = validateEntries(entries, this.roots, { seed: true, directories: [this.cwd, this.home] });
    this.#seed = this.#entries.map(copyEntry);
    this.#initialCwd = this.cwd;
  }

  assertIdle() {
    if (this.#disposed) throw failure('DISPOSED', 'Session has been disposed');
    if (this.#active) throw failure('BUSY', 'Session already has an active run');
  }

  reserve() {
    this.assertIdle();
    this.#active = true;
    return this.#entries.map(copyEntry);
  }

  release() { this.#active = false; }

  validateSnapshot(entries) {
    try { return validateEntries(entries, this.roots); }
    catch { throw failure('SNAPSHOT', 'Worker snapshot is invalid'); }
  }

  commit(entries) {
    if (this.#disposed) throw failure('DISPOSED', 'Session has been disposed');
    this.#entries = this.validateSnapshot(entries);
  }

  #path(raw) {
    this.assertIdle();
    const path = normalizePath(raw);
    invalid(inRoots(path, this.roots), 'path lies outside persistence roots');
    let parent = parentPath(path);
    while (inRoots(parent, this.roots)) {
      const entry = this.#entries.find((candidate) => candidate.path === parent);
      invalid(!entry || entry.type === 'dir', 'intermediate path must be a directory');
      parent = parentPath(parent);
    }
    return path;
  }

  #find(path) {
    const entry = this.#entries.find((candidate) => candidate.path === path);
    if (!entry) throw failure('NOT_FOUND', 'Entry does not exist');
    return entry;
  }

  readFile(raw) {
    const entry = this.#find(this.#path(raw));
    if (entry.type !== 'file') throw failure('NOT_FILE', 'Entry is not a regular file');
    return new Uint8Array(entry.data);
  }

  listEntries(raw = this.cwd) {
    const path = this.#path(raw);
    if (this.#find(path).type !== 'dir') return [];
    return this.#entries.filter((entry) => entry.path !== path && parentPath(entry.path) === path).map(copyEntry);
  }

  remove(raw) {
    const path = this.#path(raw);
    invalid(!this.roots.includes(path), 'cannot remove a persistence root');
    this.#entries = this.#entries.filter((entry) => entry.path !== path && !entry.path.startsWith(`${path}/`));
  }

  setCwd(raw) {
    const path = this.#path(raw);
    if (this.#find(path).type !== 'dir') throw failure('NOT_FILE', 'cwd must be a directory');
    this.cwd = path;
  }

  reset() {
    this.assertIdle();
    this.#entries = this.#seed.map(copyEntry);
    this.cwd = this.#initialCwd;
  }

  dispose() {
    this.#disposed = true;
    this.#entries = [];
    this.#seed = [];
  }
}
