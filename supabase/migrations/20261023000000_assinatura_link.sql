-- TEAMRM - Contratos Personal: assinatura por link (enviado pelo WhatsApp).
-- A profissional (logada) publica uma cópia da versão congelada do contrato com um código secreto (token).
-- O aluno abre o link sem login, lê e assina; só as funções abaixo (por token) ficam abertas ao público.
-- Rode este arquivo uma vez no Supabase: SQL Editor → New query → colar → Run.

create table if not exists public.sign_requests (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique check (length(token) >= 40),
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contract_ref  text not null,                 -- id do contrato no aparelho da profissional
  version       int  not null default 1,
  title         text not null,
  signer_name   text,                          -- nome do aluno cadastrado no contrato
  professional  text,
  doc_html      text not null check (length(doc_html) < 400000),
  doc_hash      text not null,                 -- SHA-256 da versão congelada
  status        text not null default 'pendente' check (status in ('pendente', 'assinado', 'cancelado')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  signed_at     timestamptz,
  signed_name   text,
  signed_cpf    text,
  signature_png text,
  signer_ip     text,
  signer_ua     text
);
create index if not exists sign_requests_owner_idx on public.sign_requests (owner, contract_ref);

-- A profissional vê e gerencia só os próprios pedidos. O público não lê a tabela.
alter table public.sign_requests enable row level security;
drop policy if exists "dono lê" on public.sign_requests;
drop policy if exists "dono cria" on public.sign_requests;
drop policy if exists "dono altera" on public.sign_requests;
drop policy if exists "dono apaga" on public.sign_requests;
create policy "dono lê" on public.sign_requests for select to authenticated using (owner = auth.uid());
create policy "dono cria" on public.sign_requests for insert to authenticated with check (owner = auth.uid() and status = 'pendente' and signed_at is null);
create policy "dono altera" on public.sign_requests for update to authenticated using (owner = auth.uid() and status = 'pendente') with check (owner = auth.uid() and status in ('pendente', 'cancelado'));
create policy "dono apaga" on public.sign_requests for delete to authenticated using (owner = auth.uid());

revoke all on public.sign_requests from anon, authenticated;
grant select, insert, delete on public.sign_requests to authenticated;
grant update (status, expires_at) on public.sign_requests to authenticated;   -- a profissional pode cancelar ou prorrogar, nunca forjar a assinatura
grant all on public.sign_requests to service_role;

-- Leitura pelo aluno (sem login): só o pedido daquele token.
create or replace function public.sign_get(p_token text)
returns table (title text, version int, signer_name text, professional text, doc_html text, doc_hash text, status text, expires_at timestamptz, signed_at timestamptz, signed_name text)
language sql stable security definer set search_path = public as $$
  select r.title, r.version, r.signer_name, r.professional, r.doc_html, r.doc_hash,
         case when r.status = 'pendente' and r.expires_at < now() then 'expirado' else r.status end,
         r.expires_at, r.signed_at, r.signed_name
  from public.sign_requests r
  where length(p_token) >= 40 and r.token = p_token;
$$;

-- Assinatura pelo aluno: grava nome, CPF, imagem da assinatura, data/hora do servidor, IP e aparelho.
create or replace function public.sign_submit(p_token text, p_name text, p_cpf text, p_signature text, p_ua text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare r public.sign_requests; ip text; cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
begin
  select * into r from public.sign_requests where length(p_token) >= 40 and token = p_token for update;
  if not found then raise exception 'link inválido'; end if;
  if r.status <> 'pendente' then raise exception 'este contrato não está aguardando assinatura'; end if;
  if r.expires_at < now() then raise exception 'link expirado'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 or length(p_name) > 200 then raise exception 'informe o nome completo'; end if;
  if length(cpf) <> 11 then raise exception 'CPF inválido'; end if;
  if p_signature is null or left(p_signature, 22) <> 'data:image/png;base64,' or length(p_signature) > 300000 then raise exception 'assinatura inválida'; end if;
  begin ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1); exception when others then ip := null; end;
  update public.sign_requests set status = 'assinado', signed_at = now(), signed_name = trim(p_name),
    signed_cpf = substr(cpf, 1, 3) || '.' || substr(cpf, 4, 3) || '.' || substr(cpf, 7, 3) || '-' || substr(cpf, 10, 2),
    signature_png = p_signature, signer_ip = nullif(trim(ip), ''), signer_ua = left(coalesce(p_ua, ''), 400)
  where id = r.id;
  return now();
end;
$$;

revoke all on function public.sign_get(text), public.sign_submit(text, text, text, text, text) from public;
grant execute on function public.sign_get(text), public.sign_submit(text, text, text, text, text) to anon, authenticated;
