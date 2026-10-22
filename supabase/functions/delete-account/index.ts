// Exclui a conta de verdade: cancela a assinatura no Stripe e apaga o usuário (a linha de assinatura cai em cascata).
import { stripe, admin, handler, json, requireUser } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const { data: row } = await admin.from('subscriptions').select('stripe_subscription_id, status').eq('user_id', user.id).maybeSingle();
  if (row?.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(row.status)) {
    try { await stripe.subscriptions.cancel(row.stripe_subscription_id); } catch (e) { console.warn('cancelamento', (e as Error).message); }
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ ok: true });
}));
