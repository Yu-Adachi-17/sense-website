// routes/webhook.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const admin = require('firebase-admin');

// --- Firebase 初期化 ---
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

// --- Stripe 初期化 ---
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

// --- 商品ID → 付与種別マップ（Product ID をキーにする）---
const PRODUCT_MAP = {
  [process.env.STRIPE_PRODUCT_UNLIMITED]: 'unlimited',
  [process.env.STRIPE_PRODUCT_120MIN]: 120,
  [process.env.STRIPE_PRODUCT_1200MIN]: 1200,
  // サーバー側で REACT_APP_* は原則使わない。環境変数をサーバー用に用意してください。
  // 例: STRIPE_PRODUCT_YEARLY_UNLIMITED / STRIPE_PRICE_YEARLY_UNLIMITED
  ...(process.env.STRIPE_PRODUCT_YEARLY_UNLIMITED
    ? { [process.env.STRIPE_PRODUCT_YEARLY_UNLIMITED]: 'yearly-unlimited' }
    : {})
};

// 過不足チェック（ログのみ）
for (const [k, v] of Object.entries(PRODUCT_MAP)) {
  if (!k || !v) console.error(`⚠️ 環境変数が不足しています: ${k} -> ${v}`);
}

// --- 補助: productId の取得（metadata → 取得失敗時は line_items から導出）---
async function resolveProductIdFromSession(session) {
  // 1) Checkout Session の metadata に product_id がある想定
  if (session?.metadata?.product_id) return session.metadata.product_id;

  // 2) 念のため line_items を展開して product を取得
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price.product'],
    });
    const li = full.line_items?.data?.[0];
    const productObj = li?.price?.product;
    if (productObj && typeof productObj === 'object' && productObj.id) {
      return productObj.id;
    }
  } catch (e) {
    console.warn('⚠️ line_items 展開による productId 取得に失敗:', e.message);
  }
  return null;
}

// --- 補助: userId の取得（client_reference_id → metadata フォールバック）---
function resolveUserIdFromSession(session) {
  return session?.client_reference_id || session?.metadata?.userId || null;
}

// --- Checkout 完了イベント処理 ---
const handleCheckoutSessionCompleted = async (session) => {
  console.log("🔔 checkout.session.completed 受信:", session.id);

  // 早期ガード: payment モードは paid 確定のみ処理
  if (session.mode === 'payment' && session.payment_status !== 'paid') {
    console.log('⏭ payment_status が paid ではないためスキップ:', session.payment_status);
    return;
  }

  const userId = resolveUserIdFromSession(session);
  let customerId = session.customer;

  if (!customerId && session.payment_intent) {
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
    customerId = pi.customer;
  }

  if (!userId || !customerId) {
    console.error("❌ userId または customerId が取得できず、付与処理をスキップ");
    return;
  }

  // Customer に userId をメタデータで紐付け（以後の Subscription 更新/削除で参照）
  try {
    await stripe.customers.update(customerId, { metadata: { userId } });
  } catch (e) {
    console.warn('⚠️ customers.update 失敗:', e.message);
  }

  // productId をできる限り確実に導出
  const productId = await resolveProductIdFromSession(session);
  if (!productId) {
    console.error('❌ productId を特定できずスキップ（metadata/line_items どちらも取得失敗）');
    return;
  }

  const productValue = PRODUCT_MAP[productId];
  if (!productValue) {
    console.error(`❌ 未知の productId: ${productId}（環境変数の PRODUCT_MAP に未登録）`);
    return;
  }

  // Firestore 更新
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    console.error(`❌ Firestore user 不在: ${userId}`);
    return;
  }

  if (typeof productValue === 'number') {
    const secondsToAdd = productValue * 60;
    await userRef.update({
      remainingSeconds: admin.firestore.FieldValue.increment(secondsToAdd),
      lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ 時間付与完了: userId=${userId}, +${secondsToAdd}s`);
  } else if (productValue === 'unlimited' || productValue === 'yearly-unlimited') {
    await userRef.update({
      subscription: true,
      lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ サブスク有効化: userId=${userId}, type=${productValue}`);
  }
};

// --- Subscription 更新/削除（既存ロジックをそのまま利用）---
const handleSubscriptionUpdated = async (subscription) => {
  try {
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata.userId;
    console.log("✅ サブスクリプション更新処理開始: userId=", userId);
    if (!userId) return;

    const userRef = db.collection('users').doc(userId);
    const currentPeriodEnd = subscription.current_period_end * 1000;
    if (subscription.cancel_at_period_end) {
      await userRef.update({
        subscription: true,
        subscriptionExpiresAt: new Date(currentPeriodEnd),
      });
      console.log(`✅ 更新: userId=${userId}, subscriptionExpiresAt=${new Date(currentPeriodEnd)}`);
    }
  } catch (error) {
    console.error("❌ Subscription 更新時の Firebase 更新エラー:", error);
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  try {
    const customerId = subscription.customer;
    if (!customerId) return;
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata?.userId;
    console.log("✅ 解約処理開始: userId=", userId);
    if (!userId) return;

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const subscriptionExpiresAt = userDoc.data()?.subscriptionExpiresAt?.toDate();
    const now = new Date();
    if (subscriptionExpiresAt && subscriptionExpiresAt > now) {
      console.log(`✅ サブスクリプションは ${subscriptionExpiresAt} まで有効`);
    } else {
      await userRef.update({
        subscription: false,
        subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ サブスク無効化: userId=${userId}`);
    }
  } catch (error) {
    console.error("❌ 解約時の Firebase 更新エラー:", error);
  }
};

// --- Webhook 受け口（最終 URL は /api/stripe ）---
router.post('/', async (req, res) => {
  let event;
  try {
    // server.js 側で express.raw({ type: 'application/json' }) 済み
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
  } catch (err) {
    console.error("🚨 Webhook 署名検証失敗:", err.message);
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
        console.log(`ℹ️ 未処理イベント: ${event.type}`);
    }
  } catch (err) {
    console.error(`🔥 Webhook 処理エラー (${event.type}):`, err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
  res.sendStatus(200);
});

module.exports = router;
