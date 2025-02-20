// routes/apple.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Firebase の初期化（既に初期化済みの場合は再初期化されません）
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    });
    console.log("✅ Firebase Admin SDK initialized in Apple webhook route.");
  } catch (error) {
    console.error("🚨 Firebase Admin SDK initialization error:", error);
  }
}

const db = admin.firestore();

/**
 * ユーザーのサブスクリプション状態を更新する関数
 * @param {string} userId - Firestore のユーザードキュメントID
 * @param {boolean} subscriptionActive - 有効なら true、無効なら false
 */
async function updateSubscriptionStatus(userId, subscriptionActive) {
  try {
    await db.collection('users').doc(userId).update({
      subscription: subscriptionActive,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Updated subscription for user ${userId} to ${subscriptionActive}`);
  } catch (error) {
    console.error(`❌ Failed to update subscription for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Apple Server-to-Server Notification エンドポイント
 * 受信した通知に基づいて、ユーザーのサブスクリプション状態を Firebase に更新します。
 */
router.post('/notifications', async (req, res) => {
  try {
    console.log("📥 [DEBUG] Apple通知リクエスト受信");
    console.log("📥 [DEBUG] リクエストヘッダー:", JSON.stringify(req.headers, null, 2));
    console.log("📥 [DEBUG] リクエストボディ (raw):", req.body);

    let body = req.body;

    // Buffer の場合は JSON に変換
    if (Buffer.isBuffer(body)) {
      console.log("📥 [DEBUG] `req.body` は Buffer でした。JSON に変換します。");
      body = JSON.parse(body.toString());
    }

    console.log("📥 [DEBUG] Apple通知受信 (変換後):", body);

    if (!body || typeof body !== 'object') {
      console.error("❌ [ERROR] `req.body` がオブジェクトではありません:", body);
      return res.status(400).send("Invalid request format");
    }

    if (!body.data || !body.data.originalTransactionId) {
      console.error("❌ [ERROR] 必須フィールドが不足しています:", body);
      return res.status(400).send("Invalid request format");
    }

    const originalTransactionId = body.data.originalTransactionId;
    const notificationType = body.notificationType;
    console.log("🔔 [DEBUG] notificationType:", notificationType);
    console.log("🔑 [DEBUG] originalTransactionId:", originalTransactionId);

    let subscriptionActive = false;
    if (["INITIAL_BUY", "DID_RENEW", "INTERACTIVE_RENEWAL"].includes(notificationType)) {
      subscriptionActive = true;
    } else if (["CANCEL", "EXPIRED", "DID_FAIL_TO_RENEW"].includes(notificationType)) {
      subscriptionActive = false;
    } else {
      console.log("⚠️ [DEBUG] Unhandled notificationType. No update performed.");
      return res.status(200).send("Unhandled notificationType");
    }

    // Firestore で `originalTransactionId` を検索
    console.log("🔎 [DEBUG] Firestore で `originalTransactionId` を検索...");
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where("originalTransactionId", "==", originalTransactionId).limit(1).get();

    if (querySnapshot.empty) {
      console.error("❌ [ERROR] No user found with originalTransactionId:", originalTransactionId);
      return res.status(404).send("User not found");
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    console.log("✅ [DEBUG] Firestore ユーザー ID:", userId);

    await updateSubscriptionStatus(userId, subscriptionActive);

    console.log("✅ [DEBUG] ユーザーのサブスクリプション状態を更新完了");
    return res.status(200).send("OK");
  } catch (error) {
    console.error("🚨 [ERROR] Apple S2S Webhook 処理中にエラー:", error);
    return res.status(500).send("Error processing notification");
  }
});



module.exports = router;
