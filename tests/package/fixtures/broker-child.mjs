self.addEventListener('message', ({ data }) => {
  data.port.postMessage('port-ack');
  self.postMessage({ value: data.bytes[0], port: data.port }, [data.port]);
}, { once: true });
