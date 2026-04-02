const express = require('express');
const router = express.Router();
const { sendMinutesEmail } = require('../services/mailgunService');

/**
 * POST /api/team/send-invite
 * Send a team invitation email via Mailgun
 *
 * body: {
 *   recipientEmail: string,
 *   recipientName?: string,
 *   teamName: string,
 *   inviterName: string,
 *   inviteCode: string,
 *   locale?: string  // "ja" | "en" | "de" etc.
 * }
 */
router.post('/send-invite', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      teamName,
      inviterName,
      inviteCode,
      locale = 'en',
    } = req.body;

    if (!recipientEmail || !teamName || !inviterName || !inviteCode) {
      return res.status(400).json({
        error: 'Missing required fields: recipientEmail, teamName, inviterName, inviteCode',
      });
    }

    const inviteLink = `https://sense-ai.world/team/join?code=${inviteCode}`;
    const iosLink = 'https://apps.apple.com/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901';
    const androidLink = 'https://play.google.com/store/apps/details?id=world.senseai.minutes';

    const isJa = locale.startsWith('ja');
    const isDe = locale.startsWith('de');

    const subject = isJa
      ? `${inviterName}さんが「${teamName}」に招待しています — Minutes.AI`
      : isDe
        ? `${inviterName} hat Sie zu „${teamName}" eingeladen — Minutes.AI`
        : `${inviterName} invited you to "${teamName}" — Minutes.AI`;

    const greeting = recipientName || (isJa ? 'こんにちは' : isDe ? 'Hallo' : 'Hi there');

    const html = buildInviteHtml({
      greeting,
      inviterName,
      teamName,
      inviteLink,
      iosLink,
      androidLink,
      isJa,
      isDe,
    });

    const text = buildInviteText({
      greeting,
      inviterName,
      teamName,
      inviteLink,
      iosLink,
      androidLink,
      isJa,
      isDe,
    });

    const result = await sendMinutesEmail({
      to: recipientEmail,
      subject,
      text,
      html,
      locale,
    });

    res.json({ success: true, messageId: result?.id });
  } catch (error) {
    console.error('[ERROR] /api/team/send-invite:', error);
    res.status(500).json({
      error: 'Failed to send invitation email',
      details: error.message,
    });
  }
});

// ─── HTML Template ───

function buildInviteHtml({ greeting, inviterName, teamName, inviteLink, iosLink, androidLink, isJa, isDe }) {
  const t = {
    title: isJa ? 'チームに参加しませんか？' : isDe ? 'Treten Sie dem Team bei' : 'You\'re invited to join a team',
    body1: isJa
      ? `${inviterName}さんが <strong>Minutes.AI</strong> のチーム「<strong>${teamName}</strong>」にあなたを招待しています。`
      : isDe
        ? `${inviterName} hat Sie zum Team „<strong>${teamName}</strong>" auf <strong>Minutes.AI</strong> eingeladen.`
        : `${inviterName} has invited you to the team "<strong>${teamName}</strong>" on <strong>Minutes.AI</strong>.`,
    body2: isJa
      ? '会議の議事録やナレッジがチーム全体で共有されます。参加は無料です。'
      : isDe
        ? 'Besprechungsprotokolle und Wissen werden im gesamten Team geteilt. Die Teilnahme ist kostenlos.'
        : 'Meeting minutes and knowledge will be shared across your entire team. Joining is free.',
    joinBtn: isJa ? 'チームに参加する' : isDe ? 'Team beitreten' : 'Join the Team',
    orDownload: isJa ? 'アプリをまだお持ちでない方' : isDe ? 'App noch nicht installiert?' : 'Don\'t have the app yet?',
    footer: isJa
      ? 'このメールは Minutes.AI のチーム招待機能によって送信されました。'
      : isDe
        ? 'Diese E-Mail wurde über die Team-Einladungsfunktion von Minutes.AI gesendet.'
        : 'This email was sent via the team invitation feature of Minutes.AI.',
  };

  return `<!DOCTYPE html>
<html lang="${isJa ? 'ja' : isDe ? 'de' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1E3A5F,#2563EB);padding:32px 24px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Minutes.AI</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${t.title}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 28px;">
          <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">${greeting},</p>
          <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">${t.body1}</p>
          <p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 28px;">${t.body2}</p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1E3A5F);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                ${t.joinBtn}
              </a>
            </td></tr>
          </table>

          <!-- App Download -->
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;">
            <p style="font-size:13px;color:#888;text-align:center;margin:0 0 16px;">${t.orDownload}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" align="center" style="padding:4px;">
                  <a href="${iosLink}" style="display:inline-flex;align-items:center;gap:6px;background:#000;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;">
                    <span style="font-size:18px;">&#63743;</span> iPhone
                  </a>
                </td>
                <td width="50%" align="center" style="padding:4px;">
                  <a href="${androidLink}" style="display:inline-flex;align-items:center;gap:6px;background:#34A853;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;">
                    <span style="font-size:16px;">&#9654;</span> Android
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 28px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="font-size:11px;color:#aaa;text-align:center;margin:0;line-height:1.5;">
            ${t.footer}<br>
            &copy; Sense LLC
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Plain Text Fallback ───

function buildInviteText({ greeting, inviterName, teamName, inviteLink, iosLink, androidLink, isJa }) {
  if (isJa) {
    return `${greeting}、

${inviterName}さんが Minutes.AI のチーム「${teamName}」にあなたを招待しています。
会議の議事録やナレッジがチーム全体で共有されます。参加は無料です。

チームに参加: ${inviteLink}

アプリをまだお持ちでない方:
iPhone: ${iosLink}
Android: ${androidLink}

---
Sense LLC`;
  }

  return `${greeting},

${inviterName} has invited you to the team "${teamName}" on Minutes.AI.
Meeting minutes and knowledge will be shared across your entire team. Joining is free.

Join the Team: ${inviteLink}

Don't have the app yet?
iPhone: ${iosLink}
Android: ${androidLink}

---
Sense LLC`;
}

module.exports = router;
