// Portal do cliente do Stripe: trocar de plano, atualizar cartão, ver faturas e cancelar em um clique.
import { stripe, admin, APP_URL, handler, json, requireUser, HttpError } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const { data: row } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!row?.stripe_customer_id) throw new HttpError(404, 'nenhuma assinatura encontrada');
  const session = await stripe.billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: APP_URL, locale: 'pt-BR' });
  return json({ url: session.url });
}));
