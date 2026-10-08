self.addEventListener(
  'message',
  ({ data: request }) => {
    if (request.type !== 'run') return;
    const { protocolVersion, sessionId, runId, generation } = request;
    const identity = { protocolVersion, sessionId, runId, generation };
    const url = new URL('./broker-child.js', import.meta.url).href;
    const scenario = request.args[0];
    if (scenario.startsWith('resource-')) {
      const bytes = new TextEncoder().encode('export default () => {};');
      if (scenario === 'resource-stale') {
        self.postMessage({
          ...identity,
          runId: 'stale',
          type: 'resource-create',
          resourceRequestId: 1,
          bytes: 'invalid',
        });
        self.postMessage({
          ...identity,
          type: 'done',
          result: {
            runId,
            exitCode: 0,
            stdout: new Uint8Array(),
            stderr: new Uint8Array(),
            elapsedMs: 0,
          },
          snapshot: [],
        });
        return;
      }
      self.addEventListener('message', ({ data }) => {
        if (data.type === 'resource-ready')
          self.postMessage({
            ...identity,
            type: 'done',
            result: {
              runId,
              exitCode: 0,
              stdout: new Uint8Array(),
              stderr: new Uint8Array(),
              elapsedMs: 0,
            },
            snapshot: [],
          });
      });
      const control: typeof identity & {
        type: string;
        resourceRequestId: number;
        bytes: Uint8Array | string;
      } = { ...identity, type: 'resource-create', resourceRequestId: 1, bytes };
      if (scenario === 'resource-invalid-version') control.protocolVersion = 2;
      if (scenario === 'resource-invalid-bytes') control.bytes = 'invalid';
      self.postMessage(control);
      if (scenario === 'resource-duplicate') self.postMessage(control);
      return;
    }
    if (scenario === 'invalid-resource' || scenario === 'blob-url') {
      self.postMessage({
        ...identity,
        type: 'child-create',
        childId: 1,
        url:
          scenario === 'blob-url' ? `blob:${location.origin}/arbitrary` : url,
        options: { type: 'module' },
        resourceId: 999,
      });
      return;
    }
    if (scenario === 'invalid-version') {
      self.postMessage({
        ...identity,
        protocolVersion: 2,
        type: 'child-create',
        childId: 1,
        url,
        options: { type: 'module' },
      });
      return;
    }
    if (scenario === 'invalid-url') {
      self.postMessage({
        ...identity,
        type: 'child-create',
        childId: 1,
        url: 'https://example.invalid/child',
        options: { type: 'module' },
      });
      return;
    }
    if (scenario === 'invalid-options') {
      self.postMessage({
        ...identity,
        type: 'child-create',
        childId: 1,
        url,
        options: { type: 'module', unknown: true },
      });
      return;
    }
    // Invalid stale requests must not create children or fail the current run.
    self.postMessage({
      ...identity,
      runId: 'stale',
      type: 'child-create',
      childId: 2,
      url: 'https://example.invalid/child',
      options: {},
    });
    self.postMessage({
      ...identity,
      type: 'child-create',
      childId: 1,
      url,
      options: { type: 'module' },
    });
    const channel = new MessageChannel();
    let acknowledged = false;
    let reply:
      | { payload: { value: number }; ports: readonly MessagePort[] }
      | undefined;
    const finish = () => {
      if (!acknowledged || !reply) return;
      const bytes = Uint8Array.of(reply.payload.value, reply.ports.length, 1);
      for (const port of reply.ports) port.close();
      channel.port1.close();
      self.postMessage({
        ...identity,
        type: 'output',
        chunk: { runId, sequence: 0, stream: 'stdout', bytes },
      });
      self.postMessage({
        ...identity,
        type: 'done',
        result: {
          runId,
          exitCode: 0,
          stdout: bytes,
          stderr: new Uint8Array(),
          elapsedMs: 0,
        },
        snapshot: [],
      });
    };
    channel.port1.addEventListener('message', ({ data }) => {
      acknowledged = data === 'port-ack';
      finish();
    });
    channel.port1.start();
    self.addEventListener('message', (event) => {
      if (event.data.type === 'child-message') {
        reply = { ...event.data, ports: event.ports };
        finish();
      }
    });
    self.postMessage(
      {
        ...identity,
        type: 'child-post',
        childId: 1,
        payload: { bytes: Uint8Array.of(7), port: channel.port2 },
      },
      [channel.port2],
    );
  },
  { once: true },
);
