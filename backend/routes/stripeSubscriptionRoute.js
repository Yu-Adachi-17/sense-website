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
    // 1) 最優先: metadata.userId で Customer を検索（Search API）
    let customer = null;
    try {
      const search = await stripe.customers.search({
        query: `metadata['userId']:'${String(userId).replace(/'/g, "\\'")}'`,
        limit: 1,
      });
      customer = search.data?.[0] || null;
    } catch (e) {
      console.warn('⚠️ customers.search failed:', e.message);
    }

    // 2) フォールバック: Checkout Session から customer を復元
    if (!customer) {
      try {
        // Search API（サポート環境ならこちらが速い）
        const sessSearch = await stripe.checkout.sessions.search({
          query: `client_reference_id:'${String(userId).replace(/'/g, "\\'")}' AND mode:'subscription' AND status:'complete'`,
          limit: 1,
          expand: ['data.customer'],
        });
        const s = sessSearch.data?.[0];
        if (s?.customer) {
          customer = typeof s.customer === 'string'
            ? await stripe.customers.retrieve(s.customer)
            : s.customer;
        }
      } catch (e) {
        console.warn('⚠️ checkout.sessions.search failed, fallback to list:', e.message);
      }
    }

    // 3) さらにフォールバック: list で最近のセッションを走査
    if (!customer) {
      const sessions = await stripe.checkout.sessions.list({
        limit: 50,
        expand: ['data.customer'],
      });
      const hit = sessions.data.find(s =>
        s.client_reference_id === userId &&
        s.mode === 'subscription' &&
        s.status === 'complete' &&
        !!s.customer
      );
      if (hit?.customer) {
        customer = typeof hit.customer === 'string'
          ? await stripe.customers.retrieve(hit.customer)
          : hit.customer;
      }
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found for this userId' });
    }

    // 該当 Customer のサブスクを取得（まず active 優先、無ければ all）
    let subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    if (!subscriptions.data.length) {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10,
      });
    }

    if (!subscriptions.data.length) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // 最優先: cancel_at_period_end でない active を選択、なければ先頭
    const preferred =
      subscriptions.data.find(s => s.status === 'active' && !s.cancel_at_period_end) ||
      subscriptions.data[0];

    const subscriptionId = preferred.id;
    console.log(`✅ Subscription ID found for userId=${userId}: ${subscriptionId}`);
    return res.status(200).json({ subscriptionId });
  } catch (error) {
    console.error('[ERROR] /api/get-subscription-id:', error);
    return res.status(500).json({
      error: 'Failed to fetch subscription ID',
      details: error.message,
    });
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
    return res.status(500).json({
      error: 'Failed to cancel subscription',
      details: error.message,
    });
  }
});

module.exports = router;
