// src/pages/api/slideaipro/stripe-webhook.js
import Stripe from "stripe";
import admin from "firebase-admin";

function safeString(x) {
  return typeof x === "string" ? x : "";
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
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_B64 is not set");
  }

  if (credObj?.private_key && typeof credObj.private_key === "string") {
    credObj.private_key = credObj.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({ credential: admin.credential.cert(credObj) });
  return admin.app();
}

async function readRawBody(req) {
  const chunks = [];
  return await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function toTimestamp(sec) {
  if (typeof sec !== "number") return null;
  return admin.firestore.Timestamp.fromDate(new Date(sec * 1000));
}

function normalizeSlideAiActive(status) {
  const s = safeString(status);
  return s === "active" || s === "trialing";
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "stripe-webhook" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const stripeKey = safeString(process.env.STRIPE_SECRET_KEY);
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });

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

    const upsertSlideAiOnly = async (uid, planKey, stripeSubscriptionId, status, cps, cpe) => {
      if (!uid || !planKey) return { ignored: true, reason: "missing uid/planKey" };

      const slideActive = normalizeSlideAiActive(status);

      const updates = {
        slideAILastSubscriptionUpdate: now,
        slideAISubscriptionPlan: planKey,
        slideAIOriginalTransactionId: stripeSubscriptionId || null,
        slideAISubscription: slideActive,
      };

      const tsStart = cps ? toTimestamp(cps) : null;
      const tsEnd = cpe ? toTimestamp(cpe) : null;

      if (tsStart) updates.slideAISubscriptionStartDate = tsStart;
      if (tsEnd) updates.slideAISubscriptionEndDate = tsEnd;

      await db.collection("users").doc(uid).set(updates, { merge: true });

      return { ok: true, uid, planKey, slideActive };
    };

    const handleSubscriptionObject = async (sub, hint) => {
      const s = sub || {};
      const meta = s.metadata || {};

      const app = safeString(meta.app);
      const uid = safeString(meta.uid);
      const planKey = safeString(meta.planKey);

      if (app !== "slideaipro") {
        return { ignored: true, reason: "not slideaipro", hint };
      }

      const stripeSubscriptionId = safeString(s.id) || null;
      const status = safeString(s.status) || "unknown";
      const cps = typeof s.current_period_start === "number" ? s.current_period_start : null;
      const cpe = typeof s.current_period_end === "number" ? s.current_period_end : null;

      return await upsertSlideAiOnly(uid, planKey, stripeSubscriptionId, status, cps, cpe);
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const meta = session?.metadata || {};

      const uid = safeString(meta.uid);
      const planKey = safeString(meta.planKey);

      const stripeSubscriptionId = safeString(session?.subscription) || null;

      let sub = null;
      if (stripeSubscriptionId) {
        try {
          sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } catch (e) {
          console.error("stripe.subscriptions.retrieve failed:", e);
        }
      }

      if (sub) {
        return res.status(200).json({ ok: true, result: await handleSubscriptionObject(sub, "checkout.session.completed") });
      }

      const result = await upsertSlideAiOnly(uid, planKey, stripeSubscriptionId, "active", null, null);
      return res.status(200).json({ ok: true, via: "session-fallback", result });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data?.object;
      return res.status(200).json({ ok: true, result: await handleSubscriptionObject(sub, "customer.subscription.updated") });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data?.object;
      return res.status(200).json({ ok: true, result: await handleSubscriptionObject(sub, "customer.subscription.deleted") });
    }

    return res.status(200).json({ ok: true, ignored: true, type: event.type });
  } catch (e) {
    console.error("stripe-webhook handler error:", e);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
