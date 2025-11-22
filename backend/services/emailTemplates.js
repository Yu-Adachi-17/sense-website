// backend/services/emailTemplates.js
'use strict';

const fs = require('fs');
const path = require('path');

/* --------------------------------------------------
 *  HTML escape
 * -------------------------------------------------- */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* --------------------------------------------------
 *  ロケール別ラベル（最低限の組み込み）
 *  ※必要に応じて backend/locales/email/{lang}.json で上書きも可能
 * -------------------------------------------------- */
const DEFAULT_MESSAGES_EN = {
  minutesHeading: 'Minutes',
  transcriptHeading: 'Transcript',

  // meta
  dateLabel: 'Date',
  locationLabel: 'Location',
  attendeesLabel: 'Attendees',
  presenterLabel: 'Presenter',
  coreMessageLabel: 'Core message',
  lectureObjectivesLabel: 'Lecture objectives',
  atmosphereLabel: 'Meeting atmosphere',

  // flexible
  summaryLabel: 'Summary',
  sectionLabel: 'Section',
  topicLabel: 'Topic',

  // topic details
  discussionLabel: 'Discussion',
  decisionsLabel: 'Decisions',
  actionItemsLabel: 'Action items',
  concernsLabel: 'Concerns',
  keyMessagesLabel: 'Key messages',
  customerNeedsLabel: 'Customer needs',
  proposalsLabel: 'Proposals',
  reasonsLabel: 'Reasons',
  qAndALabel: 'Q&A',
  feedbackLabel: 'Feedback',

  // misc
  untitledMeeting: 'Untitled meeting',
  untitledSection: 'Untitled section',
  untitledTopic: 'Untitled topic',
  unknownSpeaker: 'Unknown',
  noSummary: '(no summary)',
  noMinutes: '(no minutes)',
  noTranscript: '(no transcript)',

  emptyTranscriptTitle: 'Empty Meeting Transcript',
  emptyTranscriptBody:
    'The audio transcript was empty, so no detailed minutes could be generated.',
};

const DEFAULT_MESSAGES_JA = {
  minutesHeading: '議事録',
  transcriptHeading: 'トランスクリプト',

  dateLabel: '日付',
  locationLabel: '場所',
  attendeesLabel: '参加者',
  presenterLabel: '発表者',
  coreMessageLabel: 'コアメッセージ',
  lectureObjectivesLabel: '講義の目的',
  atmosphereLabel: '会議の雰囲気',

  summaryLabel: 'サマリー',
  sectionLabel: 'セクション',
  topicLabel: 'トピック',

  discussionLabel: '議論内容',
  decisionsLabel: '決定事項',
  actionItemsLabel: 'アクションアイテム',
  concernsLabel: '懸念',
  keyMessagesLabel: '重要なメッセージ',
  customerNeedsLabel: '顧客ニーズ',
  proposalsLabel: '提案',
  reasonsLabel: '理由',
  qAndALabel: '質疑応答',
  feedbackLabel: 'フィードバック',

  untitledMeeting: '無題のミーティング',
  untitledSection: '無題のセクション',
  untitledTopic: '無題のトピック',
  unknownSpeaker: '不明',
  noSummary: '(サマリーなし)',
  noMinutes: '(議事録がありません)',
  noTranscript: '(トランスクリプトがありません)',

  emptyTranscriptTitle: '空のミーティング',
  emptyTranscriptBody:
    '音声トランスクリプトが空だったため、詳細な議事録を生成できませんでした。',
};

/**
 * backend/locales/email/{lang}.json が存在すればそれで上書きする。
 * ない場合は組み込みの EN / JA を使う。
 */
function loadLocaleMessages(locale) {
  const baseLang = (locale || 'en').split('-')[0].toLowerCase();

  let base = DEFAULT_MESSAGES_EN;
  if (baseLang === 'ja') {
    base = Object.assign({}, DEFAULT_MESSAGES_EN, DEFAULT_MESSAGES_JA);
  }

  const candidatePath = path.join(
    __dirname,
    '..',
    'locales',
    'email',
    `${baseLang}.json`
  );

  try {
    if (fs.existsSync(candidatePath)) {
      const raw = fs.readFileSync(candidatePath, 'utf8');
      const json = JSON.parse(raw);
      return Object.assign({}, base, json);
    }
  } catch (e) {
    // ログだけ出して、致命的にはしない
    console.warn('[emailTemplates] Failed to load locale file:', e.message);
  }

  return base;
}

/* --------------------------------------------------
 *  JSON 判定・正規化系
 * -------------------------------------------------- */

function tryParseJSON(str) {
  if (typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * FlexibleNote かどうか判定
 * {
 *   meetingTitle: string,
 *   date: string,
 *   summary: string,
 *   sections: [{ title, topics: [{ subTitle, details: [] }] }]
 * }
 */
function isFlexibleNoteShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.meetingTitle !== 'string') return false;
  if (!Array.isArray(obj.sections)) return false;
  return true;
}

/**
 * MeetingMinutes かどうか判定
 * meetingTitle + topics を持つ複合 JSON
 */
function isMeetingMinutesShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.meetingTitle !== 'string') return false;
  if (!Array.isArray(obj.topics)) return false;
  return true;
}

/**
 * minutes を解析して
 *  - schema: 'flexible' | 'meetingMinutes' | 'unknown'
 *  - value : オブジェクト or 配列 or null
 *  - raw   : テキスト版
 */
function analyzeMinutes(minutes) {
  if (minutes == null) {
    return { schema: 'none', value: null, raw: '' };
  }

  // 文字列なら JSON を試す
  if (typeof minutes === 'string') {
    const parsed = tryParseJSON(minutes);
    if (parsed) {
      const { schema } = detectSchema(parsed);
      if (schema !== 'unknown') {
        return { schema, value: parsed, raw: minutes };
      }
      // スキーマ不明だが JSON の場合
      return {
        schema: 'unknown',
        value: parsed,
        raw: minutes,
      };
    }
    // 純テキスト
    return {
      schema: 'unknown',
      value: null,
      raw: minutes,
    };
  }

  // オブジェクト / 配列
  let raw = '';
  try {
    raw = JSON.stringify(minutes, null, 2);
  } catch {
    raw = String(minutes);
  }

  const { schema } = detectSchema(minutes);
  return { schema, value: minutes, raw };
}

/**
 * スキーマ判定（配列も許容）
 */
function detectSchema(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return { schema: 'unknown' };
    const first = value[0];
    if (isFlexibleNoteShape(first)) return { schema: 'flexible' };
    if (isMeetingMinutesShape(first)) return { schema: 'meetingMinutes' };
    return { schema: 'unknown' };
  }

  if (isFlexibleNoteShape(value)) return { schema: 'flexible' };
  if (isMeetingMinutesShape(value)) return { schema: 'meetingMinutes' };
  return { schema: 'unknown' };
}

/* --------------------------------------------------
 *  FlexibleNote -> Text/HTML
 * -------------------------------------------------- */

function formatFlexibleNotesText(noteOrArray, labels) {
  const notes = Array.isArray(noteOrArray) ? noteOrArray : [noteOrArray];
  if (!notes.length) return labels.noMinutes;

  const first = notes[0];

  // 「Empty Meeting Transcript」特別扱い
  if (
    typeof first.meetingTitle === 'string' &&
    first.meetingTitle === labels.emptyTranscriptTitle &&
    (!first.sections || first.sections.length === 0)
  ) {
    return `${first.meetingTitle}\n\n${labels.emptyTranscriptBody}`;
  }

  const lines = [];

  notes.forEach((note, idx) => {
    if (idx > 0) {
      lines.push('');
      lines.push('----------------------------------------');
      lines.push('');
    }

    const title = note.meetingTitle || labels.untitledMeeting;
    lines.push(title);

    if (note.date) {
      lines.push(`${labels.dateLabel}: ${note.date}`);
    }

    lines.push('');

    lines.push(`${labels.summaryLabel}:`);
    lines.push(note.summary || labels.noSummary);
    lines.push('');

    if (Array.isArray(note.sections)) {
      note.sections.forEach((section, sIdx) => {
        const sTitle =
          section.title && String(section.title).trim().length > 0
            ? section.title
            : `${labels.sectionLabel} ${sIdx + 1}`;

        lines.push(`${labels.sectionLabel} ${sIdx + 1}: ${sTitle}`);

        if (Array.isArray(section.topics)) {
          section.topics.forEach((topic) => {
            const tTitle =
              topic.subTitle &&
              String(topic.subTitle).trim().length > 0
                ? topic.subTitle
                : labels.untitledTopic;

            lines.push(`- ${labels.topicLabel}: ${tTitle}`);

            if (Array.isArray(topic.details) && topic.details.length > 0) {
              topic.details.forEach((d) => {
                lines.push(`  • ${d}`);
              });
            }
          });
        }

        lines.push('');
      });
    }
  });

  return lines.join('\n');
}

function formatFlexibleNotesHtml(noteOrArray, labels) {
  const notes = Array.isArray(noteOrArray) ? noteOrArray : [noteOrArray];
  if (!notes.length) {
    return (
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(labels.noMinutes) +
      '</pre>'
    );
  }

  const first = notes[0];

  // 空ミーティング特別扱い
  if (
    typeof first.meetingTitle === 'string' &&
    first.meetingTitle === labels.emptyTranscriptTitle &&
    (!first.sections || first.sections.length === 0)
  ) {
    const content =
      first.meetingTitle + '\n\n' + labels.emptyTranscriptBody;
    return (
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(content) +
      '</pre>'
    );
  }

  let html = '';

  notes.forEach((note, idx) => {
    if (idx > 0) {
      html +=
        '<hr style="margin:24px 0;border:none;border-top:1px solid #ddd;"/>';
    }

    const title = note.meetingTitle || labels.untitledMeeting;

    html += `<h2>${escapeHtml(title)}</h2>`;

    if (note.date) {
      html += `<p><strong>${escapeHtml(labels.dateLabel)}:</strong> ${escapeHtml(
        note.date
      )}</p>`;
    }

    html += `<h3>${escapeHtml(labels.summaryLabel)}</h3>`;
    html += `<p>${escapeHtml(note.summary || labels.noSummary)}</p>`;

    if (Array.isArray(note.sections)) {
      note.sections.forEach((section, sIdx) => {
        const sTitle =
          section.title && String(section.title).trim().length > 0
            ? section.title
            : `${labels.sectionLabel} ${sIdx + 1}`;

        html += `<h3>${escapeHtml(
          `${labels.sectionLabel} ${sIdx + 1}: ${sTitle}`
        )}</h3>`;

        if (Array.isArray(section.topics)) {
          section.topics.forEach((topic) => {
            const tTitle =
              topic.subTitle &&
              String(topic.subTitle).trim().length > 0
                ? topic.subTitle
                : labels.untitledTopic;

            html += `<p><strong>${escapeHtml(
              labels.topicLabel
            )}:</strong> ${escapeHtml(tTitle)}</p>`;

            if (Array.isArray(topic.details) && topic.details.length > 0) {
              html += '<ul>';
              topic.details.forEach((d) => {
                html += `<li>${escapeHtml(d)}</li>`;
              });
              html += '</ul>';
            }
          });
        }
      });
    }
  });

  return html;
}

/* --------------------------------------------------
 *  MeetingMinutes -> Text/HTML
 *  （全フィールドは拾い切れないが、主要なものを整形）
 * -------------------------------------------------- */

function formatMeetingMinutesText(mmOrArray, labels) {
  const list = Array.isArray(mmOrArray) ? mmOrArray : [mmOrArray];
  if (!list.length) return labels.noMinutes;

  const lines = [];

  list.forEach((mm, idx) => {
    if (idx > 0) {
      lines.push('');
      lines.push('----------------------------------------');
      lines.push('');
    }

    const title = mm.meetingTitle || labels.untitledMeeting;
    lines.push(title);

    if (mm.date) {
      lines.push(`${labels.dateLabel}: ${mm.date}`);
    }
    if (mm.location) {
      lines.push(`${labels.locationLabel}: ${mm.location}`);
    }
    if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
      lines.push(`${labels.attendeesLabel}: ${mm.attendees.join(', ')}`);
    }
    if (Array.isArray(mm.presenter) && mm.presenter.length > 0) {
      lines.push(`${labels.presenterLabel}: ${mm.presenter.join(', ')}`);
    }

    if (
      mm.toneInsights &&
      Array.isArray(mm.toneInsights.meetingAtmosphere) &&
      mm.toneInsights.meetingAtmosphere.length > 0
    ) {
      lines.push(
        `${labels.atmosphereLabel}: ${mm.toneInsights.meetingAtmosphere.join(
          ', '
        )}`
      );
    }

    if (mm.coreMessage) {
      lines.push('');
      lines.push(`${labels.coreMessageLabel}:`);
      lines.push(mm.coreMessage);
    }

    if (mm.lectureObjectives) {
      lines.push('');
      lines.push(`${labels.lectureObjectivesLabel}:`);
      lines.push(mm.lectureObjectives);
    }

    if (Array.isArray(mm.topics) && mm.topics.length > 0) {
      mm.topics.forEach((topic, tIdx) => {
        lines.push('');
        const tTitle =
          topic.topic && String(topic.topic).trim().length > 0
            ? topic.topic
            : `${labels.topicLabel} ${tIdx + 1}`;

        lines.push(`${labels.topicLabel} ${tIdx + 1}: ${tTitle}`);

        // 汎用フィールド群
        appendStringArrayBlock(
          lines,
          topic.discussion,
          labels.discussionLabel
        );
        appendStringArrayBlock(
          lines,
          topic.decisions,
          labels.decisionsLabel
        );
        appendStringArrayBlock(
          lines,
          topic.actionItems,
          labels.actionItemsLabel
        );
        appendStringArrayBlock(
          lines,
          topic.concerns,
          labels.concernsLabel
        );
        appendStringArrayBlock(
          lines,
          topic.keyMessages,
          labels.keyMessagesLabel
        );
        appendStringArrayBlock(
          lines,
          topic.customerNeeds,
          labels.customerNeedsLabel
        );

        // proposals（あれば）
        if (Array.isArray(topic.proposals) && topic.proposals.length > 0) {
          lines.push(`${labels.proposalsLabel}:`);
          topic.proposals.forEach((p, pIdx) => {
            const head = p.proposal || `${labels.proposalsLabel} #${pIdx + 1}`;
            const by = p.proposedBy || labels.unknownSpeaker;
            lines.push(`  - ${head}  (${by})`);

            appendStringArrayBlock(
              lines,
              p.proposalReasons,
              `    ${labels.reasonsLabel}`
            );
            appendStringArrayBlock(
              lines,
              p.keyDiscussion,
              `    ${labels.discussionLabel}`
            );
            appendStringArrayBlock(
              lines,
              p.decisionsAndTasks,
              `    ${labels.actionItemsLabel}`
            );
          });
        }
      });
    }
  });

  return lines.join('\n');
}

function formatMeetingMinutesHtml(mmOrArray, labels) {
  const list = Array.isArray(mmOrArray) ? mmOrArray : [mmOrArray];
  if (!list.length) {
    return (
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(labels.noMinutes) +
      '</pre>'
    );
  }

  let html = '';

  list.forEach((mm, idx) => {
    if (idx > 0) {
      html +=
        '<hr style="margin:24px 0;border:none;border-top:1px solid #ddd;"/>';
    }

    const title = mm.meetingTitle || labels.untitledMeeting;
    html += `<h2>${escapeHtml(title)}</h2>`;

    if (mm.date) {
      html += `<p><strong>${escapeHtml(labels.dateLabel)}:</strong> ${escapeHtml(
        mm.date
      )}</p>`;
    }
    if (mm.location) {
      html += `<p><strong>${escapeHtml(
        labels.locationLabel
      )}:</strong> ${escapeHtml(mm.location)}</p>`;
    }
    if (Array.isArray(mm.attendees) && mm.attendees.length > 0) {
      html += `<p><strong>${escapeHtml(
        labels.attendeesLabel
      )}:</strong> ${escapeHtml(mm.attendees.join(', '))}</p>`;
    }
    if (Array.isArray(mm.presenter) && mm.presenter.length > 0) {
      html += `<p><strong>${escapeHtml(
        labels.presenterLabel
      )}:</strong> ${escapeHtml(mm.presenter.join(', '))}</p>`;
    }

    if (
      mm.toneInsights &&
      Array.isArray(mm.toneInsights.meetingAtmosphere) &&
      mm.toneInsights.meetingAtmosphere.length > 0
    ) {
      html += `<p><strong>${escapeHtml(
        labels.atmosphereLabel
      )}:</strong> ${escapeHtml(
        mm.toneInsights.meetingAtmosphere.join(', ')
      )}</p>`;
    }

    if (mm.coreMessage) {
      html += `<h3>${escapeHtml(labels.coreMessageLabel)}</h3>`;
      html += `<p>${escapeHtml(mm.coreMessage)}</p>`;
    }

    if (mm.lectureObjectives) {
      html += `<h3>${escapeHtml(labels.lectureObjectivesLabel)}</h3>`;
      html += `<p>${escapeHtml(mm.lectureObjectives)}</p>`;
    }

    if (Array.isArray(mm.topics) && mm.topics.length > 0) {
      mm.topics.forEach((topic, tIdx) => {
        const tTitle =
          topic.topic && String(topic.topic).trim().length > 0
            ? topic.topic
            : `${labels.topicLabel} ${tIdx + 1}`;

        html += `<h3>${escapeHtml(
          `${labels.topicLabel} ${tIdx + 1}: ${tTitle}`
        )}</h3>`;

        // 汎用フィールド群
        html += buildHtmlListBlock(
          topic.discussion,
          labels.discussionLabel
        );
        html += buildHtmlListBlock(
          topic.decisions,
          labels.decisionsLabel
        );
        html += buildHtmlListBlock(
          topic.actionItems,
          labels.actionItemsLabel
        );
        html += buildHtmlListBlock(
          topic.concerns,
          labels.concernsLabel
        );
        html += buildHtmlListBlock(
          topic.keyMessages,
          labels.keyMessagesLabel
        );
        html += buildHtmlListBlock(
          topic.customerNeeds,
          labels.customerNeedsLabel
        );

        // proposals
        if (Array.isArray(topic.proposals) && topic.proposals.length > 0) {
          html += `<h4>${escapeHtml(labels.proposalsLabel)}</h4>`;
          topic.proposals.forEach((p, pIdx) => {
            const head = p.proposal || `${labels.proposalsLabel} #${pIdx + 1}`;
            const by = p.proposedBy || labels.unknownSpeaker;

            html += `<p><strong>${escapeHtml(head)}</strong> (${escapeHtml(
              by
            )})</p>`;

            html += buildHtmlListBlock(
              p.proposalReasons,
              labels.reasonsLabel
            );
            html += buildHtmlListBlock(
              p.keyDiscussion,
              labels.discussionLabel
            );
            html += buildHtmlListBlock(
              p.decisionsAndTasks,
              labels.actionItemsLabel
            );
          });
        }
      });
    }
  });

  return html;
}

/* 汎用：文字列配列をテキストブロックとして追加 */
function appendStringArrayBlock(lines, arr, label) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  lines.push(`${label}:`);
  arr.forEach((v) => {
    lines.push(`  • ${v}`);
  });
}

/* 汎用：文字列配列を HTML <ul> ブロックとして返す */
function buildHtmlListBlock(arr, label) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  let html = `<p><strong>${escapeHtml(label)}:</strong></p><ul>`;
  arr.forEach((v) => {
    html += `<li>${escapeHtml(v)}</li>`;
  });
  html += '</ul>';
  return html;
}

/* --------------------------------------------------
 *  公開 API
 *  - buildMinutesEmailBodies      : Minutes + Transcript
 *  - buildMinutesOnlyEmailBodies  : Minutesのみ
 *  （どちらも minutes が JSON / 文字列 どちらでもOK）
 *  locale は任意。渡さない場合は英語。
 * -------------------------------------------------- */

/**
 * Minutes + Transcript 両方を含んだメール本文
 * - /api/transcribe
 * - /api/send-minutes-email
 *
 * @param {Object} params
 * @param {string|Object} params.minutes
 * @param {string|Object} [params.transcription]
 * @param {string}        [params.locale]  // 例: "ja", "en-US"
 * @returns {{ textBody: string, htmlBody: string }}
 */
function buildMinutesEmailBodies({ minutes, transcription, locale }) {
  const labels = loadLocaleMessages(locale);

  const minutesInfo = analyzeMinutes(minutes);

  let minutesText;
  let minutesHtml;

  if (minutesInfo.schema === 'flexible') {
    minutesText = formatFlexibleNotesText(minutesInfo.value, labels);
    minutesHtml = formatFlexibleNotesHtml(minutesInfo.value, labels);
  } else if (minutesInfo.schema === 'meetingMinutes') {
    minutesText = formatMeetingMinutesText(minutesInfo.value, labels);
    minutesHtml = formatMeetingMinutesHtml(minutesInfo.value, labels);
  } else {
    // 純テキスト or スキーマ不明 → そのまま
    minutesText =
      minutesInfo.raw && minutesInfo.raw.trim().length > 0
        ? minutesInfo.raw
        : labels.noMinutes;

    minutesHtml =
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(minutesText) +
      '</pre>';
  }

  // transcription はそのままテキストとして扱う
  let transcriptText = '';
  if (transcription != null) {
    if (typeof transcription === 'string') {
      transcriptText = transcription;
    } else {
      try {
        transcriptText = JSON.stringify(transcription, null, 2);
      } catch {
        transcriptText = String(transcription);
      }
    }
  }

  const textParts = [];
  textParts.push(`=== ${labels.minutesHeading} ===`);
  textParts.push('');
  textParts.push(minutesText || labels.noMinutes);

  if (transcriptText && transcriptText.trim().length > 0) {
    textParts.push('');
    textParts.push(`=== ${labels.transcriptHeading} ===`);
    textParts.push('');
    textParts.push(transcriptText);
  }

  const textBody = textParts.join('\n');

  let htmlBody =
    `<h2>${escapeHtml(labels.minutesHeading)}</h2>` + minutesHtml;

  if (transcriptText && transcriptText.trim().length > 0) {
    htmlBody += `<hr/><h3>${escapeHtml(
      labels.transcriptHeading
    )}</h3><pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${escapeHtml(
      transcriptText
    )}</pre>`;
  }

  return { textBody, htmlBody };
}

/**
 * Minutes だけを送るメール本文
 * - /api/minutes-email-from-audio で使用（Transcriptは付けない想定）
 *
 * @param {Object} params
 * @param {string|Object} params.minutes
 * @param {string}        [params.locale]
 * @returns {{ textBody: string, htmlBody: string }}
 */
function buildMinutesOnlyEmailBodies({ minutes, locale }) {
  const labels = loadLocaleMessages(locale);
  const minutesInfo = analyzeMinutes(minutes);

  let minutesText;
  let minutesHtml;

  if (minutesInfo.schema === 'flexible') {
    minutesText = formatFlexibleNotesText(minutesInfo.value, labels);
    minutesHtml = formatFlexibleNotesHtml(minutesInfo.value, labels);
  } else if (minutesInfo.schema === 'meetingMinutes') {
    minutesText = formatMeetingMinutesText(minutesInfo.value, labels);
    minutesHtml = formatMeetingMinutesHtml(minutesInfo.value, labels);
  } else {
    minutesText =
      minutesInfo.raw && minutesInfo.raw.trim().length > 0
        ? minutesInfo.raw
        : labels.noMinutes;

    minutesHtml =
      '<pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;">' +
      escapeHtml(minutesText) +
      '</pre>';
  }

  const textBody = minutesText || labels.noMinutes;
  const htmlBody = minutesHtml;

  return { textBody, htmlBody };
}

module.exports = {
  buildMinutesEmailBodies, // ({ minutes, transcription, locale }) => { textBody, htmlBody }
  buildMinutesOnlyEmailBodies, // ({ minutes, locale }) => { textBody, htmlBody }
};
