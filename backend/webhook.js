const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const admin = require('firebase-admin');

// 🔧 Firebase 初期化
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    });
  }
} catch (error) {
  console.error("🚨 Firebase Admin SDK の初期化に失敗:", error);
}

const db = admin.firestore();

// 🔧 Stripe API 初期化
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

// 🔧 商品IDマッピング
const PRODUCT_MAP = {
  [process.env.STRIPE_PRODUCT_UNLIMITED]: 'unlimited',
  [process.env.STRIPE_PRODUCT_120MIN]: 120,
  [process.env.STRIPE_PRODUCT_1200MIN]: 1200
};

// 環境変数のバリデーション
for (const [key, value] of Object.entries(PRODUCT_MAP)) {
  if (!key || !value) {
    console.error(`⚠️ 環境変数が不足しています: ${key} -> ${value}`);
  }
}

// 🎯 `handleCheckoutSessionCompleted()` を定義（ここが追加部分！）
const handleCheckoutSessionCompleted = async (session) => {
    try {
      console.log("🔍 Webhook received session:", session); // セッションデータを確認
  
      const userId = session.client_reference_id; // クライアント側から送信されたユーザーID
      const productId = session.metadata.product_id; // メタデータから商品IDを取得
      console.log("✅ userId:", userId);
      console.log("✅ productId:", productId);
  
      const minutesToAdd = PRODUCT_MAP[productId];
      if (!minutesToAdd) {
        console.error(`❌ Unknown product_id: ${productId}`);
        return;
      }
  
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      console.log("🔍 Firebase user document:", userDoc.exists ? userDoc.data() : "Document not found");
  
      if (!userDoc.exists) {
        console.error(`❌ User not found in Firestore: ${userId}`);
        return;
      }
  
      const currentMinutes = userDoc.data().remainingMinutes || 0;
      const newMinutes = currentMinutes + minutesToAdd;
  
      await userRef.update({
        remainingMinutes: newMinutes,
        lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp()
      });
  
      console.log(`✅ Firebase updated: userId=${userId}, addedMinutes=${minutesToAdd}`);
    } catch (error) {
      console.error("❌ Error updating Firebase:", error);
    }
  };
  

// 🎯 Webhook エンドポイント
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
  } catch (err) {
    console.error("🚨 Webhook の署名検証に失敗:", err.message);
    return res.status(400).json({ error: "Webhook verification failed", details: err.message });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        // ここに `handleSubscriptionUpdated(event.data.object);` を追加予定
        break;
      case 'customer.subscription.deleted':
        // ここに `handleSubscriptionDeleted(event.data.object);` を追加予定
        break;
      default:
        console.log(`⚠️ 未処理の Webhook イベント: ${event.type}`);
    }
  } catch (err) {
    console.error(`🔥 Webhook の処理中にエラーが発生 (${event.type}):`, err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }

  res.sendStatus(200);
});

module.exports = router;
