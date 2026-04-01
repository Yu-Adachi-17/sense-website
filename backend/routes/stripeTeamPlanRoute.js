const express = require('express');
const router = express.Router();
const { stripe } = require('../services/stripeClient');

/**
 * POST /api/team/create-checkout-session
 * Creates a Stripe checkout session for team plan subscription
 * body: { planType: "base" | "seat", userId: string, orgId: string, quantity?: number }
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, userId, orgId, quantity = 1 } = req.body;

    if (!userId || !orgId) {
      return res.status(400).json({ error: "Missing userId or orgId" });
    }

    // Price mapping for team plans
    const TEAM_PRICE_MAP = {
      base: process.env.STRIPE_PRICE_TEAM_BASE,
      seat: process.env.STRIPE_PRICE_TEAM_SEAT,
    };

    const priceId = TEAM_PRICE_MAP[planType];
    if (!priceId) {
      return res.status(400).json({ error: "Invalid planType. Use 'base' or 'seat'" });
    }

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: planType === 'seat' ? quantity : 1,
      }],
      client_reference_id: userId,
      metadata: {
        planType,
        userId,
        orgId,
        quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          userId,
          orgId,
          planType,
        },
      },
      success_url: `${process.env.FRONTEND_URL || 'https://sense-ai.world'}/pricing?team_success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sense-ai.world'}/pricing?team_cancel=true`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[ERROR] /api/team/create-checkout-session:', error);
    res.status(500).json({
      error: 'Failed to create team checkout session',
      details: error.message,
    });
  }
});

/**
 * POST /api/team/add-seats
 * Add additional seats to an existing team subscription
 * body: { subscriptionId: string, additionalSeats: number }
 */
router.post('/add-seats', async (req, res) => {
  try {
    const { subscriptionId, additionalSeats } = req.body;

    if (!subscriptionId || !additionalSeats || additionalSeats < 1) {
      return res.status(400).json({ error: "Missing subscriptionId or valid additionalSeats" });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Find the seat line item
    const seatItem = subscription.items.data.find(item => {
      return item.price.id === process.env.STRIPE_PRICE_TEAM_SEAT;
    });

    if (seatItem) {
      // Update existing seat quantity
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: seatItem.quantity + additionalSeats,
      });
    } else {
      // Add seat line item to subscription
      await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price: process.env.STRIPE_PRICE_TEAM_SEAT,
        quantity: additionalSeats,
      });
    }

    const updated = await stripe.subscriptions.retrieve(subscriptionId);
    res.json({
      message: `Added ${additionalSeats} seat(s)`,
      subscription: {
        id: updated.id,
        status: updated.status,
        items: updated.items.data.map(item => ({
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      },
    });
  } catch (error) {
    console.error('[ERROR] /api/team/add-seats:', error);
    res.status(500).json({
      error: 'Failed to add seats',
      details: error.message,
    });
  }
});

/**
 * POST /api/team/get-subscription
 * Get team subscription details
 * body: { orgId: string }
 */
router.post('/get-subscription', async (req, res) => {
  try {
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ error: "Missing orgId" });
    }

    // Search for subscriptions with orgId metadata
    const subscriptions = await stripe.subscriptions.search({
      query: `metadata["orgId"]:"${orgId}" AND status:"active"`,
    });

    if (subscriptions.data.length === 0) {
      return res.json({ subscription: null });
    }

    const sub = subscriptions.data[0];
    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        items: sub.items.data.map(item => ({
          priceId: item.price.id,
          quantity: item.quantity,
          productId: item.price.product,
        })),
        metadata: sub.metadata,
      },
    });
  } catch (error) {
    console.error('[ERROR] /api/team/get-subscription:', error);
    res.status(500).json({
      error: 'Failed to get team subscription',
      details: error.message,
    });
  }
});

module.exports = router;
