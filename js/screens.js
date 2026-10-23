/* TEAMRM - Posture & Correction — telas. */
'use strict';

const app = $('#app');
function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
function confirmBox(title, body, okLabel = 'Excluir') {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="panel" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(body)}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-x="0">Cancelar</button><button class="btn primary" data-x="1">${esc(okLabel)}</button></div></div>`;
    m.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b || e.target === m) { m.remove(); res(b?.dataset.x === '1'); } });
    document.body.appendChild(m); $('[data-x="1"]', m).focus();
  });
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.appendChild(s); }); }
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const THEME_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>' };
const THEME_LABEL = { auto: 'Tema automático (segue o aparelho)', light: 'Tema claro', dark: 'Tema escuro' };
function applyUnits(S) { UNITS = S.units === 'imperial' ? 'imperial' : 'metric'; }
function copyText(t) { const done = () => toast('Copiado'); try { navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t)); } catch (e) { fallbackCopy(t); } }
function fallbackCopy(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e) { toast('Selecione e copie o texto manualmente'); } ta.remove(); }
function applyPalette(S) {
  const r = document.documentElement, pal = S.palette || 'teamrm', th = S.theme || 'auto';
  if (pal === 'teamrm') delete r.dataset.palette; else r.dataset.palette = pal;
  if (th === 'auto') delete r.dataset.theme; else r.dataset.theme = th;
  try { localStorage.setItem('teamrm-palette', pal === 'teamrm' ? '' : pal); localStorage.setItem('teamrm-theme', th); } catch (e) { }
  const b = document.getElementById('theme-btn');
  if (b) { b.innerHTML = THEME_ICON[th]; b.title = THEME_LABEL[th]; b.setAttribute('aria-label', THEME_LABEL[th] + ' — tocar para trocar'); }
}

/* ---------- navegação ---------- */
let cleanup = null;
const NAV = { home: 'nav-home', patients: 'nav-patients', results: 'nav-results', settings: 'nav-settings', plans: 'nav-plans' };
const SECTION = { home: 'home', exercises: 'home', exercise: 'home', workout: 'home', workouts: 'home', results_db: 'results', settings: 'settings', help: 'settings', legal: 'settings', plans: 'plans' };
function go(name, p = {}) {
  if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
  window.scrollTo(0, 0);
  const sec = SECTION[name] || 'patients';
  for (const k in NAV) { const b = document.getElementById(NAV[k]); if (b) b.setAttribute('aria-current', k === sec ? 'page' : 'false'); }
  return SCREENS[name](p);
}
const back = label => `<div><button class="btn ghost small" data-back>← ${esc(label)}</button></div>`;
function bindBack(name, p) { const b = $('[data-back]'); if (b) b.onclick = () => go(name, p); }
const SCREENS = {};

/* ---------- gráfico de linha simples (uma série, faixa de referência) ---------- */
function lineChartSVG(points, { okRange, unit = '', height = 220, xLabels } = {}) {
  if (!points.length) return '';
  const W = 640, H = height, pl = 48, pr = 16, pt = 14, pb = 30;
  const vs = points.map(p => p.v).concat(okRange ? okRange.filter(x => x > -300 && x < 300) : []);
  let lo = Math.min(...vs), hi = Math.max(...vs); if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = i => pl + (points.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (points.length - 1));
  const Y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
  const ticks = []; const step = niceStep((hi - lo) / 4); for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const band = okRange ? `<rect x="${pl}" y="${Y(Math.min(hi, okRange[1]))}" width="${W - pl - pr}" height="${Math.max(0, Y(Math.max(lo, okRange[0])) - Y(Math.min(hi, okRange[1])))}" fill="var(--ok-bg)"/>` : '';
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const labels = xLabels || points.map(p => p.label);
  const every = Math.ceil(points.length / 6);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Gráfico de evolução" data-pts='${JSON.stringify(points.map((p, i) => ({ x: X(i), y: Y(p.v), v: p.v, l: labels[i] })))}' data-unit="${esc(unit)}">
    ${band}
    ${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end" class="ax">${nf(t, step < 1 ? 1 : 0)}</text>`).join('')}
    ${labels.map((l, i) => i % every === 0 || i === labels.length - 1 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="ax">${esc(l)}</text>` : '').join('')}
    <path d="${path}" fill="none" stroke="var(--accent-text)" stroke-width="2" stroke-linejoin="round"/>
    ${points.length <= 40 ? points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.v)}" r="4" fill="var(--accent-text)" stroke="var(--surface)" stroke-width="2"/>`).join('') : ''}
    <line class="xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/>
  </svg><div class="tip" hidden></div>`;
}
function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
function bindCharts(root = document) {
  $$('svg.chart', root).forEach(svg => {
    const pts = JSON.parse(svg.dataset.pts), unit = svg.dataset.unit, tip = svg.nextElementSibling, xh = $('.xh', svg);
    const wrap = svg.parentElement; wrap.style.position = 'relative';
    const move = e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (640 / r.width);
      let best = pts[0]; for (const p of pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
      xh.setAttribute('x1', best.x); xh.setAttribute('x2', best.x); xh.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.innerHTML = `<b class="num">${nf(best.v)}${esc(unit)}</b><br><span class="muted">${esc(best.l)}</span>`;
      const left = best.x / 640 * r.width; tip.style.left = Math.min(r.width - 120, Math.max(0, left + 10)) + 'px'; tip.style.top = (best.y / svg.viewBox.baseVal.height * r.height - 10) + 'px';
      if (svg._onHover) svg._onHover(pts.indexOf(best));
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
  });
}

/* ---------- pacientes ---------- */
SCREENS.patients = async () => {
  const [pts, ass] = await Promise.all([Store.all('patients'), Store.all('assessments')]);
  pts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const byP = {}; for (const a of ass) (byP[a.patientId] ||= []).push(a);
  app.innerHTML = `${Store.persistent ? '' : '<div class="banner warn">Este navegador não permite armazenamento local. Os dados serão perdidos ao fechar a página. Use o backup em Configurações.</div>'}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Consultório</span><h1>Pacientes</h1></div>
    <button class="btn primary" id="new-p">+ Novo paciente</button></div>
    <div class="tipday"><span class="eyebrow">Dica do dia</span><p style="margin:4px 0 0">${esc(tipOfDay())}</p></div>
    <input class="search" id="q" type="search" placeholder="Buscar por nome" aria-label="Buscar paciente">
    <div id="list"></div>`;
  const draw = q => {
    const list = pts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    $('#list').innerHTML = !pts.length
      ? `<div class="panel empty"><h2>Nenhum paciente ainda</h2><p class="muted" style="margin:0">Cadastre o primeiro paciente para iniciar uma avaliação.</p><button class="btn primary" id="new-p2">+ Novo paciente</button></div>`
      : !list.length ? `<div class="panel empty muted">Nenhum paciente com “${esc(q)}”.</div>`
      : `<div class="plist">${list.map(p => {
          const as = (byP[p.id] || []).sort((a, b) => b.date.localeCompare(a.date)), ag = age(p.birth);
          return `<button class="prow" data-id="${p.id}"><span class="av">${esc(initials(p.name))}</span>
            <span style="min-width:0"><b>${esc(p.name)}</b> ${p.example ? '<span class="tag">Exemplo</span>' : ''}<br>
            <span class="muted" style="font-size:.86rem">${ag != null ? ag + ' anos · ' : ''}${as.length ? as.length + (as.length > 1 ? ' avaliações' : ' avaliação') + ' · última em ' + fmtDate(as[0].date) : 'sem avaliações'}</span></span>
            <span class="muted" aria-hidden="true">›</span></button>`; }).join('')}</div>`;
    $$('.prow').forEach(b => b.onclick = () => go('patient', { id: b.dataset.id }));
    const n2 = $('#new-p2'); if (n2) n2.onclick = () => go('patientForm', {});
  };
  draw(''); $('#q').oninput = e => draw(e.target.value); $('#new-p').onclick = () => go('patientForm', {});
};

SCREENS.patientForm = async ({ id, then }) => {
  const p = id ? await Store.get('patients', id) : { id: uid(), name: '', birth: '', sex: '', height: '', weight: '', contact: '', complaint: '', notes: '', createdAt: todayISO() };
  app.innerHTML = `${back(id ? 'Voltar ao paciente' : 'Pacientes')}
    <h1>${id ? 'Editar paciente' : 'Novo paciente'}</h1>
    <form class="panel stack" id="pf" novalidate>
      <div class="grid-form">
        <label class="f" style="grid-column:1/-1">Nome completo *<input id="f-name" required value="${esc(p.name)}" autocomplete="off"></label>
        <label class="f">Data de nascimento<input id="f-birth" type="date" value="${esc(p.birth)}"></label>
        <label class="f">Sexo<select id="f-sex"><option value="">—</option><option value="F"${p.sex === 'F' ? ' selected' : ''}>Feminino</option><option value="M"${p.sex === 'M' ? ' selected' : ''}>Masculino</option><option value="O"${p.sex === 'O' ? ' selected' : ''}>Outro</option></select></label>
        <label class="f">Altura (${cmUnit()})<input id="f-height" type="number" inputmode="decimal" min="10" max="250" step="0.1" value="${p.height ? +cmOut(p.height).toFixed(1) : ''}"></label>
        <label class="f">Peso (${kgUnit()})<input id="f-weight" type="number" inputmode="decimal" min="2" max="900" step="0.1" value="${p.weight ? +kgOut(p.weight).toFixed(1) : ''}"></label>
        <label class="f" style="grid-column:1/-1">Contato<input id="f-contact" value="${esc(p.contact)}" placeholder="Telefone ou e-mail"></label>
        <label class="f" style="grid-column:1/-1">Queixa principal<textarea id="f-complaint" rows="2">${esc(p.complaint)}</textarea></label>
        <label class="f" style="grid-column:1/-1">Observações<textarea id="f-notes" rows="2">${esc(p.notes)}</textarea></label>
      </div>
      <p class="banner warn" id="f-err" hidden>Informe o nome do paciente.</p>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-cancel>Cancelar</button><button class="btn primary">Salvar paciente</button></div>
    </form>`;
  const leave = () => id ? go('patient', { id }) : go('patients');
  $('[data-back]').onclick = leave; $('[data-cancel]').onclick = leave;
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const name = $('#f-name').value.trim();
    if (!name) { $('#f-err').hidden = false; $('#f-name').focus(); return; }
    Object.assign(p, { name, birth: $('#f-birth').value, sex: $('#f-sex').value, height: (parseFloat($('#f-height').value) || 0) / cmOut(1) || '', weight: (parseFloat($('#f-weight').value) || 0) / kgOut(1) || '', contact: $('#f-contact').value.trim(), complaint: $('#f-complaint').value.trim(), notes: $('#f-notes').value.trim() });
    await Store.put('patients', p); toast('Paciente salvo'); if (then) return startAssessment(p.id, then); go('patient', { id: p.id });
  };
};

function assessSummary(a) {
  const k = kindOf(a);
  if (KINDS[k].video) { const n = Object.keys(a.video?.series || {}).length; return { done: n ? 1 : 0, total: 1, text: n ? `${n} ângulo${n > 1 ? 's' : ''} analisado${n > 1 ? 's' : ''}` : 'Vídeo não analisado' }; }
  const slots = slotsOf(a), done = slots.filter(s => viewReady(a.views[s], s)).length;
  return { done, total: slots.length, text: KINDS[k].dynamic ? `${done} de ${slots.length} medidas` : `${done}/${slots.length} vistas marcadas` };
}

SCREENS.patient = async ({ id }) => {
  const p = await Store.get('patients', id); if (!p) return go('patients');
  const as = (await Store.all('assessments')).filter(a => a.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const ag = age(p.birth), im = bmi(p), sexo = { F: 'Feminino', M: 'Masculino', O: 'Outro' }[p.sex] || '';
  // séries para o gráfico de evolução
  const series = {};
  for (const a of [...as].reverse()) {
    if (KINDS[kindOf(a)].video) continue;
    for (const { slot, m } of allMeasures(a)) {
      const vd = a.views[slot], key = `${kindOf(a)}|${vd?.rom ? 'rom' : slot}|${m.key}`;
      (series[key] ||= { label: `${m.label} · ${slotLabel(a, slot)}`, unit: m.unit, ok: m.ok, pts: [] }).pts.push({ v: m.v, label: fmtDate(a.date) });
    }
  }
  const evoKeys = Object.keys(series).filter(k => series[k].pts.length > 1);
  app.innerHTML = `${back('Pacientes')}
    <div class="row spread" style="align-items:flex-start">
      <div class="row" style="gap:14px;align-items:center"><span class="av" style="width:56px;height:56px;font-size:1.2rem">${esc(initials(p.name))}</span>
        <div class="stack" style="gap:2px"><h1>${esc(p.name)} ${p.example ? '<span class="tag">Exemplo</span>' : ''}</h1>
        <span class="muted">${[ag != null ? ag + ' anos' : '', sexo, p.height ? nf(cmOut(p.height), 0) + ' ' + cmUnit() : '', p.weight ? nf(kgOut(p.weight)) + ' ' + kgUnit() : '', im ? 'IMC ' + nf(im) : ''].filter(Boolean).join(' · ') || 'Sem dados clínicos'}</span></div></div>
      <div class="row"><button class="btn" id="edit">Editar</button><button class="btn danger" id="del">Excluir</button></div>
    </div>
    ${p.complaint ? `<div class="panel"><span class="eyebrow">Queixa principal</span><p style="margin:6px 0 0">${esc(p.complaint)}</p></div>` : ''}
    <div class="row spread"><h2>Avaliações</h2><button class="btn primary" id="new-a">+ Nova avaliação</button></div>
    <div>${as.length ? `<div class="plist">${as.map(a => {
      const s = assessSummary(a), f = KINDS[kindOf(a)].video ? [] : findings(a), bad = f.filter(x => x.m.status === 'bad').length, warn = f.length - bad;
      const same = as.filter(x => kindOf(x) === kindOf(a));
      return `<div class="prow arow"><span style="min-width:0"><b>${esc(KINDS[kindOf(a)].label)}</b> <span class="muted num" style="font-size:.86rem">· ${fmtDate(a.date)}</span><br><span class="muted" style="font-size:.86rem">${s.text}</span>
        ${s.done && !KINDS[kindOf(a)].video ? `<span class="row" style="gap:6px;margin-top:6px">${bad ? `<span class="st bad">${bad} alterado${bad > 1 ? 's' : ''}</span>` : ''}${warn ? `<span class="st warn">${warn} em atenção</span>` : ''}${!f.length ? '<span class="st ok">Sem achados</span>' : ''}</span>` : ''}</span>
        <span class="row" style="gap:6px;justify-content:flex-end">${KINDS[kindOf(a)].video ? `<button class="btn small primary" data-video="${a.id}">Abrir análise</button>` : `<button class="btn small" data-open="${a.id}">Fotos e pontos</button><button class="btn small primary" data-res="${a.id}" ${s.done ? '' : 'disabled'}>Resultados</button>`}
        ${same.length > 1 && !KINDS[kindOf(a)].video ? `<button class="btn small ghost" data-cmp="${a.id}">Comparar</button>` : ''}</span></div>`;
    }).join('')}</div>` : `<div class="panel empty"><h2>Nenhuma avaliação</h2><p class="muted" style="margin:0">Toque em “Nova avaliação” e escolha o tipo de teste.</p></div>`}</div>
    ${evoKeys.length ? `<section class="panel stack"><div class="row spread"><h2>Evolução</h2><label class="f" style="min-width:min(100%,320px)">Medida<select id="evo">${evoKeys.map(k => `<option value="${esc(k)}">${esc(series[k].label)}</option>`).join('')}</select></label></div><div id="evo-chart"></div></section>` : ''}`;
  bindBack('patients');
  $('#edit').onclick = () => go('patientForm', { id });
  $('#del').onclick = async () => {
    if (!(await confirmBox('Excluir paciente?', `${p.name} e as ${as.length} avaliações serão apagados deste aparelho. Essa ação não pode ser desfeita.`))) return;
    for (const a of as) await Store.del('assessments', a.id);
    await Store.del('patients', id); toast('Paciente excluído'); go('patients');
  };
  $('#new-a').onclick = () => pickKind(id);
  $$('[data-open]').forEach(b => b.onclick = () => go('assessment', { id: b.dataset.open }));
  $$('[data-res]').forEach(b => b.onclick = () => go('results', { id: b.dataset.res }));
  $$('[data-video]').forEach(b => b.onclick = () => go('video', { id: b.dataset.video }));
  $$('[data-cmp]').forEach(b => b.onclick = () => { const a = as.find(x => x.id === b.dataset.cmp), prev = as.filter(x => kindOf(x) === kindOf(a) && x.date < a.date)[0] || as.filter(x => kindOf(x) === kindOf(a) && x.id !== a.id)[0]; go('compare', { pid: id, a: prev.id, b: a.id }); });
  const drawEvo = () => { const s = series[$('#evo').value]; $('#evo-chart').innerHTML = `<div style="position:relative">${lineChartSVG(s.pts, { okRange: s.ok, unit: s.unit === '°' ? '°' : s.unit === 'cm' ? ' cm' : s.unit === '%' ? '%' : '' })}</div><p class="muted" style="margin:0;font-size:.82rem">Faixa verde: referência de normalidade.</p>`; bindCharts($('#evo-chart')); };
  if (evoKeys.length) { $('#evo').onchange = drawEvo; drawEvo(); }
};

function pickKind(pid) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:720px;max-height:90vh;overflow:auto">
    <div class="row spread"><h2>Nova avaliação</h2><button class="btn ghost small" data-x>Fechar</button></div>
    <div class="kinds">${Object.entries(KINDS).map(([k, K]) => `<button class="kind" data-k="${k}"><span class="kicon" aria-hidden="true">${esc(K.icon)}</span><span><b>${esc(K.label)}</b><br><span class="muted">${esc(K.desc)}</span></span></button>`).join('')}</div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', async e => {
    if (e.target === m || e.target.closest('[data-x]')) return m.remove();
    const b = e.target.closest('[data-k]'); if (!b) return;
    m.remove();
    if (!Billing.can(await Billing.plan(), b.dataset.k)) return go('plans', { need: b.dataset.k });
    const a = { id: uid(), patientId: pid, kind: b.dataset.k, date: todayISO(), views: {}, order: [], notes: '', conclusion: '', createdAt: todayISO() };
    await Store.put('assessments', a);
    go(KINDS[a.kind].video ? 'video' : 'assessment', { id: a.id });
  });
}

/* ---------- fotos de uma avaliação ---------- */
SCREENS.assessment = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings(), K = KINDS[kindOf(a)];
  const slots = slotsOf(a), done = slots.filter(s => viewReady(a.views[s], s)).length;
  const slotCard = s => {
    const vd = a.views[s], V = getView(s, vd), ready = viewReady(vd, s);
    const val = K.dynamic && ready ? measuresFor(s, vd)[0] : null;
    return `<div class="slot"><div class="thumb">${vd?.img ? `<canvas data-cv="${s}" aria-label="${esc(V.label)}"></canvas>` : `<span class="plumb"></span><span class="eyebrow" style="position:relative;background:var(--sunken);padding:4px 6px">${esc(V.short)}</span>`}</div>
      <div class="meta"><h3>${esc(V.label)}</h3>${val ? `<span class="row" style="gap:6px"><b class="num">${fmtM(val)}</b><span class="st ${val.status}">${STATUS[val.status]}</span></span>` : !vd?.img ? '<span class="st na">Sem foto</span>' : ready ? `<span class="st ok">${Object.keys(vd.points).length} pontos</span>` : '<span class="st warn">Pontos pendentes</span>'}</div>
      <div class="acts"><label class="btn small${vd?.img ? '' : ' primary'}" style="cursor:pointer">📷 ${vd?.img ? 'Nova foto' : 'Tirar foto'}<input type="file" accept="image/*" capture="environment" data-file="${s}" hidden></label><label class="btn small" style="cursor:pointer">🖼️ Galeria<input type="file" accept="image/*" data-file="${s}" hidden></label>
        ${vd?.img ? `<button class="btn small" data-edit="${s}">Ajustar foto</button><button class="btn small" data-mark="${s}">Marcar pontos</button>` : ''}${vd?.img || K.dynamic ? `<button class="btn small ghost danger" data-rm="${s}" aria-label="Remover ${esc(V.label)}">Remover</button>` : ''}</div></div>`;
  };
  const protos = S.protocols || [];
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)}</span><h1>${esc(K.label)}</h1></div>
      <label class="f" style="min-width:160px">Data da avaliação<input id="a-date" type="date" value="${a.date.slice(0, 10)}"></label></div>
    <p class="muted" style="margin:0;max-width:70ch">${K.dynamic ? 'Adicione um movimento, fotografe o paciente na amplitude máxima e marque os pontos do goniômetro.' : esc(K.desc) + ' Câmera parada, sem zoom, com o segmento inteiro no quadro.'}</p>
    ${K.dynamic ? `<div class="panel stack"><div class="row" style="align-items:flex-end">
        <label class="f" style="flex:1;min-width:220px">Movimento<select id="rom-sel">${ROM_PRESETS.map(r => `<option value="${r.id}">${esc(r.label)}${r.normal ? ' · ' + r.normal + '°' : ''} (${esc(r.plane)})</option>`).join('')}</select></label>
        <button class="btn primary" id="rom-add">Adicionar movimento</button></div>
        ${protos.length ? `<div class="row" style="align-items:flex-end"><label class="f" style="flex:1;min-width:220px">Protocolo próprio<select id="proto-sel">${protos.map(r => `<option value="${r.id}">${esc(r.name)} (${r.items.length})</option>`).join('')}</select></label><button class="btn" id="proto-add">Aplicar protocolo</button></div>` : '<p class="muted" style="margin:0;font-size:.85rem">Crie protocolos próprios de ADM em Configurações → Protocolos de amplitude.</p>'}
      </div>` : ''}
    ${slots.length ? `<div class="views">${slots.map(slotCard).join('')}</div>` : K.dynamic ? '<div class="panel empty muted">Nenhum movimento adicionado.</div>' : ''}
    ${K.dynamic && slots.length ? `<div class="panel stack"><h3>Comentários por movimento</h3>${slots.map(s => `<label class="f">${esc(getView(s, a.views[s]).label)}<input data-com="${s}" value="${esc(a.views[s].comment || '')}" placeholder="Ex.: dor no final da amplitude, compensação lombar"></label>`).join('')}</div>` : ''}
    <div class="panel stack"><label class="f">Observações clínicas desta avaliação<textarea id="a-notes" rows="3" placeholder="Condições da coleta, uso de órteses, dor no momento etc.">${esc(a.notes)}</textarea></label></div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" id="see" ${done ? '' : 'disabled'}>Ver resultados (${done}/${slots.length})</button></div>`;
  bindBack('patient', { id: a.patientId });
  for (const s of slots) { const vd = a.views[s]; if (vd?.img) paintInto($(`[data-cv="${s}"]`), getView(s, vd), vd, S); }
  const save = async () => { a.notes = $('#a-notes').value; const d = $('#a-date').value; if (d) a.date = new Date(d + 'T12:00:00').toISOString(); $$('[data-com]').forEach(i => a.views[i.dataset.com].comment = i.value); await Store.put('assessments', a); };
  $('#a-notes').onchange = save; $('#a-date').onchange = save; $$('[data-com]').forEach(i => i.onchange = save);
  const addRom = def => { const s = uid(); a.views[s] = { rom: { ...def }, img: '', points: {}, mask: false, scale: null, comment: '' }; (a.order ||= []).push(s); };
  if (K.dynamic) {
    $('#rom-add').onclick = async () => { await save(); addRom(ROM_PRESETS.find(r => r.id === $('#rom-sel').value)); await Store.put('assessments', a); go('assessment', { id }); };
    const pa = $('#proto-add'); if (pa) pa.onclick = async () => { await save(); const pr = protos.find(x => x.id === $('#proto-sel').value); pr.items.forEach(addRom); await Store.put('assessments', a); toast(`Protocolo “${pr.name}” aplicado`); go('assessment', { id }); };
  }
  $$('[data-file]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    await save();
    const s = inp.dataset.file, old = a.views[s] || {};
    const r = await openPhotoEditor({ blob: f, V: getView(s, old.rom ? old : undefined), title: getView(s, old.rom ? old : undefined).label }); if (!r) return;
    // a foto original fica guardada à parte, para reajustes futuros sem perda de qualidade
    await Store.put('media', { id: `src:${a.id}:${s}`, kind: 'file', blob: f, name: f.name, type: f.type, createdAt: todayISO() });
    a.views[s] = { ...old, img: r.img, edit: { e: r.e, g: r.g }, imgOrig: null, points: {}, mask: false, scale: null };
    await Store.put('assessments', a);
    go('mark', { id, slot: s, auto: true });
  });
  $$('[data-mark]').forEach(b => b.onclick = async () => { await save(); go('mark', { id, slot: b.dataset.mark }); });
  $$('[data-edit]').forEach(b => b.onclick = async () => { await save(); if (await reEditPhoto(a, b.dataset.edit)) go('assessment', { id }); });
  $$('[data-rm]').forEach(b => b.onclick = async () => {
    const s = b.dataset.rm;
    if (!(await confirmBox('Remover?', `A foto e os pontos de “${getView(s, a.views[s]).label}” serão apagados.`, 'Remover'))) return;
    if (K.dynamic) { delete a.views[s]; a.order = (a.order || []).filter(x => x !== s); } else delete a.views[s];
    await Store.del('media', `src:${a.id}:${s}`);
    await Store.put('assessments', a); go('assessment', { id });
  });
  $('#see').onclick = async () => { await save(); go('results', { id }); };
};


/* ---------- marcação de pontos ---------- */
SCREENS.mark = async ({ id, slot, auto }) => {
  const a = await Store.get('assessments', id); const vd = a?.views[slot]; if (!vd?.img) return go('assessment', { id });
  const S = await getSettings(), V = getView(slot, vd), plan = await Billing.plan();
  const lockTag = f => Billing.can(plan, f) ? '' : ' 🔒';
  vd.points ||= {};
  let img = await loadImg(vd.img), IW = img.naturalWidth, IH = img.naturalHeight;
  const st = { sel: null, z: 1, ox: 0, oy: 0, drag: null, k: 1, cssW: 0, cssH: 0, placing: false };
  const allPts = () => [...V.points, ...(vd.scale?.on ? [['reguaA', 'Régua — início'], ['reguaB', 'Régua — fim']] : [])];
  const firstMissing = () => (allPts().find(([k, , o]) => !o && !vd.points[k]) || [])[0] || null;
  const canMask = V.face && !V.noMask && V.face(Object.fromEntries(V.points.map(([k]) => [k, { x: 0, y: 0 }])));

  app.innerHTML = `${back('Fotos da avaliação')}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Marcação de pontos</span><h1>${esc(V.label)}</h1></div></div>
    <p class="muted" style="margin:0;max-width:75ch;font-size:.9rem">${esc(V.hint)}</p>
    <div id="m-msg"></div>
    ${V.rom && vd.rom?.id && ROM_DEMO[vd.rom.id] ? `<details class="panel"><summary><b>Ver demonstração do movimento</b></summary><div class="exdetail" style="margin-top:10px"><div class="exanim">${romDemoSVG(vd.rom.id, 200)}</div><div data-ownvideo></div></div></details>` : ''}
    <div class="mark">
      <div class="stack">
        <div class="stage" id="stage"><canvas id="cv"></canvas><canvas class="loupe" id="loupe" width="264" height="264" hidden></canvas>
          <div class="tools"><button class="btn small" id="zo" aria-label="Diminuir zoom">−</button><button class="btn small" id="zi" aria-label="Aumentar zoom">+</button></div></div>
        <p class="muted" style="margin:0;font-size:.88rem">Arraste um ponto para ajustá-lo. Para posicionar um ponto específico, toque nele na lista e depois na foto. Com zoom, arraste a área vazia para mover a imagem.</p>
      </div>
      <aside class="panel stack">
        <div class="row" style="gap:6px">${V.detect ? '<button class="btn small primary" id="auto">Detectar com IA</button>' : ''}<button class="btn small" id="tpl">Posicionar modelo</button><button class="btn small" id="green">Usar marcadores verdes${lockTag('green')}</button></div>
        <div class="row" style="gap:6px"><button class="btn small" id="bg">${vd.imgOrig ? 'Restaurar fundo' : 'Remover fundo' + lockTag('bg')}</button><button class="btn small" id="clear">Limpar pontos</button><button class="btn small" id="reedit">Ajustar foto</button></div>
        ${canMask ? `<label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="mask" ${vd.mask ? 'checked' : ''}> Ocultar o rosto${lockTag('mask')}</label>` : ''}
        <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="cal" ${vd.scale?.on ? 'checked' : ''}> Calibrar com régua (medidas em cm)</label>
        <label class="f" id="cal-f" ${vd.scale?.on ? '' : 'hidden'}>Comprimento real da régua (${cmUnit()})<input id="cal-cm" type="number" inputmode="decimal" min="0.5" step="0.1" value="${+cmOut(vd.scale?.cm || 100).toFixed(1)}"></label>
        <div><span class="eyebrow">Pontos</span></div>
        <div class="plist2" id="plist" role="list"></div>
        <button class="btn primary" id="done">Concluir</button>
      </aside>
    </div>`;
  bindBack('assessment', { id });
  const cv = $('#cv'), ctx = cv.getContext('2d'), loupe = $('#loupe'), lctx = loupe.getContext('2d'), stage = $('#stage');
  const msg = (t, cls = '') => { $('#m-msg').innerHTML = t ? `<div class="banner ${cls}">${t}</div>` : ''; };
  let saveT = null;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => Store.put('assessments', a), 250); };

  function layout() {
    const availW = stage.parentElement.clientWidth, maxH = Math.max(320, window.innerHeight * 0.72);
    const s0 = Math.min(availW / IW, maxH / IH);
    st.cssW = Math.round(IW * s0); st.cssH = Math.round(IH * s0); st.s0 = s0;
    const dpr = window.devicePixelRatio || 1; st.dpr = dpr;
    cv.width = Math.round(st.cssW * dpr); cv.height = Math.round(st.cssH * dpr);
    cv.style.width = st.cssW + 'px'; cv.style.height = st.cssH + 'px';
    stage.style.width = st.cssW + 'px'; stage.style.maxWidth = '100%'; stage.style.margin = '0 auto';
    clampPan(); draw();
  }
  function clampPan() { const k = st.s0 * st.z; st.k = k; st.ox = Math.max(0, Math.min(IW - st.cssW / k, st.ox)); st.oy = Math.max(0, Math.min(IH - st.cssH / k, st.oy)); }
  function draw() {
    const k = st.k, d = st.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = '#0B0E1A'; ctx.fillRect(0, 0, st.cssW, st.cssH);
    ctx.setTransform(d * k, 0, 0, d * k, -st.ox * k * d, -st.oy * k * d);
    ctx.drawImage(img, 0, 0);
    drawOverlay(ctx, V, vd, img, { lw: 2.2 / k, color: S.lineColor, sel: st.sel, numbers: true });
    renderList();
  }
  const toImg = e => { const r = cv.getBoundingClientRect(); const sx = (e.clientX - r.left) * (st.cssW / r.width), sy = (e.clientY - r.top) * (st.cssH / r.height); return { x: st.ox + sx / st.k, y: st.oy + sy / st.k, sx, sy }; };
  function hit(p) { let best = null, bd = 24 / st.k; for (const [k] of allPts()) { const q = vd.points[k]; if (!q) continue; const d = dist(p, q); if (d < bd) { bd = d; best = k; } } return best; }
  function drawLoupe(p, sx) {
    const Z = 3 * st.k; loupe.hidden = false;
    loupe.style.left = (sx < st.cssW / 2 ? st.cssW - 142 : 10) + 'px';
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.fillStyle = '#0B0E1A'; lctx.fillRect(0, 0, 264, 264);
    lctx.save(); lctx.beginPath(); lctx.arc(132, 132, 132, 0, Math.PI * 2); lctx.clip();
    const s = 2 * Z; lctx.setTransform(s, 0, 0, s, 132 - p.x * s, 132 - p.y * s);
    lctx.drawImage(img, 0, 0); drawOverlay(lctx, V, vd, img, { lw: 1.6 / Z, color: S.lineColor, sel: st.sel, labels: false });
    lctx.restore(); lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.strokeStyle = '#fff'; lctx.lineWidth = 2; lctx.beginPath(); lctx.moveTo(132, 108); lctx.lineTo(132, 156); lctx.moveTo(108, 132); lctx.lineTo(156, 132); lctx.stroke();
  }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = toImg(e), h = hit(p);
    if (st.sel && (st.placing || !vd.points[st.sel]) && !(h && h !== st.sel && !st.placing)) { vd.points[st.sel] = { x: p.x, y: p.y }; st.drag = { type: 'pt', k: st.sel }; st.placing = false; msg(''); drawLoupe(p, p.sx); persist(); }
    else if (h) { st.sel = h; st.drag = { type: 'pt', k: h }; drawLoupe(p, p.sx); }
    else if (st.z > 1) st.drag = { type: 'pan', x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy };
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!st.drag) return; const p = toImg(e);
    if (st.drag.type === 'pt') { vd.points[st.drag.k] = { x: Math.max(0, Math.min(IW, p.x)), y: Math.max(0, Math.min(IH, p.y)) }; draw(); drawLoupe(vd.points[st.drag.k], p.sx); }
    else { st.ox = st.drag.ox - (e.clientX - st.drag.x) / st.k; st.oy = st.drag.oy - (e.clientY - st.drag.y) / st.k; clampPan(); draw(); }
  });
  const end = () => { if (st.drag?.type === 'pt') { persist(); const nx = firstMissing(); if (nx) st.sel = nx; } st.drag = null; loupe.hidden = true; draw(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  const zoom = f => { const cx = st.ox + st.cssW / st.k / 2, cy = st.oy + st.cssH / st.k / 2; st.z = Math.max(1, Math.min(6, st.z * f)); st.k = st.s0 * st.z; st.ox = cx - st.cssW / st.k / 2; st.oy = cy - st.cssH / st.k / 2; clampPan(); draw(); };
  $('#zi').onclick = () => zoom(1.6); $('#zo').onclick = () => zoom(1 / 1.6);

  function renderList() {
    let ms = []; if (readyV(V, vd.points)) try { ms = V.measures(vd.points, scaleOf(vd)); } catch (e) { }
    $('#plist').innerHTML = allPts().map(([k, l, o], i) => `<div class="pt-row"><button class="pt" role="listitem" data-k="${k}" aria-pressed="${st.sel === k}"><i>${k.startsWith('regua') ? 'R' : i + 1}</i><span>${esc(l)}${o ? ' <small>(opcional)</small>' : ''}</span><small>${vd.points[k] ? '✓' : 'pendente'}</small></button>${o && vd.points[k] ? `<button class="btn ghost small" data-rmpt="${k}" aria-label="Remover ${esc(l)}">×</button>` : ''}</div>`).join('')
      + (ms.length ? `<div style="margin-top:10px" class="stack"><span class="eyebrow">Medidas ao vivo</span>${ms.map(m => `<div class="row spread" style="font-size:.86rem;gap:6px"><span style="min-width:0">${esc(m.label)}</span><span class="num">${fmtM(m)}</span></div>`).join('')}</div>` : '');
    $$('.pt', $('#plist')).forEach(b => b.onclick = () => { st.sel = b.dataset.k; st.placing = true; draw(); msg(`Toque na foto para posicionar: <b>${esc(allPts().find(([k]) => k === st.sel)[1])}</b>.`); });
    $$('[data-rmpt]').forEach(b => b.onclick = () => { delete vd.points[b.dataset.rmpt]; persist(); draw(); });
  }
  async function runAuto() {
    const btn = $('#auto'); if (!btn) return; btn.disabled = true; btn.textContent = 'Detectando…';
    msg('Carregando o modelo de IA. Na primeira vez pode levar até 30 segundos; depois funciona offline.');
    try {
      const pts = await detectPoints(V, img);
      for (const k in pts) vd.points[k] = pts[k];
      msg('Pontos detectados. Confira cada um com o zoom: a IA estima centros articulares, e pontos ósseos (EIAS, EIPS, C7) costumam precisar de ajuste.');
    } catch (err) {
      if (!Object.keys(vd.points).length) Object.assign(vd.points, tplPoints(V, IW, IH));
      msg(`A detecção automática não funcionou (${esc(err.message === 'timeout' ? 'tempo esgotado' : err.message)}). Coloquei os pontos numa posição-modelo; arraste cada um até o ponto anatômico.`, 'warn');
    }
    btn.disabled = false; btn.textContent = 'Detectar com IA'; st.sel = firstMissing(); persist(); draw();
  }
  if ($('#auto')) $('#auto').onclick = runAuto;
  $('#tpl').onclick = () => { for (const [k] of V.points) delete vd.points[k]; Object.assign(vd.points, tplPoints(V, IW, IH)); persist(); draw(); msg('Pontos na posição-modelo. Arraste cada um até o ponto anatômico.'); };
  $('#reedit').onclick = async () => { clearTimeout(saveT); await Store.put('assessments', a); if (await reEditPhoto(a, slot)) go('mark', { id, slot }); };
  $('#clear').onclick = () => { for (const [k] of V.points) delete vd.points[k]; st.sel = firstMissing(); persist(); draw(); msg('Pontos apagados. Selecione cada ponto na lista e toque na foto (modo manual).'); };
  $('#green').onclick = () => {
    if (!Billing.can(plan, 'green')) return go('plans', { need: 'green' });
    const blobs = findGreenBlobs(img, IW, IH);
    if (!blobs.length) return msg('Nenhum marcador verde encontrado. Use adesivos verdes foscos de 1 a 2 cm, com boa iluminação.', 'warn');
    const est = {}; for (const [k] of V.points) est[k] = vd.points[k] || tplPoints(V, IW, IH)[k];
    const snapped = snapToBlobs(est, blobs, Math.max(IW, IH) * 0.12);
    Object.assign(vd.points, snapped);
    msg(`${blobs.length} marcadores verdes encontrados; ${Object.keys(snapped).length} pontos ligados a eles. Confira a correspondência de cada ponto.`);
    persist(); draw();
  };
  $('#bg').onclick = async () => {
    if (!vd.imgOrig && !Billing.can(plan, 'bg')) return go('plans', { need: 'bg' });
    const b = $('#bg'); b.disabled = true;
    try {
      if (vd.imgOrig) { vd.img = vd.imgOrig; vd.imgOrig = null; }
      else { b.textContent = 'Removendo…'; msg('Separando a pessoa do fundo com IA…'); const out = await removeBackground(img); vd.imgOrig = vd.img; vd.img = out; msg(''); }
      img = await loadImg(vd.img); persist(); draw();
    } catch (err) { msg(`Não foi possível remover o fundo (${esc(err.message === 'timeout' ? 'tempo esgotado' : err.message)}).`, 'warn'); }
    b.disabled = false; b.textContent = vd.imgOrig ? 'Restaurar fundo' : 'Remover fundo';
  };
  const mk = $('#mask'); if (mk) mk.onchange = e => { if (e.target.checked && !Billing.can(plan, 'mask')) { e.target.checked = false; return go('plans', { need: 'mask' }); } vd.mask = e.target.checked; persist(); draw(); };
  $('#cal').onchange = e => {
    vd.scale = { on: e.target.checked, cm: (parseFloat($('#cal-cm').value) || cmOut(100)) / cmOut(1) };
    $('#cal-f').hidden = !e.target.checked;
    if (e.target.checked && !vd.points.reguaA) { const x = IW * 0.1; vd.points.reguaA = { x, y: IH * 0.1 }; vd.points.reguaB = { x, y: IH * 0.85 }; msg('Arraste os dois pontos amarelos até as extremidades de um objeto de tamanho conhecido (régua, fio de prumo marcado) no mesmo plano do paciente.'); }
    if (!e.target.checked) { delete vd.points.reguaA; delete vd.points.reguaB; }
    persist(); draw();
  };
  $('#cal-cm').onchange = e => { vd.scale = { on: true, cm: (parseFloat(e.target.value) || cmOut(100)) / cmOut(1) }; persist(); draw(); };
  $('#done').onclick = async () => {
    clearTimeout(saveT); await Store.put('assessments', a);
    const miss = V.points.filter(([k, , o]) => !o && !vd.points[k]).length;
    if (miss) toast(`Faltam ${miss} pontos nesta vista`);
    go('assessment', { id });
  };
  const onR = () => layout(); window.addEventListener('resize', onR);
  cleanup = () => { window.removeEventListener('resize', onR); clearTimeout(saveT); Store.put('assessments', a); };
  st.sel = firstMissing(); layout();
  if ($('[data-ownvideo]')) bindOwnVideo(app, 'rom:' + vd.rom.id, 'este movimento');
  if (auto && !Object.keys(vd.points).length) { if (V.detect) runAuto(); else { Object.assign(vd.points, tplPoints(V, IW, IH)); persist(); draw(); msg('Pontos na posição-modelo. Arraste cada um até o ponto anatômico.'); } }
};

/* ---------- resultados ---------- */
function measureTable(ms, withExplain = true) {
  return `<div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Valor</th><th>Situação</th></tr></thead><tbody>${ms.map(m => {
    const ex = withExplain ? explain(m) : '';
    return `<tr><td>${esc(m.label)}<span class="ref">${esc(m.text)}${m.ref ? ' · ref. ' + esc(m.ref) : ''}</span>${ex ? `<span class="ref ex">${esc(ex)}</span>` : ''}</td><td class="v">${fmtM(m)}</td><td><span class="st ${m.status}">${STATUS[m.status]}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
async function saveJPEG(V, vd, S, name) {
  const cv = await compositeCanvas(V, vd, S, 2000);
  cv.toBlob(b => downloadBlob(b, name + '.jpg'), 'image/jpeg', 0.92);
}
SCREENS.results = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings(), K = KINDS[kindOf(a)];
  const all = (await Store.all('assessments')).filter(x => x.patientId === a.patientId && kindOf(x) === kindOf(a)).sort((x, y) => x.date.localeCompare(y.date));
  const prev = all.filter(x => x.date < a.date).pop();
  const slots = slotsOf(a).filter(s => viewReady(a.views[s], s));
  const ms = slots.flatMap(s => measuresFor(s, a.views[s]));
  const cnt = s => ms.filter(m => m.status === s).length;
  const f = findings(a), cls = classifyPosture(a), ex = exercisesFor(f);
  const refs = ms.map(REFERRALS).filter(Boolean);
  if (a.includeExercises === undefined) a.includeExercises = true;
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)} · ${fmtDate(a.date)}</span><h1>${esc(K.label)}</h1></div>
      <div class="row"><button class="btn" id="edit">Ajustar pontos</button>${prev ? '<button class="btn" id="cmp">Comparar com a anterior</button>' : ''}<button class="btn" id="jpgs">Salvar imagens (JPEG)</button><button class="btn primary" id="pdf">Exportar PDF</button></div></div>
    ${refs.map(r => `<div class="banner bad">${esc(r)}</div>`).join('')}
    <div class="summary">
      <div class="panel"><span class="eyebrow">Normais</span><b class="num" style="color:var(--ok)">${cnt('ok')}</b><span class="muted" style="font-size:.85rem">de ${ms.filter(m => m.status !== 'na').length} medidas</span></div>
      <div class="panel"><span class="eyebrow">Em atenção</span><b class="num" style="color:var(--warn)">${cnt('warn')}</b><span class="muted" style="font-size:.85rem">próximas do limite</span></div>
      <div class="panel"><span class="eyebrow">Alteradas</span><b class="num" style="color:var(--bad)">${cnt('bad')}</b><span class="muted" style="font-size:.85rem">fora da referência</span></div>
    </div>
    ${cls ? `<div class="panel stack"><span class="eyebrow">Classificação postural estimada (Kendall) · ${esc(cls.vista)}</span><h2>${esc(cls.tipo)}</h2><p class="muted" style="margin:0">${esc(cls.desc)} Estimativa por fotogrametria; confirme no exame físico.</p></div>` : ''}
    <div class="panel stack"><h2>Principais achados</h2>${f.length ? `<ul class="find">${f.sort((x, y) => (y.m.status === 'bad') - (x.m.status === 'bad')).map(({ slot, m }) => `<li><span class="st ${m.status}" style="margin-right:6px">${STATUS[m.status]}</span>${esc(m.label)} (${esc(slotLabel(a, slot).toLowerCase())}): ${esc(m.text.toLowerCase())}, <span class="num">${fmtM(m)}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Nenhuma medida fora das faixas de referência.</p>'}
      <label class="f">Conclusão do profissional (vai para o relatório)<textarea id="concl" rows="3" placeholder="Interpretação clínica, conduta e orientações.">${esc(a.conclusion)}</textarea></label></div>
    ${K.dynamic ? `<section class="panel stack"><h2>Amplitudes de movimento</h2>${measureTable(ms)}${slots.some(s => a.views[s].comment) ? `<div class="stack">${slots.filter(s => a.views[s].comment).map(s => `<p style="margin:0;font-size:.9rem"><b>${esc(getView(s, a.views[s]).label)}:</b> ${esc(a.views[s].comment)}</p>`).join('')}</div>` : ''}</section>` : ''}
    ${slots.map(s => { const vd = a.views[s], V = getView(s, vd); return `<section class="panel stack"><div class="row spread"><h2>${esc(V.label)}</h2><button class="btn small" data-jpg="${s}">Salvar imagem</button></div><div class="res"><canvas data-cv="${s}" aria-label="Foto ${esc(V.label)} com linhas de medida"></canvas><div style="min-width:0">${K.dynamic ? `<p class="muted" style="margin:0">${esc(vd.comment || '')}</p>` : measureTable(measuresFor(s, vd))}</div></div></section>`; }).join('')}
    ${ex.length ? `<section class="panel stack"><div class="row spread"><h2>Exercícios sugeridos</h2><label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="inc-ex" ${a.includeExercises ? 'checked' : ''}> Incluir no PDF</label></div>
      <p class="muted" style="margin:0;font-size:.88rem">Sugestões ligadas aos achados. Ajuste à condição do paciente antes de prescrever.</p>
      <div class="exgrid">${ex.map(e => `<button class="excard exlink" data-exo="${e.id}"><span class="row" style="gap:10px;align-items:center;flex-wrap:nowrap">${exPicto(e.pose, 56)}<span><b>${esc(e.name)}</b><br><span class="tag">${esc(EX_CATS[e.cat])}</span></span></span><span class="muted" style="font-size:.82rem">${esc(e.dose)} · para: ${esc(e.why.join(', ').toLowerCase())}</span></button>`).join('')}</div>
      <div><button class="btn primary" id="ex-go">Começar treino com estes exercícios</button></div></section>` : ''}`;
  bindBack('patient', { id: a.patientId });
  for (const s of slots) paintInto($(`[data-cv="${s}"]`), getView(s, a.views[s]), a.views[s], S);
  $('#concl').onchange = async e => { a.conclusion = e.target.value; await Store.put('assessments', a); toast('Conclusão salva'); };
  $$('[data-exo]').forEach(b => b.onclick = () => go('exercise', { id: b.dataset.exo }));
  const eg = $('#ex-go'); if (eg) eg.onclick = () => go('workout', { ids: ex.map(e => e.id), patientId: a.patientId });
  const ie = $('#inc-ex'); if (ie) ie.onchange = async e => { a.includeExercises = e.target.checked; await Store.put('assessments', a); };
  $('#edit').onclick = () => go('assessment', { id });
  if (prev) $('#cmp').onclick = () => go('compare', { pid: a.patientId, a: prev.id, b: a.id });
  const base = `${slug(p.name)}-${a.date.slice(0, 10)}`;
  $$('[data-jpg]').forEach(b => b.onclick = () => saveJPEG(getView(b.dataset.jpg, a.views[b.dataset.jpg]), a.views[b.dataset.jpg], S, `${base}-${slug(getView(b.dataset.jpg, a.views[b.dataset.jpg]).label)}`));
  $('#jpgs').onclick = async () => { for (const s of slots) { await saveJPEG(getView(s, a.views[s]), a.views[s], S, `${base}-${slug(getView(s, a.views[s]).label)}`); await new Promise(r => setTimeout(r, 400)); } toast('Imagens salvas'); };
  $('#pdf').onclick = async () => {
    a.conclusion = $('#concl').value; await Store.put('assessments', a);
    const b = $('#pdf'); b.disabled = true; b.textContent = 'Gerando PDF…';
    try { await exportPDF(a, p); toast('PDF gerado'); } catch (err) { toast('Não foi possível gerar o PDF: ' + err.message, 4000); }
    b.disabled = false; b.textContent = 'Exportar PDF';
  };
};

/* ---------- comparação antes × depois ---------- */
SCREENS.compare = async ({ pid, a: ida, b: idb }) => {
  if (!Billing.can(await Billing.plan(), 'compare')) return go('plans', { need: 'compare' });
  const p = await Store.get('patients', pid), S = await getSettings();
  const allA = await Store.all('assessments');
  const A0 = allA.find(x => x.id === ida) || allA.find(x => x.id === idb);
  const all = allA.filter(x => x.patientId === pid && kindOf(x) === kindOf(A0)).sort((x, y) => x.date.localeCompare(y.date));
  const A = all.find(x => x.id === ida) || all[0], B = all.find(x => x.id === idb) || all[all.length - 1];
  const opt = sel => all.map(x => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${fmtDate(x.date)}</option>`).join('');
  const dyn = KINDS[kindOf(A)].dynamic;
  // pares de vistas: mesma chave, ou mesmo movimento na ADM
  const pairs = [];
  for (const s of slotsOf(B)) {
    if (!viewReady(B.views[s], s)) continue;
    const sa = dyn ? slotsOf(A).find(x => A.views[x].rom?.label === B.views[s].rom?.label && viewReady(A.views[x], x)) : (viewReady(A.views[s], s) ? s : null);
    if (sa) pairs.push([sa, s]);
  }
  let better = 0, worse = 0;
  const rows = (sa, sb) => {
    const ma = measuresFor(sa, A.views[sa]), mb = measuresFor(sb, B.views[sb]);
    return mb.map(m => {
      const o = ma.find(x => x.key === m.key); if (!o) return '';
      const da = distToRange(o.score, o.ok), db = distToRange(m.score, m.ok), dd = db - da;
      let cls = '', word = 'Estável';
      if (m.ok && Math.abs(dd) >= 0.5) { if (dd < 0) { cls = 'up'; word = 'Melhorou'; better++; } else { cls = 'down'; word = 'Piorou'; worse++; } } else if (!m.ok) word = '—';
      return `<tr><td>${esc(m.label)}<span class="ref">${m.ref ? 'ref. ' + esc(m.ref) : ''}</span></td><td class="v">${fmtM(o)}</td><td class="v">${fmtM(m)}</td><td class="delta ${cls}">${word}</td></tr>`;
    }).join('');
  };
  const sections = pairs.map(([sa, sb], i) => `<section class="panel stack"><h2>${esc(getView(sb, B.views[sb]).label)}</h2>
    <div class="row" style="align-items:flex-start;gap:12px"><figure style="margin:0;flex:1;min-width:130px;max-width:220px"><canvas data-a="${i}" style="width:100%;border-radius:8px;background:#0B0E1A"></canvas><figcaption class="muted num" style="font-size:.8rem">${fmtDate(A.date)}</figcaption></figure>
    <figure style="margin:0;flex:1;min-width:130px;max-width:220px"><canvas data-b="${i}" style="width:100%;border-radius:8px;background:#0B0E1A"></canvas><figcaption class="muted num" style="font-size:.8rem">${fmtDate(B.date)}</figcaption></figure>
    <div style="flex:3;min-width:260px"><div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Antes</th><th style="text-align:right">Depois</th><th>Evolução</th></tr></thead><tbody>${rows(sa, sb)}</tbody></table></div></div></div></section>`).join('');
  app.innerHTML = `${back(p.name)}
    <div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)} · ${esc(KINDS[kindOf(A)].label)}</span><h1>Evolução entre avaliações</h1></div>
    <div class="panel row"><label class="f">Antes<select id="sa">${opt(A.id)}</select></label><label class="f">Depois<select id="sb">${opt(B.id)}</select></label>
      <div class="row" style="margin-left:auto;gap:8px" id="score"></div></div>
    ${sections || '<div class="panel empty muted">As duas avaliações precisam ter ao menos uma vista em comum com todos os pontos marcados.</div>'}`;
  $('#score').innerHTML = pairs.length ? `<span class="st ok">${better} melhoraram</span><span class="st bad">${worse} pioraram</span>` : '';
  bindBack('patient', { id: pid });
  $('#sa').onchange = e => go('compare', { pid, a: e.target.value, b: B.id });
  $('#sb').onchange = e => go('compare', { pid, a: A.id, b: e.target.value });
  pairs.forEach(([sa, sb], i) => { paintInto($(`[data-a="${i}"]`), getView(sa, A.views[sa]), A.views[sa], S); paintInto($(`[data-b="${i}"]`), getView(sb, B.views[sb]), B.views[sb], S); });
};

/* ---------- exercícios e ajuda ---------- */
SCREENS.help = async () => {
  app.innerHTML = `<div class="stack" style="gap:4px"><span class="eyebrow">Ajuda</span><h1>Como usar o TEAMRM</h1></div>
    <div class="stack">${HELP.map(([q, r]) => `<details class="panel"><summary><b>${esc(q)}</b></summary><p style="margin:10px 0 0">${esc(r)}</p></details>`).join('')}</div>
    <section class="panel stack"><h2>Protocolo de fotografia por teste</h2>${Object.entries(KINDS).filter(([, K]) => K.views).map(([, K]) => `<div><b>${esc(K.label)}</b><ul style="margin:4px 0 0;padding-left:18px">${K.views.map(v => `<li><b>${esc(VIEWS[v].label)}:</b> ${esc(VIEWS[v].hint)}</li>`).join('')}</ul></div>`).join('')}</section>`;
};

/* ---------- configurações ---------- */
const PALETTES = { teamrm: 'TEAMRM (preto e amarelo)', indigo: 'Índigo', oceano: 'Oceano', vinho: 'Vinho' };
SCREENS.settings = async () => {
  const S = await getSettings();
  const cfg = TEAMRM_CONFIG, plan = await Billing.plan();
  app.innerHTML = `<div class="stack" style="gap:4px"><span class="eyebrow">TEAMRM · Posture & Correction</span><h1>Ajustes</h1></div>
    <h2 class="sethead">Configurações gerais</h2>
    <div class="setlist">
    <details class="setitem"><summary><span class="sico">PDF</span><span><b>Personalização dos relatórios</b><small>Logo, dados da clínica, cores e conteúdo do PDF</small></span></summary>
    <form class="stack" id="sf">
      <div class="grid-form">
        <label class="f" style="grid-column:1/-1">Nome da clínica<input id="s-clinic" value="${esc(S.clinic)}" placeholder="Ex.: Clínica Movimento Fisioterapia"></label>
        <label class="f">Profissional responsável<input id="s-prof" value="${esc(S.professional)}"></label>
        <label class="f">Número do CREF<input id="s-reg" value="${esc(S.registry)}" placeholder="000000-G/SP"></label>
        <label class="f" style="grid-column:1/-1">Contato no cabeçalho<input id="s-contact" value="${esc(S.contact)}" placeholder="Endereço, telefone, Instagram"></label>
        <label class="f" style="grid-column:1/-1">Frase do banner do PDF<input id="s-sub" value="${esc(S.pdfSubtitle)}" placeholder="Ex.: Fisioterapia postural e RPG"></label>
        <label class="f">Cor do banner do PDF<input id="s-pdfc" type="color" value="${esc(S.pdfColor)}" style="height:42px;padding:4px"></label>
        <label class="f">Cor das linhas de medida<input id="s-color" type="color" value="${esc(S.lineColor)}" style="height:42px;padding:4px"></label>
        <label class="f">Aparência<select id="s-theme">${[['auto', 'Automática (segue o aparelho)'], ['light', 'Clara'], ['dark', 'Escura']].map(([k, l]) => `<option value="${k}"${(S.theme || 'auto') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f">Cores do aplicativo<select id="s-pal">${Object.entries(PALETTES).map(([k, l]) => `<option value="${k}"${S.palette === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="f">Logotipo<div class="row" style="gap:8px">${S.logo ? `<img src="${S.logo}" alt="Logotipo atual" style="height:40px;max-width:120px;object-fit:contain;background:#fff;border-radius:6px;padding:2px">` : ''}
          <label class="btn small" style="cursor:pointer">${S.logo ? 'Trocar' : 'Enviar imagem'}<input type="file" accept="image/*" id="s-logo" hidden></label>${S.logo ? '<button type="button" class="btn small ghost danger" id="s-logo-rm">Remover</button>' : ''}</div></div>
        <label class="row" style="gap:8px;grid-column:1/-1"><input type="checkbox" id="s-exp" ${S.pdfExplain ? 'checked' : ''}> Incluir a interpretação de cada medida no PDF</label>
        <label class="row" style="gap:8px;grid-column:1/-1"><input type="checkbox" id="s-pex" ${S.pdfExercises ? 'checked' : ''}> Incluir exercícios sugeridos no PDF (quando marcados na avaliação)</label>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary">Salvar</button></div>
    </form></details>
    <details class="setitem"><summary><span class="sico">cm</span><span><b>Sistema de unidades: ${S.units === 'imperial' ? 'Imperial' : 'Métrico'}</b><small>${S.units === 'imperial' ? 'lb, pol' : 'kg, cm'}</small></span></summary>
      <div class="row"><label class="row" style="gap:6px"><input type="radio" name="un" value="metric" ${S.units !== 'imperial' ? 'checked' : ''}> Métrico (kg, cm)</label><label class="row" style="gap:6px"><input type="radio" name="un" value="imperial" ${S.units === 'imperial' ? 'checked' : ''}> Imperial (lb, pol)</label></div>
      <p class="muted" style="margin:0;font-size:.85rem">As faixas de referência continuam calculadas em centímetros; só a exibição muda.</p></details>
    <details class="setitem"><summary><span class="sico">▤</span><span><b>Armazenamento</b><small>Backup, espaço usado, limpar cache e preferências</small></span></summary>
      <div class="stack">
      <p class="muted" style="margin:0;max-width:65ch">Pacientes, fotos, vídeos e avaliações ficam somente neste aparelho, neste navegador. Exporte um backup com frequência e guarde em local seguro: ele contém dados de saúde protegidos pela LGPD. Os vídeos não entram no backup (ficam grandes demais).</p>
      <div class="row"><button class="btn" id="bk-out">Exportar backup</button><label class="btn" style="cursor:pointer">Restaurar backup<input type="file" accept="application/json,.json" id="bk-in" hidden></label><button class="btn ghost danger" id="ex-rm">Apagar paciente de exemplo</button></div>
      <div class="row"><button class="btn" id="cache">Limpar cache do app</button><button class="btn" id="prefs">Limpar preferências</button><button class="btn" id="persist">Proteger dados contra limpeza automática</button></div>
      <p class="muted" id="bk-info" style="margin:0;font-size:.85rem"></p></div></details>
    <button class="setitem setbtn" id="go-plans"><span class="sico">★</span><span><b>${TEAMRM_CONFIG.showPlans ? 'Conta e assinatura' : 'Conta'}</b><small>${Billing.enforce ? 'Plano atual: ' + esc(PLANS[plan].label) : TEAMRM_CONFIG.showPlans ? 'Login, planos Free, Pro e Pro Plus' : 'Entrar ou criar conta'}</small></span><span aria-hidden="true">›</span></button>
    </div>
    <h2 class="sethead">Avaliação</h2>
    <section class="panel stack"><h2>Protocolos de amplitude de movimento</h2>
      <p class="muted" style="margin:0;font-size:.9rem">Monte listas de movimentos para aplicar de uma vez numa avaliação de ADM. Inclua ângulos próprios entre quaisquer pontos.</p>
      <div id="protos"></div>
      <details><summary class="btn small" style="display:inline-flex">+ Novo protocolo</summary>
        <div class="stack" style="margin-top:10px">
          <label class="f">Nome do protocolo<input id="pr-name" placeholder="Ex.: Ombro pós-operatório"></label>
          <fieldset class="panel" style="padding:10px"><legend class="eyebrow">Movimentos de referência</legend><div class="grid-form" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px">${ROM_PRESETS.filter(r => r.normal).map(r => `<label class="row" style="gap:6px;font-size:.9rem"><input type="checkbox" data-pr="${r.id}"> ${esc(r.label)}</label>`).join('')}</div></fieldset>
          <fieldset class="panel stack" style="padding:10px"><legend class="eyebrow">Ângulo personalizado</legend>
            <div class="grid-form"><label class="f">Nome<input id="ca-label" placeholder="Ex.: Ângulo poplíteo"></label>
              <label class="f">Tipo<select id="ca-type">${Object.entries(ROM_TYPES).map(([k, t]) => `<option value="${k}">${t.n} pontos · ${esc(t.d)}</option>`).join('')}</select></label>
              <label class="f">Valor normal (°, opcional)<input id="ca-normal" type="number" min="0" max="360"></label>
              <label class="f" style="grid-column:1/-1">Nomes dos pontos, separados por vírgula<input id="ca-pts" placeholder="Ex.: Trocânter, Joelho (vértice), Maléolo"></label></div>
            <div><button type="button" class="btn small" id="ca-add">Adicionar ao protocolo</button></div><ul id="ca-list" class="find"></ul></fieldset>
          <div><button type="button" class="btn primary" id="pr-save">Salvar protocolo</button></div>
        </div></details>
    </section>
    <h2 class="sethead">Suporte</h2>
    <div class="setlist">
      <button class="setitem setbtn" id="go-help"><span class="sico">?</span><span><b>Ajuda e protocolo de fotografia</b><small>Como fotografar, marcar pontos e usar cada teste</small></span><span aria-hidden="true">›</span></button>
      <details class="setitem"><summary><span class="sico">✉</span><span><b>Contate-nos</b><small>E-mail e WhatsApp do suporte TEAMRM</small></span></summary>
        ${cfg.support.email || cfg.support.whatsapp ? `<div class="stack">${cfg.support.email ? `<p style="margin:0">E-mail: <b class="selectable">${esc(cfg.support.email)}</b> <button class="btn small" data-copy="${esc(cfg.support.email)}">Copiar</button></p>` : ''}${cfg.support.whatsapp ? `<p style="margin:0">WhatsApp: <b class="selectable">${esc(cfg.support.whatsapp)}</b> <a class="btn small" href="https://wa.me/${esc(cfg.support.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">Abrir conversa</a></p>` : ''}</div>` : '<p class="muted" style="margin:0">Contato de suporte ainda não configurado (arquivo js/config.js).</p>'}</details>
      <details class="setitem"><summary><span class="sico">!</span><span><b>Reportar um erro</b><small>Descreva o que aconteceu; os dados técnicos são anexados</small></span></summary>
        <div class="stack"><label class="f">O que aconteceu?<textarea id="bug" rows="3" placeholder="Ex.: ao exportar o PDF da flexão de tronco, aparece uma mensagem de erro"></textarea></label>
        <p class="muted" style="margin:0;font-size:.82rem">Não inclua nomes ou dados de pacientes.</p>
        <div class="row"><button class="btn" id="bug-copy">Copiar relato</button>${cfg.support.email ? '<button class="btn primary" id="bug-mail">Enviar por e-mail</button>' : ''}</div></div></details>
    </div>
    <h2 class="sethead">Segurança e privacidade</h2>
    <div class="setlist">
      <details class="setitem"><summary><span class="sico">⛨</span><span><b>Permissões</b><small>Câmera e armazenamento deste aparelho</small></span></summary><div class="stack" id="perms"><p class="muted" style="margin:0">Verificando…</p></div></details>
      <button class="setitem setbtn" id="go-privacy"><span class="sico">✓</span><span><b>Política de privacidade</b><small>Como os dados são tratados (LGPD)</small></span><span aria-hidden="true">›</span></button>
      <button class="setitem setbtn" id="go-terms"><span class="sico">§</span><span><b>Termos de uso</b><small>Condições de uso e da assinatura</small></span><span aria-hidden="true">›</span></button>
    </div>
    <p class="muted" style="text-align:center;font-size:.8rem;margin:8px 0 0">TEAMRM - Posture & Correction · versão ${APP_VERSION}</p>`;

  $('#go-plans').onclick = () => go('plans');
  $('#go-help').onclick = () => go('help');
  $('#go-privacy').onclick = () => go('legal', { doc: 'privacy' });
  $('#go-terms').onclick = () => go('legal', { doc: 'terms' });
  $$('[name="un"]').forEach(r => r.onchange = async () => { S.units = r.value; await Store.put('settings', S); applyUnits(S); toast('Unidades: ' + (S.units === 'imperial' ? 'imperial' : 'métrico')); go('settings'); });
  $$('[data-copy]').forEach(b => b.onclick = () => copyText(b.dataset.copy));
  const bugText = () => `Relato de erro — TEAMRM ${APP_VERSION}\n\n${$('#bug').value.trim()}\n\nNavegador: ${navigator.userAgent}\nTela: ${screen.width}×${screen.height}\nArmazenamento local: ${Store.persistent ? 'sim' : 'não'}\nData: ${new Date().toISOString()}`;
  $('#bug-copy').onclick = () => copyText(bugText());
  const bm = $('#bug-mail'); if (bm) bm.onclick = () => { location.href = `mailto:${cfg.support.email}?subject=${encodeURIComponent('Erro no TEAMRM')}&body=${encodeURIComponent(bugText())}`; };
  $('#cache').onclick = async () => { try { for (const k of await caches.keys()) await caches.delete(k); const r = await navigator.serviceWorker?.getRegistrations?.(); for (const x of r || []) await x.unregister(); } catch (e) { } toast('Cache limpo. Recarregando…'); setTimeout(() => location.reload(), 900); };
  $('#prefs').onclick = async () => { if (!(await confirmBox('Limpar preferências?', 'Tema, cores, unidades e dados do relatório voltam ao padrão. Pacientes e avaliações não são apagados.', 'Limpar'))) return; const keep = { protocols: S.protocols, seeded: true }; await Store.put('settings', { ...DEFAULT_SETTINGS, ...keep }); try { localStorage.removeItem('teamrm-theme'); localStorage.removeItem('teamrm-palette'); } catch (e) { } applyPalette(DEFAULT_SETTINGS); applyUnits(DEFAULT_SETTINGS); toast('Preferências limpas'); go('settings'); };
  $('#persist').onclick = async () => { try { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Dados protegidos contra limpeza automática' : 'O navegador não concedeu a proteção (instale o app na tela inicial e tente de novo)', 4000); } catch (e) { toast('Este navegador não oferece essa proteção'); } };
  (async () => {
    const rows = [];
    try { const c = await navigator.permissions.query({ name: 'camera' }); rows.push(['Câmera', { granted: 'permitida', denied: 'bloqueada — libere nas configurações do navegador', prompt: 'será pedida ao tirar a primeira foto' }[c.state] || c.state]); } catch (e) { rows.push(['Câmera', 'pedida ao tirar a foto (o app também aceita fotos da galeria)']); }
    try { const p = await navigator.storage?.persisted?.(); rows.push(['Armazenamento protegido', p ? 'sim' : 'não (o navegador pode limpar dados se faltar espaço)']); } catch (e) { }
    rows.push(['Armazenamento local', Store.persistent ? 'disponível' : 'indisponível neste navegador']);
    $('#perms').innerHTML = rows.map(([k, v]) => `<p style="margin:0"><b>${k}:</b> ${esc(v)}</p>`).join('') + '<p class="muted" style="margin:0;font-size:.85rem">O app não acessa localização, contatos nem microfone.</p>';
  })();
  const drawProtos = () => {
    const ps = S.protocols || [];
    $('#protos').innerHTML = ps.length ? `<div class="plist">${ps.map(pr => `<div class="prow" style="grid-template-columns:1fr auto;cursor:default"><span><b>${esc(pr.name)}</b><br><span class="muted" style="font-size:.85rem">${esc(pr.items.map(i => i.label).join(' · '))}</span></span><button class="btn small ghost danger" data-prdel="${pr.id}">Excluir</button></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nenhum protocolo criado.</p>';
    $$('[data-prdel]').forEach(b => b.onclick = async () => { S.protocols = S.protocols.filter(x => x.id !== b.dataset.prdel); await Store.put('settings', S); drawProtos(); });
  };
  drawProtos();
  const custom = [];
  $('#ca-add').onclick = () => {
    const label = $('#ca-label').value.trim(), type = $('#ca-type').value, n = ROM_TYPES[type].n;
    let pts = $('#ca-pts').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!label) return toast('Dê um nome ao ângulo');
    while (pts.length < n) pts.push('Ponto ' + (pts.length + 1)); pts = pts.slice(0, n);
    custom.push({ id: 'c_' + uid(), label, type, normal: parseFloat($('#ca-normal').value) || 0, pts, plane: 'Personalizado' });
    $('#ca-list').innerHTML = custom.map(c => `<li>${esc(c.label)} · ${esc(c.pts.join(' – '))}${c.normal ? ' · normal ' + c.normal + '°' : ''}</li>`).join('');
    $('#ca-label').value = ''; $('#ca-pts').value = ''; $('#ca-normal').value = '';
  };
  $('#pr-save').onclick = async () => {
    if (!Billing.can(plan, 'protocols')) return go('plans', { need: 'protocols' });
    const name = $('#pr-name').value.trim(); if (!name) return toast('Dê um nome ao protocolo');
    const items = [...$$('[data-pr]:checked').map(c => ROM_PRESETS.find(r => r.id === c.dataset.pr)), ...custom];
    if (!items.length) return toast('Escolha ao menos um movimento');
    (S.protocols ||= []).push({ id: uid(), name, items }); await Store.put('settings', S); toast('Protocolo salvo'); go('settings');
  };
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    Object.assign(S, { clinic: $('#s-clinic').value.trim(), professional: $('#s-prof').value.trim(), registry: crefFmt($('#s-reg').value), contact: $('#s-contact').value.trim(), lineColor: $('#s-color').value,
      pdfSubtitle: $('#s-sub').value.trim(), pdfColor: $('#s-pdfc').value, palette: $('#s-pal').value, theme: $('#s-theme').value, pdfExplain: $('#s-exp').checked, pdfExercises: $('#s-pex').checked });
    await Store.put('settings', S); applyPalette(S); toast('Configurações salvas');
  };
  $('#s-pal').onchange = e => applyPalette({ palette: e.target.value, theme: $('#s-theme').value });
  $('#s-theme').onchange = e => applyPalette({ palette: $('#s-pal').value, theme: e.target.value });
  $('#s-logo').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const u = URL.createObjectURL(f), im = await loadImg(u), k = Math.min(1, 400 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); S.logo = c.toDataURL('image/png'); URL.revokeObjectURL(u);
    await Store.put('settings', S); toast('Logotipo salvo'); go('settings');
  };
  const lr = $('#s-logo-rm'); if (lr) lr.onclick = async () => { S.logo = ''; await Store.put('settings', S); go('settings'); };
  $('#bk-out').onclick = async () => {
    const data = { app: 'teamrm-posture', version: 2, exportedAt: todayISO(), settings: S, patients: await Store.all('patients'), assessments: await Store.all('assessments'), customEx: (await Store.get('settings', 'customEx'))?.list || [] };
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `teamrm-backup-${new Date().toISOString().slice(0, 10)}.json`); toast('Backup exportado');
  };
  $('#bk-in').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!['teamrm-posture', 'prumo-postural'].includes(d.app)) throw new Error('arquivo não é um backup do TEAMRM');
      if (!(await confirmBox('Restaurar backup?', `${d.patients.length} pacientes e ${d.assessments.length} avaliações serão adicionados ou substituídos neste aparelho.`, 'Restaurar'))) return;
      for (const p of d.patients) await Store.put('patients', p);
      for (const a of d.assessments) await Store.put('assessments', a);
      if (Array.isArray(d.customEx) && d.customEx.length) { const cur = (await Store.get('settings', 'customEx'))?.list || []; const ids = new Set(d.customEx.map(x => x.id)); await saveCustomEx([...cur.filter(x => !ids.has(x.id)), ...d.customEx]); }
      if (d.settings) await Store.put('settings', { ...d.settings, id: 'main', seeded: true });
      toast('Backup restaurado'); go('patients');
    } catch (err) { toast('Não foi possível restaurar: ' + err.message, 4000); }
  };
  $('#ex-rm').onclick = async () => {
    const ex = (await Store.all('patients')).filter(p => p.example); if (!ex.length) return toast('Não há paciente de exemplo');
    for (const p of ex) { for (const a of (await Store.all('assessments')).filter(a => a.patientId === p.id)) await Store.del('assessments', a.id); await Store.del('patients', p.id); }
    toast('Exemplo apagado');
  };
  try { if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); $('#bk-info').textContent = `Espaço usado: ${nf((e.usage || 0) / 1048576)} MB.`; } } catch { }
};
