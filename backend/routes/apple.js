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
    const notification = req.body;
    console.log("📥 Received Apple S2S notification:", notification);

    const originalTransactionId = notification.data && notification.data.originalTransactionId;
    if (!originalTransactionId) {
      console.error("❌ originalTransactionId not found in notification");
      return res.status(400).send("Missing originalTransactionId");
    }

    const notificationType = notification.notificationType;
    console.log("🔔 notificationType:", notificationType);

    let subscriptionActive = false;
    if (notificationType === "INITIAL_BUY" || notificationType === "DID_RENEW" || notificationType === "INTERACTIVE_RENEWAL") {
      subscriptionActive = true;
    } else if (notificationType === "CANCEL" || notificationType === "EXPIRED" || notificationType === "DID_FAIL_TO_RENEW") {
      subscriptionActive = false;
    } else {
      console.log("⚠️ Unhandled notificationType. No update performed.");
      return res.status(200).send("Unhandled notificationType");
    }

    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where("originalTransactionId", "==", originalTransactionId).limit(1).get();
    if (querySnapshot.empty) {
      console.error("❌ No user found with originalTransactionId:", originalTransactionId);
      return res.status(404).send("User not found");
    }
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    await updateSubscriptionStatus(userId, subscriptionActive);

    return res.status(200).send("OK");
  } catch (error) {
    console.error("🚨 Error processing Apple S2S notification:", error);
    return res.status(500).send("Error processing notification");
  }
});

module.exports = router;
