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
    // 最小構成：checkout.session.completed で確定更新
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;

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

      // Subscription詳細（期間/status）を取る（失敗しても Firestore 更新はする）
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

      initFirebaseAdmin();
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);

        const currentPlan = snap.exists ? snap.get("subscriptionPlan") : null;
        const currentSubscription = snap.exists ? Boolean(snap.get("subscription")) : false;

        // 新ルール：
        // subscription === true は “SlideAIより強い” 扱いで top-level を上書きしない
        // ただし現在の subscriptionPlan が SlideAI 系なら SlideAI 更新（アップグレード等）を許可する
        const curPlanStr = safeString(currentPlan);
        const isAlreadySlide = isSlideAiPlan(curPlanStr);

        const blockTopLevelOverwrite = currentSubscription === true && !isAlreadySlide;

        const now = admin.firestore.FieldValue.serverTimestamp();

        // 常に残す：SlideAI側購買情報（監査・復旧・機能判定に使える）
        const updates = {
          lastSubscriptionUpdate: now,

          "subscriptions.slideaipro.app": "slideaipro",
          "subscriptions.slideaipro.plan": plan || null,
          "subscriptions.slideaipro.planKey": planKey,
          "subscriptions.slideaipro.status": status || "unknown",
          "subscriptions.slideaipro.stripeCustomerId": stripeCustomerId || null,
          "subscriptions.slideaipro.stripeSubscriptionId": stripeSubscriptionId || null,
          "subscriptions.slideaipro.updatedAt": now,
        };

        if (cps) {
          updates["subscriptions.slideaipro.currentPeriodStart"] =
            admin.firestore.Timestamp.fromDate(new Date(cps * 1000));
        }
        if (cpe) {
          updates["subscriptions.slideaipro.currentPeriodEnd"] =
            admin.firestore.Timestamp.fromDate(new Date(cpe * 1000));
        }

        // top-level は「強いsubscriptionが存在しない」or「既にSlideAI」の場合のみ更新
        if (!blockTopLevelOverwrite) {
          updates.subscriptionPlan = planKey;
          updates.subscription = true;

          if (cps) {
            updates.subscriptionStartDate = admin.firestore.Timestamp.fromDate(new Date(cps * 1000));
          }
          if (cpe) {
            updates.subscriptionEndDate = admin.firestore.Timestamp.fromDate(new Date(cpe * 1000));
          }
        }

        tx.set(userRef, updates, { merge: true });
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true, ignored: true, type: event.type });
  } catch (e) {
    console.error("stripe-webhook handler error:", e);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
