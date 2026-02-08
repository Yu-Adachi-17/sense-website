// services/azureSpeechBatch.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob');

const DEFAULT_API_VERSION = '2025-10-15';

function pickEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

function requiredEnv(name) {
  const v = pickEnv(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function parseConnectionString(cs) {
  const parts = cs.split(';').map(s => s.trim()).filter(Boolean);
  const kv = {};
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx <= 0) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    kv[k] = v;
  }
  const accountName = kv.AccountName;
  const accountKey = kv.AccountKey;
  if (!accountName || !accountKey) {
    throw new Error('Invalid Azure Storage connection string (AccountName/AccountKey not found)');
  }
  return { accountName, accountKey };
}

function buildSpeechEndpoint(region) {
  return `https://${region}.api.cognitive.microsoft.com`;
}

async function mustFetch(url, init) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available. Use Node.js 18+ (recommended on Railway).');
  }
  const res = await fetch(url, init);
  return res;
}

async function readJsonOrText(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    const j = await res.json().catch(() => null);
    return { json: j, text: '' };
  }
  const t = await res.text().catch(() => '');
  return { json: null, text: t };
}

function extractTranscriptionIdFromUrl(u) {
  if (!u) return '';
  const s = String(u);

  // New REST (2025-10-15): /speechtotext/transcriptions/{id}
  // Legacy/alternate:      /speechtotext/v3.x/transcriptions/{id}
  let m = s.match(/\/speechtotext(?:\/v[0-9.]+)?\/transcriptions\/([^\/\?\#]+)/i);
  if (m && m[1]) return m[1];

  // Fallback: any /transcriptions/{id}
  m = s.match(/\/transcriptions\/([^\/\?\#]+)/i);
  if (m && m[1]) return m[1];

  return '';
}


function parseIsoDurationToMs(d) {
  if (!d || typeof d !== 'string') return null;
  const s = d.trim();
  const m = s.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!m) return null;
  const hours = m[1] ? parseFloat(m[1]) : 0;
  const mins = m[2] ? parseFloat(m[2]) : 0;
  const secs = m[3] ? parseFloat(m[3]) : 0;
  const ms = (hours * 3600 + mins * 60 + secs) * 1000;
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms);
}

function normalizeRecognizedPhrases(resultJson) {
  const phrases = Array.isArray(resultJson?.recognizedPhrases) ? resultJson.recognizedPhrases : [];
  const out = phrases.map(p => {
    const speaker =
      (typeof p.speaker === 'number' ? p.speaker : null) ??
      (typeof p.speakerId === 'number' ? p.speakerId : null) ??
      (typeof p.speakerNumber === 'number' ? p.speakerNumber : null);

    const best = Array.isArray(p.nBest) && p.nBest.length > 0 ? p.nBest[0] : null;
    const text = (best?.display || best?.lexical || '').toString();

    const offsetMs =
      typeof p.offsetInTicks === 'number'
        ? Math.round(p.offsetInTicks / 10_000)
        : parseIsoDurationToMs(p.offset);

    const durationMs =
      typeof p.durationInTicks === 'number'
        ? Math.round(p.durationInTicks / 10_000)
        : parseIsoDurationToMs(p.duration);

    return {
      speaker: speaker == null ? null : speaker,
      startMs: offsetMs == null ? null : offsetMs,
      endMs: offsetMs != null && durationMs != null ? offsetMs + durationMs : null,
      text
    };
  });

  const sortable = out.filter(x => x.startMs != null && typeof x.startMs === 'number');
  sortable.sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
  return sortable;
}

async function ensureContainer(containerClient) {
  try {
    await containerClient.createIfNotExists();
  } catch (e) {
    const msg = e?.message || String(e);
    throw new Error(`Failed to ensure container: ${msg}`);
  }
}

async function uploadFileToBlobAndGetSasUrl({
  connectionString,
  containerName,
  filePath,
  contentType,
  ttlMinutes,
  blobPrefix
}) {
  const { accountName, accountKey } = parseConnectionString(connectionString);

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await ensureContainer(containerClient);

  const ext = path.extname(filePath) || '';
  const blobName =
    (blobPrefix ? `${blobPrefix.replace(/\/+$/g, '')}/` : '') +
    `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadFile(filePath, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined
  });

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn
    },
    credential
  ).toString();

  const sasUrl = `${blockBlobClient.url}?${sas}`;
  return { blobName, sasUrl, expiresOn: expiresOn.toISOString() };
}

function isValidAzureLocale(s) {
  return typeof s === 'string' && /^[a-z]{2,3}-[A-Z]{2}$/.test(s);
}

/**
 * iOS/BCP-47/ICU っぽい表記を Azure batch が受けられる locale（xx-YY）に寄せる
 * 例:
 *  - "ja" -> "ja-JP"
 *  - "en" -> "en-US"
 *  - "en_US" -> "en-US"
 *  - "zh-Hans" -> "zh-CN"
 *  - "zh-Hant" -> "zh-TW"
 *  - "zh-Hans-JP-u-ca-japanese" -> "zh-CN"（region未指定なら script優先）
 */
function normalizeAzureLocale(input, fallback = 'en-US') {
  const raw = (input ?? '').toString().trim();
  if (!raw) return fallback;

  let s = raw.replace(/_/g, '-');

  // ICU extension などを除去: "en-US@calendar=buddhist"
  s = s.split('@')[0];

  // Unicode / private use extension をざっくり切る（-u- / -x- 以降）
  s = s.replace(/-u-.+$/i, '').replace(/-x-.+$/i, '');

  const parts = s.split('-').filter(Boolean);
  if (parts.length === 0) return fallback;

  const lang = parts[0].toLowerCase();

  let script = '';
  let region = '';

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];

    // Script: Hans / Hant etc (4 letters)
    if (!script && /^[A-Za-z]{4}$/.test(p)) {
      script = p;
      continue;
    }

    // Region: US / JP etc (2 letters)
    if (/^[A-Za-z]{2}$/.test(p)) {
      region = p.toUpperCase();
      break;
    }
  }

  // 言語だけのときの既定リージョン
  const DEFAULT_REGION = {
    en: 'US',
    ja: 'JP',
    de: 'DE',
    fr: 'FR',
    es: 'ES',
    it: 'IT',
    nl: 'NL',
    pt: 'BR',
    sv: 'SE',
    da: 'DK',
    nb: 'NO',
    no: 'NO',
    fi: 'FI',
    tr: 'TR',
    ko: 'KR',
    id: 'ID',
    vi: 'VN',
    th: 'TH',
    hi: 'IN',
    ar: 'SA',
    he: 'IL',
    pl: 'PL',
    ro: 'RO',
    ru: 'RU',
    uk: 'UA',
    cs: 'CZ',
    sk: 'SK',
    el: 'GR',
    hr: 'HR',
    hu: 'HU',
    ms: 'MY',
    zh: 'CN'
  };

  // Chinese: script優先で CN/TW に寄せる
  if (lang === 'zh') {
    if (region) {
      const out = `zh-${region}`;
      return isValidAzureLocale(out) ? out : fallback;
    }
    const sc = script.toLowerCase();
    if (sc === 'hant') return 'zh-TW';
    if (sc === 'hans') return 'zh-CN';
    return 'zh-CN';
  }

  if (region) {
    const out = `${lang}-${region}`;
    return isValidAzureLocale(out) ? out : fallback;
  }

  const def = DEFAULT_REGION[lang];
  if (def) {
    const out = `${lang}-${def}`;
    return isValidAzureLocale(out) ? out : fallback;
  }

  // 最後は fallback
  return fallback;
}


function normalizeLanguageIdMode(mode) {
  return String(mode || 'Single').toLowerCase() === 'continuous' ? 'Continuous' : 'Single';
}

function normalizeCandidateLocales(locale, candidateLocales, mode) {
  const primary = normalizeAzureLocale(locale, 'en-US');

  const arr = Array.isArray(candidateLocales) ? candidateLocales : [];
  const merged = [
    primary,
    ...arr.map(x => normalizeAzureLocale(x, '')) // 候補は不正なら捨てる（''）
  ].filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const x of merged) {
    if (!isValidAzureLocale(x)) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }

  const m = normalizeLanguageIdMode(mode);
  const cap = (m === 'Continuous') ? 10 : 15;
  return { mode: m, locales: out.slice(0, cap), primary };
}



async function submitBatchTranscription({
  speechKey,
  speechRegion,
  apiVersion,
  contentUrl,
  locale,
  displayName,
  diarizationEnabled,
  minSpeakers,
  maxSpeakers,
  wordLevelTimestampsEnabled,
  candidateLocales,
  languageIdMode
}) {
  const endpoint = buildSpeechEndpoint(speechRegion);
  const url = `${endpoint}/speechtotext/transcriptions:submit?api-version=${encodeURIComponent(apiVersion)}`;

  const ttlRaw = pickEnv('AZURE_SPEECH_TTL_HOURS');
  const ttlParsed = parseInt(ttlRaw || '24', 10);
  const timeToLiveHours = Number.isFinite(ttlParsed) ? Math.max(6, ttlParsed) : 24;

  const lid = normalizeCandidateLocales(locale, candidateLocales, languageIdMode);
  const primaryLocale = lid.primary; // ← 正規化済み primary

  const properties = {
    timeToLiveHours,
    diarization: diarizationEnabled
      ? {
          enabled: true,
          minSpeakers: typeof minSpeakers === 'number' ? minSpeakers : 1,
          maxSpeakers: typeof maxSpeakers === 'number' ? maxSpeakers : 6
        }
      : { enabled: false },
    wordLevelTimestampsEnabled: !!wordLevelTimestampsEnabled
  };

  if (Array.isArray(lid.locales) && lid.locales.length >= 2) {
    properties.languageIdentification = {
      mode: lid.mode,
      candidateLocales: lid.locales
    };
  }

  const body = {
    displayName: displayName || `minutesai_${new Date().toISOString()}`,
    locale: primaryLocale,          // ✅ 常に xx-YY へ
    contentUrls: [contentUrl],
    properties
  };

  const res = await mustFetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const location =
    res.headers.get('location') ||
    res.headers.get('operation-location') ||
    res.headers.get('azure-asyncoperation') ||
    '';

  const { json, text } = await readJsonOrText(res);

  if (!res.ok) {
    throw new Error(
      `Azure submit failed: ${res.status} ${res.statusText} ${text || JSON.stringify(json || {})}`
    );
  }

  const candidates = [
    location,
    json?.self,
    json?.links?.self,
    json?.links?.files
  ].filter(Boolean).map(String);

  let transcriptionUrl = candidates[0] || '';
  let transcriptionId = '';

  for (const c of candidates) {
    const id = extractTranscriptionIdFromUrl(c);
    if (id) {
      transcriptionId = id;
      transcriptionUrl = transcriptionUrl || c;
      break;
    }
  }

  if (!transcriptionId && json?.id) {
    transcriptionId = String(json.id);
  }

  if (!transcriptionId) {
    const dbg = {
      status: res.status,
      hasLocationHeader: !!location,
      contentType: res.headers.get('content-type') || '',
      location: location || null,
      jsonKeys: json && typeof json === 'object' ? Object.keys(json) : null
    };
    throw new Error(`Azure submit succeeded but transcriptionId not found. debug=${JSON.stringify(dbg)}`);
  }

  if (!transcriptionUrl) {
    transcriptionUrl = `${endpoint}/speechtotext/transcriptions/${transcriptionId}`;
  }

  return { transcriptionId, transcriptionUrl };
}


async function getTranscription({
  speechKey,
  speechRegion,
  apiVersion,
  transcriptionId
}) {
  const endpoint = buildSpeechEndpoint(speechRegion);
  const url = `${endpoint}/speechtotext/transcriptions/${encodeURIComponent(transcriptionId)}?api-version=${encodeURIComponent(apiVersion)}`;

  const res = await mustFetch(url, {
    method: 'GET',
    headers: { 'Ocp-Apim-Subscription-Key': speechKey }
  });

  if (!res.ok) {
    const { json, text } = await readJsonOrText(res);
    throw new Error(
      `Azure get transcription failed: ${res.status} ${res.statusText} ${text || JSON.stringify(json || {})}`
    );
  }

  const { json } = await readJsonOrText(res);
  return json || {};
}

async function listTranscriptionFiles({
  speechKey,
  speechRegion,
  apiVersion,
  transcriptionId
}) {
  const endpoint = buildSpeechEndpoint(speechRegion);
  const url = `${endpoint}/speechtotext/transcriptions/${encodeURIComponent(transcriptionId)}/files?api-version=${encodeURIComponent(apiVersion)}`;

  const res = await mustFetch(url, {
    method: 'GET',
    headers: { 'Ocp-Apim-Subscription-Key': speechKey }
  });

  if (!res.ok) {
    const { json, text } = await readJsonOrText(res);
    throw new Error(
      `Azure list files failed: ${res.status} ${res.statusText} ${text || JSON.stringify(json || {})}`
    );
  }

  const { json } = await readJsonOrText(res);
  const values = (json && (json.values || json.value)) || [];
  return Array.isArray(values) ? values : [];
}

function pickTranscriptionContentUrl(files) {
  const transcriptionFiles = files.filter(f => {
    const kind = (f?.kind || '').toString().toLowerCase();
    return kind === 'transcription';
  });

  if (transcriptionFiles.length === 0) return '';

  const f = transcriptionFiles[0];
  const contentUrl = f?.links?.contentUrl || f?.links?.contentURL || f?.contentUrl || '';
  return contentUrl ? String(contentUrl) : '';
}

async function downloadTranscriptionResultJson(contentUrl) {
  if (!contentUrl) throw new Error('contentUrl is empty');

  const res = await mustFetch(contentUrl, { method: 'GET' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Download transcription json failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error('Downloaded transcription is not valid JSON');
  return json;
}

async function startAzureDiarizationFromLocalFile({
  filePath,
  originalName,
  contentType,
  locale,
  candidateLocales,          // ✅ 追加
  languageIdMode,            // ✅ 追加
  minSpeakers,
  maxSpeakers,
  wordLevelTimestampsEnabled
}) {
  const speechKey = requiredEnv('AZURE_SPEECH_KEY');
  const speechRegion = requiredEnv('AZURE_SPEECH_REGION');

  const containerName = requiredEnv('AZURE_STORAGE_CONTAINER');

  const connectionString =
    pickEnv('AZURE_STORAGE_CONNECTION_STRING', 'AZURE_STORAGE_CONNECTION_STRING_KEY1', 'AZURE_STORAGE_CONNECTION_STRING_KEY2');

  if (!connectionString) {
    throw new Error('Missing required env: AZURE_STORAGE_CONNECTION_STRING (or *_KEY1/_KEY2)');
  }

  const apiVersion = pickEnv('AZURE_SPEECH_API_VERSION') || DEFAULT_API_VERSION;
  const ttlMinutes = Number(pickEnv('AZURE_SAS_TTL_MINUTES') || '180');
  const blobPrefix = pickEnv('AZURE_STORAGE_BLOB_PREFIX') || 'minutesai_audio';

  const { blobName, sasUrl, expiresOn } = await uploadFileToBlobAndGetSasUrl({
    connectionString,
    containerName,
    filePath,
    contentType,
    ttlMinutes: Number.isFinite(ttlMinutes) ? ttlMinutes : 180,
    blobPrefix
  });

  const displayName = `minutesai_${Date.now()}_${(originalName || 'audio').toString().slice(0, 40)}`;

  const { transcriptionId } = await submitBatchTranscription({
    speechKey,
    speechRegion,
    apiVersion,
    contentUrl: sasUrl,
    locale,
    displayName,
    diarizationEnabled: true,
    minSpeakers: typeof minSpeakers === 'number' ? minSpeakers : 1,
    maxSpeakers: typeof maxSpeakers === 'number' ? maxSpeakers : 6,
    wordLevelTimestampsEnabled: !!wordLevelTimestampsEnabled,

    // ✅ 追加
    candidateLocales,
    languageIdMode
  });

  return {
    transcriptionId,
    transcriptionUrl: `${buildSpeechEndpoint(speechRegion)}/speechtotext/transcriptions/${encodeURIComponent(transcriptionId)}?api-version=${encodeURIComponent(apiVersion)}`,
    inputBlob: {
      containerName,
      blobName,
      sasExpiresOn: expiresOn
    }
  };
}


async function getAzureDiarizationStatus({ transcriptionId }) {
  const speechKey = requiredEnv('AZURE_SPEECH_KEY');
  const speechRegion = requiredEnv('AZURE_SPEECH_REGION');
  const apiVersion = pickEnv('AZURE_SPEECH_API_VERSION') || DEFAULT_API_VERSION;

  const t = await getTranscription({ speechKey, speechRegion, apiVersion, transcriptionId });
  const status = (t?.status || '').toString();
  return { status, raw: t };
}

async function getAzureDiarizationResult({ transcriptionId }) {
  const speechKey = requiredEnv('AZURE_SPEECH_KEY');
  const speechRegion = requiredEnv('AZURE_SPEECH_REGION');
  const apiVersion = pickEnv('AZURE_SPEECH_API_VERSION') || DEFAULT_API_VERSION;

  const t = await getTranscription({ speechKey, speechRegion, apiVersion, transcriptionId });
  const status = (t?.status || '').toString();

  if (status.toLowerCase() !== 'succeeded') {
    return { status, segments: [], combinedText: '' };
  }

  const files = await listTranscriptionFiles({ speechKey, speechRegion, apiVersion, transcriptionId });
  const contentUrl = pickTranscriptionContentUrl(files);

  if (!contentUrl) {
    throw new Error('Transcription succeeded but transcription contentUrl not found in files list');
  }

  const resultJson = await downloadTranscriptionResultJson(contentUrl);

  const segments = normalizeRecognizedPhrases(resultJson);
  const combinedText = segments.map(s => s.text).filter(Boolean).join(' ').trim();

  return {
    status,
    segments,
    combinedText,
    raw: {
      source: resultJson?.source || null,
      duration: resultJson?.duration || null
    }
  };
}

module.exports = {
  startAzureDiarizationFromLocalFile,
  getAzureDiarizationStatus,
  getAzureDiarizationResult
};
