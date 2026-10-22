/* TEAMRM - Posture & Correction — análise dinâmica em vídeo.
   Dois modos: movimento/exercício específico (repetições, amplitude, % do normal, regularidade,
   compensações) e ângulos livres. Rastreio por IA (MediaPipe Pose) ou marcadores verdes.        */
'use strict';

// índices do MediaPipe Pose [lado direito, lado esquerdo]
const VID_PTS = { orelha: [8, 7], ombro: [12, 11], cotovelo: [14, 13], punho: [16, 15], quadril: [24, 23], joelho: [26, 25], tornozelo: [28, 27], pe: [32, 31], calcanhar: [30, 29] };
// posição-modelo (unidades da altura, olhando para a direita) — 1º quadro no modo marcadores verdes sem IA
const VID_TPL = { orelha: [.52, .08], ombro: [.5, .2], cotovelo: [.5, .36], punho: [.53, .5], quadril: [.5, .5], joelho: [.51, .71], tornozelo: [.5, .93], pe: [.58, .97], calcanhar: [.47, .97] };
const VID_CHAIN = [['orelha', 'ombro'], ['ombro', 'cotovelo'], ['cotovelo', 'punho'], ['ombro', 'quadril'], ['quadril', 'joelho'], ['joelho', 'tornozelo'], ['tornozelo', 'pe'], ['tornozelo', 'calcanhar']];
const baseName = n => n.replace(/[DE]$/, '');
function mpIndex(name, side) {
  const m = /^(.*?)([DE])$/.exec(name);
  if (m && VID_PTS[m[1]]) return VID_PTS[m[1]][m[2] === 'D' ? 0 : 1];
  return VID_PTS[name][side === 'D' ? 0 : 1];
}
const vdir = (P, side) => (P.pe && P.tornozelo) ? (Math.sign(P.pe.x - P.tornozelo.x) || (side === 'D' ? 1 : -1)) : (side === 'D' ? 1 : -1);
const trunkLean = (P, s) => Math.atan2((P.ombro.x - P.quadril.x) * vdir(P, s), P.quadril.y - P.ombro.y) * DEG;
const latLean = P => { const sh = mid(P.ombroD, P.ombroE), hp = mid(P.quadrilD, P.quadrilE); return Math.atan2(sh.x - hp.x, hp.y - sh.y) * DEG; };
function fppa(P, s) {   // ângulo de projeção no plano frontal do joelho; + = valgo
  const h = P['quadril' + s], k = P['joelho' + s], a = P['tornozelo' + s], other = P['joelho' + (s === 'D' ? 'E' : 'D')];
  const dev = 180 - interior(h, k, a), xl = xOnLine(h, a, k.y);
  return Math.abs(k.x - other.x) < Math.abs(xl - other.x) ? dev : -dev;
}

/* canais (séries) disponíveis */
const VID_ANGLES = {
  joelho: { label: 'Flexão do joelho', pts: ['quadril', 'joelho', 'tornozelo'], at: 'joelho', f: P => 180 - interior(P.quadril, P.joelho, P.tornozelo) },
  quadril: { label: 'Flexão do quadril', pts: ['ombro', 'quadril', 'joelho'], at: 'quadril', f: P => 180 - interior(P.ombro, P.quadril, P.joelho) },
  tronco: { label: 'Inclinação do tronco (+ à frente)', pts: ['ombro', 'quadril', 'pe', 'tornozelo'], at: 'ombro', f: trunkLean },
  tornozelo: { label: 'Ângulo tíbia–pé (menor = mais dorsiflexão)', pts: ['joelho', 'tornozelo', 'pe'], at: 'tornozelo', f: P => interior(P.joelho, P.tornozelo, P.pe) },
  ombro: { label: 'Flexão do ombro', pts: ['quadril', 'ombro', 'cotovelo'], at: 'cotovelo', f: P => interior(P.quadril, P.ombro, P.cotovelo) },
  cotovelo: { label: 'Flexão do cotovelo', pts: ['ombro', 'cotovelo', 'punho'], at: 'punho', f: P => 180 - interior(P.ombro, P.cotovelo, P.punho) },
  cabeca: { label: 'Cabeça à frente do ombro', pts: ['orelha', 'ombro', 'pe', 'tornozelo'], at: 'orelha', f: (P, s) => Math.atan2((P.orelha.x - P.ombro.x) * vdir(P, s), P.ombro.y - P.orelha.y) * DEG },
};
const C = (key, label, pts, at, f, extra = {}) => ({ key, label, pts, at, f, ...extra });
/* movimentos e exercícios analisáveis
   primary: canal que conta repetições; normal: amplitude normal (AAOS); rel: medido a partir do 1º quadro
   comp: compensação (variação máxima a partir do início); extras: medidos no pico de cada repetição          */
const VMOVES = {
  ombroFlex: { label: 'Flexão do ombro', plane: 'lateral', normal: 180, primary: C('p', 'Flexão do ombro', ['quadril', 'ombro', 'cotovelo'], 'ombro', P => interior(P.quadril, P.ombro, P.cotovelo)), comp: C('c', 'Extensão compensatória do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'quadril', trunkLean, { warn: 10 }) },
  ombroExt: { label: 'Extensão do ombro', plane: 'lateral', normal: 60, primary: C('p', 'Extensão do ombro', ['quadril', 'ombro', 'cotovelo'], 'ombro', P => interior(P.quadril, P.ombro, P.cotovelo)), comp: C('c', 'Flexão compensatória do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'quadril', trunkLean, { warn: 10 }) },
  ombroAbd: { label: 'Abdução do ombro', plane: 'frontal', normal: 180, primary: C('p', 'Abdução do ombro', ['quadril', 'ombro', 'cotovelo'], 'ombro', P => interior(P.quadril, P.ombro, P.cotovelo)), comp: C('c', 'Inclinação lateral do tronco', ['ombroD', 'ombroE', 'quadrilD', 'quadrilE'], 'ombro', latLean, { warn: 10 }) },
  cotoveloFlex: { label: 'Flexão do cotovelo', plane: 'lateral', normal: 150, primary: C('p', 'Flexão do cotovelo', ['ombro', 'cotovelo', 'punho'], 'cotovelo', P => 180 - interior(P.ombro, P.cotovelo, P.punho)), comp: C('c', 'Elevação do braço junto', ['quadril', 'ombro', 'cotovelo'], 'ombro', P => interior(P.quadril, P.ombro, P.cotovelo), { warn: 15 }) },
  quadrilFlex: { label: 'Flexão do quadril', plane: 'lateral', normal: 120, primary: C('p', 'Flexão do quadril', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho)), comp: C('c', 'Inclinação compensatória do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'ombro', trunkLean, { warn: 10 }) },
  quadrilExt: { label: 'Extensão do quadril', plane: 'lateral', normal: 30, primary: C('p', 'Extensão do quadril', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho)), comp: C('c', 'Inclinação compensatória do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'ombro', trunkLean, { warn: 10 }) },
  quadrilAbd: { label: 'Abdução do quadril', plane: 'frontal', normal: 45, primary: C('p', 'Abdução do quadril', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho)), comp: C('c', 'Inclinação lateral do tronco', ['ombroD', 'ombroE', 'quadrilD', 'quadrilE'], 'ombro', latLean, { warn: 10 }) },
  joelhoFlex: { label: 'Flexão do joelho', plane: 'lateral', normal: 135, primary: C('p', 'Flexão do joelho', ['quadril', 'joelho', 'tornozelo'], 'joelho', P => 180 - interior(P.quadril, P.joelho, P.tornozelo)), comp: C('c', 'Movimento do quadril junto', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho), { warn: 15 }) },
  tornDorsi: { label: 'Dorsiflexão do tornozelo', plane: 'lateral', normal: 20, rel: -1, primary: C('p', 'Dorsiflexão (a partir da posição inicial)', ['joelho', 'tornozelo', 'pe'], 'tornozelo', P => interior(P.joelho, P.tornozelo, P.pe)) },
  tornPlantar: { label: 'Flexão plantar do tornozelo', plane: 'lateral', normal: 50, rel: 1, primary: C('p', 'Flexão plantar (a partir da posição inicial)', ['joelho', 'tornozelo', 'pe'], 'tornozelo', P => interior(P.joelho, P.tornozelo, P.pe)) },
  troncoFlex: { label: 'Flexão do tronco', plane: 'lateral', normal: 80, primary: C('p', 'Flexão do tronco', ['ombro', 'quadril'], 'ombro', P => fromV(P.quadril, P.ombro)), comp: C('c', 'Flexão dos joelhos', ['quadril', 'joelho', 'tornozelo'], 'joelho', P => 180 - interior(P.quadril, P.joelho, P.tornozelo), { warn: 10 }) },
  troncoExt: { label: 'Extensão do tronco', plane: 'lateral', normal: 25, primary: C('p', 'Extensão do tronco', ['ombro', 'quadril'], 'ombro', P => fromV(P.quadril, P.ombro)), comp: C('c', 'Flexão dos joelhos', ['quadril', 'joelho', 'tornozelo'], 'joelho', P => 180 - interior(P.quadril, P.joelho, P.tornozelo), { warn: 10 }) },
  cervIncl: { label: 'Inclinação lateral cervical', plane: 'frontal', normal: 45, primary: C('p', 'Inclinação da cabeça (linha das orelhas)', ['orelhaD', 'orelhaE'], 'orelhaD', P => tiltH(P.orelhaD, P.orelhaE)), comp: C('c', 'Elevação do ombro', ['ombroD', 'ombroE'], 'ombroD', P => tiltH(P.ombroD, P.ombroE), { warn: 5 }) },
  agachamento: { label: 'Agachamento (lateral)', plane: 'lateral', exercise: true, primary: C('p', 'Flexão do joelho', ['quadril', 'joelho', 'tornozelo'], 'joelho', P => 180 - interior(P.quadril, P.joelho, P.tornozelo), { target: 90, targetTxt: '≥ 90° para agachamento completo' }),
    extras: [C('quad', 'Flexão do quadril', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho)), C('tronco', 'Inclinação do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'ombro', trunkLean, { warnAbs: 45 }), C('tibia', 'Inclinação da tíbia', ['joelho', 'tornozelo'], 'tornozelo', P => fromV(P.tornozelo, P.joelho))] },
  agachFrontal: { label: 'Agachamento (frontal): valgo dinâmico', plane: 'frontal', exercise: true, primary: C('p', 'Profundidade (descida do quadril, % da perna)', ['quadrilD', 'quadrilE', 'tornozeloD', 'tornozeloE', 'joelhoD', 'joelhoE'], 'quadrilD', P => { const h = mid(P.quadrilD, P.quadrilE), a = mid(P.tornozeloD, P.tornozeloE); return 100 - (a.y - h.y) / (dist(P.quadrilD, P.tornozeloD) || 1) * 100; }),
    extras: [C('fppaD', 'Valgo dinâmico (FPPA) direito', ['quadrilD', 'joelhoD', 'tornozeloD', 'joelhoE'], 'joelhoD', P => fppa(P, 'D'), { ok: 10, warn: 15, ref: '≤ 10° (referência aproximada)' }), C('fppaE', 'Valgo dinâmico (FPPA) esquerdo', ['quadrilE', 'joelhoE', 'tornozeloE', 'joelhoD'], 'joelhoE', P => fppa(P, 'E'), { ok: 10, warn: 15, ref: '≤ 10° (referência aproximada)' }), C('pelve', 'Queda da pelve', ['quadrilD', 'quadrilE'], 'quadrilE', P => tiltH(P.quadrilD, P.quadrilE), { ok: 3, warn: 6, ref: '≤ 3°' })] },
  avanco: { label: 'Avanço (lateral)', plane: 'lateral', exercise: true, primary: C('p', 'Flexão do joelho da frente', ['quadril', 'joelho', 'tornozelo'], 'joelho', P => 180 - interior(P.quadril, P.joelho, P.tornozelo), { target: 90, targetTxt: '≈ 90°' }),
    extras: [C('tronco', 'Inclinação do tronco', ['ombro', 'quadril', 'pe', 'tornozelo'], 'ombro', trunkLean, { warnAbs: 20 }), C('quad', 'Flexão do quadril da frente', ['ombro', 'quadril', 'joelho'], 'quadril', P => 180 - interior(P.ombro, P.quadril, P.joelho))] },
  ponte: { label: 'Ponte de glúteos (lateral)', plane: 'lateral', exercise: true, primary: C('p', 'Extensão do quadril (ombro–quadril–joelho)', ['ombro', 'quadril', 'joelho'], 'quadril', P => interior(P.ombro, P.quadril, P.joelho), { target: 165, targetTxt: '≥ 165° (quadril alinhado)' }) },
  elevCalcanhar: { label: 'Elevação dos calcanhares (lateral)', plane: 'lateral', exercise: true, rel: 1, primary: C('p', 'Subida do calcanhar (% da tíbia)', ['joelho', 'tornozelo', 'calcanhar'], 'calcanhar', P => -P.calcanhar.y / (dist(P.joelho, P.tornozelo) || 1) * 100) },
};
const videoSession = {};   // id → { url, name }
let vidClock = 0;          // o modelo de vídeo exige carimbos de tempo sempre crescentes, inclusive entre análises

function seekVideo(v, t) { return new Promise(r => { const h = () => { v.removeEventListener('seeked', h); r(); }; v.addEventListener('seeked', h); v.currentTime = t; }); }
function denorm(p, w, h) { const o = {}; for (const k in p) o[k] = { x: p[k].x * w, y: p[k].y * h }; return o; }
function vChannels(vv) {
  if (vv.analysis === 'mov') { const M = VMOVES[vv.move]; return [M.primary, ...(M.comp ? [M.comp] : []), ...(M.extras || [])]; }
  return (vv.angles || []).map(k => ({ key: k, ...VID_ANGLES[k] }));
}
function vNeed(vv) { const s = new Set(); vChannels(vv).forEach(c => c.pts.forEach(p => s.add(p))); return [...s]; }
const smooth = (arr, w = 2) => arr.map((v, i) => { if (v == null) return null; let s = 0, n = 0; for (let j = i - w; j <= i + w; j++) if (arr[j] != null) { s += arr[j]; n++; } return s / n; });
/* repetições: picos do canal principal acima da metade da amplitude, separados por descidas */
function detectReps(vals, times) {
  const v = smooth(vals, 2), ok = v.filter(x => x != null); if (ok.length < 5) return [];
  const lo = Math.min(...ok), hi = Math.max(...ok), amp = hi - lo; if (amp < 5) return [];
  const thr = lo + amp * 0.5, reps = []; let cur = null;
  for (let i = 0; i < v.length; i++) {
    if (v[i] == null) continue;
    if (v[i] >= thr) { if (!cur) { let s = i; while (s > 0 && v[s - 1] != null && v[s - 1] < v[s]) s--; cur = { i0: s, ip: i }; } if (v[i] > v[cur.ip]) cur.ip = i; }
    else if (cur) { let e = i; while (e < v.length - 1 && v[e + 1] != null && v[e + 1] < v[e]) e++; cur.i1 = e; reps.push(cur); cur = null; }
  }
  if (cur) { cur.i1 = v.length - 1; reps.push(cur); }
  return reps.map(r => ({ i0: r.i0, ip: r.ip, i1: r.i1, t0: times[r.i0], tp: times[r.ip], t1: times[r.i1], peak: vals[r.ip] ?? v[r.ip] }));
}
const meanSd = xs => { const n = xs.length; if (!n) return { mean: null, sd: null }; const m = xs.reduce((a, b) => a + b, 0) / n; return { mean: m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / n) }; };
function vstats(vals, times) {
  const ok = vals.map((v, i) => [v, times[i]]).filter(p => p[0] != null); if (!ok.length) return null;
  let mn = ok[0], mx = ok[0]; for (const p of ok) { if (p[0] < mn[0]) mn = p; if (p[0] > mx[0]) mx = p; }
  return { min: mn[0], tmin: mn[1], max: mx[0], tmax: mx[1], amp: mx[0] - mn[0], mean: ok.reduce((s, p) => s + p[0], 0) / ok.length, n: ok.length };
}
/* resumo profissional da análise de um movimento */
function movementReport(vv) {
  const M = VMOVES[vv.move], prim = vv.series.p, reps = detectReps(prim, vv.times);
  const peaks = reps.map(r => r.peak), ms = meanSd(peaks), st = vstats(prim, vv.times);
  const best = peaks.length ? Math.max(...peaks) : st?.max;
  const out = { label: M.label, plane: M.plane, reps, best, mean: ms.mean, sd: ms.sd, cv: ms.mean ? ms.sd / Math.abs(ms.mean) * 100 : null,
    dur: meanSd(reps.map(r => r.t1 - r.t0)).mean, up: meanSd(reps.map(r => r.tp - r.t0)).mean, down: meanSd(reps.map(r => r.t1 - r.tp)).mean,
    conf: vv.conf != null ? vv.conf * 100 : null, items: [] };
  if (M.normal) {
    out.pct = best / M.normal * 100;
    out.status = out.pct >= 90 ? 'ok' : out.pct >= 75 ? 'warn' : 'bad';
    out.items.push({ label: 'Amplitude máxima', v: best, unit: '°', status: out.status, ref: `${M.normal}° (AAOS) · ${nf(out.pct, 0)}% do normal` });
  } else if (M.primary.target) {
    const okT = best >= M.primary.target; out.status = okT ? 'ok' : 'warn';
    out.items.push({ label: M.primary.label + ' (máxima)', v: best, unit: M.primary.unit || (M.primary.key === 'p' && /%/.test(M.primary.label) ? '%' : '°'), status: out.status, ref: M.primary.targetTxt });
  } else out.items.push({ label: M.primary.label + ' (máxima)', v: best, unit: /%/.test(M.primary.label) ? '%' : '°', status: 'na', ref: 'acompanhar evolução' });
  if (M.comp && vv.series.c) {
    const c = vv.series.c, c0 = c.find(x => x != null), dmax = Math.max(0, ...c.filter(x => x != null).map(x => Math.abs(x - c0)));
    out.items.push({ label: M.comp.label, v: dmax, unit: '°', status: dmax <= M.comp.warn ? 'ok' : dmax <= M.comp.warn * 1.5 ? 'warn' : 'bad', ref: `≤ ${M.comp.warn}° de variação` });
  }
  for (const E of M.extras || []) {
    const s = vv.series[E.key]; if (!s) continue;
    const atPeaks = reps.length ? reps.map(r => { let m = null; for (let i = r.i0; i <= r.i1; i++) if (s[i] != null && (m == null || Math.abs(s[i]) > Math.abs(m))) m = s[i]; return m; }).filter(x => x != null) : [vstats(s, vv.times)?.max];
    const worst = atPeaks.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0);
    let status = 'na', ref = 'no fundo do movimento';
    if (E.ok != null) { status = Math.abs(worst) <= E.ok ? 'ok' : Math.abs(worst) <= E.warn ? 'warn' : 'bad'; ref = E.ref; }
    if (E.warnAbs != null) { status = Math.abs(worst) <= E.warnAbs ? 'ok' : 'warn'; ref = `≤ ${E.warnAbs}°`; }
    out.items.push({ label: E.label + (E.key.startsWith('fppa') ? (worst >= 0 ? ' — valgo' : ' — varo') : ''), v: Math.abs(worst), unit: '°', status, ref });
  }
  // texto de interpretação
  const t = [];
  if (out.reps.length) t.push(`${out.reps.length} ${out.reps.length > 1 ? 'repetições detectadas' : 'repetição detectada'}, média de ${nf(out.mean)}° ± ${nf(out.sd)}°${out.dur ? ` e ${nf(out.dur)} s por repetição` : ''}.`);
  if (out.pct != null) t.push(out.pct >= 90 ? 'Amplitude preservada.' : out.pct >= 75 ? 'Amplitude levemente reduzida.' : 'Amplitude reduzida em relação ao valor de referência.');
  if (out.cv != null && out.reps.length > 1) t.push(out.cv <= 10 ? 'Repetições regulares.' : 'Repetições irregulares (variação acima de 10%): avaliar fadiga, dor ou controle motor.');
  const comp = out.items.find(i => M.comp && i.label === M.comp.label); if (comp && comp.status !== 'ok') t.push(`Compensação: ${M.comp.label.toLowerCase()} de ${nf(comp.v)}°.`);
  for (const i of out.items) if (/FPPA/.test(i.label) && i.status !== 'ok') t.push(`${i.label}: ${nf(i.v)}°, acima da referência; considerar fortalecimento de glúteo médio e controle do joelho.`);
  if (out.conf != null && out.conf < 70) t.push('Confiança de detecção baixa: grave com o corpo inteiro no quadro, boa luz e roupa justa.');
  out.text = t.join(' ');
  return out;
}

function drawVideoFrame(ctx, video, w, h, P, vv, settings) {
  ctx.drawImage(video, 0, 0, w, h);
  if (!P) return;
  const lw = Math.max(2, h / 260);
  ctx.lineCap = 'round'; ctx.strokeStyle = settings.lineColor; ctx.lineWidth = lw;
  for (const [a, b] of VID_CHAIN) for (const s of ['', 'D', 'E']) if (P[a + s] && P[b + s]) { ctx.beginPath(); ctx.moveTo(P[a + s].x, P[a + s].y); ctx.lineTo(P[b + s].x, P[b + s].y); ctx.stroke(); }
  for (const k in P) { ctx.beginPath(); ctx.arc(P[k].x, P[k].y, lw * 2.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw * .8; ctx.stroke(); }
  const fs = lw * 5; ctx.font = `600 ${fs}px "IBM Plex Mono",monospace`; ctx.textBaseline = 'middle';
  for (const c of vChannels(vv)) {
    if (!c.pts.every(p => P[p]) || !P[c.at]) continue;
    let val = c.f(P, vv.side); if (vv.analysis === 'mov' && c.key === 'p' && VMOVES[vv.move].rel && vv.base != null) val = (val - vv.base) * VMOVES[vv.move].rel;
    const p = P[c.at], t = nf(Math.abs(val)) + (/%/.test(c.label) ? '%' : '°'), tw = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(11,11,11,.82)'; ctx.fillRect(p.x + lw * 3, p.y - fs * .75, tw + lw * 3, fs * 1.5);
    ctx.fillStyle = c.key === 'p' ? '#F0A42A' : '#E6E6E6'; ctx.fillText(t, p.x + lw * 4.5, p.y);
  }
}
function seriesCanvas(vals, times, label, w = 900, h = 300, reps = []) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  const pts = vals.map((v, i) => [times[i], v]).filter(p => p[1] != null);
  if (!pts.length) return cv;
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])); if (hi - lo < 1) { lo -= 1; hi += 1; } const pad = (hi - lo) * .1; lo -= pad; hi += pad;
  const t0 = times[0], t1 = times[times.length - 1] || 1, pl = 60, pr = 16, pt = 30, pb = 36;
  const X = t => pl + (t - t0) / ((t1 - t0) || 1) * (w - pl - pr), Y = v => pt + (hi - v) / (hi - lo) * (h - pt - pb);
  c.font = '600 18px Helvetica, Arial'; c.fillStyle = '#111'; c.fillText(label, pl, 20);
  c.font = '14px Helvetica, Arial'; c.fillStyle = '#5D5C57'; c.strokeStyle = '#DAD9D3'; c.lineWidth = 1;
  const st = niceStep((hi - lo) / 4);
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) { c.beginPath(); c.moveTo(pl, Y(v)); c.lineTo(w - pr, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(nf(v, st < 1 ? 1 : 0), pl - 6, Y(v) + 5); }
  c.textAlign = 'center'; const ts = niceStep((t1 - t0) / 6 || 1);
  for (let t = 0; t <= t1 + 1e-6; t += ts) c.fillText(nf(t, ts < 1 ? 1 : 0) + ' s', X(t), h - 12);
  for (const r of reps) { c.fillStyle = 'rgba(231,152,19,.12)'; c.fillRect(X(r.t0), pt, X(r.t1) - X(r.t0), h - pt - pb); }
  c.strokeStyle = '#9A5B00'; c.lineWidth = 2.5; c.beginPath(); pts.forEach(([t, v], i) => i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v))); c.stroke();
  c.fillStyle = '#111'; reps.forEach((r, i) => { c.beginPath(); c.arc(X(r.tp), Y(r.peak), 5, 0, 7); c.fill(); c.fillText(String(i + 1), X(r.tp), Y(r.peak) - 10); });
  return cv;
}

SCREENS.video = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings();
  a.video ||= { side: 'D', angles: ['joelho', 'quadril', 'tronco'], mode: 'ia', fps: 15, analysis: 'mov', move: 'agachamento', keep: true };
  const vv = a.video; vv.analysis ||= 'angles'; vv.move ||= 'agachamento'; if (vv.keep === undefined) vv.keep = true;
  if (!videoSession[id]) { const med = await Store.get('media', 'video:' + id); if (med?.blob) videoSession[id] = { url: URL.createObjectURL(med.blob), name: med.name }; }
  const sess = videoSession[id] || {};
  const analyzed = vv.times && vv.times.length;
  const moveOpts = (ex) => Object.entries(VMOVES).filter(([, M]) => !!M.exercise === ex).map(([k, M]) => `<option value="${k}"${vv.move === k ? ' selected' : ''}>${esc(M.label)}${M.normal ? ' · normal ' + M.normal + '°' : ''}${M.plane === 'frontal' ? ' (de frente)' : ''}</option>`).join('');
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)}</span><h1>Análise dinâmica em vídeo</h1></div>
      <label class="f" style="min-width:160px">Data<input id="a-date" type="date" value="${a.date.slice(0, 10)}"></label></div>
    <section class="panel stack"><h2>1. O que analisar</h2>
      <div class="grid-form">
        <label class="f">Tipo de análise<select id="van"><option value="mov"${vv.analysis === 'mov' ? ' selected' : ''}>Movimento ou exercício específico</option><option value="angles"${vv.analysis === 'angles' ? ' selected' : ''}>Ângulos livres</option></select></label>
        <label class="f" id="vmovef" ${vv.analysis === 'mov' ? '' : 'hidden'}>Movimento<select id="vmove"><optgroup label="Amplitude de movimento">${moveOpts(false)}</optgroup><optgroup label="Exercícios">${moveOpts(true)}</optgroup></select></label>
        <label class="f">Lado avaliado (voltado para a câmera)<select id="vside"><option value="D"${vv.side === 'D' ? ' selected' : ''}>Direito</option><option value="E"${vv.side === 'E' ? ' selected' : ''}>Esquerdo</option></select></label>
        <label class="f">Rastreio<select id="vmode"><option value="ia"${vv.mode === 'ia' ? ' selected' : ''}>IA (sem marcadores)</option><option value="verde"${vv.mode === 'verde' ? ' selected' : ''}>Marcadores verdes</option></select></label>
        <label class="f">Quadros por segundo<select id="vfps">${[10, 15, 30].map(f => `<option${vv.fps === f ? ' selected' : ''}>${f}</option>`).join('')}</select></label>
      </div>
      <div id="vdemo"></div>
      <fieldset class="panel" style="padding:10px" id="vangf" ${vv.analysis === 'angles' ? '' : 'hidden'}><legend class="eyebrow">Ângulos</legend><div class="grid-form" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px">${Object.entries(VID_ANGLES).map(([k, A]) => `<label class="row" style="gap:6px;font-size:.9rem"><input type="checkbox" data-ang="${k}" ${vv.angles.includes(k) ? 'checked' : ''}> ${esc(A.label)}</label>`).join('')}</div></fieldset>
    </section>
    <section class="panel stack"><h2>2. Vídeo do paciente</h2>
      <p class="muted" style="margin:0;font-size:.9rem" id="vhint"></p>
      <div class="row"><label class="btn ${sess.url ? '' : 'primary'}" style="cursor:pointer">${sess.url ? 'Trocar vídeo' : 'Gravar ou escolher vídeo'}<input type="file" accept="video/*" capture="environment" id="vfile" hidden></label><span class="muted" id="vname">${esc(sess.name || vv.name || 'Nenhum vídeo carregado')}</span></div>
      <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="vkeep" ${vv.keep ? 'checked' : ''}> Guardar o vídeo do paciente neste aparelho (para rever quadro a quadro depois)</label>
      <div class="row"><button class="btn primary" id="run" ${sess.url ? '' : 'disabled'}>Analisar vídeo</button><span class="muted" id="prog"></span></div>
    </section>
    <section class="panel stack" id="viewer" ${sess.url && analyzed ? '' : 'hidden'}><h2>3. Quadro a quadro</h2>
      <canvas id="vcv" style="width:100%;max-height:70vh;object-fit:contain;background:#0B0B0B;border-radius:8px"></canvas>
      <label class="f">Tempo: <span class="num" id="vt">0,0 s</span><input type="range" id="vslider" min="0" max="${Math.max(0, (vv.times?.length || 1) - 1)}" value="0"></label>
      <div class="row"><button class="btn" id="rec">Gerar vídeo com as linhas</button><button class="btn" id="vjpg">Salvar este quadro (JPEG)</button></div>
    </section>
    <div id="vres"></div>`;
  bindBack('patient', { id: a.patientId });
  const hint = () => {
    const M = VMOVES[$('#vmove').value], mov = $('#van').value === 'mov';
    $('#vhint').textContent = mov ? `Grave ${M.plane === 'frontal' ? 'de frente' : 'de lado'}, câmera parada a ~3 m, corpo inteiro no quadro. Comece parado na posição inicial por 1 segundo e faça 3 a 5 repetições até a amplitude máxima.` : 'Grave de lado, câmera parada e perpendicular ao movimento, corpo inteiro no quadro.';
    const demo = mov && ROM_DEMO[$('#vmove').value] ? romDemoSVG($('#vmove').value, 120) : '';
    $('#vdemo').innerHTML = demo ? `<div class="row" style="align-items:center;gap:12px">${demo}<span class="muted" style="font-size:.88rem;max-width:40ch">Demonstração do movimento até a amplitude normal (${M.normal}°).</span></div>` : '';
  };
  hint();
  $('#van').onchange = e => { $('#vmovef').hidden = e.target.value !== 'mov'; $('#vangf').hidden = e.target.value === 'mov'; hint(); };
  $('#vmove').onchange = hint;
  $('#a-date').onchange = async e => { if (e.target.value) { a.date = new Date(e.target.value + 'T12:00:00').toISOString(); await Store.put('assessments', a); } };
  const readOpts = () => { vv.analysis = $('#van').value; vv.move = $('#vmove').value; vv.side = $('#vside').value; vv.mode = $('#vmode').value; vv.fps = +$('#vfps').value; vv.angles = $$('[data-ang]:checked').map(c => c.dataset.ang); vv.keep = $('#vkeep').checked; };
  $('#vkeep').onchange = async e => { vv.keep = e.target.checked; if (!vv.keep) await Store.del('media', 'video:' + id); await Store.put('assessments', a); };
  $('#vfile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    readOpts();
    if (sess.url) URL.revokeObjectURL(sess.url);
    videoSession[id] = { url: URL.createObjectURL(f), name: f.name };
    if (vv.keep) { if (f.size > 300 * 1048576) toast('Vídeo grande demais para guardar (acima de 300 MB); ele será analisado, mas não guardado.', 5000); else await Store.put('media', { id: 'video:' + id, kind: 'file', blob: f, name: f.name, type: f.type, createdAt: todayISO() }); }
    vv.name = f.name; await Store.put('assessments', a); go('video', { id });
  };

  let video = null, cw = 0, ch = 0;
  const cv = $('#vcv'), ctx = cv.getContext('2d');
  async function ensureVideo() {
    if (video) return video;
    video = document.createElement('video'); video.src = sess.url; video.muted = true; video.playsInline = true; video.preload = 'auto';
    await new Promise((res, rej) => { video.onloadeddata = res; video.onerror = () => rej(new Error('formato de vídeo não suportado neste navegador')); });
    const k = Math.min(1, 900 / Math.max(video.videoWidth, video.videoHeight)); cw = Math.round(video.videoWidth * k); ch = Math.round(video.videoHeight * k);
    cv.width = cw; cv.height = ch; return video;
  }
  async function showFrame(i) {
    if (!vv.times?.length) return; await ensureVideo();
    await seekVideo(video, vv.times[i]);
    drawVideoFrame(ctx, video, cw, ch, vv.frames[i] ? denorm(vv.frames[i], cw, ch) : null, vv, S);
    $('#vt').textContent = nf(vv.times[i]) + ' s'; $('#vslider').value = i;
  }

  $('#run').onclick = async () => {
    readOpts(); if (vv.analysis === 'angles' && !vv.angles.length) return toast('Escolha ao menos um ângulo');
    const btn = $('#run'); btn.disabled = true;
    try {
      await ensureVideo();
      const need = vNeed(vv);
      let lm = null;
      $('#prog').textContent = 'Carregando o modelo de IA…';
      try { lm = await withTimeout(model('poseVideo'), 40000); } catch (e) { if (vv.mode === 'ia') throw new Error('não foi possível carregar a IA (' + e.message + ')'); }
      const dur = video.duration, step = 1 / vv.fps, times = [], frames = [], confs = [];
      let prev = null, prev2 = null; const base = vidClock + 1000;
      for (let t = 0; t <= dur - 0.02; t += step) {
        await seekVideo(video, t);
        let P = null;
        if (lm) {
          const ts = Math.max(vidClock + 1, base + Math.round(t * 1000)); vidClock = ts;
          const r = lm.detectForVideo(video, ts);
          if (r.landmarks?.length) { P = {}; let vs = 0; for (const k of need) { const L = r.landmarks[0][mpIndex(k, vv.side)]; P[k] = { x: L.x, y: L.y }; vs += L.visibility ?? 1; } confs.push(vs / need.length); }
        }
        if (vv.mode === 'verde') {
          const blobs = findGreenBlobs(video, video.videoWidth, video.videoHeight, 480).map(b => ({ x: b.x / video.videoWidth, y: b.y / video.videoHeight }));
          let est = P;
          if (!est && prev) { est = {}; for (const k of need) { const v = prev2 && prev2[k] ? { x: prev[k].x - prev2[k].x, y: prev[k].y - prev2[k].y } : { x: 0, y: 0 }; est[k] = { x: prev[k].x + v.x, y: prev[k].y + v.y }; } }
          if (!est) { est = {}; const H = 0.9; for (const k of need) { const tp = VID_TPL[baseName(k)]; const sx = /E$/.test(k) ? .06 : /D$/.test(k) ? -.06 : 0; est[k] = { x: .5 + sx + (vv.side === 'D' ? 1 : -1) * (tp[0] - .5) * H * ch / cw, y: .05 + tp[1] * H }; } }
          const snapped = snapToBlobs(est, blobs, prev ? (P ? 0.06 : 0.05) : 0.2);
          P = { ...est, ...snapped };
        }
        times.push(+t.toFixed(3)); frames.push(P); if (P) { prev2 = prev; prev = P; }
        $('#prog').textContent = `Analisando ${Math.round(t / dur * 100)}%`;
        drawVideoFrame(ctx, video, cw, ch, P ? denorm(P, cw, ch) : null, vv, S);
        $('#viewer').hidden = false;
      }
      vv.times = times; vv.frames = frames; vv.duration = dur; vv.series = {}; vv.conf = confs.length ? confs.reduce((x, y) => x + y, 0) / confs.length : null;
      vv.base = null;
      for (const c of vChannels(vv)) vv.series[c.key] = frames.map(P => P && c.pts.every(q => P[q]) ? +c.f(denorm(P, cw, ch), vv.side).toFixed(2) : null);
      if (vv.analysis === 'mov' && VMOVES[vv.move].rel) {   // medido a partir da posição inicial (média do 1º meio segundo)
        const first = vv.series.p.slice(0, Math.max(1, Math.round(vv.fps / 2))).filter(x => x != null);
        vv.base = first.length ? first.reduce((x, y) => x + y, 0) / first.length : 0;
        vv.series.p = vv.series.p.map(x => x == null ? null : +((x - vv.base) * VMOVES[vv.move].rel).toFixed(2));
      }
      // quadros-chave: posição inicial e pico (movimento) ou mínimo/máximo do 1º ângulo
      vv.keyframes = [];
      const keyT = [];
      if (vv.analysis === 'mov') { const rep = movementReport(vv); vv.report = rep; const best = rep.reps.reduce((m, r) => !m || r.peak > m.peak ? r : m, null); keyT.push(['Posição inicial', times[0]]); if (best) keyT.push([`Pico da repetição ${rep.reps.indexOf(best) + 1} (${nf(best.peak)}°)`, best.tp]); else { const s0 = vstats(vv.series.p, times); if (s0) keyT.push(['Máximo', s0.tmax]); } }
      else { vv.report = null; const s0 = vstats(vv.series[vv.angles[0]], times); if (s0) keyT.push([`Mínimo de ${VID_ANGLES[vv.angles[0]].label.toLowerCase()}`, s0.tmin], [`Máximo de ${VID_ANGLES[vv.angles[0]].label.toLowerCase()}`, s0.tmax]); }
      for (const [lab, t] of keyT) {
        const i = times.indexOf(t); await seekVideo(video, t); drawVideoFrame(ctx, video, cw, ch, frames[i] ? denorm(frames[i], cw, ch) : null, vv, S);
        const kc = document.createElement('canvas'), kk = Math.min(1, 520 / Math.max(cw, ch)); kc.width = cw * kk; kc.height = ch * kk; kc.getContext('2d').drawImage(cv, 0, 0, kc.width, kc.height);
        vv.keyframes.push({ label: `${lab} · ${nf(t)} s`, img: kc.toDataURL('image/jpeg', .85) });
      }
      await Store.put('assessments', a);
      $('#prog').textContent = `${frames.filter(Boolean).length} de ${frames.length} quadros com o corpo detectado.`;
      $('#vslider').max = times.length - 1; renderResults(); showFrame(0);
    } catch (err) { $('#prog').textContent = ''; toast('Não foi possível analisar: ' + err.message, 5000); }
    btn.disabled = false;
  };
  $('#vslider').oninput = e => showFrame(+e.target.value);
  $('#vjpg').onclick = () => cv.toBlob(b => downloadBlob(b, `${slug(p.name)}-video-${$('#vt').textContent.replace(/\W+/g, '')}.jpg`), 'image/jpeg', .92);
  $('#rec').onclick = async () => {
    await ensureVideo();
    const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'], mime = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!mime || !cv.captureStream) return toast('Este navegador não grava vídeo a partir da tela. Use o Chrome.', 4000);
    const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { downloadBlob(new Blob(chunks, { type: mime }), `${slug(p.name)}-analise.${mime.includes('mp4') ? 'mp4' : 'webm'}`); toast('Vídeo gerado'); $('#rec').disabled = false; };
    $('#rec').disabled = true; await seekVideo(video, 0); rec.start(); await video.play();
    const tick = () => {
      if (video.ended || video.paused) { rec.stop(); return; }
      let i = 0; const t = video.currentTime; while (i < vv.times.length - 1 && vv.times[i + 1] <= t) i++;
      drawVideoFrame(ctx, video, cw, ch, vv.frames[i] ? denorm(vv.frames[i], cw, ch) : null, vv, S);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  function renderResults() {
    if (!vv.times?.length) { $('#vres').innerHTML = ''; return; }
    const lab = vv.times.map(t => nf(t) + ' s');
    const chans = vChannels(vv), R = vv.analysis === 'mov' ? movementReport(vv) : null;
    const unitOf = c => /%/.test(c.label) ? '%' : '°';
    const repTable = R && R.reps.length ? `<div class="tbl-wrap"><table><thead><tr><th>Repetição</th><th style="text-align:right">Pico</th><th style="text-align:right">Subida</th><th style="text-align:right">Volta</th><th style="text-align:right">Duração</th></tr></thead><tbody>${R.reps.map((r, i) => `<tr><td>${i + 1}</td><td class="v">${nf(r.peak)}${unitOf(VMOVES[vv.move].primary)}</td><td class="v">${nf(r.tp - r.t0)} s</td><td class="v">${nf(r.t1 - r.tp)} s</td><td class="v">${nf(r.t1 - r.t0)} s</td></tr>`).join('')}</tbody></table></div>` : '';
    $('#vres').innerHTML = `<section class="panel stack"><h2>4. Resultados</h2>
      ${R ? `<div class="summary">
          <div class="panel"><span class="eyebrow">${esc(R.items[0].label)}</span><b class="num">${nf(R.best)}${unitOf(VMOVES[vv.move].primary)}</b><span class="st ${R.status || 'na'}">${R.pct != null ? nf(R.pct, 0) + '% do normal' : esc(R.items[0].ref)}</span></div>
          <div class="panel"><span class="eyebrow">Repetições</span><b class="num">${R.reps.length}</b><span class="muted" style="font-size:.85rem">${R.dur ? nf(R.dur) + ' s em média' : 'nenhuma completa'}</span></div>
          <div class="panel"><span class="eyebrow">Regularidade</span><b class="num">${R.cv != null && R.reps.length > 1 ? nf(R.cv, 0) + '%' : '—'}</b><span class="muted" style="font-size:.85rem">variação entre repetições</span></div></div>
        <p style="margin:0">${esc(R.text)}</p>
        <div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Valor</th><th>Situação</th></tr></thead><tbody>
          ${R.items.map(i => `<tr><td>${esc(i.label)}<span class="ref">ref. ${esc(i.ref || '')}</span></td><td class="v">${nf(i.v)}${i.unit}</td><td><span class="st ${i.status}">${STATUS[i.status]}</span></td></tr>`).join('')}
          ${R.mean != null ? `<tr><td>Pico médio por repetição</td><td class="v">${nf(R.mean)} ± ${nf(R.sd)}</td><td></td></tr>` : ''}
          ${R.conf != null ? `<tr><td>Confiança da detecção<span class="ref">média dos pontos usados</span></td><td class="v">${nf(R.conf, 0)}%</td><td><span class="st ${R.conf >= 80 ? 'ok' : R.conf >= 60 ? 'warn' : 'bad'}">${R.conf >= 80 ? 'Alta' : R.conf >= 60 ? 'Média' : 'Baixa'}</span></td></tr>` : ''}
        </tbody></table></div>${repTable}`
      : `<div class="tbl-wrap"><table><thead><tr><th>Ângulo</th><th style="text-align:right">Mínimo</th><th style="text-align:right">Máximo</th><th style="text-align:right">Amplitude</th><th style="text-align:right">Média</th></tr></thead><tbody>
        ${chans.map(c => { const s = vstats(vv.series[c.key], vv.times); return s ? `<tr><td>${esc(c.label)}</td><td class="v">${nf(s.min)}° <span class="muted">(${nf(s.tmin)} s)</span></td><td class="v">${nf(s.max)}° <span class="muted">(${nf(s.tmax)} s)</span></td><td class="v">${nf(s.amp)}°</td><td class="v">${nf(s.mean)}°</td></tr>` : ''; }).join('')}</tbody></table></div>`}
      ${chans.map(c => { const pts = (vv.series[c.key] || []).map((v, i) => v == null ? null : { v, label: lab[i], i }).filter(Boolean); return pts.length ? `<div class="stack" style="gap:4px"><h3>${esc(c.label)}</h3><div style="position:relative" data-ch="${c.key}">${lineChartSVG(pts, { unit: unitOf(c), height: 200 })}</div></div>` : ''; }).join('')}
      ${vv.keyframes?.length ? `<div class="row" style="align-items:flex-start">${vv.keyframes.map(f => `<figure style="margin:0;max-width:260px"><img src="${f.img}" alt="${esc(f.label)}" style="width:100%;border-radius:8px"><figcaption class="muted" style="font-size:.8rem">${esc(f.label)}</figcaption></figure>`).join('')}</div>` : ''}
      <p class="muted" style="margin:0;font-size:.82rem">Medidas 2D: o valor é fiel quando o movimento acontece no plano perpendicular à câmera. Rotações fora desse plano reduzem o ângulo medido.</p>
      <label class="f">Conclusão do profissional<textarea id="vconcl" rows="3">${esc(a.conclusion || '')}</textarea></label>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="vpdf">Exportar PDF</button></div></section>`;
    bindCharts($('#vres'));
    chans.forEach(c => { const svg = $(`[data-ch="${c.key}"] svg`); if (!svg) return; const idxs = vv.series[c.key].map((v, i) => v == null ? null : i).filter(i => i != null); svg._onHover = j => { if (videoSession[id]?.url) showFrame(idxs[j]); }; });
    $('#vconcl').onchange = async e => { a.conclusion = e.target.value; await Store.put('assessments', a); toast('Conclusão salva'); };
    $('#vpdf').onclick = async () => { a.conclusion = $('#vconcl').value; await Store.put('assessments', a); try { await exportPDF(a, p); toast('PDF gerado'); } catch (err) { toast('Não foi possível gerar o PDF: ' + err.message, 4000); } };
  }
  renderResults();
  if (sess.url && analyzed) showFrame(0);
  cleanup = () => { if (video) { video.pause(); video.removeAttribute('src'); } };
};
