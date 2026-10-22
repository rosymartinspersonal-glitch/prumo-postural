# Backend — contas e assinaturas

> **Cobrança em espera (stand by) desde 22/10/2026, por decisão da dona do app.** No ar só o login (Supabase). Em `js/config.js`: `billingActive: false` e `showPlans: false`. O código do Stripe (funções em `supabase/functions` e telas de planos) está guardado e pronto, mas não foi publicado nem configurado. Para retomar: siga `docs/CONFIGURAR-PAGAMENTOS.md` (Partes B a E) e depois mude as duas opções para `true`.

## Arquitetura

- **App** (GitHub Pages, estático): telas, IA e dados clínicos. Pacientes, fotos, vídeos e avaliações ficam só no IndexedDB do aparelho.
- **Supabase**: login (e-mail + senha, link mágico, redefinição de senha) e a tabela `subscriptions` (uma linha por usuário, só leitura para o próprio usuário).
- **Stripe**: Checkout para assinar, Portal do Cliente para trocar de plano, atualizar o cartão, ver faturas e cancelar em um clique.
- **Edge Functions** (`supabase/functions`, um arquivo por função; passo a passo em `docs/CONFIGURAR-PAGAMENTOS.md`):
  - `create-checkout`: cria o cliente no Stripe e abre o Checkout do plano escolhido.
  - `customer-portal`: abre o Portal do Cliente do Stripe.
  - `stripe-webhook`: única fonte da verdade sobre o status da assinatura.
  - `delete-account`: cancela a assinatura e apaga o usuário.

Sem `supabaseUrl` em `js/config.js`, a cobrança fica desligada e tudo liberado.

## Planos

| Recurso | Free | Pro | Pro Plus |
| --- | --- | --- | --- |
| Avaliação rápida, ADM, exercícios, PDF básico | ✓ | ✓ | ✓ |
| Postura completa + Adams, cabeça e pescoço, tronco, joelhos, áurea, face | | ✓ | ✓ |
| PDF com logo própria, comparação, protocolos de ADM | | ✓ | ✓ |
| Vídeo, marcadores verdes, remoção de fundo, máscara | | | ✓ |

O mapa fica em `FEATURE_PLAN`, em `js/billing.js`. Acesso cortesia: preencha `plan_override` ('pro' ou 'proplus') na linha do usuário no Supabase.

**Limitação conhecida:** como as análises rodam no aparelho, a liberação por plano é aplicada no app. Quem souber editar o código no navegador consegue contornar. O servidor garante que só quem paga aparece como assinante.

## Variáveis

Veja `.env.example`. Segredos só em Supabase → Edge Functions → Secrets. No app vão apenas a URL e a chave `anon` (públicas por definição).

## Checklist de segurança

- [x] segredos só em variáveis de ambiente; `.env*` no `.gitignore`; nada secreto no app
- [x] entrada validada no servidor: `priceKey` só aceita as 6 chaves conhecidas
- [x] autorização: token verificado em toda função; RLS deixa cada usuário ler só a própria linha; nenhuma escrita pelo app
- [ ] teste com um segundo usuário (fazer após criar o projeto: entrar com outra conta e conferir que não vê a assinatura da primeira)
- [x] webhooks verificam a assinatura do Stripe; eventos repetidos são ignorados (`stripe_events`)
- [x] cancelamento em um clique (Portal do Cliente)
- [x] exclusão de conta de verdade (`delete-account`)
- [ ] limites de envio de e-mail: usar os limites padrão do Supabase Auth; ativar CAPTCHA no cadastro se houver abuso
- [x] uploads: vídeos e fotos não vão para o servidor
- [x] nenhum dado de usuário em URLs ou logs
- [x] política de privacidade lista os operadores (Supabase, Stripe, GitHub Pages, CDNs, Google Cloud Storage)
- [ ] revisão jurídica dos termos e da política antes de cobrar

## Estado

Código escrito e revisado, **ainda não executado**: depende da criação das contas no Supabase e no Stripe pela dona do app. Primeiro teste no modo de teste do Stripe, com cartão 4242 4242 4242 4242.
