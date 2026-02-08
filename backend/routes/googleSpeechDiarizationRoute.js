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
 * Mounted at: app.use('/googleSpeech', router)
 *
 * Endpoints:
 *   GET  /googleSpeech/health
 *   POST /googleSpeech/diarize/start
 *   GET  /googleSpeech/diarize/operation?name=...
 *   GET  /googleSpeech/diarize/result?name=...
 */

// ------------------------------
// Config (ENV)
// ------------------------------
const GCP_PROJECT_ID =
  process.env.GCP_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;

const GCP_SPEECH_REGION = process.env.GCP_SPEECH_REGION || 'us';
const GCP_SPEECH_RECOGNIZER = process.env.GCP_SPEECH_RECOGNIZER || '_'; // implicit recognizer
const GCP_GCS_BUCKET = process.env.GCP_GCS_BUCKET; // required
const GCS_PREFIX = (process.env.GCS_PREFIX || 'minutesai/googleSpeech').replace(/^\/+|\/+$/g, ''); // no leading/trailing '/'

function requireEnv() {
  const missing = [];
  if (!GCP_PROJECT_ID) missing.push('GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT)');
  if (!GCP_GCS_BUCKET) missing.push('GCP_GCS_BUCKET');
  if (missing.length) {
    throw new Error(`Missing ENV: ${missing.join(', ')}`);
  }
}

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
 *   operationName -> {
 *     createdAt,
 *     inputGsUri,
 *     outputPrefixGsUri,
 *     outputGsUri   // (resolved exact output object uri when available)
 *   }
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function safeFileBase(name) {
  const s = String(name || 'audio').replace(/[^\w.\-]+/g, '_');
  return s.slice(0, 80) || 'audio';
}

// ------------------------------
// Health
// ------------------------------
router.get('/health', (req, res) => {
  return res.json({ ok: true });
});

// ------------------------------
// start (REAL)
// ------------------------------
/**
 * POST /diarize/start
 * multipart:
 *   file: audio file
 *   languageCodes: "ja-JP,en-US" (optional)
 *   minSpeakerCount: "2" (optional; v2 may ignore but harmless)
 *   maxSpeakerCount: "5" (optional; v2 may ignore but harmless)
 *   enableWordTimeOffsets: "true" (optional; default true)
 *   model: "latest_long" (optional)
 *
 * Flow:
 *  1) Upload audio to GCS -> inputGsUri
 *  2) Speech-to-Text v2 batchRecognize -> operationName
 *  3) Store meta (outputPrefix) so result endpoint can fetch later
 */
router.post('/diarize/start', upload.single('file'), async (req, res) => {
  sweepStores();

  const filePath = req.file?.path;

  try {
    requireEnv();
    if (!req.file) return json(res, 400, { error: 'file is required (field name: file)' });

    const languageCodes = String(req.body.languageCodes || 'ja-JP,en-US')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const minSpeakerCount = parseInt(String(req.body.minSpeakerCount || '2'), 10);
    const maxSpeakerCount = parseInt(String(req.body.maxSpeakerCount || '5'), 10);

    const enableWordTimeOffsets = String(req.body.enableWordTimeOffsets || 'true').toLowerCase() === 'true';
    const model = String(req.body.model || 'latest_long').trim() || 'latest_long';

    const authorization = await getAuthorizationHeader();
    if (!authorization) return json(res, 500, { error: 'failed to get authorization' });

    // 1) upload input audio to GCS
    const ct = req.file.mimetype || 'application/octet-stream';
    const base = safeFileBase(req.file.originalname || req.file.filename);
    const inputObject = `${GCS_PREFIX}/inputs/${Date.now()}_${base}`;
    const inputGsUri = await uploadLocalFileToGcs({
      filePath,
      bucket: GCP_GCS_BUCKET,
      objectName: inputObject,
      contentType: ct,
      authorization,
    });

    // 2) output prefix
    // NOTE: v2 outputConfig uri is "prefix". Use trailing '/' to avoid ambiguity.
    const outputPrefixObject = `${GCS_PREFIX}/outputs/${Date.now()}_${base}/`;
    const outputPrefixGsUri = `gs://${GCP_GCS_BUCKET}/${outputPrefixObject}`;

    // 3) Speech v2 batchRecognize
    const recognizer = `projects/${GCP_PROJECT_ID}/locations/${GCP_SPEECH_REGION}/recognizers/${GCP_SPEECH_RECOGNIZER}`;
    const op = await callBatchRecognize({
      recognizer,
      authorization,
      inputGsUri,
      outputPrefixGsUri,
      languageCodes,
      model,
      enableWordTimeOffsets,
      minSpeakerCount,
      maxSpeakerCount,
    });

    const operationName = String(op?.name || '').trim();
    if (!operationName) {
      return json(res, 502, { error: 'batchRecognize returned no operation name', raw: op });
    }

    opMetaStore.set(operationName, {
      createdAt: now(),
      inputGsUri,
      outputPrefixGsUri,
      outputGsUri: null, // resolved later
    });

    return json(res, 200, {
      operationName,
      inputGsUri,
      outputPrefixGsUri,
    });

  } catch (e) {
    console.error('[diarize/start] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  } finally {
    safeUnlink(filePath);
  }
});

// ------------------------------
// operation polling (proxy + resolve output uri)
// ------------------------------
router.get('/diarize/operation', async (req, res) => {
  sweepStores();

  try {
    requireEnv();

    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

    const authorization = await getAuthorizationHeader();
    if (!authorization) return json(res, 500, { error: 'failed to get authorization' });

    // Speech-to-Text v2 Operations.get:
    // GET https://speech.googleapis.com/v2/{name=projects/*/locations/*/operations/*}
    const url = `https://speech.googleapis.com/v2/${name}`;
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
      },
    });

    const text = await r.text();
    if (looksLikeHtml(text)) {
      return json(res, 502, { error: 'upstream returned html', upstreamStatus: r.status });
    }

    // Best-effort: if done, extract output gs:// uri from metadata and store
    try {
      const opObj = JSON.parse(text);
      if (opObj && opObj.done === true) {
        const uris = extractGsUrisFromOperation(opObj);
        const chosen = chooseBestOutputUri(uris);
        if (chosen) {
          const meta = opMetaStore.get(name) || { createdAt: now() };
          meta.outputGsUri = chosen;
          // keep existing fields if any
          opMetaStore.set(name, { ...meta });
        }
      }
    } catch {}

    res.status(r.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);

  } catch (e) {
    console.error('[diarize/operation] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  }
});

// ------------------------------
// result
// ------------------------------
/**
 * GET /diarize/result?name=operationName
 *
 * - Always returns JSON
 * - If cached -> return
 * - Else:
 *   - resolve outputGsUri (exact object) from:
 *       1) opMetaStore[name].outputGsUri
 *       2) operation metadata (fetch operation once)
 *       3) list objects by outputPrefix and pick a json/jsonl
 *   - download transcript json from GCS (alt=media)
 *   - parse -> segments/fullText
 *   - cache -> return
 */
router.get('/diarize/result', async (req, res) => {
  sweepStores();

  try {
    requireEnv();

    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

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
      return json(res, v.ok ? 200 : 404, v);
    }

    const p = (async () => {
      const authorization = await getAuthorizationHeader();
      if (!authorization) {
        return { ok: false, name, error: 'failed to get authorization' };
      }

      const meta = opMetaStore.get(name) || null;

      // 1) already resolved exact output uri?
      let outputGsUri = meta?.outputGsUri || null;
      let outputPrefixGsUri = meta?.outputPrefixGsUri || null;

      // 2) try fetch operation metadata once to resolve output uri
      if (!outputGsUri) {
        try {
          const opObj = await fetchOperationObject(name, authorization);
          const uris = extractGsUrisFromOperation(opObj);
          const chosen = chooseBestOutputUri(uris);
          if (chosen) outputGsUri = chosen;

          // If still not, maybe we can store outputPrefix from previous meta
          // (no-op)
        } catch {}
      }

      // 3) fallback: list objects by outputPrefix
      if (!outputGsUri) {
        if (!outputPrefixGsUri) {
          return {
            ok: false,
            name,
            error: 'output not resolvable: missing outputPrefixGsUri in server store (did you call /start on this instance?)'
          };
        }

        // Sometimes GCS write lags behind done=true slightly -> retry a few times
        const resolved = await resolveOutputUriFromPrefixWithRetry(outputPrefixGsUri, authorization);
        if (!resolved) {
          return {
            ok: false,
            name,
            error: 'output file not found yet under outputPrefix (try again)',
            outputPrefixGsUri,
          };
        }
        outputGsUri = resolved;
      }

      // Persist meta (best-effort)
      opMetaStore.set(name, {
        ...(meta || { createdAt: now() }),
        outputPrefixGsUri: outputPrefixGsUri || meta?.outputPrefixGsUri || null,
        outputGsUri,
      });

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
          // keep it small-ish
          kind: Array.isArray(rawJson) ? 'array' : typeof rawJson,
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

    return json(res, payload.ok ? 200 : 404, payload);

  } catch (e) {
    console.error('[diarize/result] error:', e?.message || e);
    return json(res, 500, { ok: false, error: e?.message || 'unknown error' });
  } finally {
    inFlight.delete(String(req.query.name || '').trim());
  }
});

// ------------------------------
// Helpers: Speech v2 call
// ------------------------------
async function callBatchRecognize({
  recognizer,
  authorization,
  inputGsUri,
  outputPrefixGsUri,
  languageCodes,
  model,
  enableWordTimeOffsets,
  minSpeakerCount,
  maxSpeakerCount,
}) {
  // Speech-to-Text v2 batchRecognize:
  // POST https://speech.googleapis.com/v2/{recognizer=projects/*/locations/*/recognizers/*}:batchRecognize
  const url = `https://speech.googleapis.com/v2/${recognizer}:batchRecognize`;

  const body = {
    config: {
      // union decodingConfig: set autoDecodingConfig to let backend infer encoding
      autoDecodingConfig: {},
      languageCodes: Array.isArray(languageCodes) && languageCodes.length ? languageCodes : ['ja-JP', 'en-US'],
      model: model || 'latest_long',
      features: {
        enableWordTimeOffsets: !!enableWordTimeOffsets,
        enableAutomaticPunctuation: true,
        // diarizationConfig: enable diarization (SpeakerDiarizationConfig)
        // v2 note: min/max may be ignored, but harmless.
        diarizationConfig: {
          minSpeakerCount: Number.isFinite(minSpeakerCount) ? minSpeakerCount : 2,
          maxSpeakerCount: Number.isFinite(maxSpeakerCount) ? maxSpeakerCount : 5,
        },
      },
    },
    files: [
      { uri: inputGsUri }
    ],
    recognitionOutputConfig: {
      gcsOutputConfig: {
        uri: outputPrefixGsUri
      }
    }
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`batchRecognize failed: ${r.status} ${text.slice(0, 800)}`);
  }
  if (looksLikeHtml(text)) {
    throw new Error(`batchRecognize returned html (unexpected)`);
  }

  return JSON.parse(text);
}

async function fetchOperationObject(operationName, authorization) {
  const url = `https://speech.googleapis.com/v2/${operationName}`;
  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`operation get failed: ${r.status} ${text.slice(0, 800)}`);
  }
  return JSON.parse(text);
}

function extractGsUrisFromOperation(opObj) {
  const out = new Set();

  // Typical: opObj.metadata.transcriptionMetadata is a map, values include { uri: "gs://..." }
  const tm = opObj?.metadata?.transcriptionMetadata;
  if (tm && typeof tm === 'object') {
    for (const k of Object.keys(tm)) {
      const v = tm[k];
      if (v && typeof v === 'object') {
        const u = v.uri || v.outputUri || v.resultUri;
        if (typeof u === 'string' && u.startsWith('gs://')) out.add(u);
      }
      if (typeof v === 'string' && v.startsWith('gs://')) out.add(v);
    }
  }

  // Fallback: deep scan any string "gs://..."
  (function scan(x) {
    if (!x) return;
    if (typeof x === 'string') {
      if (x.startsWith('gs://')) out.add(x);
      return;
    }
    if (Array.isArray(x)) {
      for (const a of x) scan(a);
      return;
    }
    if (typeof x === 'object') {
      for (const key of Object.keys(x)) scan(x[key]);
    }
  })(opObj);

  return Array.from(out);
}

function chooseBestOutputUri(uris) {
  if (!Array.isArray(uris) || uris.length === 0) return null;

  // Prefer json/jsonl
  const prefer = uris.find(u => /\.jsonl?(\?|$)/i.test(u));
  if (prefer) return prefer;

  // Otherwise pick first gs:// that isn't obviously input audio
  const nonAudio = uris.find(u => !/\.(wav|mp3|m4a|flac)(\?|$)/i.test(u));
  return nonAudio || uris[0];
}

// ------------------------------
// Helpers: GCS upload / download / list
// ------------------------------
function parseGsUri(gsUri) {
  const s = String(gsUri || '').trim();
  if (!s.startsWith('gs://')) return null;
  const rest = s.slice('gs://'.length);
  const idx = rest.indexOf('/');
  if (idx <= 0) return null;
  return { bucket: rest.slice(0, idx), object: rest.slice(idx + 1) };
}

async function uploadLocalFileToGcs({ filePath, bucket, objectName, contentType, authorization }) {
  const encodedName = encodeURIComponent(objectName);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedName}`;

  const stream = fs.createReadStream(filePath);

  // Node fetch (undici) needs duplex when streaming request body
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': contentType || 'application/octet-stream',
      'Accept': 'application/json',
    },
    body: stream,
    duplex: 'half',
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`gcs upload failed: ${r.status} ${text.slice(0, 800)}`);
  }

  return `gs://${bucket}/${objectName}`;
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
    throw new Error(`gcs download failed: ${r.status} ${text.slice(0, 800)}`);
  }
  return text;
}

async function listGcsObjectsByPrefix(gsPrefixGsUri, authorization) {
  const p = parseGsUri(gsPrefixGsUri);
  if (!p) throw new Error(`invalid gsUri prefix: ${gsPrefixGsUri}`);

  const bucket = p.bucket;
  const prefix = p.object; // may include trailing '/'

  const qs = new URLSearchParams({
    prefix,
    maxResults: '50',
  });

  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?${qs.toString()}`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`gcs list failed: ${r.status} ${text.slice(0, 800)}`);
  }
  const obj = JSON.parse(text);
  const items = Array.isArray(obj.items) ? obj.items : [];
  return items.map(it => it && it.name ? String(it.name) : '').filter(Boolean);
}

async function resolveOutputUriFromPrefixWithRetry(outputPrefixGsUri, authorization) {
  // retry a few times (GCS write lag)
  for (let i = 0; i < 5; i++) {
    const names = await listGcsObjectsByPrefix(outputPrefixGsUri, authorization);
    const pick =
      names.find(n => /\.jsonl$/i.test(n)) ||
      names.find(n => /\.json$/i.test(n)) ||
      null;

    if (pick) {
      const p = parseGsUri(outputPrefixGsUri);
      return `gs://${p.bucket}/${pick}`;
    }
    await sleep(1500);
  }
  return null;
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
      if (cur.startSec == null && w.startSec != null) cur.startSec = w.startSec;
      if (w.endSec != null) cur.endSec = w.endSec;
    }
  }
  if (cur) segments.push(cur);

  const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
  return { segments, fullText };
}

module.exports = router;
