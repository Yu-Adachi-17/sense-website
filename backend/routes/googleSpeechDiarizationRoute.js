// routes/googleSpeechDiarizationRoute.js
'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { getAuthorizationHeader } = require('../services/googleAuth');

const router = express.Router();

/**
 * Important:
 * - This router is mounted at: app.use('/googleSpeech', router)
 * - So endpoints become:
 *   /googleSpeech/health
 *   /googleSpeech/diarize/start
 *   /googleSpeech/diarize/operation
 *   /googleSpeech/diarize/result
 */

// ------------------------------
// Upload (avoid memoryStorage)
// ------------------------------
const tempDir = path.join(os.tmpdir(), 'minutesai_googleSpeech');
try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempDir),
    filename: (req, file, cb) => {
      const safe = String(file.originalname || 'audio')
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 120);
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ------------------------------
// In-memory stores (PoC OK)
// ------------------------------
/**
 * opMetaStore:
 *   operationName -> { outputGsUri, createdAt }
 *
 * resultStore:
 *   operationName -> { fullText, segments, raw, createdAt }
 *
 * inFlight:
 *   operationName -> Promise that resolves to result (avoid double fetch)
 */
const opMetaStore = new Map();
const resultStore = new Map();
const inFlight = new Map();

// TTL (PoC): 30min
const TTL_MS = 30 * 60 * 1000;

function now() { return Date.now(); }
function isExpired(ts) { return (now() - ts) > TTL_MS; }

function sweepStores() {
  for (const [k, v] of opMetaStore.entries()) {
    if (!v || !v.createdAt || isExpired(v.createdAt)) opMetaStore.delete(k);
  }
  for (const [k, v] of resultStore.entries()) {
    if (!v || !v.createdAt || isExpired(v.createdAt)) resultStore.delete(k);
  }
}

function json(res, status, obj) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(JSON.stringify(obj));
}

function looksLikeHtml(text) {
  const t = String(text || '').trim().toLowerCase();
  return t.startsWith('<!doctype html') || t.startsWith('<html') || t.includes('<div id="root"');
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); } catch {}
}

// ------------------------------
// Health
// ------------------------------
router.get('/health', (req, res) => {
  return res.json({ ok: true });
});

// ------------------------------
// start
// ------------------------------
/**
 * Expected behavior:
 * - receive multipart "file"
 * - upload to GCS
 * - call Speech v2 batchRecognize
 * - return { operationName, outputGsUri }
 *
 * For now, even if you keep dummy-operation,
 * we store dummy output to make /result always JSON (no HTML).
 */
router.post('/diarize/start', upload.single('file'), async (req, res) => {
  sweepStores();

  const filePath = req.file?.path;
  try {
    if (!req.file) return json(res, 400, { error: 'file is required (field name: file)' });

    // NOTE: you may accept params from form fields as needed
    // const languageCodes = String(req.body.languageCodes || 'ja-JP,en-US');

    // ------------------------------------------------------------
    // TODO: Replace with real implementation:
    // 1) upload req.file.path to GCS -> get inputGsUri
    // 2) batchRecognize -> get operationName + outputGsUri (gs://bucket/object.json)
    // ------------------------------------------------------------

    // Dummy for PoC wiring
    const operationName = 'dummy-operation';
    const outputGsUri = 'gs://dummy-bucket/dummy-transcript.json';

    opMetaStore.set(operationName, { outputGsUri, createdAt: now() });

    // (Optional) Seed a dummy result so client can see non-HTML JSON
    if (!resultStore.has(operationName)) {
      resultStore.set(operationName, {
        fullText: '',
        segments: [],
        raw: { ok: true, dummy: true },
        createdAt: now()
      });
    }

    return json(res, 200, { operationName, outputGsUri });
  } catch (e) {
    console.error('[diarize/start] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  } finally {
    // Always cleanup uploaded temp file
    safeUnlink(filePath);
  }
});

// ------------------------------
// operation polling
// ------------------------------
router.get('/diarize/operation', async (req, res) => {
  sweepStores();

  try {
    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

    // dummy -> always JSON
    if (name === 'dummy-operation') {
      return json(res, 200, { done: true, name, response: { ok: true } });
    }

    const authorization = await getAuthorizationHeader();
    if (!authorization) return json(res, 500, { error: 'failed to get authorization' });

    const url = `https://us-speech.googleapis.com/v2/${name}`;
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
      },
    });

    const text = await r.text();

    if (looksLikeHtml(text)) {
      // Should never happen from Google, but guard
      return json(res, 502, { error: 'upstream returned html', upstreamStatus: r.status });
    }

    // Pass-through as JSON text (already JSON string)
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (e) {
    console.error('[diarize/operation] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  }
});

// ------------------------------
// result (NEW)
// ------------------------------
/**
 * GET /diarize/result?name=operationName
 *
 * - Always returns JSON
 * - If cached -> return
 * - Else:
 *   - determine outputGsUri (from store or query outputGsUri)
 *   - download transcript json from GCS (Storage JSON API alt=media)
 *   - parse -> segments/fullText
 *   - cache -> return
 */
router.get('/diarize/result', async (req, res) => {
  sweepStores();

  try {
    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

    // dummy -> always JSON (avoid HTML fallback)
    if (name === 'dummy-operation') {
      const cached = resultStore.get(name);
      if (cached) {
        return json(res, 200, {
          ok: true,
          name,
          fullText: cached.fullText || '',
          segments: Array.isArray(cached.segments) ? cached.segments : [],
          raw: cached.raw || null,
        });
      }
      return json(res, 200, { ok: true, name, fullText: '', segments: [], raw: { ok: true, dummy: true } });
    }

    // If cached result exists, return immediately
    const cached = resultStore.get(name);
    if (cached && cached.createdAt && !isExpired(cached.createdAt)) {
      return json(res, 200, {
        ok: true,
        name,
        fullText: cached.fullText || '',
        segments: Array.isArray(cached.segments) ? cached.segments : [],
        raw: cached.raw || null,
      });
    }

    // Deduplicate concurrent fetches
    if (inFlight.has(name)) {
      const v = await inFlight.get(name);
      return json(res, 200, v);
    }

    const p = (async () => {
      // Determine outputGsUri: prefer query -> store
      const outputFromQuery = String(req.query.outputGsUri || '').trim();
      const meta = opMetaStore.get(name);

      const outputGsUri = outputFromQuery || meta?.outputGsUri;
      if (!outputGsUri) {
        return {
          ok: false,
          name,
          error: 'outputGsUri not found for this operation. start must store outputGsUri or pass outputGsUri query',
        };
      }

      const authorization = await getAuthorizationHeader();
      if (!authorization) {
        return { ok: false, name, error: 'failed to get authorization' };
      }

      const transcriptText = await downloadGcsAltMedia(outputGsUri, authorization);
      if (looksLikeHtml(transcriptText)) {
        return { ok: false, name, error: 'gcs returned html (unexpected)', outputGsUri };
      }

      const rawJson = parseJsonOrJsonl(transcriptText);
      const { segments, fullText } = extractDiarization(rawJson);

      const payload = {
        ok: true,
        name,
        outputGsUri,
        fullText: fullText || '',
        segments: Array.isArray(segments) ? segments : [],
        raw: {
          // keep it small-ish; store only a summary marker
          type: Array.isArray(rawJson) ? 'array' : typeof rawJson,
          hasResults: !!(rawJson && rawJson.results),
        },
      };

      resultStore.set(name, {
        fullText: payload.fullText,
        segments: payload.segments,
        raw: payload.raw,
        createdAt: now(),
      });

      return payload;
    })();

    inFlight.set(name, p);

    const payload = await p;
    inFlight.delete(name);

    // If error, return 404/500-ish as JSON (client wants JSON always)
    if (!payload.ok) {
      return json(res, 404, payload);
    }
    return json(res, 200, payload);

  } catch (e) {
    console.error('[diarize/result] error:', e?.message || e);
    return json(res, 500, { ok: false, error: e?.message || 'unknown error' });
  } finally {
    inFlight.delete(String(req.query.name || '').trim());
  }
});

// ------------------------------
// Helpers: GCS download
// ------------------------------
function parseGsUri(gsUri) {
  const s = String(gsUri || '').trim();
  if (!s.startsWith('gs://')) return null;
  const rest = s.slice('gs://'.length);
  const idx = rest.indexOf('/');
  if (idx <= 0) return null;
  return { bucket: rest.slice(0, idx), object: rest.slice(idx + 1) };
}

async function downloadGcsAltMedia(gsUri, authorization) {
  const p = parseGsUri(gsUri);
  if (!p) throw new Error(`invalid gsUri: ${gsUri}`);

  // encode object fully (slashes -> %2F)
  const encodedObject = encodeURIComponent(p.object);
  const url = `https://storage.googleapis.com/storage/v1/b/${p.bucket}/o/${encodedObject}?alt=media`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`gcs download failed: ${r.status} ${text.slice(0, 400)}`);
  }
  return text;
}

// ------------------------------
// Helpers: JSON / JSONL parse
// ------------------------------
function parseJsonOrJsonl(text) {
  const t = String(text || '').trim();
  if (!t) return null;

  try {
    return JSON.parse(t);
  } catch {}

  // JSON Lines fallback
  const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
  const arr = [];
  for (const line of lines) {
    try { arr.push(JSON.parse(line)); } catch {}
  }
  if (arr.length > 0) return arr;

  throw new Error('transcript is not valid json/jsonl');
}

// ------------------------------
// Helpers: diarization extraction
// ------------------------------
function durationToSec(v) {
  if (v == null) return null;

  // "1.230s"
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.endsWith('s')) {
      const n = Number(s.slice(0, -1));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // { seconds: "1", nanos: 230000000 }
  if (typeof v === 'object') {
    const sec = v.seconds != null ? Number(v.seconds) : 0;
    const nanos = v.nanos != null ? Number(v.nanos) : 0;
    if (Number.isFinite(sec) && Number.isFinite(nanos)) {
      return sec + nanos / 1e9;
    }
  }

  // number
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }

  return null;
}

function normalizeSpeaker(wordInfo) {
  // Speech v2 diarization: speakerLabel (string) or speakerTag (number)
  if (!wordInfo || typeof wordInfo !== 'object') return 'Unknown';

  const a = wordInfo.speakerLabel;
  if (typeof a === 'string' && a.trim()) return a.trim();

  const b = wordInfo.speakerTag;
  if (typeof b === 'number' && Number.isFinite(b)) return `Speaker ${b}`;

  const c = wordInfo.speaker;
  if (typeof c === 'string' && c.trim()) return c.trim();

  return 'Unknown';
}

function normalizeWord(wordInfo) {
  if (!wordInfo || typeof wordInfo !== 'object') return '';
  const w = wordInfo.word;
  if (typeof w === 'string') return w;
  const alt = wordInfo.text;
  if (typeof alt === 'string') return alt;
  return '';
}

function normalizeStartEnd(wordInfo) {
  if (!wordInfo || typeof wordInfo !== 'object') return { startSec: null, endSec: null };

  // v2 word: startOffset/endOffset
  const s1 = durationToSec(wordInfo.startOffset);
  const e1 = durationToSec(wordInfo.endOffset);

  // other variants
  const s2 = durationToSec(wordInfo.startTime);
  const e2 = durationToSec(wordInfo.endTime);

  return {
    startSec: s1 ?? s2 ?? null,
    endSec: e1 ?? e2 ?? null,
  };
}

function collectResultsObjects(rawJson) {
  // rawJson can be object OR array (jsonl)
  const out = [];
  if (!rawJson) return out;

  if (Array.isArray(rawJson)) {
    for (const item of rawJson) {
      if (item && typeof item === 'object') out.push(item);
    }
    return out;
  }

  if (typeof rawJson === 'object') {
    out.push(rawJson);
    return out;
  }

  return out;
}

function extractDiarization(rawJson) {
  const objs = collectResultsObjects(rawJson);

  // Collect all word entries across all results
  const words = [];

  for (const obj of objs) {
    const results = Array.isArray(obj?.results) ? obj.results : null;
    if (!results) continue;

    for (const r of results) {
      const alts = Array.isArray(r?.alternatives) ? r.alternatives : null;
      if (!alts || alts.length === 0) continue;

      const first = alts[0];
      const wArr = Array.isArray(first?.words) ? first.words : null;
      if (!wArr) continue;

      for (const w of wArr) {
        const word = normalizeWord(w);
        if (!word) continue;

        const speaker = normalizeSpeaker(w);
        const { startSec, endSec } = normalizeStartEnd(w);

        words.push({ speaker, word, startSec, endSec });
      }
    }
  }

  // Merge consecutive words by speaker into segments
  const segments = [];
  let cur = null;

  for (const w of words) {
    if (!cur || cur.speaker !== w.speaker) {
      if (cur) segments.push(cur);
      cur = {
        speaker: w.speaker,
        text: w.word,
        startSec: w.startSec ?? null,
        endSec: w.endSec ?? null,
      };
    } else {
      cur.text += ` ${w.word}`;
      // extend timing
      if (cur.startSec == null && w.startSec != null) cur.startSec = w.startSec;
      if (w.endSec != null) cur.endSec = w.endSec;
    }
  }
  if (cur) segments.push(cur);

  // Full text (simple readable)
  const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  return { segments, fullText };
}

module.exports = router;
