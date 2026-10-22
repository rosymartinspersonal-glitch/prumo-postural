-- TEAMRM - Posture & Correction: contas e assinaturas.
-- Dados de pacientes NÃO ficam no servidor; aqui só o status da assinatura de cada usuário.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  email                  text,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  price_id               text,
  plan                   text not null default 'free' check (plan in ('free', 'pro', 'proplus')),
  status                 text not null default 'none',   -- none | trialing | active | past_due | canceled | unpaid | incomplete
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  plan_override          text check (plan_override in ('pro', 'proplus')),   -- acesso cortesia (ex.: a própria clínica)
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- Cada usuário só lê a própria linha. Ninguém escreve pelo app: só as funções do servidor (service role).
alter table public.subscriptions enable row level security;
drop policy if exists "ler a própria assinatura" on public.subscriptions;
create policy "ler a própria assinatura" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- Eventos do Stripe já processados (idempotência dos webhooks).
create table if not exists public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;   -- sem políticas: invisível para o app

-- Permissões explícitas (o projeto foi criado sem expor tabelas novas automaticamente).
revoke all on public.subscriptions, public.stripe_events from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions, public.stripe_events to service_role;
