import { decodeUtf8, ExecutionError, type FsEntry, type Session } from '@aletheia-works/formicarium';
import { createSession } from '@aletheia-works/formicarium/node';
import { createSession as createBrowserSession } from '@aletheia-works/formicarium/browser';
const entries: FsEntry[] = [{ path: '/work/input', type: 'file', mode: 420, inodeId: 'a', data: new Uint8Array() }];
const session: Session = await createSession({ entries });
const result = await session.run({ guest: new Uint8Array(), signal: new AbortController().signal, onOutput(chunk) { decodeUtf8(chunk.bytes); } });
decodeUtf8(result.stderr); await session.readFile('/work/input'); await session.remove('/work/input'); await session.reset(); await session.dispose();
await createBrowserSession(); new ExecutionError('ABORTED');
