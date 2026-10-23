/* TEAMRM — Alunos: controle de alunos, planos, revisões (troca de treino), lembretes, pagamentos e exportação.
   Dados só no aparelho (IndexedDB, loja "students"); tabela de valores em settings/"catalog". */
'use strict';

/* ================= lógica (sem tela; testada em tests/alunos.test.js) ================= */
const AL = (() => {
  const SITUATIONS = ['Ativo', 'Pendente', 'Pausado', 'Encerrado'];
  const STUDENT_STATUS = ['Ativo', 'Inativo'];
  const REV_STATUS = ['A prescrever', 'Prescrito', 'Finalizado'];
  const PLAN_NAMES = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];
  const PLAN_MONTHS = { Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 };
  const MONTH_PLAN = { 1: 'Mensal', 2: 'Bimestral', 3: 'Trimestral', 6: 'Semestral', 12: 'Anual' };
  const DEADLINES = ['30 dias', '45 dias', '60 dias', '90 dias'];
  const PAY_TYPES = ['Manual', 'À vista', 'Parcelado', 'Recorrente no cartão'];
  const PAY_METHODS = ['Pix', 'Pix App MFIT', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Boleto App MFIT', 'Transferência'];
  const SERVICES = ['Planilha de Treino', 'Planilha de Treino RM', 'Planilha de Treino + Dieta', 'Planilha de Treino Casal', 'Consultoria Online', 'Protocolo Alimentar – Dieta', 'Personal Presencial', 'Avaliação postural', 'Reabilitação / correção postural'];

  // tabela de valores padrão (a mesma do controle de alunos); editável em Alunos → Valores
  const opt = (group, service, label, desc, rows, recurring12 = false) => rows.map(([m, v]) => ({ id: slugify(service) + '-' + m, group, service, label, desc, months: m, plan: MONTH_PLAN[m], amount: v, paymentType: recurring12 && m === 12 ? 'Recorrente no cartão' : 'Manual' }));
  function slugify(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  const DEFAULT_CATALOG = [
    ...opt('Treino + dieta', 'Planilha de Treino + Dieta', 'Treino + Dieta', 'Planilha de treino + alimentação.', [[1, '350.00'], [3, '650.00'], [6, '1080.00'], [12, '299.90']]),
    ...opt('Consultoria on-line', 'Consultoria Online', 'Consultoria Online', 'Planilha de treino + acompanhamento completo.', [[1, '230.00'], [3, '580.00'], [6, '1020.00'], [12, '179.90']]),
    ...opt('Planilha de treino RM', 'Planilha de Treino RM', 'Treino RM', 'Planilha de treino MFIT com vídeos.', [[1, '190.00'], [3, '480.00'], [6, '850.00'], [12, '159.90']]),
    ...opt('Planos para casal', 'Plano Casal Protocolo RM – 10% Desconto', 'Casal Protocolo RM (10% desconto)', 'Planilha de treino MFIT, com 10% de desconto.', [[1, '180.00']]),
    ...opt('Planos para casal', 'Planilha de Treino Casal', 'Treino Casal', 'Planilha de treino MFIT.', [[1, '280.00'], [3, '690.00'], [6, '1200.00'], [12, '229.00']], true),
    ...opt('Protocolo alimentar / dieta', 'Protocolo Alimentar – Dieta', 'Protocolo Alimentar – Dieta', 'Planejamento alimentar pelo WEB DIET.', [[1, '230.00'], [3, '500.00'], [6, '900.00'], [12, '189.90']], true),
    ...opt('Personal trainer presencial', 'Plano Basic – Personal Trainer (2x/semana)', 'Personal Basic · 2x/semana', 'Musculação 2 vezes por semana.', [[1, '701.25']]),
    ...opt('Personal trainer presencial', 'Plano Silver – Personal Trainer (3x/semana)', 'Personal Silver · 3x/semana', 'Musculação 3 vezes por semana.', [[1, '1062.50']]),
    ...opt('Personal trainer presencial', 'Plano Gold – Personal Trainer (4x/semana)', 'Personal Gold · 4x/semana', 'Musculação 4 vezes por semana.', [[1, '1423.75']]),
    ...opt('Personal trainer presencial', 'Plano Premium – Personal Trainer (5x/semana)', 'Personal Premium · 5x/semana', 'Musculação 5 vezes por semana.', [[1, '1777.92']]),
  ];

  // datas sempre "AAAA-MM-DD", no fuso de Brasília
  function today(d = new Date()) {
    try {
      const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
      const g = t => p.find(x => x.type === t).value; return `${g('year')}-${g('month')}-${g('day')}`;
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const days = (a, b) => (validDate(a) && validDate(b)) ? Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5) : NaN;
  const br = s => validDate(s) ? s.split('-').reverse().join('/') : 'Não informada';
  function addMonths(iso, m) {
    if (!validDate(iso) || !m) return '';
    const [y, mo, d] = iso.split('-').map(Number), t = new Date(Date.UTC(y, mo - 1 + m, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10);
  }
  function addDays(iso, n) { if (!validDate(iso)) return ''; const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // dinheiro: aceita "1.062,50", "1062.50", "R$ 350" → "1062.50"
  function parseMoney(v) {
    let s = String(v ?? '').replace(/[R$\s]/g, ''); if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s); return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null;
  }
  const money = v => { const n = Number(parseMoney(v)); return parseMoney(v) == null ? '' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  const moneyInput = v => { const p = parseMoney(v); return p == null ? String(v ?? '') : Number(p).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  const blank = () => ({ name: '', phone: '', patientId: '', service: '', plan: '', studentStatus: 'Ativo', start: '', end: '', situation: 'Ativo', deadline: '',
    revision1: '', revision2: '', revision3: '', revision1Status: '', revision2Status: '', revision3Status: '', revision1Notes: '', revision2Notes: '', revision3Notes: '',
    amount: '', paymentType: '', paymentMethod: '', paid: false, notes: '', expiryMessage: '', expiryMessageEnd: '', history: [] });

  const revStatus = (r, n) => r[`revision${n}Done`] ? 'Finalizado' : (r[`revision${n}Status`] || '');
  function validate(r) {
    if (!String(r.name || '').trim()) return 'Informe o nome do aluno.';
    if (!String(r.service || '').trim()) return 'Informe o serviço.';
    if (!String(r.plan || '').trim()) return 'Informe o tipo de plano.';
    if (r.start && r.end && r.end < r.start) return 'A data de término deve ser igual ou posterior ao início.';
    if (r.amount && parseMoney(r.amount) == null) return 'Valor inválido. Use, por exemplo, 350,00.';
    return '';
  }
  // treino (troca de treino) × acompanhamento (dieta etc.)
  function isTraining(service) { const t = norm(service); return /treino|personal|casal|postural|reabilita|corre/.test(t) || (!/dieta|nutri|aliment/.test(t) && /planilha|consultoria/.test(t)); }
  const isActive = r => r.studentStatus === 'Ativo' && r.situation === 'Ativo';

  // lembretes: revisões não finalizadas e término do plano até "ahead" dias (atrasados incluídos)
  function reminders(list, t, ahead = 7, includeDone = false) {
    const out = [];
    for (const r of list) {
      if (!isActive(r)) continue;
      for (const n of [1, 2, 3]) {
        const d = r[`revision${n}`], k = days(d, t);
        if (d && Number.isFinite(k) && k <= ahead && (includeDone || revStatus(r, n) !== 'Finalizado')) out.push({ id: `${r.id}:rev:${n}`, kind: 'revision', record: r, date: d, days: k, revision: n });
      }
      const k = days(r.end, t);
      if (r.end && Number.isFinite(k) && k <= ahead) out.push({ id: `${r.id}:end`, kind: 'expiry', record: r, date: r.end, days: k });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.record.name.localeCompare(b.record.name, 'pt-BR') || a.id.localeCompare(b.id));
  }
  // todas as revisões com data (alunos ativos), para a agenda
  function agenda(list) {
    return list.filter(r => r.studentStatus === 'Ativo').flatMap(r => [1, 2, 3].filter(n => r[`revision${n}`]).map(n => ({ record: r, n, date: r[`revision${n}`], status: revStatus(r, n), notes: r[`revision${n}Notes`] || '' }))).sort((a, b) => a.date.localeCompare(b.date));
  }
  const remTitle = x => x.kind === 'expiry' ? 'Vencimento do plano' : isTraining(x.record.service) ? 'Troca de treino' : 'Revisão do acompanhamento';
  const whenTxt = k => k === 0 ? 'Hoje' : k < 0 ? `${-k} ${k === -1 ? 'dia' : 'dias'} em atraso` : `Em ${k} ${k === 1 ? 'dia' : 'dias'}`;
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function message(x, sign = 'TEAMRM — Rosileni Martins') {
    const r = x.record, d = br(x.date), hi = `Olá, ${firstName(r.name)}! Tudo bem?`;
    if (x.kind === 'expiry') {
      if (String(r.expiryMessage || '').trim() && (!r.expiryMessageEnd || r.expiryMessageEnd === r.end)) return r.expiryMessage;
      const w = x.days < 0 ? `terminou em ${d}` : x.days === 0 ? `vence hoje (${d})` : `vence em ${d}`;
      return `${hi}\n\nSeu plano ${r.plan} de ${r.service} ${w}. Vamos conversar sobre a renovação para continuar seu acompanhamento?\n\nConte comigo!\n${sign}`;
    }
    const tr = isTraining(r.service), w = x.days < 0 ? `estava prevista para ${d} e segue pendente` : x.days === 0 ? `está prevista para hoje (${d})` : `está prevista para ${d}`;
    return `${hi}\n\n${tr ? 'A troca do seu treino' : 'A revisão do seu acompanhamento'} ${w}.\n${tr ? 'Como foram os últimos treinos? Me envie seu retorno para ajustarmos a próxima etapa.' : 'Me envie seu retorno sobre a evolução e as dificuldades para ajustarmos a próxima etapa.'}\n\nConte comigo!\n${sign}`;
  }
  function waLink(phone, text) {
    let d = String(phone || '').replace(/\D/g, ''); if (!d) return '';
    if (d.length <= 11) d = '55' + d.replace(/^0+/, '');
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  }
  // sugere 3 datas de revisão (troca de treino) a cada N dias a partir do início, dentro do plano
  function suggestRevisions(r) {
    if (!validDate(r.start)) return [];
    const step = parseInt(r.deadline) || 30, out = [];
    for (let i = 1; i <= 3; i++) { const d = addDays(r.start, step * i); if (r.end && d > r.end) break; out.push(d); }
    return out;
  }
  // renovação: guarda o período atual no histórico e abre o próximo
  function renew(r, months, t) {
    const prev = { service: r.service, plan: r.plan, start: r.start, end: r.end, amount: r.amount, paymentType: r.paymentType, paymentMethod: r.paymentMethod, paid: !!r.paid,
      revisions: [1, 2, 3].map(n => ({ date: r[`revision${n}`], status: revStatus(r, n), notes: r[`revision${n}Notes`] })).filter(x => x.date), closedAt: t };
    const start = r.end && r.end >= t ? addDays(r.end, 1) : t;
    const m = months || PLAN_MONTHS[r.plan] || 1;
    const nx = { ...r, history: [...(r.history || []), prev], start, end: addDays(addMonths(start, m), -1), situation: 'Ativo', studentStatus: 'Ativo', paid: false, expiryMessage: '', expiryMessageEnd: '' };
    for (const n of [1, 2, 3]) { nx[`revision${n}`] = ''; nx[`revision${n}Status`] = ''; nx[`revision${n}Notes`] = ''; delete nx[`revision${n}Done`]; }
    suggestRevisions(nx).forEach((d, i) => nx[`revision${i + 1}`] = d);
    return nx;
  }
  function stats(list, t) {
    const act = list.filter(r => r.studentStatus === 'Ativo');
    return {
      total: list.length, active: act.length,
      expiring: list.filter(r => isActive(r) && r.end && days(r.end, t) >= 0 && days(r.end, t) <= 7).length,
      overdue: list.filter(r => isActive(r) && r.end && days(r.end, t) < 0).length,
      revWeek: agenda(list).filter(x => x.status !== 'Finalizado' && days(x.date, t) >= 0 && days(x.date, t) <= 7).length,
      revLate: agenda(list).filter(x => x.status !== 'Finalizado' && days(x.date, t) < 0).length,
      monthly: act.reduce((s, r) => { const v = Number(parseMoney(r.amount)); const m = PLAN_MONTHS[r.plan] || 1; return s + (Number.isFinite(v) ? v / m : 0); }, 0),
      unpaid: act.filter(r => r.situation === 'Pendente' || (parseMoney(r.amount) != null && !r.paid)).length,
    };
  }

  /* ---------- CSV: mesmas colunas do controle de alunos (importa a planilha exportada de lá) ---------- */
  const COLS = [['NOME DO CLIENTE', 'name'], ['QUAL SERVIÇO', 'service'], ['TIPO DE PLANO', 'plan'], ['DATA DE EFETIVAÇÃO DO SERVIÇO', 'start'], ['DATA DE TÉRMINO DO PACOTE', 'end'],
    ['REVISÃO 1', 'revision1'], ['REVISÃO 2', 'revision2'], ['REVISÃO 3', 'revision3'], ['SITUAÇÃO', 'situation'], ['VALOR DO CLIENTE (R$)', 'amount'], ['TIPO DE PAGAMENTO', 'paymentType'],
    ['FORMA DE PAGAMENTO', 'paymentMethod'], ['PAGAMENTO EM DIA', 'paid'], ['STATUS DO ALUNO', 'studentStatus'], ['PRAZO DE VENCIMENTO', 'deadline'], ['TELEFONE', 'phone'],
    ['REVISÃO 1 CONCLUÍDA', 'revision1Done'], ['REVISÃO 2 CONCLUÍDA', 'revision2Done'], ['REVISÃO 3 CONCLUÍDA', 'revision3Done'], ['OBSERVAÇÕES', 'notes'],
    ['SITUAÇÃO DO TREINO 1', 'revision1Status'], ['OBSERVAÇÃO DO TREINO 1', 'revision1Notes'], ['SITUAÇÃO DO TREINO 2', 'revision2Status'], ['OBSERVAÇÃO DO TREINO 2', 'revision2Notes'],
    ['SITUAÇÃO DO TREINO 3', 'revision3Status'], ['OBSERVAÇÃO DO TREINO 3', 'revision3Notes'], ['MENSAGEM DE VENCIMENTO', 'expiryMessage'], ['VENCIMENTO DA MENSAGEM SALVA', 'expiryMessageEnd']];
  const DATE_KEYS = new Set(['start', 'end', 'revision1', 'revision2', 'revision3', 'expiryMessageEnd']);
  function cell(v) { let t = typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v ?? ''); if (/^\s*[=+\-@]/.test(t) || /^[\t\r\n]/.test(t)) t = "'" + t; return '"' + t.replaceAll('"', '""') + '"'; }
  function toCSV(list) {
    const val = (r, k) => k === 'amount' ? (parseMoney(r.amount) ?? '').replace('.', ',') : DATE_KEYS.has(k) ? (validDate(r[k]) ? br(r[k]) : '') : /^revision\dDone$/.test(k) ? revStatus(r, +k[8]) === 'Finalizado' : k === 'paid' ? !!r.paid : r[k];
    return '﻿' + [COLS.map(c => cell(c[0])).join(';'), ...list.map(r => COLS.map(([, k]) => cell(val(r, k))).join(';'))].join('\r\n');
  }
  function splitCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  function toISO(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (validDate(s)) return s;
    const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (!m) return '';
    const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  function fromCSV(text) {
    const rows = splitCSV(text); if (rows.length < 2) return [];
    const head = rows[0].map(h => norm(h).trim()), idx = {};
    for (const [label, key] of COLS) { const i = head.indexOf(norm(label)); if (i >= 0) idx[key] = i; }
    if (idx.name == null) throw new Error('a planilha não tem a coluna "NOME DO CLIENTE"');
    const yes = v => /^(sim|s|true|1|x)$/i.test(String(v).trim());
    return rows.slice(1).map(cols => {
      const r = blank();
      for (const [key, i] of Object.entries(idx)) {
        let v = String(cols[i] ?? '').replace(/^'(?=[=+\-@])/, '').trim();
        if (DATE_KEYS.has(key)) v = toISO(v);
        else if (key === 'amount') v = parseMoney(v) ?? '';
        else if (/Done$/.test(key) || key === 'paid') v = yes(v);
        r[key] = v;
      }
      for (const n of [1, 2, 3]) { if (r[`revision${n}Done`]) r[`revision${n}Status`] = 'Finalizado'; delete r[`revision${n}Done`]; }
      if (!SITUATIONS.includes(r.situation)) r.situation = r.situation ? 'Ativo' : 'Ativo';
      if (!STUDENT_STATUS.includes(r.studentStatus)) r.studentStatus = 'Ativo';
      return r;
    }).filter(r => r.name.trim());
  }

  return { SITUATIONS, STUDENT_STATUS, REV_STATUS, PLAN_NAMES, PLAN_MONTHS, DEADLINES, PAY_TYPES, PAY_METHODS, SERVICES, DEFAULT_CATALOG,
    today, days, br, addMonths, addDays, norm, parseMoney, money, moneyInput, blank, revStatus, validate, isTraining, isActive, reminders, agenda, remTitle, whenTxt,
    message, waLink, suggestRevisions, renew, stats, toCSV, fromCSV, splitCSV, toISO, firstName };
})();
if (typeof module !== 'undefined') module.exports = { AL };

/* ================= telas ================= */

const ALUNOS_TABS = [['geral', 'Visão geral'], ['lista', 'Alunos'], ['revisoes', 'Revisões'], ['lembretes', 'Lembretes'], ['valores', 'Valores'], ['exportar', 'Exportar']];
let alState = { tab: 'geral', q: '', filter: 'Ativo', ahead: 7, remTab: 'all', remQ: '', revTab: 'next' };

async function alCatalog() { const c = await Store.get('settings', 'catalog'); return c?.list?.length ? c.list : AL.DEFAULT_CATALOG; }
async function alAll() { return (await Store.all('students')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); }
async function alSave(r) { r.updatedAt = todayISO(); r.createdAt ||= todayISO(); await Store.put('students', r); return r; }
const sitTone = s => ({ Ativo: 'ok', Pendente: 'warn', Pausado: 'na', Encerrado: 'bad' }[s] || 'na');
const dueTone = k => !Number.isFinite(k) ? 'na' : k < 0 ? 'bad' : k <= 7 ? 'warn' : 'ok';
const opts = (list, cur, empty = 'Selecione') => `<option value="">${esc(empty)}</option>` + list.map(v => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('') + (cur && !list.includes(cur) ? `<option selected>${esc(cur)}</option>` : '');

SCREENS.alunos = async ({ tab } = {}) => {
  if (tab) alState.tab = tab;
  const [list, cat, S] = await Promise.all([alAll(), alCatalog(), getSettings()]);
  const t = AL.today();
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Gestão · ${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</span><h1>Alunos</h1></div>
      <button class="btn primary" id="al-new">+ Novo aluno</button></div>
    <div class="tabs al-tabs" role="tablist">${ALUNOS_TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${alState.tab === k}">${esc(l)}</button>`).join('')}</div>
    <div id="al-body" class="stack" style="gap:16px"></div>`;
  $('#al-new').onclick = () => go('alunoForm', {});
  $$('[data-tab]').forEach(b => b.onclick = () => { alState.tab = b.dataset.tab; go('alunos'); });
  const body = $('#al-body');
  const R = { geral: alGeral, lista: alLista, revisoes: alRevisoes, lembretes: alLembretes, valores: alValores, exportar: alExportar }[alState.tab] || alGeral;
  await R(body, list, t, cat, S);
};

/* ---------- visão geral ---------- */
async function alGeral(body, list, t) {
  const s = AL.stats(list, t), rem = AL.reminders(list, t, 7).slice(0, 6), ag = AL.agenda(list).filter(x => x.status !== 'Finalizado' && AL.days(x.date, t) >= 0).slice(0, 5);
  body.innerHTML = list.length ? `
    <div class="kpis">
      <button class="kpi" data-go="lista" data-f="all"><span>Total de cadastros</span><b class="num">${s.total}</b><small>Seu time em um só lugar</small></button>
      <button class="kpi" data-go="lista" data-f="Ativo"><span>Alunos ativos</span><b class="num">${s.active}</b><small>Acompanhamentos ativos</small></button>
      <button class="kpi${s.expiring || s.overdue ? ' hot' : ''}" data-go="lembretes" data-r="expiry"><span>Planos a vencer</span><b class="num">${s.expiring}</b><small>${s.overdue ? `${s.overdue} já vencido${s.overdue > 1 ? 's' : ''}` : 'Nos próximos 7 dias'}</small></button>
      <button class="kpi${s.revLate ? ' hot' : ''}" data-go="revisoes"><span>Revisões da semana</span><b class="num">${s.revWeek}</b><small>${s.revLate ? `${s.revLate} em atraso` : 'Hoje e próximos 7 dias'}</small></button>
      <div class="kpi"><span>Receita mensal estimada</span><b class="num">${esc(s.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}</b><small>Valor dos ativos ÷ meses do plano</small></div>
      <button class="kpi${s.unpaid ? ' hot' : ''}" data-go="lista" data-f="unpaid"><span>Pagamentos a conferir</span><b class="num">${s.unpaid}</b><small>Pendentes ou não marcados como pagos</small></button>
    </div>
    <section class="panel stack"><div class="row spread"><div><h2>Lembretes</h2><span class="muted" style="font-size:.88rem">Próximos 7 dias e pendências · mensagens de troca de treino e renovação</span></div><button class="btn small" data-go="lembretes">Ver todos</button></div>
      ${rem.length ? `<div class="plist">${rem.map(remRow).join('')}</div>` : '<p class="muted" style="margin:0">Nada para os próximos 7 dias. 🎉</p>'}</section>
    <section class="panel stack"><div class="row spread"><h2>Próximas revisões</h2><button class="btn small" data-go="revisoes">Ver agenda</button></div>
      ${ag.length ? `<div class="plist">${ag.map(x => `<button class="prow" data-open="${x.record.id}" style="grid-template-columns:40px 1fr auto"><span class="av">${esc(initials(x.record.name))}</span><span style="min-width:0"><b>${esc(x.record.name)}</b><br><span class="muted" style="font-size:.86rem">Revisão ${x.n} · ${esc(x.record.service)}</span></span><span class="st ${dueTone(AL.days(x.date, t))}">${esc(AL.br(x.date))}</span></button>`).join('')}</div>` : '<p class="muted" style="margin:0">As datas de revisão que você cadastrar aparecem aqui.</p>'}</section>`
    : `<div class="panel empty"><h2>Seu time começa aqui</h2><p class="muted" style="margin:0;max-width:440px">Cadastre alunos e reúna planos, revisões de treino, lembretes e pagamentos em um só lugar. Já tem a planilha do controle de alunos? Importe em <b>Exportar</b>.</p>
      <div class="row" style="justify-content:center"><button class="btn primary" id="al-first">+ Cadastrar primeiro aluno</button><button class="btn" data-go="exportar">Importar planilha</button></div></div>`;
  const f = $('#al-first'); if (f) f.onclick = () => go('alunoForm', {});
  bindRem(body, list, t);
  $$('[data-go]', body).forEach(b => b.onclick = () => { if (b.dataset.f) alState.filter = b.dataset.f; if (b.dataset.r) alState.remTab = b.dataset.r; alState.tab = b.dataset.go; go('alunos'); });
  $$('[data-open]', body).forEach(b => b.onclick = () => go('aluno', { id: b.dataset.open }));
}

/* ---------- lista ---------- */
async function alLista(body, list, t) {
  const F = [['Ativo', 'Ativos'], ['Inativo', 'Inativos'], ['expiring', 'A vencer'], ['unpaid', 'Pagamento'], ['all', 'Todos']];
  body.innerHTML = `<div class="row"><input class="search" id="al-q" type="search" placeholder="Buscar aluno ou serviço" aria-label="Buscar aluno" value="${esc(alState.q)}"></div>
    <div class="chips">${F.map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${alState.filter === k}">${esc(l)}</button>`).join('')}</div><div id="al-list"></div>`;
  const draw = () => {
    const q = AL.norm(alState.q);
    const l = list.filter(r => AL.norm(`${r.name} ${r.service} ${r.phone}`).includes(q)).filter(r => {
      const k = AL.days(r.end, t);
      return alState.filter === 'all' ? true : alState.filter === 'expiring' ? AL.isActive(r) && r.end && k <= 7 : alState.filter === 'unpaid' ? r.studentStatus === 'Ativo' && (r.situation === 'Pendente' || (AL.parseMoney(r.amount) != null && !r.paid)) : r.studentStatus === alState.filter;
    });
    $('#al-list').innerHTML = !list.length ? `<div class="panel empty"><h2>Nenhum aluno ainda</h2><button class="btn primary" id="al-n2">+ Novo aluno</button></div>`
      : !l.length ? '<div class="panel empty muted">Nenhum aluno encontrado.</div>'
      : `<p class="muted" style="margin:0 0 8px;font-size:.88rem">${l.length} aluno${l.length > 1 ? 's' : ''}</p><div class="plist">${l.map(r => {
        const k = AL.days(r.end, t);
        return `<button class="prow alrow" data-open="${r.id}"><span class="av">${esc(initials(r.name))}</span>
          <span style="min-width:0"><b>${esc(r.name)}</b>${r.studentStatus === 'Inativo' ? ' <span class="tag">Inativo</span>' : ''}<br><span class="muted" style="font-size:.86rem">${esc(r.service || 'Sem serviço')}${r.plan ? ' · ' + esc(r.plan) : ''}</span></span>
          <span class="almeta"><span class="st ${sitTone(r.situation)}">${esc(r.situation || '—')}</span>
          ${r.end ? `<span class="st ${r.studentStatus === 'Ativo' ? dueTone(k) : 'na'}" title="Término do plano">${k < 0 && r.studentStatus === 'Ativo' ? 'Venceu ' : 'Até '}${esc(AL.br(r.end))}</span>` : ''}
          ${AL.parseMoney(r.amount) != null ? `<span class="num muted" style="font-size:.84rem">${esc(AL.money(r.amount))}${r.paid ? ' ✓' : ''}</span>` : ''}</span></button>`; }).join('')}</div>`;
    $$('[data-open]').forEach(b => b.onclick = () => go('aluno', { id: b.dataset.open }));
    const n2 = $('#al-n2'); if (n2) n2.onclick = () => go('alunoForm', {});
  };
  $('#al-q').oninput = e => { alState.q = e.target.value; draw(); };
  $$('[data-f]', body).forEach(b => b.onclick = () => { alState.filter = b.dataset.f; $$('[data-f]', body).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
  draw();
}

/* ---------- revisões (agenda de troca de treino) ---------- */
async function alRevisoes(body, list, t) {
  const all = AL.agenda(list);
  const groups = { late: all.filter(x => x.status !== 'Finalizado' && AL.days(x.date, t) < 0), next: all.filter(x => x.status !== 'Finalizado' && AL.days(x.date, t) >= 0), done: all.filter(x => x.status === 'Finalizado').reverse() };
  const T = [['next', 'Próximas'], ['late', 'Em atraso'], ['done', 'Concluídas']];
  body.innerHTML = `<p class="muted" style="margin:0">Registre se o treino está <b>a prescrever</b>, <b>prescrito</b> ou <b>finalizado</b> e acrescente observações. Revisões finalizadas saem dos lembretes.</p>
    <div class="chips">${T.map(([k, l]) => `<button class="chip" data-rt="${k}" aria-pressed="${alState.revTab === k}">${esc(l)} <span class="num">${groups[k].length}</span></button>`).join('')}</div>
    <div id="rv"></div>`;
  const draw = () => {
    const g = groups[alState.revTab];
    $('#rv').innerHTML = g.length ? `<div class="plist">${g.map(x => `<div class="prow arow rvrow"><span style="min-width:0"><b>${esc(x.record.name)}</b> <span class="muted" style="font-size:.86rem">· Revisão ${x.n}</span><br>
        <span class="muted" style="font-size:.86rem">${esc(x.record.service)} · ${esc(AL.br(x.date))} · ${esc(AL.whenTxt(AL.days(x.date, t)))}</span>${x.notes ? `<br><span style="font-size:.86rem">${esc(x.notes)}</span>` : ''}</span>
        <span class="row" style="gap:6px;justify-content:flex-end"><select class="rvsel" data-id="${x.record.id}" data-n="${x.n}" aria-label="Situação da revisão ${x.n} de ${esc(x.record.name)}">${opts(AL.REV_STATUS, x.status, 'Não informada')}</select>
        <button class="btn small" data-note="${x.record.id}" data-n="${x.n}">Observação</button><button class="btn small ghost" data-open="${x.record.id}">Ficha</button></span></div>`).join('')}</div>`
      : `<div class="panel empty muted">${alState.revTab === 'late' ? 'Nenhuma revisão em atraso.' : alState.revTab === 'done' ? 'Nenhuma revisão concluída ainda.' : 'Nenhuma revisão agendada. Cadastre as datas na ficha do aluno.'}</div>`;
    $$('.rvsel').forEach(s => s.onchange = async () => { const r = list.find(x => x.id === s.dataset.id); await setRev(r, +s.dataset.n, s.value); toast('Situação salva'); go('alunos'); });
    $$('[data-note]').forEach(b => b.onclick = () => { const r = list.find(x => x.id === b.dataset.note); revNote(r, +b.dataset.n); });
    $$('[data-open]', $('#rv')).forEach(b => b.onclick = () => go('aluno', { id: b.dataset.open }));
  };
  $$('[data-rt]').forEach(b => b.onclick = () => { alState.revTab = b.dataset.rt; $$('[data-rt]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
  draw();
}
async function setRev(r, n, status) { r[`revision${n}Status`] = status; delete r[`revision${n}Done`]; await alSave(r); }
function revNote(r, n, after) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(r.name)} · Revisão ${n} · ${esc(AL.br(r[`revision${n}`]))}</span><h2>Situação e observação do treino</h2></div>
    <label class="f">Situação<select id="rn-s">${opts(AL.REV_STATUS, AL.revStatus(r, n), 'Não informada')}</select></label>
    <label class="f">Observação<textarea id="rn-t" rows="4" maxlength="1000" placeholder="Detalhes desta revisão…">${esc(r[`revision${n}Notes`] || '')}</textarea></label>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Salvar</button></div></form>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('form', m).onsubmit = async e => { e.preventDefault(); r[`revision${n}Notes`] = $('#rn-t', m).value.trim(); await setRev(r, n, $('#rn-s', m).value); m.remove(); toast('Situação e observação salvas'); after ? after() : go('alunos'); };
}

/* ---------- lembretes e mensagens ---------- */
function remRow(x) {
  return `<div class="prow arow"><span style="min-width:0"><b>${esc(x.record.name)}</b><br><span class="muted" style="font-size:.86rem">${esc(AL.remTitle(x))}${x.revision ? ' ' + x.revision : ''} · ${esc(x.record.service)} · ${esc(AL.br(x.date))}</span></span>
    <span class="row" style="gap:6px;justify-content:flex-end"><span class="st ${dueTone(x.days)}">${esc(AL.whenTxt(x.days))}</span><button class="btn small primary" data-msg="${esc(x.id)}">Mensagem</button>${x.kind === 'revision' ? `<button class="btn small" data-rn="${esc(x.id)}">Situação</button>` : `<button class="btn small" data-renew="${x.record.id}">Renovar</button>`}</span></div>`;
}
function bindRem(root, list, t, after) {
  const all = AL.reminders(list, t, 400, true), find = id => all.find(x => x.id === id);
  $$('[data-msg]', root).forEach(b => b.onclick = () => { const x = find(b.dataset.msg); if (x) msgBox(x, after); });
  $$('[data-rn]', root).forEach(b => b.onclick = () => { const x = find(b.dataset.rn); if (x) revNote(x.record, x.revision, after); });
  $$('[data-renew]', root).forEach(b => b.onclick = () => { const r = list.find(y => y.id === b.dataset.renew); if (r) renewBox(r, after); });
}
async function alLembretes(body, list, t) {
  const h = AL.reminders(list, t, alState.ahead), fin = AL.reminders(list, t, alState.ahead, true).filter(x => x.kind === 'revision' && AL.revStatus(x.record, x.revision) === 'Finalizado');
  const T = [['all', 'Todos', h.length], ['revision', 'Troca / revisão', h.filter(x => x.kind === 'revision').length], ['expiry', 'Vencimentos', h.filter(x => x.kind === 'expiry').length], ['late', 'Em atraso', h.filter(x => x.days < 0).length], ['finalized', 'Finalizados', fin.length]];
  body.innerHTML = `<div class="row spread"><p class="muted" style="margin:0;flex:1;min-width:220px">Trocas de treino e renovações no momento certo. Toque em <b>Mensagem</b> para copiar ou enviar pelo WhatsApp.</p>
      <label class="f" style="min-width:170px">Mostrar datas dos próximos<select id="ahead">${[3, 7, 15, 30].map(d => `<option value="${d}"${d === alState.ahead ? ' selected' : ''}>${d} dias</option>`).join('')}</select></label></div>
    <div class="chips">${T.map(([k, l, n]) => `<button class="chip" data-rt="${k}" aria-pressed="${alState.remTab === k}">${esc(l)} <span class="num">${n}</span></button>`).join('')}</div>
    <input class="search" id="rq" type="search" placeholder="Buscar aluno…" aria-label="Buscar aluno nos lembretes" value="${esc(alState.remQ)}"><div id="rl"></div>`;
  const draw = () => {
    const k = alState.remTab, q = AL.norm(alState.remQ);
    const l = (k === 'finalized' ? fin : h).filter(x => (k === 'finalized' || k === 'all' || k === x.kind || (k === 'late' && x.days < 0)) && AL.norm(`${x.record.name} ${x.record.service}`).includes(q));
    $('#rl').innerHTML = l.length ? `<div class="plist">${l.map(remRow).join('')}</div>` : '<div class="panel empty muted">Nenhum lembrete nesta seleção.</div>';
    bindRem($('#rl'), list, t);
  };
  $('#ahead').onchange = e => { alState.ahead = +e.target.value; go('alunos'); };
  $$('[data-rt]').forEach(b => b.onclick = () => { alState.remTab = b.dataset.rt; $$('[data-rt]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
  $('#rq').oninput = e => { alState.remQ = e.target.value; draw(); };
  draw();
}
async function msgBox(x, after) {
  const S = await getSettings(), sign = `TEAMRM — ${S.professional || 'Rosileni Martins'}`;
  const r = x.record, text = AL.message(x, sign), wa = !!String(r.phone || '').replace(/\D/g, '');
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:520px"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(AL.remTitle(x))} · ${esc(AL.whenTxt(x.days))}</span><h2>Mensagem para ${esc(r.name)}</h2></div>
    <label class="f">Sugestão pronta — edite à vontade<textarea id="mb-t" rows="9">${esc(text)}</textarea></label>
    ${x.kind === 'expiry' ? '<label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="mb-save"> Guardar este texto como mensagem de vencimento deste aluno</label>' : ''}
    <div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn" data-x>Fechar</button><button class="btn" id="mb-copy">Copiar</button>${wa ? '<button class="btn primary" id="mb-wa">Enviar no WhatsApp</button>' : ''}</div>
    ${wa ? '' : '<p class="muted" style="margin:0;font-size:.85rem">Cadastre o telefone do aluno para enviar direto pelo WhatsApp.</p>'}</div>`;
  document.body.appendChild(m);
  const saveIf = async () => { const c = $('#mb-save', m); if (c?.checked) { r.expiryMessage = $('#mb-t', m).value; r.expiryMessageEnd = r.end; await alSave(r); toast('Mensagem salva para este aluno'); } };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('#mb-copy', m).onclick = async () => { copyText($('#mb-t', m).value); await saveIf(); };
  const w = $('#mb-wa', m); if (w) w.onclick = async () => { window.open(AL.waLink(r.phone, $('#mb-t', m).value), '_blank', 'noopener'); await saveIf(); };
}
async function renewBox(r, after) {
  const cat = await alCatalog(), t = AL.today();
  const same = cat.filter(c => c.service === r.service);
  const months = AL.PLAN_MONTHS[r.plan] || 1;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="panel" role="dialog" aria-modal="true" style="max-width:480px"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(r.name)} · ${esc(r.service)}</span><h2>Renovar plano</h2></div>
    <p class="muted" style="margin:0">O período atual (${esc(AL.br(r.start))} a ${esc(AL.br(r.end))}) fica guardado no histórico. O novo começa ${r.end && r.end >= t ? 'no dia seguinte ao término' : 'hoje'} e as revisões são sugeridas a cada ${esc(r.deadline || '30 dias')}.</p>
    <label class="f">Plano<select id="rw-p">${AL.PLAN_NAMES.map(p => `<option${p === (r.plan || 'Mensal') ? ' selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="f">Valor (R$)<input id="rw-v" inputmode="decimal" value="${esc(AL.moneyInput(r.amount))}"></label>
    ${same.length ? `<p class="muted" style="margin:0;font-size:.85rem">Tabela: ${same.map(c => `${esc(c.plan)} ${esc(AL.money(c.amount))}`).join(' · ')}</p>` : ''}
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Renovar</button></div></form>`;
  document.body.appendChild(m);
  $('#rw-p', m).onchange = e => { const c = same.find(x => x.plan === e.target.value); if (c) $('#rw-v', m).value = AL.moneyInput(c.amount); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const plan = $('#rw-p', m).value, v = $('#rw-v', m).value;
    if (v && AL.parseMoney(v) == null) return toast('Valor inválido');
    const nx = AL.renew({ ...r, plan }, AL.PLAN_MONTHS[plan] || months, t); nx.amount = AL.parseMoney(v) ?? ''; nx.plan = plan;
    await alSave(nx); m.remove(); toast(`Plano renovado até ${AL.br(nx.end)}`); after ? after() : go('aluno', { id: r.id });
  };
}

/* ---------- tabela de valores ---------- */
async function alValores(body, list, t, cat) {
  const groups = [...new Set(cat.map(c => c.group))];
  body.innerHTML = `<p class="muted" style="margin:0">Valores usados ao escolher o serviço no cadastro (botão “Usar valor e pagamento”). Altere quando reajustar seus preços — os alunos já cadastrados não mudam.</p>
    <form id="vf" class="stack">${groups.map(g => `<section class="panel stack"><h2>${esc(g)}</h2><div class="tbl-wrap"><table><thead><tr><th>Serviço</th><th>Plano</th><th style="text-align:right">Valor (R$)</th><th></th></tr></thead><tbody>
      ${cat.map((c, i) => c.group !== g ? '' : `<tr><td>${esc(c.label)}<span class="ref">${esc(c.desc || '')}</span></td><td>${esc(c.plan)}${c.paymentType === 'Recorrente no cartão' ? '<span class="ref">Recorrente no cartão</span>' : ''}</td>
        <td class="v"><input class="vin" data-i="${i}" inputmode="decimal" value="${esc(AL.moneyInput(c.amount))}" aria-label="Valor de ${esc(c.label)} ${esc(c.plan)}"></td><td><button type="button" class="btn small ghost danger" data-rm="${i}" aria-label="Remover ${esc(c.label)} ${esc(c.plan)}">✕</button></td></tr>`).join('')}</tbody></table></div></section>`).join('')}
    <details class="panel"><summary><b>+ Adicionar serviço ou plano</b></summary><div class="grid-form" style="margin-top:12px">
      <label class="f">Grupo<input id="va-g" list="va-gl" placeholder="Ex.: Avaliação postural"><datalist id="va-gl">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></label>
      <label class="f">Serviço (nome completo)<input id="va-s" list="va-sl"><datalist id="va-sl">${AL.SERVICES.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
      <label class="f">Nome curto<input id="va-l"></label>
      <label class="f">Plano<select id="va-p">${AL.PLAN_NAMES.map(p => `<option>${p}</option>`).join('')}</select></label>
      <label class="f">Valor (R$)<input id="va-v" inputmode="decimal" placeholder="0,00"></label>
      <label class="f">Pagamento<select id="va-t">${AL.PAY_TYPES.map(p => `<option>${p}</option>`).join('')}</select></label>
      <div class="row" style="align-items:flex-end"><button type="button" class="btn" id="va-add">Adicionar</button></div></div></details>
    <div class="row spread"><button type="button" class="btn ghost" id="v-reset">Restaurar valores originais</button><button class="btn primary">Salvar valores</button></div></form>`;
  const store = async l => { await Store.put('settings', { id: 'catalog', list: l }); };
  $$('[data-rm]', body).forEach(b => b.onclick = async () => { const l = [...cat]; l.splice(+b.dataset.rm, 1); await store(l); toast('Removido'); go('alunos'); });
  $('#va-add').onclick = async () => {
    const s = $('#va-s').value.trim(), v = AL.parseMoney($('#va-v').value), p = $('#va-p').value;
    if (!s || v == null) return toast('Informe o serviço e o valor');
    const l = [...cat, { id: uid(), group: $('#va-g').value.trim() || 'Outros', service: s, label: $('#va-l').value.trim() || s, desc: '', months: AL.PLAN_MONTHS[p], plan: p, amount: v, paymentType: $('#va-t').value }];
    await store(l); toast('Adicionado'); go('alunos');
  };
  $('#v-reset').onclick = async () => { if (await confirmBox('Restaurar valores originais?', 'A tabela volta aos valores padrão. Alunos cadastrados não mudam.', 'Restaurar')) { await Store.del('settings', 'catalog'); go('alunos'); } };
  $('#vf').onsubmit = async e => {
    e.preventDefault(); const l = cat.map(c => ({ ...c }));
    for (const inp of $$('.vin', body)) { const v = AL.parseMoney(inp.value); if (v == null) { inp.focus(); return toast('Valor inválido'); } l[+inp.dataset.i].amount = v; }
    await store(l); toast('Valores salvos');
  };
}

/* ---------- exportar / importar ---------- */
async function alExportar(body, list) {
  body.innerHTML = `<section class="panel stack"><h2>Exportar planilha</h2><p class="muted" style="margin:0">Arquivo CSV com todos os alunos (abre no Excel, Google Planilhas e Numbers). As mesmas colunas do controle de alunos.</p>
      <div class="row"><button class="btn primary" id="ex-csv" ${list.length ? '' : 'disabled'}>Baixar planilha (${list.length} aluno${list.length === 1 ? '' : 's'})</button></div></section>
    <section class="panel stack"><h2>Importar planilha</h2><p class="muted" style="margin:0">Traga os alunos do controle de alunos antigo: lá, toque em <b>Exportar dados</b>, baixe o CSV e escolha o arquivo aqui. Alunos com o mesmo nome são atualizados; os demais são adicionados.</p>
      <div class="row"><label class="btn" style="cursor:pointer">Escolher arquivo CSV<input type="file" id="im-csv" accept=".csv,text/csv,text/plain" hidden></label></div></section>
    <section class="panel stack"><h2>Backup completo</h2><p class="muted" style="margin:0">O backup em Ajustes → Armazenamento agora também inclui os alunos e a tabela de valores.</p><div class="row"><button class="btn" id="ex-set">Abrir Ajustes</button></div></section>`;
  $('#ex-csv').onclick = () => { downloadBlob(new Blob([AL.toCSV(list)], { type: 'text/csv;charset=utf-8' }), `teamrm-alunos-${AL.today()}.csv`); toast('Planilha exportada'); };
  $('#ex-set').onclick = () => go('settings');
  $('#im-csv').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const rows = AL.fromCSV(await f.text()); if (!rows.length) throw new Error('nenhum aluno encontrado no arquivo');
      const byName = new Map(list.map(r => [AL.norm(r.name).trim(), r]));
      const upd = rows.filter(r => byName.has(AL.norm(r.name).trim())).length;
      if (!(await confirmBox('Importar alunos?', `${rows.length} alunos no arquivo: ${rows.length - upd} novos e ${upd} atualizados.`, 'Importar'))) return;
      for (const r of rows) { const old = byName.get(AL.norm(r.name).trim()); await alSave({ ...(old || {}), ...r, id: old?.id || uid(), patientId: old?.patientId || '', history: old?.history || [] }); }
      toast(`${rows.length} alunos importados`); alState.tab = 'lista'; alState.filter = 'all'; go('alunos');
    } catch (err) { toast('Não foi possível importar: ' + err.message, 4500); }
  };
}

/* ---------- ficha do aluno ---------- */
SCREENS.aluno = async ({ id }) => {
  const r = await Store.get('students', id); if (!r) return go('alunos');
  const t = AL.today(), k = AL.days(r.end, t), pt = r.patientId ? await Store.get('patients', r.patientId) : null;
  const rem = AL.reminders([r], t, 400);
  const row = (l, v) => `<div><span class="eyebrow">${esc(l)}</span><div>${v}</div></div>`;
  app.innerHTML = `${back('Alunos')}
    <div class="row spread" style="align-items:flex-start"><div class="row" style="gap:14px"><span class="av" style="width:56px;height:56px;font-size:1.2rem">${esc(initials(r.name))}</span>
      <div class="stack" style="gap:4px"><h1>${esc(r.name)}</h1><span class="row" style="gap:6px"><span class="st ${r.studentStatus === 'Ativo' ? 'ok' : 'na'}">Aluno ${esc(r.studentStatus.toLowerCase())}</span><span class="st ${sitTone(r.situation)}">Pacote ${esc((r.situation || '—').toLowerCase())}</span></span></div></div>
      <div class="row"><button class="btn" id="a-edit">Editar</button><button class="btn danger" id="a-del">Excluir</button></div></div>
    ${rem.length ? `<section class="panel stack"><h2>Lembretes</h2><div class="plist">${rem.map(remRow).join('')}</div></section>` : ''}
    <section class="panel stack"><div class="row spread"><h2>Plano</h2><button class="btn small primary" data-renew="${r.id}">Renovar plano</button></div>
      <div class="infogrid">${row('Serviço', esc(r.service || '—'))}${row('Tipo de plano', esc(r.plan || '—'))}${row('Efetivação do serviço', esc(AL.br(r.start)))}
      ${row('Término do pacote', `${esc(AL.br(r.end))} ${r.end && r.studentStatus === 'Ativo' ? `<span class="st ${dueTone(k)}">${esc(AL.whenTxt(k))}</span>` : ''}`)}${row('Prazo de vencimento', esc(r.deadline || 'Não informado'))}
      ${row('Telefone', r.phone ? `${esc(r.phone)} ${AL.waLink(r.phone, '') ? `<a class="btn small" href="${esc(AL.waLink(r.phone, `Olá, ${AL.firstName(r.name)}!`))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}` : 'Não informado')}</div></section>
    <section class="panel stack"><h2>Pagamento</h2><div class="infogrid">${row('Valor', esc(AL.money(r.amount) || 'Não informado'))}${row('Tipo de pagamento', esc(r.paymentType || 'Não informado'))}${row('Forma de pagamento', esc(r.paymentMethod || 'Não informada'))}
      ${row('Situação', `<label class="switch"><input type="checkbox" id="a-paid"${r.paid ? ' checked' : ''}><span class="sw"></span><span>${r.paid ? 'Pago' : 'A receber'}</span></label>`)}</div></section>
    <section class="panel stack"><h2>Revisões do acompanhamento</h2>
      ${[1, 2, 3].map(n => r[`revision${n}`] ? `<div class="prow arow" style="border:1px solid var(--line);border-radius:8px"><span><b>Revisão ${n}</b> · ${esc(AL.br(r[`revision${n}`]))} <span class="st ${AL.revStatus(r, n) === 'Finalizado' ? 'ok' : AL.revStatus(r, n) === 'Prescrito' ? 'warn' : dueTone(AL.days(r[`revision${n}`], t))}">${esc(AL.revStatus(r, n) || 'Não informada')}</span>${r[`revision${n}Notes`] ? `<br><span class="muted" style="font-size:.88rem">${esc(r[`revision${n}Notes`])}</span>` : ''}</span><button class="btn small" data-rv="${n}">Situação e observação</button></div>` : '').join('') || '<p class="muted" style="margin:0">Sem datas de revisão. Toque em Editar para programar as trocas de treino.</p>'}</section>
    ${r.notes ? `<section class="panel"><span class="eyebrow">Observações</span><p style="margin:6px 0 0;white-space:pre-wrap">${esc(r.notes)}</p></section>` : ''}
    <section class="panel stack"><h2>Avaliação postural</h2>${pt ? `<p class="muted" style="margin:0">Vinculado ao paciente <b>${esc(pt.name)}</b>.</p><div class="row"><button class="btn" id="a-pt">Abrir paciente</button><button class="btn primary" id="a-av">+ Nova avaliação</button></div>`
      : `<p class="muted" style="margin:0">Vincule este aluno a um paciente para ver as avaliações posturais junto do plano.</p><div class="row"><button class="btn" id="a-link">Vincular ou criar paciente</button></div>`}</section>
    ${(r.history || []).length ? `<section class="panel stack"><h2>Histórico de planos</h2><div class="tbl-wrap"><table><thead><tr><th>Período</th><th>Plano</th><th style="text-align:right">Valor</th><th>Revisões</th></tr></thead><tbody>${[...r.history].reverse().map(h => `<tr><td class="num">${esc(AL.br(h.start))} – ${esc(AL.br(h.end))}</td><td>${esc(h.service)}<span class="ref">${esc(h.plan)}${h.paid ? ' · pago' : ''}</span></td><td class="v">${esc(AL.money(h.amount) || '—')}</td><td>${h.revisions.filter(x => x.status === 'Finalizado').length}/${h.revisions.length} finalizadas</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  bindBack('alunos');
  const reload = () => go('aluno', { id });
  bindRem(app, [r], t, reload);
  $('#a-edit').onclick = () => go('alunoForm', { id });
  $('#a-del').onclick = async () => { if (await confirmBox('Excluir aluno?', `${r.name} será apagado deste aparelho (o paciente e as avaliações, se houver, continuam).`)) { await Store.del('students', id); toast('Aluno excluído'); go('alunos'); } };
  $('#a-paid').onchange = async e => { r.paid = e.target.checked; await alSave(r); reload(); };
  $$('[data-rv]').forEach(b => b.onclick = () => revNote(r, +b.dataset.rv, reload));
  const ap = $('#a-pt'); if (ap) ap.onclick = () => go('patient', { id: pt.id });
  const av = $('#a-av'); if (av) av.onclick = () => go('patient', { id: pt.id });
  const al = $('#a-link'); if (al) al.onclick = () => linkPatient(r, reload);
};
async function linkPatient(r, after) {
  const pts = (await Store.all('patients')).filter(p => !p.example).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const sug = pts.find(p => AL.norm(p.name).trim() === AL.norm(r.name).trim());
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:480px"><h2>Vincular a paciente</h2>
    <label class="f">Paciente<select id="lp">${`<option value="">Selecione</option>` + pts.map(p => `<option value="${p.id}"${p === sug ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap"><button class="btn" id="lp-new">Criar paciente “${esc(AL.firstName(r.name))}…”</button><span class="row"><button class="btn" data-x>Cancelar</button><button class="btn primary" id="lp-ok">Vincular</button></span></div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  $('#lp-ok', m).onclick = async () => { const v = $('#lp', m).value; if (!v) return toast('Escolha um paciente'); r.patientId = v; await alSave(r); m.remove(); toast('Paciente vinculado'); after(); };
  $('#lp-new', m).onclick = async () => { const p = { id: uid(), name: r.name, birth: '', sex: '', height: '', weight: '', contact: r.phone || '', complaint: '', notes: '', createdAt: todayISO() }; await Store.put('patients', p); r.patientId = p.id; await alSave(r); m.remove(); toast('Paciente criado e vinculado'); after(); };
}

/* ---------- cadastro ---------- */
SCREENS.alunoForm = async ({ id, patientId } = {}) => {
  const old = id ? await Store.get('students', id) : null;
  const r = old ? { ...AL.blank(), ...old } : { ...AL.blank(), id: uid(), patientId: patientId || '' };
  if (!old && patientId) { const p = await Store.get('patients', patientId); if (p) { r.name = p.name; r.phone = p.contact || ''; } }
  for (const n of [1, 2, 3]) if (r[`revision${n}Done`]) { r[`revision${n}Status`] = 'Finalizado'; delete r[`revision${n}Done`]; }
  const [cat, pts] = await Promise.all([alCatalog(), Store.all('patients')]);
  const groups = [...new Set(cat.map(c => c.group))];
  const sel = cat.find(c => c.service === r.service && c.plan === r.plan);
  const D = (k, l) => `<label class="f">${l}<input type="date" id="f-${k}" value="${esc(r[k])}"></label>`;
  app.innerHTML = `${back(old ? 'Voltar ao aluno' : 'Alunos')}<h1>${old ? 'Editar aluno' : 'Novo aluno'}</h1>
    <form class="stack" id="af" novalidate>
      <section class="panel stack"><h2><span class="secn">01</span> Aluno e plano</h2><div class="grid-form">
        <label class="f" style="grid-column:1/-1">Nome do aluno *<input id="f-name" value="${esc(r.name)}" autocomplete="off" placeholder="Nome completo"></label>
        <label class="f" style="grid-column:1/-1">Escolher da tabela de valores<select id="f-cat"><option value="">— Selecione um serviço e plano (opcional) —</option>${groups.map(g => `<optgroup label="${esc(g)}">${cat.filter(c => c.group === g).map(c => `<option value="${esc(c.id)}"${c === sel ? ' selected' : ''}>${esc(c.label)} — ${esc(c.plan)} — ${esc(AL.money(c.amount))}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <div class="row" id="f-catbox" style="grid-column:1/-1" hidden><span class="muted" id="f-catinfo" style="flex:1"></span><button type="button" class="btn small primary" id="f-apply">Usar valor e pagamento</button></div>
        <label class="f">Serviço *<input id="f-service" list="dl-serv" value="${esc(r.service)}" placeholder="Selecione ou digite"></label>
        <label class="f">Tipo de plano *<input id="f-plan" list="dl-plan" value="${esc(r.plan)}" placeholder="Selecione ou digite"></label>
        <label class="f">Status do aluno *<select id="f-studentStatus">${opts(AL.STUDENT_STATUS, r.studentStatus)}</select></label>
        <label class="f">Telefone / WhatsApp<input id="f-phone" type="tel" value="${esc(r.phone)}" placeholder="(35) 99999-0000" maxlength="40"></label>
        <label class="f" style="grid-column:1/-1">Paciente vinculado (avaliações posturais)<select id="f-patientId"><option value="">Nenhum</option>${pts.filter(p => !p.example).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(p => `<option value="${p.id}"${p.id === r.patientId ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      </div></section>
      <section class="panel stack"><h2><span class="secn">02</span> Vigência e revisões</h2><div class="grid-form">
        ${D('start', 'Data de efetivação do serviço')}${D('end', 'Data de término do pacote')}
        <label class="f">Situação do pacote *<select id="f-situation">${opts(AL.SITUATIONS, r.situation)}</select></label>
        <label class="f">Prazo de vencimento / troca<select id="f-deadline">${opts(AL.DEADLINES, r.deadline, 'Selecione o prazo')}</select></label>
      </div>
      <div class="row"><button type="button" class="btn small" id="f-autoend">Calcular término pelo plano</button><button type="button" class="btn small" id="f-autorev">Sugerir datas de revisão</button></div>
      <div class="revgrid">${[1, 2, 3].map(n => `<div class="panel stack" style="background:var(--bg)"><b>Revisão ${n}</b>${D(`revision${n}`, 'Data')}
        <label class="f">Situação<select id="f-revision${n}Status">${opts(AL.REV_STATUS, r[`revision${n}Status`], 'Não informada')}</select></label>
        <label class="f">Observação<textarea id="f-revision${n}Notes" rows="2" maxlength="1000" placeholder="Detalhes desta revisão…">${esc(r[`revision${n}Notes`])}</textarea></label></div>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:.86rem">Use as revisões para programar a troca do treino ou o acompanhamento. Essas datas e o término do pacote aparecem em Lembretes.</p></section>
      <section class="panel stack"><h2><span class="secn">03</span> Pagamento</h2><div class="grid-form">
        <label class="f">Valor do aluno (R$)<input id="f-amount" inputmode="decimal" value="${esc(AL.moneyInput(r.amount))}" placeholder="0,00"></label>
        <label class="f">Tipo de pagamento<input id="f-paymentType" list="dl-ptype" value="${esc(r.paymentType)}" placeholder="Ex.: À vista ou Parcelado"></label>
        <label class="f">Forma de pagamento<input id="f-paymentMethod" list="dl-pmeth" value="${esc(r.paymentMethod)}" placeholder="Ex.: Pix ou Cartão de crédito"></label>
        <label class="switch" style="align-self:end;min-height:40px"><input type="checkbox" id="f-paid"${r.paid ? ' checked' : ''}><span class="sw"></span><span>Pagamento recebido</span></label>
      </div></section>
      <section class="panel stack"><h2><span class="secn">04</span> Observações</h2><label class="f">Anotações (opcional)<textarea id="f-notes" rows="3" maxlength="3000" placeholder="Detalhes importantes sobre este acompanhamento…">${esc(r.notes)}</textarea></label></section>
      <p class="banner warn" id="f-err" hidden></p>
      <div class="row" style="justify-content:flex-end"><span class="muted" style="font-size:.85rem;margin-right:auto">Salvo somente ao confirmar · fica só neste aparelho</span><button type="button" class="btn" id="f-cancel">Cancelar</button><button class="btn primary">Salvar cadastro</button></div>
      <datalist id="dl-serv">${[...new Set([...AL.SERVICES, ...cat.map(c => c.service)])].map(s => `<option value="${esc(s)}">`).join('')}</datalist>
      <datalist id="dl-plan">${AL.PLAN_NAMES.map(s => `<option value="${s}">`).join('')}</datalist>
      <datalist id="dl-ptype">${AL.PAY_TYPES.map(s => `<option value="${s}">`).join('')}</datalist>
      <datalist id="dl-pmeth">${AL.PAY_METHODS.map(s => `<option value="${s}">`).join('')}</datalist>
    </form>`;
  bindBack(old ? 'aluno' : 'alunos', old ? { id } : {});
  $('#f-cancel').onclick = () => old ? go('aluno', { id }) : go('alunos');
  const v = k => $('#f-' + k), cur = () => cat.find(c => c.id === v('cat').value);
  const showCat = () => { const c = cur(); $('#f-catbox').hidden = !c; if (c) $('#f-catinfo').textContent = `${c.desc || c.label} · ${AL.money(c.amount)} · ${c.paymentType}`; };
  v('cat').onchange = () => { const c = cur(); if (c) { v('service').value = c.service; v('plan').value = c.plan; } showCat(); };
  showCat();
  $('#f-apply').onclick = () => { const c = cur(); if (!c) return; v('amount').value = AL.moneyInput(c.amount); v('paymentType').value = c.paymentType; if (c.paymentType === 'Recorrente no cartão') v('paymentMethod').value = 'Cartão de crédito'; toast('Valor e pagamento preenchidos'); };
  v('amount').onblur = () => { const p = AL.parseMoney(v('amount').value); if (p != null) v('amount').value = AL.moneyInput(p); };
  const months = () => AL.PLAN_MONTHS[v('plan').value] || cur()?.months || 0;
  $('#f-autoend').onclick = () => { if (!v('start').value) v('start').value = AL.today(); const m = months(); if (!m) return toast('Escolha um plano (Mensal, Trimestral…)'); v('end').value = AL.addDays(AL.addMonths(v('start').value, m), -1); toast('Término calculado'); };
  $('#f-autorev').onclick = () => {
    if (!v('start').value) return toast('Informe a data de efetivação');
    const s = AL.suggestRevisions({ start: v('start').value, end: v('end').value, deadline: v('deadline').value });
    [1, 2, 3].forEach(n => { if (!v(`revision${n}Status`).value) v(`revision${n}`).value = s[n - 1] || ''; });
    toast(s.length ? `${s.length} data${s.length > 1 ? 's' : ''} sugerida${s.length > 1 ? 's' : ''} (a cada ${v('deadline').value || '30 dias'})` : 'O plano termina antes da 1ª revisão');
  };
  // sem data, a situação da revisão fica travada
  for (const n of [1, 2, 3]) { const sync = () => { v(`revision${n}Status`).disabled = !v(`revision${n}`).value; }; v(`revision${n}`).oninput = sync; v(`revision${n}`).onchange = sync; sync(); }
  $('#af').onsubmit = async e => {
    e.preventDefault();
    const keys = ['name', 'service', 'plan', 'studentStatus', 'phone', 'patientId', 'start', 'end', 'situation', 'deadline', 'paymentType', 'paymentMethod', 'notes', ...[1, 2, 3].flatMap(n => [`revision${n}`, `revision${n}Status`, `revision${n}Notes`])];
    const nx = { ...r }; for (const k of keys) nx[k] = String(v(k).value ?? '').trim();
    for (const n of [1, 2, 3]) if (!nx[`revision${n}`]) nx[`revision${n}Status`] = '';
    nx.amount = AL.parseMoney(v('amount').value) ?? (v('amount').value.trim() ? v('amount').value : ''); nx.paid = v('paid').checked;
    const err = AL.validate(nx);
    if (err) { $('#f-err').textContent = err; $('#f-err').hidden = false; $('#f-err').scrollIntoView({ block: 'center' }); return; }
    await alSave(nx); toast('Cadastro salvo'); go('aluno', { id: nx.id });
  };
  if (!old) v('name').focus();
};

/* resumo para o Início */
async function alunosHomeStrip() {
  const list = await Store.all('students'); if (!list.length) return '';
  const t = AL.today(), rem = AL.reminders(list, t, 7), late = rem.filter(x => x.days < 0).length, today = rem.filter(x => x.days === 0).length;
  if (!rem.length) return '';
  return `<button class="alstrip" id="al-strip"><span class="kicon" aria-hidden="true">🔔</span><span style="min-width:0"><b>${rem.length} lembrete${rem.length > 1 ? 's' : ''} de alunos</b><br><span class="muted" style="font-size:.86rem">${[today ? `${today} para hoje` : '', late ? `${late} em atraso` : '', 'trocas de treino e vencimentos dos próximos 7 dias'].filter(Boolean).join(' · ')}</span></span><span aria-hidden="true">›</span></button>`;
}
