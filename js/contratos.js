/* TEAMRM — Contratos Personal: clientes, contratos editáveis, calendário de aulas, diretrizes, documentos e assinatura.
   Dados só no aparelho (lojas pcClients, pcContracts, pcTemplates; arquivos na loja media). Salva só ao tocar em "Salvar". */
'use strict';

const PCX = { draft: null, dirty: false, mode: 'fill', cal: { view: 'mes', month: 1 }, list: { q: '', st: 'all', year: '' }, tab: 'clientes' };
const pcAll = async s => (await Store.all(s));
const pcClients = async () => (await pcAll('pcClients')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
const pcToday = () => (typeof AL !== 'undefined' ? AL.today() : new Date().toISOString().slice(0, 10));
const pcStTone = s => ({ rascunho: 'na', aguardando: 'warn', assinado: 'ok', vencido: 'bad', cancelado: 'bad' }[s] || 'na');
const pcLocked = c => ['aguardando', 'assinado', 'cancelado'].includes(c.status);
function pcSetDirty(v = true) { PCX.dirty = v; const b = $('#pc-save'); if (b) { b.disabled = !v; b.textContent = v ? 'Salvar' : 'Salvo'; } }
async function pcTemplates(type) { const l = (await pcAll('pcTemplates')).filter(t => t.type === type); return l; }
async function pcProfessional() { const S = await getSettings(); return { name: S.professional || '', reg: S.registry ? crefFmt(S.registry) : '', clinic: S.clinic || '', logo: S.logo || '' }; }

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
  if (tab) PCX.tab = tab;
  const [clients, contracts] = await Promise.all([pcClients(), pcAll('pcContracts')]), t = pcToday();
  const T = [['clientes', 'Clientes'], ['contratos', 'Contratos'], ['modelos', 'Modelos'], ['dados', 'Importar / exportar']];
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Atendimento presencial</span><h1>Contratos Personal</h1></div>
      <div class="row"><button class="btn" id="pc-newc">+ Novo cliente</button><button class="btn primary" id="pc-newk">+ Novo contrato</button></div></div>
    <div class="tabs" role="tablist">${T.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${PCX.tab === k}">${l}</button>`).join('')}</div><div id="pc-body" class="stack"></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => go('contratos', { tab: b.dataset.t }));
  $('#pc-newc').onclick = () => go('pcCliente', { id: null });
  $('#pc-newk').onclick = () => pcNewContract(null);
  const body = $('#pc-body');
  if (PCX.tab === 'clientes') {
    body.innerHTML = `<input class="search" id="pc-q" type="search" placeholder="Buscar cliente pelo nome" aria-label="Buscar cliente" value="${esc(PCX.list.q)}"><div id="pc-l"></div>`;
    const draw = () => {
      const q = AL.norm(PCX.list.q), l = clients.filter(c => AL.norm(c.name).includes(q));
      $('#pc-l').innerHTML = !clients.length ? `<div class="panel empty"><h2>Nenhum cliente ainda</h2><p class="muted" style="margin:0">Cadastre o primeiro cliente ou importe os calendários em “Importar / exportar”.</p><button class="btn primary" id="pc-e1">+ Novo cliente</button></div>`
        : !l.length ? '<div class="panel empty muted">Nenhum cliente encontrado.</div>'
        : `<div class="plist">${l.map(c => { const ks = contracts.filter(k => k.clientId === c.id), st = ks.map(k => PC.statusOf(k, t));
          return `<button class="prow" data-c="${c.id}"><span class="av">${esc(initials(c.name))}</span><span style="min-width:0"><b>${esc(c.name)}</b><br><span class="muted" style="font-size:.86rem">${ks.length} contrato${ks.length === 1 ? '' : 's'}${c.phone ? ' · ' + esc(c.phone) : ''}</span></span><span class="row" style="gap:4px;justify-content:flex-end">${[...new Set(st)].map(s => `<span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span>`).join('')}</span></button>`; }).join('')}</div>`;
      $$('[data-c]').forEach(b => b.onclick = () => go('pcCliente', { id: b.dataset.c }));
      const e1 = $('#pc-e1'); if (e1) e1.onclick = () => go('pcCliente', { id: null });
    };
    $('#pc-q').oninput = e => { PCX.list.q = e.target.value; draw(); }; draw();
  } else if (PCX.tab === 'contratos') {
    const years = [...new Set(contracts.map(k => k.schedule?.year).filter(Boolean))].sort();
    body.innerHTML = `<div class="row"><input class="search" id="pc-q" type="search" placeholder="Buscar por aluno ou título" value="${esc(PCX.list.q)}" aria-label="Buscar contrato">
        <label class="f" style="min-width:130px">Período<select id="pc-y"><option value="">Todos os anos</option>${years.map(y => `<option${String(y) === PCX.list.year ? ' selected' : ''}>${y}</option>`).join('')}</select></label></div>
      <div class="chips">${[['all', 'Todos'], ...Object.entries(PC.STATUS)].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${PCX.list.st === k}">${esc(l)}</button>`).join('')}</div><div id="pc-l"></div>`;
    const draw = () => {
      const q = AL.norm(PCX.list.q), name = id => clients.find(c => c.id === id)?.name || '—';
      const l = contracts.filter(k => AL.norm(`${name(k.clientId)} ${k.title}`).includes(q) && (PCX.list.st === 'all' || PC.statusOf(k, t) === PCX.list.st) && (!PCX.list.year || String(k.schedule?.year) === PCX.list.year))
        .sort((a, b) => name(a.clientId).localeCompare(name(b.clientId), 'pt-BR') || b.version - a.version);
      $('#pc-l').innerHTML = l.length ? `<div class="plist">${l.map(k => { const s = PC.statusOf(k, t); return `<button class="prow" data-k="${k.id}" style="grid-template-columns:1fr auto"><span style="min-width:0"><b>${esc(name(k.clientId))}</b> <span class="muted" style="font-size:.86rem">· ${esc(k.title)} · v${k.version}</span><br><span class="muted" style="font-size:.84rem">${esc(PC.br(k.schedule?.start))} a ${esc(PC.br(k.schedule?.end))}</span></span><span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span></button>`; }).join('')}</div>` : '<div class="panel empty muted">Nenhum contrato nesta seleção.</div>';
      $$('[data-k]').forEach(b => b.onclick = () => go('pcContrato', { id: b.dataset.k }));
    };
    $('#pc-q').oninput = e => { PCX.list.q = e.target.value; draw(); };
    $('#pc-y').onchange = e => { PCX.list.year = e.target.value; draw(); };
    $$('[data-s]').forEach(b => b.onclick = () => { PCX.list.st = b.dataset.s; $$('[data-s]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
    draw();
  } else if (PCX.tab === 'modelos') {
    const tpls = await pcAll('pcTemplates');
    body.innerHTML = `<p class="muted" style="margin:0">Modelos usados ao criar um contrato. Alterar um modelo não muda contratos já criados.</p>
      ${['contrato', 'diretrizes'].map(type => `<section class="panel stack"><div class="row spread"><h2>${type === 'contrato' ? 'Modelos de contrato' : 'Modelos de diretrizes'}</h2><button class="btn small" data-nt="${type}">+ Novo modelo</button></div>
        <div class="plist"><div class="prow arow" style="cursor:default"><span><b>Modelo padrão do app</b><br><span class="muted" style="font-size:.85rem">Campos e tópicos em branco para preencher</span></span></div>
        ${tpls.filter(x => x.type === type).map(x => `<div class="prow arow"><span><b>${esc(x.name)}</b><br><span class="muted" style="font-size:.85rem">Atualizado em ${esc(fmtDate(x.updatedAt || x.createdAt))}</span></span><span class="row" style="gap:6px;justify-content:flex-end"><button class="btn small" data-et="${x.id}">Editar</button><button class="btn small" data-dt="${x.id}">Duplicar</button><button class="btn small ghost danger" data-xt="${x.id}">Excluir</button></span></div>`).join('')}</div></section>`).join('')}
      <section class="panel stack"><h2>Assinatura eletrônica</h2><p style="margin:0"><span class="st warn">Integração pendente</span></p><p class="muted" style="margin:0;font-size:.9rem">O envio de link individual com verificação de identidade depende de um provedor de assinatura eletrônica (por exemplo ZapSign, Clicksign, D4Sign ou o Assinador gov.br), que ainda não está configurado. Enquanto isso, o app congela a versão do documento com um código de verificação (SHA-256), gera o PDF para assinar e registra a assinatura feita no provedor anexando o PDF assinado.</p></section>`;
    $$('[data-nt]').forEach(b => b.onclick = async () => { const t2 = { id: PC.uid(), type: b.dataset.nt, name: b.dataset.nt === 'contrato' ? 'Meu modelo de contrato' : 'Minhas diretrizes', data: b.dataset.nt === 'contrato' ? PC.contractTemplate() : PC.guidelinesTemplate(), createdAt: todayISO() }; await Store.put('pcTemplates', t2); go('pcModelo', { id: t2.id }); });
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
        const n = await pcImportData(d); toast(`${n} contratos importados`); go('contratos', { tab: 'clientes' });
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
async function pcNewContract(clientId) {
  const clients = await pcClients(), ct = await pcTemplates('contrato'), gt = await pcTemplates('diretrizes'), y = new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
  if (!clients.length) { toast('Cadastre o cliente primeiro'); return go('pcCliente', { id: null }); }
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true" style="max-width:480px"><h2>Novo contrato</h2>
    <label class="f">Cliente<select id="nk-c">${clients.map(c => `<option value="${c.id}"${c.id === clientId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="f">Ano do calendário<input id="nk-y" type="number" min="2020" max="2100" value="${y}"></label>
    <label class="f">Modelo de contrato<select id="nk-t"><option value="">Modelo padrão do app</option>${ct.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
    <label class="f">Modelo de diretrizes<select id="nk-g"><option value="">Modelo padrão do app</option>${gt.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
    <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="nk-h" checked> Incluir feriados nacionais e de Pouso Alegre/MG do ano</label>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Criar</button></div></form>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const year = +$('#nk-y', m).value || y, t = ct.find(x => x.id === $('#nk-t', m).value), g = gt.find(x => x.id === $('#nk-g', m).value);
    const k = PC.blankContract($('#nk-c', m).value, year, t?.data, g?.data); k.createdAt = todayISO();
    if ($('#nk-h', m).checked) k.schedule.offs = PC.holidays(year);
    const cl = clients.find(c => c.id === k.clientId), P = await pcProfessional();
    pcPrefill(k, cl, P);
    m.remove(); PCX.draft = k; PCX.mode = 'fill'; pcSetDirty(true); go('pcContrato', { id: k.id, isNew: true });
  };
}
// preenche só o que já é conhecido (nome do aluno, profissional); o resto fica em branco
function pcPrefill(k, cl, P) {
  const set = (label, v) => { if (!v) return; for (const s of k.sections) for (const i of s.items) if (i.type === 'field' && i.label === label && !i.value) i.value = v; };
  set('Nome completo', cl?.name); set('CPF', cl?.cpf); set('Telefone', cl?.phone); set('E-mail', cl?.email); set('Endereço', cl?.address);
  set('Nome', P?.name); set('Registro profissional', P?.reg);
}

/* ================= cliente ================= */
SCREENS.pcCliente = async ({ id }) => {
  const old = id ? await Store.get('pcClients', id) : null;
  const c = old ? JSON.parse(JSON.stringify(old)) : { id: PC.uid(), name: '', cpf: '', phone: '', email: '', address: '', notes: '', studentId: '', docs: [], createdAt: todayISO() };
  PCX.draftClient = c;
  const ks = id ? (await pcAll('pcContracts')).filter(k => k.clientId === id).sort((a, b) => (b.schedule?.year || 0) - (a.schedule?.year || 0) || b.version - a.version) : [];
  const students = typeof AL !== 'undefined' ? (await Store.all('students')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : [];
  const t = pcToday(), F = (k, l, type = 'text', ph = '') => `<label class="f"${['name', 'address'].includes(k) ? ' style="grid-column:1/-1"' : ''}>${l}<input id="cf-${k}" type="${type}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}"></label>`;
  app.innerHTML = `${back('Contratos Personal')}<div class="row spread"><h1>${old ? esc(c.name) : 'Novo cliente'}</h1>${old ? '<button class="btn danger" id="cf-del">Excluir cliente</button>' : ''}</div>
    <section class="panel stack"><h2>Dados do aluno</h2><div class="grid-form">${F('name', 'Nome completo *')}${F('cpf', 'CPF', 'text', '000.000.000-00')}${F('phone', 'Telefone', 'tel')}${F('email', 'E-mail', 'email')}${F('address', 'Endereço')}
      <label class="f">Aluno vinculado (Alunos online)<select id="cf-studentId"><option value="">Nenhum</option>${students.map(s => `<option value="${s.id}"${s.id === c.studentId ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="f" style="grid-column:1/-1">Observações<textarea id="cf-notes" rows="2">${esc(c.notes || '')}</textarea></label></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="cf-save">Salvar</button></div></section>
    ${old ? `<section class="panel stack"><div class="row spread"><h2>Contratos</h2><button class="btn small primary" id="cf-newk">+ Novo contrato</button></div>
      ${ks.length ? `<div class="plist">${ks.map(k => { const s = PC.statusOf(k, t); return `<button class="prow" data-k="${k.id}" style="grid-template-columns:1fr auto"><span><b>${esc(k.title)}</b> <span class="muted">· v${k.version}</span><br><span class="muted" style="font-size:.85rem">${esc(PC.br(k.schedule?.start))} a ${esc(PC.br(k.schedule?.end))}</span></span><span class="st ${pcStTone(s)}">${esc(PC.STATUS[s])}</span></button>`; }).join('')}</div>` : '<p class="muted" style="margin:0">Nenhum contrato.</p>'}</section>
    <section class="panel stack"><div class="row spread"><h2>Documentos do aluno</h2><label class="btn small" style="cursor:pointer">+ Anexar<input type="file" id="cf-up" accept="application/pdf,image/*" hidden multiple></label></div>${pcDocsList(c.docs)}</section>` : ''}`;
  bindBack('contratos', {});
  const inputs = $$('#cf-name,#cf-cpf,#cf-phone,#cf-email,#cf-address,#cf-notes,#cf-studentId'); inputs.forEach(i => i.oninput = i.onchange = () => pcSetDirty(true));
  $('#cf-save').onclick = async () => {
    for (const k of ['name', 'cpf', 'phone', 'email', 'address', 'notes', 'studentId']) c[k] = $('#cf-' + k).value.trim();
    if (!c.name) { toast('Informe o nome do aluno'); return $('#cf-name').focus(); }
    c.updatedAt = todayISO(); await Store.put('pcClients', c); pcSetDirty(false); PCX.draftClient = null; toast('Cliente salvo'); go('pcCliente', { id: c.id });
  };
  if (old) {
    $('#cf-newk').onclick = () => pcNewContract(c.id);
    $$('[data-k]').forEach(b => b.onclick = () => go('pcContrato', { id: b.dataset.k }));
    $('#cf-del').onclick = async () => { if (!(await confirmBox('Excluir cliente?', `${c.name}, os ${ks.length} contratos e os documentos anexados serão apagados deste aparelho.`))) return; for (const k of ks) await pcDeleteContract(k); for (const d of c.docs || []) await Store.del('media', d.mediaId); await Store.del('pcClients', c.id); PCX.dirty = false; toast('Cliente excluído'); go('contratos'); };
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
  const TABS = [['contrato', 'Contrato'], ['calendario', 'Calendário'], ['diretrizes', 'Diretrizes'], ['documentos', 'Documentos'], ['assinatura', 'Assinatura']];
  app.innerHTML = `${back(cl?.name || 'Contratos')}
    <div class="row spread" style="align-items:flex-start"><div class="stack" style="gap:4px;min-width:0;flex:1"><span class="eyebrow">${esc(cl?.name || '')} · versão ${k.version}${k.parentId ? ' (aditivo)' : ''}</span>
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
  ({ contrato: pcTabContrato, calendario: pcTabCalendario, diretrizes: pcTabDiretrizes, documentos: pcTabDocs, assinatura: pcTabAssinatura })[PCX.ktab](body, k, cl, locked);
};
async function pcSave() {
  const k = PCX.draft; if (!k) return;
  if (pcLocked(k)) { const o = await Store.get('pcContracts', k.id); if (o && PC.canonical(o) !== PC.canonical(k)) return toast('Versão congelada: crie uma nova versão para alterar'); }
  k.updatedAt = todayISO(); k.createdAt ||= todayISO(); await Store.put('pcContracts', JSON.parse(JSON.stringify(k)));
  pcSetDirty(false); toast('Contrato salvo'); go('pcContrato', { id: k.id });
}
const pcRerender = () => (String(PCX.draft?.id || '').startsWith('tpl:') ? window.__pcTplRender?.() : go('pcContrato', { id: PCX.draft.id }));

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
      <div class="banner warn"><b>Integração com provedor de assinatura: pendente.</b> Para link individual e seguro, verificação de identidade do aluno e trilha de auditoria completa, é preciso configurar um provedor (por exemplo ZapSign, Clicksign, D4Sign ou o Assinador gov.br). Enquanto isso, o app não simula assinatura: ele congela a versão, gera o PDF e registra a assinatura feita no provedor.</div>
      <ol class="pcsteps">${steps.map(([s, l]) => `<li class="${k.status === s ? 'on' : ''}">${esc(l)}</li>`).join('')}</ol>
      ${k.status === 'rascunho' ? `<p style="margin:0">1. Revise o contrato, o calendário e as diretrizes (botão Visualizar).<br>2. Toque em <b>Congelar versão para assinatura</b>: o conteúdo fica bloqueado e recebe um código de verificação.<br>3. Baixe o PDF para assinatura e envie ao aluno pelo provedor.<br>4. Quando o aluno e a profissional assinarem, volte aqui e registre a assinatura anexando o PDF assinado.</p>
        <div class="row"><button class="btn primary" id="sg-freeze" ${PCX.dirty ? 'disabled' : ''}>Congelar versão para assinatura</button>${PCX.dirty ? '<span class="muted" style="font-size:.86rem">Salve as alterações primeiro.</span>' : ''}</div>` : ''}
      ${sg ? `<div class="tbl-wrap"><table><tbody><tr><td>Versão</td><td>${k.version}</td></tr><tr><td>Congelada em</td><td>${esc(new Date(sg.frozenAt).toLocaleString('pt-BR'))}</td></tr><tr><td>Código de verificação (SHA-256)</td><td class="mono" style="word-break:break-all;font-size:.8rem">${esc(sg.hash)}</td></tr>
        ${sg.signedAt ? `<tr><td>Assinado em</td><td>${esc(new Date(sg.signedAt).toLocaleString('pt-BR'))}</td></tr><tr><td>Signatários</td><td>${(sg.signers || []).map(s => esc(`${s.name} (${s.role})${s.at ? ' — ' + new Date(s.at).toLocaleString('pt-BR') : ''}`)).join('<br>')}</td></tr><tr><td>Provedor / método</td><td>${esc(sg.provider || '—')}</td></tr><tr><td>PDF assinado</td><td>${esc(sg.signedFile?.name || '—')}<span class="ref mono" style="word-break:break-all">SHA-256 ${esc(sg.signedFile?.hash || '')}</span></td></tr>` : ''}</tbody></table></div>` : ''}
      ${k.status === 'aguardando' ? `<div class="row"><button class="btn primary" id="sg-pdf">Baixar PDF para assinatura</button><button class="btn" id="sg-reg">Registrar assinatura concluída</button><button class="btn ghost" id="sg-back">Voltar para rascunho</button></div>` : ''}
      ${k.status === 'assinado' || PC.statusOf(k, pcToday()) === 'vencido' ? `<div class="row"><button class="btn" id="sg-final">Baixar documento final</button><button class="btn" id="sg-proof">Baixar comprovante de assinatura</button>${sg?.signedFile ? '<button class="btn" id="sg-signed">Baixar PDF assinado</button>' : ''}</div>` : ''}</section>
    ${(k.history || []).length ? `<section class="panel stack"><h2>Histórico</h2><ul class="find">${k.history.map(h => `<li>${esc(new Date(h.at).toLocaleString('pt-BR'))} — ${esc(h.event)}</li>`).join('')}</ul></section>` : ''}`;
  const fr = $('#sg-freeze'); if (fr) fr.onclick = async () => {
    if (!(await confirmBox('Congelar esta versão?', 'Contrato, calendário e diretrizes ficam bloqueados para edição. Para mudar depois, será preciso voltar para rascunho (antes de assinar) ou criar nova versão (depois de assinado).', 'Congelar'))) return;
    const o = await Store.get('pcContracts', k.id), snap = PC.canonical(o);
    o.signing = { hash: await PC.sha256(snap), frozenAt: todayISO(), snapshot: snap, provider: null };
    o.status = 'aguardando'; (o.history ||= []).push({ at: todayISO(), event: `Versão ${o.version} congelada para assinatura` });
    await Store.put('pcContracts', o); PCX.draft = null; toast('Versão congelada'); go('pcContrato', { id: k.id });
  };
  const bk = $('#sg-back'); if (bk) bk.onclick = async () => { if (!(await confirmBox('Voltar para rascunho?', 'O código de verificação atual deixa de valer. Use se o documento ainda não foi assinado.', 'Voltar para rascunho'))) return; const o = await Store.get('pcContracts', k.id); o.status = 'rascunho'; (o.history ||= []).push({ at: todayISO(), event: 'Envio cancelado; voltou para rascunho' }); o.signing = null; await Store.put('pcContracts', o); PCX.draft = null; go('pcContrato', { id: k.id }); };
  const sp = $('#sg-pdf'); if (sp) sp.onclick = () => pcPDF(k, cl, 'completo');
  const fi = $('#sg-final'); if (fi) fi.onclick = () => pcPDF(k, cl, 'assinado');
  const pf = $('#sg-proof'); if (pf) pf.onclick = () => pcPDF(k, cl, 'comprovante');
  const ss = $('#sg-signed'); if (ss) ss.onclick = async () => { const m = await Store.get('media', sg.signedFile.mediaId); if (m?.blob) downloadBlob(m.blob, m.name); else toast('Arquivo não encontrado neste aparelho'); };
  const rg = $('#sg-reg'); if (rg) rg.onclick = () => pcRegisterSignature(k, cl);
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
  const P = await pcProfessional(), Y = PC.yearSummary(k.schedule), S = k.schedule;
  const contrato = `<h2>${esc(k.title)}</h2>${k.sections.map(s => `<h3>${esc(s.title)}</h3>${s.items.map(i => i.type === 'field' ? `<p class="pcrow"><span>${esc(i.label)}</span><b>${esc(i.value || '')}</b></p>` : `<p><b>${esc(i.label)}.</b> ${esc(i.text || '')}</p>`).join('')}`).join('')}`;
  const cal = `<h2>Calendário de aulas ${S.year}</h2><p>Período: ${esc(PC.br(S.start))} a ${esc(PC.br(S.end))}. Dias: ${esc(PC.ruleAt(S, S.start).days.map(d => `${PC.DOW[d.dow]}${d.time ? ' ' + d.time : ''} (${d.dur} min, ${PC.money(d.price)})`).join('; ') || '—')}.</p>
    <table><thead><tr><th>Mês</th><th>Aulas</th><th>Descontadas</th><th>Valor</th></tr></thead><tbody>${Y.months.map(M => `<tr><td>${PC.MONTHS[M.m - 1]}</td><td>${M.effective}</td><td>${M.discounted}</td><td>${PC.money(M.value)}${M.manual ? ' *' : ''}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${Y.lessons}</b></td><td></td><td><b>${PC.money(Y.total)}</b></td></tr></tbody></table>
    ${S.fixedMonthly ? `<p><b>Valor mensal fixo: ${PC.money(Y.fixed)}</b> (${PC.money(Y.total)} ÷ 12${Y.fixedManual ? '; ajuste manual' : ''}).</p>` : ''}${Y.months.some(M => M.manual) ? '<p class="muted">* valor ajustado manualmente.</p>' : ''}
    <h3>Datas sem aula e reposições</h3><ul>${S.offs.filter(o => o.kind === 'reposicao' || o.discount).sort((a, b) => a.date.localeCompare(b.date)).map(o => `<li>${PC.br(o.date)} — ${esc(o.name)} (${esc(PC.OFF_KIND[o.kind])})</li>`).join('') || '<li>Nenhuma</li>'}</ul>`;
  const dir = `<h2>Diretrizes das aulas</h2>${k.guidelines.map((g, i) => `<h3>${String(i + 1).padStart(2, '0')} · ${esc(g.title)}</h3><div>${PC.sanitize(g.html) || '<p class="muted">—</p>'}</div>`).join('')}`;
  const head = `<p class="muted">${esc(P.name || 'Profissional')}${P.reg ? ' · ' + esc(P.reg) : ''} · Aluno: ${esc(cl?.name || '')} · Versão ${k.version}</p>`;
  return head + (part === 'contrato' ? contrato : part === 'calendario' ? cal : part === 'diretrizes' ? dir : contrato + cal + dir);
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
    ${[['contrato', 'Somente o contrato'], ['calendario', 'Somente o calendário'], ['diretrizes', 'Somente as diretrizes'], ['completo', 'Conjunto completo (um arquivo)'], ...(signed ? [['assinado', 'Versão assinada com evidências']] : [])].map(([p, l]) => `<button class="btn" data-p="${p}">${l}</button>`).join('')}
    ${PCX.dirty ? '<p class="muted" style="margin:0;font-size:.85rem">O PDF sai com o conteúdo da tela, incluindo alterações ainda não salvas.</p>' : ''}${!signed ? '<p class="muted" style="margin:0;font-size:.85rem">A versão assinada aparece aqui depois de registrar a assinatura.</p>' : ''}</div><div class="row" style="justify-content:flex-end"><button class="btn" data-x>Fechar</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $$('[data-p]', m).forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Gerando…'; try { await pcPDF(k, cl, b.dataset.p); toast('PDF gerado'); } catch (e) { toast('Não foi possível gerar o PDF: ' + e.message, 4000); } m.remove(); });
}

/* ---------- modelo (edição) ---------- */
SCREENS.pcModelo = async ({ id }) => {
  const t = await Store.get('pcTemplates', id); if (!t) return go('contratos');
  // reaproveita os editores sobre um "contrato" de mentira
  const fake = PC.blankContract('', new Date().getFullYear(), t.type === 'contrato' ? t.data : undefined, t.type === 'diretrizes' ? t.data : undefined); fake.id = 'tpl:' + t.id;
  app.innerHTML = `${back('Modelos')}<div class="row spread"><input class="pctitle" id="tp-name" value="${esc(t.name)}" aria-label="Nome do modelo"><button class="btn primary" id="tp-save">Salvar modelo</button></div>
    <p class="muted" style="margin:0">Alterar este modelo não muda contratos já criados.</p><div id="tp-body" class="stack"></div>`;
  bindBack('contratos', { tab: 'modelos' });
  PCX.draft = fake; PCX.mode = 'edit';
  const render = () => { const b = $('#tp-body'); (t.type === 'contrato' ? pcTabContrato : pcTabDiretrizes)(b, fake, null, false); };
  window.__pcTplRender = render;
  render();
  $('#tp-save').onclick = async () => { t.name = $('#tp-name').value.trim() || t.name; t.data = JSON.parse(JSON.stringify(t.type === 'contrato' ? fake.sections : fake.guidelines)); if (t.type === 'contrato') t.data.forEach(s => s.items.forEach(i => { if (i.type === 'field') i.value = ''; })); t.updatedAt = todayISO(); await Store.put('pcTemplates', t); PCX.dirty = false; PCX.draft = null; toast('Modelo salvo'); go('contratos', { tab: 'modelos' }); };
};
