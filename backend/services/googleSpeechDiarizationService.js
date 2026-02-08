const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleAuth } = require('google-auth-library');
const { Storage } = require('@google-cloud/storage');
const { ensureGoogleCredentials } = require('./gcpCredentials');

function mustEnv(name, fallback = null) {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function safeName(name) {
  return String(name || 'audio')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function speechBase(location) {
  if (!location || location === 'global') return 'https://speech.googleapis.com';
  return `https://${location}-speech.googleapis.com`;
}

function parseLocationFromOperationName(opName) {
  const m = String(opName).match(/\/locations\/([^/]+)\//);
  return m ? m[1] : null;
}

async function getAuthHeader() {
  ensureGoogleCredentials();
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const headers = await client.getRequestHeaders();
  const h = headers['Authorization'] || headers['authorization'];
  if (!h) throw new Error('Failed to get Authorization header from google-auth-library');
  return h;
}

async function uploadLocalFileToGCS({ localPath, bucketName, destPrefix = 'stt_inputs' }) {
  const projectId = mustEnv('GCP_PROJECT_ID', process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null);
  ensureGoogleCredentials();

  const storage = new Storage({ projectId });
  const bucket = storage.bucket(bucketName);

  const ext = path.extname(localPath);
  const base = safeName(path.basename(localPath, ext));
  const uid = crypto.randomBytes(10).toString('hex');
  const dest = `${destPrefix}/${Date.now()}_${uid}_${base}${ext}`;

  await bucket.upload(localPath, {
    destination: dest,
    resumable: false
  });

  return `gs://${bucketName}/${dest}`;
}

async function startBatchRecognize({ gcsUri, languageCodes, minSpeakerCount, maxSpeakerCount, enableWordTimeOffsets }) {
  const projectId = mustEnv('GCP_PROJECT_ID', process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null);
  const region = mustEnv('GCP_SPEECH_REGION', 'us');
  const model = process.env.GCP_SPEECH_MODEL || 'chirp_3';

  const authHeader = await getAuthHeader();
  const url = `${speechBase(region)}/v2/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(region)}/recognizers/_:batchRecognize`;

  const body = {
    config: {
      autoDecodingConfig: {},
      model,
      languageCodes: Array.isArray(languageCodes) && languageCodes.length ? languageCodes : ['ja-JP'],
      features: {
        diarizationConfig: {
          minSpeakerCount: Number(minSpeakerCount || 2),
          maxSpeakerCount: Number(maxSpeakerCount || 5)
        },
        enableWordTimeOffsets: Boolean(enableWordTimeOffsets ?? true)
      }
    },
    files: [{ uri: gcsUri }],
    recognitionOutputConfig: {
      inlineResponseConfig: {}
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Speech BatchRecognize failed (${resp.status}): ${text}`);
  }

  const json = JSON.parse(text);
  if (!json.name) throw new Error(`Unexpected response (missing name): ${text}`);
  return json.name;
}

async function getOperation(opName) {
  const loc = parseLocationFromOperationName(opName) || mustEnv('GCP_SPEECH_REGION', 'us');
  const authHeader = await getAuthHeader();
  const url = `${speechBase(loc)}/v2/${opName}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': authHeader }
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`GetOperation failed (${resp.status}): ${text}`);
  }
  return JSON.parse(text);
}

function toSeconds(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr);
  if (s.endsWith('s')) return Number(s.slice(0, -1));
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function extractInlineTranscript(opJson) {
  const resp = opJson && opJson.response ? opJson.response : null;
  const results = resp && resp.results ? resp.results : null;
  if (!results || typeof results !== 'object') return null;

  const firstKey = Object.keys(results)[0];
  if (!firstKey) return null;

  const fileResult = results[firstKey];
  if (!fileResult) return null;

  const transcriptObj =
    fileResult.transcript ||
    (fileResult.inlineResult && fileResult.inlineResult.transcript) ||
    (fileResult.inline_result && fileResult.inline_result.transcript) ||
    null;

  return { audioUri: firstKey, transcriptObj };
}

function diarizationFromTranscript(transcriptObj) {
  if (!transcriptObj || !Array.isArray(transcriptObj.results)) {
    return { fullText: '', segments: [], raw: transcriptObj || null };
  }

  const segments = [];
  let fullTextParts = [];

  for (const r of transcriptObj.results) {
    const alt = r && Array.isArray(r.alternatives) ? r.alternatives[0] : null;
    if (!alt) continue;

    if (alt.transcript) fullTextParts.push(String(alt.transcript));

    const words = Array.isArray(alt.words) ? alt.words : [];
    let curSpeaker = null;
    let curWords = [];
    let curStart = null;
    let curEnd = null;

    const flush = () => {
      if (!curWords.length) return;
      segments.push({
        speaker: curSpeaker || 'Unknown',
        text: curWords.join(' '),
        startSec: curStart,
        endSec: curEnd
      });
      curWords = [];
      curStart = null;
      curEnd = null;
    };

    for (const w of words) {
      const word = w.word || w.wordString || w.text || '';
      const speaker = w.speakerLabel || w.speaker_label || w.speakerTag || w.speaker_tag || 'Unknown';
      const st = toSeconds(w.startTime || w.start_time);
      const et = toSeconds(w.endTime || w.end_time);

      if (curSpeaker === null) {
        curSpeaker = speaker;
        curStart = st;
        curEnd = et;
        curWords.push(word);
        continue;
      }

      if (speaker !== curSpeaker) {
        flush();
        curSpeaker = speaker;
        curStart = st;
        curEnd = et;
        curWords.push(word);
      } else {
        curWords.push(word);
        if (curStart === null) curStart = st;
        curEnd = et ?? curEnd;
      }
    }
    flush();
  }

  return {
    fullText: fullTextParts.join('\n').trim(),
    segments
  };
}

function extractResultIfDone(opJson) {
  if (!opJson || opJson.done !== true) return null;
  if (opJson.error) return { error: opJson.error };

  const t = extractInlineTranscript(opJson);
  if (!t || !t.transcriptObj) return { error: { message: 'Missing inline transcript in operation response' } };

  const diar = diarizationFromTranscript(t.transcriptObj);
  return {
    audioUri: t.audioUri,
    fullText: diar.fullText,
    segments: diar.segments,
    rawTranscript: t.transcriptObj
  };
}

module.exports = {
  uploadLocalFileToGCS,
  startBatchRecognize,
  getOperation,
  extractResultIfDone
};
