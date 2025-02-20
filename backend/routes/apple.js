// routes/apple.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken'); // JWT デコード用

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
    console.log(`✅ [DEBUG] ユーザー ${userId} のサブスクリプション状態を ${subscriptionActive} に更新`);
  } catch (error) {
    console.error(`❌ [ERROR] Firestore の更新に失敗 (User ID: ${userId}):`, error);
    throw error;
  }
}

/**
 * Apple Server-to-Server Notification エンドポイント
 * 受信した通知に基づいて、ユーザーのサブスクリプション状態を Firebase に更新します。
 */
router.post('/notifications', express.json(), async (req, res) => {
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

    // Apple の通知は signedPayload にエンコードされている
    if (!body || !body.signedPayload) {
      console.error("❌ [ERROR] signedPayload が見つかりません:", body);
      return res.status(400).send("Invalid request format: signedPayload is missing");
    }

    // JWT をデコード
    let decodedPayload;
    try {
      decodedPayload = jwt.decode(body.signedPayload);
      console.log("📥 [DEBUG] デコード済み Payload:", decodedPayload);
    } catch (err) {
      console.error("🚨 [ERROR] JWT デコードに失敗:", err);
      return res.status(400).send("Invalid JWT payload");
    }

    // 必須フィールドの存在をチェック
    if (!decodedPayload || !decodedPayload.notificationType || !decodedPayload.data) {
      console.error("❌ [ERROR] 必須フィールドが不足しています:", decodedPayload);
      return res.status(400).send("Invalid request format: missing required fields");
    }

    // originalTransactionId が直接取得できない場合、signedTransactionInfo から取得する
    let originalTransactionId = decodedPayload.data.originalTransactionId;
    if (!originalTransactionId && decodedPayload.data.signedTransactionInfo) {
      const innerPayload = jwt.decode(decodedPayload.data.signedTransactionInfo);
      console.log("📥 [DEBUG] デコード済み signedTransactionInfo:", innerPayload);
      originalTransactionId = innerPayload && innerPayload.originalTransactionId;
    }

    if (!originalTransactionId) {
      console.error("❌ [ERROR] originalTransactionId が取得できませんでした:", decodedPayload);
      return res.status(400).send("Invalid request format: originalTransactionId is missing");
    }

    const notificationType = decodedPayload.notificationType;
    console.log("🔔 [DEBUG] notificationType:", notificationType);
    console.log("🔑 [DEBUG] originalTransactionId:", originalTransactionId);

    // サブスクリプション状態の判定
    let subscriptionActive = false;
    if (["INITIAL_BUY", "DID_RENEW", "INTERACTIVE_RENEWAL", "SUBSCRIBED"].includes(notificationType)) {
      // SUBSCRIBED (または RESUBSCRIBE など) は新規・更新とみなす
      subscriptionActive = true;
    } else if (["CANCEL", "EXPIRED", "DID_FAIL_TO_RENEW"].includes(notificationType)) {
      subscriptionActive = false;
    } else {
      console.log("⚠️ [DEBUG] 未対応の notificationType:", notificationType);
      return res.status(200).send("Unhandled notificationType");
    }

    // Firestore で originalTransactionId を検索
    console.log("🔎 [DEBUG] Firestore で `originalTransactionId` を検索...");
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where("originalTransactionId", "==", originalTransactionId).limit(1).get();

    if (querySnapshot.empty) {
      console.error("❌ [ERROR] Firestore にユーザーが見つかりません:", originalTransactionId);
      return res.status(404).send("User not found");
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    console.log("✅ [DEBUG] Firestore ユーザー ID:", userId);

    await updateSubscriptionStatus(userId, subscriptionActive);

    console.log("✅ [DEBUG] ユーザーのサブスクリプション状態を更新完了");
    return res.status(200).send("OK");
  } catch (error) {
    console.error("🚨 [ERROR] Apple通知処理中にエラー発生:", error);
    return res.status(500).send("Error processing notification");
  }
});

module.exports = router;
