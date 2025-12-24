function safeStringify(value) {
  try {
    if (Buffer.isBuffer(value)) {
      return `[Buffer len=${value.length}]`;
    }
    return JSON.stringify(value);
  } catch {
    return '[Unserializable]';
  }
}

function redactHeaders(headers) {
  const h = { ...headers };
  const redactKeys = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-internal-token',
    'x-api-key',
    'stripe-signature',
  ];

  for (const k of redactKeys) {
    if (h[k]) h[k] = '***';
  }

  return h;
}

function buildBodySummary(body) {
  if (body === undefined) return { type: 'undefined', size: 0, preview: null };
  if (body === null) return { type: 'null', size: 0, preview: null };

  if (Buffer.isBuffer(body)) {
    return { type: 'buffer', size: body.length, preview: `[Buffer len=${body.length}]` };
  }

  if (typeof body === 'string') {
    const preview = body.length > 2000 ? body.slice(0, 2000) + '…' : body;
    return { type: 'string', size: body.length, preview };
  }

  const s = safeStringify(body);
  const preview = s.length > 2000 ? s.slice(0, 2000) + '…' : s;
  return { type: typeof body, size: s.length, preview };
}

module.exports = function requestLogger() {
  return function (req, res, next) {
    const startedAt = Date.now();
    const debug =
      process.env.LOG_HTTP === '1' ||
      req.headers['x-debug-log'] === '1' ||
      req.query.debug === '1';

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const line = `[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`;

      if (!debug) {
        console.log(line);
        return;
      }

      const headers = redactHeaders(req.headers || {});
      const bodySummary = buildBodySummary(req.body);

      console.log(line);
      console.log(`[HTTP] headers=${safeStringify(headers)}`);
      console.log(`[HTTP] body.type=${bodySummary.type} body.size=${bodySummary.size}`);
      if (bodySummary.preview) {
        console.log(`[HTTP] body.preview=${bodySummary.preview}`);
      }
    });

    next();
  };
};
