/* TEAMRM - Posture & Correction — avaliação de bioimpedância (composição corporal).
   O celular não mede bioimpedância: o profissional digita o laudo do aparelho (InBody, Tanita, Omron,
   Sanny, Biodynamics…) e, se quiser, a resistência (R) e a reatância (Xc) a 50 kHz. O app calcula
   índices, compara com faixas de referência publicadas, mostra a evolução e gera o relatório. */
'use strict';

KINDS.bio = { label: 'Bioimpedância', desc: 'Composição corporal: gordura, massa magra, músculo, água, gordura visceral e ângulo de fase, com faixas de referência, evolução e relatório.', bio: true, icon: '⚡' };
const screenOfKind = k => KINDS[k]?.video ? 'video' : KINDS[k]?.bio ? 'bio' : 'assessment';
{ const i = HOME_CARDS.findIndex(c => c[0] === 'video'); HOME_CARDS.splice(i < 0 ? HOME_CARDS.length - 1 : i, 0, ['bio', 'Bioimpedância']); }
ART.bio = (() => {
  const ink = 'var(--ink)', acc = 'var(--accent)';
  return `<svg viewBox="0 0 120 100" width="100%" height="100%" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="30" y="70" width="60" height="22" rx="6" stroke="${ink}" stroke-width="3" stroke-opacity=".8"/><rect x="50" y="76" width="20" height="8" rx="2" fill="${acc}" stroke="none"/>
    <g stroke="${ink}" stroke-width="3" stroke-opacity=".8"><circle cx="60" cy="12" r="6"/><path d="M60 18 V44 M46 26 L60 22 L74 26 M46 26 L42 46 M74 26 L78 46 M54 44 L52 70 M66 44 L68 70"/></g>
    <path d="M86 18 L80 32 H88 L82 46" stroke="${acc}" stroke-width="3"/></svg>`;
})();

/* ---------- campos do formulário ---------- */
const BIO_FIELDS = [
  ['Resultado do aparelho', 'Preencha só o que o seu aparelho mostrar. O que faltar, o app calcula quando possível.', [
    ['fatPct', 'Gordura corporal', '%', 2, 70], ['fatKg', 'Massa de gordura', 'kg', 1, 250], ['ffm', 'Massa livre de gordura (massa magra)', 'kg', 10, 200],
    ['smm', 'Massa muscular esquelética', 'kg', 5, 100], ['muscleKg', 'Massa muscular total', 'kg', 5, 150], ['asm', 'Massa muscular apendicular (braços + pernas)', 'kg', 3, 60],
    ['tbwL', 'Água corporal total', 'L', 10, 120], ['tbwPct', 'Água corporal', '%', 20, 80], ['ecwL', 'Água extracelular', 'L', 3, 60], ['icwL', 'Água intracelular', 'L', 5, 80],
    ['visceral', 'Gordura visceral (nível)', 'nível', 1, 59], ['boneKg', 'Massa óssea', 'kg', 0.5, 8], ['bmr', 'Taxa metabólica basal', 'kcal', 600, 5000], ['metAge', 'Idade metabólica', 'anos', 10, 99], ['pa', 'Ângulo de fase', '°', 1, 15],
  ]],
  ['Medidas elétricas (opcional)', 'Se o aparelho mostrar resistência e reatância a 50 kHz, o app calcula o ângulo de fase, a massa livre de gordura (Kyle, 2001) e a massa muscular esquelética (Janssen, 2000).', [
    ['R', 'Resistência (R) a 50 kHz', 'Ω', 150, 1500], ['Xc', 'Reatância (Xc) a 50 kHz', 'Ω', 10, 200],
  ]],
  ['Circunferências (opcional)', '', [['waist', 'Cintura', 'cm', 40, 250], ['hip', 'Quadril', 'cm', 50, 250]]],
];
const BIO_PREP = [['jejum', 'Jejum de pelo menos 4 horas'], ['bexiga', 'Bexiga esvaziada antes do exame'], ['exerc', 'Sem exercício intenso nas últimas 12 horas'], ['alcool', 'Sem álcool nas últimas 24 horas'], ['metal', 'Sem objetos de metal no corpo'], ['repouso', 'Repouso de 5 a 10 minutos antes (aparelho de maca)']];

/* ---------- cálculos ---------- */
const r1 = v => Math.round(v * 10) / 10;
function bioCompute(b) {
  const o = { calc: {} }, H = +b.height, W = +b.weight, male = b.sex === 'M', ag = +b.age;
  const has = k => b[k] !== '' && b[k] != null && Number.isFinite(+b[k]) && +b[k] > 0;
  const set = (k, v, how) => { if (has(k)) o[k] = +b[k]; else if (Number.isFinite(v) && v > 0) { o[k] = v; o.calc[k] = how; } };
  for (const f of BIO_FIELDS.flatMap(g => g[2])) if (has(f[0])) o[f[0]] = +b[f[0]];
  const h = H / 100;
  if (H && W) o.bmi = W / (h * h);
  // gordura e massa magra se completam pelo peso
  if (W) {
    if (!o.fatKg && o.fatPct) set('fatKg', W * o.fatPct / 100, 'peso × % de gordura');
    if (!o.fatPct && o.fatKg) set('fatPct', 100 * o.fatKg / W, 'gordura ÷ peso');
    if (!o.ffm && o.fatKg) set('ffm', W - o.fatKg, 'peso − gordura');
    if (!o.fatKg && o.ffm) { set('fatKg', W - o.ffm, 'peso − massa magra'); set('fatPct', 100 * (W - o.ffm) / W, 'gordura ÷ peso'); }
    if (!o.tbwPct && o.tbwL) set('tbwPct', 100 * o.tbwL / W, 'água ÷ peso');
    if (!o.tbwL && o.tbwPct) set('tbwL', W * o.tbwPct / 100, 'peso × % de água');
  }
  // elétricas: só preenchem o que o laudo não trouxe (gordura do aparelho tem prioridade)
  if (has('R') && has('Xc')) {
    set('pa', Math.atan(+b.Xc / +b.R) * 180 / Math.PI, 'calculado de R e Xc');
    if (H && W && !o.ffm) { set('ffm', -4.104 + 0.518 * H * H / +b.R + 0.231 * W + 0.130 * +b.Xc + 4.229 * (male ? 1 : 0), 'equação de Kyle (2001)'); if (o.ffm && !o.fatKg) { set('fatKg', W - o.ffm, 'peso − massa magra'); set('fatPct', 100 * (W - o.ffm) / W, 'gordura ÷ peso'); } }
    if (H && ag) set('smm', 0.401 * H * H / +b.R + 3.825 * (male ? 1 : 0) - 0.071 * ag + 5.102, 'equação de Janssen (2000)');
  }
  if (!o.tbwL && o.ecwL && o.icwL) set('tbwL', o.ecwL + o.icwL, 'extracelular + intracelular');
  if (!o.bmr && o.ffm) set('bmr', 500 + 22 * o.ffm, 'equação de Cunningham');
  if (h) { if (o.ffm) o.ffmi = o.ffm / (h * h); if (o.fatKg) o.fmi = o.fatKg / (h * h); if (o.asm) o.smi = o.asm / (h * h); }
  if (o.tbwL && o.ecwL) o.ecwr = o.ecwL / o.tbwL;
  if (W && o.smm) o.smmPct = 100 * o.smm / W;
  if (has('waist') && H) o.whtr = +b.waist / H;
  if (has('waist') && has('hip')) o.whr = +b.waist / +b.hip;
  return o;
}
// faixa saudável de % de gordura (Gallagher et al., 2000) por sexo e idade
function fatRange(male, ag) {
  const t = male ? [[39, 8, 20, 25], [59, 11, 22, 28], [200, 13, 25, 30]] : [[39, 21, 33, 39], [59, 23, 34, 40], [200, 24, 36, 42]];
  const r = t.find(x => (ag || 30) <= x[0]); return { lo: r[1], hi: r[2], ob: r[3] };
}
function bioMeasures(a) {
  const b = a.bio || {}; if (!(+b.weight > 0)) return [];
  const o = bioCompute(b), male = b.sex === 'M', ag = +b.age || null, out = [], sx = male ? 'homens' : 'mulheres';
  const calc = k => o.calc[k] ? ` (${o.calc[k]})` : '';
  const add = (grp, key, label, v, opt) => { if (v == null || !Number.isFinite(v)) return; const m = M('bio_' + key, label, opt.score ?? v, { ...opt, disp: opt.disp ?? r1(v) }); m.grp = grp; out.push(m); };
  const BIG = 1e6;
  add('Geral', 'peso', 'Peso', +b.weight, { unit: 'kg', text: b.device ? 'Aparelho: ' + b.device : '' });
  if (o.bmi) {
    const old = ag >= 60;
    add('Geral', 'imc', 'Índice de massa corporal (IMC)', o.bmi, old ? { unit: 'kg/m²', ok: [22, 27], warn: [20, 30], ref: '22 a 27 (60 anos ou mais)', text: 'Peso ÷ altura²' }
      : { unit: 'kg/m²', ok: [18.5, 24.99], warn: [17, 29.99], ref: '18,5 a 24,9', text: 'Peso ÷ altura². 25 a 29,9: sobrepeso; 30 ou mais: obesidade' });
  }
  if (o.fatPct) { const f = fatRange(male, ag); add('Gordura', 'gord', 'Gordura corporal', o.fatPct, { unit: '%', ok: [f.lo, f.hi], warn: [f.lo - 3, f.ob], ref: `${f.lo} a ${f.hi}% (${sx}${ag ? ', ' + (ag < 40 ? '20 a 39' : ag < 60 ? '40 a 59' : '60 a 79') + ' anos' : ''})`, text: `Gallagher e col., 2000${calc('fatPct')}` }); }
  if (o.fatKg) add('Gordura', 'gordkg', 'Massa de gordura', o.fatKg, { unit: 'kg', text: calc('fatKg').replace(/^ \(|\)$/g, '') });
  if (o.fmi) add('Gordura', 'fmi', 'Índice de massa gorda (gordura ÷ altura²)', o.fmi, male ? { unit: 'kg/m²', ok: [3, 6], warn: [2, 9], ref: '3 a 6 (homens)', text: 'Kelly e col., 2009. 6 a 9: excesso; acima de 9: obesidade' } : { unit: 'kg/m²', ok: [5, 9], warn: [4, 13], ref: '5 a 9 (mulheres)', text: 'Kelly e col., 2009. 9 a 13: excesso; acima de 13: obesidade' });
  if (o.visceral) add('Gordura', 'visc', 'Gordura visceral', o.visceral, { unit: 'nível', ok: [1, 12], warn: [1, 14], ref: '1 a 12', text: 'Escala de 1 a 59 dos aparelhos Tanita (no Omron, normal é 1 a 9)' });
  if (has(b.waist)) add('Gordura', 'cint', 'Circunferência da cintura', +b.waist, male ? { unit: 'cm', ok: [0, 93.9], warn: [0, 102], ref: 'abaixo de 94 cm (homens)', text: 'OMS: 94 a 102 risco aumentado; acima de 102 risco muito aumentado' } : { unit: 'cm', ok: [0, 79.9], warn: [0, 88], ref: 'abaixo de 80 cm (mulheres)', text: 'OMS: 80 a 88 risco aumentado; acima de 88 risco muito aumentado' });
  if (o.whtr) add('Gordura', 'rcest', 'Relação cintura/estatura', o.whtr, { unit: 'x', ok: [0, 0.499], warn: [0, 0.599], ref: 'abaixo de 0,50', text: 'Risco cardiometabólico' });
  if (o.whr) add('Gordura', 'rcq', 'Relação cintura/quadril', o.whr, male ? { unit: 'x', ok: [0, 0.9], warn: [0, 1.0], ref: 'até 0,90 (homens)', text: 'OMS' } : { unit: 'x', ok: [0, 0.85], warn: [0, 0.9], ref: 'até 0,85 (mulheres)', text: 'OMS' });
  if (o.ffm) add('Músculo e massa magra', 'mlg', 'Massa livre de gordura', o.ffm, { unit: 'kg', text: calc('ffm').replace(/^ \(|\)$/g, '') });
  if (o.ffmi) add('Músculo e massa magra', 'imlg', 'Índice de massa livre de gordura (massa magra ÷ altura²)', o.ffmi, male ? { unit: 'kg/m²', ok: [17, BIG], warn: [16, BIG], ref: '17 ou mais (homens)', text: 'Abaixo de 17: massa magra reduzida (critério ESPEN)' } : { unit: 'kg/m²', ok: [15, BIG], warn: [14, BIG], ref: '15 ou mais (mulheres)', text: 'Abaixo de 15: massa magra reduzida (critério ESPEN)' });
  if (o.smm) add('Músculo e massa magra', 'mme', 'Massa muscular esquelética', o.smm, { unit: 'kg', text: o.smmPct ? `${nf(o.smmPct)}% do peso${calc('smm')}` : calc('smm').replace(/^ \(|\)$/g, '') });
  if (o.muscleKg) add('Músculo e massa magra', 'mmt', 'Massa muscular total', o.muscleKg, { unit: 'kg' });
  if (o.smi) add('Músculo e massa magra', 'smi', 'Índice de massa muscular apendicular (ASM ÷ altura²)', o.smi, male ? { unit: 'kg/m²', ok: [7, BIG], warn: [6.5, BIG], ref: '7,0 ou mais (homens)', text: 'Abaixo de 7,0: baixa massa muscular, critério de sarcopenia (EWGSOP2)' } : { unit: 'kg/m²', ok: [5.5, BIG], warn: [5, BIG], ref: '5,5 ou mais (mulheres)', text: 'Abaixo de 5,5: baixa massa muscular, critério de sarcopenia (EWGSOP2)' });
  if (o.boneKg) add('Músculo e massa magra', 'osso', 'Massa óssea', o.boneKg, { unit: 'kg', text: 'Estimativa do aparelho; não substitui densitometria' });
  if (o.tbwPct) add('Água e estado celular', 'agua', 'Água corporal', o.tbwPct, male ? { unit: '%', ok: [50, 65], warn: [47, 68], ref: '50 a 65% (homens)', text: (o.tbwL ? nf(o.tbwL) + ' L' : '') + calc('tbwPct') } : { unit: '%', ok: [45, 60], warn: [42, 63], ref: '45 a 60% (mulheres)', text: (o.tbwL ? nf(o.tbwL) + ' L' : '') + calc('tbwPct') });
  if (o.ecwr) add('Água e estado celular', 'aec', 'Água extracelular ÷ água total', o.ecwr, { unit: 'x', ok: [0.36, 0.39], warn: [0.35, 0.40], ref: '0,360 a 0,390', text: 'Acima de 0,390 sugere retenção de líquido ou inflamação' });
  if (o.pa) add('Água e estado celular', 'af', 'Ângulo de fase', o.pa, { unit: '°', ok: [5, BIG], warn: [4, BIG], ref: '5° ou mais (adultos)', text: `Integridade das membranas celulares; varia com idade, sexo e IMC${calc('pa')}` });
  if (o.bmr) add('Metabolismo', 'tmb', 'Taxa metabólica basal', o.bmr, { unit: 'kcal', disp: Math.round(o.bmr), text: calc('bmr').replace(/^ \(|\)$/g, '') });
  if (o.metAge) add('Metabolismo', 'idmet', 'Idade metabólica', o.metAge, ag ? { unit: 'anos', ok: [0, ag], warn: [0, ag + 5], ref: `até a idade real (${ag} anos)`, text: 'Estimativa do aparelho' } : { unit: 'anos' });
  return out;
  function has(v) { return v !== '' && v != null && +v > 0; }
}
const BIO_EXPLAIN = {
  bio_imc: ['Peso adequado para a altura.', 'IMC fora da faixa; interprete junto com a gordura e a massa magra, porque o IMC não separa músculo de gordura.'],
  bio_gord: ['Gordura corporal dentro da faixa saudável para sexo e idade.', 'Gordura corporal fora da faixa saudável para sexo e idade.'],
  bio_fmi: ['Gordura proporcional à altura.', 'Gordura acima (ou abaixo) do esperado para a altura.'],
  bio_visc: ['Gordura visceral em nível saudável.', 'Gordura visceral elevada: associada a risco cardiometabólico.'],
  bio_cint: ['Cintura dentro do recomendado.', 'Cintura acima do recomendado: indica gordura abdominal e risco cardiometabólico.'],
  bio_rcest: ['Cintura proporcional à altura.', 'Cintura maior que metade da altura: risco cardiometabólico aumentado.'],
  bio_rcq: ['Distribuição de gordura adequada.', 'Gordura concentrada no abdome.'],
  bio_imlg: ['Massa magra adequada para a altura.', 'Massa magra reduzida para a altura: avaliar força, alimentação e treino.'],
  bio_smi: ['Massa muscular dos membros adequada.', 'Massa muscular dos membros baixa: confirme com teste de força (preensão palmar ou sentar e levantar).'],
  bio_agua: ['Hidratação dentro do esperado.', 'Água corporal fora do esperado: confira hidratação e o preparo para o exame.'],
  bio_aec: ['Distribuição de água equilibrada.', 'Água extracelular aumentada: pode indicar edema, inflamação ou desidratação celular.'],
  bio_af: ['Ângulo de fase adequado.', 'Ângulo de fase baixo: pode indicar pior integridade celular, desnutrição ou inflamação.'],
  bio_idmet: ['Idade metabólica até a idade real.', 'Idade metabólica acima da idade real.'],
};
{ const base = explain; explain = m => { const e = BIO_EXPLAIN[m.key]; if (e) return e[m.status === 'ok' || m.status === 'na' ? 0 : 1]; return base(m); }; }

// unidades novas na formatação das medidas
{ const base = fmtM; fmtM = m => m.unit === 'kg' ? nf(kgOut(m.v)) + ' ' + kgUnit() : m.unit === 'kg/m²' ? nf(m.v) + ' kg/m²' : m.unit === 'kcal' ? nf(m.v, 0) + ' kcal' : m.unit === 'L' ? nf(m.v) + ' L' : m.unit === 'anos' ? nf(m.v, 0) + ' anos' : m.unit === 'nível' ? nf(m.v, 0) : base(m); }

// integra com o restante do app (lista do paciente, evolução, achados, banco de resultados)
{ const base = allMeasures; allMeasures = a => KINDS[kindOf(a)].bio ? bioMeasures(a).map(m => ({ slot: 'bio', m })) : base(a); }
{ const base = slotLabel; slotLabel = (a, s) => s === 'bio' ? 'Bioimpedância' : base(a, s); }
{ const base = assessSummary; assessSummary = a => { if (!KINDS[kindOf(a)].bio) return base(a); const b = a.bio || {}; const ok = +b.weight > 0; const fp = ok ? bioCompute(b).fatPct : null; return { done: ok ? 1 : 0, total: 1, text: ok ? `${nf(kgOut(+b.weight))} ${kgUnit()}${fp ? ' · gordura ' + nf(fp) + '%' : ''}${b.device ? ' · ' + b.device : ''}` : 'Dados não preenchidos' }; }; }

/* ---------- desenho: barra de composição corporal ---------- */
function bioBar(o, W) {
  if (!W || !o.fatKg) return '';
  const fat = Math.max(0, Math.min(100, 100 * o.fatKg / W)), mus = o.smm ? Math.min(100 - fat, 100 * o.smm / W) : 0, rest = 100 - fat - mus;
  const seg = (w, c, t) => w > 0 ? `<span style="width:${w}%;background:${c}" title="${esc(t)}">${w >= 12 ? esc(t) : ''}</span>` : '';
  return `<div class="biobar" role="img" aria-label="Gordura ${nf(fat)}%, músculo ${nf(mus)}%, outros tecidos ${nf(rest)}%">${seg(fat, '#E5484D', 'Gordura ' + nf(fat, 0) + '%')}${seg(mus, 'var(--accent)', 'Músculo ' + nf(mus, 0) + '%')}${seg(rest, '#8B8F98', (mus ? 'Outros ' : 'Massa magra ') + nf(rest, 0) + '%')}</div>
    <div class="biolegend"><span><i style="background:#E5484D"></i>Gordura ${nf(kgOut(o.fatKg))} ${kgUnit()}</span>${mus ? `<span><i style="background:var(--accent)"></i>Músculo esquelético ${nf(kgOut(o.smm))} ${kgUnit()}</span>` : ''}<span><i style="background:#8B8F98"></i>${mus ? 'Água, ossos e órgãos' : 'Massa magra'} ${nf(kgOut(W - o.fatKg - (o.smm || 0)))} ${kgUnit()}</span></div>`;
}
// comparação com a bioimpedância anterior do mesmo paciente
const BIO_DELTA = [['weight', 'Peso', 'kg', 0], ['fatPct', 'Gordura', '%', -1], ['fatKg', 'Massa de gordura', 'kg', -1], ['ffm', 'Massa livre de gordura', 'kg', 1], ['smm', 'Massa muscular esquelética', 'kg', 1], ['visceral', 'Gordura visceral', 'nível', -1], ['tbwPct', 'Água corporal', '%', 0], ['pa', 'Ângulo de fase', '°', 1], ['waist', 'Cintura', 'cm', -1]];
function bioDeltas(cur, prev) {
  const oc = { ...bioCompute(cur), weight: +cur.weight, waist: +cur.waist || null }, op = { ...bioCompute(prev), weight: +prev.weight, waist: +prev.waist || null };
  return BIO_DELTA.filter(([k]) => oc[k] && op[k]).map(([k, l, u, good]) => {
    const d = oc[k] - op[k], cls = Math.abs(d) < 0.05 || !good ? 'na' : (d * good > 0 ? 'ok' : 'bad');
    const fmt = v => u === 'nível' ? nf(v, 0) : u === 'kg' ? nf(kgOut(v)) + ' ' + kgUnit() : u === 'cm' ? nf(cmOut(v)) + ' ' + cmUnit() : nf(v) + (u === '%' ? '%' : u === '°' ? '°' : '');
    return { k, l, prev: fmt(op[k]), cur: fmt(oc[k]), d: (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d)).replace(/^-/, ''), cls, raw: d };
  });
}

/* ---------- tela ---------- */
SCREENS.bio = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId); if (!p) return go('patients');
  const prevA = (await Store.all('assessments')).filter(x => x.patientId === p.id && kindOf(x) === 'bio' && x.id !== a.id && x.date <= a.date && +x.bio?.weight > 0).sort((x, y) => y.date.localeCompare(x.date))[0];
  a.bio ||= { sex: p.sex === 'M' ? 'M' : 'F', age: age(p.birth) ?? '', height: p.height || '', weight: p.weight || '', prep: {} };
  const b = a.bio; b.prep ||= {};
  const num = (k, v) => v === '' || v == null ? '' : String(v);
  const field = ([k, l, u, mn, mx]) => `<label class="f bioin">${esc(l)}<span class="unitin"><input data-b="${k}" type="number" inputmode="decimal" step="any" min="0" value="${esc(num(k, b[k]))}" placeholder="—"><em>${esc(u)}</em></span><small class="biocalc" data-c="${k}"></small></label>`;
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)}</span><h1>Bioimpedância</h1></div>
      <div class="row" style="align-items:flex-end"><label class="f" style="min-width:160px">Data<input id="b-date" type="date" value="${a.date.slice(0, 10)}"></label></div></div>
    <p class="muted" style="margin:0;max-width:75ch">Digite os números do laudo do seu aparelho de bioimpedância. Os resultados e a comparação com as faixas de referência aparecem logo abaixo, enquanto você digita.</p>
    <section class="panel stack"><h2>Paciente</h2>
      <div class="biogrid">
        <label class="f">Sexo<select data-b="sex"><option value="F"${b.sex !== 'M' ? ' selected' : ''}>Feminino</option><option value="M"${b.sex === 'M' ? ' selected' : ''}>Masculino</option></select></label>
        ${field(['age', 'Idade', 'anos'])}${field(['height', 'Altura', 'cm'])}${field(['weight', 'Peso', 'kg'])}
        <label class="f">Aparelho<input data-b="device" list="b-devs" value="${esc(b.device || '')}" placeholder="Ex.: InBody 270"><datalist id="b-devs">${['InBody 120', 'InBody 270', 'InBody 570', 'InBody 770', 'Tanita BC-601', 'Tanita MC-780', 'Omron HBF-514', 'Sanny BIA', 'Biodynamics 450', 'Maltron BioScan', 'Seca mBCA'].map(d => `<option value="${d}">`).join('')}</datalist></label>
      </div></section>
    ${BIO_FIELDS.map(([t, sub, fs], i) => `<details class="panel bioblock" ${i === 0 || fs.some(f => b[f[0]]) ? 'open' : ''}><summary><h2 style="display:inline">${esc(t)}</h2></summary>${sub ? `<p class="muted" style="margin:6px 0 0;font-size:.88rem">${esc(sub)}</p>` : ''}<div class="biogrid" style="margin-top:10px">${fs.map(field).join('')}</div></details>`).join('')}
    <details class="panel bioblock"><summary><h2 style="display:inline">Preparo para o exame</h2> <span class="muted" id="b-prepn"></span></summary>
      <p class="muted" style="margin:6px 0 10px;font-size:.88rem">O preparo muda bastante o resultado. Marque o que foi seguido; vai para o relatório.</p>
      <div class="stack" style="gap:8px">${BIO_PREP.map(([k, l]) => `<label class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" data-prep="${k}" ${b.prep[k] ? 'checked' : ''} style="margin-top:3px"> ${esc(l)}</label>`).join('')}</div>
      <p class="muted" style="margin:10px 0 0;font-size:.82rem">Não faça bioimpedância em quem usa marca-passo ou desfibrilador implantado, nem em gestantes. Na mulher, o período menstrual pode alterar a água corporal.</p></details>
    <section class="panel stack" id="b-res"></section>
    <section class="panel stack"><label class="f">Observações da coleta<textarea id="b-notes" rows="2" placeholder="Ex.: paciente veio direto do trabalho, tomou café às 7h.">${esc(a.notes || '')}</textarea></label>
      <label class="f">Conclusão do profissional (vai para o relatório)<textarea id="b-concl" rows="3" placeholder="Interpretação, metas e conduta.">${esc(a.conclusion || '')}</textarea></label></section>
    <div class="row"><button class="btn primary" id="b-pdf">Exportar PDF</button><button class="btn ghost danger" id="b-del">🗑 Excluir avaliação</button></div>`;
  bindBack('patient', { id: p.id });
  let tm = 0;
  const save = () => { clearTimeout(tm); tm = setTimeout(() => Store.put('assessments', a), 300); };
  const drawRes = () => {
    const o = bioCompute(b), ms = bioMeasures(a);
    $$('[data-c]').forEach(el => { const k = el.dataset.c; el.textContent = o.calc[k] && !(b[k] > 0) ? `= ${k === 'bmr' ? nf(o[k], 0) : nf(o[k])} (${o.calc[k]})` : ''; });
    $('#b-prepn').textContent = `(${BIO_PREP.filter(([k]) => b.prep[k]).length} de ${BIO_PREP.length})`;
    if (!ms.length) { $('#b-res').innerHTML = '<h2>Resultados</h2><p class="muted" style="margin:0">Digite pelo menos o peso para ver os resultados.</p>'; return; }
    const grps = [...new Set(ms.map(m => m.grp))];
    const cnt = s => ms.filter(m => m.status === s).length;
    const dl = prevA ? bioDeltas(b, prevA.bio) : [];
    $('#b-res').innerHTML = `<div class="row spread"><h2>Resultados</h2><span class="row" style="gap:6px">${cnt('bad') ? `<span class="st bad">${cnt('bad')} alterado${cnt('bad') > 1 ? 's' : ''}</span>` : ''}${cnt('warn') ? `<span class="st warn">${cnt('warn')} em atenção</span>` : ''}${cnt('ok') ? `<span class="st ok">${cnt('ok')} ${cnt('ok') > 1 ? 'normais' : 'normal'}</span>` : ''}</span></div>
      ${bioBar(o, +b.weight)}
      ${grps.map(g => `<h3 style="margin:8px 0 0">${esc(g)}</h3>${measureTable(ms.filter(m => m.grp === g))}`).join('')}
      ${dl.length ? `<h3 style="margin:8px 0 0">Comparação com ${fmtDate(prevA.date)}</h3><div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Antes</th><th style="text-align:right">Agora</th><th style="text-align:right">Diferença</th></tr></thead><tbody>${dl.map(r => `<tr><td>${esc(r.l)}</td><td class="v">${esc(r.prev)}</td><td class="v">${esc(r.cur)}</td><td class="v"><span class="st ${r.cls}">${esc(r.d)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="muted" style="margin:0;font-size:.8rem">Valores calculados pelo app aparecem com a fórmula usada. A bioimpedância estima a composição corporal; resultados de aparelhos diferentes não devem ser comparados entre si.</p>`;
  };
  $$('[data-b]').forEach(el => el.oninput = el.onchange = () => { const k = el.dataset.b; b[k] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; save(); drawRes(); });
  $$('[data-prep]').forEach(el => el.onchange = () => { b.prep[el.dataset.prep] = el.checked; save(); drawRes(); });
  $('#b-date').onchange = e => { if (e.target.value) { a.date = e.target.value + a.date.slice(10); save(); } };
  $('#b-notes').oninput = e => { a.notes = e.target.value; save(); };
  $('#b-concl').oninput = e => { a.conclusion = e.target.value; save(); };
  $('#b-pdf').onclick = async () => {
    await Store.put('assessments', a);
    if (!bioMeasures(a).length) return toast('Digite pelo menos o peso.');
    const bt = $('#b-pdf'); bt.disabled = true; bt.textContent = 'Gerando…';
    try { await exportPDF(a, p); } catch (e) { toast('Não foi possível gerar o PDF: ' + e.message, 5000); }
    bt.disabled = false; bt.textContent = 'Exportar PDF';
  };
  $('#b-del').onclick = () => deleteAssessment(a, () => go('patient', { id: p.id }));
  if (!a.createdBio) { a.createdBio = true; await Store.put('assessments', a); }
  drawRes();
};

/* ---------- PDF ---------- */
async function bioPDF(ctx) {
  const { doc, a, M: X, W, y: y0, h2, para, table, need, SC, INK, MUT } = ctx;
  let y = y0; const b = a.bio || {}, o = bioCompute(b), ms = bioMeasures(a), Wt = +b.weight;
  if (Wt && o.fatKg) {
    h2('Composição corporal'); y = ctx.getY();
    const bw = W - 2 * X, fat = o.fatKg / Wt, mus = o.smm ? Math.min(1 - fat, o.smm / Wt) : 0;
    need(16); y = ctx.getY();
    doc.setFillColor(229, 72, 77); doc.rect(X, y, bw * fat, 7, 'F');
    if (mus) { doc.setFillColor(231, 152, 19); doc.rect(X + bw * fat, y, bw * mus, 7, 'F'); }
    doc.setFillColor(139, 143, 152); doc.rect(X + bw * (fat + mus), y, bw * (1 - fat - mus), 7, 'F');
    doc.setFontSize(8); doc.setTextColor(...INK);
    doc.text(pdfSafe(`Gordura ${nf(fat * 100, 0)}% (${nf(kgOut(o.fatKg))} ${kgUnit()})`), X, y + 11);
    if (mus) doc.text(pdfSafe(`Músculo esquelético ${nf(mus * 100, 0)}% (${nf(kgOut(o.smm))} ${kgUnit()})`), X + bw * 0.36, y + 11);
    doc.text(pdfSafe(`${mus ? 'Outros' : 'Massa magra'} ${nf((1 - fat - mus) * 100, 0)}%`), X + bw, y + 11, { align: 'right' });
    ctx.setY(y + 17);
  }
  for (const g of [...new Set(ms.map(m => m.grp))]) { h2(g); ctx.setY(table(ms.filter(m => m.grp === g), X, W - 2 * X, ctx.getY()) + 3); }
  const prevA = (await Store.all('assessments')).filter(x => x.patientId === a.patientId && kindOf(x) === 'bio' && x.id !== a.id && x.date <= a.date && +x.bio?.weight > 0).sort((x, y2) => y2.date.localeCompare(x.date))[0];
  const dl = prevA ? bioDeltas(b, prevA.bio) : [];
  if (dl.length) {
    h2(`Comparação com ${fmtDate(prevA.date)}`); y = ctx.getY();
    doc.setFontSize(7.5); doc.setTextColor(...MUT); ['MEDIDA', 'ANTES', 'AGORA', 'DIFERENÇA'].forEach((t, i) => doc.text(t, i ? X + 70 + (i - 1) * 38 : X, y)); y += 5;
    doc.setFontSize(9.5);
    for (const r of dl) { ctx.setY(y); need(6); y = ctx.getY(); doc.setTextColor(...INK); doc.text(pdfSafe(r.l), X, y); doc.text(pdfSafe(r.prev), X + 70, y); doc.text(pdfSafe(r.cur), X + 108, y); doc.setTextColor(...SC[r.cls]); doc.text(pdfSafe(r.d), X + 146, y); y += 5.2; }
    ctx.setY(y + 3);
  }
  const prep = BIO_PREP.filter(([k]) => b.prep?.[k]).map(([, l]) => l), miss = BIO_PREP.filter(([k]) => !b.prep?.[k]).map(([, l]) => l.toLowerCase());
  h2('Preparo e método');
  para(`${b.device ? 'Aparelho: ' + b.device + '. ' : ''}${prep.length ? 'Preparo seguido: ' + prep.join('; ').toLowerCase() + '.' : 'Preparo não informado.'}${prep.length && miss.length ? ' Não confirmado: ' + miss.join('; ') + '.' : ''}`, 9);
  const calcs = Object.entries(o.calc).map(([k, how]) => `${(BIO_FIELDS.flatMap(g => g[2]).find(f => f[0] === k) || [k, k])[1]}: ${how}`);
  if (calcs.length) para('Valores calculados pelo app: ' + calcs.join('; ') + '.', 8.5, MUT);
  para('A bioimpedância estima a composição corporal e depende do preparo e do aparelho. Compare resultados sempre no mesmo aparelho e nas mesmas condições.', 8, MUT);
}
