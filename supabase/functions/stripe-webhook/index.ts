// Webhook do Stripe: única fonte da verdade sobre o status das assinaturas.
// Verifica a assinatura do evento, ignora eventos repetidos e atualiza a tabela subscriptions.
// Publique com --no-verify-jwt (o Stripe não envia token do Supabase).
import Stripe from 'npm:stripe@14.25.0';
import { stripe, admin, syncSubscription } from '../_shared/common.ts';

const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });
  const sig = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(body, sig!, secret, undefined, crypto); }
  catch (e) { console.warn('assinatura inválida', (e as Error).message); return new Response('assinatura inválida', { status: 400 }); }

  // idempotência: o Stripe pode reenviar o mesmo evento
  const { error: dup } = await admin.from('stripe_events').insert({ id: event.id, type: event.type });
  if (dup) { if (dup.code === '23505') return new Response('já processado', { status: 200 }); console.error(dup); return new Response('erro', { status: 500 }); }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === 'subscription' && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id);
          await syncSubscription(sub, s.client_reference_id ?? undefined);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) await syncSubscription(await stripe.subscriptions.retrieve(typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id));
        break;
      }
    }
  } catch (e) {
    // permite que o Stripe tente de novo
    await admin.from('stripe_events').delete().eq('id', event.id);
    console.error(e);
    return new Response('erro ao processar', { status: 500 });
  }
  return new Response('ok', { status: 200 });
});
