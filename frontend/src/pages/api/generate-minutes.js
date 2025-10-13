// pages/api/generate-minutes.js
export default async function handler(req, res) {
  const BACKEND_BASE =
    process.env.BACKEND_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'https://sense-website-production.up.railway.app'; // 最後の砦

  if (!BACKEND_BASE) {
    return res.status(500).json({ error: 'BACKEND_BASE is not set' });
  }

  const url = `${BACKEND_BASE.replace(/\/+$/, '')}/api/generate-minutes`;

  // ---- 長文でも欠落しないチャンクロガー ----
  const logLong = (label, value, size = 8000) => {
    try {
      const s =
        typeof value === 'string'
          ? value
          : JSON.stringify(value, null, 2);
      console.log(`${label} len=${s?.length ?? 0} >>> BEGIN`);
      if (s) {
        for (let i = 0; i < s.length; i += size) {
          console.log(`${label} [${i}-${Math.min(i + size, s.length)}]\n${s.slice(i, i + size)}`);
        }
      }
      console.log(`${label} <<< END`);
    } catch (e) {
      console.log(`${label} (failed to stringify):`, e?.message || e);
    }
  };

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 送信前に transcript を任意でログ
    if (process.env.LOG_PROXY_TRANSCRIPT === '1') {
      const maybeTranscript =
        (req.body && (req.body.transcript || req.body.Transcript)) || null;
      if (maybeTranscript) logLong('[PROXY TRANSCRIPT]', maybeTranscript);
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    });

    // バックエンドのステータスをそのまま返す
    const text = await r.text();

    // minutes を任意でログ（JSON想定・失敗しても無視）
    if (process.env.LOG_PROXY_MINUTES === '1') {
      try {
        const parsed = JSON.parse(text);
        const minutes =
          parsed?.minutes ??
          parsed?.data?.minutes ??
          (typeof parsed === 'string' ? parsed : null);
        if (minutes) logLong('[PROXY GENERATED_MINUTES]', minutes);
      } catch {
        // 応答が純テキストの場合でも一応ログ
        logLong('[PROXY GENERATED_MINUTES (raw)]', text);
      }
    }

    res.status(r.status).send(text);
  } catch (e) {
    console.error('[proxy /api/generate-minutes] error:', e);
    res.status(502).json({ error: 'Bad Gateway', details: String(e) });
  }
}
