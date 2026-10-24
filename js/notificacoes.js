/* TEAMRM — Notificações: avisos do app (ex.: aluno assinou o contrato pelo link).
   Guardadas no aparelho (loja settings, registro "notifications"). Enquanto o app está aberto (ou em segundo plano),
   confere os links de assinatura no servidor a cada 2 minutos e ao voltar para a tela; quando o aluno assina,
   registra a assinatura no contrato, cria a notificação e mostra o aviso do sistema (se permitido). */
'use strict';

const NOTIF = (() => {
  const KEY = 'notifications', MAX = 200, EVERY = 2 * 60 * 1000;
  let timer = null, busy = false;
  const load = async () => (await Store.get('settings', KEY))?.list || [];
  const save = list => Store.put('settings', { id: KEY, list: list.slice(0, MAX) });
  const unread = async () => (await load()).filter(n => !n.read).length;

  async function badge() {
    const n = await unread(), b = document.getElementById('nav-notif-n');
    if (b) { b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n; }
    try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (e) { }
  }
  async function add(n) {
    const list = await load();
    if (n.key && list.some(x => x.key === n.key)) return false;   // não repete o mesmo aviso
    list.unshift({ id: PC.uid(), at: new Date().toISOString(), read: false, ...n });
    await save(list); await badge(); return true;
  }
  // aviso do sistema (barra de notificações do celular / computador)
  async function system(title, body, tag) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      const opt = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { hash: '#notificacoes' } };
      if (reg?.showNotification) await reg.showNotification(title, opt); else new Notification(title, opt);
    } catch (e) { }
  }
  async function signed(o, cl) {
    const L = o.signing?.link || {}, when = L.signedAt ? new Date(L.signedAt).toLocaleString('pt-BR') : '';
    const title = 'Contrato assinado', body = `${L.name || cl?.name || 'O aluno'} assinou “${o.title}” (versão ${o.version})${when ? ' em ' + when : ''}.`;
    if (await add({ key: `sign:${o.id}:${o.version}`, type: 'assinatura', title, body, contractId: o.id })) {
      await system(title, body, `sign-${o.id}`);
      if (!document.hidden) toast(body, 5000);
    }
  }

  // confere no servidor todos os contratos com link pendente (uma consulta só)
  async function poll() {
    if (busy || typeof Billing === 'undefined' || !Billing.enabled) return;
    busy = true;
    try {
      const pend = (await Store.all('pcContracts')).filter(k => k.status === 'aguardando' && k.signing?.link?.status === 'pendente' && k.signing.link.id);
      if (!pend.length || !(await Billing.user())) return;
      const { data, error } = await (await Billing.client()).from('sign_requests').select('id, status').in('id', pend.map(k => k.signing.link.id));
      if (error || !data) return;
      for (const r of data.filter(x => x.status === 'assinado')) {
        const k = pend.find(x => x.signing.link.id === r.id);
        if (k) await PCSign.check(k, true);   // registra no contrato e cria a notificação (ver abaixo)
      }
    } catch (e) { } finally { busy = false; }
  }
  function start() {
    badge(); poll();
    clearInterval(timer); timer = setInterval(poll, EVERY);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  }
  return { load, save, add, badge, signed, poll, start, system };
})();

// a assinatura registrada ao abrir o contrato também vira notificação
if (typeof PCSign !== 'undefined') {
  const base = PCSign.check;
  PCSign.check = async (k, quiet) => { const ok = await base(k, quiet); if (ok) { const o = await Store.get('pcContracts', k.id); if (o) await NOTIF.signed(o, await Store.get('pcClients', o.clientId)); } return ok; };
}

SCREENS.notificacoes = async () => {
  const list = await NOTIF.load(), perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const pending = (await Store.all('pcContracts')).filter(k => k.status === 'aguardando' && k.signing?.link?.status === 'pendente').length;
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Avisos do app</span><h1>Notificações</h1></div>
      <div class="row">${list.some(n => !n.read) ? '<button class="btn" id="nt-read">Marcar todas como lidas</button>' : ''}${list.length ? '<button class="btn ghost danger" id="nt-clear">Limpar</button>' : ''}</div></div>
    <section class="panel stack"><h2>Avisos no celular / computador</h2>
      ${perm === 'granted' ? '<p style="margin:0"><span class="st ok">Ligados</span> Você recebe um aviso na barra de notificações quando um aluno assina o contrato.</p>'
      : perm === 'denied' ? '<p style="margin:0"><span class="st bad">Bloqueados</span> As notificações deste app estão bloqueadas no navegador. Libere em: configurações do navegador → Notificações → este site.</p>'
      : perm === 'unsupported' ? `<p style="margin:0"><span class="st warn">Indisponível</span> ${ios && !standalone ? 'No iPhone, os avisos só funcionam com o app instalado na tela de início (Compartilhar → Adicionar à Tela de Início).' : 'Este navegador não mostra notificações.'} Os avisos continuam aparecendo nesta aba.</p>`
      : '<p style="margin:0">Ligue para receber um aviso na barra de notificações quando um aluno assinar o contrato.</p><div class="row"><button class="btn primary" id="nt-perm">Ligar avisos</button></div>'}
      <p class="muted" style="margin:0;font-size:.85rem">O app confere as assinaturas ao abrir, ao voltar para a tela e a cada 2 minutos enquanto estiver aberto ou em segundo plano. Com o app totalmente fechado, o aviso aparece assim que você abrir o app. ${pending ? `Aguardando assinatura agora: <b>${pending}</b> contrato${pending > 1 ? 's' : ''}.` : ''}</p>
      ${pending ? '<div class="row"><button class="btn small" id="nt-poll">Verificar agora</button></div>' : ''}</section>
    ${list.length ? `<div class="plist">${list.map(n => `<button class="prow" data-n="${n.id}" style="grid-template-columns:auto 1fr auto${n.read ? '' : ';border-left:3px solid var(--accent)'}"><span class="av">✓</span><span style="min-width:0"><b>${esc(n.title)}</b><br><span style="font-size:.9rem">${esc(n.body)}</span><br><span class="muted" style="font-size:.8rem">${esc(new Date(n.at).toLocaleString('pt-BR'))}</span></span>${n.read ? '' : '<span class="st warn">Nova</span>'}</button>`).join('')}</div>`
      : '<div class="panel empty"><h2>Nenhuma notificação</h2><p class="muted" style="margin:0">Quando um aluno assinar o contrato pelo link, o aviso aparece aqui.</p></div>'}`;
  const p = $('#nt-perm'); if (p) p.onclick = async () => { const r = await Notification.requestPermission(); if (r === 'granted') { toast('Avisos ligados'); NOTIF.system('Avisos ligados', 'Você será avisada quando um aluno assinar o contrato.', 'teste'); } go('notificacoes'); };
  const rd = $('#nt-read'); if (rd) rd.onclick = async () => { await NOTIF.save(list.map(n => ({ ...n, read: true }))); await NOTIF.badge(); go('notificacoes'); };
  const cl = $('#nt-clear'); if (cl) cl.onclick = async () => { if (!(await confirmBox('Limpar notificações?', 'A lista de avisos é apagada. Os contratos não mudam.', 'Limpar'))) return; await NOTIF.save([]); await NOTIF.badge(); go('notificacoes'); };
  const pl = $('#nt-poll'); if (pl) pl.onclick = async () => { pl.disabled = true; pl.textContent = 'Verificando…'; await NOTIF.poll(); toast('Verificação feita'); go('notificacoes'); };
  $$('[data-n]').forEach(b => b.onclick = async () => {
    const n = list.find(x => x.id === b.dataset.n); n.read = true; await NOTIF.save(list); await NOTIF.badge();
    if (n.contractId && await Store.get('pcContracts', n.contractId)) { PCX.ktab = 'assinatura'; go('pcContrato', { id: n.contractId }); } else go('notificacoes');
  });
};
// toque na notificação com o app já aberto
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'open' && e.data.screen === 'notificacoes') go('notificacoes'); });
