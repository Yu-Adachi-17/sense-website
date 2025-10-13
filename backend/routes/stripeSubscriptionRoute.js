// routes/stripeSubscriptionRoute.js
const express = require('express');
const router = express.Router();
const { stripe } = require('../services/stripeClient');

/**
 * POST /api/get-subscription-id
 * body: { userId: string }
 */
router.post('/get-subscription-id', async (req, res) => {
  console.log("✅ hit /api/get-subscription-id");
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(c => c.metadata.userId === userId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found for this userId' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
    });

    if (!subscriptions.data.length) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscriptionId = subscriptions.data[0].id;
    console.log(`✅ Subscription ID found for userId=${userId}: ${subscriptionId}`);
    return res.status(200).json({ subscriptionId });
  } catch (error) {
    console.error('[ERROR] /api/get-subscription-id:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription ID', details: error.message });
  }
});

/**
 * POST /api/cancel-subscription
 * body: { subscriptionId: string }
 */
router.post('/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing subscriptionId' });
  }

  try {
    const canceled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log(`✅ 解約予約完了: subscriptionId=${subscriptionId}`);
    return res.status(200).json({
      message: 'Subscription cancellation scheduled at period end',
      current_period_end: new Date(canceled.current_period_end * 1000),
    });
  } catch (error) {
    console.error('[ERROR] 解約API:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
});

module.exports = router;
