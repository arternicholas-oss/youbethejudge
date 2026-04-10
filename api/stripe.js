// Vercel serverless function: Stripe Checkout for Pro Judge subscription
// Uses Stripe API directly via fetch — no npm dependency needed

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

  if (!STRIPE_SECRET || !PRICE_ID) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { action } = req.query;

  // ── CREATE CHECKOUT SESSION ──
  if (action === 'checkout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://youbethejudge.ai';
    const { visitor_id } = req.body || {};

    try {
      const params = new URLSearchParams();
      params.append('mode', 'subscription');
      params.append('line_items[0][price]', PRICE_ID);
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', `${origin}?pro=success`);
      params.append('cancel_url', `${origin}?pro=cancel`);
      params.append('allow_promotion_codes', 'true');
      if (visitor_id) params.append('client_reference_id', visitor_id);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const session = await stripeRes.json();

      if (!stripeRes.ok) {
        console.error('Stripe error:', session);
        return res.status(400).json({ error: session.error?.message || 'Checkout failed' });
      }

      return res.status(200).json({ url: session.url });
    } catch (e) {
      console.error('Stripe checkout error:', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // ── CHECK SUBSCRIPTION STATUS ──
  if (action === 'status') {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    try {
      const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
      });
      const session = await stripeRes.json();

      return res.status(200).json({
        status: session.payment_status,
        subscription: session.subscription,
        customer: session.customer,
      });
    } catch (e) {
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // ── MANAGE (CUSTOMER PORTAL) ──
  if (action === 'manage') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { customer_id } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });

    const origin = req.headers.origin || 'https://youbethejudge.ai';

    try {
      const params = new URLSearchParams();
      params.append('customer', customer_id);
      params.append('return_url', origin);

      const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const portal = await stripeRes.json();
      if (!stripeRes.ok) return res.status(400).json({ error: portal.error?.message || 'Portal failed' });

      return res.status(200).json({ url: portal.url });
    } catch (e) {
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(400).json({ error: 'Unknown action. Use ?action=checkout, status, or manage' });
}
