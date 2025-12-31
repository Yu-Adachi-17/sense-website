// src/pages/api/slideaipro/create-checkout-session.js
import Stripe from "stripe";

const PRODUCT_MONTHLY = "prod_ThflbIcHUiOs5j"; // $9.99
const PRODUCT_YEARLY = "prod_ThfmqAQAfG5Ac0"; // $89.99

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const plan = String(body.plan || "");
    const successPath = String(body.successPath || "/slideaipro?upgraded=1");
    const cancelPath = String(body.cancelPath || "/slideaipro/slideaiupgrade?src=slideaipro");

    const origin =
      String(req.headers.origin || "") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
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
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      success_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}`,
      metadata: {
        app: "slideaipro",
        plan,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
