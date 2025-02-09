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
// unlimited の場合は文字列、それ以外は分数（数値）
const PRODUCT_MAP = {
  [process.env.STRIPE_PRODUCT_UNLIMITED]: 'unlimited',
  [process.env.STRIPE_PRODUCT_120MIN]: 120,
  [process.env.STRIPE_PRODUCT_1200MIN]: 1200,
  [process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED]: 'yearly-unlimited' // 新規追加
};

// 環境変数のバリデーション
for (const [key, value] of Object.entries(PRODUCT_MAP)) {
  if (!key || !value) {
    console.error(`⚠️ 環境変数が不足しています: ${key} -> ${value}`);
  }
}

// 🎯 Checkout Session 完了時の処理
const handleCheckoutSessionCompleted = async (session) => {
  try {
    console.log("🔍 Webhook received session:", session);

    const userId = session.client_reference_id;
    const productId = session.metadata.product_id;
    console.log("✅ userId:", userId);
    console.log("✅ productId:", productId);

    // userId が取得できなければ処理を中断
    if (!userId) {
      console.error("❌ userId がセットされていません。Firebase の更新をスキップします。");
      return;
    }

    const productValue = PRODUCT_MAP[productId];
    if (!productValue) {
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

    // unlimited購入の場合：時間はそのままで、subscriptionフラグのみ更新

    // サブスクリプションの場合（無制限／年額無制限）
    if (productValue === 'unlimited' || productValue === 'yearly-unlimited') {
      await userRef.update({
        subscription: true,
        lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Firebase updated: userId=${userId}, subscription enabled`);
    }
    // 分数（分）で購入する場合
    else if (typeof productValue === 'number') {
      const secondsToAdd = productValue * 60;
      const currentSeconds = userDoc.data().remainingSeconds || 0;
      const newSeconds = currentSeconds + secondsToAdd;

      await userRef.update({
        remainingSeconds: newSeconds,
        lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Firebase updated: userId=${userId}, addedSeconds=${secondsToAdd}`);
    } else {
      console.error(`❌ Unhandled product type for productValue: ${productValue}`);
    }
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
        // ここに handleSubscriptionUpdated(event.data.object); を追加予定
        break;
      case 'customer.subscription.deleted':
        // ここに handleSubscriptionDeleted(event.data.object); を追加予定
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
