// src/pages/api/slideaipro/stripe-webhook.js
import Stripe from "stripe";
import admin from "firebase-admin";

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
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function readRawBody(req) {
  const chunks = [];
  return await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isSlideAiPlan(planVal) {
  const s = safeString(planVal);
  return s.startsWith("SlideAI") || s.toLowerCase().includes("slideai");
}

// 「利用可能」判定。運用方針で調整可
function isEntitledStatus(status) {
  const s = safeString(status).toLowerCase();
  return s === "active" || s === "trialing" || s === "past_due";
}

// Firestore Timestamp 化（秒 epoch -> Timestamp）
function tsFromSec(sec) {
  if (typeof sec !== "number") return null;
  return admin.firestore.Timestamp.fromDate(new Date(sec * 1000));
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "stripe-webhook" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const stripeKey = safeString(process.env.STRIPE_SECRET_KEY);
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });
  if (!stripeKey.startsWith("sk_")) {
    return res.status(500).json({
      error: "STRIPE_SECRET_KEY looks invalid",
      hint: "Secret key must start with sk_test_ or sk_live_",
      gotPrefix: stripeKey.slice(0, 6),
    });
  }

  const webhookSecret = safeString(process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  let event;
  try {
    const sig = safeString(req.headers["stripe-signature"]);
    if (!sig) return res.status(400).send("Missing Stripe-Signature header");

    const buf = await readRawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (e) {
    console.error("stripe-webhook signature verification failed:", e);
    return res.status(400).send("Webhook signature verification failed");
  }

  try {
    initFirebaseAdmin();
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // =============
    // 1) checkout.session.completed（購入確定）
    // =============
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const metadata = session?.metadata || {};

      const uid = safeString(metadata?.uid);
      const plan = safeString(metadata?.plan);
      const planKey = safeString(metadata?.planKey);

      if (!uid || !planKey) {
        console.error("Webhook missing uid/planKey in metadata:", { uid, planKey, plan, metadata });
        return res.status(200).json({ ok: true, ignored: true });
      }

      const stripeCustomerId = safeString(session?.customer);
      const stripeSubscriptionId = safeString(session?.subscription);

      // 期間/ステータス取得
      let sub = null;
      if (stripeSubscriptionId) {
        try {
          sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } catch (e) {
          console.error("stripe.subscriptions.retrieve failed:", e);
        }
      }

      const status = safeString(sub?.status) || "unknown";
      const cps = typeof sub?.current_period_start === "number" ? sub.current_period_start : null;
      const cpe = typeof sub?.current_period_end === "number" ? sub.current_period_end : null;

      const startTs = tsFromSec(cps);
      const endTs = tsFromSec(cpe);
      const slideEntitled = isEntitledStatus(status);

      const userRef = db.collection("users").doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);

        const currentPlan = snap.exists ? snap.get("subscriptionPlan") : null;
        const currentSubscription = snap.exists ? Boolean(snap.get("subscription")) : false;

        const curPlanStr = safeString(currentPlan);
        const isAlreadySlide = isSlideAiPlan(curPlanStr);

        // 既存ルール維持：Minutes等の強いsubscriptionがある場合は top-level を上書きしない
        const blockTopLevelOverwrite = currentSubscription === true && !isAlreadySlide;

        // slideAIOriginalTransactionId は IAP 用（Stripeでは意味がない）
        // ただし「スキーマを揃えたい」場合のみ、存在しなければ null を一度だけ生やす
        const hasSlideOrigField = snap.exists ? snap.get("slideAIOriginalTransactionId") !== undefined : false;

        const updates = {
          // 既存互換（あなたの運用）
          lastSubscriptionUpdate: now,

          // SlideAIトップレベル（機能判定用のミラー）
          slideAISubscriptionPlan: planKey,
          slideAISubscription: slideEntitled,
          slideAILastSubscriptionUpdate: now,
          slideAISubscriptionStartDate: startTs || null,
          slideAISubscriptionEndDate: endTs || null,

          // ネスト（監査・復旧・詳細判定）
          "subscriptions.slideaipro.app": "slideaipro",
          "subscriptions.slideaipro.plan": plan || null,
          "subscriptions.slideaipro.planKey": planKey,
          "subscriptions.slideaipro.status": status || "unknown",
          "subscriptions.slideaipro.stripeCustomerId": stripeCustomerId || null,
          "subscriptions.slideaipro.stripeSubscriptionId": stripeSubscriptionId || null,
          "subscriptions.slideaipro.updatedAt": now,
          "subscriptions.slideaipro.currentPeriodStart": startTs || null,
          "subscriptions.slideaipro.currentPeriodEnd": endTs || null,
        };

        // ここが肝：IAP移行用フィールドは Stripe webhook で上書きしない
        if (!hasSlideOrigField) {
          updates.slideAIOriginalTransactionId = null;
        }

        // top-level（Minutes等と共通）を更新するかは既存ルール維持
        if (!blockTopLevelOverwrite) {
          updates.subscriptionPlan = planKey;
          updates.subscription = slideEntitled;
          if (startTs) updates.subscriptionStartDate = startTs;
          if (endTs) updates.subscriptionEndDate = endTs;
        }

        tx.set(userRef, updates, { merge: true });
      });

      return res.status(200).json({ ok: true });
    }

    // =============
    // 2) customer.subscription.updated / deleted（更新・解約反映）
    //   ※ これが無いと「解約しても slideAISubscription が true のまま」になりがち
    // =============
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data?.object || {};
      const metadata = sub?.metadata || {};

      const uid = safeString(metadata?.uid);
      const plan = safeString(metadata?.plan);
      const planKey = safeString(metadata?.planKey);

      if (!uid || !planKey) {
        // SlideAI由来でない更新は無視
        return res.status(200).json({ ok: true, ignored: true });
      }

      const status = safeString(sub?.status) || "unknown";
      const cps = typeof sub?.current_period_start === "number" ? sub.current_period_start : null;
      const cpe = typeof sub?.current_period_end === "number" ? sub.current_period_end : null;

      const startTs = tsFromSec(cps);
      const endTs = tsFromSec(cpe);

      const stripeCustomerId = safeString(sub?.customer);
      const stripeSubscriptionId = safeString(sub?.id);

      // deleted の場合も status を見るが、確実に false に寄せたいならここで強制falseでもよい
      const slideEntitled = isEntitledStatus(status);

      const userRef = db.collection("users").doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);

        const currentPlan = snap.exists ? snap.get("subscriptionPlan") : null;
        const currentSubscription = snap.exists ? Boolean(snap.get("subscription")) : false;

        const curPlanStr = safeString(currentPlan);
        const isAlreadySlide = isSlideAiPlan(curPlanStr);

        const blockTopLevelOverwrite = currentSubscription === true && !isAlreadySlide;

        const updates = {
          lastSubscriptionUpdate: now,

          slideAISubscriptionPlan: planKey,
          slideAISubscription: slideEntitled,
          slideAILastSubscriptionUpdate: now,
          slideAISubscriptionStartDate: startTs || null,
          slideAISubscriptionEndDate: endTs || null,

          "subscriptions.slideaipro.app": "slideaipro",
          "subscriptions.slideaipro.plan": plan || null,
          "subscriptions.slideaipro.planKey": planKey,
          "subscriptions.slideaipro.status": status || "unknown",
          "subscriptions.slideaipro.stripeCustomerId": stripeCustomerId || null,
          "subscriptions.slideaipro.stripeSubscriptionId": stripeSubscriptionId || null,
          "subscriptions.slideaipro.updatedAt": now,
          "subscriptions.slideaipro.currentPeriodStart": startTs || null,
          "subscriptions.slideaipro.currentPeriodEnd": endTs || null,
        };

        // IAP移行用フィールドは触らない（上書き禁止）
        // updates.slideAIOriginalTransactionId は入れない

        if (!blockTopLevelOverwrite) {
          updates.subscriptionPlan = planKey;
          updates.subscription = slideEntitled;
          if (startTs) updates.subscriptionStartDate = startTs;
          if (endTs) updates.subscriptionEndDate = endTs;
        }

        tx.set(userRef, updates, { merge: true });
      });

      return res.status(200).json({ ok: true });
    }

    // その他イベントは無視
    return res.status(200).json({ ok: true, ignored: true, type: event.type });
  } catch (e) {
    console.error("stripe-webhook handler error:", e);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
