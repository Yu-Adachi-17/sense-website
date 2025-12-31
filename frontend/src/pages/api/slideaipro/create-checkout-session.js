// src/pages/api/slideaipro/create-checkout-session.js
import Stripe from "stripe";

const PRODUCT_MONTHLY = "prod_ThflbIcHUiOs5j"; // $9.99
const PRODUCT_YEARLY = "prod_ThfmqAQAfG5Ac0"; // $89.99

function safeString(x) {
  return typeof x === "string" ? x : "";
}

export default async function handler(req, res) {
  const originHeader = safeString(req.headers.origin);
  const allowOrigin =
    originHeader ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.sense-ai.world";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "create-checkout-session" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed", method: req.method });

  const key = safeString(process.env.STRIPE_SECRET_KEY);

  // ここで「キー違い」を即判定して、500の原因を潰す
  if (!key) return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });
  if (!key.startsWith("sk_")) {
    // pk_ を入れてる/別の値を入れてる系を即発見
    return res.status(500).json({
      error: "STRIPE_SECRET_KEY looks invalid",
      hint: "Secret key must start with sk_test_ or sk_live_",
      gotPrefix: key.slice(0, 6),
    });
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const plan = safeString(body.plan);
    const successPath = safeString(body.successPath) || "/slideaipro?upgraded=1";
    const cancelPath = safeString(body.cancelPath) || "/slideaipro/slideaiupgrade?src=slideaipro";

    const origin =
      originHeader ||
      safeString(process.env.NEXT_PUBLIC_SITE_URL) ||
      "https://www.sense-ai.world";

    let lineItem;
    if (plan === "monthly") {
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      success_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}`,
      metadata: { app: "slideaipro", plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    // Stripeが返した中身を返す（原因特定が最優先）
    const err = e && typeof e === "object" ? e : {};
    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;

    console.error("create-checkout-session error:", e);

    return res.status(statusCode).json({
      error: "Stripe error",
      message: safeString(err.message) || "Unknown error",
      type: safeString(err.type),
      code: safeString(err.code),
      param: safeString(err.param),
      requestId: safeString(err.requestId),
    });
  }
}
