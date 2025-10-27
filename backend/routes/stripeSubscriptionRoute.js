const express = require('express');
const router = express.Router();
const { stripe } = require('../services/stripeClient');

// ===== Helpers =====
const isDebugOn = (req) =>
  req.headers['x-debug-log'] === '1' || process.env.LOG_STRIPE_DEBUG === '1';

const safe = (v) => {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

const pickStripeErr = (err) => {
  // StripeError からデバッグに有用な断面だけ抽出
  const out = {
    type: err?.type,
    code: err?.code,
    message: err?.message,
    statusCode: err?.statusCode,
    requestId: err?.raw?.requestId || err?.requestId,
  };
  // 一部のケースで raw.param, raw.decline_code などがある
  if (err?.raw) {
    out.rawType = err.raw.type;
    out.rawMessage = err.raw.message;
    out.rawParam = err.raw.param;
    out.decline_code = err.raw.decline_code;
  }
  return out;
};

const logStep = (req, msg, extra) => {
  const line = `[STRIPE][${new Date().toISOString()}] ${msg}`;
  if (extra) {
    console.log(line, '\n', safe(extra));
  } else {
    console.log(line);
  }
};

/**
 * POST /api/get-subscription-id
 * body: { userId: string }
 */
router.post('/get-subscription-id', async (req, res) => {
  const debug = isDebugOn(req);
  logStep(req, 'hit /api/get-subscription-id', { userId: req.body?.userId });

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    let customer = null;
    let foundBy = null;

    // 1) customers.search（最優先）
    try {
      const query = `metadata['userId']:'${String(userId).replace(/'/g, "\\'")}'`;
      const search = await stripe.customers.search({ query, limit: 1 });
      if (search.data?.[0]) {
        customer = search.data[0];
        foundBy = 'customers.search';
      }
      logStep(req, 'customers.search result', {
        found: !!customer,
        foundBy,
        customerId: customer?.id,
      });
    } catch (e) {
      logStep(req, 'customers.search failed', { error: pickStripeErr(e) });
    }

    // 2) checkout.sessions.search（フォールバック）
    if (!customer) {
      try {
        const q = `client_reference_id:'${String(userId).replace(/'/g, "\\'")}' AND mode:'subscription' AND status:'complete'`;
        const sessSearch = await stripe.checkout.sessions.search({
          query: q,
          limit: 1,
          expand: ['data.customer'],
        });
        const s = sessSearch.data?.[0];
        if (s?.customer) {
          customer = typeof s.customer === 'string'
            ? await stripe.customers.retrieve(s.customer)
            : s.customer;
          foundBy = 'checkout.sessions.search';
        }
        logStep(req, 'checkout.sessions.search result', {
          found: !!customer,
          foundBy,
          sessionId: s?.id,
          customerId: customer?.id,
        });
      } catch (e) {
        logStep(req, 'checkout.sessions.search failed', { error: pickStripeErr(e) });
      }
    }

    // 3) checkout.sessions.list（最終フォールバック）
    if (!customer) {
      try {
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
          foundBy = 'checkout.sessions.list';
        }
        logStep(req, 'checkout.sessions.list scan result', {
          found: !!customer,
          foundBy,
          customerId: customer?.id,
        });
      } catch (e) {
        logStep(req, 'checkout.sessions.list failed', { error: pickStripeErr(e) });
      }
    }

    if (!customer) {
      const payload = { error: 'Customer not found for this userId' };
      if (debug) payload.details = { userId, tried: ['customers.search', 'sessions.search', 'sessions.list'] };
      return res.status(404).json(payload);
    }

    // サブスク取得（まず active を優先）
    let subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });
    if (!subs.data.length) {
      subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10,
      });
    }

    logStep(req, 'subscriptions.list summary', {
      customerId: customer.id,
      count: subs.data.length,
      items: subs.data.map(s => ({
        id: s.id,
        status: s.status,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: s.current_period_end,
      })),
    });

    if (!subs.data.length) {
      const payload = { error: 'No active subscription found' };
      if (debug) payload.details = { customerId: customer.id };
      return res.status(404).json(payload);
    }

    const preferred =
      subs.data.find(s => s.status === 'active' && !s.cancel_at_period_end) ||
      subs.data[0];

    logStep(req, 'subscription selected', {
      subscriptionId: preferred.id,
      status: preferred.status,
      cancel_at_period_end: preferred.cancel_at_period_end,
    });

    return res.status(200).json({ subscriptionId: preferred.id });
  } catch (error) {
    const errInfo = pickStripeErr(error);
    console.error('[ERROR] /api/get-subscription-id:', errInfo);
    const payload = { error: 'Failed to fetch subscription ID' };
    if (debug) payload.details = errInfo;
    return res.status(500).json(payload);
  }
});

/**
 * POST /api/cancel-subscription
 * body: { subscriptionId: string }
 */
router.post('/cancel-subscription', async (req, res) => {
  const debug = isDebugOn(req);
  const { subscriptionId } = req.body || {};
  logStep(req, 'hit /api/cancel-subscription', { subscriptionId });

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing subscriptionId' });
  }

  try {
    const canceled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const requestId =
      canceled?.lastResponse?.requestId ||
      canceled?.lastResponse?.headers?.['request-id'];

    logStep(req, 'cancel scheduled', {
      subscriptionId,
      requestId,
      cancel_at_period_end: canceled.cancel_at_period_end,
      current_period_end: canceled.current_period_end,
      status: canceled.status,
    });

    return res.status(200).json({
      message: 'Subscription cancellation scheduled at period end',
      current_period_end: new Date(canceled.current_period_end * 1000),
      ...(debug ? { requestId } : {}),
    });
  } catch (error) {
    const errInfo = pickStripeErr(error);
    console.error('[ERROR] cancel-subscription:', errInfo);
    const payload = { error: 'Failed to cancel subscription' };
    if (debug) payload.details = errInfo;
    return res.status(500).json(payload);
  }
});

module.exports = router;
