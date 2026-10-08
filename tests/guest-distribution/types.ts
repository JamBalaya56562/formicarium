import type { GuestSelection, GuestBuild, SelectedGuest } from '../../integration/terrarium/guest-distribution/index.js';
import { resolveGuest as resolve } from '../../integration/terrarium/guest-distribution/resolver.mjs';
const selection: GuestSelection = { tool: 'aube', ref: 'pr-1645', fixture: '', base: 'https://example.test/site/' };
const pending: Promise<SelectedGuest> = resolve(selection);
pending.then((selected) => {
  const build: GuestBuild = selected.build;
  const guest: Uint8Array = selected.guest;
  const cwd: string = selected.cwd;
  for (const entry of selected.entries) if (entry.type === 'file') entry.data satisfies Uint8Array;
  return { build, guest, cwd };
});
// @ts-expect-error unregistered tool is outside C3
resolve({ tool: 'other', base: 'https://example.test/' });
// @ts-expect-error base is required
resolve({ tool: 'pitchfork' });
