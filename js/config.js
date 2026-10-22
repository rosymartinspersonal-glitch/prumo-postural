/* TEAMRM - Posture & Correction — configuração pública do app.
   Tudo aqui é visível no navegador: nunca coloque chaves secretas (Stripe sk_..., service_role) neste arquivo.
   Enquanto supabaseUrl estiver vazio, a cobrança fica desligada e todas as funções ficam liberadas. */
'use strict';

const TEAMRM_CONFIG = {
  // Supabase → Project Settings → API: "Project URL" e "anon public"
  supabaseUrl: '',
  supabaseAnonKey: '',
  appUrl: 'https://rosymartinspersonal-glitch.github.io/prumo-postural/',
  trialDays: 7,
  // Preços exibidos na tela de planos. Os valores cobrados de verdade são os cadastrados no Stripe:
  // mantenha os dois iguais. "key" liga cada opção ao preço do Stripe (variáveis PRICE_* no servidor).
  prices: {
    pro: [
      { key: 'pro_12m', months: 12, total: 'R$ 139,90', perMonth: 'R$ 11,66', tag: 'Melhor preço' },
      { key: 'pro_6m', months: 6, total: 'R$ 79,90', perMonth: 'R$ 13,32', tag: 'Mais popular' },
      { key: 'pro_1m', months: 1, total: 'R$ 19,90', perMonth: 'R$ 19,90', tag: '' },
    ],
    proplus: [
      { key: 'proplus_12m', months: 12, total: 'R$ 199,90', perMonth: 'R$ 16,66', tag: 'Melhor preço' },
      { key: 'proplus_6m', months: 6, total: 'R$ 109,90', perMonth: 'R$ 18,32', tag: 'Mais popular' },
      { key: 'proplus_1m', months: 1, total: 'R$ 29,90', perMonth: 'R$ 29,90', tag: '' },
    ],
  },
  // Contato exibido em Ajustes → Suporte
  support: { email: '', whatsapp: '' },
  // Dados do responsável pelo tratamento de dados (LGPD), exibidos na política de privacidade e nos termos
  legal: { controller: 'Rosileni Martins — TEAMRM', document: '', city: '' },
};
