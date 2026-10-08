const pending = [];
const collect = ({ data }) => pending.push(data);
self.addEventListener('message', collect);
self.addEventListener('message', async function bootstrap({ data }) {
  if (data.type !== 'observer-child-bootstrap') return;
  self.removeEventListener('message', bootstrap);
  Atomics.add(new Int32Array(data.counters), 1, 1);
  const view = new Int32Array(data.counters);
  Atomics.add(view, 2, 1);
  setInterval(() => Atomics.add(view, 2, 1), 5);
  await import(data.target);
  self.removeEventListener('message', collect);
  for (const message of pending) if (message.type !== 'observer-child-bootstrap') self.dispatchEvent(new MessageEvent('message', { data: message }));
});
