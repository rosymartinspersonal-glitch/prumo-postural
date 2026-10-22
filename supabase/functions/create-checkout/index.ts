// Abre o Stripe Checkout para o plano escolhido. Nunca recebe dados de cartão: o Stripe cuida disso.
import { stripe, admin, APP_URL, priceIdFor, handler, json, requireUser, HttpError } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const priceKey = typeof body.priceKey === 'string' ? body.priceKey : '';
  const price = priceIdFor(priceKey);
  if (!price) throw new HttpError(400, 'plano inválido');

  const { data: row } = await admin.from('subscriptions').select('stripe_customer_id, status').eq('user_id', user.id).maybeSingle();
  if (row && ['active', 'trialing', 'past_due'].includes(row.status)) throw new HttpError(409, 'você já tem uma assinatura; use "Gerenciar assinatura" para trocar de plano');

  let customer = row?.stripe_customer_id as string | undefined;
  if (!customer) {
    const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customer = c.id;
    const { error } = await admin.from('subscriptions').upsert({ user_id: user.id, email: user.email, stripe_customer_id: customer, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  }
  const trialDays = Number(Deno.env.get('TRIAL_DAYS') ?? '0');
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id }, ...(trialDays > 0 && !row?.status?.match(/active|trialing|canceled/) ? { trial_period_days: trialDays } : {}) },
    allow_promotion_codes: true,
    locale: 'pt-BR',
    success_url: `${APP_URL}?checkout=ok`,
    cancel_url: `${APP_URL}?checkout=cancelado`,
  });
  return json({ url: session.url });
}));
