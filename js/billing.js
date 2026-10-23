/* TEAMRM - Posture & Correction — contas, planos e assinatura (Supabase + Stripe).
   O status da assinatura vem do servidor (atualizado pelos webhooks do Stripe); o app só o lê.
   Os dados dos pacientes nunca vão para o servidor.                                             */
'use strict';

const PLANS = {
  free: { label: 'Free', rank: 0, desc: 'Avaliação essencial, sem assinatura', features: ['Avaliação rápida', 'Amplitude de movimento (goniômetro)', 'Biblioteca de 64 exercícios e treino guiado', 'Resultados na tela e PDF básico'] },
  pro: { label: 'Pro', rank: 1, desc: 'Avaliação clínica completa', features: ['Tudo do Free', 'Postura completa com flexão de tronco (Adams)', 'Cabeça e pescoço, simetria de tronco (ATSI/POTSI)', 'Joelhos, proporção áurea e simetria facial', 'PDF personalizado com sua logo', 'Comparação antes × depois e protocolos de ADM'] },
  proplus: { label: 'Pro Plus', rank: 2, desc: 'A plataforma TEAMRM completa', features: ['Tudo do Pro', 'Análise de vídeo com repetições, amplitude e compensações', 'Marcadores verdes e remoção de fundo', 'Máscara no rosto para privacidade', 'Suporte prioritário'] },
};
// recurso → plano mínimo
const FEATURE_PLAN = {
  rapida: 'free', adm: 'free', exercicios: 'free',
  postural: 'pro', adams: 'pro', cabeca: 'pro', tronco: 'pro', joelhos: 'pro', aurea: 'pro', face: 'pro', pdfCustom: 'pro', compare: 'pro', protocols: 'pro',
  video: 'proplus', green: 'proplus', bg: 'proplus', mask: 'proplus',
};

const FEATURE_LABEL = { pdfCustom: 'PDF personalizado', compare: 'Comparação antes × depois', protocols: 'Protocolos de ADM', green: 'Marcadores verdes', bg: 'Remoção de fundo', mask: 'Máscara no rosto' };
const featureLabel = k => KINDS[k]?.label || FEATURE_LABEL[k] || k;
const Billing = (() => {
  const cfg = TEAMRM_CONFIG, enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey), enforce = enabled && !!cfg.billingActive;
  let client = null, cache = null;
  const CACHE_KEY = 'teamrm-plan';
  async function sb() {
    if (client) return client;
    if (!window.supabase) await withTimeout(loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'), 20000);
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }
  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } };
  const writeCache = v => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { } };
  async function user() { if (!enabled) return null; try { const { data } = await (await sb()).auth.getUser(); return data.user || null; } catch (e) { return null; } }
  async function subscription() {
    const u = await user(); if (!u) return null;
    const { data, error } = await (await sb()).from('subscriptions').select('*').eq('user_id', u.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  function planOf(sub) {
    if (!sub) return 'free';
    if (sub.plan_override) return sub.plan_override;
    const active = ['active', 'trialing'].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    return active && PLANS[sub.plan] ? sub.plan : 'free';
  }
  async function plan(force = false) {
    if (!enforce) return 'proplus';                       // cobrança desligada: tudo liberado
    const c = readCache();
    if (!force && c && Date.now() - c.at < 6 * 3600e3) return c.plan;
    try { const sub = await subscription(); const p = planOf(sub); writeCache({ plan: p, at: Date.now(), sub }); return p; }
    catch (e) { return c && Date.now() - c.at < 7 * 864e5 ? c.plan : 'free'; }   // offline: vale o último status por 7 dias
  }
  const can = (p, feature) => PLANS[p].rank >= PLANS[FEATURE_PLAN[feature] || 'free'].rank;
  const minPlan = feature => FEATURE_PLAN[feature] || 'free';
  async function call(fn, body) {
    const c = await sb(); const { data: s } = await c.auth.getSession();
    if (!s.session) throw new Error('entre na sua conta primeiro');
    const r = await fetch(`${cfg.supabaseUrl}/functions/v1/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}`, apikey: cfg.supabaseAnonKey }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
    return j;
  }
  return {
    enabled, enforce, plan, can, minPlan, user, subscription, planOf, client: sb,
    cached: () => readCache(),
    clearCache: () => { try { localStorage.removeItem(CACHE_KEY); } catch (e) { } },
    async signUp(email, password) { const { error } = await (await sb()).auth.signUp({ email, password, options: { emailRedirectTo: cfg.appUrl } }); if (error) throw error; },
    async signIn(email, password) { const { error } = await (await sb()).auth.signInWithPassword({ email, password }); if (error) throw error; this.clearCache(); },
    async magicLink(email) { const { error } = await (await sb()).auth.signInWithOtp({ email, options: { emailRedirectTo: cfg.appUrl } }); if (error) throw error; },
    async resetPassword(email) { const { error } = await (await sb()).auth.resetPasswordForEmail(email, { redirectTo: cfg.appUrl }); if (error) throw error; },
    async updatePassword(password) { const { error } = await (await sb()).auth.updateUser({ password }); if (error) throw error; },
    async signOut(everywhere) { await (await sb()).auth.signOut({ scope: everywhere ? 'global' : 'local' }); this.clearCache(); },
    async checkout(priceKey) { const j = await call('create-checkout', { priceKey }); location.href = j.url; },
    async portal() { const j = await call('customer-portal'); location.href = j.url; },
    async deleteAccount() { await call('delete-account'); await this.signOut(); },
    async onAuth(cb) { if (!enabled) return; (await sb()).auth.onAuthStateChange((ev, session) => cb(ev, session)); },
  };
})();

/* ---------- tela de planos e conta ---------- */
SCREENS.plans = async ({ need } = {}) => {
  const cfg = TEAMRM_CONFIG;
  const u = await Billing.user(), cur = Billing.enforce ? await Billing.plan(true) : 'free', cached = Billing.cached();
  const sub = cached?.sub;
  let tab = need ? Billing.minPlan(need) : (cur === 'free' ? 'proplus' : cur);
  if (tab === 'free') tab = 'pro';
  let choice = 1;
  const standby = () => {
    app.innerHTML = `<div class="stack" style="gap:4px"><span class="eyebrow">TEAMRM · Posture & Correction</span><h1>Conta</h1></div>
      <div class="banner">Todas as funções do app estão liberadas.</div>
      <section class="panel stack" id="acct"></section>`;
    drawAccount();
  };
  const draw = () => {
    const P = PLANS[tab], opts = cfg.prices[tab] || [];
    app.innerHTML = `<div class="plantabs" role="tablist">${Object.keys(PLANS).map(k => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${PLANS[k].label}</button>`).join('')}</div>
      <section class="planhero"><div class="row" style="justify-content:center;gap:10px"><img src="assets/logo-mark.png" alt="" height="44"><b class="brandword">TEAMRM</b><span class="planbadge">${esc(P.label)}</span></div>
        <h1 style="text-align:center">${tab === 'free' ? 'Comece a avaliar sem pagar nada' : 'Análises especializadas e fundamentos em um só lugar'}</h1>
        <p class="muted" style="text-align:center;margin:0">${esc(P.desc)}</p></section>
      ${!Billing.enforce ? '<div class="banner warn">Cobrança ainda não ativada: todas as funções estão liberadas para todos. As contas já funcionam.</div>' : ''}
      ${need ? `<div class="banner">“${esc(featureLabel(need))}” faz parte do plano ${esc(PLANS[Billing.minPlan(need)].label)}.</div>` : ''}
      ${tab !== 'free' ? `<div class="periods">${opts.map((o, i) => `<button class="period${i === choice ? ' on' : ''}" data-i="${i}" aria-pressed="${i === choice}"><span class="ptag">${esc(o.tag || ' ')}</span><b>${o.months} ${o.months > 1 ? 'meses' : 'mês'}</b><span class="ptotal">${esc(o.total)}</span><span class="muted">${esc(o.perMonth)} / mês</span><span class="radio" aria-hidden="true"></span></button>`).join('')}</div>` : ''}
      <ul class="pfeat">${P.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="stack" style="gap:6px">
        ${tab === 'free' ? '' : cur === tab ? '<button class="btn primary big" id="manage">Gerenciar ou cancelar assinatura</button>' : `<button class="btn primary big" id="cont">${cfg.trialDays && cur === 'free' ? `Começar ${cfg.trialDays} dias grátis` : 'Continuar'}</button>`}
        <p class="muted" style="text-align:center;margin:0;font-size:.85rem">Cancele quando quiser, em um clique. Pagamento seguro pelo Stripe.</p>
      </div>
      <section class="panel stack" id="acct"></section>`;
    $$('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; choice = 1; draw(); });
    $$('[data-i]').forEach(b => b.onclick = () => { choice = +b.dataset.i; draw(); });
    const c = $('#cont'); if (c) c.onclick = async () => {
      if (!Billing.enforce) return toast('Pagamentos ainda não ativados. Todas as funções já estão liberadas.', 4000);
      if (!u) { toast('Entre ou crie sua conta para assinar'); $('#acct').scrollIntoView({ behavior: 'smooth' }); return; }
      c.disabled = true; c.textContent = 'Abrindo pagamento…';
      try { await Billing.checkout(opts[choice].key); } catch (e) { toast('Não foi possível abrir o pagamento: ' + e.message, 5000); c.disabled = false; c.textContent = 'Continuar'; }
    };
    const mg = $('#manage'); if (mg) mg.onclick = async () => { try { await Billing.portal(); } catch (e) { toast('Não foi possível abrir: ' + e.message, 5000); } };
    drawAccount();
  };
  const drawAccount = () => {
    const box = $('#acct');
    if (!Billing.enabled) { box.innerHTML = '<h2>Conta</h2><p class="muted" style="margin:0">As contas de usuário serão ativadas junto com os pagamentos.</p>'; return; }
    if (u) {
      box.innerHTML = `<h2>Sua conta</h2><p style="margin:0">${esc(u.email)}${cfg.showPlans ? ` · plano <b>${esc(PLANS[cur].label)}</b>` : ''}${sub?.current_period_end && cur !== 'free' ? ` · ${sub.cancel_at_period_end ? 'termina' : 'renova'} em ${fmtDate(sub.current_period_end)}` : ''}${sub?.status === 'past_due' ? ' · <span class="st bad">pagamento pendente</span>' : ''}</p>
        <div class="row">${cfg.showPlans ? '<button class="btn" id="restore">Restaurar compras</button>' : ''}${sub?.stripe_customer_id ? '<button class="btn" id="portal2">Faturas e cartão</button>' : ''}<button class="btn" id="out">Sair</button><button class="btn ghost" id="outall">Sair de todos os aparelhos</button></div>
        <details><summary class="muted">Excluir minha conta</summary><p class="muted" style="font-size:.9rem">Apaga sua conta do servidor (e cancela a assinatura, se houver). Os pacientes guardados neste aparelho não são afetados.</p><button class="btn danger" id="delacc">Excluir conta</button></details>`;
      const rs = $('#restore'); if (rs) rs.onclick = async () => { Billing.clearCache(); const p = await Billing.plan(true); toast('Plano atualizado: ' + PLANS[p].label); go('plans'); };
      const p2 = $('#portal2'); if (p2) p2.onclick = () => Billing.portal().catch(e => toast(e.message));
      $('#out').onclick = async () => { await Billing.signOut(false); toast('Você saiu'); go('plans'); };
      $('#outall').onclick = async () => { await Billing.signOut(true); toast('Você saiu de todos os aparelhos'); go('plans'); };
      $('#delacc').onclick = async () => { if (!(await confirmBox('Excluir conta?', 'Sua assinatura será cancelada e a conta apagada. Isso não pode ser desfeito.'))) return; try { await Billing.deleteAccount(); toast('Conta excluída'); go('plans'); } catch (e) { toast('Não foi possível excluir: ' + e.message, 5000); } };
    } else {
      box.innerHTML = `<h2>Entrar ou criar conta</h2>
        <form class="stack" id="auth" novalidate><label class="f">E-mail<input id="ae" type="email" autocomplete="email" required></label>
          <label class="f">Senha (mínimo 8 caracteres)<input id="ap" type="password" autocomplete="current-password" minlength="8"></label>
          <div class="row"><button class="btn primary" data-m="in">Entrar</button><button class="btn" data-m="up">Criar conta</button><button class="btn ghost" data-m="link">Receber link de acesso por e-mail</button><button class="btn ghost" data-m="reset">Esqueci a senha</button></div>
          <p class="muted" id="amsg" style="margin:0;font-size:.9rem"></p></form>`;
      $('#auth').onsubmit = e => e.preventDefault();
      $$('[data-m]').forEach(b => b.onclick = async () => {
        const email = $('#ae').value.trim(), pw = $('#ap').value, msg = t => $('#amsg').textContent = t;
        if (!/^\S+@\S+\.\S+$/.test(email)) return msg('Informe um e-mail válido.');
        try {
          if (b.dataset.m === 'in') { if (pw.length < 8) return msg('Senha com pelo menos 8 caracteres.'); await Billing.signIn(email, pw); toast('Bem-vinda(o)!'); go('plans'); }
          if (b.dataset.m === 'up') { if (pw.length < 8) return msg('Senha com pelo menos 8 caracteres.'); await Billing.signUp(email, pw); msg('Conta criada. Abra o e-mail de confirmação que enviamos e depois entre aqui.'); }
          if (b.dataset.m === 'link') { await Billing.magicLink(email); msg('Enviamos um link de acesso para o seu e-mail.'); }
          if (b.dataset.m === 'reset') { await Billing.resetPassword(email); msg('Enviamos um link para criar uma nova senha.'); }
        } catch (err) { msg(/Invalid login/i.test(err.message) ? 'E-mail ou senha incorretos.' : 'Não foi possível: ' + err.message); }
      });
    }
  };
  if (!cfg.showPlans) standby(); else draw();
};
