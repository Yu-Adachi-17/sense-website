// backend/services/emailTemplates.js

// HTMLエスケープ用（< や > をそのまま表示したいので）
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// minutes / transcript がオブジェクトでも文字列でも安全に扱う
function normalizeMinutes(minutes) {
  if (minutes == null) return '';
  if (typeof minutes === 'string') return minutes;
  try {
    return JSON.stringify(minutes, null, 2);
  } catch {
    return String(minutes);
  }
}

function normalizeTranscript(transcription) {
  if (!transcription) return '';
  if (typeof transcription === 'string') return transcription;
  try {
    return JSON.stringify(transcription, null, 2);
  } catch {
    return String(transcription);
  }
}

/**
 * Minutes + Transcript 両方を含んだメール本文
 * - /api/transcribe
 * - /api/send-minutes-email
 * などで使用
 *
 * @param {Object} params
 * @param {string|Object} params.minutes
 * @param {string|Object} [params.transcription]
 * @returns {{ textBody: string, htmlBody: string }}
 */
function buildMinutesEmailBodies({ minutes, transcription }) {
  const minutesText = normalizeMinutes(minutes);
  const transcriptText = normalizeTranscript(transcription);

  // プレーンテキスト版
  const textParts = [
    '=== Minutes ===',
    '',
    minutesText || '(no minutes)',
  ];

  if (transcriptText) {
    textParts.push('');
    textParts.push('=== Transcript ===');
    textParts.push('');
    textParts.push(transcriptText);
  }

  const textBody = textParts.join('\n');

  // HTML版
  let htmlBody =
    '<h2>Minutes</h2>' +
    '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
    escapeHtml(minutesText || '(no minutes)') +
    '</pre>';

  if (transcriptText) {
    htmlBody +=
      '<hr/>' +
      '<h3>Transcript</h3>' +
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(transcriptText) +
      '</pre>';
  }

  return { textBody, htmlBody };
}

/**
 * Minutes だけを送るメール本文
 * - /api/minutes-email-from-audio で使用（Transcriptは付けない）
 *
 * @param {Object} params
 * @param {string|Object} params.minutes
 * @returns {{ textBody: string, htmlBody: string }}
 */
function buildMinutesOnlyEmailBodies({ minutes }) {
  const minutesText = normalizeMinutes(minutes);

  const textBody = minutesText || '(no minutes)';

  const htmlBody =
    '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
    escapeHtml(minutesText || '(no minutes)') +
    '</pre>';

  return { textBody, htmlBody };
}

module.exports = {
  buildMinutesEmailBodies,        // ({ minutes, transcription }) => { textBody, htmlBody }
  buildMinutesOnlyEmailBodies,    // ({ minutes }) => { textBody, htmlBody }
};
