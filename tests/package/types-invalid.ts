import {
  ExecutionError,
  type FsEntry,
  type Session,
  createSession as sharedCreateSession,
} from '@aletheia-works/formicarium';
import { createSession } from '@aletheia-works/formicarium/node';

const invalid: FsEntry = {
  path: '/work/a',
  type: 'file' as const,
  mode: 420,
  data: new Uint8Array(),
};
const session: Session = createSession();
(await createSession()).run({ guest: 'not bytes' });
new ExecutionError('UNKNOWN');
void invalid;
void session;
void sharedCreateSession;
