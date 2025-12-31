// src/pages/api/slideaipro/create-checkout-session.js
import Stripe from "stripe";

const PRODUCT_MONTHLY = "prod_ThflbIcHUiOs5j";
const PRODUCT_YEARLY = "prod_ThfmqAQAfG5Ac0";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeKey) return res.status(500).json({ error: "Stripe is not configured" });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";

  try {
    const { priceId } = req.body || {};
    const pid = String(priceId || "").trim();
    if (!pid) return res.status(400).json({ error: "priceId is required" });

    const stripe = new Stripe(stripeKey);

    const price = await stripe.prices.retrieve(pid);
    if (!price || !price.active) return res.status(400).json({ error: "Invalid price" });

    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    const allowed = [PRODUCT_MONTHLY, PRODUCT_YEARLY].includes(String(productId || ""));
    if (!allowed) return res.status(403).json({ error: "Forbidden price" });

    if (price.type !== "recurring") {
      return res.status(400).json({ error: "This price is not recurring" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: pid, quantity: 1 }],
      success_url: `${siteUrl}/slideaipro?checkout=success`,
      cancel_url: `${siteUrl}/slideaipro/slideaiupgrade?src=slideaipro&checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    const url = session?.url || "";
    if (!url) return res.status(500).json({ error: "Failed to create checkout session" });

    return res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
