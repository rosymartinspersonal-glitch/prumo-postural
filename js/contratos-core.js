/* TEAMRM — Contratos Personal: regras (sem tela). Calendário de aulas, feriados, valores por mês e por ano,
   modelos de contrato e diretrizes, versão congelada (hash) para assinatura. Testado em tests/contratos.test.js. */
'use strict';

const PC = (() => {
  const DOW = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DOW_S = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const STATUS = { rascunho: 'Rascunho', aguardando: 'Aguardando assinatura', assinado: 'Assinado', vencido: 'Vencido', cancelado: 'Cancelado' };
  const LESSON_ST = { prevista: 'Prevista', realizada: 'Realizada', falta: 'Falta', cancelada: 'Cancelada', reposta: 'Reposta' };
  const OFF_KIND = { feriado: 'Feriado', recesso: 'Recesso', pausa: 'Pausa', reposicao: 'Reposição (aula extra)' };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const dowOf = s => parse(s).getUTCDay();
  const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const br = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('/') : '';
  const round2 = v => Math.round(v * 100) / 100;
  const money = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = v => { if (v === '' || v == null) return null; let s = String(v).replace(/[R$\s]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : null; };

  /* ---------- feriados ---------- */
  function easter(y) {   // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
  }
  const shift = (dt, n) => { const x = new Date(dt); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  // nacionais + Pouso Alegre/MG; Carnaval e Corpus Christi entram como ponto facultativo (sem desconto, editável)
  function holidays(y, city = 'pousoalegre') {
    const E = easter(y), L = [
      [iso(y, 1, 1), 'Confraternização Universal', 'nacional'], [shift(E, -2), 'Paixão de Cristo (Sexta-feira Santa)', 'nacional'],
      [iso(y, 4, 21), 'Tiradentes', 'nacional'], [iso(y, 5, 1), 'Dia do Trabalho', 'nacional'], [iso(y, 9, 7), 'Independência do Brasil', 'nacional'],
      [iso(y, 10, 12), 'Nossa Senhora Aparecida', 'nacional'], [iso(y, 11, 2), 'Finados', 'nacional'], [iso(y, 11, 15), 'Proclamação da República', 'nacional'],
      [iso(y, 11, 20), 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'], [iso(y, 12, 25), 'Natal', 'nacional'],
    ];
    if (city === 'pousoalegre') L.push([iso(y, 8, 6), 'Dia do Senhor Bom Jesus (Padroeiro)', 'municipal'], [iso(y, 10, 19), 'Aniversário de Pouso Alegre', 'municipal']);
    const out = L.map(([date, name, scope]) => ({ id: uid(), date, name, kind: 'feriado', scope, discount: true }));
    out.push({ id: uid(), date: shift(E, -48), name: 'Carnaval (ponto facultativo)', kind: 'feriado', scope: 'facultativo', discount: false },
      { id: uid(), date: shift(E, -47), name: 'Carnaval (ponto facultativo)', kind: 'feriado', scope: 'facultativo', discount: false },
      { id: uid(), date: shift(E, 60), name: 'Corpus Christi (ponto facultativo)', kind: 'feriado', scope: 'facultativo', discount: false });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ---------- calendário ----------
     schedule = { year, start, end, rules: [{ from, days: [{ dow, time, dur, price }] }], offs: [{ date, name, kind, discount }],
                  lessons: { 'AAAA-MM-DD': { status, note, time, dur, price, removed, extra } }, monthly: { 1..12: { value, manual } },
                  plan: 'mensal' | 'anual', fixedMonthly: bool, fixedOverride: number|null } */
  function blankSchedule(year) { return { year, start: iso(year, 1, 1), end: iso(year, 12, 31), rules: [{ id: uid(), from: iso(year, 1, 1), days: [] }], offs: [], lessons: {}, monthly: {}, plan: 'anual', fixedMonthly: true, fixedOverride: null }; }
  // regra vigente numa data (a de "from" mais recente até a data)
  function ruleAt(S, date) { let r = null; for (const x of [...(S.rules || [])].sort((a, b) => a.from.localeCompare(b.from))) if (x.from <= date) r = x; return r || (S.rules || [])[0] || { days: [] }; }
  // todas as aulas do mês: geradas pela recorrência + extras (reposições e aulas manuais)
  function monthLessons(S, y, m) {
    const out = [], offBy = {}; for (const o of S.offs || []) (offBy[o.date] ||= []).push(o);
    for (let d = 1; d <= daysIn(y, m); d++) {
      const date = iso(y, m, d); if ((S.start && date < S.start) || (S.end && date > S.end)) continue;
      const dw = dowOf(date), R = ruleAt(S, date), slot = (R.days || []).find(x => x.dow === dw), ov = S.lessons?.[date] || {}, offs = offBy[date] || [];
      const disc = offs.find(o => o.kind !== 'reposicao' && o.discount), extraOff = offs.find(o => o.kind === 'reposicao');
      if (slot && !ov.removed) out.push({ date, dow: dw, time: ov.time ?? slot.time ?? '', dur: num(ov.dur ?? slot.dur) || 0, price: num(ov.price ?? slot.price) || 0, status: ov.status || 'prevista', note: ov.note || '', planned: true, discounted: !!disc, off: disc || offs[0] || null, extra: false, override: ['time', 'dur', 'price'].some(k => ov[k] != null) });
      else if (ov.extra || extraOff) {
        const base = (R.days || [])[0] || {};
        out.push({ date, dow: dw, time: ov.time ?? base.time ?? '', dur: num(ov.dur ?? base.dur) || 0, price: num(ov.price ?? base.price) || 0, status: ov.status || (extraOff ? 'reposta' : 'prevista'), note: ov.note || (extraOff ? extraOff.name : ''), planned: false, discounted: false, off: extraOff || null, extra: true, override: true });
      }
    }
    return out;
  }
  function monthSummary(S, y, m) {
    const L = monthLessons(S, y, m), planned = L.filter(x => x.planned).length, disc = L.filter(x => x.discounted).length, extra = L.filter(x => x.extra).length;
    const eff = L.filter(x => !x.discounted), calc = round2(eff.reduce((s, x) => s + x.price, 0));
    const mo = S.monthly?.[m], manual = mo && mo.manual && num(mo.value) != null;
    const prices = [...new Set(eff.map(x => x.price))];
    return { m, lessons: L, planned, discounted: disc, extra, effective: eff.length, calc, value: manual ? round2(num(mo.value)) : calc, manual: !!manual, prices };
  }
  function yearSummary(S) {
    const y = S.year, months = []; for (let m = 1; m <= 12; m++) months.push(monthSummary(S, y, m));
    const total = round2(months.reduce((s, x) => s + x.value, 0)), lessons = months.reduce((s, x) => s + x.effective, 0);
    const fixedCalc = round2(total / 12), fixed = S.fixedOverride != null && S.fixedOverride !== '' ? round2(num(S.fixedOverride)) : fixedCalc;
    return { months, total, lessons, fixedCalc, fixed, fixedManual: S.fixedOverride != null && S.fixedOverride !== '' };
  }
  // alteração de uma aula: só esta data, ou esta e as próximas (nova regra a partir da data)
  function editLesson(S, date, ch, scope) {
    if (scope === 'next') {
      const R = ruleAt(S, date), nr = { id: uid(), from: date, days: JSON.parse(JSON.stringify(R.days || [])) };
      const dw = dowOf(date), slot = nr.days.find(x => x.dow === dw);
      if (slot) { for (const k of ['time', 'dur', 'price']) if (ch[k] !== undefined) slot[k] = ch[k]; }
      S.rules = (S.rules || []).filter(x => x.from !== date).concat(nr);
      // as alterações pontuais futuras desse campo deixam de valer (a nova regra manda)
      for (const [d, ov] of Object.entries(S.lessons || {})) if (d >= date && dowOf(d) === dw) for (const k of ['time', 'dur', 'price']) if (ch[k] !== undefined) delete ov[k];
      const rest = { ...ch }; delete rest.time; delete rest.dur; delete rest.price;
      if (Object.keys(rest).length) S.lessons[date] = { ...(S.lessons[date] || {}), ...rest };
    } else S.lessons[date] = { ...(S.lessons[date] || {}), ...ch };
    return S;
  }

  /* ---------- modelos ---------- */
  const F = (label, value = '', opt = true) => ({ id: uid(), type: 'field', label, value, optional: opt });
  const C = (title, text) => ({ id: uid(), type: 'clause', label: title, text });
  function contractTemplate() {
    return [
      { id: uid(), title: 'Contratante (aluno)', items: [F('Nome completo'), F('Telefone')] },
      { id: uid(), title: 'Contratada (profissional)', items: [F('Nome'), F('Registro profissional')] },
      { id: uid(), title: 'Serviço', items: [F('Serviço contratado', 'Personal trainer presencial'), F('Local'), F('Duração da aula'), F('Frequência das aulas'), F('Dias da semana e horários'), F('Início do contrato'), F('Término do contrato')] },
      { id: uid(), title: 'Valores e pagamento', items: [F('Valor por aula'), F('Quantidade de aulas'), F('Valor do plano'), F('Forma de pagamento'), F('Vencimento')] },
      { id: uid(), title: 'Condições', items: [C('Faltas', ''), C('Reposições', ''), C('Cancelamentos', ''), C('Pausas', ''), C('Reajustes', '')] },
      { id: uid(), title: 'Observações e cláusulas adicionais', items: [C('Observações', '')] },
    ];
  }
  // serviços online (consultoria, planilhas, dieta): sem calendário de aulas, com vigência
  function contractTemplateOnline() {
    return [
      { id: uid(), title: 'Contratante (aluno)', items: [F('Nome completo'), F('Telefone')] },
      { id: uid(), title: 'Contratada (profissional)', items: [F('Nome'), F('Registro profissional')] },
      { id: uid(), title: 'Serviço', items: [F('Serviço contratado'), F('Plano'), F('Forma de entrega'), F('Revisões / trocas incluídas'), F('Início do contrato'), F('Término do contrato')] },
      { id: uid(), title: 'Valores e pagamento', items: [F('Valor do plano'), F('Forma de pagamento'), F('Vencimento')] },
      { id: uid(), title: 'Condições', items: [C('Revisões e trocas de treino', ''), C('Prazo de resposta', ''), C('Pausas', ''), C('Cancelamento', ''), C('Reajustes', '')] },
      { id: uid(), title: 'Observações e cláusulas adicionais', items: [C('Observações', '')] },
    ];
  }
  // campos retirados do cadastro do contrato (CPF, e-mail e endereço do aluno; CPF/CNPJ da profissional)
  const REMOVED_FIELDS = { 'Contratante (aluno)': ['CPF', 'E-mail', 'Endereço'], 'Contratada (profissional)': ['CPF/CNPJ'] };
  function stripFields(sections) { let n = 0; for (const s of sections || []) { const rm = REMOVED_FIELDS[s.title]; if (!rm) continue; const before = s.items.length; s.items = s.items.filter(i => !(i.type === 'field' && rm.includes(i.label))); n += before - s.items.length; } return n; }
  const T = (title, html) => ({ id: uid(), title, html });
  function guidelinesTemplateOnline() {
    return [T('Envio do treino / planilha', ''), T('Revisões e trocas de treino', ''), T('Comunicação e prazos de resposta', ''), T('Pagamentos e vencimentos', ''),
      T('Pausas e férias', ''), T('Cancelamento e encerramento', ''), T('Reajustes', ''), T('Responsabilidades do aluno', '')];
  }
  function guidelinesTemplate() {
    return [T('Pontualidade e duração das sessões', ''), T('Pagamentos e vencimentos', ''), T('Faltas e avisos de ausência', ''), T('Reposições', ''), T('Feriados', ''),
      T('Pausas da profissional e do aluno', ''), T('Cancelamento e encerramento', ''), T('Reajustes', ''), T('Comunicação e responsabilidades', '')];
  }

  /* ---------- texto formatado (somente marcas simples) ---------- */
  function sanitize(html) {
    const allowed = /^(b|strong|i|em|u|ul|ol|li|p|br|div|h4)$/i;
    return String(html || '').replace(/<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi, (m, slash, tag) => allowed.test(tag) ? `<${slash}${tag.toLowerCase()}>` : '').replace(/&nbsp;/g, ' ');
  }
  // texto puro com marcadores (para PDF)
  function htmlToLines(html) {
    return sanitize(html).replace(/<li>/g, '\n• ').replace(/<\/(p|div|h4|li|ul|ol)>/g, '\n').replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  /* ---------- versão congelada para assinatura ---------- */
  function canonical(c) {   // só o que o aluno vê e assina
    const S = c.schedule || {};
    return JSON.stringify({ title: c.title, version: c.version, ...(c.kind === 'online' ? { kind: 'online', online: c.online || null } : {}), sections: (c.sections || []).map(s => ({ t: s.title, i: s.items.map(i => [i.type, i.label, i.value ?? '', i.text ?? '']) })),
      schedule: { year: S.year, start: S.start, end: S.end, rules: S.rules, offs: (S.offs || []).map(o => [o.date, o.name, o.kind, !!o.discount]), lessons: S.lessons, monthly: S.monthly, plan: S.plan, fixedMonthly: S.fixedMonthly, fixedOverride: S.fixedOverride },
      guidelines: (c.guidelines || []).map(g => [g.title, sanitize(g.html)]) });
  }
  async function sha256(text) {
    const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8');
    const g = typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : require('crypto').webcrypto.subtle;
    return [...new Uint8Array(await g.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  // situação efetiva (assinado com término passado vira "vencido")
  function statusOf(c, today) { const end = periodOf(c).end; if (c.status === 'assinado' && end && today && end < today) return 'vencido'; return c.status || 'rascunho'; }
  function blankContract(clientId, year, sectionsTpl, guideTpl, kind = 'personal') {
    const on = kind === 'online';
    return { id: uid(), clientId, kind, title: on ? `Serviço online ${year}` : `Contrato de personal ${year}`, version: 1, parentId: null, status: 'rascunho', sections: JSON.parse(JSON.stringify(sectionsTpl || (on ? contractTemplateOnline() : contractTemplate()))),
      schedule: blankSchedule(year), online: on ? { start: iso(year, 1, 1), end: '', months: 1, plan: 'Mensal', amount: null, paymentType: '', paymentMethod: '', due: '' } : null,
      guidelines: JSON.parse(JSON.stringify(guideTpl || (on ? guidelinesTemplateOnline() : guidelinesTemplate()))), docs: [], signing: null, history: [] };
  }
  const periodOf = c => c.kind === 'online' ? { start: c.online?.start || '', end: c.online?.end || '' } : { start: c.schedule?.start || '', end: c.schedule?.end || '' };
  const yearOf = c => +(periodOf(c).start || '').slice(0, 4) || c.schedule?.year;
  return { DOW, DOW_S, MONTHS, STATUS, LESSON_ST, OFF_KIND, uid, iso, br, dowOf, daysIn, money, num, round2, easter, holidays, blankSchedule, ruleAt, monthLessons, monthSummary, yearSummary,
    editLesson, stripFields, contractTemplate, guidelinesTemplate, contractTemplateOnline, guidelinesTemplateOnline, periodOf, yearOf, sanitize, htmlToLines, canonical, sha256, statusOf, blankContract };
})();
if (typeof module !== 'undefined') module.exports = { PC };
