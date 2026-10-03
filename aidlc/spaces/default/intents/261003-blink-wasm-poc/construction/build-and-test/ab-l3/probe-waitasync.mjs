import { chromium, firefox, webkit } from '@playwright/test';
for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const b = await type.launch();
  const p = await b.newPage();
  await p.goto('about:blank');
  const r = await p.evaluate(async () => {
    const w = new Worker(URL.createObjectURL(new Blob(['postMessage(typeof Atomics.waitAsync)'], { type: 'text/javascript' })));
    const inWorker = await new Promise((res) => (w.onmessage = (e) => res(e.data)));
    return { page: typeof Atomics.waitAsync, worker: inWorker };
  });
  console.log(name, b.version(), JSON.stringify(r));
  await b.close();
}
