// src/pages/api/slideaipro/create-checkout-session.js
import Stripe from "stripe";
import admin from "firebase-admin";

const PRODUCT_MONTHLY = "prod_ThflbIcHUiOs5j"; // $9.99
const PRODUCT_YEARLY = "prod_ThfmqAQAfG5Ac0"; // $89.99

function safeString(x) {
  return typeof x === "string" ? x : "";
}

function getBearerToken(req) {
  const h = safeString(req.headers.authorization || "");
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? safeString(m[1]) : "";
}

function initFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const b64 = safeString(process.env.FIREBASE_SERVICE_ACCOUNT_B64);
  const jsonRaw = safeString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  let credObj = null;

  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    credObj = JSON.parse(decoded);
  } else if (jsonRaw) {
    credObj = JSON.parse(jsonRaw);
  } else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }

  if (credObj?.private_key && typeof credObj.private_key === "string") {
    credObj.private_key = credObj.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({ credential: admin.credential.cert(credObj) });
  return admin.app();
}

export default async function handler(req, res) {
  const originHeader = safeString(req.headers.origin);
  const allowOrigin = originHeader || safeString(process.env.NEXT_PUBLIC_SITE_URL) || "https://www.sense-ai.world";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "create-checkout-session" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed", method: req.method });

  const stripeKey = safeString(process.env.STRIPE_SECRET_KEY);
  if (!stripeKey) return res.status(500).json({ error: "Stripe/Firebase error", message: "STRIPE_SECRET_KEY is not set" });
  if (!stripeKey.startsWith("sk_")) {
    return res.status(500).json({
      error: "Stripe/Firebase error",
      message: "STRIPE_SECRET_KEY looks invalid",
      gotPrefix: stripeKey.slice(0, 6),
    });
  }

  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return res.status(401).json({
        error: "Stripe/Firebase error",
        message: "Missing idToken (Authorization: Bearer <idToken>)",
      });
    }

    initFirebaseAdmin();

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "Stripe/Firebase error", message: safeString(e?.message) || "Invalid idToken" });
    }

    const uid = safeString(decoded?.uid);
    const email = safeString(decoded?.email);
    if (!uid) return res.status(401).json({ error: "Stripe/Firebase error", message: "uid missing in token" });

    // ここが「購入ボタン押下段階で弾く」本丸（サーバー強制）
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.status(403).json({
        error: "Stripe/Firebase error",
        message: "User document not found",
      });
    }

    const userData = snap.data() || {};
    const isSubscribed = userData?.subscription === true;

    if (isSubscribed) {
      return res.status(409).json({
        error: "Already subscribed",
        message: "subscription:true のため購入は不要です",
        subscriptionPlan: safeString(userData?.subscriptionPlan),
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const plan = safeString(body.plan);
    const successPath = safeString(body.successPath) || "/slideaipro?upgraded=1";
    const cancelPath = safeString(body.cancelPath) || "/slideaipro/slideaiupgrade?src=slideaipro";

    const origin = originHeader || safeString(process.env.NEXT_PUBLIC_SITE_URL) || "https://www.sense-ai.world";

    const planKeyMonthly = safeString(process.env.SLIDEAI_PLAN_KEY_MONTHLY) || "SlideAITest";
    const planKeyYearly = safeString(process.env.SLIDEAI_PLAN_KEY_YEARLY) || "SlideAIYearlyTest";

    let lineItem;
    let planKey;

    if (plan === "monthly") {
      planKey = planKeyMonthly;
      lineItem = {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 999,
          recurring: { interval: "month" },
          product: PRODUCT_MONTHLY,
        },
      };
    } else if (plan === "yearly") {
      planKey = planKeyYearly;
      lineItem = {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 8999,
          recurring: { interval: "year" },
          product: PRODUCT_YEARLY,
        },
      };
    } else {
      return res.status(400).json({ error: "Invalid plan", plan });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      client_reference_id: uid,
      customer_email: email || undefined,
      success_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}`,
      metadata: {
        app: "slideaipro",
        uid,
        plan,
        planKey,
      },
      subscription_data: {
        metadata: {
          app: "slideaipro",
          uid,
          plan,
          planKey,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    const msg = safeString(e?.message) || "Unknown error";
    console.error("create-checkout-session error:", e);
    return res.status(500).json({ error: "Stripe/Firebase error", message: msg, type: "", code: "", param: "", requestId: "" });
  }
}
