// First message bootstraps test instrumentation before importing unchanged package Worker.
interface BootstrapMessage {
  type: string;
  target: string;
  counters: SharedArrayBuffer;
}
const pending: BootstrapMessage[] = [];
const collect = ({ data }: MessageEvent<BootstrapMessage>) =>
  pending.push(data);
self.addEventListener('message', collect);
self.addEventListener('message', async function bootstrap({ data }) {
  if (data.type !== 'observer-bootstrap') return;
  self.removeEventListener('message', bootstrap);
  const view = new Int32Array(data.counters);
  const Original = Worker;
  globalThis.Worker = class extends Original {
    constructor(target: string | URL, options?: WorkerOptions) {
      Atomics.add(view, 0, 1);
      super('/__observer/nested-child.mjs', options);
      super.postMessage({
        type: 'observer-child-bootstrap',
        target: String(target),
        counters: data.counters,
      });
    }
  };
  await import(data.target);
  self.removeEventListener('message', collect);
  for (const message of pending)
    if (message.type !== 'observer-bootstrap')
      self.dispatchEvent(new MessageEvent('message', { data: message }));
});
