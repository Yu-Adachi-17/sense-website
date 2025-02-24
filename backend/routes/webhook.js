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
    let customerId = session.customer;

    // 追加: 消耗アイテムの場合、customer が null の場合は PaymentIntent から取得する
    if (!customerId && session.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
      customerId = paymentIntent.customer;
    }

    console.log("✅ userId:", userId);
    console.log("✅ productId:", productId);
    console.log("✅ customerId:", customerId);

    if (!userId || !customerId) {
      console.error("❌ userId または customerId が取得できません。Firebase の更新をスキップします。");
      return;
    }

    // ✅ Stripe の顧客情報に userId をセット
    await stripe.customers.update(customerId, {
      metadata: { userId }
    });

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

    if (productValue === 'unlimited' || productValue === 'yearly-unlimited') {
      await userRef.update({
        subscription: true,
        lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Firebase updated: userId=${userId}, subscription enabled`);
    }
  } catch (error) {
    console.error("❌ Error updating Firebase:", error);
  }
};

// 🎯 サブスクリプション更新時の処理
const handleSubscriptionUpdated = async (subscription) => {
  try {
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata.userId;

    console.log("✅ サブスクリプション更新処理開始: userId=", userId);

    if (!userId) {
      console.error("❌ ユーザーIDが見つかりません");
      return;
    }

    const userRef = db.collection('users').doc(userId);
    const currentPeriodEnd = subscription.current_period_end * 1000; // ミリ秒変換
    const now = Date.now();

    if (subscription.cancel_at_period_end) {
      // 解約予約の場合、有効期限を記録する
      await userRef.update({
        subscription: true,
        subscriptionExpiresAt: new Date(currentPeriodEnd)
      });
      console.log(`✅ Firebase updated: userId=${userId}, subscriptionExpiresAt=${new Date(currentPeriodEnd)}`);
    }
  } catch (error) {
    console.error("❌ Subscription 更新時の Firebase 更新エラー:", error);
  }
};

// 🎯 サブスクリプション削除時の処理
const handleSubscriptionDeleted = async (subscription) => {
  try {
    const customerId = subscription.customer;

    if (!customerId) {
      console.error("❌ customerId が取得できません");
      return;
    }

    // ✅ Stripe の顧客情報を取得して metadata から userId を取得
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata?.userId;

    console.log("✅ 解約処理開始: userId=", userId);

    if (!userId) {
      console.error("❌ 解約処理エラー: userId が取得できません");
      return;
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const subscriptionExpiresAt = userDoc.data()?.subscriptionExpiresAt?.toDate();

    const now = new Date();

    if (subscriptionExpiresAt && subscriptionExpiresAt > now) {
      // 利用期間がまだ残っている場合は、解約予約済み状態としフラグは維持
      console.log(`✅ サブスクリプションは ${subscriptionExpiresAt} まで有効`);
    } else {
      // 期間が終了している場合は、subscription フラグを false に更新
      await userRef.update({
        subscription: false,
        subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Firebase updated: userId=${userId}, subscription disabled`);
    }
  } catch (error) {
    console.error("❌ 解約時の Firebase 更新エラー:", error);
  }
};

// 🎯 Webhook のエンドポイントを修正
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
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
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
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
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
