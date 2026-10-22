// Webhook do Stripe: única fonte da verdade sobre o status das assinaturas.
// Verifica a assinatura do evento, ignora eventos repetidos e atualiza a tabela subscriptions.
// Desligue "Enforce JWT Verification" nesta função (o Stripe não envia token do Supabase).
// Arquivo único: pode ser colado direto no editor de Edge Functions do Supabase.
import Stripe from 'npm:stripe@14.25.0';
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10', httpClient: Stripe.createFetchHttpClient() });
const admin: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const APP_URL = Deno.env.get('APP_URL')!;   // ex.: https://rosymartinspersonal-glitch.github.io/prumo-postural/

// chave do preço (usada pelo app) → id do preço no Stripe
const PRICE_KEYS = ['pro_1m', 'pro_6m', 'pro_12m', 'proplus_1m', 'proplus_6m', 'proplus_12m'] as const;
const priceIdFor = (key: string) => (PRICE_KEYS as readonly string[]).includes(key) ? Deno.env.get('PRICE_' + key.toUpperCase()) ?? null : null;
function planForPrice(priceId: string | null | undefined): 'free' | 'pro' | 'proplus' {
  for (const k of PRICE_KEYS) if (Deno.env.get('PRICE_' + k.toUpperCase()) === priceId) return k.startsWith('proplus') ? 'proplus' : 'pro';
  return 'free';
}

const origin = () => { try { return new URL(APP_URL).origin; } catch { return '*'; } };
const cors = () => ({
  'Access-Control-Allow-Origin': origin(),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });

// usuário autenticado a partir do token enviado pelo app
async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'não autenticado');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'sessão inválida');
  return data.user;
}
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
    if (req.method !== 'POST') return json({ error: 'método não permitido' }, 405);
    try { return await fn(req); }
    catch (e) { const status = e instanceof HttpError ? e.status : 500; if (status === 500) console.error(e); return json({ error: status === 500 ? 'erro interno' : (e as Error).message }, status); }
  };
}

// grava o estado de uma assinatura do Stripe na tabela
async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  let userId = userIdHint || (sub.metadata?.user_id as string | undefined);
  if (!userId) {
    const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) { console.warn('assinatura sem usuário', sub.id); return; }
  const priceId = sub.items.data[0]?.price.id ?? null;
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: sub.id, price_id: priceId,
    plan: ['active', 'trialing', 'past_due'].includes(sub.status) ? planForPrice(priceId) : 'free',
    status: sub.status, current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ---------- função ----------
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
