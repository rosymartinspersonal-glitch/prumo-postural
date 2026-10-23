/* TEAMRM - Posture & Correction — animações ilustrativas dos exercícios e dos movimentos de ADM.
   Figura com volume, músculo-alvo destacado, seta de direção, posição inicial em transparência,
   legendas das fases, contador de repetições e goniômetro com os graus ao vivo.
   Substitui exPicto / exAnim / romDemoSVG de exercises.js (mesmos nomes).                         */
'use strict';

const FIG = { skin: '#E2B190', shirt: '#E79813', shorts: '#232323', hi: '#E5484D', line: 'var(--surface)' };

/* ---------- poses extras (perfil, olhando para a direita, caixa 100×100) ---------- */
const poseMod = (base, ch) => Object.assign(JSON.parse(JSON.stringify(POSES[base])), ch);
Object.assign(POSES, {
  sentadoCabecaInclinada: poseMod('sentadoCadeira', { h: [36, 22] }),
  sentadoQueixoRecolhido: poseMod('sentadoCadeira', { h: [38, 20] }),
  sentadoCabecaFlexao: poseMod('sentadoCadeira', { h: [50, 26] }),
  supinoCabecaAceno: poseMod('supinoJoelhos', { h: [13, 82] }),
  supinoPernaCruzada: poseMod('supinoJoelhos', { k: [60, 62], f: [70, 78], k2: [66, 68], f2: [74, 86] }),
  supinoJoelhosLado: poseMod('supinoJoelhos', { k: [62, 76], f: [78, 90] }),
  supinoJoelhosPeito: poseMod('supinoJoelhos', { k: [48, 66], f: [62, 70] }),
  sentadoBorboletaAberta: poseMod('sentadoChao', { k: [48, 80], f: [52, 86] }),
  sentadoGiro: poseMod('sentadoChao', { s: [32, 56], h: [36, 44], e: [24, 66], w: [20, 78] }),
  semiajoelhadoFrente: poseMod('semiajoelhado', { s: [54, 32], h: [56, 20], p: [54, 60], k: [72, 66] }),
  emPeBracosFrente: poseMod('emPe', { e: [64, 26], w: [78, 26] }),
  emPePernaFrente: poseMod('emPe', { k: [64, 66], f: [76, 78] }),
  emPePernaTras: poseMod('emPe', { k: [42, 72], f: [30, 86] }),
  deLadoBracoAberto: poseMod('deLado', { e: [28, 74], w: [20, 70] }),
  quatroApoiosGiro: poseMod('quatroApoios', { e: [66, 38], w: [62, 24] }),
  quatroApoiosPunhoTras: poseMod('quatroApoios', { s: [76, 50], h: [86, 44], p: [44, 50] }),
  quatroApoiosJoelhoAlto: poseMod('quatroApoios', { k: [30, 70], f: [12, 72] }),
  paredeSentadoAlto: poseMod('paredeSentado', { h: [34, 16], s: [34, 28], p: [34, 52], k: [50, 70] }),
  pes90Expira: poseMod('pes90', { s: [22, 88] }),
  pranchaLateralBaixa: poseMod('pranchaLateral', { p: [48, 74], k: [30, 78] }),
  pranchaBaixa: poseMod('prancha', { p: [48, 76], k: [30, 80] }),
  sentadoPeCurto: poseMod('sentadoCadeira', { f: [60, 88] }),
});
Object.assign(EX_ANIM, {
  trapezioSuperior: 'sentadoCadeira', escalenos: 'sentadoCadeira', suboccipitais: 'sentadoCadeira', rotacaoCervical: 'sentadoCadeira',
  retracao: 'sentadoCadeira', setScapular: 'sentadoCadeira', peCurto: 'sentadoPeCurto',
  flexoresProfundos: 'supinoJoelhos', piriforme: 'supinoJoelhos', rotacaoLombar: 'supinoJoelhos', basculamento: 'supinoJoelhos',
  extensaoToracica: 'supinoJoelhos', transverso: 'supinoJoelhos', adutoresBola: 'supinoJoelhos',
  adutores: 'sentadoChao', rotativoSentado: 'sentadoChao', quadril9090: 'sentadoChao',
  flexoresQuadril: 'semiajoelhado', tornozeloParede: 'semiajoelhado',
  circulosOmbro: 'emPe', balancoPerna: 'emPe', extensaoTerminal: 'emPe', gluteoMedioParede: 'emPe',
  sleeper: 'deLadoBracoAberto', agulha: 'quatroApoios', circulosQuadril: 'quatroApoios', punho: 'quatroApoios',
  respiracao9090: 'pes90', pranchaFrontal: 'pranchaBaixa', pranchaLateral: 'pranchaLateralBaixa', peitoral: 'emPeBracosFrente',
});
// pose final própria quando a pose do exercício é a inicial
const EX_END = {
  trapezioSuperior: 'sentadoCabecaInclinada', escalenos: 'sentadoCabecaInclinada', suboccipitais: 'sentadoCabecaFlexao', rotacaoCervical: 'sentadoCabecaInclinada',
  retracao: 'sentadoQueixoRecolhido', setScapular: 'sentadoQueixoRecolhido', peCurto: 'sentadoCadeira',
  flexoresProfundos: 'supinoCabecaAceno', piriforme: 'supinoPernaCruzada', rotacaoLombar: 'supinoJoelhosLado', basculamento: 'supinoJoelhosPeito',
  transverso: 'supinoJoelhos', adutoresBola: 'supinoJoelhos', adutores: 'sentadoBorboletaAberta', rotativoSentado: 'sentadoGiro', quadril9090: 'sentadoGiro',
  flexoresQuadril: 'semiajoelhadoFrente', tornozeloParede: 'semiajoelhadoFrente', circulosOmbro: 'emPeBracosFrente', balancoPerna: 'emPePernaFrente',
  extensaoTerminal: 'emPe', gluteoMedioParede: 'emPeLateralParede', agulha: 'quatroApoiosGiro', circulosQuadril: 'quatroApoiosJoelhoAlto', punho: 'quatroApoiosPunhoTras',
  respiracao9090: 'pes90Expira', extensaoToracica: 'supinoJoelhos',
};
const EX_START_OVERRIDE = { extensaoTerminal: 'emPePernaTras', gluteoMedioParede: 'emPe' };

/* músculo-alvo → segmentos destacados */
const SEGS = { coxa: [['p', 'k']], perna: [['k', 'f']], braco: [['s', 'e']], antebraco: [['e', 'w']], pescoco: [['s', 'h']], tronco: [['s', 'p']], coxa2: [['p', 'k2']] };
const TARGET = {
  panturrilha: ['Panturrilha', 'perna'], isquios: ['Posteriores da coxa', 'coxa'], flexoresQuadril: ['Flexores do quadril', 'coxa2'], peitoral: ['Peitoral', 'tronco'],
  quadriceps: ['Quadríceps', 'coxa'], piriforme: ['Glúteos e piriforme', 'coxa'], trapezioSuperior: ['Trapézio superior', 'pescoco'], escalenos: ['Escalenos', 'pescoco'],
  inclinacaoLateral: ['Lateral do tronco', 'tronco'], adutores: ['Adutores', 'coxa'], rotativoSentado: ['Rotadores do tronco', 'tronco'], posturaCrianca: ['Grande dorsal', 'tronco'],
  cadeiaPosterior: ['Cadeia posterior', 'coxa'], tfl: ['Tensor da fáscia lata', 'coxa'], sleeper: ['Rotadores do ombro', 'braco'], suboccipitais: ['Suboccipitais', 'pescoco'],
  ponte: ['Glúteos', 'coxa'], ponteUnipodal: ['Glúteos', 'coxa'], conchas: ['Glúteo médio', 'coxa'], abducaoQuadril: ['Glúteo médio', 'coxa'], agachamentoParede: ['Quadríceps', 'coxa'],
  agachamento: ['Quadríceps e glúteos', 'coxa'], avanco: ['Quadríceps e glúteos', 'coxa'], remada: ['Romboides e trapézio médio', 'braco'], yt: ['Trapézio médio e inferior', 'braco'],
  pranchaFrontal: ['Abdome', 'tronco'], pranchaLateral: ['Oblíquos', 'tronco'], perdigueiro: ['Estabilizadores do tronco', 'tronco'], deadBug: ['Abdome profundo', 'tronco'],
  abdominalInferior: ['Abdome inferior', 'tronco'], panturrilhaElevacao: ['Panturrilha', 'perna'], extensaoLombar: ['Paravertebrais', 'tronco'],
  gatoCamelo: ['Coluna inteira', 'tronco'], extensaoToracica: ['Coluna torácica', 'tronco'], agulha: ['Coluna torácica', 'tronco'], livroAberto: ['Coluna torácica', 'tronco'],
  tornozeloParede: ['Tornozelo', 'perna'], quadril9090: ['Rotadores do quadril', 'coxa'], circulosOmbro: ['Ombros', 'braco'], anjoParede: ['Ombros e escápulas', 'braco'],
  rotacaoCervical: ['Coluna cervical', 'pescoco'], basculamento: ['Pelve e lombar', 'tronco'], rotacaoLombar: ['Coluna lombar', 'tronco'], circulosQuadril: ['Quadril', 'coxa'],
  agachamentoProfundo: ['Quadril e tornozelos', 'coxa'], enrolarColuna: ['Coluna inteira', 'tronco'], balancoPerna: ['Quadril', 'coxa'], punho: ['Punhos', 'antebraco'],
  retracao: ['Flexores profundos do pescoço', 'pescoco'], flexoresProfundos: ['Flexores profundos do pescoço', 'pescoco'], retracaoParede: ['Flexores profundos do pescoço', 'pescoco'],
  setScapular: ['Estabilizadores da escápula', 'braco'], serratil: ['Serrátil anterior', 'braco'], trapezioInferior: ['Trapézio inferior', 'braco'], rotExtOmbro: ['Infraespinal', 'braco'],
  gluteoMedioParede: ['Glúteo médio', 'coxa'], peCurto: ['Músculos do pé', 'perna'], transverso: ['Transverso do abdome', 'tronco'], respiracao9090: ['Diafragma', 'tronco'],
  coice: ['Glúteo máximo', 'coxa'], extensaoTerminal: ['Vasto medial', 'coxa'], elevacaoBracoQuatro: ['Estabilizadores do tronco', 'braco'], adutoresBola: ['Adutores', 'coxa'],
};
const BREATH = { alongamento: 'Respire devagar e solte o corpo', fortalecimento: 'Expire no esforço, inspire ao voltar', mobilidade: 'Movimento lento e controlado', ativacao: 'Contração leve, sem prender a respiração' };

/* ---------- esqueleto: interpolação por ângulo (o membro gira, não encolhe) ---------- */
const BONES = [['p', 's'], ['s', 'h'], ['s', 'e'], ['e', 'w'], ['s', 'e2'], ['e2', 'w2'], ['p', 'k'], ['k', 'f'], ['p', 'k2'], ['k2', 'f2']];
function lerpPose(A, B, t) {
  const out = {}; const has = k => A[k] && B[k];
  out.p = [A.p[0] + (B.p[0] - A.p[0]) * t, A.p[1] + (B.p[1] - A.p[1]) * t];
  for (const [par, ch] of BONES) {
    if (!out[par]) continue;
    const a = A[ch] || (ch.endsWith('2') ? A[ch.slice(0, -1)] : null), b = B[ch] || (ch.endsWith('2') ? B[ch.slice(0, -1)] : null);
    const ap = A[par] || A[par.slice(0, -1)], bp = B[par] || B[par.slice(0, -1)];
    if (!a || !b || !ap || !bp) continue;
    if (!has(ch) && !(A[ch] || B[ch])) continue;
    const la = Math.hypot(a[0] - ap[0], a[1] - ap[1]), lb = Math.hypot(b[0] - bp[0], b[1] - bp[1]);
    let ta = Math.atan2(a[1] - ap[1], a[0] - ap[0]), tb = Math.atan2(b[1] - bp[1], b[0] - bp[0]);
    let d = tb - ta; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const th = ta + d * t, L = la + (lb - la) * t;
    out[ch] = [out[par][0] + Math.cos(th) * L, out[par][1] + Math.sin(th) * L];
  }
  for (const k of ['wall', 'chair', 'band']) out[k] = (t < 0.5 ? A : B)[k];
  return out;
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- figura com volume ---------- */
function figureSVG(P, o = {}) {
  const op = o.opacity ?? 1, cap = (a, b, w, c, extra = '') => a && b ? `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>` : '';
  const limb = (a, b, w, c) => cap(a, b, w + 2.2, FIG.line) + cap(a, b, w, c);
  const toe = (k, f, own) => { if (own) return own; if (!k || !f) return null; const dx = f[0] - k[0], dy = f[1] - k[1], L = Math.hypot(dx, dy) || 1; let px = dy / L, py = -dx / L; if (px < 0) { px = -px; py = -py; } return [f[0] + px * 6, f[1] + py * 6]; };
  let g = '';
  // membros de trás (mais claros)
  if (P.k2) g += `<g opacity=".55">${limb(P.p, P.k2, 8.5, FIG.shorts)}${limb(P.k2, P.f2, 6.5, FIG.skin)}${limb(P.f2, toe(P.k2, P.f2), 4, FIG.skin)}</g>`;
  if (P.e2) g += `<g opacity=".55">${limb(P.s, P.e2, 5.5, FIG.shirt)}${limb(P.e2, P.w2, 4.5, FIG.skin)}</g>`;
  // tronco, perna da frente, cabeça, braço da frente
  g += limb(P.s, P.p, 13, FIG.shirt) + `<circle cx="${P.p[0]}" cy="${P.p[1]}" r="7.5" fill="${FIG.shorts}" stroke="${FIG.line}" stroke-width="1.1"/>`;
  g += limb(P.p, P.k, 9, FIG.shorts) + limb(P.k, P.f, 7, FIG.skin) + limb(P.f, toe(P.k, P.f, P.toe), 4.2, FIG.skin);
  const nk = P.h && P.s ? [P.s[0] + (P.h[0] - P.s[0]) * 0.45, P.s[1] + (P.h[1] - P.s[1]) * 0.45] : null;
  g += limb(P.s, nk, 5, FIG.skin) + `<circle cx="${P.h[0]}" cy="${P.h[1]}" r="7.2" fill="${FIG.skin}" stroke="${FIG.line}" stroke-width="1.1"/>`;
  g += `<path d="M${P.h[0] - 6.6} ${P.h[1] - 1.5} a7 7 0 0 1 13.2 0 q-4 -2.2 -13.2 0z" fill="#3A2A20"/>`;   // cabelo
  g += limb(P.s, P.e, 6, FIG.shirt) + limb(P.e, P.w, 4.8, FIG.skin) + (P.w ? `<circle cx="${P.w[0]}" cy="${P.w[1]}" r="2.6" fill="${FIG.skin}"/>` : '');
  // músculo-alvo
  if (o.target && o.pulse != null) {
    const segs = SEGS[o.target] || [];
    g += `<g opacity="${(0.25 + 0.6 * o.pulse).toFixed(2)}" filter="url(#glow)">${segs.map(([a, b]) => cap(P[a], P[b], 6, FIG.hi)).join('')}</g>`;
  }
  return `<g opacity="${op}">${g}</g>`;
}
function propsSVG(P) {
  let g = `<line x1="2" y1="93" x2="98" y2="93" stroke="var(--line)" stroke-width="2"/>`;
  const ys = ['p', 's', 'k', 'f'].map(k => P[k] ? P[k][1] : 0);
  if (Math.min(...ys) > 52) g += `<rect x="4" y="90" width="92" height="4" rx="2" fill="var(--accent)" opacity=".28"/>`;   // tapete
  if (P.wall) g += `<rect x="${P.wall - 2}" y="2" width="4" height="91" fill="var(--line)"/>`;
  if (P.chair) g += `<path d="M28 62 H62 M32 62 V92 M58 62 V92 M28 62 V30" fill="none" stroke="var(--muted)" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`;
  if (P.band) g += `<line x1="${P.band[0][0]}" y1="${P.band[0][1]}" x2="${P.band[1][0]}" y2="${P.band[1][1]}" stroke="#2FA36B" stroke-width="2" stroke-dasharray="4 3"/>`;
  return g;
}
function arrowSVG(a, b, op) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 4) return '';
  const nx = -dy / L, ny = dx / L, bend = Math.min(10, L * 0.35), cx = (a[0] + b[0]) / 2 + nx * bend, cy = (a[1] + b[1]) / 2 + ny * bend;
  const ang = Math.atan2(b[1] - cy, b[0] - cx), hx = b[0] - Math.cos(ang) * 1.5, hy = b[1] - Math.sin(ang) * 1.5;
  const h1 = [hx - Math.cos(ang - 0.5) * 5, hy - Math.sin(ang - 0.5) * 5], h2 = [hx - Math.cos(ang + 0.5) * 5, hy - Math.sin(ang + 0.5) * 5];
  return `<g opacity="${op}" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round"><path d="M${a[0]} ${a[1]} Q${cx} ${cy} ${hx} ${hy}" stroke-dasharray="3 2.5"/><path d="M${h1[0]} ${h1[1]} L${hx} ${hy} L${h2[0]} ${h2[1]}"/></g>`;
}
const DEFS = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
// faixa de textos acima da figura (viewBox começa em y = -24)
const ANIM_VB = '0 -24 100 127';
const caption = (t, sub) => `<text x="50" y="-15" text-anchor="middle" font-size="6.6" font-weight="700" fill="var(--ink)" font-family="var(--font-body)">${esc(t)}</text>${sub ? `<text x="50" y="-8.5" text-anchor="middle" font-size="4.3" fill="var(--muted)" font-family="var(--font-body)">${esc(sub)}</text>` : ''}`;
function ringSVG(x, y, r, frac) {
  const a = frac * 2 * Math.PI - Math.PI / 2, ex = x + r * Math.cos(a), ey = y + r * Math.sin(a), large = frac > 0.5 ? 1 : 0;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--line)" stroke-width="2"/>` + (frac > 0.001 ? `<path d="M${x} ${y - r} A${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>` : '');
}

/* ---------- linha do tempo de um exercício ---------- */
function exPlan(ex) {
  const start = POSES[EX_START_OVERRIDE[ex.id] || EX_ANIM[ex.id] || ex.pose] || POSES.emPe;
  const end = POSES[EX_END[ex.id] || ex.pose] || start;
  const moving = start !== end;
  const A = EX_ANIM[ex.id] && !EX_END[ex.id] ? POSES[EX_ANIM[ex.id]] : start, B = EX_ANIM[ex.id] && !EX_END[ex.id] ? POSES[ex.pose] : end;
  const d = ex.d, holdLabel = d.hold ? (d.hold >= 60 ? `${d.hold / 60} min` : `${d.hold} s`) : '';
  const phases = [['prep', 0.8, 'Posição inicial'], ['go', 1.2, ex.cat === 'alongamento' ? 'Alongue' : 'Execute'], ['hold', d.hold ? 2.4 : 0.35, d.hold ? `Segure ${holdLabel}` : ''], ['back', 1.1, 'Volte devagar'], ['rest', 0.5, '']];
  return { A, B, moving, phases, total: phases.reduce((s, p) => s + p[1], 0), target: TARGET[ex.id] || null, reps: d.reps || 1, sides: d.sides };
}
function exFrame(ex, plan, time) {
  const cyc = Math.floor(time / plan.total), tt = time - cyc * plan.total;
  let acc = 0, ph = plan.phases[0], local = 0;
  for (const p of plan.phases) { if (tt < acc + p[1]) { ph = p; local = (tt - acc) / p[1]; break; } acc += p[1]; }
  const t = ph[0] === 'prep' ? 0 : ph[0] === 'go' ? ease(local) : ph[0] === 'hold' ? 1 : ph[0] === 'back' ? 1 - ease(local) : 0;
  const P = lerpPose(plan.A, plan.B, plan.moving ? t : 0);
  const effort = ph[0] === 'go' || ph[0] === 'hold' ? 1 : ph[0] === 'back' ? 0.4 : 0;
  const pulse = effort * (0.6 + 0.4 * Math.sin(time * 6));
  let g = DEFS + propsSVG(P);
  if (plan.moving) g += figureSVG(plan.A, { opacity: 0.16 });
  g += figureSVG(P, { target: plan.target && plan.target[1], pulse: plan.target ? pulse : null });
  // seta no ponto que mais se move
  if (plan.moving && (ph[0] === 'go' || ph[0] === 'prep')) {
    let best = null, bd = 0; for (const k of ['h', 'w', 'f', 'k', 'e', 's', 'p', 'f2', 'w2']) if (plan.A[k] && plan.B[k]) { const dd = Math.hypot(plan.B[k][0] - plan.A[k][0], plan.B[k][1] - plan.A[k][1]); if (dd > bd) { bd = dd; best = k; } }
    if (best && bd > 4) g += arrowSVG(plan.A[best], plan.B[best], ph[0] === 'prep' ? 0.5 : 0.9);
  }
  if (ph[0] === 'hold' && ex.d.hold) g += ringSVG(91, -14, 5, local);
  const rep = (cyc % plan.reps) + 1, side = plan.sides ? (Math.floor(cyc / plan.reps) % 2 ? ' · lado esquerdo' : ' · lado direito') : '';
  g += caption(ph[2] || (ph[0] === 'rest' ? 'Descanse' : ''), plan.target ? `Músculo-alvo: ${plan.target[0]}` : '');
  g += `<text x="97" y="99" text-anchor="end" font-size="4.4" fill="var(--muted)" font-family="var(--font-data)">rep ${rep}/${plan.reps}${side}</text>`;
  g += `<text x="50" y="-3" text-anchor="middle" font-size="3.9" fill="var(--muted)" font-style="italic" font-family="var(--font-body)">${esc(BREATH[ex.cat] || '')}</text>`;
  return g;
}

/* ---------- demonstração da ADM com goniômetro ao vivo ---------- */
function romFrame(id, time) {
  const D = ROM_DEMO[id], R = ROM_PRESETS.find(r => r.id === id); if (!D) return '';
  const T = 4.2, tt = time % T, u = tt < 0.6 ? 0 : tt < 2 ? ease((tt - 0.6) / 1.4) : tt < 2.9 ? 1 : tt < 3.9 ? 1 - ease((tt - 2.9) / 1) : 0;
  const ang = D.ang * u, deg = Math.abs(ang);
  const rot = (cx, cy, inner) => `<g transform="rotate(${ang.toFixed(2)} ${cx} ${cy})">${inner}</g>`;
  const wedge = (cx, cy, r, a0) => {   // setor preenchido do goniômetro
    if (deg < 0.5) return '';
    const rad = a => a * Math.PI / 180, pt = a => [cx + r * Math.sin(rad(-a)), cy + r * Math.cos(rad(-a))];
    const [x0, y0] = pt(a0), [x1, y1] = pt(a0 + ang);
    return `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${deg > 180 ? 1 : 0} ${ang > 0 ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="1.4"/>`;
  };
  const S = { h: [50, 13], s: [50, 25], e: [51, 41], w: [53, 55], p: [50, 56], k: [50, 74], f: [52, 91], toe: [58, 91] };
  let g = DEFS + `<line x1="2" y1="93" x2="98" y2="93" stroke="var(--line)" stroke-width="2"/>`;
  const fig = P => figureSVG(P, {}), hi = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${FIG.hi}" stroke-width="3.2" stroke-linecap="round" opacity=".85" filter="url(#glow)"/>`;
  if (D.top) {
    g += `<ellipse cx="50" cy="58" rx="30" ry="9" fill="${FIG.shirt}" stroke="${FIG.line}" stroke-width="1.2"/>` + wedge(50, 50, 24, 180) + rot(50, 50, `<circle cx="50" cy="50" r="12" fill="${FIG.skin}" stroke="${FIG.line}" stroke-width="1.2"/><path d="M46 39 L50 31 L54 39 Z" fill="${FIG.skin}" stroke="${FIG.line}" stroke-width="1"/>`);
  } else if (D.frontal) {
    const sh = [[40, 26], [60, 26]], hp = [[44, 56], [56, 56]];
    const body = `<path d="M38 25 H62 L58 57 H42 Z" fill="${FIG.shirt}" stroke="${FIG.line}" stroke-width="1.2"/>`;
    const armR = `<line x1="40" y1="26" x2="34" y2="56" stroke="${FIG.skin}" stroke-width="5" stroke-linecap="round"/>`, armL = `<line x1="60" y1="26" x2="66" y2="56" stroke="${FIG.skin}" stroke-width="5" stroke-linecap="round"/>`;
    const legR = `<line x1="45" y1="58" x2="43" y2="91" stroke="${FIG.shorts}" stroke-width="7" stroke-linecap="round"/>`, legL = `<line x1="55" y1="58" x2="57" y2="91" stroke="${FIG.shorts}" stroke-width="7" stroke-linecap="round"/>`;
    const head = `<line x1="50" y1="26" x2="50" y2="19" stroke="${FIG.skin}" stroke-width="5"/><circle cx="50" cy="13" r="7.2" fill="${FIG.skin}" stroke="${FIG.line}" stroke-width="1.1"/>`;
    if (D.seg === 'braco') g += legR + legL + body + armL + head + wedge(40, 26, 20, 0) + rot(40, 26, armR + hi([40, 26], [34, 56]));
    if (D.seg === 'perna') g += legL + body + armR + armL + head + wedge(44, 56, 22, 0) + rot(44, 56, legR + hi([45, 58], [43, 91]));
    if (D.seg === 'cabeca') g += legR + legL + body + armR + armL + wedge(50, 26, 14, 180) + rot(50, 26, head + hi([50, 26], [50, 13]));
    if (D.seg === 'tronco') g += legR + legL + wedge(50, 56, 30, 180) + rot(50, 56, body + armR + armL + head + hi([50, 56], [50, 25]));
  } else {
    const P0 = JSON.parse(JSON.stringify(S));
    const rotPts = (c, keys) => { const a = ang * Math.PI / 180; for (const k of keys) { const dx = P0[k][0] - c[0], dy = P0[k][1] - c[1]; P0[k] = [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; } };
    const map = { braco: ['s', ['e', 'w'], ['s', 'e']], antebraco: ['e', ['w'], ['e', 'w']], perna: ['p', ['k', 'f'], ['p', 'k']], canela: ['k', ['f'], ['k', 'f']], pe: ['f', ['toe'], ['f', 'toe']], cabeca: ['s', ['h'], ['s', 'h']], tronco: ['p', ['s', 'h', 'e', 'w'], ['p', 's']] };
    const [jc, keys, segH] = map[D.seg], c = S[jc];
    g += wedge(c[0], c[1], D.seg === 'canela' || D.seg === 'antebraco' ? 13 : D.seg === 'cabeca' ? 15 : 22, D.seg === 'cabeca' || D.seg === 'tronco' ? 180 : 0);
    rotPts(c, keys);
    g += fig(P0) + (segH[0] !== segH[1] ? hi(P0[segH[0]], P0[segH[1]]) : '');
  }
  const normal = R ? R.normal : Math.abs(D.ang);
  g += caption(`${Math.round(deg)}°`, `Amplitude normal: ${normal}°`);
  g += `<text x="50" y="100.5" text-anchor="middle" font-size="4.4" fill="var(--muted)" font-family="var(--font-body)">${esc(R ? R.label : '')} · plano ${esc(R ? R.plane.toLowerCase() : '')}</text>`;
  return g;
}

/* ---------- montagem: placeholders animados por requestAnimationFrame ---------- */
const animReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function exAnim(ex, size = 160) { return `<div class="anim" data-anim="ex:${ex.id}" style="width:${size}px;max-width:100%"><svg viewBox="${ANIM_VB}" width="100%" role="img" aria-label="Animação: ${esc(ex.name)}">${exFrame(ex, exPlan(ex), 1.6)}</svg></div>`; }
function romDemoSVG(id, size = 180) { return ROM_DEMO[id] ? `<div class="anim" data-anim="rom:${id}" style="width:${size}px;max-width:100%"><svg viewBox="${ANIM_VB}" width="100%" role="img" aria-label="Demonstração do movimento">${romFrame(id, 2.2)}</svg></div>` : ''; }
function exPicto(pose, size = 64) {   // miniatura estática (lista), na posição final
  const P = POSES[pose] || POSES.emPe;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${propsSVG(P)}${figureSVG(P)}</svg>`;
}
const Anim = (() => {
  const live = new Set(); let raf = 0, t0 = performance.now();
  const loop = now => {
    for (const el of [...live]) {
      if (!el.isConnected) { live.delete(el); continue; }
      if (el._off) continue;
      const svg = el.firstElementChild, time = (now - t0) / 1000 + (el._phase || 0);
      if (el._last && now - el._last < 33) continue; el._last = now;   // ~30 quadros por segundo
      svg.innerHTML = el._kind === 'ex' ? exFrame(el._ex, el._plan, time) : romFrame(el._id, time);
    }
    raf = live.size ? requestAnimationFrame(loop) : 0;
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target._off = !e.isIntersecting)) : null;
  function mount(el) {
    if (el._mounted || animReduced()) return; el._mounted = true;
    const [kind, id] = el.dataset.anim.split(':'); el._kind = kind;
    if (kind === 'ex') { el._ex = EXERCISES.find(x => x.id === id); if (!el._ex) return; el._plan = exPlan(el._ex); } else el._id = id;
    live.add(el); if (io) io.observe(el);
    el.addEventListener('click', () => { el._off = !el._off; });
    if (!raf) raf = requestAnimationFrame(loop);
  }
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('[data-anim]') : []).forEach(mount);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.dataset?.anim) mount(n); scan(n); } }))).observe(document.body, { childList: true, subtree: true });
  return { scan };
})();
