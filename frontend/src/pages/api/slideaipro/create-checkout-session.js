// src/pages/api/slideaipro/create-checkout-session.js
import Stripe from "stripe";
import admin from "firebase-admin";

const PRODUCT_MONTHLY = "prod_ThflbIcHUiOs5j"; // $9.99
const PRODUCT_YEARLY = "prod_ThfmqAQAfG5Ac0"; // $89.99

function safeString(x) {
  return typeof x === "string" ? x : "";
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const raw = safeString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function getSiteUrl() {
  const siteUrl = safeString(process.env.NEXT_PUBLIC_SITE_URL) || "https://www.sense-ai.world";
  return siteUrl.replace(/\/+$/, "");
}

function pickAllowedOrigin(originHeader, siteUrl) {
  const o = safeString(originHeader).replace(/\/+$/, "");
  if (!o) return siteUrl;

  // 許可するのは自ドメインのみ（CORS + redirect起点の事故防止）
  if (o === siteUrl) return o;
  return siteUrl;
}

function getPlanConfig(plan) {
  // planKey は Firestore の subscriptionPlan に入れる想定のキー（テスト例）
  if (plan === "monthly") {
    return {
      plan,
      planKey: "SlideAITest",
      lineItem: {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 999,
          recurring: { interval: "month" },
          product: PRODUCT_MONTHLY,
        },
      },
    };
  }
  if (plan === "yearly") {
    return {
      plan,
      planKey: "SlideAIYearlyTest",
      lineItem: {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 8999,
          recurring: { interval: "year" },
          product: PRODUCT_YEARLY,
        },
      },
    };
  }
  return null;
}

export default async function handler(req, res) {
  const siteUrl = getSiteUrl();
  const originHeader = safeString(req.headers.origin);
  const allowOrigin = pickAllowedOrigin(originHeader, siteUrl);

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "create-checkout-session" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed", method: req.method });

  const stripeKey = safeString(process.env.STRIPE_SECRET_KEY);
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });
  if (!stripeKey.startsWith("sk_")) {
    return res.status(500).json({
      error: "STRIPE_SECRET_KEY looks invalid",
      hint: "Secret key must start with sk_test_ or sk_live_",
      gotPrefix: stripeKey.slice(0, 6),
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const plan = safeString(body.plan);
    const successPath = safeString(body.successPath) || "/slideaipro?upgraded=1";
    const cancelPath = safeString(body.cancelPath) || "/slideaipro/slideaiupgrade?src=slideaipro";

    // idToken は body か Authorization: Bearer に乗ってくる前提で両対応
    const authHeader = safeString(req.headers.authorization);
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    const idToken = safeString(body.idToken) || safeString(bearer);

    if (!idToken) {
      return res.status(401).json({ error: "Missing idToken" });
    }

    const cfg = getPlanConfig(plan);
    if (!cfg) return res.status(400).json({ error: "Invalid plan", plan });

    // Firebase Admin で token 検証 → uid 確定
    initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = safeString(decoded?.uid);
    const email = safeString(decoded?.email);

    if (!uid) return res.status(401).json({ error: "Invalid idToken (no uid)" });

    const successUrl =
      `${siteUrl}${successPath}` +
      `${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = `${siteUrl}${cancelPath}`;

    const meta = {
      app: "slideaipro",
      uid,
      plan: cfg.plan,
      planKey: cfg.planKey,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [cfg.lineItem],

      // ここは siteUrl 固定（Originヘッダ起点の誘導事故を避ける）
      success_url: successUrl,
      cancel_url: cancelUrl,

      // Firestore更新のキー材料
      metadata: meta,

      // Subscriptionオブジェクトにも持たせる（後続イベントで参照しやすい）
      subscription_data: {
        metadata: meta,
      },

      // Stripe側でも uid を持てる（調査・突合が楽）
      client_reference_id: uid,

      // email が取れるなら入れる（Stripe customer作成/連携で有益）
      ...(email ? { customer_email: email } : {}),
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    const err = e && typeof e === "object" ? e : {};
    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;

    console.error("create-checkout-session error:", e);

    return res.status(statusCode).json({
      error: "Stripe/Firebase error",
      message: safeString(err.message) || "Unknown error",
      type: safeString(err.type),
      code: safeString(err.code),
      param: safeString(err.param),
      requestId: safeString(err.requestId),
    });
  }
}
