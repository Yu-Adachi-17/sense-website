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
 * Firestore のユーザー情報を更新
 * @param {string} userId - Firestore のユーザードキュメントID
 * @param {boolean} subscriptionActive - サブスクリプションの有効状態
 * @param {string} originalTransactionId - Apple の originalTransactionId
 * @param {string} productId - 購入されたプロダクトID
 * @param {Date} expiresDate - サブスクリプションの有効期限
 */
async function updateSubscriptionStatus(userId, subscriptionActive, originalTransactionId, productId, expiresDate) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`❌ [ERROR] Firestore に該当ユーザーが存在しません (User ID: ${userId})`);
      return;
    }

    let updateData = {
      subscription: subscriptionActive,
      subscriptionPlan: productId,
      subscriptionEndDate: expiresDate ? admin.firestore.Timestamp.fromDate(expiresDate) : null,
      lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp(),
    };

    // originalTransactionId が未登録の場合のみ追加
    if (!userDoc.data().originalTransactionId) {
      updateData.originalTransactionId = originalTransactionId;
    }

    await userRef.update(updateData);
    console.log(`✅ [DEBUG] ユーザー ${userId} のサブスクリプションを更新`);
  } catch (error) {
    console.error(`❌ [ERROR] Firestore 更新エラー (User ID: ${userId}):`, error);
  }
}

/**
 * Apple Server-to-Server Notification エンドポイント
 */
router.post('/notifications', express.json(), async (req, res) => {
  try {
    console.log("📥 [DEBUG] Apple通知リクエスト受信");
    console.log("📥 [DEBUG] リクエストヘッダー:", JSON.stringify(req.headers, null, 2));
    console.log("📥 [DEBUG] リクエストボディ:", req.body);

    let body = req.body;

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

    if (!decodedPayload || !decodedPayload.notificationType || !decodedPayload.data) {
      console.error("❌ [ERROR] 必須フィールドが不足しています:", decodedPayload);
      return res.status(400).send("Invalid request format: missing required fields");
    }

    // originalTransactionId の取得
    let originalTransactionId = decodedPayload.data.originalTransactionId;
    let productId = null;
    let expiresDate = null;

    if (!originalTransactionId && decodedPayload.data.signedTransactionInfo) {
      try {
        const innerPayload = jwt.decode(decodedPayload.data.signedTransactionInfo);
        console.log("📥 [DEBUG] デコード済み signedTransactionInfo:", innerPayload);
        if (innerPayload) {
          originalTransactionId = innerPayload.originalTransactionId;
          productId = innerPayload.productId;
          expiresDate = innerPayload.expiresDate ? new Date(innerPayload.expiresDate) : null;
        }
      } catch (err) {
        console.error("🚨 [ERROR] signedTransactionInfo のデコード失敗:", err);
      }
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
    if (["INITIAL_BUY", "DID_RENEW", "INTERACTIVE_RENEWAL", "SUBSCRIBED", "DID_CHANGE_RENEWAL_PREF"].includes(notificationType)) {
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

    let userId;
    if (!querySnapshot.empty) {
      userId = querySnapshot.docs[0].id;
    } else {
      console.error("❌ [ERROR] Firestore にユーザーが見つかりません:", originalTransactionId);
      return res.status(404).send("User not found");
    }

    console.log("✅ [DEBUG] Firestore ユーザー ID:", userId);

    // Firestore のサブスクリプション情報を更新
    await updateSubscriptionStatus(userId, subscriptionActive, originalTransactionId, productId, expiresDate);

    console.log("✅ [DEBUG] ユーザーのサブスクリプション状態を更新完了");
    return res.status(200).send("OK");
  } catch (error) {
    console.error("🚨 [ERROR] Apple通知処理中にエラー発生:", error);
    return res.status(500).send("Error processing notification");
  }
});

module.exports = router;
