/* TEAMRM - Posture & Correction — início (cartões dos testes), escolha do paciente e banco de resultados. */
'use strict';

/* ---------- ilustrações dos cartões (traço original, cores do tema) ---------- */
const ART = (() => {
  const ink = 'var(--ink)', acc = 'var(--accent)', mu = 'var(--muted)';
  const svg = (inner, vb = '0 0 120 100') => `<svg viewBox="${vb}" width="100%" height="100%" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const fig = (x, s = 1, extra = '') => `<g transform="translate(${x} 8) scale(${s})" stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="0" cy="8" r="6"/><path d="M0 14 V48 M-12 22 L0 18 L12 22 M-12 22 L-15 44 M12 22 L15 44 M-6 48 L-7 80 M6 48 L7 80"/>${extra}</g>`;
  const levels = ys => ys.map(y => `<line x1="8" x2="112" y1="${y}" y2="${y}" stroke="${acc}" stroke-width="1.5" stroke-dasharray="4 4"/>`).join('');
  return {
    rapida: svg(levels([30, 56, 72]) + fig(60) + `<g fill="${acc}" stroke="none"><circle cx="48" cy="30" r="3"/><circle cx="72" cy="30" r="3"/><circle cx="54" cy="56" r="3"/><circle cx="66" cy="56" r="3"/></g>`),
    postural: svg(levels([30, 56]) + fig(28, .8) + `<g transform="translate(60 8) scale(.8)" stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="2" cy="8" r="6"/><path d="M0 14 C-2 30 4 40 0 48 M0 22 L4 44 M0 48 L1 80"/></g>` + fig(92, .8) + `<line x1="60" x2="60" y1="4" y2="96" stroke="${acc}" stroke-width="1.5"/>`),
    adams: svg(`<path d="M28 92 L32 52 M40 92 L42 52" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><path d="M30 50 C48 30 76 32 92 58" stroke="${ink}" stroke-width="5" stroke-opacity=".8"/><circle cx="96" cy="68" r="6" stroke="${ink}" stroke-width="3"/><path d="M84 60 L86 86" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><path d="M44 36 C58 26 74 28 86 40" stroke="${acc}" stroke-width="2" stroke-dasharray="3 3"/><line x1="40" x2="78" y1="30" y2="38" stroke="${acc}" stroke-width="2"/>`),
    cabeca: svg(`<path d="M48 84 C40 70 42 58 50 50 C44 46 42 36 46 26 C52 12 74 12 80 28 C84 38 80 46 76 50 L78 58 L70 60" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><circle cx="66" cy="36" r="2" fill="${acc}" stroke="none"/><path d="M50 62 L66 36" stroke="${acc}" stroke-width="2" stroke-dasharray="4 3"/><path d="M50 62 H86" stroke="${acc}" stroke-width="2"/><path d="M62 62 A12 12 0 0 0 58 52" stroke="${acc}" stroke-width="2"/><line x1="92" x2="92" y1="10" y2="90" stroke="${mu}" stroke-width="2"/>`),
    tronco: svg(`<path d="M30 92 C32 70 30 50 34 34 C40 26 50 24 60 22 C70 24 80 26 86 34 C90 50 88 70 90 92" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><path d="M60 22 V90" stroke="${mu}" stroke-width="2" stroke-dasharray="2 4"/><line x1="18" x2="102" y1="30" y2="36" stroke="${acc}" stroke-width="2" stroke-dasharray="5 4"/><line x1="18" x2="102" y1="66" y2="62" stroke="${acc}" stroke-width="2" stroke-dasharray="5 4"/>`),
    joelhos: svg(`<path d="M44 8 L52 50 L46 92 M76 8 L68 50 L74 92" stroke="${ink}" stroke-width="4" stroke-opacity=".8"/><circle cx="52" cy="50" r="5" stroke="${acc}" stroke-width="2"/><circle cx="68" cy="50" r="5" stroke="${acc}" stroke-width="2"/><path d="M44 8 L46 92 M76 8 L74 92" stroke="${acc}" stroke-width="1.5" stroke-dasharray="4 4"/>`),
    aurea: svg(fig(54) + `<rect x="82" y="8" width="6" height="34" fill="${acc}" stroke="none" rx="2"/><rect x="82" y="44" width="6" height="52" fill="${acc}" fill-opacity=".55" stroke="none" rx="2"/><text x="96" y="30" font-size="12" fill="${ink}" stroke="none" font-family="serif">φ</text>`),
    face: svg(`<ellipse cx="60" cy="50" rx="26" ry="34" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><circle cx="50" cy="44" r="3" fill="${ink}" stroke="none"/><circle cx="70" cy="44" r="3" fill="${ink}" stroke="none"/><path d="M54 66 Q60 70 66 66" stroke="${ink}" stroke-width="2"/><line x1="60" x2="60" y1="10" y2="92" stroke="${acc}" stroke-width="1.5" stroke-dasharray="4 4"/><line x1="36" x2="84" y1="44" y2="44" stroke="${acc}" stroke-width="1.5"/><line x1="40" x2="80" y1="66" y2="66" stroke="${acc}" stroke-width="1.5"/>`),
    adm: svg(`<g stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="50" cy="16" r="6"/><path d="M50 22 V58 L44 92 M50 58 L56 92 M50 28 L50 50"/><path d="M50 28 L76 8"/></g><path d="M50 50 A22 22 0 0 0 68 14" stroke="${acc}" stroke-width="2" stroke-dasharray="3 3"/><path d="M50 28 L50 50" stroke="${acc}" stroke-width="2"/>`),
    video: svg(`<rect x="8" y="34" width="40" height="28" rx="6" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><path d="M48 42 L60 36 V60 L48 54 Z" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><path d="M22 41 L32 48 L22 55 Z" fill="${acc}" stroke="none"/><g stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="92" cy="18" r="5"/><path d="M90 24 L84 50 L96 70 L94 92 M84 50 L72 68 L66 90 M88 32 L102 42 M88 32 L76 40"/></g><g fill="${acc}" stroke="none"><circle cx="84" cy="50" r="3"/><circle cx="96" cy="70" r="3"/><circle cx="72" cy="68" r="3"/></g>`),
    exercicios: svg(`<g stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="60" cy="40" r="6"/><path d="M60 46 V68 M60 52 L46 30 M60 52 L74 30 M60 68 C48 70 40 80 52 84 H68 C80 80 72 70 60 68"/></g><path d="M40 22 C36 14 44 6 50 12 M80 22 C84 14 76 6 70 12" stroke="${acc}" stroke-width="2"/><path d="M56 62 L59 58 L61 62 L64 56" stroke="${acc}" stroke-width="2"/>`),
  };
})();
const HOME_CARDS = [['rapida', 'Avaliação rápida'], ['postural', 'Postura completa'], ['adams', 'Flexão de tronco'], ['cabeca', 'Cabeça e pescoço'], ['adm', 'Amplitude de movimento'], ['tronco', 'Simetria de tronco'], ['joelhos', 'Joelhos'], ['aurea', 'Proporção áurea'], ['face', 'Simetria facial'], ['video', 'Análise de vídeo'], ['exercicios', 'Exercícios']];

SCREENS.home = async () => {
  const plan = await Billing.plan();
  let strip = ''; try { strip = await alunosHomeStrip(); } catch (e) { }
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">TEAMRM · Posture & Correction</span><h1>O que vamos avaliar?</h1></div>
      ${Billing.enforce ? `<button class="planpill" id="pp">${esc(PLANS[plan].label)}</button>` : ''}</div>
    ${strip}
    <div class="homegrid">${HOME_CARDS.map(([k, l]) => { const locked = k !== 'exercicios' && !Billing.can(plan, k); return `<button class="hcard${locked ? ' locked' : ''}" data-k="${k}"><span class="hart">${ART[k]}</span><b>${esc(l)}</b>${locked ? `<span class="lock" aria-label="Exige plano ${esc(PLANS[Billing.minPlan(k)].label)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>` : ''}</button>`; }).join('')}</div>
    <div class="tipday"><span class="eyebrow">Dica do dia</span><p style="margin:4px 0 0">${esc(tipOfDay())}</p></div>`;
  const pp = $('#pp'); if (pp) pp.onclick = () => go('plans');
  const als = $('#al-strip'); if (als) als.onclick = () => go('alunos', { tab: 'lembretes' });
  $$('.hcard').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'exercicios') return go('exercises');
    if (!Billing.can(plan, k)) return go('plans', { need: k });
    pickPatient(k);
  });
};

/* Escolha do paciente para um novo teste */
async function pickPatient(kind) {
  const pts = (await Store.all('patients')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:520px;max-height:90vh;overflow:auto">
    <div class="row spread"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(KINDS[kind].label)}</span><h2>Para qual paciente?</h2></div><button class="btn ghost small" data-x>Fechar</button></div>
    <input class="search" id="pq" type="search" placeholder="Buscar paciente" aria-label="Buscar paciente">
    <div class="plist" id="pl" style="max-height:50vh;overflow:auto"></div>
    <button class="btn primary" id="pn">+ Novo paciente</button></div>`;
  document.body.appendChild(m);
  const draw = q => { const l = pts.filter(p => p.name.toLowerCase().includes(q.toLowerCase())); $('#pl', m).innerHTML = l.length ? l.map(p => `<button class="prow" data-p="${p.id}" style="grid-template-columns:40px 1fr"><span class="av">${esc(initials(p.name))}</span><span><b>${esc(p.name)}</b></span></button>`).join('') : '<p class="muted" style="padding:12px;margin:0">Nenhum paciente encontrado.</p>'; };
  draw(''); $('#pq', m).oninput = e => draw(e.target.value); $('#pq', m).focus();
  m.addEventListener('click', async e => {
    if (e.target === m || e.target.closest('[data-x]')) return m.remove();
    if (e.target.closest('#pn')) { m.remove(); return go('patientForm', { then: kind }); }
    const b = e.target.closest('[data-p]'); if (!b) return;
    m.remove(); startAssessment(b.dataset.p, kind);
  });
}
async function startAssessment(pid, kind) {
  const a = { id: uid(), patientId: pid, kind, date: todayISO(), views: {}, order: [], notes: '', conclusion: '', createdAt: todayISO() };
  await Store.put('assessments', a);
  go(screenOfKind(kind), { id: a.id });
}

/* ---------- banco de resultados ---------- */
let resFilter = { kinds: new Set(), order: 'new', more: false };
SCREENS.results_db = async () => {
  const [as, pts] = await Promise.all([Store.all('assessments'), Store.all('patients')]);
  const pName = id => pts.find(p => p.id === id)?.name || 'Paciente removido';
  // uma linha por vista analisada (ou por análise de vídeo)
  const rows = [];
  for (const a of as) {
    const k = kindOf(a);
    if (KINDS[k].bio) { if (+a.bio?.weight > 0) rows.push({ a, k, slot: null, label: 'Composição corporal' + (a.bio.device ? ' · ' + a.bio.device : ''), img: null, size: JSON.stringify(a.bio).length, date: a.date }); continue; }
    if (KINDS[k].video) { if (a.video?.times?.length) rows.push({ a, k, slot: null, label: a.video.analysis === 'mov' ? VMOVES[a.video.move]?.label : 'Ângulos livres', img: a.video.keyframes?.[a.video.keyframes.length - 1]?.img, size: JSON.stringify(a.video).length, date: a.date }); continue; }
    for (const s of slotsOf(a)) { const vd = a.views[s]; if (vd?.img) rows.push({ a, k, slot: s, label: getView(s, vd)?.label || s, img: vd.img, size: vd.img.length * 0.75, date: a.date, ready: viewReady(vd, s) }); }
  }
  const kindsPresent = Object.keys(KINDS).filter(k => rows.some(r => r.k === k));
  const draw = () => {
    let list = rows.filter(r => !resFilter.kinds.size || resFilter.kinds.has(r.k));
    list.sort((x, y) => resFilter.order === 'new' ? y.date.localeCompare(x.date) : x.date.localeCompare(y.date));
    const shown = resFilter.more ? kindsPresent : kindsPresent.slice(0, 3);
    $('#chips').innerHTML = shown.map(k => `<button class="chip" aria-pressed="${resFilter.kinds.has(k)}" data-kf="${k}">${resFilter.kinds.has(k) ? '✓ ' : ''}${esc(KINDS[k].label)}</button>`).join('') + (kindsPresent.length > 3 ? `<button class="chip ghost" id="more">${resFilter.more ? 'Mostrar menos' : `Mostrar mais (+${kindsPresent.length - 3})`}</button>` : '');
    $('#rlist').innerHTML = list.length ? list.map(r => `<button class="rrow" data-a="${r.a.id}" data-v="${r.k === 'video' ? 'video' : r.k === 'bio' ? 'bio' : 'results'}"><span class="rthumb">${r.img ? `<img src="${r.img}" alt="" loading="lazy">` : r.k === 'bio' ? '<span class="rbio" aria-hidden="true">⚡</span>' : ''}</span><span style="min-width:0"><b>${esc(KINDS[r.k].label)}</b><br><span>${esc(r.label)}</span><br><span class="muted" style="font-size:.82rem">${esc(pName(r.a.patientId))}</span></span><span class="rmeta muted num">${nf(r.size / 1024, 1)} KB<br>${new Date(r.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></button>`).join('') : `<div class="panel empty"><h2>Nenhum resultado</h2><p class="muted" style="margin:0">As fotos e vídeos analisados aparecem aqui.</p></div>`;
    $$('[data-kf]').forEach(b => b.onclick = () => { const k = b.dataset.kf; resFilter.kinds.has(k) ? resFilter.kinds.delete(k) : resFilter.kinds.add(k); draw(); });
    const mo = $('#more'); if (mo) mo.onclick = () => { resFilter.more = !resFilter.more; draw(); };
    $$('[data-a]').forEach(b => b.onclick = () => go(b.dataset.v, { id: b.dataset.a }));
    $$('[data-ord]').forEach(b => b.setAttribute('aria-selected', b.dataset.ord === resFilter.order));
    $('#rcount').textContent = `${list.length} resultado${list.length === 1 ? '' : 's'}`;
  };
  app.innerHTML = `<div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Banco de resultados</span><h1>Resultados</h1></div><span class="muted" id="rcount"></span></div>
    <div class="chips" id="chips"></div>
    <div class="tabs" role="tablist"><button role="tab" data-ord="new">Recente primeiro</button><button role="tab" data-ord="old">Antigo primeiro</button></div>
    <div id="rlist" class="rlist"></div>`;
  $$('[data-ord]').forEach(b => b.onclick = () => { resFilter.order = b.dataset.ord; draw(); });
  draw();
};
