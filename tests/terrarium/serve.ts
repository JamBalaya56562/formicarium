import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const terrarium = resolve(
  repositoryRoot,
  process.env.TERRARIUM_ROOT ?? '../terrarium',
);
const site = resolve(
  repositoryRoot,
  process.env.TERRARIUM_SITE ?? `${terrarium}/.site`,
);
const host = resolve(terrarium, 'packages/terrarium/e2e/host/formicarium');
const mime: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};
const server = createServer(async (request, response) => {
  const headers = {
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'access-control-allow-origin': '*',
  };
  try {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1:8880')
      .pathname;
    const root = pathname === '/element.html' ? host : site;
    const target = resolve(
      root,
      `.${decodeURIComponent(pathname.endsWith('/') ? `${pathname}index.html` : pathname)}`,
    );
    if (!target.startsWith(`${root}${sep}`)) {
      response.writeHead(403, headers);
      response.end('forbidden');
      return;
    }
    const body = await readFile(target);
    response.writeHead(200, {
      ...headers,
      'content-type': mime[extname(target)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch (caught) {
    const error = caught as NodeJS.ErrnoException;
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, headers);
    response.end('asset unavailable');
  }
});
server.listen(8880, '127.0.0.1');
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
