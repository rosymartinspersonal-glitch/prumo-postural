/* TEAMRM - Posture & Correction — inicialização. */
'use strict';
(async () => {
  for (const [id, name] of [['go-home', 'home'], ['nav-home', 'home'], ['nav-patients', 'patients'], ['nav-results', 'results_db'], ['nav-settings', 'settings'], ['nav-plans', 'plans']]) {
    const b = document.getElementById(id); if (b) b.onclick = () => go(name);
  }
  if (TEAMRM_CONFIG.showPlans) { const l = document.getElementById('nav-plans-label'); if (l) l.textContent = 'Planos'; }
  await Store.open();
  try { await loadCustomEx(); } catch (e) { }
  const S = await getSettings();
  // migração para a identidade TEAMRM (quem usava as cores antigas padrão)
  if ((S.brandV || 0) < 2) { if (!S.palette || S.palette === 'indigo') S.palette = 'teamrm'; if (S.pdfColor === '#1D2A6B') S.pdfColor = '#0D0D0D'; S.brandV = 2; S.theme ||= 'auto'; await Store.put('settings', S); }
  applyPalette(S); applyUnits(S);
  await AppLock.gate();   // senha do app, se estiver ligada
  const tb = document.getElementById('theme-btn');
  if (tb) tb.onclick = async () => { const s = await getSettings(); s.theme = { auto: 'light', light: 'dark', dark: 'auto' }[s.theme || 'auto']; await Store.put('settings', s); applyPalette(s); toast(THEME_LABEL[s.theme]); const sel = document.getElementById('s-theme'); if (sel) sel.value = s.theme; };
  if (!S.seeded) {
    const pts = await Store.all('patients');
    if (!pts.length) await seedExample();
    S.seeded = true; await Store.put('settings', S);
  }
  // volta do Stripe Checkout
  const q = new URLSearchParams(location.search), ck = q.get('checkout');
  if (ck) { history.replaceState(null, '', location.pathname); Billing.clearCache(); }
  // link de redefinição de senha
  Billing.onAuth(ev => { if (ev === 'PASSWORD_RECOVERY') newPasswordPrompt(); });
  if (ck === 'ok') { toast('Assinatura confirmada. Obrigado!', 4000); go('plans'); }
  else if (ck) { toast('Pagamento não concluído.'); go('plans'); }
  else go('home');
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { await navigator.serviceWorker.register('sw.js'); } catch { /* sem modo offline neste ambiente */ }
  }
})();

function newPasswordPrompt() {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true"><h2>Criar nova senha</h2><label class="f">Nova senha (mínimo 8 caracteres)<input id="np" type="password" autocomplete="new-password" minlength="8"></label>
    <p class="muted" id="npm" style="margin:0"></p><div class="row" style="justify-content:flex-end"><button class="btn primary">Salvar senha</button></div></form>`;
  document.body.appendChild(m);
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const pw = $('#np', m).value;
    if (pw.length < 8) return $('#npm', m).textContent = 'Use pelo menos 8 caracteres.';
    try { await Billing.updatePassword(pw); m.remove(); toast('Senha atualizada'); } catch (err) { $('#npm', m).textContent = 'Não foi possível: ' + err.message; }
  };
}
