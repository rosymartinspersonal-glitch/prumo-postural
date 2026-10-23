/* TEAMRM — Contratos Personal: clientes, contratos editáveis, calendário de aulas, diretrizes, documentos e assinatura.
   Dados só no aparelho (lojas pcClients, pcContracts, pcTemplates; arquivos na loja media). Salva só ao tocar em "Salvar". */
'use strict';

const PCX = { draft: null, dirty: false, mode: 'fill', cal: { view: 'mes', month: 1 }, list: { q: '', st: 'all', year: '', cat: 'all' }, tab: 'personal' };
const PC_CATS = { personal: 'Alunos – Personal trainer', online: 'Alunos – Serviços online' };
const pcCat = c => (c?.category === 'online' ? 'online' : 'personal');
const pcKind = k => (k?.kind === 'online' ? 'online' : 'personal');
const pcAll = async s => (await Store.all(s));
const pcClients = async () => (await pcAll('pcClients')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
const pcToday = () => (typeof AL !== 'undefined' ? AL.today() : new Date().toISOString().slice(0, 10));
const pcStTone = s => ({ rascunho: 'na', aguardando: 'warn', assinado: 'ok', vencido: 'bad', cancelado: 'bad' }[s] || 'na');
const pcLocked = c => ['aguardando', 'assinado', 'cancelado'].includes(c.status);
function pcSetDirty(v = true) { PCX.dirty = v; const b = $('#pc-save'); if (b) { b.disabled = !v; b.textContent = v ? 'Salvar' : 'Salvo'; } }
async function pcTemplates(type, kind = 'personal') { return (await pcAll('pcTemplates')).filter(t => t.type === type && (t.kind || 'personal') === kind); }
async function pcProfessional() { const S = await getSettings(); return { name: S.professional || '', reg: S.registry ? crefFmt(S.registry) : '', clinic: S.clinic || '', logo: S.logo || '', signature: S.signature || '' }; }

// aviso ao sair com alterações não salvas
{
  const base = go;
  go = (name, p) => {
    if (PCX.dirty && !(name === 'pcContrato' && p?.id === PCX.draft?.id) && !(name === 'pcCliente' && p?.id === PCX.draftClient?.id)) {
      if (!confirm('Há alterações não salvas. Sair sem salvar?')) return;
      PCX.dirty = false; PCX.draft = null; PCX.draftClient = null;
    }
    return base(name, p);
  };
  window.addEventListener('beforeunload', e => { if (PCX.dirty) { e.preventDefault(); e.returnValue = ''; } });
}

/* ================= lista ================= */
SCREENS.contratos = async ({ tab } = {}) => {
  if (tab) PCX.tab = tab; if (PCX.tab === 'clientes') PCX.tab = 'personal';
  const [allClients, contracts] = await Promise.all([pcClients(), pcAll('pcContracts')]), t = pcToday();
  const T = [['personal', PC_CATS.personal], ['online', PC_CATS.online], ['contratos', 'Contratos'], ['modelos', 'Modelos'], ['dados', 'Importar / exportar']];
  const curCat = PC_CATS[PCX.tab] ? PCX.tab : null, clients = curCat ? allClients.filter(c => pcCat(c) === curCat) : allClients;
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Personal trainer e serviços online</span><h1>Contratos Personal</h1></div>
      <div class="row"><button class="btn" id="pc-newc">+ Novo aluno</button><button class="btn primary" id="pc-newk">+ Novo contrato</button></div></div>
    <div class="tabs" role="tablist">${T.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${PCX.tab === k}">${l}</button>`).join('')}</div><div id="pc-body" class="stack"></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => go('contratos', { tab: b.dataset.t }));
  $('#pc-newc').onclick = () => go('pcCliente', { id: null, category: curCat || 'personal' });
  $('#pc-newk').onclick = () => pcNewContract(null, curCat || (PCX.list.cat === 'online' ? 'online' : 'personal'));
  const body = $('#pc-body');
  if (curCat) {
    const allSt = typeof AL !== 'undefined' ? await Store.all('students') : [], stById = new Map(allSt.map(s => [s.id, s])), linked = new Set(allClients.map(c => c.studentId).filter(Boolean));
    const free = allSt.filter(s => !linked.has(s.id) && pcStudentCat(s) === curCat);
    // alunos cadastrados na aba errada (ex.: aluno de personal em Serviços online)
    const wrong = clients.filter(c => pcClientCat(c, stById) !== curCat), other = curCat === 'online' ? 'personal' : 'online';
    body.innerHTML = `<p class="muted" style="margin:0;font-size:.9rem">${curCat === 'online' ? 'Alunos de consultoria, planilhas de treino e dieta. O contrato tem vigência (início e término) em vez de calendário de aulas.' : 'Alunos do atendimento presencial. O contrato tem calendário de aulas, feriados e valor mensal.'}</p>
      ${wrong.length ? `<div class="panel row spread" style="padding:12px 14px;border-color:var(--warn)"><span style="font-size:.92rem">${wrong.length} aluno${wrong.length > 1 ? 's' : ''} desta aba ${wrong.length > 1 ? 'são' : 'é'} de ${other === 'personal' ? 'personal presencial' : 'serviço online'}: ${esc(wrong.map(c => c.name).join(', '))}.</span><button class="btn small primary" id="pc-move">Mover para “${esc(PC_CATS[other])}”</button></div>` : ''}
      ${free.length ? `<div class="panel row spread" style="padding:12px 14px"><span style="font-size:.92rem">${free.length} aluno${free.length > 1 ? 's' : ''} ${curCat === 'personal' ? 'de personal' : 'de serviço online'} de “Alunos online” ainda sem cadastro aqui.</span><button class="btn small primary" id="pc-from-al">Trazer de Alunos online</button></div>` : ''}
      <input class="search" id="pc-q" type="search" placeholder="Buscar aluno pelo nome" aria-label="Buscar aluno" value="${esc(PCX.list.q)}"><div id="pc-l"></div>`;
    const fa = $('#pc-from-al'); if (fa) fa.onclick = () => pcFromStudents(free, curCat);
    const mv = $('#pc-move'); if (mv) mv.onclick = async () => { for (const c of wrong) await Store.put('pcClients', { ...c, category: other, updatedAt: todayISO() }); toast(`${wrong.length} aluno${wrong.length > 1 ? 's' : ''} movido${wrong.length > 1 ? 's' : ''}`); go('contratos', { tab: curCat }); };
    const draw = () => {
      const q = AL.norm(PCX.list.q), l = clients.filter(c => AL.norm(c.name).includes(q));
      $('#pc-l').innerHTML = !clients.length ? `<div class="panel empty"><h2>Nenhum aluno nesta aba</h2><p class="muted" style="margin:0">${curCat === 'online' ? 'Cadastre o aluno de serviço online ou traga os alunos da aba “Alunos online”.' : 'Cadastre o primeiro aluno de personal ou importe os calendários em “Importar / exportar”.'}</p><button class="btn primary" id="pc-e1">+ Novo aluno</button></div>`
        : !l.length ? '<div class="panel empty muted">Nenhum aluno encontrado.</div>'
        : `<div class="plist">${l.map(c => { const ks = contracts.filter(k => k.clientId === c.id), st = ks.map(k => PC.statusOf(k, t));
          return `<button class="prow" data-c="${c.id}"><span class="av">${esc(initials(c.name))}</span><span style="min-width:0"><b>${esc(c.name)}</b><br><span class="muted" style="font-size:.86rem">${ks.length} contrato${ks.length === 1 ? '' : 's'}${c.service ? ' · ' + esc(c.service) : ''}${c.phone ? ' · ' + esc(c.phone) : ''}</span>${pcSpecs(c, ks, stById.get(c.studentId))}</span><span class="row" style="gap:4px;justify-content:flex-end">${[...new Set(st)].map(s => `<span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span>`).join('')}</span></button>`; }).join('')}</div>`;
      $$('[data-c]').forEach(b => b.onclick = () => go('pcCliente', { id: b.dataset.c }));
      const e1 = $('#pc-e1'); if (e1) e1.onclick = () => go('pcCliente', { id: null, category: curCat });
    };
    $('#pc-q').oninput = e => { PCX.list.q = e.target.value; draw(); }; draw();
  } else if (PCX.tab === 'contratos') {
    const years = [...new Set(contracts.map(k => PC.yearOf(k)).filter(Boolean))].sort();
    body.innerHTML = `<div class="row"><input class="search" id="pc-q" type="search" placeholder="Buscar por aluno ou título" value="${esc(PCX.list.q)}" aria-label="Buscar contrato">
        <label class="f" style="min-width:130px">Período<select id="pc-y"><option value="">Todos os anos</option>${years.map(y => `<option${String(y) === PCX.list.year ? ' selected' : ''}>${y}</option>`).join('')}</select></label></div>
      <div class="chips" aria-label="Tipo">${[['all', 'Todos os alunos'], ['personal', 'Personal trainer'], ['online', 'Serviços online']].map(([k, l]) => `<button class="chip" data-cat="${k}" aria-pressed="${PCX.list.cat === k}">${l}</button>`).join('')}</div>
      <div class="chips">${[['all', 'Todos'], ...Object.entries(PC.STATUS)].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${PCX.list.st === k}">${esc(l)}</button>`).join('')}</div><div id="pc-l"></div>`;
    const draw = () => {
      const q = AL.norm(PCX.list.q), name = id => clients.find(c => c.id === id)?.name || '—';
      const l = contracts.filter(k => AL.norm(`${name(k.clientId)} ${k.title}`).includes(q) && (PCX.list.cat === 'all' || pcKind(k) === PCX.list.cat) && (PCX.list.st === 'all' || PC.statusOf(k, t) === PCX.list.st) && (!PCX.list.year || String(PC.yearOf(k)) === PCX.list.year))
        .sort((a, b) => name(a.clientId).localeCompare(name(b.clientId), 'pt-BR') || b.version - a.version);
      $('#pc-l').innerHTML = l.length ? `<div class="plist">${l.map(k => { const s = PC.statusOf(k, t); return `<button class="prow" data-k="${k.id}" style="grid-template-columns:1fr auto"><span style="min-width:0"><b>${esc(name(k.clientId))}</b> <span class="muted" style="font-size:.86rem">· ${esc(k.title)} · v${k.version}</span><br><span class="muted" style="font-size:.84rem">${pcKind(k) === 'online' ? 'Online' : 'Personal'} · ${esc(PC.br(PC.periodOf(k).start))} a ${esc(PC.br(PC.periodOf(k).end) || 'sem término')}</span></span><span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span></button>`; }).join('')}</div>` : '<div class="panel empty muted">Nenhum contrato nesta seleção.</div>';
      $$('[data-k]').forEach(b => b.onclick = () => go('pcContrato', { id: b.dataset.k }));
    };
    $('#pc-q').oninput = e => { PCX.list.q = e.target.value; draw(); };
    $('#pc-y').onchange = e => { PCX.list.year = e.target.value; draw(); };
    $$('[data-cat]').forEach(b => b.onclick = () => { PCX.list.cat = b.dataset.cat; $$('[data-cat]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
    $$('[data-s]').forEach(b => b.onclick = () => { PCX.list.st = b.dataset.s; $$('[data-s]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
    draw();
  } else if (PCX.tab === 'modelos') {
    const tpls = await pcAll('pcTemplates');
    body.innerHTML = `<p class="muted" style="margin:0">Modelos usados ao criar um contrato. Alterar um modelo não muda contratos já criados.</p>
      ${[['contrato', 'personal'], ['diretrizes', 'personal'], ['contrato', 'online'], ['diretrizes', 'online']].map(([type, kind]) => `<section class="panel stack"><div class="row spread"><h2>${type === 'contrato' ? 'Modelos de contrato' : 'Modelos de diretrizes'} · ${kind === 'online' ? 'serviços online' : 'personal trainer'}</h2><button class="btn small" data-nt="${type}" data-nk="${kind}">+ Novo modelo</button></div>
        <div class="plist"><div class="prow arow" style="cursor:default"><span><b>Modelo padrão do app</b><br><span class="muted" style="font-size:.85rem">Campos e tópicos em branco para preencher</span></span></div>
        ${tpls.filter(x => x.type === type && (x.kind || 'personal') === kind).map(x => `<div class="prow arow"><span><b>${esc(x.name)}</b><br><span class="muted" style="font-size:.85rem">Atualizado em ${esc(fmtDate(x.updatedAt || x.createdAt))}</span></span><span class="row" style="gap:6px;justify-content:flex-end"><button class="btn small" data-et="${x.id}">Editar</button><button class="btn small" data-dt="${x.id}">Duplicar</button><button class="btn small ghost danger" data-xt="${x.id}">Excluir</button></span></div>`).join('')}</div></section>`).join('')}
      <section class="panel stack"><h2>Assinatura eletrônica</h2><p style="margin:0"><span class="st warn">Integração pendente</span></p><p class="muted" style="margin:0;font-size:.9rem">O envio de link individual com verificação de identidade depende de um provedor de assinatura eletrônica (por exemplo ZapSign, Clicksign, D4Sign ou o Assinador gov.br), que ainda não está configurado. Enquanto isso, o app congela a versão do documento com um código de verificação (SHA-256), gera o PDF para assinar e registra a assinatura feita no provedor anexando o PDF assinado.</p></section>`;
    $$('[data-nt]').forEach(b => b.onclick = async () => { const on = b.dataset.nk === 'online', ct = b.dataset.nt === 'contrato'; const t2 = { id: PC.uid(), type: b.dataset.nt, kind: on ? 'online' : 'personal', name: (ct ? 'Meu modelo de contrato' : 'Minhas diretrizes') + (on ? ' (online)' : ''), data: ct ? (on ? PC.contractTemplateOnline() : PC.contractTemplate()) : (on ? PC.guidelinesTemplateOnline() : PC.guidelinesTemplate()), createdAt: todayISO() }; await Store.put('pcTemplates', t2); go('pcModelo', { id: t2.id }); });
    $$('[data-et]').forEach(b => b.onclick = () => go('pcModelo', { id: b.dataset.et }));
    $$('[data-dt]').forEach(b => b.onclick = async () => { const o = await Store.get('pcTemplates', b.dataset.dt); await Store.put('pcTemplates', { ...JSON.parse(JSON.stringify(o)), id: PC.uid(), name: o.name + ' (cópia)', createdAt: todayISO(), updatedAt: todayISO() }); toast('Modelo duplicado'); go('contratos'); });
    $$('[data-xt]').forEach(b => b.onclick = async () => { if (await confirmBox('Excluir modelo?', 'Contratos já criados com ele não mudam.')) { await Store.del('pcTemplates', b.dataset.xt); go('contratos'); } });
  } else {
    body.innerHTML = `<section class="panel stack"><h2>Importar</h2><p class="muted" style="margin:0">Arquivo de contratos do TEAMRM (.json): clientes, contratos, calendários e diretrizes. Clientes com o mesmo nome são atualizados; contratos com o mesmo código são substituídos.</p>
        <div class="row"><label class="btn primary" style="cursor:pointer">Escolher arquivo (.json)<input type="file" id="pc-imp" accept=".json,application/json" hidden></label></div></section>
      <section class="panel stack"><h2>Exportar</h2><p class="muted" style="margin:0">Cópia de segurança só dos Contratos Personal (os documentos anexados vão junto). O backup geral em Ajustes também inclui esta aba.</p>
        <div class="row"><button class="btn" id="pc-exp">Baixar arquivo de contratos</button></div></section>`;
    $('#pc-exp').onclick = async () => { const d = await pcExportData(); downloadBlob(new Blob([JSON.stringify(d)], { type: 'application/json' }), `teamrm-contratos-${pcToday()}.json`); toast('Arquivo exportado'); };
    $('#pc-imp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(await f.text()); if (d.app !== 'teamrm-contratos') throw new Error('o arquivo não é de contratos do TEAMRM');
        if (!(await confirmBox('Importar contratos?', `${d.clients.length} clientes e ${d.contracts.length} contratos serão adicionados ou atualizados neste aparelho.`, 'Importar'))) return;
        const n = await pcImportData(d); toast(`${n} contratos importados`); go('contratos', { tab: 'personal' });
      } catch (err) { toast('Não foi possível importar: ' + err.message, 4500); }
    };
  }
};
async function pcExportData() {
  const contracts = await pcAll('pcContracts'), clients = await pcAll('pcClients'), media = [];
  for (const id of [...contracts.flatMap(k => (k.docs || []).map(x => x.mediaId)), ...clients.flatMap(c => (c.docs || []).map(x => x.mediaId)), ...contracts.map(k => k.signing?.signedFile?.mediaId)].filter(Boolean)) {
    const m = await Store.get('media', id); if (m?.blob) media.push({ id, name: m.name, type: m.type, data: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(m.blob); }) });
  }
  return { app: 'teamrm-contratos', version: 1, exportedAt: todayISO(), clients, contracts, templates: await pcAll('pcTemplates'), media };
}
async function pcImportData(d) {
  const byName = new Map((await pcAll('pcClients')).map(c => [AL.norm(c.name).trim(), c])), idMap = {};
  for (const c of d.clients || []) { const old = byName.get(AL.norm(c.name).trim()); const id = old?.id || c.id || PC.uid(); idMap[c.id] = id; await Store.put('pcClients', { ...(old || {}), ...c, id, docs: [...(old?.docs || []), ...(c.docs || [])] }); }
  for (const k of d.contracts || []) await Store.put('pcContracts', { ...k, clientId: idMap[k.clientId] || k.clientId, updatedAt: todayISO() });
  for (const t of d.templates || []) await Store.put('pcTemplates', t);
  for (const m of d.media || []) { const blob = await (await fetch(m.data)).blob(); await Store.put('media', { id: m.id, kind: 'file', blob, name: m.name, type: m.type, createdAt: todayISO() }); }
  return (d.contracts || []).length;
}
async function pcNewContract(clientId, kind) {
  const all = await pcClients(), pre = all.find(c => c.id === clientId); kind = pre ? pcCat(pre) : kind === 'online' ? 'online' : 'personal';
  const on = kind === 'online', clients = all.filter(c => pcCat(c) === kind);
  const plans = on ? await pcOnlinePlans() : await pcPlans(), ct = await pcTemplates('contrato', kind), gt = await pcTemplates('diretrizes', kind), y = new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
  if (!clients.length) { toast(`Cadastre primeiro o aluno em “${PC_CATS[kind]}”`); return go('pcCliente', { id: null, category: kind }); }
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true" style="max-width:480px"><h2>Novo contrato · ${on ? 'serviço online' : 'personal trainer'}</h2>
    <label class="f">Aluno<select id="nk-c">${clients.map(c => `<option value="${c.id}"${c.id === clientId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    ${on ? `<label class="f">Serviço e plano<select id="nk-p"><option value="">Sem plano (preencher à mão)</option>${plans.map((p, i) => `<option value="${i}">${esc(p.service)} — ${esc(p.plan)} · ${esc(PC.money(p.amount))}</option>`).join('')}</select></label>
    <label class="f">Início do contrato<input id="nk-s" type="date" value="${pcToday()}"></label>`
    : `<label class="f">Plano<select id="nk-p"><option value="">Sem plano (preencher à mão)</option>${plans.map((p, i) => `<option value="${i}">${esc(p.name)} — ${p.perWeek}x/semana · ${esc(p.durTxt)} · ${esc(PC.money(p.monthly))}/mês</option>`).join('')}</select></label>
    <p class="muted" id="nk-pi" style="margin:0;font-size:.85rem"></p>
    <label class="f">Ano do calendário<input id="nk-y" type="number" min="2020" max="2100" value="${y}"></label>`}
    <label class="f">Modelo de contrato<select id="nk-t"><option value="">Modelo padrão do app</option>${ct.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
    <label class="f">Modelo de diretrizes<select id="nk-g"><option value="">Modelo padrão do app</option>${gt.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
    ${on ? '' : '<label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="nk-h" checked> Incluir feriados nacionais e de Pouso Alegre/MG do ano</label>'}
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Criar</button></div></form>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  if (!on) $('#nk-p', m).onchange = e => { const p = plans[e.target.value]; $('#nk-pi', m).textContent = p ? `Dias sugeridos: ${p.days.map(d => `${PC.DOW[d[0]]} (${d[1]} min)`).join(', ')}. Você pode mudar os dias e horários no calendário.` : ''; };
  else { // aluno vinculado em Alunos online: sugere o serviço que ele já tem
    const sug = async () => { const cl = clients.find(c => c.id === $('#nk-c', m).value), st = cl?.studentId ? await Store.get('students', cl.studentId) : null; if (!st) return; const i = plans.findIndex(p => p.service === st.service && p.plan === st.plan); if (i >= 0) $('#nk-p', m).value = String(i); if (st.start) $('#nk-s', m).value = st.start; };
    $('#nk-c', m).onchange = sug; sug();
  }
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const t = ct.find(x => x.id === $('#nk-t', m).value), g = gt.find(x => x.id === $('#nk-g', m).value);
    const start = on ? ($('#nk-s', m).value || pcToday()) : '', year = on ? +start.slice(0, 4) : (+$('#nk-y', m).value || y);
    const k = PC.blankContract($('#nk-c', m).value, year, t?.data, g?.data, kind); k.createdAt = todayISO();
    if (!on && $('#nk-h', m).checked) k.schedule.offs = PC.holidays(year);
    const cl = clients.find(c => c.id === k.clientId), P = await pcProfessional();
    pcPrefill(k, cl, P);
    const plan = plans[$('#nk-p', m).value];
    if (on) { k.online.start = start; k.online.end = ''; const st = cl?.studentId ? await Store.get('students', cl.studentId) : null; if (plan) pcApplyOnline(k, plan, st); else pcSyncOnline(k); }
    else if (plan) pcApplyPlan(k, plan);
    m.remove(); PCX.draft = k; PCX.mode = 'fill'; PCX.ktab = 'contrato'; pcSetDirty(true); go('pcContrato', { id: k.id, isNew: true });
  };
}
// serviços online: tabela de valores de Alunos online (sem os planos presenciais)
async function pcOnlinePlans() {
  const cat = typeof alCatalog === 'function' ? await alCatalog() : (AL.DEFAULT_CATALOG || []);
  return cat.filter(x => x.group !== 'Personal trainer presencial').map(x => ({ ...x, amount: Number(x.amount) || 0 }));
}
function pcAddMonths(isoD, n) { if (!isoD || !n) return ''; const d = new Date(isoD + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + Number(n)); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
function pcApplyOnline(k, p, st) {
  const O = k.online; Object.assign(O, { service: p.service, plan: p.plan, months: p.months, amount: p.amount, paymentType: p.paymentType || '' });
  if (st?.paymentMethod) O.paymentMethod = st.paymentMethod; if (st?.paymentType) O.paymentType = st.paymentType;
  O.end = st?.end && st.start === O.start ? st.end : pcAddMonths(O.start, p.months);
  k.plan = `${p.service} — ${p.plan}`; k.title = `${p.service} · ${p.plan} ${(O.start || '').slice(0, 4)}`.trim();
  pcSyncOnline(k);
}
// leva a vigência para os campos do contrato (só os que têm valor)
function pcSyncOnline(k) {
  const O = k.online || {}, set = (label, v) => { for (const s of k.sections) for (const i of s.items) if (i.type === 'field' && i.label === label) i.value = v || ''; };
  set('Serviço contratado', O.service); set('Plano', O.plan ? `${O.plan}${O.months ? ` (${O.months} ${O.months > 1 ? 'meses' : 'mês'})` : ''}` : '');
  set('Início do contrato', PC.br(O.start)); set('Término do contrato', PC.br(O.end));
  set('Valor do plano', O.amount != null && O.amount !== '' ? PC.money(O.amount) + (O.months > 1 ? ` (${O.months} meses)` : '') : '');
  set('Forma de pagamento', [O.paymentType, O.paymentMethod].filter(Boolean).join(' · ')); set('Vencimento', O.due);
}
// tipo de cada aluno: personal presencial ou serviço online (o mesmo critério de Alunos online)
const pcStudentCat = st => (typeof AL !== 'undefined' && AL.isPersonal(st) ? 'personal' : 'online');
function pcClientCat(c, stById) { const st = c.studentId && stById.get(c.studentId); if (st) return pcStudentCat(st); if (c.service) return /personal/i.test(c.service) ? 'personal' : 'online'; return pcCat(c); }
// especificidades na lista: personal = dias, duração e valor mensal do contrato; online = plano, término e valor
function pcSpecs(c, ks, st) {
  const cur = [...ks].filter(k => k.status !== 'cancelado').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0], bits = [];
  if (pcCat(c) === 'personal') {
    if (cur?.schedule) { const R = PC.ruleAt(cur.schedule, cur.schedule.start), days = (R.days || []).slice().sort((a, b) => a.dow - b.dow); if (days.length) bits.push(days.map(d => PC.DOW[d.dow].slice(0, 3)).join(', '), [...new Set(days.map(d => d.dur + ' min'))].join(' / ')); if (cur.schedule.fixedMonthly) bits.push(PC.money(PC.yearSummary(cur.schedule).fixed) + '/mês'); }
  } else {
    const O = cur?.online || {}; const plan = O.plan || st?.plan, end = O.end || st?.end, amt = O.amount ?? st?.amount;
    if (plan) bits.push(plan); if (end) bits.push('até ' + PC.br(end)); if (amt != null && amt !== '' && PC.num(amt) != null) bits.push(PC.money(PC.num(amt)));
  }
  return bits.length ? `<br><span style="font-size:.84rem">${esc(bits.join(' · '))}</span>` : '';
}
async function pcFromStudents(list, cat = 'online') {
  if (!(await confirmBox('Trazer alunos?', `${list.length} aluno${list.length > 1 ? 's' : ''} de “Alunos online” ser${list.length > 1 ? 'ão' : 'á'} cadastrado${list.length > 1 ? 's' : ''} em “${PC_CATS[cat]}”, com nome, telefone e serviço. Nada é apagado.`, 'Trazer'))) return;
  for (const st of list) await Store.put('pcClients', { id: PC.uid(), category: cat, name: st.name, cpf: '', phone: st.phone || '', email: '', address: '', notes: '', studentId: st.id, service: st.service || '', docs: [], createdAt: todayISO() });
  toast(`${list.length} aluno${list.length > 1 ? 's' : ''} cadastrado${list.length > 1 ? 's' : ''}`); go('contratos', { tab: cat });
}
// planos de personal (tabela de valores de Alunos online)
async function pcPlans() {
  const cat = typeof alCatalog === 'function' ? await alCatalog() : [];
  return (AL.PERSONAL_PLANS || []).map(p => { const c = cat.find(x => x.service === p.name); return { ...p, monthly: Number(c?.amount ?? p.monthly) }; });
}
function pcApplyPlan(k, plan) {
  const S = k.schedule, money = PC.money;
  S.rules[0].days = plan.days.map(([dow, dur, price]) => ({ dow, time: '', dur, price }));
  S.fixedMonthly = true; k.plan = plan.name;
  const Y = PC.yearSummary(S); S.fixedOverride = Math.abs(Y.fixedCalc - plan.monthly) > 0.009 ? plan.monthly : null;   // o preço do plano vale; se o calendário do ano der diferente, fica como ajuste manual visível
  k.title = `${plan.name} ${S.year}`;
  const set = (label, v) => { for (const s of k.sections) for (const i of s.items) if (i.type === 'field' && i.label === label) i.value = v; };
  const prices = [...new Set(plan.days.map(d => d[2]))];
  set('Serviço contratado', `${plan.name} — personal trainer presencial`); set('Frequência das aulas', `${plan.perWeek} vezes por semana`); set('Duração da aula', plan.durTxt);
  set('Dias da semana e horários', plan.days.map(d => PC.DOW[d[0]]).join(', ') + ' (horários a combinar)');
  set('Valor por aula', prices.length > 1 ? plan.days.map(d => `${money(d[2])} (${PC.DOW[d[0]].toLowerCase()}, ${d[1]} min)`).join(' · ') : money(prices[0]));
  set('Quantidade de aulas', `${Y.lessons} aulas no ano (feriados em dia de aula descontados)`);
  set('Valor do plano', `${money(plan.monthly)} por mês (mensalidade fixa)`);
  set('Início do contrato', PC.br(S.start)); set('Término do contrato', PC.br(S.end));
}
// preenche só o que já é conhecido (nome do aluno, profissional); o resto fica em branco
function pcPrefill(k, cl, P) {
  const set = (label, v) => { if (!v) return; for (const s of k.sections) for (const i of s.items) if (i.type === 'field' && i.label === label && !i.value) i.value = v; };
  set('Nome completo', cl?.name); set('Telefone', cl?.phone);
  set('Nome', P?.name); set('Registro profissional', P?.reg);
}

// uma vez por aparelho: tira CPF, e-mail e endereço dos contratos em rascunho e dos modelos salvos
// (versões congeladas e assinadas não mudam)
async function pcMigrateFields() {
  const S = await getSettings(); if (S.pcFieldsV4) return;
  for (const k of await Store.all('pcContracts')) if ((k.status || 'rascunho') === 'rascunho' && PC.stripFields(k.sections)) await Store.put('pcContracts', k);
  for (const t of await Store.all('pcTemplates')) if (t.type === 'contrato' && PC.stripFields(t.data)) await Store.put('pcTemplates', t);
  S.pcFieldsV4 = true; await Store.put('settings', S);
}

/* ================= cliente ================= */
SCREENS.pcCliente = async ({ id, category }) => {
  const old = id ? await Store.get('pcClients', id) : null;
  const c = old ? JSON.parse(JSON.stringify(old)) : { id: PC.uid(), category: category === 'online' ? 'online' : 'personal', name: '', cpf: '', phone: '', email: '', address: '', notes: '', studentId: '', docs: [], createdAt: todayISO() };
  c.category = pcCat(c);
  PCX.draftClient = c;
  const ks = id ? (await pcAll('pcContracts')).filter(k => k.clientId === id).sort((a, b) => (PC.yearOf(b) || 0) - (PC.yearOf(a) || 0) || b.version - a.version) : [];
  const students = typeof AL !== 'undefined' ? (await Store.all('students')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : [];
  const t = pcToday(), F = (k, l, type = 'text', ph = '') => `<label class="f"${['name', 'address'].includes(k) ? ' style="grid-column:1/-1"' : ''}>${l}<input id="cf-${k}" type="${type}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}"></label>`;
  app.innerHTML = `${back(PC_CATS[c.category])}<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(PC_CATS[c.category])}</span><h1>${old ? esc(c.name) : 'Novo aluno'}</h1></div>${old ? '<button class="btn danger" id="cf-del">Excluir cliente</button>' : ''}</div>
    <section class="panel stack"><h2>Dados do aluno</h2><div class="grid-form">
      <label class="f" style="grid-column:1/-1">Tipo de aluno<select id="cf-category">${Object.entries(PC_CATS).map(([v, l]) => `<option value="${v}"${v === c.category ? ' selected' : ''}>${l}</option>`).join('')}</select></label>${F('name', 'Nome completo *')}${F('phone', 'Telefone', 'tel')}
      <label class="f">Aluno vinculado (Alunos online)<select id="cf-studentId"><option value="">Nenhum</option>${students.map(s => `<option value="${s.id}"${s.id === c.studentId ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="f" style="grid-column:1/-1">Observações<textarea id="cf-notes" rows="2">${esc(c.notes || '')}</textarea></label></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="cf-save">Salvar</button></div></section>
    ${old ? `<section class="panel stack"><div class="row spread"><h2>Contratos</h2><button class="btn small primary" id="cf-newk">+ Novo contrato</button></div>
      ${ks.length ? `<div class="plist">${ks.map(k => { const s = PC.statusOf(k, t); return `<button class="prow" data-k="${k.id}" style="grid-template-columns:1fr auto"><span><b>${esc(k.title)}</b> <span class="muted">· v${k.version}</span><br><span class="muted" style="font-size:.85rem">${esc(PC.br(PC.periodOf(k).start))} a ${esc(PC.br(PC.periodOf(k).end) || 'sem término')}</span></span><span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span></button>`; }).join('')}</div>` : '<p class="muted" style="margin:0">Nenhum contrato.</p>'}</section>
    <section class="panel stack"><div class="row spread"><h2>Documentos do aluno</h2><label class="btn small" style="cursor:pointer">+ Anexar<input type="file" id="cf-up" accept="application/pdf,image/*" hidden multiple></label></div>${pcDocsList(c.docs)}</section>` : ''}`;
  bindBack('contratos', { tab: c.category });
  const inputs = $$('#cf-category,#cf-name,#cf-phone,#cf-notes,#cf-studentId'); inputs.forEach(i => i.oninput = i.onchange = () => pcSetDirty(true));
  $('#cf-save').onclick = async () => {
    for (const k of ['category', 'name', 'phone', 'notes', 'studentId']) c[k] = $('#cf-' + k).value.trim();
    delete c.cpf; delete c.email; delete c.address;   // campos retirados do cadastro
    if (old && pcCat(old) !== c.category && ks.some(k => pcKind(k) !== c.category)) toast('Os contratos já criados continuam do tipo original; os novos seguem o novo tipo.', 4500);
    if (!c.name) { toast('Informe o nome do aluno'); return $('#cf-name').focus(); }
    c.updatedAt = todayISO(); await Store.put('pcClients', c); pcSetDirty(false); PCX.draftClient = null; toast('Cliente salvo'); go('pcCliente', { id: c.id });
  };
  if (old) {
    $('#cf-newk').onclick = () => pcNewContract(c.id);
    $$('[data-k]').forEach(b => b.onclick = () => go('pcContrato', { id: b.dataset.k }));
    $('#cf-del').onclick = async () => { if (!(await confirmBox('Excluir cliente?', `${c.name}, os ${ks.length} contratos e os documentos anexados serão apagados deste aparelho.`))) return; for (const k of ks) await pcDeleteContract(k); for (const d of c.docs || []) await Store.del('media', d.mediaId); await Store.del('pcClients', c.id); PCX.dirty = false; toast('Aluno excluído'); go('contratos', { tab: c.category }); };
    pcBindDocs(c.docs, async docs => { const cur = await Store.get('pcClients', c.id); cur.docs = docs; await Store.put('pcClients', cur); go('pcCliente', { id: c.id }); }, '#cf-up');
  }
};
function pcDocsList(docs) { return docs?.length ? `<div class="plist">${docs.map(d => `<div class="prow arow"><span style="min-width:0"><b>${esc(d.name)}</b><br><span class="muted" style="font-size:.84rem">${esc(d.label || 'Documento')} · ${nf((d.size || 0) / 1024, 0)} KB · ${esc(fmtDate(d.at))}</span></span><span class="row" style="gap:6px;justify-content:flex-end"><button class="btn small" data-dl="${d.mediaId}">Baixar</button><button class="btn small ghost danger" data-rmd="${d.mediaId}">Excluir</button></span></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nenhum documento anexado.</p>'; }
function pcBindDocs(docs, persist, upSel) {
  const up = $(upSel); if (up) up.onchange = async () => { const L = [...(docs || [])]; for (const f of up.files) { const id = 'pcdoc:' + PC.uid(); await Store.put('media', { id, kind: 'file', blob: f, name: f.name, type: f.type, createdAt: todayISO() }); L.push({ mediaId: id, name: f.name, size: f.size, type: f.type, at: todayISO(), label: 'Anexo' }); } await persist(L); toast('Documento anexado'); };
  $$('[data-dl]').forEach(b => b.onclick = async () => { const m = await Store.get('media', b.dataset.dl); if (m?.blob) downloadBlob(m.blob, m.name); else toast('Arquivo não encontrado neste aparelho'); });
  $$('[data-rmd]').forEach(b => b.onclick = async () => { if (!(await confirmBox('Excluir documento?', 'O arquivo será apagado deste aparelho.'))) return; await Store.del('media', b.dataset.rmd); await persist((docs || []).filter(d => d.mediaId !== b.dataset.rmd)); });
}
async function pcDeleteContract(k) { for (const d of k.docs || []) await Store.del('media', d.mediaId); if (k.signing?.signedFile?.mediaId) await Store.del('media', k.signing.signedFile.mediaId); await Store.del('pcContracts', k.id); }

/* ================= contrato ================= */
SCREENS.pcContrato = async ({ id, tab, isNew }) => {
  if (tab) PCX.ktab = tab; PCX.ktab ||= 'contrato';
  if (!PCX.draft || PCX.draft.id !== id) { const k = await Store.get('pcContracts', id); if (!k) return go('contratos'); PCX.draft = JSON.parse(JSON.stringify(k)); pcSetDirty(false); }
  const k = PCX.draft, cl = await Store.get('pcClients', k.clientId), st = PC.statusOf(k, pcToday()), locked = pcLocked(k);
  const on = pcKind(k) === 'online', TABS = [['contrato', 'Contrato'], on ? ['vigencia', 'Vigência e valores'] : ['calendario', 'Calendário'], ['diretrizes', 'Diretrizes'], ['documentos', 'Documentos'], ['assinatura', 'Assinatura']];
  if (on && PCX.ktab === 'calendario') PCX.ktab = 'vigencia'; if (!on && PCX.ktab === 'vigencia') PCX.ktab = 'calendario';
  app.innerHTML = `${back(cl?.name || 'Contratos')}
    <div class="row spread" style="align-items:flex-start"><div class="stack" style="gap:4px;min-width:0;flex:1"><span class="eyebrow">${on ? 'Serviço online' : 'Personal trainer'} · ${esc(cl?.name || '')} · versão ${k.version}${k.parentId ? ' (aditivo)' : ''}</span>
      <input class="pctitle" id="k-title" value="${esc(k.title)}" aria-label="Título do contrato" ${locked ? 'disabled' : ''}><span class="row" style="gap:6px"><span class="st ${pcStTone(st)}">${esc(PC.STATUS[st])}</span>${PCX.dirty ? '<span class="st warn">Alterações não salvas</span>' : ''}</span></div></div>
    <div class="pcbar"><button class="btn primary" id="pc-save" ${PCX.dirty ? '' : 'disabled'}>${PCX.dirty ? 'Salvar' : 'Salvo'}</button><button class="btn" id="k-view">Visualizar</button><button class="btn" id="k-pdf">Exportar PDF</button>
      ${k.status === 'rascunho' ? '<button class="btn" id="k-send">Enviar para assinatura</button>' : ''}<button class="btn" id="k-dup">Duplicar</button>${k.status === 'assinado' || st === 'vencido' ? '<button class="btn" id="k-ver">Nova versão / aditivo</button>' : ''}
      ${k.status !== 'cancelado' && k.status !== 'rascunho' ? '<button class="btn ghost" id="k-cancel">Cancelar contrato</button>' : ''}<button class="btn ghost danger" id="k-del">Excluir</button></div>
    ${locked ? `<div class="banner">${k.status === 'aguardando' ? 'Versão congelada para assinatura: o conteúdo não pode ser alterado. Para corrigir, volte para rascunho na aba Assinatura.' : k.status === 'cancelado' ? 'Contrato cancelado: somente leitura.' : 'Documento assinado: o conteúdo original fica preservado. Para mudar algo, crie uma nova versão ou aditivo.'}</div>` : ''}
    <div class="tabs" role="tablist">${TABS.map(([t, l]) => `<button role="tab" data-kt="${t}" aria-selected="${PCX.ktab === t}">${l}</button>`).join('')}</div><div id="k-body" class="stack"></div>`;
  bindBack(cl ? 'pcCliente' : 'contratos', cl ? { id: cl.id } : {});
  $$('[data-kt]').forEach(b => b.onclick = () => { PCX.ktab = b.dataset.kt; go('pcContrato', { id }); });
  $('#k-title').oninput = e => { k.title = e.target.value; pcSetDirty(); };
  $('#pc-save').onclick = () => pcSave();
  $('#k-view').onclick = () => pcPreview(k, cl);
  $('#k-pdf').onclick = () => pcPdfMenu(k, cl);
  const sd = $('#k-send'); if (sd) sd.onclick = () => { PCX.ktab = 'assinatura'; go('pcContrato', { id }); };
  $('#k-dup').onclick = async () => { if (PCX.dirty && !(await confirmBox('Duplicar sem salvar?', 'A cópia é feita a partir da versão salva.', 'Duplicar'))) return; const o = await Store.get('pcContracts', id) || k; const n = { ...JSON.parse(JSON.stringify(o)), id: PC.uid(), title: o.title + ' (cópia)', version: 1, parentId: null, status: 'rascunho', signing: null, docs: [], history: [], createdAt: todayISO() }; await Store.put('pcContracts', n); PCX.dirty = false; PCX.draft = null; toast('Contrato duplicado'); go('pcContrato', { id: n.id }); };
  const vr = $('#k-ver'); if (vr) vr.onclick = async () => { const o = await Store.get('pcContracts', id); const n = { ...JSON.parse(JSON.stringify(o)), id: PC.uid(), version: o.version + 1, parentId: o.id, status: 'rascunho', signing: null, docs: [], history: [...(o.history || []), { at: todayISO(), event: `Criada a partir da versão ${o.version} (assinada)` }], createdAt: todayISO() }; n.title = o.title.replace(/ — aditivo.*$/, '') + ` — aditivo ${o.version + 1}`; await Store.put('pcContracts', n); PCX.dirty = false; PCX.draft = null; toast(`Versão ${n.version} criada; a versão ${o.version} assinada continua guardada`); go('pcContrato', { id: n.id }); };
  const cn = $('#k-cancel'); if (cn) cn.onclick = async () => { if (!(await confirmBox('Cancelar contrato?', 'O contrato fica marcado como cancelado e somente leitura. Os documentos continuam guardados.', 'Cancelar contrato'))) return; const o = await Store.get('pcContracts', id); o.status = 'cancelado'; (o.history ||= []).push({ at: todayISO(), event: 'Contrato cancelado' }); await Store.put('pcContracts', o); PCX.draft = null; PCX.dirty = false; go('pcContrato', { id }); };
  $('#k-del').onclick = async () => { if (!(await confirmBox('Excluir contrato?', `“${k.title}” (versão ${k.version}), o calendário, as diretrizes e os documentos anexados serão apagados deste aparelho.${k.status === 'assinado' ? ' Atenção: é um documento assinado.' : ''}`))) return; await pcDeleteContract(k); PCX.dirty = false; PCX.draft = null; toast('Contrato excluído'); go(cl ? 'pcCliente' : 'contratos', cl ? { id: cl.id } : {}); };
  const body = $('#k-body');
  ({ contrato: pcTabContrato, calendario: pcTabCalendario, vigencia: pcTabVigencia, diretrizes: pcTabDiretrizes, documentos: pcTabDocs, assinatura: pcTabAssinatura })[PCX.ktab](body, k, cl, locked);
};
async function pcSave() {
  const k = PCX.draft; if (!k) return;
  if (pcLocked(k)) { const o = await Store.get('pcContracts', k.id); if (o && PC.canonical(o) !== PC.canonical(k)) return toast('Versão congelada: crie uma nova versão para alterar'); }
  k.updatedAt = todayISO(); k.createdAt ||= todayISO(); await Store.put('pcContracts', JSON.parse(JSON.stringify(k)));
  pcSetDirty(false); toast('Contrato salvo'); go('pcContrato', { id: k.id });
}
const pcRerender = () => (String(PCX.draft?.id || '').startsWith('tpl:') ? window.__pcTplRender?.() : go('pcContrato', { id: PCX.draft.id }));

/* ---------- aba Vigência (serviços online) ---------- */
async function pcTabVigencia(body, k, cl, locked) {
  const O = k.online ||= { start: '', end: '', months: 1, plan: '', amount: null, paymentType: '', paymentMethod: '', due: '' }, dis = locked ? 'disabled' : '';
  const plans = await pcOnlinePlans(), opts = typeof alList === 'function' ? { types: await alList('payTypes'), methods: await alList('payMethods') } : { types: [], methods: [] };
  const sel = (id, list, v) => `<select id="${id}" ${dis}><option value="">—</option>${[...new Set([...list, v].filter(Boolean))].map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  const st = cl?.studentId ? await Store.get('students', cl.studentId) : null;
  body.innerHTML = `<section class="panel stack"><h2>Serviço e vigência</h2>
      <label class="f">Aplicar um plano da tabela<select id="vg-p" ${dis}><option value="">Escolher…</option>${plans.map((p, i) => `<option value="${i}">${esc(p.service)} — ${esc(p.plan)} · ${esc(PC.money(p.amount))}</option>`).join('')}</select></label>
      <div class="grid-form"><label class="f" style="grid-column:1/-1">Serviço<input id="vg-service" value="${esc(O.service || '')}" ${dis}></label>
        <label class="f">Plano<input id="vg-plan" value="${esc(O.plan || '')}" ${dis}></label><label class="f">Duração (meses)<input id="vg-months" type="number" min="1" max="60" value="${esc(O.months || '')}" ${dis}></label>
        <label class="f">Início<input id="vg-start" type="date" value="${esc(O.start || '')}" ${dis}></label><label class="f">Término<input id="vg-end" type="date" value="${esc(O.end || '')}" ${dis}></label></div>
      ${locked ? '' : '<div class="row"><button class="btn small" id="vg-calc">Calcular término pela duração</button></div>'}</section>
    <section class="panel stack"><h2>Valores e pagamento</h2><div class="grid-form">
        <label class="f">Valor do plano (R$)<input id="vg-amount" type="number" step="0.01" min="0" value="${O.amount ?? ''}" ${dis}></label><label class="f">Vencimento<input id="vg-due" value="${esc(O.due || '')}" placeholder="ex.: todo dia 10" ${dis}></label>
        <label class="f">Tipo de pagamento${sel('vg-paymentType', opts.types, O.paymentType)}</label><label class="f">Forma de pagamento${sel('vg-paymentMethod', opts.methods, O.paymentMethod)}</label></div>
      <p class="muted" style="margin:0;font-size:.85rem">Estes dados vão automaticamente para os campos do contrato (Serviço, Plano, Início, Término, Valor, Forma de pagamento e Vencimento). Salve para guardar.</p></section>
    ${st ? `<section class="panel stack"><h2>Em “Alunos online”</h2><p style="margin:0;font-size:.92rem">${esc(st.service || '—')} · ${esc(st.plan || '—')} · ${esc(PC.br(st.start) || '—')} a ${esc(PC.br(st.end) || '—')}${st.amount ? ' · ' + esc(PC.money(st.amount)) : ''}</p>${locked ? '' : '<div class="row"><button class="btn small" id="vg-al">Usar estes dados</button></div>'}</section>` : ''}`;
  const keys = ['service', 'plan', 'months', 'start', 'end', 'amount', 'due', 'paymentType', 'paymentMethod'];
  const read = () => { for (const f of keys) { const v = $('#vg-' + f).value.trim(); O[f] = f === 'months' ? (v ? +v : '') : f === 'amount' ? (v === '' ? null : +v) : v; } };
  keys.forEach(f => { const el = $('#vg-' + f); el.oninput = el.onchange = () => { read(); pcSyncOnline(k); pcSetDirty(); }; });
  $('#vg-p').onchange = e => { const p = plans[e.target.value]; if (!p) return; read(); pcApplyOnline(k, p, null); pcSetDirty(); pcRerender(); };
  const vc = $('#vg-calc'); if (vc) vc.onclick = () => { read(); if (!O.start || !O.months) return toast('Informe o início e a duração'); O.end = pcAddMonths(O.start, O.months); pcSyncOnline(k); pcSetDirty(); pcRerender(); };
  const va = $('#vg-al'); if (va) va.onclick = () => { Object.assign(O, { service: st.service || O.service, plan: st.plan || O.plan, start: st.start || O.start, end: st.end || O.end, amount: st.amount !== '' && st.amount != null ? Number(st.amount) : O.amount, paymentType: st.paymentType || O.paymentType, paymentMethod: st.paymentMethod || O.paymentMethod }); pcSyncOnline(k); pcSetDirty(); pcRerender(); };
}

/* ---------- aba Contrato: preencher / editar estrutura ---------- */
function pcTabContrato(body, k, cl, locked) {
  const edit = PCX.mode === 'edit' && !locked;
  body.innerHTML = `<div class="row spread"><div class="seg" role="group" aria-label="Modo"><button class="btn small${!edit ? ' primary' : ''}" id="m-fill">Preencher</button><button class="btn small${edit ? ' primary' : ''}" id="m-edit" ${locked ? 'disabled' : ''}>Editar</button></div>
      ${edit ? '<div class="row"><button class="btn small" id="add-sec">+ Adicionar seção</button><button class="btn small" id="save-tpl">Salvar como modelo</button></div>' : ''}</div>
    <p class="muted" style="margin:0;font-size:.86rem">${edit ? 'Modo Editar: mude nomes, inclua, exclua, duplique e reordene campos, cláusulas e seções.' : 'Modo Preencher: digite as informações. Campos em branco podem ficar em branco.'}</p>
    ${k.sections.map((s, si) => `<section class="panel stack pcsec"><div class="row spread">${edit ? `<input class="pcsec-t" data-st="${si}" value="${esc(s.title)}" aria-label="Título da seção">` : `<h2>${esc(s.title)}</h2>`}
        ${edit ? `<span class="row" style="gap:4px">${pcMoveBtns('sec', si, k.sections.length)}<button class="btn small" data-dsec="${si}">Duplicar</button><button class="btn small ghost danger" data-xsec="${si}">Excluir seção</button></span>` : ''}</div>
      ${s.items.map((it, ii) => it.type === 'field'
        ? `<div class="pcitem">${edit ? `<input class="pclabel" data-lab="${si}:${ii}" value="${esc(it.label)}" aria-label="Nome do campo">` : `<label class="f" style="flex:1" for="v-${si}-${ii}">${esc(it.label)}</label>`}<input class="pcval" id="v-${si}-${ii}" data-val="${si}:${ii}" value="${esc(it.value || '')}" ${locked ? 'disabled' : ''} placeholder="${edit ? 'valor' : ''}">${edit ? pcItemBtns(si, ii, s.items.length) : ''}</div>`
        : `<div class="pcitem pcclause">${edit ? `<input class="pclabel" data-lab="${si}:${ii}" value="${esc(it.label)}" aria-label="Título da cláusula">` : `<b>${esc(it.label)}</b>`}<textarea class="pctext" data-txt="${si}:${ii}" rows="3" ${locked ? 'disabled' : ''} placeholder="Texto da cláusula">${esc(it.text || '')}</textarea>${edit ? pcItemBtns(si, ii, s.items.length) : ''}</div>`).join('')}
      ${edit ? `<div class="row"><button class="btn small" data-addf="${si}">+ Adicionar campo</button><button class="btn small" data-addc="${si}">+ Adicionar cláusula</button></div>` : ''}</section>`).join('')}`;
  $('#m-fill').onclick = () => { PCX.mode = 'fill'; pcRerender(); };
  const me = $('#m-edit'); if (me) me.onclick = () => { PCX.mode = 'edit'; pcRerender(); };
  const at = (v) => v.split(':').map(Number);
  $$('[data-val]').forEach(i => i.oninput = () => { const [a, b] = at(i.dataset.val); k.sections[a].items[b].value = i.value; pcSetDirty(); });
  $$('[data-txt]').forEach(i => i.oninput = () => { const [a, b] = at(i.dataset.txt); k.sections[a].items[b].text = i.value; pcSetDirty(); });
  $$('[data-lab]').forEach(i => i.oninput = () => { const [a, b] = at(i.dataset.lab); k.sections[a].items[b].label = i.value; pcSetDirty(); });
  $$('[data-st]').forEach(i => i.oninput = () => { k.sections[+i.dataset.st].title = i.value; pcSetDirty(); });
  const mut = fn => { fn(); pcSetDirty(); pcRerender(); };
  $$('[data-addf]').forEach(b => b.onclick = () => mut(() => k.sections[+b.dataset.addf].items.push({ id: PC.uid(), type: 'field', label: 'Novo campo', value: '', optional: true })));
  $$('[data-addc]').forEach(b => b.onclick = () => mut(() => k.sections[+b.dataset.addc].items.push({ id: PC.uid(), type: 'clause', label: 'Nova cláusula', text: '' })));
  const as = $('#add-sec'); if (as) as.onclick = () => mut(() => k.sections.push({ id: PC.uid(), title: 'Nova seção', items: [] }));
  $$('[data-xsec]').forEach(b => b.onclick = async () => { if (await confirmBox('Excluir seção?', `“${k.sections[+b.dataset.xsec].title}” e todos os seus itens saem do contrato (só depois de Salvar).`)) mut(() => k.sections.splice(+b.dataset.xsec, 1)); });
  $$('[data-dsec]').forEach(b => b.onclick = () => mut(() => { const s = JSON.parse(JSON.stringify(k.sections[+b.dataset.dsec])); s.id = PC.uid(); s.title += ' (cópia)'; s.items.forEach(i => i.id = PC.uid()); k.sections.splice(+b.dataset.dsec + 1, 0, s); }));
  $$('[data-mv]').forEach(b => b.onclick = () => mut(() => { const [kind, a, dir, bIdx] = b.dataset.mv.split(':'); const arr = kind === 'sec' ? k.sections : k.sections[+a].items, i = kind === 'sec' ? +a : +bIdx, j = i + (+dir); if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }));
  $$('[data-xit]').forEach(b => b.onclick = async () => { const [a, c] = at(b.dataset.xit); if (await confirmBox('Excluir item?', `“${k.sections[a].items[c].label}” sai do contrato (só depois de Salvar).`)) mut(() => k.sections[a].items.splice(c, 1)); });
  $$('[data-dit]').forEach(b => b.onclick = () => mut(() => { const [a, c] = at(b.dataset.dit); const it = { ...k.sections[a].items[c], id: PC.uid(), label: k.sections[a].items[c].label + ' (cópia)' }; k.sections[a].items.splice(c + 1, 0, it); }));
  const stp = $('#save-tpl'); if (stp) stp.onclick = () => pcSaveTemplate('contrato', k.sections);
}
const pcMoveBtns = (kind, i, n, j = '') => `<button class="btn small ghost" data-mv="${kind}:${i}:-1:${j}" ${(kind === 'sec' ? i : j) === 0 ? 'disabled' : ''} aria-label="Mover para cima">↑</button><button class="btn small ghost" data-mv="${kind}:${i}:1:${j}" ${(kind === 'sec' ? i : j) === n - 1 ? 'disabled' : ''} aria-label="Mover para baixo">↓</button>`;
const pcItemBtns = (si, ii, n) => `<span class="row pcbtns" style="gap:2px">${pcMoveBtns('it', si, n, ii)}<button class="btn small ghost" data-dit="${si}:${ii}" aria-label="Duplicar">⧉</button><button class="btn small ghost danger" data-xit="${si}:${ii}" aria-label="Excluir item">✕</button></span>`;
async function pcSaveTemplate(type, data) {
  const name = prompt(type === 'contrato' ? 'Nome do modelo de contrato:' : 'Nome do modelo de diretrizes:', type === 'contrato' ? 'Meu modelo de contrato' : 'Minhas diretrizes'); if (!name) return;
  const clean = JSON.parse(JSON.stringify(data)); if (type === 'contrato') clean.forEach(s => s.items.forEach(i => { if (i.type === 'field') i.value = ''; }));
  await Store.put('pcTemplates', { id: PC.uid(), type, name, data: clean, createdAt: todayISO(), updatedAt: todayISO() }); toast('Modelo salvo (os valores preenchidos não vão para o modelo)');
}

/* ---------- aba Calendário ---------- */
function pcTabCalendario(body, k, cl, locked) {
  const S = k.schedule, Y = PC.yearSummary(S), dis = locked ? 'disabled' : '', R = [...S.rules].sort((a, b) => a.from.localeCompare(b.from));
  const mo = PCX.cal.month, MS = Y.months[mo - 1];
  const dayRow = (r, ri) => [1, 2, 3, 4, 5, 6, 0].map(dw => { const d = r.days.find(x => x.dow === dw); return `<div class="pcday${d ? ' on' : ''}"><label class="row" style="gap:6px"><input type="checkbox" data-dw="${ri}:${dw}" ${d ? 'checked' : ''} ${dis}> <b>${PC.DOW[dw]}</b></label>
      ${d ? `<label class="f">Horário<input type="time" data-dt="${ri}:${dw}:time" value="${esc(d.time || '')}" ${dis}></label><label class="f">Duração (min)<input inputmode="numeric" data-dt="${ri}:${dw}:dur" value="${esc(d.dur ?? '')}" ${dis}></label><label class="f">Valor da aula (R$)<input inputmode="decimal" data-dt="${ri}:${dw}:price" value="${esc(d.price != null ? String(d.price).replace('.', ',') : '')}" ${dis}></label>` : ''}</div>`; }).join('');
  body.innerHTML = `<section class="panel stack"><h2>Dias e horários contratados</h2>
      <div class="grid-form"><label class="f">Ano<input type="number" id="cs-year" value="${S.year}" ${dis}></label><label class="f">Início<input type="date" id="cs-start" value="${esc(S.start || '')}" ${dis}></label><label class="f">Término<input type="date" id="cs-end" value="${esc(S.end || '')}" ${dis}></label></div>
      ${R.map((r, ri) => `<div class="stack" style="gap:8px">${R.length > 1 ? `<div class="row spread"><b>${ri === 0 ? 'Recorrência inicial' : 'A partir de ' + esc(PC.br(r.from))}</b>${ri > 0 && !locked ? `<button class="btn small ghost danger" data-xr="${r.id}">Excluir mudança</button>` : ''}</div>` : ''}<div class="pcdays">${dayRow(r, S.rules.indexOf(r))}</div></div>`).join('')}
      <p class="muted" style="margin:0;font-size:.86rem">As aulas são geradas a partir destes dias. Confira o mês e o ano abaixo antes de tocar em Salvar.</p></section>
    <section class="panel stack"><div class="row spread"><h2>Feriados, recessos, pausas e reposições</h2>${locked ? '' : `<span class="row"><button class="btn small" id="cs-hol">Inserir feriados de ${S.year}</button><button class="btn small" id="cs-addoff">+ Adicionar data</button></span>`}</div>
      ${S.offs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Desconta?</th><th></th></tr></thead><tbody>${[...S.offs].sort((a, b) => a.date.localeCompare(b.date)).map(o => { const i = S.offs.indexOf(o), lesson = PC.monthLessons(S, +o.date.slice(0, 4), +o.date.slice(5, 7)).some(x => x.date === o.date && x.planned); return `<tr><td><input type="date" data-of="${i}:date" value="${o.date}" ${dis}><span class="ref">${PC.DOW[PC.dowOf(o.date)]}${o.kind !== 'reposicao' ? (lesson ? ' · dia de aula' : ' · não é dia de aula') : ''}</span></td><td><input data-of="${i}:name" value="${esc(o.name)}" ${dis}></td><td><select data-of="${i}:kind" ${dis}>${Object.entries(PC.OFF_KIND).map(([kk, l]) => `<option value="${kk}"${o.kind === kk ? ' selected' : ''}>${l}</option>`).join('')}</select></td><td>${o.kind === 'reposicao' ? '<span class="muted">soma aula</span>' : `<input type="checkbox" data-of="${i}:discount" ${o.discount ? 'checked' : ''} ${dis} aria-label="Descontar">`}</td><td>${locked ? '' : `<button class="btn small ghost danger" data-xo="${i}" aria-label="Excluir data">✕</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Nenhuma data cadastrada.</p>'}</section>
    <section class="panel stack"><div class="row spread"><div class="seg"><button class="btn small${PCX.cal.view === 'mes' ? ' primary' : ''}" data-cv="mes">Mensal</button><button class="btn small${PCX.cal.view === 'ano' ? ' primary' : ''}" data-cv="ano">Anual</button></div>
      ${PCX.cal.view === 'mes' ? `<label class="f" style="min-width:160px">Mês<select id="cs-mo">${PC.MONTHS.map((n, i) => `<option value="${i + 1}"${i + 1 === mo ? ' selected' : ''}>${n} ${S.year}</option>`).join('')}</select></label>` : ''}</div>
      ${PCX.cal.view === 'mes' ? pcMonthGrid(S, mo, MS) : pcYearTable(S, Y, locked)}
    </section>`;
  const R0 = S.rules;
  const ch = fn => { fn(); pcSetDirty(); pcRerender(); }, chQuiet = fn => { fn(); pcSetDirty(); };
  $('#cs-year').onchange = e => ch(() => { const y = +e.target.value; if (y > 1999) { S.year = y; S.start = `${y}-01-01`; S.end = `${y}-12-31`; R0.forEach((r, i) => { if (i === 0) r.from = `${y}-01-01`; }); } });
  $('#cs-start').onchange = e => ch(() => S.start = e.target.value); $('#cs-end').onchange = e => ch(() => S.end = e.target.value);
  $$('[data-dw]').forEach(i => i.onchange = () => ch(() => { const [ri, dw] = i.dataset.dw.split(':').map(Number), r = R0[ri]; if (i.checked) { const p = r.days[0] || {}; r.days.push({ dow: dw, time: p.time || '', dur: p.dur ?? 50, price: p.price ?? '' }); } else r.days = r.days.filter(x => x.dow !== dw); }));
  $$('[data-dt]').forEach(i => i.onchange = () => ch(() => { const [ri, dw, f] = i.dataset.dt.split(':'), d = R0[+ri].days.find(x => x.dow === +dw); d[f] = f === 'time' ? i.value : PC.num(i.value); }));
  $$('[data-xr]').forEach(b => b.onclick = () => ch(() => S.rules = S.rules.filter(r => r.id !== b.dataset.xr)));
  const hol = $('#cs-hol'); if (hol) hol.onclick = () => ch(() => { const have = new Set(S.offs.map(o => o.date)); for (const h of PC.holidays(S.year)) if (!have.has(h.date)) S.offs.push(h); });
  const ao = $('#cs-addoff'); if (ao) ao.onclick = () => ch(() => S.offs.push({ id: PC.uid(), date: `${S.year}-${String(mo).padStart(2, '0')}-01`, name: 'Recesso', kind: 'recesso', discount: true }));
  $$('[data-of]').forEach(i => i.onchange = () => ch(() => { const [ix, f] = i.dataset.of.split(':'); S.offs[+ix][f] = f === 'discount' ? i.checked : i.value; if (f === 'kind' && i.value === 'reposicao') S.offs[+ix].discount = false; }));
  $$('[data-xo]').forEach(b => b.onclick = () => ch(() => S.offs.splice(+b.dataset.xo, 1)));
  $$('[data-cv]').forEach(b => b.onclick = () => { PCX.cal.view = b.dataset.cv; pcRerender(); });
  const sm = $('#cs-mo'); if (sm) sm.onchange = e => { PCX.cal.month = +e.target.value; pcRerender(); };
  $$('[data-day]').forEach(b => b.onclick = () => pcLessonDialog(k, b.dataset.day, locked));
  // anual: ajustes manuais
  $$('[data-mm]').forEach(i => i.onchange = () => ch(() => { const m = +i.dataset.mm, v = PC.num(i.value); if (v == null) delete S.monthly[m]; else S.monthly[m] = { value: v, manual: true }; }));
  $$('[data-mreset]').forEach(b => b.onclick = () => ch(() => delete S.monthly[+b.dataset.mreset]));
  const fx = $('#cs-fixed'); if (fx) fx.onchange = () => ch(() => S.fixedMonthly = fx.checked);
  const fo = $('#cs-fo'); if (fo) fo.onchange = () => ch(() => { const v = PC.num(fo.value); S.fixedOverride = v == null ? null : v; });
  const fr = $('#cs-fr'); if (fr) fr.onclick = () => ch(() => S.fixedOverride = null);
  void chQuiet;
}
function pcMonthGrid(S, mo, MS) {
  const y = S.year, first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), byDate = Object.fromEntries(MS.lessons.map(l => [l.date, l])), offBy = {};
  for (const o of S.offs) (offBy[o.date] ||= []).push(o);
  let cells = ''; for (let i = 0; i < first; i++) cells += '<span class="pccell empty"></span>';
  for (let d = 1; d <= PC.daysIn(y, mo); d++) {
    const date = PC.iso(y, mo, d), L = byDate[date], off = (offBy[date] || [])[0];
    const cls = L ? (L.discounted ? 'hol' : L.extra ? 'extra' : 'les') + (L.status !== 'prevista' ? ' st-' + L.status : '') : off ? 'holoff' : '';
    cells += `<button class="pccell ${cls}" data-day="${date}" aria-label="${PC.br(date)}${L ? ' — aula ' + (PC.LESSON_ST[L.status] || '') : ''}${off ? ' — ' + esc(off.name) : ''}"><b>${d}</b>${L ? `<small>${L.discounted ? 'sem aula' : esc(L.time || PC.LESSON_ST[L.status])}</small>` : off ? `<small>${esc(off.kind === 'reposicao' ? 'reposição' : 'feriado')}</small>` : ''}${L?.note ? '<i class="pcnote" aria-hidden="true">•</i>' : ''}</button>`;
  }
  const lst = MS.lessons.filter(l => !l.discounted);
  return `<div class="pccal"><div class="pchead">${PC.DOW_S.map(x => `<span>${x}</span>`).join('')}</div><div class="pcgrid">${cells}</div></div>
    <div class="pclegend"><span><i class="les"></i>Aula</span><span><i class="extra"></i>Reposição / extra</span><span><i class="hol"></i>Feriado com desconto</span><span><i class="holoff"></i>Feriado fora do dia de aula</span></div>
    <div class="kpis"><div class="kpi"><span>Aulas no mês</span><b class="num">${MS.effective}</b><small>${MS.planned} previstas · ${MS.discounted} descontadas${MS.extra ? ` · ${MS.extra} extra` : ''}</small></div>
      <div class="kpi${MS.manual ? ' hot' : ''}"><span>Valor do mês</span><b class="num">${esc(PC.money(MS.value))}</b><small>${MS.manual ? 'ajuste manual (calculado: ' + esc(PC.money(MS.calc)) + ')' : MS.prices.map(p => esc(PC.money(p))).join(' / ') + ' por aula'}</small></div>
      <div class="kpi"><span>Realizadas</span><b class="num">${lst.filter(l => l.status === 'realizada').length}</b><small>${lst.filter(l => l.status === 'falta').length} faltas · ${lst.filter(l => l.status === 'cancelada').length} canceladas</small></div></div>
    <p class="muted" style="margin:0;font-size:.85rem">Toque num dia para marcar a situação, anotar, mudar horário ou valor, excluir a aula ou incluir uma aula extra.</p>`;
}
function pcYearTable(S, Y, locked) {
  const dis = locked ? 'disabled' : '';
  return `<div class="tbl-wrap"><table><thead><tr><th>Mês</th><th style="text-align:right">Previstas</th><th style="text-align:right">Descontadas</th><th style="text-align:right">Extras</th><th style="text-align:right">Efetivas</th><th style="text-align:right">Calculado</th><th style="text-align:right">Valor do mês</th></tr></thead><tbody>
    ${Y.months.map(M => `<tr><td>${PC.MONTHS[M.m - 1]}</td><td class="v">${M.planned}</td><td class="v">${M.discounted ? '−' + M.discounted : 0}</td><td class="v">${M.extra}</td><td class="v">${M.effective}</td><td class="v">${esc(PC.money(M.calc))}</td><td class="v"><input class="vin" data-mm="${M.m}" inputmode="decimal" value="${M.manual ? esc(String(M.value).replace('.', ',')) : ''}" placeholder="${esc(String(M.calc.toFixed(2)).replace('.', ','))}" ${dis} aria-label="Valor de ${PC.MONTHS[M.m - 1]}">${M.manual ? `<span class="ref" style="color:var(--warn)">ajuste manual ${locked ? '' : `<button class="btn small ghost" data-mreset="${M.m}">usar calculado</button>`}</span>` : ''}</td></tr>`).join('')}
    <tr><td><b>Total dos 12 meses</b></td><td></td><td></td><td></td><td class="v"><b>${Y.lessons}</b></td><td></td><td class="v"><b>${esc(PC.money(Y.total))}</b></td></tr></tbody></table></div>
    <div class="panel stack" style="background:var(--bg)"><label class="switch"><input type="checkbox" id="cs-fixed" ${S.fixedMonthly ? 'checked' : ''} ${dis}><span class="sw"></span><span>Dividir o total por 12 (mensalidade fixa)</span></label>
      ${S.fixedMonthly ? `<div class="row" style="align-items:flex-end"><div class="kpi${Y.fixedManual ? ' hot' : ''}" style="flex:1;min-width:200px"><span>Valor mensal fixo</span><b class="num">${esc(PC.money(Y.fixed))}</b><small>${esc(PC.money(Y.total))} ÷ 12 = ${esc(PC.money(Y.fixedCalc))}${Y.fixedManual ? ' · ajuste manual' : ''}</small></div>
        <label class="f">Ajuste manual (R$)<input id="cs-fo" class="vin" style="width:140px" inputmode="decimal" value="${Y.fixedManual ? esc(String(Y.fixed).replace('.', ',')) : ''}" placeholder="opcional" ${dis}></label>${Y.fixedManual && !locked ? '<button class="btn small ghost" id="cs-fr">Usar calculado</button>' : ''}</div>` : '<p class="muted" style="margin:0">Cobrança pelo valor de cada mês.</p>'}</div>`;
}
function pcLessonDialog(k, date, locked) {
  const S = k.schedule, y = +date.slice(0, 4), m = +date.slice(5, 7), L = PC.monthLessons(S, y, m).find(x => x.date === date), ov = S.lessons[date] || {};
  const off = S.offs.filter(o => o.date === date);
  const md = document.createElement('div'); md.className = 'modal';
  md.innerHTML = `<form class="panel" role="dialog" aria-modal="true" style="max-width:460px"><div class="stack" style="gap:2px"><span class="eyebrow">${PC.DOW[PC.dowOf(date)]} · ${PC.br(date)}</span><h2>${L ? (L.extra ? 'Aula extra / reposição' : 'Aula') : 'Dia sem aula'}</h2></div>
    ${off.length ? `<p class="muted" style="margin:0">${off.map(o => esc(o.name) + ' (' + esc(PC.OFF_KIND[o.kind]) + (o.kind !== 'reposicao' ? (o.discount ? ', com desconto' : ', sem desconto') : '') + ')').join('; ')}</p>` : ''}
    ${L ? `<label class="f">Situação<select id="ld-st" ${locked ? 'disabled' : ''}>${Object.entries(PC.LESSON_ST).map(([kk, l]) => `<option value="${kk}"${L.status === kk ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="grid-form"><label class="f">Horário<input type="time" id="ld-time" value="${esc(L.time || '')}" ${locked ? 'disabled' : ''}></label><label class="f">Duração (min)<input id="ld-dur" inputmode="numeric" value="${esc(L.dur || '')}" ${locked ? 'disabled' : ''}></label><label class="f">Valor (R$)<input id="ld-price" inputmode="decimal" value="${esc(String(L.price).replace('.', ','))}" ${locked ? 'disabled' : ''}></label></div>
      ${!L.extra ? `<fieldset class="pcscope"><legend>Mudança de horário, duração ou valor vale para</legend><label class="row" style="gap:8px"><input type="radio" name="ld-sc" value="one" checked> Somente esta aula</label><label class="row" style="gap:8px"><input type="radio" name="ld-sc" value="next"> Esta e as próximas ${PC.DOW[PC.dowOf(date)].toLowerCase()}s</label></fieldset>` : ''}
      <label class="f">Observação desta data<textarea id="ld-note" rows="2" ${locked ? 'disabled' : ''}>${esc(L.note || '')}</textarea></label>` :
      `<p class="muted" style="margin:0">Não há aula prevista nesta data.</p><label class="f">Observação desta data<textarea id="ld-note" rows="2" ${locked ? 'disabled' : ''}>${esc(ov.note || '')}</textarea></label>`}
    <div class="row" style="justify-content:space-between;flex-wrap:wrap">${locked ? '' : L ? `<button type="button" class="btn ghost danger" id="ld-rm">Excluir aula</button>` : `<button type="button" class="btn" id="ld-add">+ Incluir aula extra</button>`}
      <span class="row"><button type="button" class="btn" data-x>Fechar</button>${locked ? '' : '<button class="btn primary">Aplicar</button>'}</span></div>
    ${locked ? '' : '<p class="muted" style="margin:0;font-size:.82rem">As mudanças entram no contrato quando você tocar em Salvar.</p>'}</form>`;
  document.body.appendChild(md);
  md.addEventListener('click', e => { if (e.target === md || e.target.closest('[data-x]')) md.remove(); });
  const done = () => { md.remove(); pcSetDirty(); pcRerender(); };
  const rm = $('#ld-rm', md); if (rm) rm.onclick = async () => { if (!(await confirmBox('Excluir aula?', `A aula de ${PC.br(date)} sai do calendário e do valor do mês.`))) return; if (L.extra) { const o = { ...(S.lessons[date] || {}) }; delete o.extra; S.lessons[date] = o; S.offs = S.offs.filter(x => !(x.date === date && x.kind === 'reposicao')); } else S.lessons[date] = { ...(S.lessons[date] || {}), removed: true }; done(); };
  const ad = $('#ld-add', md); if (ad) ad.onclick = () => { const base = PC.ruleAt(S, date).days[0] || {}; S.lessons[date] = { ...(S.lessons[date] || {}), extra: true, removed: false, status: 'prevista', note: $('#ld-note', md).value, time: base.time || '', dur: base.dur ?? 50, price: base.price ?? 0 }; done(); };
  $('form', md).onsubmit = e => {
    e.preventDefault(); if (locked) return md.remove();
    const note = $('#ld-note', md).value;
    if (!L) { S.lessons[date] = { ...(S.lessons[date] || {}), note }; return done(); }
    const ch = {}, t = $('#ld-time', md).value, du = PC.num($('#ld-dur', md).value), pr = PC.num($('#ld-price', md).value);
    if (t !== (L.time || '')) ch.time = t; if (du != null && du !== L.dur) ch.dur = du; if (pr != null && pr !== L.price) ch.price = pr;
    const scope = L.extra ? 'one' : ($('input[name="ld-sc"]:checked', md)?.value || 'one');
    if (L.extra) S.lessons[date] = { ...(S.lessons[date] || {}), ...ch, status: $('#ld-st', md).value, note };
    else { PC.editLesson(S, date, ch, scope); S.lessons[date] = { ...(S.lessons[date] || {}), status: $('#ld-st', md).value, note }; }
    done();
  };
}

/* ---------- aba Diretrizes (editor de texto) ---------- */
function pcTabDiretrizes(body, k, cl, locked) {
  const G = k.guidelines;
  body.innerHTML = `<div class="row spread"><p class="muted" style="margin:0;font-size:.86rem;flex:1;min-width:200px">Escreva livremente em cada tópico. Use os botões para negrito, itálico, sublinhado e listas.</p>${locked ? '' : '<span class="row"><button class="btn small" id="g-tpl">Aplicar modelo…</button><button class="btn small" id="g-save-tpl">Salvar como modelo</button></span>'}</div>
    ${G.map((g, i) => `<section class="panel stack"><div class="row spread"><span class="pcnum">${String(i + 1).padStart(2, '0')}</span><input class="pcsec-t" style="flex:1" data-gt="${i}" value="${esc(g.title)}" ${locked ? 'disabled' : ''} aria-label="Título do tópico">
        ${locked ? '' : `<span class="row" style="gap:2px">${pcMoveBtns('g', i, G.length)}<button class="btn small ghost" data-gd="${i}" aria-label="Duplicar tópico">⧉</button><button class="btn small ghost danger" data-gx="${i}" aria-label="Excluir tópico">✕</button></span>`}</div>
      ${locked ? '' : `<div class="rtbar" role="toolbar" aria-label="Formatação"><button type="button" class="btn small ghost" data-cmd="bold" data-gi="${i}"><b>N</b></button><button type="button" class="btn small ghost" data-cmd="italic" data-gi="${i}"><i>I</i></button><button type="button" class="btn small ghost" data-cmd="underline" data-gi="${i}"><u>S</u></button><button type="button" class="btn small ghost" data-cmd="insertUnorderedList" data-gi="${i}">• Lista</button><button type="button" class="btn small ghost" data-cmd="insertOrderedList" data-gi="${i}">1. Lista</button><button type="button" class="btn small ghost" data-cmd="removeFormat" data-gi="${i}">Limpar</button></div>`}
      <div class="rt" data-gh="${i}" ${locked ? '' : 'contenteditable="true"'} role="textbox" aria-multiline="true" aria-label="${esc(g.title)}">${PC.sanitize(g.html) || ''}</div></section>`).join('')}
    ${locked ? '' : '<div><button class="btn" id="g-add">+ Adicionar tópico</button></div>'}`;
  if (locked) return;
  const mut = fn => { fn(); pcSetDirty(); pcRerender(); };
  $$('[data-gt]').forEach(i => i.oninput = () => { G[+i.dataset.gt].title = i.value; pcSetDirty(); });
  $$('[data-gh]').forEach(d => d.oninput = () => { G[+d.dataset.gh].html = PC.sanitize(d.innerHTML); pcSetDirty(); });
  $$('[data-cmd]').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => { const ed = $(`[data-gh="${b.dataset.gi}"]`); ed.focus(); document.execCommand(b.dataset.cmd, false, null); G[+b.dataset.gi].html = PC.sanitize(ed.innerHTML); pcSetDirty(); }; });
  $$('[data-mv]').forEach(b => b.onclick = () => mut(() => { const [, a, dir] = b.dataset.mv.split(':'); const i = +a, j = i + (+dir); if (j < 0 || j >= G.length) return; [G[i], G[j]] = [G[j], G[i]]; }));
  $$('[data-gd]').forEach(b => b.onclick = () => mut(() => G.splice(+b.dataset.gd + 1, 0, { ...G[+b.dataset.gd], id: PC.uid(), title: G[+b.dataset.gd].title + ' (cópia)' })));
  $$('[data-gx]').forEach(b => b.onclick = async () => { if (await confirmBox('Excluir tópico?', `“${G[+b.dataset.gx].title}” sai das diretrizes (só depois de Salvar).`)) mut(() => G.splice(+b.dataset.gx, 1)); });
  $('#g-add').onclick = () => mut(() => G.push({ id: PC.uid(), title: 'Novo tópico', html: '' }));
  $('#g-save-tpl').onclick = () => pcSaveTemplate('diretrizes', G);
  $('#g-tpl').onclick = async () => {
    const L = await pcTemplates('diretrizes'), m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<form class="panel" role="dialog" aria-modal="true"><h2>Aplicar modelo de diretrizes</h2><label class="f">Modelo<select id="gm">${'<option value="">Modelo padrão do app (tópicos em branco)</option>' + L.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><p class="muted" style="margin:0">Os tópicos atuais deste contrato serão substituídos (só depois de Salvar).</p><div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Aplicar</button></div></form>`;
    document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
    $('form', m).onsubmit = e => { e.preventDefault(); const t = L.find(x => x.id === $('#gm', m).value); k.guidelines = JSON.parse(JSON.stringify(t ? t.data : PC.guidelinesTemplate())); m.remove(); pcSetDirty(); pcRerender(); };
  };
}

/* ---------- aba Documentos ---------- */
function pcTabDocs(body, k, cl, locked) {
  body.innerHTML = `<section class="panel stack"><div class="row spread"><h2>Documentos do contrato</h2><label class="btn small" style="cursor:pointer">+ Anexar<input type="file" id="kd-up" accept="application/pdf,image/*" hidden multiple></label></div>
      <p class="muted" style="margin:0;font-size:.86rem">PDFs e imagens ficam guardados neste aparelho. Anexar ou excluir aqui é imediato (não depende do Salvar).</p>${pcDocsList(k.docs)}</section>
    ${k.signing?.signedFile ? `<section class="panel stack"><h2>PDF assinado</h2>${pcDocsList([k.signing.signedFile])}</section>` : ''}`;
  pcBindDocs(k.docs, async docs => { const o = await Store.get('pcContracts', k.id) || k; o.docs = docs; await Store.put('pcContracts', o); k.docs = docs; pcRerender(); }, '#kd-up');
}

/* ---------- aba Assinatura ---------- */
function pcTabAssinatura(body, k, cl) {
  const sg = k.signing || null;
  const steps = [['rascunho', 'Rascunho'], ['aguardando', 'Versão congelada / aguardando assinatura'], ['assinado', 'Assinado']];
  body.innerHTML = `<section class="panel stack"><h2>Assinatura eletrônica</h2>
      <div class="banner"><b>Duas formas de assinar.</b> 1) <b>Link pelo WhatsApp</b>: o aluno abre o link, lê o contrato, informa nome e CPF e assina com o dedo na tela; o app registra data, hora, IP, aparelho e o código da versão (assinatura eletrônica simples, Lei 14.063/2020). 2) <b>Provedor externo</b> (Assinador gov.br, ZapSign, DocuSign…): baixe o PDF, assine por lá e registre anexando o PDF assinado.</div>
      <ol class="pcsteps">${steps.map(([s, l]) => `<li class="${k.status === s ? 'on' : ''}">${esc(l)}</li>`).join('')}</ol>
      ${k.status === 'rascunho' ? `<p style="margin:0">1. Revise o contrato, o calendário e as diretrizes (botão Visualizar) e salve.<br>2. Toque em <b>Enviar link de assinatura pelo WhatsApp</b>: a versão é congelada (recebe um código de verificação) e o WhatsApp abre na conversa do aluno com o link.<br>3. O aluno lê, informa nome e CPF e assina com o dedo. Ao abrir este contrato de novo, ele aparece como <b>Assinado</b>.<br><span class="muted">Prefere um provedor externo (gov.br, ZapSign, DocuSign)? Toque em “Só congelar a versão”, baixe o PDF e depois registre a assinatura anexando o PDF assinado.</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn primary" id="sg-freeze-wa" ${PCX.dirty ? 'disabled' : ''}>Enviar link de assinatura pelo WhatsApp</button><button class="btn" id="sg-freeze" ${PCX.dirty ? 'disabled' : ''}>Só congelar a versão</button>${PCX.dirty ? '<span class="muted" style="font-size:.86rem">Salve as alterações primeiro.</span>' : ''}</div>` : ''}
      ${sg ? `<div class="tbl-wrap"><table><tbody><tr><td>Versão</td><td>${k.version}</td></tr><tr><td>Congelada em</td><td>${esc(new Date(sg.frozenAt).toLocaleString('pt-BR'))}</td></tr><tr><td>Código de verificação (SHA-256)</td><td class="mono" style="word-break:break-all;font-size:.8rem">${esc(sg.hash)}</td></tr>
        ${sg.link && !sg.signedAt ? `<tr><td>Link de assinatura</td><td>${sg.link.status === 'pendente' ? `Aguardando o aluno · criado em ${esc(new Date(sg.link.createdAt).toLocaleString('pt-BR'))}${sg.link.sentAt ? ' · enviado em ' + esc(new Date(sg.link.sentAt).toLocaleString('pt-BR')) : ''} · válido até ${esc(new Date(sg.link.expiresAt).toLocaleDateString('pt-BR'))}` : esc(sg.link.status)}</td></tr>` : ''}
        ${sg.signedAt ? `<tr><td>Assinado em</td><td>${esc(new Date(sg.signedAt).toLocaleString('pt-BR'))}</td></tr><tr><td>Signatários</td><td>${(sg.signers || []).map(s => esc(`${s.name} (${s.role})${s.at ? ' — ' + new Date(s.at).toLocaleString('pt-BR') : ''}`)).join('<br>')}</td></tr><tr><td>Provedor / método</td><td>${esc(sg.provider || '—')}</td></tr>${sg.link?.status === 'assinado' ? `<tr><td>Evidências do link</td><td>${esc(sg.link.name)} · CPF ${esc(sg.link.cpf)}<br>${esc(new Date(sg.link.signedAt).toLocaleString('pt-BR'))}${sg.link.ip ? ' · IP ' + esc(sg.link.ip) : ''}<span class="ref" style="word-break:break-all">${esc(sg.link.ua)}</span>${sg.link.png ? `<img src="${esc(sg.link.png)}" alt="Assinatura do aluno" style="display:block;max-height:60px;max-width:220px;background:#fff;border-radius:6px;padding:4px;margin-top:6px">` : ''}</td></tr>` : `<tr><td>PDF assinado</td><td>${esc(sg.signedFile?.name || '—')}<span class="ref mono" style="word-break:break-all">SHA-256 ${esc(sg.signedFile?.hash || '')}</span></td></tr>`}` : ''}</tbody></table></div>` : ''}
      ${k.status === 'aguardando' ? `<div class="row" style="flex-wrap:wrap"><button class="btn primary" id="sg-link">${sg?.link?.status === 'pendente' ? 'Reenviar link pelo WhatsApp' : 'Enviar link de assinatura pelo WhatsApp'}</button>${sg?.link?.status === 'pendente' ? '<button class="btn" id="sg-check">Verificar assinatura</button>' : ''}</div>
        <div class="row" style="flex-wrap:wrap"><button class="btn" id="sg-pdf">Baixar PDF para assinatura</button><button class="btn" id="sg-reg">Registrar assinatura de provedor externo</button><button class="btn ghost" id="sg-back">Voltar para rascunho</button></div>` : ''}
      ${k.status === 'assinado' || PC.statusOf(k, pcToday()) === 'vencido' ? `<div class="row"><button class="btn" id="sg-final">Baixar documento final</button><button class="btn" id="sg-proof">Baixar comprovante de assinatura</button>${sg?.signedFile ? '<button class="btn" id="sg-signed">Baixar PDF assinado</button>' : ''}</div>` : ''}</section>
    ${(k.history || []).length ? `<section class="panel stack"><h2>Histórico</h2><ul class="find">${k.history.map(h => `<li>${esc(new Date(h.at).toLocaleString('pt-BR'))} — ${esc(h.event)}</li>`).join('')}</ul></section>` : ''}`;
  const freeze = async (title, body, ok) => {
    if (!(await confirmBox(title, body, ok))) return false;
    const o = await Store.get('pcContracts', k.id), snap = PC.canonical(o);
    o.signing = { hash: await PC.sha256(snap), frozenAt: todayISO(), snapshot: snap, provider: null };
    o.status = 'aguardando'; (o.history ||= []).push({ at: todayISO(), event: `Versão ${o.version} congelada para assinatura` });
    await Store.put('pcContracts', o); PCX.draft = null; return true;
  };
  const fr = $('#sg-freeze'); if (fr) fr.onclick = async () => { if (await freeze('Congelar esta versão?', 'Contrato, calendário e diretrizes ficam bloqueados para edição. Para mudar depois, será preciso voltar para rascunho (antes de assinar) ou criar nova versão (depois de assinado).', 'Congelar')) { toast('Versão congelada'); go('pcContrato', { id: k.id }); } };
  const fw = $('#sg-freeze-wa'); if (fw) fw.onclick = async () => {
    if (Billing.enabled && !(await Billing.user())) return toast('Entre na sua conta (Ajustes → Conta) para enviar o link de assinatura', 4500);
    if (!(await freeze('Enviar para assinatura?', 'O contrato, o calendário e as diretrizes ficam bloqueados nesta versão e o app cria o link para o aluno ler e assinar pelo WhatsApp. Para corrigir antes da assinatura, use “Voltar para rascunho”.', 'Continuar'))) return;
    go('pcContrato', { id: k.id }); await PCSign.send(await Store.get('pcContracts', k.id), cl, true);
  };
  const bk = $('#sg-back'); if (bk) bk.onclick = async () => { if (!(await confirmBox('Voltar para rascunho?', 'O código de verificação atual deixa de valer. Use se o documento ainda não foi assinado.', 'Voltar para rascunho'))) return; const o = await Store.get('pcContracts', k.id); await PCSign.cancel(o); o.status = 'rascunho'; (o.history ||= []).push({ at: todayISO(), event: 'Envio cancelado; voltou para rascunho' + (o.signing?.link ? ' (link de assinatura cancelado)' : '') }); o.signing = null; await Store.put('pcContracts', o); PCX.draft = null; go('pcContrato', { id: k.id }); };
  const sp = $('#sg-pdf'); if (sp) sp.onclick = () => pcPDF(k, cl, 'completo');
  const fi = $('#sg-final'); if (fi) fi.onclick = () => pcPDF(k, cl, 'assinado');
  const pf = $('#sg-proof'); if (pf) pf.onclick = () => pcPDF(k, cl, 'comprovante');
  const ss = $('#sg-signed'); if (ss) ss.onclick = async () => { const m = await Store.get('media', sg.signedFile.mediaId); if (m?.blob) downloadBlob(m.blob, m.name); else toast('Arquivo não encontrado neste aparelho'); };
  const rg = $('#sg-reg'); if (rg) rg.onclick = () => pcRegisterSignature(k, cl);
  const sl = $('#sg-link'); if (sl) sl.onclick = () => PCSign.send(k, cl);
  const sc = $('#sg-check'); if (sc) sc.onclick = async () => { if (await PCSign.check(k)) go('pcContrato', { id: k.id }); };
  // ao abrir a aba, confere se o aluno já assinou pelo link
  if (k.status === 'aguardando' && sg?.link?.status === 'pendente' && !PCX.dirty) PCSign.check(k, true).then(ok => { if (ok) go('pcContrato', { id: k.id }); });
}
async function pcRegisterSignature(k, cl) {
  const P = await pcProfessional(), now = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true" style="max-width:520px;max-height:92vh;overflow:auto"><h2>Registrar assinatura concluída</h2>
    <p class="muted" style="margin:0;font-size:.88rem">Anexe o PDF assinado baixado do provedor (com as assinaturas e a trilha de auditoria dele). O app guarda o arquivo, o código do arquivo e o código da versão congelada.</p>
    <label class="f">PDF assinado *<input type="file" id="rs-file" accept="application/pdf"></label>
    <label class="f">Provedor ou método *<input id="rs-prov" list="rs-pl" placeholder="Ex.: Assinador gov.br, ZapSign"><datalist id="rs-pl"><option value="Assinador gov.br"><option value="ZapSign"><option value="Clicksign"><option value="D4Sign"><option value="DocuSign"><option value="Certificado digital ICP-Brasil"></datalist></label>
    <fieldset class="pcscope"><legend>Aluno</legend><div class="grid-form"><label class="f">Nome *<input id="rs-a" value="${esc(cl?.name || '')}"></label><label class="f">Data e hora *<input type="datetime-local" id="rs-at" value="${now}"></label></div></fieldset>
    <fieldset class="pcscope"><legend>Profissional</legend><div class="grid-form"><label class="f">Nome *<input id="rs-p" value="${esc(P.name)}"></label><label class="f">Data e hora *<input type="datetime-local" id="rs-pt" value="${now}"></label></div></fieldset>
    <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="rs-ok"> Confirmo que o PDF assinado corresponde à versão ${k.version} congelada deste contrato.</label>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Registrar</button></div></form>`;
  document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const f = $('#rs-file', m).files[0];
    if (!f || !$('#rs-prov', m).value.trim() || !$('#rs-a', m).value.trim() || !$('#rs-p', m).value.trim() || !$('#rs-ok', m).checked) return toast('Preencha os campos com * e confirme a versão');
    const buf = await f.arrayBuffer(), fh = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
    const id = 'pcsigned:' + PC.uid(); await Store.put('media', { id, kind: 'file', blob: f, name: f.name, type: f.type, createdAt: todayISO() });
    const o = await Store.get('pcContracts', k.id);
    o.signing = { ...o.signing, provider: $('#rs-prov', m).value.trim(), signedAt: todayISO(), signers: [{ role: 'aluno', name: $('#rs-a', m).value.trim(), at: new Date($('#rs-at', m).value).toISOString() }, { role: 'profissional', name: $('#rs-p', m).value.trim(), at: new Date($('#rs-pt', m).value).toISOString() }], signedFile: { mediaId: id, name: f.name, size: f.size, type: f.type, at: todayISO(), hash: fh, label: 'PDF assinado' }, confirmed: true };
    o.status = 'assinado'; (o.history ||= []).push({ at: todayISO(), event: `Assinatura registrada (${o.signing.provider})` });
    await Store.put('pcContracts', o); m.remove(); PCX.draft = null; toast('Assinatura registrada'); go('pcContrato', { id: k.id });
  };
}

/* ---------- visualizar (mesmo conteúdo do PDF) ---------- */
async function pcDocHTML(k, cl, part = 'completo') {
  const P = await pcProfessional(), Y = PC.yearSummary(k.schedule), S = k.schedule, on = pcKind(k) === 'online', O = k.online || {};
  const contrato = `<h2>${esc(k.title)}</h2>${k.sections.map(s => `<h3>${esc(s.title)}</h3>${s.items.map(i => i.type === 'field' ? `<p class="pcrow"><span>${esc(i.label)}</span><b>${esc(i.value || '')}</b></p>` : `<p><b>${esc(i.label)}.</b> ${esc(i.text || '')}</p>`).join('')}`).join('')}`;
  const cal = `<h2>Calendário de aulas ${S.year}</h2><p>Período: ${esc(PC.br(S.start))} a ${esc(PC.br(S.end))}. Dias: ${esc(PC.ruleAt(S, S.start).days.map(d => `${PC.DOW[d.dow]}${d.time ? ' ' + d.time : ''} (${d.dur} min, ${PC.money(d.price)})`).join('; ') || '—')}.</p>
    <table><thead><tr><th>Mês</th><th>Aulas</th><th>Descontadas</th><th>Valor</th></tr></thead><tbody>${Y.months.map(M => `<tr><td>${PC.MONTHS[M.m - 1]}</td><td>${M.effective}</td><td>${M.discounted}</td><td>${PC.money(M.value)}${M.manual ? ' *' : ''}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${Y.lessons}</b></td><td></td><td><b>${PC.money(Y.total)}</b></td></tr></tbody></table>
    ${S.fixedMonthly ? `<p><b>Valor mensal fixo: ${PC.money(Y.fixed)}</b> (${PC.money(Y.total)} ÷ 12${Y.fixedManual ? '; ajuste manual' : ''}).</p>` : ''}${Y.months.some(M => M.manual) ? '<p class="muted">* valor ajustado manualmente.</p>' : ''}
    <h3>Datas sem aula e reposições</h3><ul>${S.offs.filter(o => o.kind === 'reposicao' || o.discount).sort((a, b) => a.date.localeCompare(b.date)).map(o => `<li>${PC.br(o.date)} — ${esc(o.name)} (${esc(PC.OFF_KIND[o.kind])})</li>`).join('') || '<li>Nenhuma</li>'}</ul>`;
  const vig = `<h2>Vigência e valores</h2><p class="pcrow"><span>Serviço</span><b>${esc(O.service || '')}</b></p><p class="pcrow"><span>Plano</span><b>${esc(O.plan || '')}${O.months ? ` (${O.months} ${O.months > 1 ? 'meses' : 'mês'})` : ''}</b></p><p class="pcrow"><span>Período</span><b>${esc(PC.br(O.start))} a ${esc(PC.br(O.end))}</b></p><p class="pcrow"><span>Valor</span><b>${O.amount != null && O.amount !== '' ? PC.money(O.amount) : ''}</b></p><p class="pcrow"><span>Pagamento</span><b>${esc([O.paymentType, O.paymentMethod].filter(Boolean).join(' · '))}</b></p><p class="pcrow"><span>Vencimento</span><b>${esc(O.due || '')}</b></p>`;
  const dir = `<h2>${on ? 'Diretrizes do serviço' : 'Diretrizes das aulas'}</h2>${k.guidelines.map((g, i) => `<h3>${String(i + 1).padStart(2, '0')} · ${esc(g.title)}</h3><div>${PC.sanitize(g.html) || '<p class="muted">—</p>'}</div>`).join('')}`;
  const head = `<p class="muted">${esc(P.name || 'Profissional')}${P.reg ? ' · ' + esc(P.reg) : ''} · Aluno: ${esc(cl?.name || '')} · Versão ${k.version}</p>`;
  const cv = on ? vig : cal;
  return head + (part === 'contrato' ? contrato : part === 'calendario' || part === 'vigencia' ? cv : part === 'diretrizes' ? dir : contrato + cv + dir);
}
async function pcPreview(k, cl) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel pcpreview" role="dialog" aria-modal="true"><div class="row spread"><h2>Visualizar</h2><span class="row"><button class="btn small" id="pv-pdf">Exportar PDF</button><button class="btn small" data-x>Fechar</button></span></div><div class="pcdoc">${await pcDocHTML(k, cl)}</div></div>`;
  document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('#pv-pdf', m).onclick = () => { m.remove(); pcPdfMenu(k, cl); };
}
function pcPdfMenu(k, cl) {
  const signed = k.status === 'assinado' || PC.statusOf(k, pcToday()) === 'vencido';
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true"><h2>Exportar PDF</h2><div class="stack">
    ${[['contrato', 'Somente o contrato'], pcKind(k) === 'online' ? ['vigencia', 'Somente a vigência e os valores'] : ['calendario', 'Somente o calendário'], ['diretrizes', 'Somente as diretrizes'], ['completo', 'Conjunto completo (um arquivo)'], ...(signed ? [['assinado', 'Versão assinada com evidências']] : [])].map(([p, l]) => `<button class="btn" data-p="${p}">${l}</button>`).join('')}
    ${PCX.dirty ? '<p class="muted" style="margin:0;font-size:.85rem">O PDF sai com o conteúdo da tela, incluindo alterações ainda não salvas.</p>' : ''}${!signed ? '<p class="muted" style="margin:0;font-size:.85rem">A versão assinada aparece aqui depois de registrar a assinatura.</p>' : ''}</div><div class="row" style="justify-content:flex-end"><button class="btn" data-x>Fechar</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $$('[data-p]', m).forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Gerando…'; try { await pcPDF(k, cl, b.dataset.p); toast('PDF gerado'); } catch (e) { toast('Não foi possível gerar o PDF: ' + e.message, 4000); } m.remove(); });
}

/* ---------- modelo (edição) ---------- */
SCREENS.pcModelo = async ({ id }) => {
  const t = await Store.get('pcTemplates', id); if (!t) return go('contratos');
  // reaproveita os editores sobre um "contrato" de mentira
  const fake = PC.blankContract('', new Date().getFullYear(), t.type === 'contrato' ? t.data : undefined, t.type === 'diretrizes' ? t.data : undefined, t.kind || 'personal'); fake.id = 'tpl:' + t.id;
  app.innerHTML = `${back('Modelos')}<div class="row spread"><input class="pctitle" id="tp-name" value="${esc(t.name)}" aria-label="Nome do modelo"><button class="btn primary" id="tp-save">Salvar modelo</button></div>
    <p class="muted" style="margin:0">Alterar este modelo não muda contratos já criados.</p><div id="tp-body" class="stack"></div>`;
  bindBack('contratos', { tab: 'modelos' });
  PCX.draft = fake; PCX.mode = 'edit';
  const render = () => { const b = $('#tp-body'); (t.type === 'contrato' ? pcTabContrato : pcTabDiretrizes)(b, fake, null, false); };
  window.__pcTplRender = render;
  render();
  $('#tp-save').onclick = async () => { t.name = $('#tp-name').value.trim() || t.name; t.data = JSON.parse(JSON.stringify(t.type === 'contrato' ? fake.sections : fake.guidelines)); if (t.type === 'contrato') t.data.forEach(s => s.items.forEach(i => { if (i.type === 'field') i.value = ''; })); t.updatedAt = todayISO(); await Store.put('pcTemplates', t); PCX.dirty = false; PCX.draft = null; toast('Modelo salvo'); go('contratos', { tab: 'modelos' }); };
};
