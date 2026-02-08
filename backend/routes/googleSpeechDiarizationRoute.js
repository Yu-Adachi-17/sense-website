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

// IMPORTANT: v2 Chirp 3 examples commonly use locations/global.
// Keep env name for compatibility, but default to 'global'.
const GCP_SPEECH_REGION = process.env.GCP_SPEECH_REGION || 'global';
const GCP_SPEECH_RECOGNIZER = process.env.GCP_SPEECH_RECOGNIZER || '_'; // implicit recognizer

const GCP_GCS_BUCKET = process.env.GCP_GCS_BUCKET; // required
const GCS_PREFIX = (process.env.GCS_PREFIX || 'minutesai/googleSpeech').replace(/^\/+|\/+$/g, '');

const DEFAULT_V2_MODEL = (process.env.GCP_SPEECH_MODEL_DEFAULT || 'chirp_3').trim() || 'chirp_3';
// v1 is used ONLY as fallback diarization provider when v2 batchRecognize rejects diarizationConfig.
const DEFAULT_V1_MODEL = (process.env.GCP_SPEECH_V1_MODEL_DEFAULT || 'latest_long').trim() || 'latest_long';

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
 *   v2OperationName -> {
 *     createdAt,
 *     inputGsUri,
 *     outputPrefixGsUri,
 *     outputGsUri,         // resolved exact output object uri when available
 *     v2Model,
 *     v2TriedDiarization,  // true if we attempted diarizationConfig on v2
 *     v2HasSpeakerLabels,  // true if v2 output contains speakerLabel
 *     v1OperationName,     // set only when we run v1 fallback diarization
 *     v1Model,
 *   }
 *
 * resultStore:
 *   v2OperationName -> { fullText, segments, raw, createdAt }
 *
 * inFlight:
 *   v2OperationName -> Promise that resolves to result (avoid double fetch)
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

function isV2DiarizationUnsupportedErrorMessage(msg) {
  const m = String(msg || '').toLowerCase();
  // Match the exact style you are seeing:
  // - "Config contains unsupported fields"
  // - "features.diarization_config"
  // - "Recognizer does not support feature: speaker_diarization"
  if (m.includes('config contains unsupported fields')) return true;
  if (m.includes('features.diarization_config')) return true;
  if (m.includes('speaker_diarization')) return true;
  return false;
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
 *   minSpeakerCount: "2" (optional)
 *   maxSpeakerCount: "5" (optional)
 *   enableWordTimeOffsets: "true" (optional; default true)
 *   model: "chirp_3" (optional; default chirp_3)
 *
 * Flow:
 *  1) Upload audio to GCS -> inputGsUri
 *  2) Speech-to-Text v2 batchRecognize (model default: chirp_3)
 *     - First try with diarizationConfig
 *     - If v2 rejects diarizationConfig, retry v2 without diarizationConfig
 *       AND run v1 longrunningrecognize to get speaker tags
 *  3) Store meta so result endpoint can fetch later
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
    const v2Model = String(req.body.model || DEFAULT_V2_MODEL).trim() || DEFAULT_V2_MODEL;

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
    const outputPrefixObject = `${GCS_PREFIX}/outputs/${Date.now()}_${base}/`;
    const outputPrefixGsUri = `gs://${GCP_GCS_BUCKET}/${outputPrefixObject}`;

    // 3) v2 batchRecognize
    const recognizer = `projects/${GCP_PROJECT_ID}/locations/${GCP_SPEECH_REGION}/recognizers/${GCP_SPEECH_RECOGNIZER}`;

    let v2Op = null;
    let v2OperationName = '';
    let v2TriedDiarization = true;

    // (A) First try: v2 with diarizationConfig
    try {
      v2Op = await callBatchRecognizeV2({
        recognizer,
        authorization,
        inputGsUri,
        outputPrefixGsUri,
        languageCodes,
        model: v2Model,
        enableWordTimeOffsets,
        minSpeakerCount,
        maxSpeakerCount,
        enableV2Diarization: true,
      });
    } catch (e) {
      const msg = e?.message || String(e || '');
      if (!isV2DiarizationUnsupportedErrorMessage(msg)) {
        throw e;
      }
      // (B) Fallback: v2 without diarizationConfig
      v2TriedDiarization = true;
      v2Op = await callBatchRecognizeV2({
        recognizer,
        authorization,
        inputGsUri,
        outputPrefixGsUri,
        languageCodes,
        model: v2Model,
        enableWordTimeOffsets,
        minSpeakerCount,
        maxSpeakerCount,
        enableV2Diarization: false,
      });
    }

    v2OperationName = String(v2Op?.name || '').trim();
    if (!v2OperationName) {
      return json(res, 502, { error: 'v2 batchRecognize returned no operation name', raw: v2Op });
    }

    // If v2 diarization was rejected, start v1 diarization operation in parallel
    let v1OperationName = null;
    let v1Model = null;

    if (v2TriedDiarization && v2Op && !didWeActuallySendV2Diarization(v2Op)) {
      // This path won't happen; we don't have request echo.
      // We decide fallback to v1 by storing a flag below based on the retry case.
    }

    // If we reached here through the retry (enableV2Diarization=false), we should run v1 diarization.
    // Detect by: the last v2 call was without diarizationConfig AND first attempt failed with diarization unsupported.
    // We implement it by setting this boolean when the first attempt failed.
    const shouldRunV1Diarization = (v2Op && v2TriedDiarization) && wasLastV2CallWithoutDiarization(req, v2Model);

    // The above helper is trivial: we can’t detect from req reliably.
    // So instead, we store the decision by catching first failure in a variable.
    // Re-derive cleanly:
    // - If we got here with v2TriedDiarization=true AND the first attempt was rejected -> run v1.
    // We track it explicitly:
    // (Implement explicit tracking)
  } catch (e) {
    console.error('[diarize/start] error (pre-final):', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  } finally {
    safeUnlink(filePath);
  }
});

// The block above needs explicit tracking; implement start route again with explicit variables.
// (Keep code readable by re-defining route with correct logic.)
router.stack = router.stack.filter(r => !(r.route && r.route.path === '/diarize/start')); // remove previous handler

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
    const v2Model = String(req.body.model || DEFAULT_V2_MODEL).trim() || DEFAULT_V2_MODEL;

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
    const outputPrefixObject = `${GCS_PREFIX}/outputs/${Date.now()}_${base}/`;
    const outputPrefixGsUri = `gs://${GCP_GCS_BUCKET}/${outputPrefixObject}`;

    // 3) v2 batchRecognize
    const recognizer = `projects/${GCP_PROJECT_ID}/locations/${GCP_SPEECH_REGION}/recognizers/${GCP_SPEECH_RECOGNIZER}`;

    let v2Op = null;
    let v2TriedDiarization = true;
    let v2DiarizationRejected = false;

    try {
      v2Op = await callBatchRecognizeV2({
        recognizer,
        authorization,
        inputGsUri,
        outputPrefixGsUri,
        languageCodes,
        model: v2Model,
        enableWordTimeOffsets,
        minSpeakerCount,
        maxSpeakerCount,
        enableV2Diarization: true,
      });
    } catch (e) {
      const msg = e?.message || String(e || '');
      if (!isV2DiarizationUnsupportedErrorMessage(msg)) {
        throw e;
      }
      v2DiarizationRejected = true;
      v2Op = await callBatchRecognizeV2({
        recognizer,
        authorization,
        inputGsUri,
        outputPrefixGsUri,
        languageCodes,
        model: v2Model,
        enableWordTimeOffsets,
        minSpeakerCount,
        maxSpeakerCount,
        enableV2Diarization: false,
      });
    }

    const v2OperationName = String(v2Op?.name || '').trim();
    if (!v2OperationName) {
      return json(res, 502, { error: 'v2 batchRecognize returned no operation name', raw: v2Op });
    }

    // 4) If v2 rejected diarization, run v1 diarization in parallel
    let v1OperationName = null;
    let v1Model = null;

    if (v2DiarizationRejected) {
      v1Model = DEFAULT_V1_MODEL;

      // v1 accepts only one languageCode; use the first
      const v1LanguageCode = (Array.isArray(languageCodes) && languageCodes.length)
        ? languageCodes[0]
        : 'ja-JP';

      const v1Op = await callLongRunningRecognizeV1({
        authorization,
        inputGsUri,
        languageCode: v1LanguageCode,
        model: v1Model,
        enableWordTimeOffsets: true,
        minSpeakerCount,
        maxSpeakerCount,
      });

      v1OperationName = String(v1Op?.name || '').trim();
      if (!v1OperationName) {
        // We can still proceed with v2 transcript only, but diarization will be missing.
        // Treat as hard error because your goal is diarization.
        return json(res, 502, { error: 'v1 longrunningrecognize returned no operation name', raw: v1Op });
      }
    }

    opMetaStore.set(v2OperationName, {
      createdAt: now(),
      inputGsUri,
      outputPrefixGsUri,
      outputGsUri: null,
      v2Model,
      v2TriedDiarization: !!v2TriedDiarization,
      v2HasSpeakerLabels: false,
      v1OperationName,
      v1Model,
    });

    return json(res, 200, {
      operationName: v2OperationName,
      inputGsUri,
      outputPrefixGsUri,
      v2: { model: v2Model, triedDiarization: true, diarizationRejected: v2DiarizationRejected },
      v1: v1OperationName ? { operationName: v1OperationName, model: v1Model } : null,
    });

  } catch (e) {
    console.error('[diarize/start] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  } finally {
    safeUnlink(filePath);
  }
});

// ------------------------------
// operation polling (v2 proxy + attach v1 status when exists)
// ------------------------------
router.get('/diarize/operation', async (req, res) => {
  sweepStores();

  try {
    requireEnv();

    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

    const authorization = await getAuthorizationHeader();
    if (!authorization) return json(res, 500, { error: 'failed to get authorization' });

    const meta = opMetaStore.get(name) || null;

    // ✅ v2 Operations.get は location に応じたホストへ
    const baseUrl = speechV2BaseUrlForResourceName(name);
    const url = `${baseUrl}/${name}`;

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

    let opObj = null;
    try { opObj = JSON.parse(text); } catch {}

    // doneなら output gs:// をメタに保存
    try {
      if (opObj && opObj.done === true) {
        const uris = extractGsUrisFromOperation(opObj);
        const chosen = chooseBestOutputUri(uris);
        if (chosen) {
          const cur = opMetaStore.get(name) || { createdAt: now() };
          cur.outputGsUri = chosen;
          opMetaStore.set(name, { ...cur });
        }
      }
    } catch {}

    // v1 status を付加（v1は speech.googleapis.com 固定でOK）
    if (opObj && meta && meta.v1OperationName) {
      try {
        const v1Op = await fetchV1OperationObject(meta.v1OperationName, authorization);
        opObj._v1 = {
          name: meta.v1OperationName,
          done: !!v1Op?.done,
          error: v1Op?.error || null,
        };
      } catch (e) {
        opObj._v1 = {
          name: meta.v1OperationName,
          done: false,
          error: { message: e?.message || 'v1 operation fetch failed' },
        };
      }
    }

    res.status(r.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(opObj || { raw: text }));

  } catch (e) {
    console.error('[diarize/operation] error:', e?.message || e);
    return json(res, 500, { error: e?.message || 'unknown error' });
  }
});


// ------------------------------
// result
// ------------------------------
router.get('/diarize/result', async (req, res) => {
  sweepStores();

  try {
    requireEnv();

    const name = String(req.query.name || '').trim();
    if (!name) return json(res, 400, { error: 'query param "name" is required' });

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

      let outputGsUri = meta?.outputGsUri || null;
      let outputPrefixGsUri = meta?.outputPrefixGsUri || null;

      // Resolve output file
      if (!outputGsUri) {
        try {
          const opObj = await fetchOperationObjectV2(name, authorization);
          const uris = extractGsUrisFromOperation(opObj);
          const chosen = chooseBestOutputUri(uris);
          if (chosen) outputGsUri = chosen;
        } catch {}
      }

      if (!outputGsUri) {
        if (!outputPrefixGsUri) {
          return {
            ok: false,
            name,
            error: 'output not resolvable: missing outputPrefixGsUri in server store (did you call /start on this instance?)'
          };
        }
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

      opMetaStore.set(name, {
        ...(meta || { createdAt: now() }),
        outputPrefixGsUri: outputPrefixGsUri || meta?.outputPrefixGsUri || null,
        outputGsUri,
      });

      // Download v2 transcript json/jsonl
      const transcriptText = await downloadGcsAltMedia(outputGsUri, authorization);
      if (looksLikeHtml(transcriptText)) {
        return { ok: false, name, error: 'gcs returned html (unexpected)', outputGsUri };
      }

      const rawJsonV2 = parseJsonOrJsonl(transcriptText);

      // 1) If v2 contains speakerLabel, use v2 diarization directly
      const v2HasSpeakerLabels = detectV2HasSpeakerLabels(rawJsonV2);

      if (v2HasSpeakerLabels) {
        const { segments, fullText } = extractDiarizationFromWords(extractWordsWithSpeakerFromV2(rawJsonV2));

        const payload = {
          ok: true,
          name,
          outputGsUri,
          fullText: fullText || '',
          segments: Array.isArray(segments) ? segments : [],
          raw: {
            v2: { kind: Array.isArray(rawJsonV2) ? 'array' : typeof rawJsonV2, hasSpeakerLabels: true },
            v1: null,
          },
        };

        resultStore.set(name, { fullText: payload.fullText, segments: payload.segments, raw: payload.raw, createdAt: now() });
        // persist flag
        const cur = opMetaStore.get(name) || { createdAt: now() };
        cur.v2HasSpeakerLabels = true;
        opMetaStore.set(name, { ...cur });

        return payload;
      }

      // 2) Otherwise, expect v1 diarization fallback
      if (!meta || !meta.v1OperationName) {
        return {
          ok: false,
          name,
          error: 'v2 output has no speaker labels, and no v1 diarization op is registered for this name',
          outputGsUri,
        };
      }

      // Fetch v1 operation result (must be done)
      const v1Op = await fetchV1OperationObject(meta.v1OperationName, authorization);
      if (!v1Op || v1Op.done !== true) {
        return {
          ok: false,
          name,
          error: 'v1 diarization not finished yet (try again)',
          v1OperationName: meta.v1OperationName,
        };
      }
      if (v1Op.error) {
        return {
          ok: false,
          name,
          error: 'v1 diarization failed',
          v1OperationName: meta.v1OperationName,
          v1Error: v1Op.error,
        };
      }

      const v1Response = v1Op.response || null;
      if (!v1Response) {
        return {
          ok: false,
          name,
          error: 'v1 done but response missing',
          v1OperationName: meta.v1OperationName,
        };
      }

      // Build diarization segments from v1 (speakerTag + timestamps)
      const diarizationSegments = buildSpeakerSegmentsFromRaw(v1Response);

      // Extract v2 words (timestamps + word)
      const v2Words = extractWordsNoSpeakerFromV2(rawJsonV2);

      // Assign speakers by time
      const mergedWords = assignSpeakersByTime(v2Words, diarizationSegments);

      const { segments, fullText } = extractDiarizationFromWords(mergedWords);

      const payload = {
        ok: true,
        name,
        outputGsUri,
        fullText: fullText || '',
        segments: Array.isArray(segments) ? segments : [],
        raw: {
          v2: { kind: Array.isArray(rawJsonV2) ? 'array' : typeof rawJsonV2, hasSpeakerLabels: false },
          v1: { model: meta.v1Model || DEFAULT_V1_MODEL, diarizationSegments: diarizationSegments.length },
        },
      };

      resultStore.set(name, { fullText: payload.fullText, segments: payload.segments, raw: payload.raw, createdAt: now() });

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
async function callBatchRecognizeV2({
  recognizer,
  authorization,
  inputGsUri,
  outputPrefixGsUri,
  languageCodes,
  model,
  enableWordTimeOffsets,
  minSpeakerCount,
  maxSpeakerCount,
  enableV2Diarization,
}) {
  const baseUrl = speechV2BaseUrlForResourceName(recognizer);
  const url = `${baseUrl}/${recognizer}:batchRecognize`;

  const features = {
    enableWordTimeOffsets: !!enableWordTimeOffsets,
    enableAutomaticPunctuation: true,
  };

  if (enableV2Diarization) {
    features.diarizationConfig = {
      minSpeakerCount: Number.isFinite(minSpeakerCount) ? minSpeakerCount : 2,
      maxSpeakerCount: Number.isFinite(maxSpeakerCount) ? maxSpeakerCount : 5,
    };
  }

  const body = {
    config: {
      autoDecodingConfig: {},
      languageCodes: Array.isArray(languageCodes) && languageCodes.length ? languageCodes : ['ja-JP', 'en-US'],
      model: model || DEFAULT_V2_MODEL,
      features,
    },
    files: [{ uri: inputGsUri }],
    recognitionOutputConfig: {
      gcsOutputConfig: { uri: outputPrefixGsUri }
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
    throw new Error('batchRecognize returned html (unexpected)');
  }

  return JSON.parse(text);
}


async function fetchOperationObjectV2(operationName, authorization) {
  const baseUrl = speechV2BaseUrlForResourceName(operationName);
  const url = `${baseUrl}/${operationName}`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`v2 operation get failed: ${r.status} ${text.slice(0, 800)}`);
  }
  if (looksLikeHtml(text)) {
    throw new Error('v2 operation get returned html (unexpected)');
  }
  return JSON.parse(text);
}


// ------------------------------
// Helpers: Speech v1 diarization (fallback)
// ------------------------------
async function callLongRunningRecognizeV1({
  authorization,
  inputGsUri,
  languageCode,
  model,
  enableWordTimeOffsets,
  minSpeakerCount,
  maxSpeakerCount,
}) {
  const url = 'https://speech.googleapis.com/v1/speech:longrunningrecognize';

  const body = {
    config: {
      languageCode: languageCode || 'ja-JP',
      model: model || DEFAULT_V1_MODEL,
      enableWordTimeOffsets: !!enableWordTimeOffsets,
      enableAutomaticPunctuation: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: Number.isFinite(minSpeakerCount) ? minSpeakerCount : 2,
        maxSpeakerCount: Number.isFinite(maxSpeakerCount) ? maxSpeakerCount : 5,
      }
    },
    audio: {
      uri: inputGsUri
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
    throw new Error(`v1 longrunningrecognize failed: ${r.status} ${text.slice(0, 800)}`);
  }
  if (looksLikeHtml(text)) {
    throw new Error('v1 longrunningrecognize returned html (unexpected)');
  }
  return JSON.parse(text);
}

async function fetchV1OperationObject(operationName, authorization) {
  const name = String(operationName || '').trim();
  if (!name) throw new Error('v1 operationName is empty');

  // v1 op name is typically "operations/...."
  const url = name.startsWith('operations/')
    ? `https://speech.googleapis.com/v1/${name}`
    : `https://speech.googleapis.com/v1/operations/${name}`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`v1 operation get failed: ${r.status} ${text.slice(0, 800)}`);
  }
  if (looksLikeHtml(text)) {
    throw new Error('v1 operation get returned html (unexpected)');
  }
  return JSON.parse(text);
}

// ------------------------------
// Helpers: Operation output uri extract
// ------------------------------
function extractGsUrisFromOperation(opObj) {
  const out = new Set();

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

  const prefer = uris.find(u => /\.jsonl?(\?|$)/i.test(u));
  if (prefer) return prefer;

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
  const prefix = p.object;

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

  const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
  const arr = [];
  for (const line of lines) {
    try { arr.push(JSON.parse(line)); } catch {}
  }
  if (arr.length > 0) return arr;

  throw new Error('transcript is not valid json/jsonl');
}

// ------------------------------
// Helpers: diarization extraction + alignment
// ------------------------------
function durationToSec(v) {
  if (v == null) return null;

  if (typeof v === 'string') {
    const s = v.trim();
    if (s.endsWith('s')) {
      const n = Number(s.slice(0, -1));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  if (typeof v === 'object') {
    const sec = v.seconds != null ? Number(v.seconds) : 0;
    const nanos = v.nanos != null ? Number(v.nanos) : 0;
    if (Number.isFinite(sec) && Number.isFinite(nanos)) {
      return sec + nanos / 1e9;
    }
  }

  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }

  return null;
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

  // v2: startOffset/endOffset
  const s1 = durationToSec(wordInfo.startOffset);
  const e1 = durationToSec(wordInfo.endOffset);

  // v1/v2 variants: startTime/endTime
  const s2 = durationToSec(wordInfo.startTime);
  const e2 = durationToSec(wordInfo.endTime);

  return {
    startSec: s1 ?? s2 ?? null,
    endSec: e1 ?? e2 ?? null,
  };
}

function normalizeSpeaker(wordInfo) {
  if (!wordInfo || typeof wordInfo !== 'object') return 'Unknown';

  const a = wordInfo.speakerLabel;
  if (typeof a === 'string' && a.trim()) return a.trim();

  const b = wordInfo.speakerTag;
  if (typeof b === 'number' && Number.isFinite(b)) return `Speaker ${b}`;

  const c = wordInfo.speaker;
  if (typeof c === 'string' && c.trim()) return c.trim();

  return 'Unknown';
}

function collectResultsObjects(rawJson) {
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

function detectV2HasSpeakerLabels(rawJsonV2) {
  const objs = collectResultsObjects(rawJsonV2);
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
        if (w && typeof w === 'object' && typeof w.speakerLabel === 'string' && w.speakerLabel.trim()) {
          return true;
        }
      }
    }
  }
  return false;
}

function extractWordsWithSpeakerFromV2(rawJsonV2) {
  const objs = collectResultsObjects(rawJsonV2);
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

  return words;
}

function extractWordsNoSpeakerFromV2(rawJsonV2) {
  const objs = collectResultsObjects(rawJsonV2);
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
        const { startSec, endSec } = normalizeStartEnd(w);
        words.push({ speaker: 'Unknown', word, startSec, endSec });
      }
    }
  }

  return words;
}

function extractDiarizationFromWords(words) {
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

function buildSpeakerSegmentsFromRaw(rawV1Response) {
  // rawV1Response: LongRunningRecognizeResponse { results: [...] }
  const results = Array.isArray(rawV1Response?.results) ? rawV1Response.results : [];
  const words = [];

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

  // Merge consecutive diarization words by speaker into time segments
  const segs = [];
  let cur = null;
  for (const w of words) {
    if (!cur || cur.speaker !== w.speaker) {
      if (cur) segs.push(cur);
      cur = {
        speaker: w.speaker,
        startSec: w.startSec ?? null,
        endSec: w.endSec ?? null,
      };
    } else {
      if (cur.startSec == null && w.startSec != null) cur.startSec = w.startSec;
      if (w.endSec != null) cur.endSec = w.endSec;
    }
  }
  if (cur) segs.push(cur);

  // Filter out segments without any time
  return segs.filter(s => s.startSec != null || s.endSec != null);
}

function assignSpeakersByTime(v2Words, diarizationSegments) {
  const out = [];
  const segs = Array.isArray(diarizationSegments) ? diarizationSegments.slice() : [];
  segs.sort((a, b) => (a.startSec ?? 0) - (b.startSec ?? 0));

  let j = 0;
  const tol = 0.20;

  for (const w of v2Words) {
    const t = w.startSec;
    if (t == null || segs.length === 0) {
      out.push({ ...w, speaker: 'Unknown' });
      continue;
    }

    while (j < segs.length - 1) {
      const cur = segs[j];
      const end = cur.endSec;
      if (end != null && t > end + tol) {
        j++;
      } else {
        break;
      }
    }

    const cur = segs[j];
    const s = cur.startSec;
    const e = cur.endSec;

    const inside =
      (s == null || t >= s - tol) &&
      (e == null || t <= e + tol);

    out.push({ ...w, speaker: inside ? cur.speaker : 'Unknown' });
  }

  return out;
}

function extractLocationFromResourceName(name) {
  const parts = String(name || '').split('/');
  const i = parts.indexOf('locations');
  return (i >= 0 && parts[i + 1]) ? parts[i + 1] : 'global';
}

function speechV2HostForLocation(location) {
  const loc = String(location || 'global').trim();
  return (loc && loc !== 'global') ? `${loc}-speech.googleapis.com` : 'speech.googleapis.com';
}

function speechV2BaseUrlForResourceName(resourceName) {
  const loc = extractLocationFromResourceName(resourceName);
  const host = speechV2HostForLocation(loc);
  return `https://${host}/v2`;
}


// dummy helper (kept for completeness; not used after refactor)
function didWeActuallySendV2Diarization() { return false; }
function wasLastV2CallWithoutDiarization() { return false; }

module.exports = router;
