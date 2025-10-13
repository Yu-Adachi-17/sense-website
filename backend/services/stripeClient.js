// services/stripeClient.js
require('dotenv').config();
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set');
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  // 接続先やリトライ等、必要に応じてオプションを追加
  // apiVersion: '2024-06-20', // 必要なら明示
});

module.exports = { stripe };
