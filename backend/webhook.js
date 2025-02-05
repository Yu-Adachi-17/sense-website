const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const admin = require('firebase-admin');

// Firebase 初期化（Service Account JSON 必要）
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const db = admin.firestore();

// Stripe API 初期化
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

// 商品IDマッピング（Stripe の Product ID と対応付け）
const PRODUCT_MAP = {
    [process.env.STRIPE_PRODUCT_UNLIMITED]: 'unlimited',  // サブスク（無制限）
    [process.env.STRIPE_PRODUCT_120MIN]: 120,  // 120分チケット
    [process.env.STRIPE_PRODUCT_1200MIN]: 1200 // 1200分チケット
  };
  

// Webhook エンドポイント
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return res.sendStatus(400);
  }

  // イベントの種類に応じた処理
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
      console.log(`Unhandled event type ${event.type}`);
  }

  res.sendStatus(200);
});

module.exports = router;
