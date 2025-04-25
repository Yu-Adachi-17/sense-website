const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();

// ✅ メール送信用 Nodemailer セットアップ
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ メール送信関数（POST）
exports.sendTimelyNoteLink = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const recipients = req.body.recipients;
  const url = req.body.url;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Invalid recipients array" });
  }

  const mailOptions = {
    from: `"Minutes.AI" <${process.env.EMAIL_USER}>`,
    to: recipients.join(","),
    subject: "Minutes.AI | Shared Meeting Transcript",
    text: `A live meeting transcript was shared with you via Minutes.AI.

You can view it here:
${url}

---

Interested in a smarter way to capture meetings?
Try Minutes.AI for yourself:
https://apps.apple.com/sg/app/minutes-ai/id6504087901

— The Minutes.AI Team`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("メール送信エラー:", error);
    return res.status(500).json({ error: "メール送信に失敗しました。" });
  }
});

// ✅ 24時間以内＆isActive=true のときだけ取得を許可
exports.getTimelyNote = functions.https.onRequest(async (req, res) => {
  const docId = req.query.id;
  if (!docId) return res.status(400).send("Missing id");

  try {
    const docRef = admin.firestore().collection("timelyNotes").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).send("Document not found");
    }

    const data = docSnap.data();
    const now = admin.firestore.Timestamp.now();
    const updatedAt = data.updatedAt;
    const isActive = data.isActive !== false; // デフォルト true

    const diffSeconds = now.seconds - updatedAt.seconds;
    if (diffSeconds > 86400 || !isActive) {
      return res.status(403).send("Link expired or deactivated");
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("取得エラー:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// ✅ 手動で該当リンクを即時無効化する callable 関数
exports.deactivateTimelyNote = functions.https.onCall(async (data, context) => {
    const noteNumber = data.noteNumber;
    if (!noteNumber || typeof noteNumber !== 'string') {
      throw new functions.https.HttpsError("invalid-argument", "noteNumber is required and must be a string");
    }
  
    try {
      await admin.firestore().collection("timelyNotes").doc(noteNumber).update({
        isActive: false
      });
      return { success: true };
    } catch (error) {
      console.error("無効化エラー:", error);
      throw new functions.https.HttpsError("internal", "Failed to deactivate");
    }
  });
  
  
