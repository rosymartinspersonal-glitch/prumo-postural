# Como ativar os pagamentos do TEAMRM

> **Em espera.** A cobrança não está ativa. A Parte A (Supabase) já foi feita. Retome a partir da Parte B quando decidir cobrar.

Tempo estimado: 40 minutos. Tudo começa em **modo de teste** (nenhum cartão real é cobrado).
Você vai criar duas contas: **Supabase** (login e assinaturas) e **Stripe** (pagamentos).

> Nunca envie a ninguém, nem cole no GitHub, as chaves que começam com `sk_`, `whsec_` ou a `service_role`.
> Elas vão só no painel do Supabase (Parte D).

---

## Parte A — Supabase (login e banco de assinaturas)

1. Abra **https://supabase.com** e clique em **Start your project**.
2. Clique em **Continue with GitHub** e entre com a sua conta do GitHub.
3. Clique em **New project**.
4. Em **Name**, digite `teamrm`.
5. Em **Database Password**, clique em **Generate a password** e guarde a senha num lugar seguro.
6. Em **Region**, escolha **South America (São Paulo)**.
7. Em **Security**: deixe **Enable Data API** marcado, **desmarque** *Automatically expose new tables* e **marque** *Enable automatic RLS*.
7b. Clique em **Create new project** e espere cerca de 2 minutos.
8. No menu da esquerda, clique em **SQL Editor**.
9. Clique em **New query**.
10. No GitHub, abra o arquivo `supabase/migrations/20261022000000_assinaturas.sql`, copie todo o conteúdo e cole na consulta.
11. Clique em **Run**. Deve aparecer **Success**.
12. No menu da esquerda, clique em **Authentication** → **URL Configuration**.
13. Em **Site URL**, cole: `https://rosymartinspersonal-glitch.github.io/prumo-postural/`
14. Em **Redirect URLs**, clique em **Add URL**, cole o mesmo endereço e salve.
15. No menu da esquerda, clique em **Project Settings** (engrenagem) → **API**.
16. Copie o **Project URL** e a chave **anon public**. Essas duas são públicas: pode mandá-las para o Claude.

## Parte B — Stripe (pagamentos)

17. Abra **https://dashboard.stripe.com/register** e crie a conta (Brasil; pessoa física com CPF ou empresa com CNPJ).
18. No alto da tela, ative **Modo de teste** (Test mode).
19. Clique em **Catálogo de produtos** → **Adicionar produto**.
20. Nome: `TEAMRM Pro`. Em preço, escolha **Recorrente**, moeda **BRL**, valor **19,90**, período **Mensal**. Salve.
21. No mesmo produto, clique em **Adicionar outro preço**: **79,90**, período **Personalizado → a cada 6 meses**.
22. Adicione mais um preço: **139,90**, período **Anual**.
23. Repita os passos 19 a 22 para o produto `TEAMRM Pro Plus` com **29,90** (mensal), **109,90** (6 meses) e **199,90** (anual).
24. Em cada um dos 6 preços, copie o **ID do preço** (começa com `price_`) e anote ao lado de qual é.
25. Clique na engrenagem → **Configurações** → **Faturamento** → **Portal do cliente**.
26. Ative: **Cancelar assinaturas**, **Atualizar formas de pagamento**, **Trocar de plano** (adicione os dois produtos). Salve.
27. Clique em **Desenvolvedores** → **Chaves de API**. Deixe a aba aberta: você vai copiar a **Chave secreta** (`sk_test_...`) na Parte D.

> Os valores dos preços acima são os que aparecem no app. Se quiser outros, mude no Stripe **e** peça ao Claude para atualizar `js/config.js`.

## Parte C — Funções do servidor (no Supabase)

28. No Supabase, clique em **Edge Functions** → **Deploy a new function** → **Via Editor**.
29. Nome: `create-checkout`. Apague o código de exemplo, cole todo o conteúdo de `supabase/functions/create-checkout/index.ts` (no GitHub) e clique em **Deploy function**.
30. Repita para `customer-portal`, `delete-account` e `stripe-webhook`, cada uma com o arquivo de mesmo nome.
31. Abra a função **stripe-webhook** → **Details** (ou **Settings**) → desligue **Enforce JWT Verification** → salve.

## Parte D — Segredos (no Supabase)

32. Em **Edge Functions**, clique em **Secrets** (ou **Manage secrets**).
33. Adicione cada item abaixo (nome exatamente igual, valor ao lado):
    - `APP_URL` = `https://rosymartinspersonal-glitch.github.io/prumo-postural/`
    - `STRIPE_SECRET_KEY` = a chave secreta do passo 27 (`sk_test_...`)
    - `TRIAL_DAYS` = `7` (ou `0` para não ter teste grátis)
    - `PRICE_PRO_1M`, `PRICE_PRO_6M`, `PRICE_PRO_12M` = os IDs dos preços do Pro
    - `PRICE_PROPLUS_1M`, `PRICE_PROPLUS_6M`, `PRICE_PROPLUS_12M` = os IDs do Pro Plus
34. Clique em **Save**.

## Parte E — Webhook (Stripe avisa o Supabase)

35. No Stripe, clique em **Desenvolvedores** → **Webhooks** → **Adicionar endpoint**.
36. URL: `<Project URL do passo 16>/functions/v1/stripe-webhook`
    (exemplo: `https://abcdefgh.supabase.co/functions/v1/stripe-webhook`).
37. Em eventos, selecione: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
38. Clique em **Adicionar endpoint**.
39. Clique em **Revelar** no **Segredo de assinatura** (`whsec_...`) e copie.
40. No Supabase → **Edge Functions** → **Secrets**, adicione `STRIPE_WEBHOOK_SECRET` com esse valor e salve.

## Parte F — Ligar no app

41. Mande para o Claude: o **Project URL**, a chave **anon public**, o **e-mail e WhatsApp de suporte** e (se quiser nos termos) o **CPF ou CNPJ**.
42. O Claude atualiza `js/config.js` e publica.

## Parte G — Testar

43. Abra o app, toque em **Planos**, crie uma conta e confirme pelo e-mail.
44. Escolha um plano e toque em **Continuar**.
45. Pague com o cartão de teste `4242 4242 4242 4242`, validade futura qualquer, CVC `123`.
46. De volta ao app, os cadeados devem sumir. Em **Planos**, toque em **Gerenciar ou cancelar assinatura** para testar o cancelamento.

## Parte H — Sua conta com acesso cortesia (opcional)

47. No Supabase → **SQL Editor** → **New query**, cole e troque o e-mail:
    ```sql
    insert into public.subscriptions (user_id, email, plan_override)
    select id, email, 'proplus' from auth.users where email = 'SEU-EMAIL-AQUI'
    on conflict (user_id) do update set plan_override = 'proplus';
    ```
48. Clique em **Run**.

## Parte I — Cobrar de verdade

49. Revise os **Termos de uso** e a **Política de privacidade** com um advogado.
50. No Stripe, complete a **ativação da conta** (dados bancários para receber).
51. Desligue o **Modo de teste** e repita as Partes B (preços) e E (webhook) no modo real.
52. No Supabase → **Secrets**, troque `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e os 6 `PRICE_...` pelos valores reais.
